"use server";

import { revalidatePath } from "next/cache";
import { getD3AppRole } from "@/utils/employee-access";
import { createClient } from "@/utils/supabase/server";

const employmentStatuses = new Set([
  "PERMANENT",
  "CONTRACT",
  "PROBATION",
  "INTERN",
  "RESIGNED",
  "TERMINATED",
]);

// Messages go back in both languages; the client shows the active one.
export interface ActionMessage {
  id: string;
  en: string;
}

export interface EmployeeDirectoryVisibilityResult {
  ok: boolean;
  message: ActionMessage;
}

export interface EmployeeStatusChangeResult {
  ok: boolean;
  employeeId?: string;
  message: ActionMessage;
}

interface EmployeeStatusRpcResult {
  employee_id: string;
  employment_status: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function logActionError(action: string, employeeId: string | null, error: {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  console.error("D3 employee action failed", {
    action,
    employee_id: employeeId,
    message: error.message ?? null,
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

async function requireHr() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    logActionError("authentication", null, error ?? { message: "Authenticated user is unavailable." });
    return { supabase, user: null, message: { id: "Sesi Anda tidak valid. Silakan masuk kembali.", en: "Your session is no longer valid. Please sign in again." } };
  }

  const role = await getD3AppRole(supabase, user.id);
  if (role !== "HR") {
    logActionError("authorization", null, { message: "The current user does not have the HR role." });
    return { supabase, user: null, message: { id: "Anda tidak memiliki izin HR untuk menjalankan aksi ini.", en: "You do not have HR permission to perform this action." } };
  }

  return { supabase, user, message: null };
}

export async function setEmployeeDirectoryVisibility(
  employeeUuid: string,
  shouldHide: boolean,
): Promise<EmployeeDirectoryVisibilityResult> {
  if (!isUuid(employeeUuid)) {
    return { ok: false, message: { id: "Data pegawai tidak valid.", en: "The employee data is not valid." } };
  }

  const { supabase, user, message } = await requireHr();
  if (!user) return { ok: false, message: message ?? { id: "Aksi tidak dapat dijalankan.", en: "The action could not be performed." } };

  if (shouldHide) {
    const { error } = await supabase
      .from("d3_employee_directory_hidden")
      .insert({
        employee_id: employeeUuid,
        hidden_by: user.id,
        reason: "Hidden from Employee Directory by HR",
      });

    // Repeating hide is idempotent because the hidden table uses a unique employee key.
    if (error && error.code !== "23505") {
      logActionError("hide_directory_employee", employeeUuid, error);
      return { ok: false, message: { id: "Data pegawai belum dapat disembunyikan dari Direktori Pegawai.", en: "The employee could not be hidden from the Employee Directory." } };
    }
  } else {
    const { error } = await supabase
      .from("d3_employee_directory_hidden")
      .delete()
      .eq("employee_id", employeeUuid);

    if (error) {
      logActionError("restore_directory_employee", employeeUuid, error);
      return { ok: false, message: { id: "Data pegawai belum dapat ditampilkan kembali di Direktori Pegawai.", en: "The employee could not be shown in the Employee Directory again." } };
    }
  }

  revalidatePath("/employees");
  revalidatePath("/employees/[employeeId]", "page");
  return {
    ok: true,
    message: shouldHide
      ? { id: "Pegawai disembunyikan dari Direktori Pegawai. Data profil tetap tersimpan.", en: "The employee is hidden from the Employee Directory. Profile data is kept." }
      : { id: "Pegawai ditampilkan kembali di Direktori Pegawai.", en: "The employee is shown in the Employee Directory again." },
  };
}

export async function updateEmployeeEmploymentStatus(
  b2RegisterId: string,
  employmentStatus: string,
): Promise<EmployeeStatusChangeResult> {
  const normalizedStatus = employmentStatus.trim().toUpperCase();
  if (!isUuid(b2RegisterId) || !employmentStatuses.has(normalizedStatus)) {
    return { ok: false, message: { id: "Status kepegawaian tidak valid.", en: "The employment status is not valid." } };
  }

  const { supabase, user, message } = await requireHr();
  if (!user) return { ok: false, message: message ?? { id: "Aksi tidak dapat dijalankan.", en: "The action could not be performed." } };

  const { data, error } = await supabase
    .rpc("d3_update_b2_employee_employment_status", {
      p_b2_register_id: b2RegisterId,
      p_employment_status: normalizedStatus,
    })
    .maybeSingle()
    .returns<EmployeeStatusRpcResult>();

  if (error || !data) {
    logActionError("update_employment_status", b2RegisterId, error ?? { message: "Status RPC returned no employee." });
    if (error?.code === "42501") {
      return { ok: false, message: { id: "Anda tidak memiliki izin untuk mengubah status kepegawaian.", en: "You do not have permission to change the employment status." } };
    }
    if (error?.code === "22023") {
      return {
        ok: false,
        message: error.message.toLowerCase().includes("permanent")
          ? { id: "Pegawai tetap hanya dapat diubah menjadi Mengundurkan diri atau Diberhentikan.", en: "A permanent employee can only be changed to Resigned or Terminated." }
          : error.message.toLowerCase().includes("final")
            ? { id: "Pegawai yang sudah Mengundurkan diri atau Diberhentikan tidak dapat diubah kembali.", en: "An employee who has resigned or been terminated cannot be changed again." }
          : { id: "Status kepegawaian tidak valid.", en: "The employment status is not valid." },
      };
    }
    return { ok: false, message: { id: "Status kepegawaian belum dapat diperbarui. Silakan coba lagi.", en: "The employment status could not be updated. Please try again." } };
  }

  revalidatePath("/employees");
  revalidatePath("/employees/[employeeId]", "page");
  revalidatePath(`/employees/${data.employee_id}`);
  return {
    ok: true,
    employeeId: data.employee_id,
    message: normalizedStatus === "TERMINATED"
      ? { id: "Pemberhentian berhasil dicatat dan status kepegawaian menjadi Diberhentikan.", en: "The layoff was recorded and the employment status is now Terminated." }
      : { id: "Status kepegawaian berhasil diperbarui.", en: "The employment status was updated." },
  };
}
