# Release Notes — ANDIMA HRMS Squad D3

## Unreleased — integrasi B2 dan biometrik

**Tanggal pembaruan:** 13 Oktober 2026
**Branch kerja:** `feature/D3-002-face-biometric-attendance`
**Status:** siap diuji lokal; belum menjadi rilis produksi.

### Perubahan terbaru

- Tampilan halaman Login dan Register disamakan dengan desain B2.
- Login memakai Supabase Auth lalu memvalidasi profil pada `b2_register`.
- Register membuat akun Supabase Auth dan profil registrasi pada `b2_register`; halaman register tidak membuat data `d3_employee`.
- Setelah login B2 berhasil, pengguna diarahkan ke `/face-biometric-attendance`.
- Halaman Face Biometric Attendance mencakup liveness checking, registrasi template wajah, pencatatan clock-in/clock-out, waktu realtime, serta lokasi presensi saat izin lokasi tersedia.
- Attendance History dan Attendance & Productivity menampilkan data presensi beserta detail lokasi untuk data yang sudah tersimpan.

### Verifikasi teknis

- `npm run typecheck` berhasil.
- `npm run build` berhasil.
- Tidak ada data Supabase yang diubah saat pembaruan release note ini.

### Batasan integrasi B2 yang masih terbuka

- B2 sudah menjadi sumber akun login/register, tetapi tabel operasional D3 (`d3_attendances`, ticket, biometrik, feedback, dan reward) masih memiliki foreign key ke `d3_employee`.
- Karena itu, akun B2 yang belum memiliki pemetaan data operasional D3 belum dapat melakukan presensi biometrik atau memakai seluruh fitur D3 secara end-to-end.
- Migrasi identitas fitur dari `d3_employee` ke `b2_register` harus dilakukan bertahap dan tidak boleh menghapus data presensi, tiket, audit, maupun template biometrik yang sudah ada.
- Role sementara yang akan dipakai pada UI B2 perlu disepakati: posisi `HR Administrator` diperlakukan sebagai HR, sedangkan posisi lain sebagai Employee.

---

**Rilis:** Week 4 / demo internal  
**Tanggal pembaruan:** 29 September 2026  
**Cakupan:** fitur Squad D3 pada branch `feature/D3-005-employee-report-ticket`.

Dokumen ini mencatat kondisi implementasi saat ini. Status **terhubung** berarti halaman melakukan query ke Supabase; status tersebut bukan pengganti pengujian QA atau persetujuan merge.

## Ringkasan rilis

- Navigasi HRMS dirapikan agar hanya menampilkan kelompok fitur D3.
- Header mengambil akun yang sedang login dari Supabase Auth dan pemetaan akses D3.
- Fitur Employee Report & Ticket sudah memiliki alur tiket, perubahan status, tindak lanjut, riwayat audit, dan lampiran privat.
- Halaman kehadiran dan produktivitas telah digabung ke proyek D3.
- Dokumentasi ini menandai dengan jelas bagian yang masih placeholder atau memerlukan penyelarasan skema.

## Status setiap fitur

| Fitur | Route | Kondisi saat ini | Catatan penting |
| --- | --- | --- | --- |
| Employee Profile Management | `/employee-profile` | Terhubung baca data kehadiran | Halaman yang ada saat ini menampilkan ringkasan kehadiran/produktivitas, belum formulir CRUD profil karyawan. |
| Fingerprint Attendance Integration | `/fingerprint-integration` | Placeholder | Belum ada integrasi mesin fingerprint, file impor, ataupun sumber API eksternal. |
| Attendance History & Correction | `/attendance` | UI dan aksi koreksi tersedia | Query halaman masih memakai beberapa nama tabel/kolom lama dan dapat jatuh ke data fallback. Perlu diselaraskan dengan skema D3 sebelum dinyatakan siap produksi. |
| Attendance & Productivity Dashboard | `/attendance-productivity` | Terhubung baca data | Menggunakan `d3_attendances`, `d3_employee`, dan `d3_departments`; durasi kerja dihitung di frontend dari waktu masuk dan pulang. |
| Feedback & Reward Management | `/feedback-reward` | Placeholder | Halaman belum melakukan query maupun perubahan data, walaupun tabel D3 terkait dapat tersedia di basis data. |
| Employee Report & Ticket (D3-005) | `/employee-report-ticket` | Fungsional untuk alur inti | Membuat tiket, melihat tiket, memperbarui status, menambah follow-up, melihat history, dan melampirkan berkas privat. |

## Akses akun dan peran

- Login dan pendaftaran menggunakan Supabase Auth.
- Akses HRMS D3 tidak ditentukan dari email saja. Akun harus dipetakan ke karyawan dan peran pada `d3_user_access`.
- Peran yang digunakan antarmuka adalah `Employee`, `HR`, dan `Manager`.
- Akun yang baru mendaftar tetapi belum memiliki pemetaan `d3_user_access` akan ditolak dari area HRMS D3. Pemetaan tersebut merupakan tugas administrasi data/HR.

## Detail D3-005 — Employee Report & Ticket

Alur yang sudah tersedia:

1. Employee membuat tiket dengan judul, kategori, prioritas, deskripsi, dan lampiran opsional.
2. Tiket tersimpan pada `d3_tickets`; identitas pelapor disimpan sebagai snapshot agar riwayat tetap terbaca.
3. HR atau Manager dapat memperbarui status dan menambahkan follow-up.
4. Perubahan tiket dan follow-up dicatat ke `d3_ticket_history` oleh trigger audit.
5. Lampiran ditempatkan pada bucket privat `d3-ticket-attachments` dan dibuka melalui signed URL singkat.

Tabel yang dipakai D3-005: `d3_user_access`, `d3_tickets`, `d3_ticket_followups`, `d3_ticket_history`, dan `d3_ticket_attachments`.

## Verifikasi yang telah dilakukan

- Build Next.js (`npm run build`) berhasil pada snapshot integrasi ini.
- Saat pengujian browser, request Supabase untuk akses D3, tiket, follow-up, history, dan lampiran terlihat merespons HTTP 200.
- D3-005 dapat diuji dengan simulasi Employee membuat tiket lalu HR/Manager mengubah status dan membuat follow-up.

## Batasan yang masih terbuka

- Belum ada endpoint API kustom di `app/api`. Aplikasi saat ini menggunakan Supabase Auth, Data API, dan Storage secara langsung melalui client SSR.
- Lint seluruh proyek belum bersih karena sumber D3-002 yang digabung masih memiliki beberapa error/warning legacy. Hal ini perlu diperbaiki sebelum rilis staging.
- Migrasi ticket lama masih merujuk nama master `employees` dan `departments`, sedangkan skema D3 yang berjalan menggunakan `d3_employee` dan `d3_departments`. Jangan menjalankan ulang migrasi lama tanpa penyelarasan dan review tim database.
- Validasi end-to-end untuk setiap peran harus dicatat oleh QA sebagai bukti acceptance criteria dan definition of done.

## Dokumen terkait

- [Dokumentasi backend](docs/BACKEND.md)
- [Migration Supabase](supabase/migrations/)
