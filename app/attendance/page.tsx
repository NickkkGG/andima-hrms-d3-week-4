'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChevronRight, RefreshCw, AlertCircle, CheckCircle2, Clock3, FilePlus2, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import HeaderAccount from '@/components/HeaderAccount'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import LocationMapPreview from '@/components/attendance/LocationMapPreview'
import TablePagination from '@/components/hrms/TablePagination'

type CorrectionType = 'CLOCK_IN' | 'CLOCK_OUT' | 'FULL_DAY' | string
type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string
type AppRole = 'EMPLOYEE' | 'HR' | 'MANAGER'

export type AttendanceCorrection = {
  id: string
  correction_type: CorrectionType
  proposed_clock_in?: string | null
  proposed_clock_out?: string | null
  reason: string
  status: CorrectionStatus
  created_at: string
}

export type AttendanceItem = {
  id: string
  employee_id: string
  full_name: string
  department: string
  date: string
  clock_in: string
  clock_out: string | null
  clock_in_latitude: number | null
  clock_in_longitude: number | null
  clock_in_accuracy_meters: number | null
  clock_out_latitude: number | null
  clock_out_longitude: number | null
  clock_out_accuracy_meters: number | null
  source: string
  notes: string | null
  correction: AttendanceCorrection | null
}

type AttendanceEmployee = {
  employee_id: string
  full_name: string
  department_id: string | null
  d3_departments: { name: string } | null
}

type AttendanceQueryRow = {
  id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  clock_in_latitude: number | null
  clock_in_longitude: number | null
  clock_in_accuracy_meters: number | null
  clock_out_latitude: number | null
  clock_out_longitude: number | null
  clock_out_accuracy_meters: number | null
  work_duration_minutes: number | null
  status: string | null
  notes: string | null
  d3_employee: AttendanceEmployee | null
  d3_attendance_corrections: AttendanceCorrection[] | null
}

export default function AttendancePageUI() {
  const { t, language } = useLanguage()
  const locale = language === 'id' ? 'id-ID' : 'en-GB'
  const copy = language === 'id' ? {
    accessRequired: 'Akses dashboard memerlukan akun HRMS yang telah dipetakan.', loadFailed: 'Data presensi belum dapat dimuat dari Supabase.', connectionFailed: 'Terjadi kesalahan saat menghubungkan ke Supabase.', employee: 'Karyawan', general: 'Umum', correction: 'Koreksi presensi', correctionApproved: 'Koreksi absensi {name} berhasil disetujui dan diterapkan.', correctionRejected: 'Koreksi absensi {name} berhasil ditolak.', updateFailed: 'Gagal memperbarui koreksi', unknownError: 'Terjadi kesalahan', requestFailed: 'Pengajuan koreksi gagal disimpan.', noteFailed: 'Koreksi tersimpan, tetapi catatan insentif gagal disimpan', requestSuccess: 'Koreksi berhasil diajukan dan menunggu persetujuan HR.', incomplete: 'Belum lengkap', hours: 'jam',
    selfService: 'Layanan mandiri karyawan', myHistory: 'Riwayat Presensi Saya', greeting: 'Halo', reviewMy: 'Tinjau detail kehadiran dan ajukan koreksi bila ada data yang perlu diperbaiki.', attendanceHistory: 'Riwayat kehadiran', recorded: 'catatan presensi tercatat', pendingCorrections: 'koreksi menunggu', loadingHistory: 'Memuat riwayat presensi...', noHistory: 'Belum ada riwayat presensi.', date: 'Tanggal', clock: 'Clock in / out', duration: 'Durasi', status: 'Status', underSeven: 'DI BAWAH 7 JAM', meetsSeven: 'MEMENUHI 7 JAM', attendanceDetail: 'Detail presensi', noScan: 'Belum ada scan', source: 'Sumber', incentiveNotes: 'Catatan insentif/lembur', correctionRequest: 'Pengajuan koreksi', noCorrectionForDate: 'Belum ada pengajuan koreksi untuk tanggal ini.', correctionSubmitted: 'Koreksi sudah diajukan', submitCorrection: 'Ajukan koreksi',
    submitAttendanceCorrection: 'Ajukan koreksi presensi', sentToHr: 'Tanggal {date} akan dikirim ke HR untuk ditinjau.', close: 'Tutup', correctionType: 'Tipe koreksi', correctClockIn: 'Perbaikan Clock In', correctClockOut: 'Perbaikan Clock Out', correctFullDay: 'Perbaikan satu hari penuh', correctClockInLabel: 'Clock In yang benar', correctClockOutLabel: 'Clock Out yang benar', overtimeNote: 'Catatan lembur / insentif (opsional)', overtimePlaceholder: 'Isi jika jam kerja melebihi jam formal dan membutuhkan catatan insentif', requestReason: 'Alasan pengajuan', reasonPlaceholder: 'Jelaskan alasan koreksi (minimal 10 karakter)', cancel: 'Batal', sending: 'Mengirim...', sendRequest: 'Kirim pengajuan',
    managementTitle: 'Manajemen Presensi & Koreksi', managementDescription: 'Kelola riwayat presensi, validasi minimum 7 jam kerja, dan persetujuan koreksi absensi yang terhubung ke database Supabase.', all: 'Semua', awaitingApproval: 'Menunggu Persetujuan', approved: 'Disetujui', searchPlaceholder: 'Cari nama, NIP, atau divisi...', loadingData: 'Memuat data kehadiran karyawan dari Supabase...', noAttendance: 'Tidak ada data presensi', noResults: 'Tidak ada data yang cocok dengan kriteria filter atau pencarian Anda.', workDuration: 'Durasi kerja', lessThanSeven: '< 7 jam kerja', detailAudit: 'Detail presensi & audit', originalLog: 'Data log asli (fingerprint)', dataSource: 'Sumber data', activeCorrectionNone: 'Tidak ada pengajuan koreksi aktif untuk tanggal ini.', correctionTypeLabel: 'Tipe koreksi', proposedClockIn: 'Clock In diajukan', proposedClockOut: 'Clock Out diajukan', reasonRequired: 'Alasan pengajuan (wajib)', progressTrail: 'Progres & riwayat', attendanceReceived: 'Log presensi diterima', fingerprintSystem: 'Sistem fingerprint', correctionCreated: 'Pengajuan koreksi dibuat', byEmployee: 'Oleh pegawai', correctionApprovedTrail: 'Koreksi disetujui', correctionRejectedTrail: 'Koreksi ditolak', byHr: 'Oleh HR Admin', approve: 'Setujui', reject: 'Tolak', in: 'Masuk', out: 'Pulang',
  } : {
    accessRequired: 'This dashboard requires a mapped HRMS account.', loadFailed: 'Attendance data could not be loaded from Supabase.', connectionFailed: 'An error occurred while connecting to Supabase.', employee: 'Employee', general: 'General', correction: 'Attendance correction', correctionApproved: 'Attendance correction for {name} was approved and applied.', correctionRejected: 'Attendance correction for {name} was rejected.', updateFailed: 'Unable to update correction', unknownError: 'An unexpected error occurred', requestFailed: 'The correction request could not be saved.', noteFailed: 'The correction was saved, but the incentive note could not be saved', requestSuccess: 'Correction request submitted and awaiting HR approval.', incomplete: 'Incomplete', hours: 'hours',
    selfService: 'Employee self service', myHistory: 'My Attendance History', greeting: 'Hello', reviewMy: 'Review attendance details and submit a correction when a record needs updating.', attendanceHistory: 'Attendance history', recorded: 'attendance records', pendingCorrections: 'pending corrections', loadingHistory: 'Loading attendance history...', noHistory: 'No attendance history yet.', date: 'Date', clock: 'Clock in / out', duration: 'Duration', status: 'Status', underSeven: 'UNDER 7 HOURS', meetsSeven: 'MEETS 7 HOURS', attendanceDetail: 'Attendance details', noScan: 'No scan yet', source: 'Source', incentiveNotes: 'Overtime / incentive note', correctionRequest: 'Correction request', noCorrectionForDate: 'No correction request for this date.', correctionSubmitted: 'Correction submitted', submitCorrection: 'Submit correction',
    submitAttendanceCorrection: 'Submit attendance correction', sentToHr: 'The record for {date} will be sent to HR for review.', close: 'Close', correctionType: 'Correction type', correctClockIn: 'Correct clock in', correctClockOut: 'Correct clock out', correctFullDay: 'Correct full day', correctClockInLabel: 'Correct clock in', correctClockOutLabel: 'Correct clock out', overtimeNote: 'Overtime / incentive note (optional)', overtimePlaceholder: 'Add a note when working hours exceed normal hours and need an incentive record', requestReason: 'Reason for request', reasonPlaceholder: 'Explain the correction reason (at least 10 characters)', cancel: 'Cancel', sending: 'Sending...', sendRequest: 'Submit request',
    managementTitle: 'Attendance & Correction Management', managementDescription: 'Manage attendance history, the seven-hour minimum validation, and attendance-correction approvals connected to Supabase.', all: 'All', awaitingApproval: 'Awaiting approval', approved: 'Approved', searchPlaceholder: 'Search by name, employee ID, or department...', loadingData: 'Loading employee attendance data from Supabase...', noAttendance: 'No attendance data', noResults: 'No data matches your current filter or search.', workDuration: 'Work duration', lessThanSeven: '< 7 work hours', detailAudit: 'Attendance details & audit', originalLog: 'Original log data (fingerprint)', dataSource: 'Data source', activeCorrectionNone: 'There is no active correction request for this date.', correctionTypeLabel: 'Correction type', proposedClockIn: 'Proposed clock in', proposedClockOut: 'Proposed clock out', reasonRequired: 'Request reason (required)', progressTrail: 'Progress & history', attendanceReceived: 'Attendance log received', fingerprintSystem: 'Fingerprint system', correctionCreated: 'Correction request created', byEmployee: 'By employee', correctionApprovedTrail: 'Correction approved', correctionRejectedTrail: 'Correction rejected', byHr: 'By HR Admin', approve: 'Approve', reject: 'Reject', in: 'In', out: 'Out',
  }
  const interpolate = (value: string, values: Record<string, string>) => value.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '')
  const correctionStatusLabel = (status: CorrectionStatus) => ({ PENDING: language === 'id' ? 'Menunggu persetujuan' : 'Awaiting approval', APPROVED: copy.approved, REJECTED: language === 'id' ? 'Ditolak' : 'Rejected' }[status] ?? status)
  const [attendances, setAttendances] = useState<AttendanceItem[]>([])
  const [selectedItem, setSelectedItem] = useState<AttendanceItem | null>(null)
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [tablePage, setTablePage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [appRole, setAppRole] = useState<AppRole | null>(null)
  const [viewerEmployeeId, setViewerEmployeeId] = useState('')
  const [viewerName, setViewerName] = useState('')
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false)
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false)
  const [correctionType, setCorrectionType] = useState<CorrectionType>('CLOCK_IN')
  const [proposedClockIn, setProposedClockIn] = useState('')
  const [proposedClockOut, setProposedClockOut] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')
  const [incentiveNote, setIncentiveNote] = useState('')

  // Fetch data dari Supabase (Disamakan persis dengan halaman Attendance Productivity)
  async function fetchAttendanceData() {
    try {
      setLoading(true)
      setErrorMessage('')
      const supabase = createClient()

      let query = supabase
        .from('d3_attendances')
        .select(`
          id,
          employee_id,
          date,
          clock_in,
          clock_out,
          clock_in_latitude,
          clock_in_longitude,
          clock_in_accuracy_meters,
          clock_out_latitude,
          clock_out_longitude,
          clock_out_accuracy_meters,
          status,
          notes,
          d3_employee!fk_d3_attendances_d3_employee (
            employee_id,
            full_name,
            department_id,
            d3_departments!fk_d3_employee_d3_departments (
              name
            )
          ),
          d3_attendance_corrections (
            id,
            correction_type,
            proposed_clock_in,
            proposed_clock_out,
            reason,
            status,
            created_at
          )
        `)
        .order('date', { ascending: false })

      if (appRole === 'EMPLOYEE' && viewerEmployeeId) {
        query = query.eq('employee_id', viewerEmployeeId)
      }

      const { data, error } = await query

      if (error) {
        console.warn('Supabase fetch query notice:', error.message)
        setErrorMessage(
          error.code === '42501'
            ? copy.accessRequired
            : copy.loadFailed
        )
        setAttendances([])
        setSelectedItem(null)
        return
      }

      if (data) {
        const formatted: AttendanceItem[] = (data as unknown as AttendanceQueryRow[]).map((item) => {
          const emp = item.d3_employee
          const corrList = item.d3_attendance_corrections || []
          const corr = corrList.length > 0 ? corrList[0] : null

          return {
            id: item.id || `ATT-${item.employee_id}`,
            employee_id: emp?.employee_id || item.employee_id || 'EMP-AND-000',
            full_name: emp?.full_name || copy.employee,
            department: emp?.d3_departments?.name || copy.general,
            date: item.date || new Date().toISOString().split('T')[0],
            clock_in: item.clock_in ? (item.clock_in.includes('T') ? item.clock_in : `${item.date}T${item.clock_in}`) : `${item.date}T08:00:00`,
            clock_out: item.clock_out ? (item.clock_out.includes('T') ? item.clock_out : `${item.date}T${item.clock_out}`) : null,
            clock_in_latitude: item.clock_in_latitude,
            clock_in_longitude: item.clock_in_longitude,
            clock_in_accuracy_meters: item.clock_in_accuracy_meters,
            clock_out_latitude: item.clock_out_latitude,
            clock_out_longitude: item.clock_out_longitude,
            clock_out_accuracy_meters: item.clock_out_accuracy_meters,
            source: item.notes?.includes('Face biometric') ? 'Face biometric' : 'Attendance system',
            notes: item.notes || null,
            correction: corr
              ? {
                  id: corr.id,
                  correction_type: corr.correction_type || 'CLOCK_IN',
                  proposed_clock_in: corr.proposed_clock_in,
                  proposed_clock_out: corr.proposed_clock_out,
                  reason: corr.reason || copy.correction,
                  status: corr.status || 'PENDING',
                  created_at: corr.created_at ? new Date(corr.created_at).toLocaleString(locale) : item.date,
                }
              : null,
          }
        })

        setAttendances(formatted)
        if (formatted.length > 0) {
          setSelectedItem(formatted[0])
        } else {
          setSelectedItem(null)
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching attendance from Supabase:', err)
      setErrorMessage(
        err instanceof Error ? err.message : copy.connectionFailed
      )
      setAttendances([])
      setSelectedItem(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadAccountAccess() {
      const supabase = createClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) return

      const [{ data: access, error: accessError }, { data: legacyEmployeeId, error: legacyEmployeeError }] = await Promise.all([
        supabase
          .from('b2_register')
          .select('app_role, full_name')
          .eq('auth_user_id', userData.user.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase.rpc('d3_current_legacy_employee_uuid'),
      ])

      if (!mounted || accessError || legacyEmployeeError || !access || !legacyEmployeeId) return
      const name = userData.user.user_metadata?.full_name
      setAppRole(access.app_role as AppRole)
      setViewerEmployeeId(legacyEmployeeId)
      setViewerName(access.full_name?.trim() || (typeof name === 'string' && name.trim() ? name.trim() : userData.user.email?.split('@')[0] || copy.employee))
    }

    void loadAccountAccess()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    // Data loading is intentionally triggered after the authenticated role is known.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (appRole) void fetchAttendanceData()
    // fetchAttendanceData reads the authenticated session and active role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appRole, viewerEmployeeId])

  // Action Handler Persetujuan / Penolakan Koreksi
  async function handleUpdateCorrectionStatus(status: 'APPROVED' | 'REJECTED') {
    if (!selectedItem?.correction) return

    try {
      const supabase = createClient()
      const correctionId = selectedItem.correction.id
      const correctionUpdate: { status: string; reviewed_by?: string } = { status, reviewed_by: viewerEmployeeId || undefined }

      const { error: correctionError } = await supabase
        .from('d3_attendance_corrections')
        .update(correctionUpdate)
        .eq('id', correctionId)

      if (correctionError) throw correctionError

      const attendanceUpdate: { clock_in?: string; clock_out?: string } = {}
      if (status === 'APPROVED') {
        if (selectedItem.correction.proposed_clock_in) {
          attendanceUpdate.clock_in = selectedItem.correction.proposed_clock_in
        }
        if (selectedItem.correction.proposed_clock_out) {
          attendanceUpdate.clock_out = selectedItem.correction.proposed_clock_out
        }
        if (Object.keys(attendanceUpdate).length > 0) {
          const { error: attendanceError } = await supabase
            .from('d3_attendances')
            .update(attendanceUpdate)
            .eq('id', selectedItem.id)
          if (attendanceError) throw attendanceError
        }
      }

      const updatedItem = {
        ...selectedItem,
        ...(status === 'APPROVED' ? attendanceUpdate : {}),
        correction: { ...selectedItem.correction, status },
      }
      const updatedAttendances = attendances.map((item) => item.id === selectedItem.id ? updatedItem : item)
      setAttendances(updatedAttendances)
      setSelectedItem(updatedItem)
      setActionMessage({
        type: 'success',
        text: interpolate(status === 'APPROVED' ? copy.correctionApproved : copy.correctionRejected, { name: selectedItem.full_name }),
      })
      setTimeout(() => setActionMessage(null), 4000)
    } catch (err: unknown) {
      setActionMessage({
        type: 'error',
        text: `${copy.updateFailed}: ${err instanceof Error ? err.message : copy.unknownError}`,
      })
      setTimeout(() => setActionMessage(null), 4000)
    }
  }

  async function handleSubmitCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem || !viewerEmployeeId || correctionReason.trim().length < 10) return

    setIsSubmittingCorrection(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('d3_attendance_corrections')
      .insert({
        attendance_id: selectedItem.id,
        requested_by: viewerEmployeeId,
        correction_type: correctionType,
        proposed_clock_in: proposedClockIn ? `${selectedItem.date}T${proposedClockIn}:00` : null,
        proposed_clock_out: proposedClockOut ? `${selectedItem.date}T${proposedClockOut}:00` : null,
        reason: correctionReason.trim(),
        status: 'PENDING',
      })
      .select('id, correction_type, proposed_clock_in, proposed_clock_out, reason, status, created_at')
      .single()

    if (error) {
      setActionMessage({ type: 'error', text: error.message || copy.requestFailed })
      setIsSubmittingCorrection(false)
      return
    }

    if (incentiveNote.trim()) {
      const { error: noteError } = await supabase
        .from('d3_attendances')
        .update({ notes: incentiveNote.trim() })
        .eq('id', selectedItem.id)
      if (noteError) {
        setActionMessage({ type: 'error', text: `${copy.noteFailed}: ${noteError.message}` })
      }
    }

    const correction: AttendanceCorrection = {
      ...data,
      created_at: new Date(data.created_at).toLocaleString(locale),
    }
    const updated = attendances.map((item) => item.id === selectedItem.id ? { ...item, correction } : item)
    setAttendances(updated)
    setSelectedItem({ ...selectedItem, correction })
    setIsCorrectionOpen(false)
    setCorrectionReason('')
    setProposedClockIn('')
    setProposedClockOut('')
    setIncentiveNote('')
    setActionMessage({ type: 'success', text: copy.requestSuccess })
    setIsSubmittingCorrection(false)
    setTimeout(() => setActionMessage(null), 4000)
  }

  // Helper perhitungan durasi kerja dengan batas minimum 7 jam.
  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return { text: copy.incomplete, isUnderMin: true }
    const start = new Date(clockIn).getTime()
    const end = new Date(clockOut).getTime()
    if (isNaN(start) || isNaN(end)) return { text: copy.incomplete, isUnderMin: true }
    const diffHours = (end - start) / (1000 * 60 * 60)
    return {
      text: `${diffHours.toFixed(1)} ${copy.hours}`,
      isUnderMin: diffHours < 7.0,
    }
  }

  // Filter Data Tab & Search
  const filteredData = useMemo(() => {
    return attendances.filter((item) => {
      const matchesSearch =
        item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false
      if (activeTab === 'ALL') return true
      return item.correction?.status === activeTab
    })
  }, [attendances, searchQuery, activeTab])
  const tablePageSize = 10
  const employeeTotalPages = Math.max(1, Math.ceil(attendances.length / tablePageSize))
  const employeeCurrentPage = Math.min(tablePage, employeeTotalPages)
  const paginatedAttendances = attendances.slice((employeeCurrentPage - 1) * tablePageSize, employeeCurrentPage * tablePageSize)
  const managementTotalPages = Math.max(1, Math.ceil(filteredData.length / tablePageSize))
  const managementCurrentPage = Math.min(tablePage, managementTotalPages)
  const paginatedFilteredData = filteredData.slice((managementCurrentPage - 1) * tablePageSize, managementCurrentPage * tablePageSize)

  if (appRole === 'EMPLOYEE') {
    const employeeItem = selectedItem || attendances[0]
    const pendingCount = attendances.filter((item) => item.correction?.status === 'PENDING').length

    return (
      <>
        <div className="min-h-screen bg-[#eaf2fc] text-[#121b2e]">
          <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#bcd4ee]/80 bg-white/72 px-4 shadow-[0_4px_16px_rgba(31,77,130,0.08)] backdrop-blur-2xl sm:px-6">
            <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">
              <div className="hidden min-w-0 items-center gap-3 sm:flex"><span className="font-[family:var(--font-poppins)] text-sm font-semibold text-[#0B2548]">ANDIMA HRMS</span><span className="h-5 border-l border-[#BCD4EE]" /><span className="text-xs font-semibold text-[#3f4940]">HRMS</span><ChevronRight size={13} className="shrink-0 text-[#52749B]/60" /><span className="truncate text-xs font-semibold text-[#0C68D5]">{t('myAttendance')}</span></div>
              <span className="font-[family:var(--font-poppins)] text-sm font-semibold text-[#0B2548] sm:hidden">{t('myAttendance')}</span>
              <div className="flex items-center gap-2 sm:gap-3"><HeaderAccount /></div>
            </div>
          </header>
          <section className="border-b border-[#d9e2fc] bg-white px-4 py-5 sm:px-6"><div className="mx-auto max-w-[1600px]"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#006838]">{copy.selfService}</p><h1 className="mt-1 text-2xl font-bold tracking-[-0.4px]">{copy.myHistory}</h1><p className="mt-1 text-sm text-[#4d5f81]">{copy.greeting}, {viewerName || copy.employee}. {copy.reviewMy}</p></div></section>
          {actionMessage && <div className={`mx-4 mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs font-semibold sm:mx-6 ${actionMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}><CheckCircle2 size={16} />{actionMessage.text}</div>}
          {errorMessage && <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:mx-6"><AlertCircle size={16} />{errorMessage}</div>}
          <main className="mx-auto grid max-w-[1600px] gap-5 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_390px] sm:px-6">
            <section className="overflow-hidden rounded-xl border border-[#becabd]/45 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><div className="flex items-center justify-between border-b border-[#becabd]/35 px-5 py-4"><div><h2 className="text-sm font-bold">{copy.attendanceHistory}</h2><p className="mt-1 text-xs text-[#4d5f81]">{attendances.length} {copy.recorded}</p></div><span className="rounded-full bg-[#edf6ff] px-2.5 py-1 text-[10px] font-bold text-[#1971c2]">{pendingCount} {copy.pendingCorrections}</span></div>{loading ? <div className="flex min-h-[260px] items-center justify-center text-xs text-[#4d5f81]"><RefreshCw size={18} className="mr-2 animate-spin text-[#006838]" />{copy.loadingHistory}</div> : attendances.length === 0 ? <div className="flex min-h-[260px] items-center justify-center p-6 text-center text-xs text-[#4d5f81]">{copy.noHistory}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="border-b border-[#becabd]/35 bg-[#f7f8ff] text-[10px] font-bold uppercase tracking-[0.08em] text-[#4d5f81]"><th className="px-4 py-3">{copy.date}</th><th className="px-3 py-3">{copy.clock}</th><th className="px-3 py-3">{copy.duration}</th><th className="px-3 py-3">{copy.status}</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedAttendances.map((row) => { const duration = calculateDuration(row.clock_in, row.clock_out); const selected = employeeItem?.id === row.id; return <tr key={row.id} onClick={() => setSelectedItem(row)} className={`cursor-pointer transition hover:bg-[#f7f8ff] ${selected ? 'bg-[#eaf7f0]' : ''}`}><td className="px-4 py-3.5 font-semibold">{row.date}</td><td className="px-3 py-3.5 text-[#4d5f81]">{new Date(row.clock_in).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} WIB <span className="mx-1 text-[#becabd]">/</span> {row.clock_out ? `${new Date(row.clock_out).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} WIB` : '-'}</td><td className="px-3 py-3.5"><span className={duration.isUnderMin ? 'font-semibold text-[#b7791f]' : 'font-semibold'}>{duration.text}</span></td><td className="px-3 py-3.5"><div className="flex flex-wrap gap-1"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${duration.isUnderMin ? 'bg-[#fef9c3] text-[#b7791f]' : 'bg-[#eaf7f0] text-[#16834b]'}`}>{duration.isUnderMin ? copy.underSeven : copy.meetsSeven}</span>{row.correction && <span className="rounded bg-[#edf6ff] px-2 py-0.5 text-[10px] font-bold text-[#1971c2]">{copy.correction}: {correctionStatusLabel(row.correction.status)}</span>}</div></td></tr> })}</tbody></table></div>}<TablePagination page={employeeCurrentPage} pageSize={tablePageSize} totalItems={attendances.length} onPageChange={setTablePage} /></section>
            {employeeItem && <aside className="h-fit rounded-xl border border-[#becabd]/45 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"><div className="flex items-start justify-between border-b border-[#becabd]/35 pb-3"><div><span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4d5f81]">{copy.attendanceDetail}</span><h2 className="mt-1 text-sm font-bold">{employeeItem.date}</h2><p className="text-xs text-[#4d5f81]">{employeeItem.employee_id} • {employeeItem.department}</p></div><Clock3 size={18} className="text-[#006838]" /></div><div className="mt-4 space-y-2 rounded-xl border border-[#becabd]/35 bg-[#f7f8ff] p-3 text-xs"><div className="flex justify-between text-[#4d5f81]"><span>Clock In</span><strong>{new Date(employeeItem.clock_in).toLocaleTimeString(locale)} WIB</strong></div><div className="flex justify-between text-[#4d5f81]"><span>Clock Out</span><strong>{employeeItem.clock_out ? `${new Date(employeeItem.clock_out).toLocaleTimeString(locale)} WIB` : copy.noScan}</strong></div><div className="flex justify-between border-t border-[#becabd]/35 pt-2 text-[#4d5f81]"><span>{copy.source}</span><strong className="text-[#1971c2]">{employeeItem.source}</strong></div>{employeeItem.notes && <div className="border-t border-[#becabd]/35 pt-2 text-[#4d5f81]"><span className="font-semibold">{copy.incentiveNotes}:</span><p className="mt-1 text-[#121b2e]">{employeeItem.notes}</p></div>}</div><LocationMapPreview className="mt-4" clockIn={{ latitude: employeeItem.clock_in_latitude, longitude: employeeItem.clock_in_longitude, accuracyMeters: employeeItem.clock_in_accuracy_meters }} clockOut={{ latitude: employeeItem.clock_out_latitude, longitude: employeeItem.clock_out_longitude, accuracyMeters: employeeItem.clock_out_accuracy_meters }} />{employeeItem.correction ? <div className="mt-4 rounded-xl border border-[#b9d6ff] bg-[#edf6ff] p-3.5 text-xs"><div className="flex justify-between font-bold text-[#1e3765]"><span>{copy.correctionRequest}</span><span>{correctionStatusLabel(employeeItem.correction.status)}</span></div><p className="mt-2 text-[#4d5f81]">{employeeItem.correction.reason}</p></div> : <p className="mt-4 rounded-xl border border-dashed border-[#becabd] p-3 text-center text-xs italic text-[#4d5f81]">{copy.noCorrectionForDate}</p>}<button type="button" disabled={!!employeeItem.correction || isSubmittingCorrection} onClick={() => { setCorrectionType('CLOCK_IN'); setIsCorrectionOpen(true) }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#16834b] py-2.5 text-xs font-bold text-white hover:bg-[#006838] disabled:cursor-not-allowed disabled:opacity-50"><FilePlus2 size={14} />{employeeItem.correction ? copy.correctionSubmitted : copy.submitCorrection}</button></aside>}
          </main>
        </div>
        {isCorrectionOpen && employeeItem && <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f2342]/45 p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#d9e2fc] px-5 py-4"><div><h2 className="text-lg font-bold">{copy.submitAttendanceCorrection}</h2><p className="mt-1 text-xs text-[#4d5f81]">{interpolate(copy.sentToHr, { date: employeeItem.date })}</p></div><button type="button" onClick={() => setIsCorrectionOpen(false)} className="rounded p-1.5 text-[#4d5f81] hover:bg-[#f1f3ff]" aria-label={copy.close}><X size={18} /></button></div><form onSubmit={handleSubmitCorrection} className="space-y-4 p-5"><label className="block text-xs font-bold text-[#121b2e]">{copy.correctionType}<select value={correctionType} onChange={(event) => setCorrectionType(event.target.value as CorrectionType)} className="mt-1 w-full rounded-lg border border-[#d9e2fc] bg-white px-3 py-2.5 text-xs font-normal outline-none focus:border-[#069494]"><option value="CLOCK_IN">{copy.correctClockIn}</option><option value="CLOCK_OUT">{copy.correctClockOut}</option><option value="FULL_DAY">{copy.correctFullDay}</option></select></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">{copy.correctClockInLabel}<input type="time" value={proposedClockIn} onChange={(event) => setProposedClockIn(event.target.value)} className="mt-1 w-full rounded-lg border border-[#d9e2fc] px-3 py-2.5 text-xs font-normal" /></label><label className="text-xs font-bold">{copy.correctClockOutLabel}<input type="time" value={proposedClockOut} onChange={(event) => setProposedClockOut(event.target.value)} className="mt-1 w-full rounded-lg border border-[#d9e2fc] px-3 py-2.5 text-xs font-normal" /></label></div><label className="block text-xs font-bold">{copy.overtimeNote}<textarea value={incentiveNote} onChange={(event) => setIncentiveNote(event.target.value)} className="mt-1 min-h-16 w-full resize-y rounded-lg border border-[#d9e2fc] p-3 text-xs font-normal outline-none focus:border-[#069494]" placeholder={copy.overtimePlaceholder} /></label><label className="block text-xs font-bold">{copy.requestReason}<textarea required minLength={10} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} className="mt-1 min-h-24 w-full resize-y rounded-lg border border-[#d9e2fc] p-3 text-xs font-normal outline-none focus:border-[#069494]" placeholder={copy.reasonPlaceholder} /></label><div className="flex justify-end gap-2 border-t border-[#d9e2fc] pt-4"><button type="button" onClick={() => setIsCorrectionOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#4d5f81] hover:bg-[#f1f3ff]">{copy.cancel}</button><button type="submit" disabled={isSubmittingCorrection || correctionReason.trim().length < 10} className="inline-flex items-center gap-2 rounded-lg bg-[#16834b] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><FilePlus2 size={14} />{isSubmittingCorrection ? copy.sending : copy.sendRequest}</button></div></form></section></div>}
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#eaf2fc] text-[#121b2e]">
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#bcd4ee]/80 bg-white/72 px-4 shadow-[0_4px_16px_rgba(31,77,130,0.08)] backdrop-blur-2xl sm:px-6">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">
            <div className="hidden min-w-0 items-center gap-3 sm:flex">
              <span className="font-[family:var(--font-poppins)] text-sm font-semibold text-[#0B2548]">ANDIMA HRMS</span>
              <span className="h-5 border-l border-[#BCD4EE]" />
              <span className="text-xs font-semibold text-[#3f4940]">HRMS</span>
              <ChevronRight size={13} className="shrink-0 text-[#52749B]/60" />
              <span className="truncate text-xs font-semibold text-[#0C68D5]">{t('attendanceHistoryCorrection')}</span>
            </div>
            <span className="font-[family:var(--font-poppins)] text-sm font-semibold text-[#0B2548] sm:hidden">{t('attendanceHistoryCorrection')}</span>

            <div className="flex items-center gap-2 sm:gap-3"><HeaderAccount /></div>
          </div>
        </header>

        {/* SECTION TITLE & TABS */}
        <section className="border-b border-[#d9e2fc] bg-white px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.4px] text-[#121b2e]">{copy.managementTitle}</h1>
              <p className="mt-1 text-sm text-[#4d5f81]">
                {copy.managementDescription}
              </p>
            </div>
            {/* <span className="inline-flex w-fit items-center rounded-full border border-[#006838]/25 bg-[#eaf7f0] px-3 py-1.5 text-xs font-bold text-[#006838]">
              Role: HR / Manager
            </span> */}
          </div>

          {actionMessage && (
            <div
              className={`mx-auto mt-4 flex max-w-[1600px] items-center gap-2 rounded-lg border p-3 text-xs font-semibold ${
                actionMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {actionMessage.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mx-auto mt-4 flex max-w-[1600px] items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mx-auto mt-5 flex max-w-[1600px] flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-wrap gap-1 border-b border-[#d9e2fc] text-xs font-semibold">
              <button
                onClick={() => { setActiveTab('ALL'); setTablePage(1) }}
                className={`pb-2 px-3 transition ${
                  activeTab === 'ALL'
                    ? 'border-b-2 border-[#069494] text-[#006838] font-bold'
                    : 'text-[#4d5f81] hover:text-[#121b2e]'
                }`}
              >
                {copy.all} ({attendances.length})
              </button>
              <button
                onClick={() => { setActiveTab('PENDING'); setTablePage(1) }}
                className={`pb-2 px-3 transition ${
                  activeTab === 'PENDING'
                    ? 'border-b-2 border-[#069494] text-[#006838] font-bold'
                    : 'text-[#4d5f81] hover:text-[#121b2e]'
                }`}
              >
                {copy.awaitingApproval} ({attendances.filter((i) => i.correction?.status === 'PENDING').length})
              </button>
              <button
                onClick={() => { setActiveTab('APPROVED'); setTablePage(1) }}
                className={`pb-2 px-3 transition ${
                  activeTab === 'APPROVED'
                    ? 'border-b-2 border-[#069494] text-[#006838] font-bold'
                    : 'text-[#4d5f81] hover:text-[#121b2e]'
                }`}
              >
                {copy.approved} ({attendances.filter((i) => i.correction?.status === 'APPROVED').length})
              </button>
            </div>

            <input
              type="text"
              placeholder={copy.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setTablePage(1) }}
              className="w-full rounded-lg border border-[#d9e2fc] bg-[#f1f3ff] px-3 py-2 text-xs outline-none transition placeholder:text-[#4d5f81]/70 focus:border-[#069494] focus:ring-2 focus:ring-[#069494]/15 sm:w-64"
            />
          </div>
        </section>

        {/* MAIN BODY: TABLE + DRAWER */}
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 xl:flex-row sm:px-6">
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#becabd]/45 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center text-xs text-[#4d5f81]">
                <RefreshCw size={18} className="mr-2 animate-spin text-[#006838]" />
                <span>{copy.loadingData}</span>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center text-xs text-[#4d5f81]">
                <AlertCircle size={32} className="text-[#becabd]" />
                <p className="mt-2 font-bold text-[#121b2e]">{copy.noAttendance}</p>
                <p className="mt-1">{copy.noResults}</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#becabd]/35 bg-[#f7f8ff] text-[10px] font-bold uppercase tracking-[0.08em] text-[#4d5f81]">
                      <th className="px-4 py-3">{copy.employee}</th>
                      <th className="px-3 py-3">{copy.date}</th>
                      <th className="px-3 py-3">{copy.clock}</th>
                      <th className="px-3 py-3">{copy.workDuration}</th>
                      <th className="px-3 py-3">{copy.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedFilteredData.map((row) => {
                      const duration = calculateDuration(row.clock_in, row.clock_out)
                      const isSelected = selectedItem?.id === row.id

                      const clockInTime = new Date(row.clock_in)
                      const clockOutTime = row.clock_out ? new Date(row.clock_out) : null

                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedItem(row)}
                          className={`cursor-pointer transition hover:bg-[#f7f8ff] ${
                            isSelected ? 'bg-[#eaf7f0]' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-bold text-[#121b2e]">{row.full_name}</div>
                            <div className="mt-0.5 text-[10px] text-[#4d5f81]">{row.employee_id} • {row.department}</div>
                          </td>
                          <td className="px-3 py-3.5 font-medium text-[#3f4940]">{row.date}</td>
                          <td className="px-3 py-3.5 text-[#4d5f81]">
                            <div>
                              {copy.in}:{' '}
                              {!isNaN(clockInTime.getTime())
                                ? clockInTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                                : '-'}{' '}
                              WIB
                            </div>
                            <div>
                              {copy.out}:{' '}
                              {clockOutTime && !isNaN(clockOutTime.getTime())
                                ? `${clockOutTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} WIB`
                                : '-'}
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <span className={`font-semibold ${duration.isUnderMin ? 'text-[#b7791f]' : 'text-[#121b2e]'}`}>
                              {duration.text}
                            </span>
                            {duration.isUnderMin && (
                              <span className="mt-0.5 block text-[9px] font-bold text-[#b7791f]">{copy.lessThanSeven}</span>
                            )}
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  duration.isUnderMin ? 'bg-[#fef9c3] text-[#b7791f]' : 'bg-[#eaf7f0] text-[#16834b]'
                                }`}
                              >
                                {duration.isUnderMin ? copy.underSeven : copy.meetsSeven}
                              </span>
                              {row.correction && (
                                <span
                                  className={`rounded px-2 py-0.5 text-[9px] font-bold ${
                                    row.correction.status === 'APPROVED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : row.correction.status === 'REJECTED'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-[#edf6ff] text-[#1971c2]'
                                  }`}
                                >
                                  {copy.correction}: {correctionStatusLabel(row.correction.status)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <TablePagination page={managementCurrentPage} pageSize={tablePageSize} totalItems={filteredData.length} onPageChange={setTablePage} />
          </div>

          {/* DRAWER PANEL DETAIL (KANAN) */}
          {selectedItem && (
            <div className="w-full shrink-0 overflow-y-auto rounded-xl border border-[#becabd]/45 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] xl:w-[400px]">
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-[#becabd]/35 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4d5f81]">
                      {copy.detailAudit}
                    </span>
                    <h3 className="mt-0.5 text-sm font-bold text-[#121b2e]">
                      {selectedItem.full_name}
                    </h3>
                    <p className="text-xs text-[#4d5f81]">{selectedItem.employee_id} • {copy.date} {selectedItem.date}</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-[#becabd]/35 bg-[#f7f8ff] p-3 text-xs">
                  <div className="border-b border-[#becabd]/35 pb-1 font-bold text-[#121b2e]">
                    {copy.originalLog}
                  </div>
                  <div className="flex justify-between text-[#4d5f81]">
                    <span>Clock In:</span>
                    <span className="font-mono font-semibold">
                      {new Date(selectedItem.clock_in).toLocaleTimeString(locale)} WIB
                    </span>
                  </div>
                  <div className="flex justify-between text-[#4d5f81]">
                    <span>Clock Out:</span>
                    <span className="font-mono font-semibold">
                      {selectedItem.clock_out
                        ? `${new Date(selectedItem.clock_out).toLocaleTimeString(locale)} WIB`
                        : copy.noScan}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#becabd]/35 pt-1 text-[11px] text-[#4d5f81]">
                    <span>{copy.dataSource}:</span>
                    <span className="font-semibold text-[#1971c2]">{selectedItem.source}</span>
                  </div>
                </div>

                <LocationMapPreview
                  clockIn={{
                    latitude: selectedItem.clock_in_latitude,
                    longitude: selectedItem.clock_in_longitude,
                    accuracyMeters: selectedItem.clock_in_accuracy_meters,
                  }}
                  clockOut={{
                    latitude: selectedItem.clock_out_latitude,
                    longitude: selectedItem.clock_out_longitude,
                    accuracyMeters: selectedItem.clock_out_accuracy_meters,
                  }}
                />

                {selectedItem.correction ? (
                  <div
                    className={`space-y-2 rounded-xl border p-3.5 text-xs ${
                      selectedItem.correction.status === 'APPROVED'
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : selectedItem.correction.status === 'REJECTED'
                        ? 'border-red-200 bg-red-50/70'
                        : 'border-[#b9d6ff] bg-[#edf6ff]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[#1e3765]">
                      <span>{copy.correctionRequest}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          selectedItem.correction.status === 'APPROVED'
                            ? 'bg-emerald-200 text-emerald-900'
                            : selectedItem.correction.status === 'REJECTED'
                            ? 'bg-red-200 text-red-900'
                            : 'bg-[#b9d6ff] text-[#1971c2]'
                        }`}
                      >
                        {correctionStatusLabel(selectedItem.correction.status)}
                      </span>
                    </div>

                    <div className="space-y-1 text-[#4d5f81]">
                      <div>
                        <span className="font-semibold">{copy.correctionTypeLabel}:</span> {selectedItem.correction.correction_type}
                      </div>
                      {selectedItem.correction.proposed_clock_in && (
                        <div>
                          <span className="font-semibold">{copy.proposedClockIn}:</span> {selectedItem.correction.proposed_clock_in} WIB
                        </div>
                      )}
                      {selectedItem.correction.proposed_clock_out && (
                        <div>
                          <span className="font-semibold">{copy.proposedClockOut}:</span> {selectedItem.correction.proposed_clock_out} WIB
                        </div>
                      )}
                    </div>

                    <div className="border-t border-black/10 pt-2">
                      <span className="block font-semibold text-[#4d5f81]">{copy.reasonRequired}:</span>
                      <p className="mt-1 rounded border border-black/10 bg-white p-2 text-[11px] italic text-[#121b2e]">
                        &quot;{selectedItem.correction.reason}&quot;
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#becabd] bg-[#f7f8ff] p-3 text-center text-xs italic text-[#4d5f81]">
                    {copy.activeCorrectionNone}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-[#121b2e]">{copy.progressTrail}</div>
                  <div className="space-y-3 border-l-2 border-[#d9e2fc] pl-3 text-xs">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 absolute -left-[17px] top-1"></div>
                      <div className="font-semibold text-[#121b2e]">{copy.attendanceReceived}</div>
                      <div className="text-[10px] text-[#4d5f81]">{copy.fingerprintSystem} • {selectedItem.date}</div>
                    </div>
                    {selectedItem.correction && (
                      <div className="relative">
                        <div className="absolute -left-[17px] top-1 size-2 rounded-full bg-[#1971c2]"></div>
                        <div className="font-semibold text-[#1971c2]">{copy.correctionCreated}</div>
                        <div className="text-[10px] text-[#4d5f81]">
                          {copy.byEmployee} • {selectedItem.correction.created_at}
                        </div>
                      </div>
                    )}
                    {selectedItem.correction && selectedItem.correction.status !== 'PENDING' && (
                      <div className="relative">
                        <div
                          className={`absolute -left-[17px] top-1 size-2 rounded-full ${
                            selectedItem.correction.status === 'APPROVED' ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        ></div>
                        <div
                          className={`font-semibold ${
                            selectedItem.correction.status === 'APPROVED' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {selectedItem.correction.status === 'APPROVED' ? copy.correctionApprovedTrail : copy.correctionRejectedTrail}
                        </div>
                        <div className="text-[10px] text-[#4d5f81]">{copy.byHr}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedItem.correction?.status === 'PENDING' && (
                <div className="mt-4 flex gap-2 border-t border-[#becabd]/35 pt-4">
                  <button
                    type="button"
                    onClick={() => handleUpdateCorrectionStatus('APPROVED')}
                    className="flex-1 rounded-lg bg-[#16834b] py-2 text-xs font-bold text-white transition hover:bg-[#006838]"
                  >
                    {copy.approve}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCorrectionStatus('REJECTED')}
                    className="flex-1 rounded-lg bg-[#d64545] py-2 text-xs font-bold text-white transition hover:bg-[#b4232b]"
                  >
                    {copy.reject}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
