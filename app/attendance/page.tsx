'use client'

import { useState } from 'react'
import { Bell, ChevronRight, CircleHelp } from 'lucide-react'
import Sidebar from '@/components/Sidebar'

// Dummy Data Sesuai Kebutuhan FR-D3-002 & Acceptance Criteria
const DUMMY_ATTENDANCES = [
  {
    id: 'ATT-001',
    employee_id: 'EMP-AND-001',
    full_name: 'Nadira Putri',
    department: 'Operations',
    date: '2026-09-27',
    clock_in: '2026-09-27T08:02:00',
    clock_out: '2026-09-27T17:10:00',
    source: 'Fingerprint Main Gate',
    correction: null,
  },
  {
    id: 'ATT-002',
    employee_id: 'EMP-AND-002',
    full_name: 'Bagas Ramadhan',
    department: 'Logistics',
    date: '2026-09-27',
    clock_in: '2026-09-27T08:25:00', // Terlambat >15m
    clock_out: '2026-09-27T17:00:00',
    source: 'Fingerprint Main Gate',
    correction: {
      id: 'COR-001',
      correction_type: 'CLOCK_IN',
      proposed_clock_in: '08:00',
      reason: 'Keterlambatan karena pemadaman listrik di gerbang utama saat scan fingerprint.',
      status: 'PENDING', // Waiting Approval
      created_at: '2026-09-27 08:30',
    },
  },
  {
    id: 'ATT-003',
    employee_id: 'EMP-AND-004',
    full_name: 'Raka Prasetyo',
    department: 'Warehouse',
    date: '2026-09-26',
    clock_in: '2026-09-26T08:00:00',
    clock_out: '2026-09-26T12:30:00', // Durasi < 7 jam
    source: 'Fingerprint Warehouse',
    correction: null,
  },
  {
    id: 'ATT-004',
    employee_id: 'EMP-AND-005',
    full_name: 'Salsa Maharani',
    department: 'HR & Legal',
    date: '2026-09-26',
    clock_in: '2026-09-26T08:00:00',
    clock_out: null, // Incomplete / Early Out / Anomali
    source: 'Fingerprint Main Gate',
    correction: {
      id: 'COR-002',
      correction_type: 'CLOCK_OUT',
      proposed_clock_out: '17:00',
      reason: 'Lupa scan fingerprint saat pulang kantor karena mati lampu.',
      status: 'APPROVED',
      created_at: '2026-09-26 17:15',
    },
  },
]

export default function AttendancePageUI() {
  const [selectedItem, setSelectedItem] = useState<any>(DUMMY_ATTENDANCES[1]) // Default pilih Bagas
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Helper perhitungan durasi kerja dengan batas minimum 7 jam.
  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return { text: 'Incomplete', isUnderMin: true }
    const start = new Date(clockIn).getTime()
    const end = new Date(clockOut).getTime()
    const diffHours = (end - start) / (1000 * 60 * 60)
    return {
      text: `${diffHours.toFixed(1)} Jam`,
      isUnderMin: diffHours < 7.0,
    }
  }

  // Helper deteksi keterlambatan dengan toleransi sampai 08:15.
  const checkIsLate = (clockIn: string) => {
    const inDate = new Date(clockIn)
    const hours = inDate.getHours()
    const minutes = inDate.getMinutes()
    return hours > 8 || (hours === 8 && minutes > 15)
  }

  // Filter Data Tab & Search
  const filteredData = DUMMY_ATTENDANCES.filter((item) => {
    const matchesSearch =
      item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employee_id.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false
    if (activeTab === 'ALL') return true
    return item.correction?.status === activeTab
  })

  return (
    <>
      <Sidebar userName="Attendance Team" userRole="Attendance Admin" userInitials="AT" />
      <div className="min-h-screen bg-[#f7f8ff] text-[#121b2e] lg:pl-[260px]">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#d9e2fc] bg-white px-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:px-6">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3">
          <div className="hidden min-w-0 items-center gap-3 sm:flex">
            <span className="font-bold text-[#121b2e]">ANDIMA HRMS</span>
            <span className="h-5 border-l border-[#d9e2fc]" />
            <span className="text-xs font-semibold text-[#3f4940]">HRMS</span>
            <ChevronRight size={13} className="text-[#4d5f81]/50" />
            <span className="truncate text-xs font-semibold text-[#006838]">Attendance</span>
          </div>
          <span className="text-sm font-bold text-[#121b2e] sm:hidden">Attendance</span>

          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" className="relative grid size-9 place-items-center rounded-lg text-[#4d5f81] transition hover:bg-[#f1f3ff]" aria-label="Notifikasi">
              <Bell size={17} />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#d64545]" />
            </button>
            <button type="button" className="grid size-9 place-items-center rounded-lg text-[#4d5f81] transition hover:bg-[#f1f3ff]" aria-label="Bantuan"><CircleHelp size={17} /></button>
            <div className="hidden items-center gap-2 border-l border-[#d9e2fc] pl-3 sm:flex">
              <span className="grid size-8 place-items-center rounded-full border border-[#006838]/30 bg-[#16834b]/15 text-xs font-bold text-[#006838]">AT</span>
              <div className="text-left"><p className="text-xs font-bold">Attendance Team</p><p className="text-[10px] text-[#4d5f81]">Attendance Admin</p></div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-[#d9e2fc] bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.4px] text-[#121b2e]">Attendance & Correction Management</h1>
            <p className="mt-1 text-sm text-[#4d5f81]">
              Kelola riwayat presensi, validasi minimum 7 jam kerja, dan persetujuan koreksi absensi.
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-[#006838]/25 bg-[#eaf7f0] px-3 py-1.5 text-xs font-bold text-[#006838]">
            Preview role: HR / Manager
          </span>
        </div>

        <div className="mx-auto mt-5 flex max-w-[1600px] flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-wrap gap-1 border-b border-[#d9e2fc] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`pb-2 px-3 transition ${
                activeTab === 'ALL'
                  ? 'border-b-2 border-[#069494] text-[#006838] font-bold'
                  : 'text-[#4d5f81] hover:text-[#121b2e]'
              }`}
            >
              Semua ({DUMMY_ATTENDANCES.length})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`pb-2 px-3 transition ${
                activeTab === 'PENDING'
                  ? 'border-b-2 border-[#069494] text-[#006838] font-bold'
                  : 'text-[#4d5f81] hover:text-[#121b2e]'
              }`}
            >
              Menunggu Persetujuan
            </button>
            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`pb-2 px-3 transition ${
                activeTab === 'APPROVED'
                  ? 'border-b-2 border-[#069494] text-[#006838] font-bold'
                  : 'text-[#4d5f81] hover:text-[#121b2e]'
              }`}
            >
              Disetujui
            </button>
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Cari nama atau NIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#d9e2fc] bg-[#f1f3ff] px-3 py-2 text-xs outline-none transition placeholder:text-[#4d5f81]/70 focus:border-[#069494] focus:ring-2 focus:ring-[#069494]/15 sm:w-64"
          />
        </div>
      </section>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 xl:flex-row sm:px-6">
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#becabd]/45 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#becabd]/35 bg-[#f7f8ff] text-[10px] font-bold uppercase tracking-[0.08em] text-[#4d5f81]">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-3 py-3">Tanggal</th>
                  <th className="px-3 py-3">Clock In / Out</th>
                  <th className="px-3 py-3">Durasi Kerja</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row) => {
                  const duration = calculateDuration(row.clock_in, row.clock_out)
                  const isLate = checkIsLate(row.clock_in)
                  const isSelected = selectedItem?.id === row.id

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
                        <div>In: {new Date(row.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
                        <div>Out: {row.clock_out ? `${new Date(row.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : '-'}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`font-semibold ${duration.isUnderMin ? 'text-[#b7791f]' : 'text-[#121b2e]'}`}>
                          {duration.text}
                        </span>
                        {duration.isUnderMin && (
                          <span className="mt-0.5 block text-[9px] font-bold text-[#b7791f]">&lt; 7 Jam Kerja</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLate ? 'bg-[#fef9c3] text-[#b7791f]' : 'bg-[#eaf7f0] text-[#16834b]'
                            }`}
                          >
                            {isLate ? 'LATE (>15m)' : 'PRESENT'}
                          </span>
                          {row.correction && (
                            <span className="rounded bg-[#edf6ff] px-2 py-0.5 text-[9px] font-bold text-[#1971c2]">
                              Koreksi: {row.correction.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Drawer Panel Detail (Kanan - Sesuai Komponen Gambar Referensi) */}
        {selectedItem && (
          <div className="w-full shrink-0 overflow-y-auto rounded-xl border border-[#becabd]/45 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] xl:w-[400px]">
            <div className="space-y-4">
              {/* Header Drawer */}
              <div className="flex items-start justify-between border-b border-[#becabd]/35 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4d5f81]">
                    Detail Presensi & Audit
                  </span>
                  <h3 className="mt-0.5 text-sm font-bold text-[#121b2e]">
                    {selectedItem.full_name}
                  </h3>
                  <p className="text-xs text-[#4d5f81]">{selectedItem.employee_id} • Tanggal {selectedItem.date}</p>
                </div>
              </div>

              {/* Data Raw vs Corrected Log (BR-02.4) */}
              <div className="space-y-2 rounded-xl border border-[#becabd]/35 bg-[#f7f8ff] p-3 text-xs">
                <div className="border-b border-[#becabd]/35 pb-1 font-bold text-[#121b2e]">
                  Data Log Original (Raw Fingerprint)
                </div>
                <div className="flex justify-between text-[#4d5f81]">
                  <span>Clock In:</span>
                  <span className="font-mono font-semibold">
                    {new Date(selectedItem.clock_in).toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
                <div className="flex justify-between text-[#4d5f81]">
                  <span>Clock Out:</span>
                  <span className="font-mono font-semibold">
                    {selectedItem.clock_out
                      ? `${new Date(selectedItem.clock_out).toLocaleTimeString('id-ID')} WIB`
                      : 'Tidak ada scan'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#becabd]/35 pt-1 text-[11px] text-[#4d5f81]">
                  <span>Sumber Data:</span>
                  <span className="font-semibold text-[#1971c2]">{selectedItem.source}</span>
                </div>
              </div>

              {/* Pengajuan Koreksi & Reason Mandatory (FR-02.22) */}
              {selectedItem.correction ? (
                <div className="space-y-2 rounded-xl border border-[#b9d6ff] bg-[#edf6ff] p-3.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#1e3765]">
                    <span>Pengajuan Koreksi Absensi</span>
                    <span className="rounded bg-[#b9d6ff] px-2 py-0.5 text-[10px] font-bold text-[#1971c2]">
                      {selectedItem.correction.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-[#4d5f81]">
                    <div>
                      <span className="font-semibold">Tipe Koreksi:</span> {selectedItem.correction.correction_type}
                    </div>
                    {selectedItem.correction.proposed_clock_in && (
                      <div>
                        <span className="font-semibold">Clock In Diajukan:</span> {selectedItem.correction.proposed_clock_in} WIB
                      </div>
                    )}
                    {selectedItem.correction.proposed_clock_out && (
                      <div>
                        <span className="font-semibold">Clock Out Diajukan:</span> {selectedItem.correction.proposed_clock_out} WIB
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#b9d6ff] pt-2">
                    <span className="block font-semibold text-[#4d5f81]">Alasan Pengajuan (Wajib):</span>
                    <p className="mt-1 rounded border border-[#b9d6ff] bg-white p-2 text-[11px] italic text-[#121b2e]">
                      "{selectedItem.correction.reason}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#becabd] bg-[#f7f8ff] p-3 text-center text-xs italic text-[#4d5f81]">
                  Tidak ada pengajuan koreksi aktif untuk tanggal ini.
                </div>
              )}

              {/* Progress & Audit Trail (Mengadaptasi Komponen Gambar Referensi) */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-[#121b2e]">Progress & History Trail</div>
                <div className="space-y-3 border-l-2 border-[#d9e2fc] pl-3 text-xs">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 absolute -left-[17px] top-1"></div>
                    <div className="font-semibold text-[#121b2e]">Log Presensi Diterima</div>
                    <div className="text-[10px] text-[#4d5f81]">Sistem Fingerprint • {selectedItem.date}</div>
                  </div>
                  {selectedItem.correction && (
                    <div className="relative">
                      <div className="absolute -left-[17px] top-1 size-2 rounded-full bg-[#1971c2]"></div>
                      <div className="font-semibold text-[#1971c2]">Pengajuan Koreksi Dibuat</div>
                      <div className="text-[10px] text-[#4d5f81]">
                        Oleh Pegawai • {selectedItem.correction.created_at}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tombol Action HR/Admin */}
            {selectedItem.correction?.status === 'PENDING' && (
              <div className="mt-4 flex gap-2 border-t border-[#becabd]/35 pt-4">
                <button
                  onClick={() => alert(`Koreksi ${selectedItem.full_name} Disetujui!`)}
                  className="flex-1 rounded-lg bg-[#16834b] py-2 text-xs font-bold text-white transition hover:bg-[#006838]"
                >
                  Approve
                </button>
                <button
                  onClick={() => alert(`Koreksi ${selectedItem.full_name} Ditolak!`)}
                  className="flex-1 rounded-lg bg-[#d64545] py-2 text-xs font-bold text-white transition hover:bg-[#b4232b]"
                >
                  Reject
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
