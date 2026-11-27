'use client'

import { useEffect, useState, useMemo } from 'react'
import { AlertCircle, CheckCircle2, Clock3, FilePlus2, X, History, LockKeyhole, Unlock, Search, Minus } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import AppHeader from '@/components/AppHeader'
import { useLanguage } from '@/components/i18n/LanguageProvider'
import LocationMapPreview from '@/components/attendance/LocationMapPreview'
import TablePagination from '@/components/hrms/TablePagination'
import { PageSkeleton, SkeletonTable } from '@/components/hrms/Skeleton'
import { badgeClass, buttonClass, cardClass, iconButtonClass, inputClass, modalClass, pageTitleClass, searchInputClass, segmentedClass, tableClass, type BadgeTone } from '@/components/ui/styles'

// Inline notices in the class design system style.
const noticeClass = 'flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg'
const errorNoticeClass = 'flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700'
// Selected table row: light blue fill with a blue bar on the left.

type CorrectionType = 'CLOCK_IN' | 'CLOCK_OUT' | 'FULL_DAY' | string
type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string
type AppRole = 'EMPLOYEE' | 'HR' | 'MANAGER'
type ManagementView = 'ATTENDANCE' | 'AUDIT' | 'CLOSING'

type AttendanceClosing = {
  id: string
  period_start: string
  period_end: string
  status: 'OPEN' | 'CLOSED'
  closed_by_b2_register_id: string
  closed_at: string
  reopened_by_b2_register_id: string | null
  reopened_at: string | null
  reason: string | null
  closed_by_name: string
  reopened_by_name: string
}

type AttendanceClosingRow = Omit<AttendanceClosing, 'closed_by_name' | 'reopened_by_name'>

type AttendanceAuditEntry = {
  id: string
  attendance_id: string | null
  correction_id: number | null
  closing_id: string | null
  target_b2_register_id: string | null
  actor_b2_register_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
  target_name: string
  actor_name: string
}

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
  notes: string | null
  correction: AttendanceCorrection | null
}

type AttendanceEmployee = {
  employee_id: string
  full_name: string
  departement_id: string | null
  d3_departments: { name: string } | null
}

type AttendanceQueryRow = {
  id: string
  b2_register_id: string
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
  b2_register: AttendanceEmployee | null
  d3_attendance_corrections: AttendanceCorrection[] | null
}

export default function AttendancePageUI() {
  const { t, language } = useLanguage()
  const locale = language === 'id' ? 'id-ID' : 'en-GB'
  const copy = language === 'id' ? {
    accessRequired: 'Akses dashboard memerlukan akun HRMS yang telah dipetakan.', loadFailed: 'Data presensi belum dapat dimuat dari Supabase.', connectionFailed: 'Terjadi kesalahan saat menghubungkan ke Supabase.', employee: 'Karyawan', general: 'Umum', correction: 'Koreksi presensi', correctionApproved: 'Koreksi absensi {name} berhasil disetujui dan diterapkan.', correctionRejected: 'Koreksi absensi {name} berhasil ditolak.', updateFailed: 'Gagal memperbarui koreksi', unknownError: 'Terjadi kesalahan', requestFailed: 'Pengajuan koreksi gagal disimpan.', noteFailed: 'Koreksi tersimpan, tetapi catatan insentif gagal disimpan', requestSuccess: 'Koreksi berhasil diajukan dan menunggu persetujuan HR.', incomplete: 'Belum lengkap', hours: 'jam',
    selfService: 'Layanan mandiri karyawan', myHistory: 'Riwayat Presensi Saya', greeting: 'Halo', reviewMy: 'Tinjau detail kehadiran dan ajukan koreksi bila ada data yang perlu diperbaiki.', attendanceHistory: 'Riwayat kehadiran', recorded: 'catatan presensi tercatat', pendingCorrections: 'koreksi menunggu', loadingHistory: 'Memuat riwayat presensi...', noHistory: 'Belum ada riwayat presensi.', date: 'Tanggal', clock: 'Clock in / out', duration: 'Durasi', durationStatus: 'Status durasi', correctionStatus: 'Status koreksi', status: 'Status', underSeven: 'DI BAWAH 7 JAM', meetsSeven: 'MEMENUHI 7 JAM', attendanceDetail: 'Detail presensi', noScan: 'Belum ada scan', source: 'Sumber', incentiveNotes: 'Catatan insentif/lembur', correctionRequest: 'Pengajuan koreksi', noCorrectionForDate: 'Belum ada pengajuan koreksi untuk tanggal ini.', correctionSubmitted: 'Koreksi sudah diajukan', submitCorrection: 'Ajukan koreksi',
    submitAttendanceCorrection: 'Ajukan koreksi presensi', sentToHr: 'Tanggal {date} akan dikirim ke HR untuk ditinjau.', close: 'Tutup', correctionType: 'Tipe koreksi', correctClockIn: 'Perbaikan Clock In', correctClockOut: 'Perbaikan Clock Out', correctFullDay: 'Perbaikan satu hari penuh', correctClockInLabel: 'Clock In yang benar', correctClockOutLabel: 'Clock Out yang benar', overtimeNote: 'Catatan lembur / insentif (opsional)', overtimePlaceholder: 'Isi jika jam kerja melebihi jam formal dan membutuhkan catatan insentif', requestReason: 'Alasan pengajuan', reasonPlaceholder: 'Jelaskan alasan koreksi (minimal 10 karakter)', cancel: 'Batal', sending: 'Mengirim...', sendRequest: 'Kirim pengajuan',
    managementTitle: 'Manajemen Presensi & Koreksi', clockInLabel: 'Jam masuk', clockOutLabel: 'Jam pulang', managementDescription: 'Kelola riwayat presensi, validasi minimum 7 jam kerja, dan persetujuan koreksi absensi yang terhubung ke database Supabase.', all: 'Semua', awaitingApproval: 'Menunggu Persetujuan', approved: 'Disetujui', searchPlaceholder: 'Cari nama, NIP, atau divisi...', loadingData: 'Memuat data kehadiran karyawan dari Supabase...', noAttendance: 'Tidak ada data presensi', noResults: 'Tidak ada data yang cocok dengan kriteria filter atau pencarian Anda.', workDuration: 'Durasi kerja', lessThanSeven: '< 7 jam kerja', detailAudit: 'Detail presensi & audit', originalLog: 'Data log asli', dataSource: 'Sumber data', activeCorrectionNone: 'Tidak ada pengajuan koreksi aktif untuk tanggal ini.', correctionTypeLabel: 'Tipe koreksi', proposedClockIn: 'Clock In diajukan', proposedClockOut: 'Clock Out diajukan', reasonRequired: 'Alasan pengajuan (wajib)', progressTrail: 'Progres & riwayat', attendanceReceived: 'Log presensi diterima', attendanceSource: 'Biometrik wajah', correctionCreated: 'Pengajuan koreksi dibuat', byEmployee: 'Oleh pegawai', correctionApprovedTrail: 'Koreksi disetujui', correctionRejectedTrail: 'Koreksi ditolak', byHr: 'Oleh HR Admin', approve: 'Setujui', reject: 'Tolak', in: 'Masuk', out: 'Pulang', attendanceTab: 'Riwayat Kehadiran', auditTab: 'Riwayat Audit', closingTab: 'Penutupan Presensi', fromDate: 'Dari tanggal', toDate: 'Sampai tanggal', clearFilter: 'Reset filter', closedPeriod: 'Periode terkunci', openPeriod: 'Periode terbuka', periodClosed: 'Periode berhasil ditutup.', periodReopened: 'Periode dibuka kembali melalui Emergency Edit.', closingFailed: 'Gagal mengubah penutupan presensi', auditEmpty: 'Belum ada riwayat perubahan kehadiran.', closingEmpty: 'Belum ada periode penutupan presensi.', periodStart: 'Awal periode', periodEnd: 'Akhir periode', closePeriod: 'Tutup periode', emergencyEdit: 'Edit Darurat', closedAt: 'Ditutup pada', reopenedAt: 'Dibuka pada', action: 'Aksi', actor: 'Pelaku', auditAction: 'Perubahan', reason: 'Catatan', searchAuditPlaceholder: 'Cari karyawan, pelaku, perubahan, atau catatan...', searchClosingPlaceholder: 'Cari periode, status, pelaku, atau catatan...',
  } : {
    accessRequired: 'This dashboard requires a mapped HRMS account.', loadFailed: 'Attendance data could not be loaded from Supabase.', connectionFailed: 'An error occurred while connecting to Supabase.', employee: 'Employee', general: 'General', correction: 'Attendance correction', correctionApproved: 'Attendance correction for {name} was approved and applied.', correctionRejected: 'Attendance correction for {name} was rejected.', updateFailed: 'Unable to update correction', unknownError: 'An unexpected error occurred', requestFailed: 'The correction request could not be saved.', noteFailed: 'The correction was saved, but the incentive note could not be saved', requestSuccess: 'Correction request submitted and awaiting HR approval.', incomplete: 'Incomplete', hours: 'hours',
    selfService: 'Employee self service', myHistory: 'My Attendance History', greeting: 'Hello', reviewMy: 'Review attendance details and submit a correction when a record needs updating.', attendanceHistory: 'Attendance history', recorded: 'attendance records', pendingCorrections: 'pending corrections', loadingHistory: 'Loading attendance history...', noHistory: 'No attendance history yet.', date: 'Date', clock: 'Clock in / out', duration: 'Duration', durationStatus: 'Duration status', correctionStatus: 'Correction status', status: 'Status', underSeven: 'UNDER 7 HOURS', meetsSeven: 'MEETS 7 HOURS', attendanceDetail: 'Attendance details', noScan: 'No scan yet', source: 'Source', incentiveNotes: 'Overtime / incentive note', correctionRequest: 'Correction request', noCorrectionForDate: 'No correction request for this date.', correctionSubmitted: 'Correction submitted', submitCorrection: 'Submit correction',
    submitAttendanceCorrection: 'Submit attendance correction', sentToHr: 'The record for {date} will be sent to HR for review.', close: 'Close', correctionType: 'Correction type', correctClockIn: 'Correct clock in', correctClockOut: 'Correct clock out', correctFullDay: 'Correct full day', correctClockInLabel: 'Correct clock in', correctClockOutLabel: 'Correct clock out', overtimeNote: 'Overtime / incentive note (optional)', overtimePlaceholder: 'Add a note when working hours exceed normal hours and need an incentive record', requestReason: 'Reason for request', reasonPlaceholder: 'Explain the correction reason (at least 10 characters)', cancel: 'Cancel', sending: 'Sending...', sendRequest: 'Submit request',
    clockInLabel: 'Clock in', clockOutLabel: 'Clock out', managementTitle: 'Attendance & Correction Management', managementDescription: 'Manage attendance history, the seven-hour minimum validation, and attendance-correction approvals connected to Supabase.', all: 'All', awaitingApproval: 'Awaiting approval', approved: 'Approved', searchPlaceholder: 'Search by name, employee ID, or department...', loadingData: 'Loading employee attendance data from Supabase...', noAttendance: 'No attendance data', noResults: 'No data matches your current filter or search.', workDuration: 'Work duration', lessThanSeven: '< 7 work hours', detailAudit: 'Attendance details & audit', originalLog: 'Original log data', dataSource: 'Data source', activeCorrectionNone: 'There is no active correction request for this date.', correctionTypeLabel: 'Correction type', proposedClockIn: 'Proposed clock in', proposedClockOut: 'Proposed clock out', reasonRequired: 'Request reason (required)', progressTrail: 'Progress & history', attendanceReceived: 'Attendance log received', attendanceSource: 'Face biometric', correctionCreated: 'Correction request created', byEmployee: 'By employee', correctionApprovedTrail: 'Correction approved', correctionRejectedTrail: 'Correction rejected', byHr: 'By HR Admin', approve: 'Approve', reject: 'Reject', in: 'In', out: 'Out', attendanceTab: 'Attendance History', auditTab: 'Audit Trail', closingTab: 'Attendance Closing', fromDate: 'From date', toDate: 'To date', clearFilter: 'Clear filter', closedPeriod: 'Closed period', openPeriod: 'Open period', periodClosed: 'Attendance period closed successfully.', periodReopened: 'Period reopened through Emergency Edit.', closingFailed: 'Unable to update attendance closing', auditEmpty: 'No attendance change history yet.', closingEmpty: 'No attendance closing periods yet.', periodStart: 'Period start', periodEnd: 'Period end', closePeriod: 'Close period', emergencyEdit: 'Emergency Edit', closedAt: 'Closed at', reopenedAt: 'Reopened at', action: 'Action', actor: 'Actor', auditAction: 'Change', reason: 'Note', searchAuditPlaceholder: 'Search employee, actor, change, or note...', searchClosingPlaceholder: 'Search period, status, actor, or note...',
  }
  const interpolate = (value: string, values: Record<string, string>) => value.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '')
  const formatAttendanceTime = (value: string | null | undefined) => {
    if (!value) return '-'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime())
      ? '-'
      : parsed.toLocaleTimeString(locale, {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        })
  }
  const formatCorrectionTime = (value: string | null | undefined) => {
    return formatAttendanceTime(value)
  }
  const correctionStatusLabel = (status: CorrectionStatus) => ({ PENDING: language === 'id' ? 'Menunggu persetujuan' : 'Awaiting approval', APPROVED: copy.approved, REJECTED: language === 'id' ? 'Ditolak' : 'Rejected' }[status] ?? status)
  const correctionStatusTone = (status: CorrectionStatus): BadgeTone => status === 'APPROVED'
    ? 'green'
    : status === 'REJECTED'
    ? 'red'
    : 'amber'
  const correctionStatusBadgeClass = (status: CorrectionStatus) => badgeClass(correctionStatusTone(status))
  // Tinted frame for the correction request box, same color meaning as the badge.
  const correctionPanelClass = (status: CorrectionStatus) => status === 'APPROVED'
    ? 'border-emerald-200 bg-emerald-50/60'
    : status === 'REJECTED'
    ? 'border-red-200 bg-red-50/60'
    : 'border-amber-200 bg-amber-50/60'
  const [attendances, setAttendances] = useState<AttendanceItem[]>([])
  const [selectedItem, setSelectedItem] = useState<AttendanceItem | null>(null)
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')
  const [managementView, setManagementView] = useState<ManagementView>('ATTENDANCE')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [closings, setClosings] = useState<AttendanceClosing[]>([])
  const [auditEntries, setAuditEntries] = useState<AttendanceAuditEntry[]>([])
  const [closingStart, setClosingStart] = useState('')
  const [closingEnd, setClosingEnd] = useState('')
  const [closingReason, setClosingReason] = useState('')
  const [isClosingSaving, setIsClosingSaving] = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [appRole, setAppRole] = useState<AppRole | null>(null)
  const [viewerB2RegisterId, setViewerB2RegisterId] = useState('')
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
          b2_register_id,
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
          b2_register!d3_attendances_b2_register_id_fkey (
            employee_id,
            full_name,
            departement_id,
            d3_departments!b2_register_departement_id_fkey (
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

      if (appRole === 'EMPLOYEE' && viewerB2RegisterId) {
        query = query.eq('b2_register_id', viewerB2RegisterId)
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
          const emp = item.b2_register
          const corrList = item.d3_attendance_corrections || []
          const corr = corrList.length > 0 ? corrList[0] : null

          return {
            id: item.id || `ATT-${item.b2_register_id}`,
            employee_id: emp?.employee_id || 'EMP-AND-000',
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
            notes: item.notes || null,
            correction: corr
              ? {
                  id: corr.id,
                  correction_type: corr.correction_type || 'CLOCK_IN',
                  proposed_clock_in: corr.proposed_clock_in,
                  proposed_clock_out: corr.proposed_clock_out,
                  reason: corr.reason || copy.correction,
                  status: corr.status || 'PENDING',
                  created_at: corr.created_at ?? item.date,
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

  async function fetchAttendanceManagementData() {
    const supabase = createClient()
    const closingQuery = supabase
      .from('d3_attendance_closings')
      .select('id, period_start, period_end, status, closed_by_b2_register_id, closed_at, reopened_by_b2_register_id, reopened_at, reason')
      .order('period_start', { ascending: false })

    if (appRole === 'EMPLOYEE') {
      const { data: closingRows, error: closingError } = await closingQuery
      if (closingError) {
        console.warn('Attendance closing query notice:', closingError.message)
        setClosings([])
        setAuditEntries([])
        return
      }

      setClosings(((closingRows ?? []) as AttendanceClosingRow[]).map((closing) => ({
        ...closing,
        closed_by_name: copy.employee,
        reopened_by_name: copy.employee,
      })))
      setAuditEntries([])
      return
    }

    const [
      { data: closingRows, error: closingError },
      { data: auditRows, error: auditError },
    ] = await Promise.all([
      closingQuery,
      supabase
        .from('d3_attendance_audit_log')
        .select('id, attendance_id, correction_id, closing_id, target_b2_register_id, actor_b2_register_id, action, details, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    const closingRecords = closingError ? [] : (closingRows ?? []) as AttendanceClosingRow[]
    if (closingError) console.warn('Attendance closing query notice:', closingError.message)

    if (auditError) {
      console.warn('Attendance audit query notice:', auditError.message)
    }

    const rows = auditError ? [] : (auditRows ?? []) as Omit<AttendanceAuditEntry, 'target_name' | 'actor_name'>[]
    const registerIds = [...new Set([
      ...rows.flatMap((row) => [row.target_b2_register_id, row.actor_b2_register_id]),
      ...closingRecords.flatMap((closing) => [closing.closed_by_b2_register_id, closing.reopened_by_b2_register_id]),
    ].filter(Boolean))] as string[]
    let names = new Map<string, string>()
    if (registerIds.length) {
      const { data: registers } = await supabase
        .from('b2_register')
        .select('id, full_name, employee_id')
        .in('id', registerIds)
      names = new Map((registers ?? []).map((register) => [register.id, `${register.full_name || copy.employee} · ${register.employee_id || '-'}`]))
    }

    setAuditEntries(rows.map((row) => ({
      ...row,
      target_name: row.target_b2_register_id ? names.get(row.target_b2_register_id) ?? copy.employee : copy.general,
      actor_name: row.actor_b2_register_id ? names.get(row.actor_b2_register_id) ?? copy.employee : copy.general,
    })))
    setClosings(closingRecords.map((closing) => ({
      ...closing,
      closed_by_name: names.get(closing.closed_by_b2_register_id) ?? copy.employee,
      reopened_by_name: closing.reopened_by_b2_register_id ? names.get(closing.reopened_by_b2_register_id) ?? copy.employee : copy.general,
    })))
  }

  useEffect(() => {
    let mounted = true

    async function loadAccountAccess() {
      const supabase = createClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) return

      const { data: access, error: accessError } = await supabase
        .from('b2_register')
        .select('id, app_role, full_name')
        .eq('auth_user_id', userData.user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (!mounted || accessError || !access) return
      const name = userData.user.user_metadata?.full_name
      setAppRole(access.app_role as AppRole)
      setViewerB2RegisterId(access.id)
      setViewerName(access.full_name?.trim() || (typeof name === 'string' && name.trim() ? name.trim() : userData.user.email?.split('@')[0] || copy.employee))
    }

    void loadAccountAccess()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    // Data loading is intentionally triggered after the authenticated role is known.
    if (appRole) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchAttendanceData()
      void fetchAttendanceManagementData()
    }
    // fetchAttendanceData reads the authenticated session and active role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appRole, viewerB2RegisterId])

  const getClosingForDate = (date: string) => closings.find((closing) => closing.status === 'CLOSED' && date >= closing.period_start && date <= closing.period_end)
  const isDateClosed = (date: string) => Boolean(getClosingForDate(date))

  async function handleCreateClosing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (appRole === 'EMPLOYEE' || !viewerB2RegisterId || !closingStart || !closingEnd || closingStart > closingEnd) return

    setIsClosingSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('d3_attendance_closings').insert({
      period_start: closingStart,
      period_end: closingEnd,
      closed_by_b2_register_id: viewerB2RegisterId,
      reason: closingReason.trim() || null,
    })

    if (error) {
      setActionMessage({ type: 'error', text: `${copy.closingFailed}: ${error.message}` })
    } else {
      setClosingStart('')
      setClosingEnd('')
      setClosingReason('')
      await fetchAttendanceManagementData()
      setActionMessage({ type: 'success', text: copy.periodClosed })
    }
    setIsClosingSaving(false)
    setTimeout(() => setActionMessage(null), 4000)
  }

  async function handleEmergencyEdit(closing: AttendanceClosing) {
    if (appRole === 'EMPLOYEE' || !viewerB2RegisterId) return

    setIsClosingSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('d3_attendance_closings')
      .update({ status: 'OPEN', reopened_by_b2_register_id: viewerB2RegisterId, reopened_at: new Date().toISOString() })
      .eq('id', closing.id)
      .eq('status', 'CLOSED')

    if (error) {
      setActionMessage({ type: 'error', text: `${copy.closingFailed}: ${error.message}` })
    } else {
      await fetchAttendanceManagementData()
      setActionMessage({ type: 'success', text: copy.periodReopened })
    }
    setIsClosingSaving(false)
    setTimeout(() => setActionMessage(null), 4000)
  }

  function matchesDateRange(date: string) {
    return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo)
  }

  // Action Handler Persetujuan / Penolakan Koreksi
  async function handleUpdateCorrectionStatus(status: 'APPROVED' | 'REJECTED') {
    if (!selectedItem?.correction) return

    if (isDateClosed(selectedItem.date)) {
      setActionMessage({ type: 'error', text: copy.closedPeriod })
      return
    }

    try {
      const supabase = createClient()
      const correctionId = selectedItem.correction.id
      const attendanceUpdate: { clock_in?: string; clock_out?: string } = {}
      if (status === 'APPROVED') {
        const correctionType = selectedItem.correction.correction_type

        if (
          (correctionType === 'CLOCK_IN' || correctionType === 'FULL_DAY') &&
          selectedItem.correction.proposed_clock_in
        ) {
          attendanceUpdate.clock_in = selectedItem.correction.proposed_clock_in
        }
        if (
          (correctionType === 'CLOCK_OUT' || correctionType === 'FULL_DAY') &&
          selectedItem.correction.proposed_clock_out
        ) {
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

      const correctionUpdate: { status: string; reviewed_by_b2_register_id?: string } = {
        status,
        reviewed_by_b2_register_id: viewerB2RegisterId || undefined,
      }
      const { error: correctionError } = await supabase
        .from('d3_attendance_corrections')
        .update(correctionUpdate)
        .eq('id', correctionId)

      if (correctionError) throw correctionError

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
    if (!selectedItem || !viewerB2RegisterId || correctionReason.trim().length < 10) return

    if (isDateClosed(selectedItem.date)) {
      setActionMessage({ type: 'error', text: copy.closedPeriod })
      return
    }

    setIsSubmittingCorrection(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('d3_attendance_corrections')
      .insert({
        attendance_id: selectedItem.id,
        requested_by_b2_register_id: viewerB2RegisterId,
        correction_type: correctionType,
        proposed_clock_in: proposedClockIn ? `${selectedItem.date}T${proposedClockIn}:00+07:00` : null,
        proposed_clock_out: proposedClockOut ? `${selectedItem.date}T${proposedClockOut}:00+07:00` : null,
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
      created_at: data.created_at,
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
      if (!matchesDateRange(item.date)) return false
      const matchesSearch =
        item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false
      if (activeTab === 'ALL') return true
      return item.correction?.status === activeTab
    })
  }, [attendances, searchQuery, activeTab, dateFrom, dateTo])
  const filteredEmployeeData = useMemo(
    () => attendances.filter((item) => matchesDateRange(item.date)),
    [attendances, dateFrom, dateTo]
  )
  const tablePageSize = 10
  const employeeTotalPages = Math.max(1, Math.ceil(filteredEmployeeData.length / tablePageSize))
  const employeeCurrentPage = Math.min(tablePage, employeeTotalPages)
  const paginatedAttendances = filteredEmployeeData.slice((employeeCurrentPage - 1) * tablePageSize, employeeCurrentPage * tablePageSize)
  const managementTotalPages = Math.max(1, Math.ceil(filteredData.length / tablePageSize))
  const managementCurrentPage = Math.min(tablePage, managementTotalPages)
  const paginatedFilteredData = filteredData.slice((managementCurrentPage - 1) * tablePageSize, managementCurrentPage * tablePageSize)

  // Until the role is known we cannot tell the employee view from the HR view,
  // so show the shared page skeleton instead of a layout that may switch.
  if (!appRole && loading) {
    return <PageSkeleton withTopBar layout="split" />
  }

  if (appRole === 'EMPLOYEE') {
    const employeeItem = selectedItem || filteredEmployeeData[0] || attendances[0]
    const pendingCount = filteredEmployeeData.filter((item) => item.correction?.status === 'PENDING').length

    return (
      <>
        <div className="min-h-screen bg-white text-slate-800">
          <AppHeader pageTitle={t('myAttendance')} />
          <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className={pageTitleClass.eyebrow}>{copy.selfService}</p><h1 className={`mt-1 ${pageTitleClass.title}`}>{copy.myHistory}</h1><p className={pageTitleClass.subtitle}>{copy.greeting}, {viewerName || copy.employee}. {copy.reviewMy}</p></div><div className="flex flex-wrap items-end justify-end gap-2"><label className="grid gap-1.5 text-xs font-semibold text-slate-700"><span>{copy.fromDate}</span><input aria-label={copy.fromDate} type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setTablePage(1) }} className={inputClass('text-xs font-normal')} /></label><label className="grid gap-1.5 text-xs font-semibold text-slate-700"><span>{copy.toDate}</span><input aria-label={copy.toDate} type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setTablePage(1) }} className={inputClass('text-xs font-normal')} /></label>{(dateFrom || dateTo) && <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); setTablePage(1) }} className={buttonClass('secondary')}>{copy.clearFilter}</button>}</div></section>
          {actionMessage && <div className={noticeClass}>{actionMessage.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : <AlertCircle size={16} className="shrink-0 text-red-600" />}{actionMessage.text}</div>}
          {errorMessage && <div className={errorNoticeClass}><AlertCircle size={16} className="shrink-0" />{errorMessage}</div>}
          <main className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className={`overflow-hidden ${cardClass}`}><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">{copy.attendanceHistory}</h2><p className="mt-1 text-xs text-slate-500">{filteredEmployeeData.length} {copy.recorded}</p></div><span className={badgeClass('blue')}>{pendingCount} {copy.pendingCorrections}</span></div>{loading ? <SkeletonTable rows={6} columns={5} /> : filteredEmployeeData.length === 0 ? <div className="flex min-h-[260px] items-center justify-center p-6 text-center text-xs font-medium text-slate-500">{attendances.length === 0 ? copy.noHistory : copy.noResults}</div> : <div className="overflow-x-auto"><table className={`${tableClass.table} min-w-[650px]`}><thead><tr className={tableClass.head}><th className={tableClass.headCell}>{copy.date}</th><th className={tableClass.headCell}>{copy.clock}</th><th className={tableClass.headCell}>{copy.duration}</th><th className={tableClass.headCell}>{copy.durationStatus}</th><th className={tableClass.headCell}>{copy.correctionStatus}</th></tr></thead><tbody>{paginatedAttendances.map((row) => { const duration = calculateDuration(row.clock_in, row.clock_out); const selected = employeeItem?.id === row.id; return <tr key={row.id} onClick={() => setSelectedItem(row)} className={`${selected ? tableClass.rowSelected : tableClass.row} cursor-pointer`}><td className={`${tableClass.cell} font-semibold`}>{row.date}</td><td className={tableClass.cell}>{formatAttendanceTime(row.clock_in)} WIB <span className="mx-1 text-slate-300">/</span> {row.clock_out ? `${formatAttendanceTime(row.clock_out)} WIB` : '-'}</td><td className={tableClass.cell}><span className={duration.isUnderMin ? 'font-semibold text-amber-700' : 'font-semibold text-slate-900'}>{duration.text}</span></td><td className={tableClass.cell}><span className={badgeClass(duration.isUnderMin ? 'amber' : 'green')}>{duration.isUnderMin ? copy.underSeven : copy.meetsSeven}</span></td><td className={tableClass.cell}><div className="flex flex-wrap items-center gap-1">{isDateClosed(row.date) && <span className={badgeClass('slate')}>{copy.closedPeriod}</span>}{row.correction ? <span className={correctionStatusBadgeClass(row.correction.status)}>{copy.correction}: {correctionStatusLabel(row.correction.status)}</span> : !isDateClosed(row.date) ? <span className="inline-flex items-center text-slate-400" aria-label={copy.noCorrectionForDate}><Minus size={14} strokeWidth={2.5} /></span> : null}</div></td></tr> })}</tbody></table></div>}<TablePagination page={employeeCurrentPage} pageSize={tablePageSize} totalItems={filteredEmployeeData.length} onPageChange={setTablePage} /></section>
            {employeeItem && <aside className={`h-fit p-5 ${cardClass}`}><div className="flex items-start justify-between border-b border-slate-100 pb-3"><div><span className="text-xs font-semibold text-slate-500">{copy.attendanceDetail}</span><h2 className="mt-1 text-sm font-bold text-slate-900">{employeeItem.date}</h2><p className="text-xs text-slate-500">{employeeItem.employee_id} • {employeeItem.department}</p></div><Clock3 size={18} className="text-slate-400" /></div><div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><div className="flex justify-between text-slate-500"><span>{copy.clockInLabel}</span><strong className="text-slate-800">{formatAttendanceTime(employeeItem.clock_in)} WIB</strong></div><div className="flex justify-between text-slate-500"><span>{copy.clockOutLabel}</span><strong className="text-slate-800">{employeeItem.clock_out ? `${formatAttendanceTime(employeeItem.clock_out)} WIB` : copy.noScan}</strong></div><div className="flex justify-between border-t border-slate-200 pt-2 text-slate-500"><span>{copy.source}</span><strong className="text-blue-700">{copy.attendanceSource}</strong></div>{employeeItem.notes && <div className="border-t border-slate-200 pt-2 text-slate-500"><span className="font-semibold">{copy.incentiveNotes}:</span><p className="mt-1 whitespace-pre-line text-slate-800 [overflow-wrap:anywhere]">{employeeItem.notes}</p></div>}{isDateClosed(employeeItem.date) && <div className="flex items-center gap-2 border-t border-amber-200 pt-2 font-bold text-amber-700"><LockKeyhole size={13} />{copy.closedPeriod}</div>}</div><LocationMapPreview className="mt-4" clockIn={{ latitude: employeeItem.clock_in_latitude, longitude: employeeItem.clock_in_longitude, accuracyMeters: employeeItem.clock_in_accuracy_meters }} clockOut={{ latitude: employeeItem.clock_out_latitude, longitude: employeeItem.clock_out_longitude, accuracyMeters: employeeItem.clock_out_accuracy_meters }} />{employeeItem.correction ? <div className={`mt-4 rounded-xl border p-3.5 text-xs ${correctionPanelClass(employeeItem.correction?.status ?? "PENDING")}`}><div className="flex items-center justify-between gap-2 font-bold text-slate-900"><span>{copy.correctionRequest}</span><span className={correctionStatusBadgeClass(employeeItem.correction.status)}>{correctionStatusLabel(employeeItem.correction.status)}</span></div><p className="mt-2 whitespace-pre-line text-slate-600 [overflow-wrap:anywhere]">{employeeItem.correction.reason}</p></div> : <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">{copy.noCorrectionForDate}</p>}<button type="button" disabled={!!employeeItem.correction || isSubmittingCorrection || isDateClosed(employeeItem.date)} onClick={() => { if (isDateClosed(employeeItem.date)) { setActionMessage({ type: 'error', text: copy.closedPeriod }); return }; setCorrectionType('CLOCK_IN'); setIsCorrectionOpen(true) }} className={buttonClass('primary', 'md', 'mt-4 w-full')}><FilePlus2 size={14} />{isDateClosed(employeeItem.date) ? copy.closedPeriod : employeeItem.correction ? copy.correctionSubmitted : copy.submitCorrection}</button></aside>}
          </main>
          </div>
        </div>
        {isCorrectionOpen && employeeItem && <div className={modalClass.overlay}><section role="dialog" aria-modal="true" className={`${modalClass.panel} max-h-[90vh] max-w-lg overflow-y-auto`}><div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className={modalClass.title}>{copy.submitAttendanceCorrection}</h2><p className="mt-1 text-xs text-slate-500">{interpolate(copy.sentToHr, { date: employeeItem.date })}</p></div><button type="button" onClick={() => setIsCorrectionOpen(false)} className={iconButtonClass()} aria-label={copy.close}><X className="size-5" /></button></div><form onSubmit={handleSubmitCorrection} className="space-y-4 p-5"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><p className="mb-2 font-bold text-slate-900">{copy.originalLog}</p><div className="grid grid-cols-2 gap-3 text-slate-500"><div><span className="block text-[10px] font-bold uppercase tracking-wider">{copy.clockInLabel}</span><strong className="text-slate-900">{formatAttendanceTime(employeeItem.clock_in)} WIB</strong></div><div><span className="block text-[10px] font-bold uppercase tracking-wider">{copy.clockOutLabel}</span><strong className="text-slate-900">{employeeItem.clock_out ? `${formatAttendanceTime(employeeItem.clock_out)} WIB` : copy.noScan}</strong></div></div></div><label className="block text-xs font-semibold text-slate-700">{copy.correctionType}<select value={correctionType} onChange={(event) => { const nextType = event.target.value as CorrectionType; setCorrectionType(nextType); if (nextType === 'CLOCK_IN') setProposedClockOut(''); if (nextType === 'CLOCK_OUT') setProposedClockIn('') }} className={inputClass('mt-1.5 font-normal')}><option value="CLOCK_IN">{copy.correctClockIn}</option><option value="CLOCK_OUT">{copy.correctClockOut}</option><option value="FULL_DAY">{copy.correctFullDay}</option></select></label><div className="grid gap-3 sm:grid-cols-2">{(correctionType === 'CLOCK_IN' || correctionType === 'FULL_DAY') && <label className="block text-xs font-semibold text-slate-700">{copy.correctClockInLabel}<input required type="time" value={proposedClockIn} onChange={(event) => setProposedClockIn(event.target.value)} className={inputClass('mt-1.5 font-normal')} /></label>}{(correctionType === 'CLOCK_OUT' || correctionType === 'FULL_DAY') && <label className="block text-xs font-semibold text-slate-700">{copy.correctClockOutLabel}<input required type="time" value={proposedClockOut} onChange={(event) => setProposedClockOut(event.target.value)} className={inputClass('mt-1.5 font-normal')} /></label>}</div><label className="block text-xs font-semibold text-slate-700">{copy.overtimeNote}<textarea maxLength={1000} value={incentiveNote} onChange={(event) => setIncentiveNote(event.target.value)} className={inputClass('mt-1.5 min-h-16 resize-y font-normal')} placeholder={copy.overtimePlaceholder} /></label><label className="block text-xs font-semibold text-slate-700">{copy.requestReason}<textarea required minLength={10} maxLength={1000} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} className={inputClass('mt-1.5 min-h-24 resize-y font-normal')} placeholder={copy.reasonPlaceholder} /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsCorrectionOpen(false)} className={buttonClass('secondary')}>{copy.cancel}</button><button type="submit" disabled={isSubmittingCorrection || correctionReason.trim().length < 10} className={buttonClass('primary')}><FilePlus2 size={14} />{isSubmittingCorrection ? copy.sending : copy.sendRequest}</button></div></form></section></div>}
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-white text-slate-800">
        {/* HEADER */}
        <AppHeader pageTitle={t('attendanceHistoryCorrection')} />

        {/* SECTION TITLE & TABS */}
        <section className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className={pageTitleClass.title}>{copy.managementTitle}</h1>
              <p className={pageTitleClass.subtitle}>
                {copy.managementDescription}
              </p>
            </div>
            {/* <span className="inline-flex w-fit items-center rounded-full border border-[#006838]/25 bg-[#eaf7f0] px-3 py-1.5 text-xs font-bold text-[#006838]">
              Role: HR / Manager
            </span> */}
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div className={segmentedClass.group}>
              {([['ATTENDANCE', copy.attendanceTab], ['AUDIT', copy.auditTab], ['CLOSING', copy.closingTab]] as [ManagementView, string][]).map(([view, label]) => (
                <button key={view} type="button" onClick={() => { setManagementView(view); setSearchQuery(''); setTablePage(1) }} className={`${segmentedClass.item} ${managementView === view ? segmentedClass.active : segmentedClass.idle}`}>
                  {view === 'AUDIT' ? <History size={14} /> : view === 'CLOSING' ? <LockKeyhole size={14} /> : <Clock3 size={14} />}{label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">{copy.fromDate}<input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setTablePage(1) }} className={inputClass('text-xs font-normal')} /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">{copy.toDate}<input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setTablePage(1) }} className={inputClass('text-xs font-normal')} /></label>
              {(dateFrom || dateTo) && <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); setTablePage(1) }} className={buttonClass('secondary')}>{copy.clearFilter}</button>}
            </div>
          </div>

          {actionMessage && (
            <div className={`mt-4 ${noticeClass}`}>
              {actionMessage.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : <AlertCircle size={16} className="shrink-0 text-red-600" />}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {errorMessage && (
            <div className={`mt-4 ${errorNoticeClass}`}>
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Correction-status pills only apply to attendance rows. Search is on
              every tab, and each tab filters its own list with it. */}
          <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            {managementView === 'ATTENDANCE' && <div className={segmentedClass.group}>
              <button
                onClick={() => { setActiveTab('ALL'); setTablePage(1) }}
                className={`${segmentedClass.item} ${
                  activeTab === 'ALL'
                    ? segmentedClass.active
                    : segmentedClass.idle
                }`}
              >
                {copy.all} ({attendances.length})
              </button>
              <button
                onClick={() => { setActiveTab('PENDING'); setTablePage(1) }}
                className={`${segmentedClass.item} ${
                  activeTab === 'PENDING'
                    ? segmentedClass.active
                    : segmentedClass.idle
                }`}
              >
                {copy.awaitingApproval} ({attendances.filter((i) => i.correction?.status === 'PENDING').length})
              </button>
              <button
                onClick={() => { setActiveTab('APPROVED'); setTablePage(1) }}
                className={`${segmentedClass.item} ${
                  activeTab === 'APPROVED'
                    ? segmentedClass.active
                    : segmentedClass.idle
                }`}
              >
                {copy.approved} ({attendances.filter((i) => i.correction?.status === 'APPROVED').length})
              </button>
            </div>}

            <div className="relative w-full sm:ml-auto sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                placeholder={managementView === 'AUDIT' ? copy.searchAuditPlaceholder : managementView === 'CLOSING' ? copy.searchClosingPlaceholder : copy.searchPlaceholder}
                aria-label={managementView === 'AUDIT' ? copy.searchAuditPlaceholder : managementView === 'CLOSING' ? copy.searchClosingPlaceholder : copy.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setTablePage(1) }}
                className={searchInputClass}
              />
            </div>
          </div>
        </section>

        {/* MAIN BODY: TABLE + DRAWER */}
        {managementView === 'ATTENDANCE' ? <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 xl:flex-row sm:px-6">
          <div className={`min-w-0 flex-1 overflow-hidden ${cardClass}`}>
            {loading ? (
              <SkeletonTable rows={8} columns={6} />
            ) : filteredData.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
                <AlertCircle size={32} className="text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">{copy.noAttendance}</p>
                <p className="mt-1">{copy.noResults}</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className={`${tableClass.table} min-w-[720px]`}>
                  <thead>
                    <tr className={tableClass.head}>
                      <th className={`${tableClass.headCell} min-w-[180px]`}>{copy.employee}</th>
                      <th className={tableClass.headCell}>{copy.date}</th>
                      <th className={tableClass.headCell}>{copy.clock}</th>
                      <th className={tableClass.headCell}>{copy.workDuration}</th>
                      <th className={tableClass.headCell}>{copy.durationStatus}</th>
                      <th className={tableClass.headCell}>{copy.correctionStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFilteredData.map((row) => {
                      const duration = calculateDuration(row.clock_in, row.clock_out)
                      const isSelected = selectedItem?.id === row.id

                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedItem(row)}
                          className={`${isSelected ? tableClass.rowSelected : tableClass.row} cursor-pointer`}
                        >
                          <td className={tableClass.cell}>
                            <div className="font-semibold text-slate-900">{row.full_name}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{row.employee_id} • {row.department}</div>
                          </td>
                          <td className={`${tableClass.cell} whitespace-nowrap font-medium`}>{row.date}</td>
                          <td className={`${tableClass.cell} whitespace-nowrap`}>
                            <div>
                              {copy.in}:{' '}
                              {formatAttendanceTime(row.clock_in)}{' '}
                              WIB
                            </div>
                            <div>
                              {copy.out}:{' '}
                              {row.clock_out ? `${formatAttendanceTime(row.clock_out)} WIB` : '-'}
                            </div>
                          </td>
                          <td className={tableClass.cell}>
                            <span className={`font-semibold ${duration.isUnderMin ? 'text-amber-700' : 'text-slate-900'}`}>
                              {duration.text}
                            </span>
                            {duration.isUnderMin && (
                              <span className="mt-0.5 block text-[11px] font-semibold text-amber-700">{copy.lessThanSeven}</span>
                            )}
                          </td>
                          <td className={tableClass.cell}>
                            <span
                              className={badgeClass(duration.isUnderMin ? 'amber' : 'green')}
                            >
                              {duration.isUnderMin ? copy.underSeven : copy.meetsSeven}
                            </span>
                          </td>
                          <td className={tableClass.cell}>
                            <div className="flex flex-wrap items-center gap-1">
                              {row.correction ? (
                                <span className={correctionStatusBadgeClass(row.correction.status)}>
                                  {copy.correction}: {correctionStatusLabel(row.correction.status)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-slate-400" aria-label={copy.noCorrectionForDate}>
                                  <Minus size={14} strokeWidth={2.5} />
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
            <div className={`w-full shrink-0 overflow-y-auto p-5 ${cardClass} xl:w-[400px]`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">
                      {copy.detailAudit}
                    </span>
                    <h3 className="mt-0.5 text-base font-bold text-slate-900">
                      {selectedItem.full_name}
                    </h3>
                    <p className="text-xs text-slate-500">{selectedItem.employee_id} • {copy.date} {selectedItem.date}</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="border-b border-slate-200 pb-1 font-bold text-slate-900">
                    {copy.originalLog}
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>{copy.clockInLabel}:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatAttendanceTime(selectedItem.clock_in)} WIB
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>{copy.clockOutLabel}:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {selectedItem.clock_out
                        ? `${formatAttendanceTime(selectedItem.clock_out)} WIB`
                        : copy.noScan}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 text-[11px] text-slate-500">
                    <span>{copy.dataSource}:</span>
                    <span className="font-semibold text-blue-700">{copy.attendanceSource}</span>
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
                    className={`space-y-2 rounded-xl border p-3.5 text-xs ${correctionPanelClass(selectedItem.correction.status)}`}
                  >
                    <div className="flex items-center justify-between gap-2 font-bold text-slate-900">
                      <span>{copy.correctionRequest}</span>
                      <span
                        className={correctionStatusBadgeClass(selectedItem.correction.status)}
                      >
                        {correctionStatusLabel(selectedItem.correction.status)}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <div>
                        <span className="font-semibold">{copy.correctionTypeLabel}:</span> {({ CLOCK_IN: copy.correctClockIn, CLOCK_OUT: copy.correctClockOut, FULL_DAY: copy.correctFullDay } as Record<string, string>)[selectedItem.correction.correction_type] ?? selectedItem.correction.correction_type}
                      </div>
                      {selectedItem.correction.proposed_clock_in && (
                        <div>
                          <span className="font-semibold">{copy.proposedClockIn}:</span> {formatCorrectionTime(selectedItem.correction.proposed_clock_in)} WIB
                        </div>
                      )}
                      {selectedItem.correction.proposed_clock_out && (
                        <div>
                          <span className="font-semibold">{copy.proposedClockOut}:</span> {formatCorrectionTime(selectedItem.correction.proposed_clock_out)} WIB
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-900/10 pt-2">
                      <span className="block font-semibold text-slate-600">{copy.reasonRequired}:</span>
                      <p className="mt-1 whitespace-pre-line rounded-lg border border-slate-200 bg-white p-2.5 text-xs italic text-slate-700 [overflow-wrap:anywhere]">
                        &quot;{selectedItem.correction.reason}&quot;
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
                    {copy.activeCorrectionNone}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-slate-900">{copy.progressTrail}</div>
                  <div className="space-y-3 border-l-2 border-slate-200 pl-3 text-xs">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 absolute -left-[17px] top-1"></div>
                      <div className="font-semibold text-slate-900">{copy.attendanceReceived}</div>
                      <div className="text-[11px] text-slate-500">{copy.attendanceSource} • {selectedItem.date}</div>
                    </div>
                    {selectedItem.correction && (
                      <div className="relative">
                        <div className="absolute -left-[17px] top-1 size-2 rounded-full bg-blue-600"></div>
                        <div className="font-semibold text-blue-700">{copy.correctionCreated}</div>
                        <div className="text-[11px] text-slate-500">
                          {copy.byEmployee} • {formatCorrectionSubmittedAt(selectedItem.correction.created_at, locale)}
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
                        <div className="text-[11px] text-slate-500">{copy.byHr}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedItem.correction?.status === 'PENDING' && (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => handleUpdateCorrectionStatus('APPROVED')}
                    className={buttonClass('success', 'md', 'flex-1')}
                  >
                    {copy.approve}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCorrectionStatus('REJECTED')}
                    className={buttonClass('danger', 'md', 'flex-1')}
                  >
                    {copy.reject}
                  </button>
                </div>
              )}
            </div>
          )}
        </div> : managementView === 'AUDIT' ? <AttendanceAuditPanel entries={auditEntries} copy={copy} dateFrom={dateFrom} dateTo={dateTo} searchQuery={searchQuery} /> : <AttendanceClosingPanel closings={closings} copy={copy} dateFrom={dateFrom} dateTo={dateTo} searchQuery={searchQuery} closingStart={closingStart} closingEnd={closingEnd} closingReason={closingReason} isSaving={isClosingSaving} onStartChange={setClosingStart} onEndChange={setClosingEnd} onReasonChange={setClosingReason} onSubmit={handleCreateClosing} onEmergencyEdit={handleEmergencyEdit} />}
      </div>
    </>
  )
}

type AttendancePanelCopy = Record<string, string>

// Stored audit action codes (d3_attendance_audit_log.action) shown by name.
const attendanceAuditActionLabels: Record<string, { id: string; en: string }> = {
  ATTENDANCE_CREATED: { id: 'Presensi dibuat', en: 'Attendance created' },
  ATTENDANCE_UPDATED: { id: 'Presensi diubah', en: 'Attendance updated' },
  CORRECTION_SUBMITTED: { id: 'Koreksi diajukan', en: 'Correction submitted' },
  CORRECTION_APPROVED: { id: 'Koreksi disetujui', en: 'Correction approved' },
  CORRECTION_REJECTED: { id: 'Koreksi ditolak', en: 'Correction rejected' },
  ATTENDANCE_PERIOD_CLOSED: { id: 'Periode ditutup', en: 'Period closed' },
  ATTENDANCE_PERIOD_REOPENED: { id: 'Periode dibuka kembali', en: 'Period reopened' },
}

function attendanceAuditActionLabel(action: string, language: 'id' | 'en') {
  return attendanceAuditActionLabels[action]?.[language] ?? action.replaceAll('_', ' ')
}

// Correction submit time is kept as stored and formatted while rendering, so it
// follows the language toggle. Date-only fallbacks are shown as they are.
function formatCorrectionSubmittedAt(value: string, locale: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale)
}

function formatAttendanceAuditDate(value: string, language: 'id' | 'en') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(language === 'id' ? 'id-ID' : 'en-GB', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function auditEntryDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(value))
}

function matchesSearchQuery(query: string, values: Array<string | null | undefined>) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return !normalizedQuery || values.some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
}

// Free-text notes can be very long and have no spaces (one closing note in the
// shared DB is 373k characters). Break anywhere and cap the height with a
// scroll box, so the whole note stays readable without stretching the page.
const longNoteClass = 'max-h-28 overflow-y-auto whitespace-pre-line pr-1 [overflow-wrap:anywhere]'

// The audit "Note" column: the stored reason, or the period for closing and
// reopening. Search reads this same text, so it matches what the user sees.
function auditEntryNote(entry: AttendanceAuditEntry) {
  if (typeof entry.details.reason === 'string' && entry.details.reason) return entry.details.reason
  if (entry.action === 'ATTENDANCE_PERIOD_CLOSED' || entry.action === 'ATTENDANCE_PERIOD_REOPENED') {
    return `${entry.details.period_start ?? ''} – ${entry.details.period_end ?? ''}`
  }
  return undefined
}

function AttendanceAuditPanel({ entries, copy, dateFrom, dateTo, searchQuery }: { entries: AttendanceAuditEntry[]; copy: AttendancePanelCopy; dateFrom: string; dateTo: string; searchQuery: string }) {
  const { language } = useLanguage()
  const visibleEntries = entries.filter((entry) => {
    const date = auditEntryDate(entry.created_at)
    return (!dateFrom || date >= dateFrom)
      && (!dateTo || date <= dateTo)
      && matchesSearchQuery(searchQuery, [
        entry.target_name,
        entry.actor_name,
        entry.action,
        attendanceAuditActionLabel(entry.action, language),
        auditEntryNote(entry),
      ])
  })

  return <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6"><div className={`overflow-hidden ${cardClass}`}><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><History size={17} className="text-blue-600" /><h2 className="text-sm font-bold text-slate-900">{copy.auditTab}</h2></div><p className="mt-1 text-xs text-slate-500">{visibleEntries.length} {copy.auditAction}</p></div>{visibleEntries.length === 0 ? <div className="flex min-h-[260px] items-center justify-center p-6 text-center text-xs font-medium text-slate-500">{entries.length === 0 ? copy.auditEmpty : copy.noResults}</div> : <div className="overflow-x-auto"><table className={`${tableClass.table} min-w-[900px]`}><thead className={tableClass.head}><tr><th className={tableClass.headCell}>{copy.date}</th><th className={tableClass.headCell}>{copy.employee}</th><th className={tableClass.headCell}>{copy.action}</th><th className={tableClass.headCell}>{copy.actor}</th><th className={tableClass.headCell}>{copy.reason}</th></tr></thead><tbody>{visibleEntries.map((entry) => <tr key={entry.id} className={`${tableClass.row} align-top`}><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatAttendanceAuditDate(entry.created_at, language)}</td><td className={`${tableClass.cell} font-semibold`}>{entry.target_name}</td><td className={tableClass.cell}><span className={badgeClass('blue')}>{attendanceAuditActionLabel(entry.action, language)}</span></td><td className="px-4 py-3 text-xs text-slate-500">{entry.actor_name}</td><td className="min-w-[220px] max-w-[360px] px-4 py-3 text-xs text-slate-500"><div className={longNoteClass}>{auditEntryNote(entry) ?? '-'}</div></td></tr>)}</tbody></table></div>}</div></div>
}

function AttendanceClosingPanel({ closings, copy, dateFrom, dateTo, searchQuery, closingStart, closingEnd, closingReason, isSaving, onStartChange, onEndChange, onReasonChange, onSubmit, onEmergencyEdit }: { closings: AttendanceClosing[]; copy: AttendancePanelCopy; dateFrom: string; dateTo: string; searchQuery: string; closingStart: string; closingEnd: string; closingReason: string; isSaving: boolean; onStartChange: (value: string) => void; onEndChange: (value: string) => void; onReasonChange: (value: string) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onEmergencyEdit: (closing: AttendanceClosing) => void }) {
  const { language } = useLanguage()
  const visibleClosings = closings.filter((closing) => (
    (!dateFrom || closing.period_end >= dateFrom)
    && (!dateTo || closing.period_start <= dateTo)
    && matchesSearchQuery(searchQuery, [
      closing.period_start,
      closing.period_end,
      closing.status,
      closing.status === 'CLOSED' ? copy.closedPeriod : copy.openPeriod,
      closing.reason,
      closing.closed_by_name,
      closing.reopened_by_name,
    ])
  ))

  return <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:px-6"><form onSubmit={onSubmit} className={`h-fit p-5 ${cardClass}`}><div className="flex items-center gap-2"><LockKeyhole size={17} className="text-blue-600" /><h2 className="text-sm font-bold text-slate-900">{copy.closePeriod}</h2></div><p className="mt-1 text-xs leading-5 text-slate-500">{copy.closedPeriod}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-semibold text-slate-700">{copy.periodStart}<input required type="date" value={closingStart} onChange={(event) => onStartChange(event.target.value)} className={inputClass('font-normal')} /></label><label className="grid gap-1.5 text-xs font-semibold text-slate-700">{copy.periodEnd}<input required type="date" value={closingEnd} onChange={(event) => onEndChange(event.target.value)} className={inputClass('font-normal')} /></label></div><label className="mt-3 grid gap-1.5 text-xs font-semibold text-slate-700">{copy.reason}<textarea maxLength={500} value={closingReason} onChange={(event) => onReasonChange(event.target.value)} className={inputClass('min-h-20 resize-y font-normal')} /></label><button disabled={isSaving} className={buttonClass('primary', 'md', 'mt-4')}><LockKeyhole size={14} />{isSaving ? copy.sending : copy.closePeriod}</button></form><section className={`overflow-hidden ${cardClass}`}><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-900">{copy.closingTab}</h2><p className="mt-1 text-xs text-slate-500">{visibleClosings.length} {copy.recorded}</p></div>{visibleClosings.length === 0 ? <div className="flex min-h-[220px] items-center justify-center p-6 text-center text-xs font-medium text-slate-500">{closings.length === 0 ? copy.closingEmpty : copy.noResults}</div> : <div className="divide-y divide-slate-100">{visibleClosings.map((closing) => <article key={closing.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900"><span>{closing.period_start} – {closing.period_end}</span><span className={badgeClass(closing.status === 'CLOSED' ? 'amber' : 'green')}>{closing.status === 'CLOSED' ? copy.closedPeriod : copy.openPeriod}</span></div><p className="mt-1 text-xs text-slate-500">{closing.status === 'CLOSED' ? copy.closedAt : copy.reopenedAt}: {formatAttendanceAuditDate(closing.status === 'CLOSED' ? closing.closed_at : closing.reopened_at ?? closing.closed_at, language)}</p>{closing.reason && <p className={`mt-1 text-xs text-slate-600 ${longNoteClass}`}>{closing.reason}</p>}</div>{closing.status === 'CLOSED' && <button type="button" disabled={isSaving} onClick={() => onEmergencyEdit(closing)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-xs transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"><Unlock size={14} />{copy.emergencyEdit}</button>}</article>)}</div>}</section></div>
}
