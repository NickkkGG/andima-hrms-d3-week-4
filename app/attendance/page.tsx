'use client'

import { useState } from 'react'

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

  // Helper Perhitungan Durasi Kerja (Aturan BR-02.8 Minimum 7 Jam)[cite: 5]
  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return { text: 'Incomplete', isUnderMin: true }
    const start = new Date(clockIn).getTime()
    const end = new Date(clockOut).getTime()
    const diffHours = (end - start) / (1000 * 60 * 60)
    return {
      text: `${diffHours.toFixed(1)} Jam`,
      isUnderMin: diffHours < 7.0, // Indikator BR-02.8[cite: 5]
    }
  }

  // Helper Deteksi Keterlambatan (Aturan BR-02.7 Tolerance 15 Menit)[cite: 5]
  const checkIsLate = (clockIn: string) => {
    const inDate = new Date(clockIn)
    const hours = inDate.getHours()
    const minutes = inDate.getMinutes()
    return hours > 8 || (hours === 8 && minutes > 15) // Batas 08:15 WIB[cite: 5]
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
    <div className="flex flex-col h-full bg-slate-100 text-slate-800 -m-6">
      {/* 1. Header & Filter Tabs (Adaptasi Referensi Gambar) */}
      <div className="p-6 bg-white border-b border-slate-200 pl-10 pt-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Attendance & Correction Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola riwayat presensi, validasi batas minimum 7 jam kerja, dan persetujuan koreksi absensi.[cite: 5]
            </p>
          </div>
          {/* Tag Role Mockup */}
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
            Preview Role: HR / Manager[cite: 5]
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex justify-between items-end">
          <div className="flex gap-2 border-b border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`pb-2 px-3 transition ${
                activeTab === 'ALL'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua ({DUMMY_ATTENDANCES.length})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`pb-2 px-3 transition ${
                activeTab === 'PENDING'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Menunggu Persetujuan
            </button>
            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`pb-2 px-3 transition ${
                activeTab === 'APPROVED'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
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
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 2. Main Content Split View (Master Table + Drawer Detail) */}
      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        {/* Table Area (Kiri) */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3">Employee</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Clock In / Out</th>
                  <th className="p-3">Durasi Kerja</th>
                  <th className="p-3">Status</th>
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
                      className={`cursor-pointer hover:bg-slate-50 transition ${
                        isSelected ? 'bg-blue-50/70' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{row.full_name}</div>
                        <div className="text-[10px] text-slate-400">{row.employee_id} • {row.department}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-600">{row.date}</td>
                      <td className="p-3 text-slate-600">
                        <div>In: {new Date(row.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
                        <div>Out: {row.clock_out ? `${new Date(row.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : '-'}</div>
                      </td>
                      <td className="p-3">
                        <span className={`font-semibold ${duration.isUnderMin ? 'text-amber-600' : 'text-slate-700'}`}>
                          {duration.text}
                        </span>
                        {duration.isUnderMin && (
                          <span className="block text-[9px] text-amber-600 font-bold">&lt; 7 Jam Kerja[cite: 5]</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLate ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isLate ? 'LATE (>15m)[cite: 5]' : 'PRESENT'}
                          </span>
                          {row.correction && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                              Koreksi: {row.correction.status}[cite: 5]
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
          <div className="w-96 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between overflow-y-auto shrink-0">
            <div className="space-y-4">
              {/* Header Drawer */}
              <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Detail Presensi & Audit
                  </span>
                  <h3 className="font-bold text-sm text-slate-800 mt-0.5">
                    {selectedItem.full_name}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedItem.employee_id} • Tanggal {selectedItem.date}</p>
                </div>
              </div>

              {/* Data Raw vs Corrected Log (BR-02.4) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-700 border-b border-slate-200 pb-1">
                  Data Log Original (Raw Fingerprint)[cite: 5]
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Clock In:</span>
                  <span className="font-mono font-semibold">
                    {new Date(selectedItem.clock_in).toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Clock Out:</span>
                  <span className="font-mono font-semibold">
                    {selectedItem.clock_out
                      ? `${new Date(selectedItem.clock_out).toLocaleTimeString('id-ID')} WIB`
                      : 'Tidak Ada Scan[cite: 5]'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60 text-[11px]">
                  <span>Sumber Data:</span>
                  <span className="font-semibold text-blue-600">{selectedItem.source}[cite: 5]</span>
                </div>
              </div>

              {/* Pengajuan Koreksi & Reason Mandatory (FR-02.22) */}
              {selectedItem.correction ? (
                <div className="border border-purple-200 bg-purple-50/50 p-3.5 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-purple-900 flex justify-between items-center">
                    <span>Pengajuan Koreksi Absensi[cite: 5]</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-200 text-purple-800 rounded">
                      {selectedItem.correction.status}[cite: 5]
                    </span>
                  </div>

                  <div className="text-slate-600 space-y-1">
                    <div>
                      <span className="font-semibold">Tipe Koreksi:</span> {selectedItem.correction.correction_type}[cite: 5]
                    </div>
                    {selectedItem.correction.proposed_clock_in && (
                      <div>
                        <span className="font-semibold">Clock In Diajukan:</span> {selectedItem.correction.proposed_clock_in} WIB[cite: 5]
                      </div>
                    )}
                    {selectedItem.correction.proposed_clock_out && (
                      <div>
                        <span className="font-semibold">Clock Out Diajukan:</span> {selectedItem.correction.proposed_clock_out} WIB[cite: 5]
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-purple-200/60">
                    <span className="text-slate-500 font-semibold block">Alasan Pengajuan (Wajib):[cite: 5]</span>
                    <p className="text-slate-800 italic mt-1 bg-white p-2 rounded border border-purple-100 text-[11px]">
                      "{selectedItem.correction.reason}"[cite: 5]
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 italic text-center">
                  Tidak ada pengajuan koreksi aktif untuk tanggal ini.[cite: 5]
                </div>
              )}

              {/* Progress & Audit Trail (Mengadaptasi Komponen Gambar Referensi) */}
              <div className="space-y-2 pt-2">
                <div className="font-bold text-xs text-slate-700">Progress & History Trail[cite: 5]</div>
                <div className="border-l-2 border-slate-300 pl-3 space-y-3 text-xs">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 absolute -left-[17px] top-1"></div>
                    <div className="font-semibold text-slate-800">Log Presensi Diterima</div>
                    <div className="text-[10px] text-slate-400">Sistem Fingerprint • {selectedItem.date}[cite: 5]</div>
                  </div>
                  {selectedItem.correction && (
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-purple-500 absolute -left-[17px] top-1"></div>
                      <div className="font-semibold text-purple-800">Pengajuan Koreksi Dibuat</div>
                      <div className="text-[10px] text-slate-400">
                        Oleh Pegawai • {selectedItem.correction.created_at}[cite: 5]
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tombol Action HR/Admin */}
            {selectedItem.correction?.status === 'PENDING' && (
              <div className="pt-4 border-t border-slate-100 flex gap-2 mt-4">
                <button
                  onClick={() => alert(`Koreksi ${selectedItem.full_name} Disetujui!`)}
                  className="flex-1 bg-emerald-600 text-white text-xs py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
                >
                  Approve[cite: 5]
                </button>
                <button
                  onClick={() => alert(`Koreksi ${selectedItem.full_name} Ditolak!`)}
                  className="flex-1 bg-rose-600 text-white text-xs py-2 rounded-lg font-bold hover:bg-rose-700 transition"
                >
                  Reject[cite: 5]
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}