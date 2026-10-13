# Release Notes Modul HRMS Squad D3

## Informasi Rilis

| Informasi | Keterangan |
| --- | --- |
| Produk / Modul | ANDIMA Logistics Suite - HRMS |
| Sub-modul | Employee Profile Management, Face Biometric Attendance, Attendance Management, Employee Report & Ticket, Feedback & Reward |
| Jenis rilis | Feature Release dan Integration Update |
| Disiapkan oleh | Squad D3 |
| Target pengguna | Employee, HR, dan Manager |
| Tanggal rilis | 13 Oktober 2026 |
| Branch rilis | `feature/D3-002-face-biometric-attendance` |

## 1. Ringkasan Eksekutif

Rilis ini menyatukan fitur-fitur HRMS yang dikerjakan Squad D3 dalam satu aplikasi. Pengguna dapat masuk menggunakan akun yang terdaftar, melihat menu sesuai peran, mengelola profil karyawan, melakukan registrasi serta presensi biometrik wajah, meninjau riwayat presensi, mengajukan koreksi, memantau produktivitas, mengelola ticket pekerjaan, dan mencatat feedback maupun reward.

Data operasional D3 tetap menggunakan Supabase. Autentikasi memakai Supabase Auth dan profil akun B2 (`b2_register`), sedangkan fitur HRMS D3 menggunakan pemetaan akses `d3_user_access` ke data `d3_employee`. Dengan pemetaan ini, halaman dan data yang ditampilkan dapat dibedakan antara Employee, HR, dan Manager.

### Tujuan rilis

- Menyatukan alur data karyawan, presensi, dan tindak lanjut pekerjaan dalam satu workspace HRMS.
- Memberi Employee akses untuk presensi, melihat riwayatnya sendiri, serta membuat ticket.
- Memberi HR dan Manager akses untuk melihat data presensi lintas karyawan, produktivitas, serta proses tindak lanjut.
- Menyediakan jejak data untuk ticket, lokasi presensi, koreksi kehadiran, feedback, dan reward.

## 2. Sorotan Rilis

| No. | Fitur | Manfaat utama |
| --- | --- | --- |
| 1 | Login dan register terintegrasi B2 | Akun masuk melalui Supabase Auth dan profil B2 yang aktif. |
| 2 | Employee Profile Management | HR dapat melihat direktori, detail, menambah, mengubah, dan memperbarui status karyawan. |
| 3 | Biometric Registration | Employee dapat mendaftarkan template wajah pada akun yang sedang login. |
| 4 | Face Biometric Attendance | Clock-in dan clock-out dilakukan setelah liveness check serta pencocokan wajah. |
| 5 | Geolocation Attendance | Koordinat dan akurasi lokasi clock-in/clock-out disimpan pada catatan presensi. |
| 6 | Attendance History & Correction | Employee dapat melihat riwayat presensi, detail lokasi, dan mengajukan koreksi. |
| 7 | Attendance & Productivity Dashboard | HR/Manager dapat melihat ringkasan dan tren jam kerja karyawan. |
| 8 | Employee Report & Ticket | Employee dapat membuat ticket, melampirkan berkas, dan memantau tindak lanjut serta riwayatnya. |
| 9 | Feedback & Reward | HR/Manager dapat mencatat feedback/reward, sedangkan Employee melihat catatan miliknya. |

## 3. Rincian Fitur

### 3.1 Login, Register, dan Akses Peran

Halaman login dan register menggunakan desain B2. Saat login berhasil, aplikasi membaca profil aktif dari `b2_register`, kemudian pengguna diarahkan ke Face Biometric Attendance. Header dan sidebar membaca pemetaan `d3_user_access` untuk menentukan peran aplikasi.

| Peran | Akses utama |
| --- | --- |
| Employee | Biometric Registration, Face Biometric Attendance, Attendance History & Correction, Employee Report & Ticket, serta riwayat Feedback & Reward pribadi. |
| HR / Manager | Seluruh akses Employee, termasuk Attendance & Productivity Dashboard dan pengelolaan Feedback & Reward. |

### 3.2 Employee Profile Management

Modul Employee Profile Management menyediakan direktori karyawan dengan halaman detail profil. HR dapat menambahkan karyawan, mengubah informasi profil, serta memperbarui status kepegawaian. Data profil mengambil referensi departemen dan posisi dari data master D3.

Informasi detail karyawan juga menampilkan data pendukung yang tersedia, seperti keahlian, sertifikasi, riwayat presensi, serta feedback dan reward.

### 3.3 Biometric Registration dan Face Biometric Attendance

Biometric Registration menyimpan template wajah untuk akun yang sedang login. Saat presensi, sistem menjalankan liveness checking, melakukan pencocokan terhadap template akun tersebut, lalu mengunci status verifikasi ketika wajah sudah lolos. Jam presensi yang ditampilkan berhenti pada waktu verifikasi agar waktu yang dicatat konsisten dengan aksi clock-in atau clock-out.

| Tahap | Perilaku sistem |
| --- | --- |
| Registrasi | Mengambil template pengenalan wajah dan menyimpan sampel audit pada penyimpanan privat. |
| Verifikasi | Memeriksa wajah dan gerakan liveness sebelum tombol presensi aktif. |
| Clock-in / Clock-out | Membuat atau memperbarui data presensi sesuai kondisi presensi pada hari berjalan. |
| Audit biometrik | Menyimpan event presensi dan hasil verifikasi untuk penelusuran data. |

### 3.4 Lokasi Presensi dan Riwayat Kehadiran

Saat clock-in maupun clock-out, aplikasi meminta lokasi perangkat dan menyimpan latitude, longitude, serta perkiraan akurasi lokasi pada data presensi. Detail lokasi tersedia pada riwayat presensi Employee dan tampilan HR/Manager.

Pratinjau lokasi mendukung dua mode tampilan: peta standar dan satelit. Pengguna juga dapat membuka titik lokasi melalui Google Maps atau Apple Maps. Apabila catatan presensi perlu diperbaiki, Employee dapat mengirim pengajuan koreksi untuk ditinjau oleh HR.

### 3.5 Attendance & Productivity Dashboard

Dashboard ini hanya tersedia untuk HR dan Manager. Data attendance digunakan untuk menyajikan ringkasan kehadiran, tren rata-rata jam kerja harian, dan perbandingan rata-rata jam kerja per karyawan. Filter tanggal membantu pengguna membatasi periode analisis.

### 3.6 Employee Report & Ticket

Employee dapat membuat ticket dengan judul, kategori, deskripsi, waktu kejadian, dan lampiran opsional. Lampiran disimpan pada bucket privat dan dibuka melalui signed URL berumur terbatas.

HR/Manager dapat memantau ticket sesuai cakupan akses, memperbarui status, dan menambah follow-up. Riwayat perubahan serta catatan follow-up ditampilkan kembali pada detail ticket sehingga Employee dapat melihat perkembangan permintaannya.

### 3.7 Feedback & Reward

Halaman Feedback & Reward menampilkan ringkasan jumlah catatan feedback dan reward. HR/Manager dapat membuat catatan untuk karyawan, melihat daftar feedback, detail record, serta audit trail. Employee hanya melihat feedback dan reward yang terkait dengan dirinya sendiri.

## 4. Integrasi Data

| Domain | Sumber data / penyimpanan | Penggunaan |
| --- | --- | --- |
| Autentikasi | Supabase Auth | Login, session, logout, dan identitas pengguna. |
| Profil B2 | `b2_register` | Memastikan akun B2 yang login memiliki profil aktif. |
| Akses aplikasi | `d3_user_access` | Memetakan user Auth ke karyawan dan peran aplikasi. |
| Data karyawan | `d3_employee`, `d3_departments`, `d3_positions` | Employee Profile Management dan konteks data pada fitur D3. |
| Presensi | `d3_attendances`, `d3_attendance_corrections` | Clock-in/out, riwayat, lokasi, dan koreksi presensi. |
| Biometrik | `d3_face_biometric_templates`, `d3_face_biometric_events`, bucket `d3-biometric-face-samples` | Template pengenalan wajah, event verifikasi, serta sampel audit privat. |
| Ticket | `d3_tickets`, `d3_ticket_followups`, `d3_ticket_history`, `d3_ticket_attachments` | Ticket, follow-up, audit history, dan metadata lampiran. |
| Feedback dan reward | `d3_employee_feedback`, `d3_employee_rewards` | Catatan feedback dan reward per karyawan. |

Arsitektur aplikasi memakai Next.js sebagai antarmuka dan Supabase Auth, Data API, serta Storage. Saat ini fitur D3 tidak menggunakan endpoint REST kustom di `app/api`; komponen aplikasi berkomunikasi langsung dengan Supabase berdasarkan session pengguna dan aturan akses pada database.

## 5. Verifikasi Rilis

Verifikasi teknis dilakukan pada kode branch rilis:

- `npm run typecheck` berhasil.
- `npm run build` berhasil.
- Login mengarahkan akun aktif ke Face Biometric Attendance.
- Sidebar membedakan menu Attendance & Productivity untuk HR/Manager dan Employee.
- Attendance History menampilkan detail lokasi yang tersimpan dan tautan peta.
- Biometric Attendance menyediakan alur registrasi, verifikasi, clock-in, dan clock-out.

## 6. Batasan dan Tindak Lanjut

- Registrasi akun B2 belum otomatis membuat pemetaan `d3_employee` dan `d3_user_access`. Akun baru masih memerlukan proses provisioning data operasional oleh HR/Admin sampai mekanisme otomatis disepakati bersama.
- Kualitas verifikasi wajah dipengaruhi kamera, pencahayaan, dan kemampuan perangkat. Fitur ini digunakan sebagai implementasi pembelajaran dan perlu pengujian lintas perangkat sebelum diperlakukan sebagai sistem presensi produksi.
- Perubahan tabel, foreign key, atau RLS pada database bersama tetap perlu koordinasi dengan pemilik database dan tim terkait.
- Uji end-to-end Employee ke HR/Manager perlu didokumentasikan lebih lanjut oleh QA untuk setiap perubahan rilis berikutnya.

## 7. Referensi Teknis

- [Dokumentasi backend D3](BACKEND.md)
- [Migration Supabase](../supabase/migrations/)
- [Branch rilis biometrik](https://github.com/PISD-X-ANDIMA/Andima-HRMS/tree/feature/D3-002-face-biometric-attendance)
