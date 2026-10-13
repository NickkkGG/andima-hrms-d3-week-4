"use server";

import { revalidatePath } from "next/cache";
import { getD3AppRole } from "@/utils/employee-access";
import { createClient } from "@/utils/supabase/server";

const employmentStatusValues = new Set(["PERMANENT", "CONTRACT", "PROBATION", "INTERN", "RESIGNED", "TERMINATED"]);

interface B2RegisterEmployee {
  employee_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  position_id: string | null;
  departement_id: string | null;
  employment_status: string | null;
  created_at: string | null;
}

interface D3PositionMaster { id: string; department_id: string | null; }
interface D3WriterResult { id: string; operation: "inserted" | "updated"; }
interface EmployeeSyncPayload {
  employee_id: string; full_name: string; email: string; phone: string | null;
  position_id: string; department_id: string; employment_status: string; join_date: string;
}
export interface EmployeeSyncResult {
  ok: boolean; inserted: number; updated: number; skipped: number; failed: number; message: string;
}
export interface EmployeeDirectoryVisibilityResult {
  ok: boolean;
  message: string;
}
type SyncStage = "authentication" | "authorization" | "lookup" | "write";
interface SupabaseProblem { message?: string | null; code?: string | null; details?: string | null; hint?: string | null; }

function trimmedValue(value: string | null) { return value?.trim() ?? ""; }
function normalizeEmploymentStatus(value: string | null) {
  const normalized = trimmedValue(value).toUpperCase();
  return employmentStatusValues.has(normalized) ? normalized : "PROBATION";
}
function toDateOnly(value: string | null) {
  const date = trimmedValue(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? date : null;
}
function createPayload(source: B2RegisterEmployee): EmployeeSyncPayload | null {
  const employeeId = trimmedValue(source.employee_id);
  const fullName = trimmedValue(source.full_name);
  const email = trimmedValue(source.email);
  const positionId = trimmedValue(source.position_id);
  const departmentId = trimmedValue(source.departement_id);
  const joinDate = toDateOnly(source.created_at);
  if (!employeeId || !fullName || !email || !positionId || !departmentId || !joinDate) return null;
  return {
    employee_id: employeeId, full_name: fullName, email, phone: trimmedValue(source.phone) || null,
    position_id: positionId, department_id: departmentId,
    employment_status: normalizeEmploymentStatus(source.employment_status), join_date: joinDate,
  };
}
function logSyncProblem(stage: SyncStage, employeeId: string | null, problem: SupabaseProblem) {
  console.error("B2 employee sync failed", {
    stage, employee_id: employeeId, message: problem.message ?? null, code: problem.code ?? null,
    details: problem.details ?? null, hint: problem.hint ?? null,
  });
}
function logSkipped(employeeId: string | null, reason: string) {
  console.warn("B2 employee sync skipped", { stage: "validation", employee_id: employeeId, reason });
}
function failedResult(message: string): EmployeeSyncResult {
  return { ok: false, inserted: 0, updated: 0, skipped: 0, failed: 0, message };
}
function formatResult(inserted: number, updated: number, skipped: number, failed: number) {
  return `Sinkronisasi selesai: ${inserted} baru, ${updated} diperbarui, ${skipped} dilewati, ${failed} gagal.`;
}

function invalidVisibilityResult(message: string): EmployeeDirectoryVisibilityResult {
  return { ok: false, message };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function setEmployeeDirectoryVisibility(
  employeeUuid: string,
  shouldHide: boolean
): Promise<EmployeeDirectoryVisibilityResult> {
  if (!isUuid(employeeUuid)) {
    return invalidVisibilityResult("Data pegawai tidak valid.");
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    logSyncProblem("authentication", null, userError ?? { message: "Authenticated user is unavailable." });
    return invalidVisibilityResult("Sesi Anda tidak valid. Silakan masuk kembali.");
  }
  if (await getD3AppRole(supabase, user.id) !== "HR") {
    logSyncProblem("authorization", null, { message: "The current user does not have the HR role." });
    return invalidVisibilityResult("Anda tidak memiliki izin untuk mengubah visibilitas Employee Directory.");
  }

  if (shouldHide) {
    const { error } = await supabase
      .from("d3_employee_directory_hidden")
      .insert({
        employee_id: employeeUuid,
        hidden_by: user.id,
        reason: "Hidden from Employee Directory by HR",
      });

    if (error && error.code !== "23505") {
      logSyncProblem("write", employeeUuid, error);
      return invalidVisibilityResult("Data pegawai belum dapat disembunyikan dari Employee Directory.");
    }
  } else {
    const { error } = await supabase
      .from("d3_employee_directory_hidden")
      .delete()
      .eq("employee_id", employeeUuid);

    if (error) {
      logSyncProblem("write", employeeUuid, error);
      return invalidVisibilityResult("Data pegawai belum dapat ditampilkan kembali di Employee Directory.");
    }
  }

  revalidatePath("/employees");
  revalidatePath("/employees/[employeeId]", "page");
  return {
    ok: true,
    message: shouldHide
      ? "Employee disembunyikan dari Employee Directory. Data profil tetap tersimpan."
      : "Employee ditampilkan kembali di Employee Directory.",
  };
}

export async function syncEmployeesFromB2(): Promise<EmployeeSyncResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    logSyncProblem("authentication", null, userError ?? { message: "Authenticated user is unavailable." });
    return failedResult("Sesi Anda tidak valid. Silakan masuk kembali.");
  }
  if (await getD3AppRole(supabase, user.id) !== "HR") {
    logSyncProblem("authorization", null, { message: "The current user does not have the HR role." });
    return failedResult("Anda tidak memiliki izin untuk menyinkronkan pegawai.");
  }

  const [sourceResult, departmentsResult, positionsResult] = await Promise.all([
    supabase.from("b2_register").select("employee_id, full_name, email, phone, position_id, departement_id, employment_status, created_at").returns<B2RegisterEmployee[]>(),
    supabase.from("d3_departments").select("id").returns<Array<{ id: string }>>(),
    supabase.from("d3_positions").select("id, department_id").returns<D3PositionMaster[]>(),
  ]);
  const lookupError = sourceResult.error ?? departmentsResult.error ?? positionsResult.error;
  if (lookupError) {
    logSyncProblem("lookup", null, lookupError);
    return failedResult("Data pegawai belum dapat disinkronkan. Periksa akses lalu coba lagi.");
  }

  const departmentIds = new Set((departmentsResult.data ?? []).map(({ id }) => id));
  const positions = new Map((positionsResult.data ?? []).map((position) => [position.id, position]));
  let inserted = 0, updated = 0, skipped = 0, failed = 0;

  for (const sourceEmployee of sourceResult.data ?? []) {
    const sourceEmployeeId = trimmedValue(sourceEmployee.employee_id) || null;
    const payload = createPayload(sourceEmployee);
    if (!payload) {
      skipped += 1;
      logSkipped(sourceEmployeeId, "required B2 fields are incomplete or created_at is invalid");
      continue;
    }
    const position = positions.get(payload.position_id);
    if (!departmentIds.has(payload.department_id) || !position || position.department_id !== payload.department_id) {
      skipped += 1;
      logSkipped(payload.employee_id, "D3 department or position is invalid, or the position does not belong to the department");
      continue;
    }

    const { data: writerData, error: writerError } = await supabase
      .rpc("d3_write_employee_from_b2", {
        p_employee_id: payload.employee_id,
        p_full_name: payload.full_name,
        p_email: payload.email,
        p_phone: payload.phone,
        p_position_id: payload.position_id,
        p_department_id: payload.department_id,
        p_employment_status: payload.employment_status,
        p_join_date: payload.join_date,
      })
      .maybeSingle()
      .returns<D3WriterResult>();

    if (writerError || !writerData) {
      logSyncProblem("write", payload.employee_id, writerError ?? { message: "D3 employee writer returned no row." });
      failed += 1;
      continue;
    }
    if (writerData.operation === "inserted") inserted += 1;
    else updated += 1;
  }

  revalidatePath("/employees");
  revalidatePath("/employees/[employeeId]", "page");
  return { ok: failed === 0, inserted, updated, skipped, failed, message: formatResult(inserted, updated, skipped, failed) };
}
