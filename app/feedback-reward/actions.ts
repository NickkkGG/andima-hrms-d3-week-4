"use server";

import { revalidatePath } from "next/cache";
import { getFeedbackContext } from "@/utils/feedback-reward";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_LIMITS,
  FEEDBACK_TYPES,
  REWARD_TYPES,
  type FeedbackActionCode,
} from "@/utils/feedback-reward-rules";

// Server actions can be called directly with any payload, so every rule the
// form enforces is checked again here before anything reaches Supabase.
type ActionResult = { success: true } | { error: string; code: FeedbackActionCode };

const raw = (form: FormData, key: string) => {
  const entry = form.get(key);
  return typeof entry === "string" ? entry : "";
};
// Single-line fields: collapse every run of whitespace.
const line = (form: FormData, key: string) => raw(form, key).replace(/\s+/g, " ").trim();
// Multi-line fields: keep line breaks, but no long runs of blank lines.
const paragraph = (form: FormData, key: string) => raw(form, key).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
const uuid = (input: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
const positiveId = (input: string) => (/^[1-9]\d{0,14}$/.test(input) ? Number(input) : null);

function isoDate(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const date = new Date(`${input}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input ? null : date;
}

function todayInJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function shiftDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function reject(code: FeedbackActionCode, error: string): ActionResult {
  return { error, code };
}

function fail(error: { code?: string; message?: string; details?: string; hint?: string }, stage: string): ActionResult {
  console.error("D3 Feedback & Reward action failed", { stage, code: error.code, message: error.message, details: error.details, hint: error.hint });
  if (error.code === "42501") return reject("forbidden", "Akses ditolak oleh permission D3.");
  // 23514 = CHECK constraint, 22001 = value too long, P0001 = raised by a guard trigger.
  if (error.code === "23514" || error.code === "22001") return reject("invalid_input", "Isian melebihi batas yang diizinkan.");
  if (error.code === "P0001") return reject("invalid_transition", "Perubahan status ini tidak diizinkan.");
  return reject("save_failed", "Data belum dapat disimpan. Periksa isian dan coba lagi.");
}

const within = (value: string, min: number, max: number) => value.length >= min && value.length <= max;

export async function createFeedbackReward(kind: "feedback" | "reward", form: FormData): Promise<ActionResult> {
  if (kind !== "feedback" && kind !== "reward") return reject("invalid_input", "Jenis data tidak valid.");
  const { supabase, access, canCreate } = await getFeedbackContext();
  if (!canCreate) return reject("forbidden", "Anda tidak memiliki izin untuk menambahkan feedback atau reward.");

  const employee_id = line(form, "employee_id");
  if (!uuid(employee_id)) return reject("invalid_employee", "Pilih pegawai dari daftar.");
  if (employee_id === access.employee_id) return reject("self_record", "Anda tidak dapat membuat feedback atau reward untuk diri sendiri.");

  const date = line(form, "date");
  const parsedDate = isoDate(date);
  const today = isoDate(todayInJakarta())!;
  if (!parsedDate || parsedDate > today || parsedDate < shiftDays(today, -FEEDBACK_LIMITS.maxPastDays)) {
    return reject("invalid_date", "Tanggal harus valid, tidak di masa depan, dan maksimal satu tahun ke belakang.");
  }

  const title = line(form, "title");
  if (!within(title, FEEDBACK_LIMITS.titleMin, FEEDBACK_LIMITS.titleMax)) {
    return reject("invalid_title", `Judul harus ${FEEDBACK_LIMITS.titleMin}–${FEEDBACK_LIMITS.titleMax} karakter.`);
  }
  const content = paragraph(form, "content");
  if (!within(content, FEEDBACK_LIMITS.contentMin, FEEDBACK_LIMITS.contentMax)) {
    return reject("invalid_content", `Isi harus ${FEEDBACK_LIMITS.contentMin}–${FEEDBACK_LIMITS.contentMax} karakter.`);
  }

  if (kind === "feedback") {
    const feedback_type = line(form, "feedback_type") || "PERFORMANCE_NOTE";
    const category = line(form, "category") || "OTHER";
    if (!FEEDBACK_TYPES.includes(feedback_type as (typeof FEEDBACK_TYPES)[number])) return reject("invalid_input", "Tipe feedback tidak valid.");
    if (!FEEDBACK_CATEGORIES.includes(category as (typeof FEEDBACK_CATEGORIES)[number])) return reject("invalid_input", "Kategori feedback tidak valid.");

    // A follow-up plan and target date only belong to improvement feedback.
    const isImprovement = feedback_type === "IMPROVEMENT";
    const follow_up_text = isImprovement ? paragraph(form, "follow_up_text") : "";
    if (follow_up_text.length > FEEDBACK_LIMITS.followUpMax) return reject("invalid_follow_up", `Tindak lanjut maksimal ${FEEDBACK_LIMITS.followUpMax} karakter.`);
    const targetInput = isImprovement ? line(form, "target_date") : "";
    let target_date: string | null = null;
    if (targetInput) {
      const target = isoDate(targetInput);
      if (!target || target < parsedDate || target > shiftDays(today, FEEDBACK_LIMITS.maxFutureDays)) {
        return reject("invalid_target_date", "Target tanggal harus setelah tanggal feedback dan maksimal satu tahun ke depan.");
      }
      target_date = targetInput;
    }

    const payload = { employee_id, given_by: access.employee_id, date, feedback_text: content, title, feedback_type, category, follow_up_text: follow_up_text || null, target_date, follow_up_status: "NEW" };
    const result = await supabase.from("d3_employee_feedback").insert(payload);
    if (result.error) return fail(result.error, "create_feedback");
  } else {
    const reward_type = line(form, "reward_type") || "OTHER";
    if (!REWARD_TYPES.includes(reward_type as (typeof REWARD_TYPES)[number])) return reject("invalid_input", "Jenis reward tidak valid.");
    const payload = { employee_id, proposed_by: access.employee_id, reward_name: title, title, reward_type, date, description: content, reason: content, status: "SUBMITTED", visibility: "PRIVATE" };
    const result = await supabase.from("d3_employee_rewards").insert(payload);
    if (result.error) return fail(result.error, "submit_reward");
  }
  revalidatePath("/feedback-reward", "layout");
  return { success: true };
}

// Employees move their own feedback forward one step at a time; HR and managers
// may set any status. The database trigger enforces the same rule.
const employeeNextStatus: Record<string, string[]> = { NEW: ["NEW", "READ"], READ: ["READ", "IN_PROGRESS"], IN_PROGRESS: ["IN_PROGRESS"], COMPLETED: ["COMPLETED"] };

export async function updateFeedbackProgress(form: FormData): Promise<ActionResult> {
  const { supabase, access } = await getFeedbackContext();
  const id = positiveId(line(form, "id"));
  const status = line(form, "status");
  const progress_note = paragraph(form, "progress_note");
  if (!id || !["NEW", "READ", "IN_PROGRESS", "COMPLETED"].includes(status)) return reject("invalid_status", "Status feedback tidak valid.");
  if (progress_note.length > FEEDBACK_LIMITS.progressNoteMax) return reject("invalid_note", `Catatan progres maksimal ${FEEDBACK_LIMITS.progressNoteMax} karakter.`);

  const { data: current, error: currentError } = await supabase.from("d3_employee_feedback").select("id, follow_up_status").eq("id", id).maybeSingle<{ id: number; follow_up_status: string }>();
  if (currentError) return fail(currentError, "read_feedback_status");
  if (!current) return reject("not_found", "Feedback tidak ditemukan atau tidak dapat diakses.");
  if (access.app_role === "EMPLOYEE" && !(employeeNextStatus[current.follow_up_status] ?? []).includes(status)) {
    return reject("invalid_transition", "Status hanya dapat dilanjutkan satu tahap, dan pegawai tidak dapat menyelesaikan feedback.");
  }

  const result = await supabase.from("d3_employee_feedback").update({ follow_up_status: status, progress_note: progress_note || null }).eq("id", id);
  if (result.error) return fail(result.error, "update_feedback_progress");
  revalidatePath("/feedback-reward", "layout");
  return { success: true };
}

// Reward workflow: SUBMITTED -> APPROVED or REJECTED, then APPROVED -> PUBLISHED.
const rewardTransitions: Record<string, string[]> = { SUBMITTED: ["APPROVED", "REJECTED"], APPROVED: ["PUBLISHED"], REJECTED: [], PUBLISHED: [] };

export async function updateRewardStatus(form: FormData): Promise<ActionResult> {
  const { supabase, access } = await getFeedbackContext();
  if (access.app_role !== "HR") return reject("forbidden", "Hanya HR yang dapat memproses approval reward.");
  const id = positiveId(line(form, "id"));
  const status = line(form, "status");
  const approval_reason = paragraph(form, "approval_reason");
  if (!id || !["APPROVED", "REJECTED", "PUBLISHED"].includes(status)) return reject("invalid_status", "Status reward tidak valid.");

  const { data: current, error: currentError } = await supabase.from("d3_employee_rewards").select("id, status, employee_id, is_legacy").eq("id", id).maybeSingle<{ id: number; status: string; employee_id: string; is_legacy: boolean }>();
  if (currentError) return fail(currentError, "read_reward_status");
  if (!current) return reject("not_found", "Reward tidak ditemukan atau tidak dapat diakses.");
  if (current.is_legacy) return reject("invalid_transition", "Data legacy tidak dapat diproses ulang.");
  if (current.employee_id === access.employee_id) return reject("self_record", "Anda tidak dapat memproses reward untuk diri sendiri.");
  if (!(rewardTransitions[current.status] ?? []).includes(status)) return reject("invalid_transition", "Urutan status reward tidak valid.");

  const payload: Record<string, string | null> = { status };
  if (status === "APPROVED" || status === "REJECTED") {
    if (!within(approval_reason, FEEDBACK_LIMITS.approvalReasonMin, FEEDBACK_LIMITS.approvalReasonMax)) {
      return reject("invalid_reason", `Alasan keputusan harus ${FEEDBACK_LIMITS.approvalReasonMin}–${FEEDBACK_LIMITS.approvalReasonMax} karakter.`);
    }
    payload.approval_reason = approval_reason;
  }
  if (status === "APPROVED") { payload.approved_by = access.employee_id; payload.approved_at = new Date().toISOString(); }
  // A published reward is the public recognition step.
  if (status === "PUBLISHED") payload.visibility = "PUBLIC";
  const result = await supabase.from("d3_employee_rewards").update(payload).eq("id", id).eq("status", current.status);
  if (result.error) return fail(result.error, "update_reward_status");
  revalidatePath("/feedback-reward", "layout");
  return { success: true };
}

export async function markNotificationRead(form: FormData): Promise<ActionResult> {
  const { supabase } = await getFeedbackContext();
  const id = line(form, "id");
  if (!uuid(id)) return reject("invalid_input", "Notifikasi tidak valid.");
  const result = await supabase.from("d3_feedback_reward_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (result.error) return fail(result.error, "mark_notification_read");
  revalidatePath("/feedback-reward", "layout");
  return { success: true };
}
