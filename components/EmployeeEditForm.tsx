"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DepartmentOption, EmployeeProfile, PositionOption } from "@/types/employee";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { buttonClass, cardClass, inputClass, labelClass } from "@/components/ui/styles";
import { hasEmployeeNameLetter, isValidIndonesianPhone } from "@/utils/employee-profile-validation";

interface EmployeeEditFormProps {
  employee: EmployeeProfile;
  departments: DepartmentOption[];
  positions: PositionOption[];
}

interface EmployeeEditFormState {
  fullName: string;
  email: string;
  phone: string;
  positionId: string;
  departmentId: string;
  workLocation: string;
}

interface EmployeeUpdateResult {
  employee_id: string;
}

type ValidatedField = "fullName" | "phone";
type FieldFeedbackStatus = "neutral" | "incomplete" | "invalid" | "valid";

interface ValidationRequirement {
  label: string;
  status: FieldFeedbackStatus;
}

// The status colours carry "!" so they win over the neutral border and focus
// colours that inputClass already sets.
function fieldClassName(status: FieldFeedbackStatus | boolean = "neutral") {
  const normalizedStatus = typeof status === "boolean" ? (status ? "invalid" : "neutral") : status;
  const statusClassName = {
    neutral: "",
    incomplete: "border-amber-400! focus:border-amber-500! focus:ring-amber-500/15!",
    invalid: "border-red-500! focus:border-red-600! focus:ring-red-600/15!",
    valid: "border-emerald-500! focus:border-emerald-600! focus:ring-emerald-600/15!",
  }[normalizedStatus];

  return inputClass(statusClassName);
}

function getAggregateStatus(requirements: ValidationRequirement[]) {
  if (requirements.some((requirement) => requirement.status === "invalid")) return "invalid";
  if (requirements.some((requirement) => requirement.status === "incomplete")) return "incomplete";
  if (requirements.some((requirement) => requirement.status === "valid")) return "valid";
  return "neutral";
}

function ValidationChecklist({ id, requirements }: { id: string; requirements: ValidationRequirement[] }) {
  return (
    <ul id={id} className="mt-2 space-y-1.5 text-xs font-normal" aria-live="polite">
      {requirements.map((requirement) => {
        const presentation = {
          neutral: { marker: "○", markerClassName: "border-slate-300 text-slate-500", textClassName: "text-slate-500" },
          incomplete: { marker: "•", markerClassName: "border-amber-400 bg-amber-50 text-amber-700", textClassName: "text-amber-700" },
          invalid: { marker: "!", markerClassName: "border-red-500 bg-red-50 text-red-700", textClassName: "text-red-700" },
          valid: { marker: "✓", markerClassName: "border-emerald-500 bg-emerald-50 text-emerald-700", textClassName: "text-emerald-700" },
        }[requirement.status];

        return (
          <li key={requirement.label} className={`flex items-center gap-2 ${presentation.textClassName}`}>
            <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${presentation.markerClassName}`} aria-hidden="true">
              {presentation.marker}
            </span>
            <span>{requirement.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function EmployeeEditForm({ employee, departments, positions }: EmployeeEditFormProps) {
  const { language, t } = useLanguage();
  const copy = language === "id" ? { basic: "Data dasar", basicDescription: "Data identitas dan kontak pegawai.", name: "Nama pegawai", fromB2: "Data dari registrasi B2, tidak dapat diubah.", phone: "Nomor telepon", joinDate: "Tanggal bergabung", work: "Informasi pekerjaan", workDescription: "Departemen dan posisi mengikuti master data yang tersedia.", department: "Departemen", position: "Posisi", location: "Lokasi kerja", selectDepartment: "Pilih departemen", selectPosition: "Pilih posisi", chooseDepartment: "Pilih departemen terlebih dahulu", cancel: "Batal", saveChanges: "Simpan perubahan", unsaved: "Perubahan yang belum disimpan akan hilang. Lanjutkan?", nameRequired: "Nama lengkap wajib diisi.", nameInvalid: "Nama pegawai harus mengandung setidaknya satu huruf.", phoneInvalid: "Nomor telepon harus memakai format Indonesia yang valid, misalnya 0812-3456-7890 atau +62 812 3456 7890.", emailRequired: "Email wajib diisi.", emailInvalid: "Format email tidak valid.", departmentRequired: "Departemen wajib dipilih.", positionRequired: "Posisi wajib dipilih.", locationRequired: "Lokasi kerja wajib diisi.", mismatch: "Posisi yang dipilih tidak sesuai dengan departemen.", unauthorized: "Anda tidak memiliki izin untuk mengubah data pegawai.", duplicateEmail: "Email sudah digunakan.", profileInvalid: "Data profil tidak valid. Periksa nama dan nomor telepon.", updateFailed: "Profil pegawai belum dapat diperbarui. Silakan coba lagi.", success: "Profil pegawai berhasil diperbarui. Mengarahkan ke profil pegawai..." } : { basic: "Basic information", basicDescription: "Employee identity and contact data.", name: "Employee name", fromB2: "Data from B2 registration cannot be changed.", phone: "Phone number", joinDate: "Join date", work: "Work information", workDescription: "Department and position follow the available master data.", department: "Department", position: "Position", location: "Work location", selectDepartment: "Select department", selectPosition: "Select position", chooseDepartment: "Select a department first", cancel: "Cancel", saveChanges: "Save changes", unsaved: "Your unsaved changes will be lost. Continue?", nameRequired: "Full name is required.", nameInvalid: "Employee name must contain at least one letter.", phoneInvalid: "Phone number must use a valid Indonesian format, for example 0812-3456-7890 or +62 812 3456 7890.", emailRequired: "Email is required.", emailInvalid: "Invalid email format.", departmentRequired: "Department is required.", positionRequired: "Position is required.", locationRequired: "Work location is required.", mismatch: "The selected position does not belong to the selected department.", unauthorized: "You do not have permission to edit employee data.", duplicateEmail: "Email is already in use.", profileInvalid: "Profile data is invalid. Check the employee name and phone number.", updateFailed: "Employee profile could not be updated. Please try again.", success: "Employee profile updated successfully. Redirecting to the employee profile..." };
  const validationCopy = language === "id"
    ? {
        nameRequired: "Nama wajib diisi.",
        nameLetter: "Memiliki setidaknya satu huruf.",
        phoneAllowedCharacters: "Hanya angka, spasi, tanda hubung, kurung, dan +.",
        phonePrefix: "Diawali 0 atau +62.",
        phoneLength: "Berisi 8–15 digit.",
        phoneOptional: "Nomor telepon opsional; boleh dikosongkan.",
      }
    : {
        nameRequired: "A name is required.",
        nameLetter: "Contains at least one letter.",
        phoneAllowedCharacters: "Use only digits, spaces, hyphens, parentheses, and +.",
        phonePrefix: "Starts with 0 or +62.",
        phoneLength: "Contains 8–15 digits.",
        phoneOptional: "Phone number is optional; it may be left blank.",
      };
  const [formData, setFormData] = useState<EmployeeEditFormState>({
    fullName: employee.full_name ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    positionId: employee.position_id ?? "",
    departmentId: employee.department_id ?? "",
    workLocation: employee.work_location ?? "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<ValidatedField, boolean>>>({});
  const [focusedField, setFocusedField] = useState<ValidatedField | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const router = useRouter();
  const profileUrl = `/employees/${encodeURIComponent(employee.employee_id)}`;
  const isDirty = formData.fullName !== (employee.full_name ?? "") || formData.email !== (employee.email ?? "") || formData.phone !== (employee.phone ?? "") || formData.positionId !== (employee.position_id ?? "") || formData.departmentId !== (employee.department_id ?? "") || formData.workLocation !== (employee.work_location ?? "");

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const availablePositions = useMemo(
    () => positions.filter((position) => position.department_id === formData.departmentId),
    [formData.departmentId, positions]
  );

  const updateField = <K extends keyof EmployeeEditFormState>(field: K, value: EmployeeEditFormState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
  };

  const trimmedName = formData.fullName.trim();
  const trimmedPhone = formData.phone.trim();
  const fullNameInvalid = Boolean(trimmedName) && !hasEmployeeNameLetter(formData.fullName);
  const phoneInvalid = Boolean(trimmedPhone) && !isValidIndonesianPhone(formData.phone);
  const showNameValidation = Boolean(touchedFields.fullName || hasAttemptedSubmit);
  const showPhoneValidation = Boolean(touchedFields.phone || hasAttemptedSubmit);
  const nameError = !showNameValidation
    ? null
    : !formData.fullName.trim()
      ? copy.nameRequired
      : fullNameInvalid
        ? copy.nameInvalid
        : null;
  const phoneError = showPhoneValidation && phoneInvalid ? copy.phoneInvalid : null;

  const nameRequirements: ValidationRequirement[] = [
    {
      label: validationCopy.nameRequired,
      status: trimmedName ? "valid" : focusedField === "fullName" ? "incomplete" : "neutral",
    },
    {
      label: validationCopy.nameLetter,
      status: !trimmedName ? "neutral" : hasEmployeeNameLetter(formData.fullName) ? "valid" : "incomplete",
    },
  ];

  const phoneUsesAllowedCharacters = !trimmedPhone || /^[0-9+()\s-]+$/.test(trimmedPhone);
  const normalizedPhone = trimmedPhone.replace(/[\s()-]/g, "");
  const phoneDigitCount = normalizedPhone.replace(/\D/g, "").length;
  const phonePrefixStatus: FieldFeedbackStatus = !trimmedPhone
    ? "neutral"
    : !phoneUsesAllowedCharacters
      ? "invalid"
      : normalizedPhone === "" || normalizedPhone === "+" || normalizedPhone === "+6"
        ? "incomplete"
        : /^(0\d*|\+62\d*)$/.test(normalizedPhone)
          ? "valid"
          : "invalid";
  const phoneLengthStatus: FieldFeedbackStatus = !trimmedPhone
    ? "neutral"
    : !phoneUsesAllowedCharacters || phoneDigitCount > 15
      ? "invalid"
      : phoneDigitCount < 8
        ? "incomplete"
        : "valid";
  const phoneRequirements: ValidationRequirement[] = [
    {
      label: validationCopy.phoneAllowedCharacters,
      status: !trimmedPhone ? "neutral" : phoneUsesAllowedCharacters ? "valid" : "invalid",
    },
    { label: validationCopy.phonePrefix, status: phonePrefixStatus },
    { label: validationCopy.phoneLength, status: phoneLengthStatus },
  ];

  const nameProgressStatus = getAggregateStatus(nameRequirements);
  const phoneProgressStatus = getAggregateStatus(phoneRequirements);
  const nameFieldStatus: FieldFeedbackStatus = nameError
    ? "invalid"
    : focusedField === "fullName"
      ? nameProgressStatus
      : touchedFields.fullName && nameProgressStatus === "valid"
        ? "valid"
        : "neutral";
  const phoneFieldStatus: FieldFeedbackStatus = phoneError
    ? "invalid"
    : focusedField === "phone"
      ? phoneProgressStatus
      : touchedFields.phone && phoneProgressStatus === "valid"
        ? "valid"
        : "neutral";

  const markTouched = (field: ValidatedField) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return copy.nameRequired;
    if (!hasEmployeeNameLetter(formData.fullName)) return copy.nameInvalid;
    if (!isValidIndonesianPhone(formData.phone)) return copy.phoneInvalid;
    if (!formData.email.trim()) return copy.emailRequired;
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return copy.emailInvalid;
    if (!formData.departmentId) return copy.departmentRequired;
    if (!formData.positionId) return copy.positionRequired;
    if (!formData.workLocation.trim()) return copy.locationRequired;

    const position = positions.find((item) => item.id === formData.positionId);
    if (!position || position.department_id !== formData.departmentId) {
      return copy.mismatch;
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setHasAttemptedSubmit(true);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .rpc("d3_update_b2_employee_profile", {
          p_b2_register_id: employee.b2_register_id,
          p_full_name: formData.fullName.trim(),
          p_email: formData.email.trim(),
          p_phone: formData.phone.trim() || null,
          p_position_id: formData.positionId,
          p_department_id: formData.departmentId,
          p_work_location: formData.workLocation.trim(),
        })
        .maybeSingle()
        .returns<EmployeeUpdateResult>();

      if (error) {
        if (error.code === "42501") {
          setErrorMessage(copy.unauthorized);
        } else if (error.code === "23505") {
          setErrorMessage(copy.duplicateEmail);
        } else if (error.code === "22023") {
          setErrorMessage(copy.profileInvalid);
        } else {
          setErrorMessage(copy.updateFailed);
        }

        setIsSubmitting(false);
        return;
      }

      if (!data) {
        setErrorMessage(copy.unauthorized);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(copy.success);
      window.setTimeout(() => {
        router.replace(`/employees/${encodeURIComponent(data.employee_id)}`);
        router.refresh();
      }, 500);
    } catch {
      setErrorMessage(copy.updateFailed);
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={isSubmitting}>
        <section className={`p-5 sm:p-6 ${cardClass}`}>
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-5"><h2 className="text-base font-bold text-slate-900">{copy.basic}</h2><p className="text-sm text-slate-500">{copy.basicDescription}</p></div>
          <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>{copy.name} <span className="text-red-600">*</span></span>
              <input
                className={fieldClassName(nameFieldStatus)}
                value={formData.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                onFocus={() => setFocusedField("fullName")}
                onBlur={() => {
                  markTouched("fullName");
                  setFocusedField((current) => (current === "fullName" ? null : current));
                }}
                aria-invalid={Boolean(nameError) || undefined}
                aria-describedby={focusedField === "fullName" ? "employee-name-requirements" : nameError ? "employee-name-error" : undefined}
                required
              />
              {focusedField === "fullName" && <ValidationChecklist id="employee-name-requirements" requirements={nameRequirements} />}
              {focusedField !== "fullName" && nameError && <span id="employee-name-error" className="mt-1 block text-xs font-normal text-red-600" role="alert">{nameError}</span>}
            </label>
            <label className="block"><span className={labelClass}>{language === "id" ? "ID Pegawai" : "Employee ID"}</span><input className={fieldClassName(false)} value={employee.employee_id} disabled /><span className="mt-1 block text-xs font-normal text-slate-500">{copy.fromB2}</span></label>
            <label className="block"><span className={labelClass}>Email <span className="text-red-600">*</span></span><input className={fieldClassName(Boolean(errorMessage && !formData.email.trim()))} type="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} required /></label>
            <label className="block">
              <span className={labelClass}>{copy.phone}</span>
              <input
                className={fieldClassName(phoneFieldStatus)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => {
                  markTouched("phone");
                  setFocusedField((current) => (current === "phone" ? null : current));
                }}
                aria-invalid={Boolean(phoneError) || undefined}
                aria-describedby={focusedField === "phone" ? "employee-phone-requirements" : phoneError ? "employee-phone-error" : undefined}
              />
              {focusedField === "phone" && (
                <>
                  <ValidationChecklist id="employee-phone-requirements" requirements={phoneRequirements} />
                  {!trimmedPhone && <span className="mt-1 block text-xs font-normal text-slate-500">{validationCopy.phoneOptional}</span>}
                </>
              )}
              {focusedField !== "phone" && phoneError && <span id="employee-phone-error" className="mt-1 block text-xs font-normal text-red-600" role="alert">{phoneError}</span>}
            </label>
            <label className="block"><span className={labelClass}>{copy.joinDate}</span><input className={fieldClassName(false)} type="date" value={employee.join_date?.slice(0, 10) ?? ""} disabled /><span className="mt-1 block text-xs font-normal text-slate-500">{copy.fromB2}</span></label>
          </div>
        </section>
        <section className={`mt-6 p-5 sm:p-6 ${cardClass}`}>
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-5"><h2 className="text-base font-bold text-slate-900">{copy.work}</h2><p className="text-sm text-slate-500">{copy.workDescription}</p></div>
          <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="block"><span className={labelClass}>{copy.department} <span className="text-red-600">*</span></span><select className={fieldClassName(Boolean(errorMessage && !formData.departmentId))} value={formData.departmentId} onChange={(event) => { const departmentId = event.target.value; setFormData((current) => ({ ...current, departmentId, positionId: current.positionId && positions.find((position) => position.id === current.positionId)?.department_id === departmentId ? current.positionId : "" })); }} required><option value="">{copy.selectDepartment}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name} ({department.code})</option>)}</select></label>
            <label className="block"><span className={labelClass}>{copy.position} <span className="text-red-600">*</span></span><select className={fieldClassName(Boolean(errorMessage && !formData.positionId))} value={formData.positionId} onChange={(event) => updateField("positionId", event.target.value)} disabled={!formData.departmentId} required><option value="">{formData.departmentId ? copy.selectPosition : copy.chooseDepartment}</option>{availablePositions.map((position) => <option key={position.id} value={position.id}>{position.title} ({position.code})</option>)}</select></label>
            <label className="block"><span className={labelClass}>{copy.location} <span className="text-red-600">*</span></span><input className={fieldClassName(Boolean(errorMessage && !formData.workLocation.trim()))} value={formData.workLocation} onChange={(event) => updateField("workLocation", event.target.value)} required /></label>
          </div>
        </section>
      </fieldset>

      {errorMessage && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
          {successMessage}
        </p>
      )}

      <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Link
          className={buttonClass("secondary")}
          href={profileUrl}
          onClick={(event) => { if (isDirty && !window.confirm(copy.unsaved)) event.preventDefault(); }}
        >
          {copy.cancel}
        </Link>
        <button className={buttonClass("primary")} type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : copy.saveChanges}
        </button>
      </div>
    </form>
  );
}
