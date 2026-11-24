# Show and Tell — D3-002 Face Biometric Attendance

Durasi target: maksimal 5 menit. Gunakan akun demo yang sudah aktif; dokumen ini sengaja tidak menyimpan kredensial atau data pribadi.

| Waktu | Narasi dan aksi demo |
| --- | --- |
| 0:00–0:35 | **Masalah bisnis.** Presensi manual sulit dibuktikan dan koreksi dapat kehilangan jejak. Tim HR membutuhkan presensi yang terkait ke akun pegawai, Employee ID, dan riwayat perubahan yang dapat dicari. |
| 0:35–1:10 | **Fitur yang selesai.** Tunjukkan login dengan akun pegawai yang sudah dipetakan ke Employee ID, lalu halaman Face Biometric Attendance. Sistem memverifikasi wajah, menangkap lokasi saat tombol ditekan, dan memakai satu catatan presensi per pegawai per tanggal. |
| 1:10–2:25 | **Demo alur utama.** Dengan akun pegawai demo yang belum clock-in hari ini: mulai kamera, selesaikan verifikasi, lalu clock-in. Tunjukkan notifikasi sukses dan perpindahan otomatis ke Riwayat Presensi tanpa refresh manual. Jika catatan hari ini sudah ada, demo clock-out sebagai gantinya. |
| 2:25–3:05 | **Bukti tersimpan.** Di Riwayat Presensi, tunjukkan tanggal hari ini, jam clock-in/clock-out, nama pegawai, dan Employee ID. Sebutkan bahwa akun login dipakai untuk `b2_register_id`, sehingga catatan tidak dapat tertukar antar-pegawai. |
| 3:05–4:20 | **Perbaikan dari QA.** Login sebagai HR, buka Attendance Management. Cari nama/Employee ID pada Attendance History, kemudian pilih Audit Trail dan cari kembali. Pilih Attendance Closing dan cari nama HR pembuat penutupan atau rentang periodenya. Tunjukkan hasil langsung terfilter. Lalu buka Edit Employee Profile: masukkan nama `111111` dan telepon `abc`, lalu tunjukkan pesan validasi sebelum data dikirim. |
| 4:20–5:00 | **Batasan dan next step.** Demo memerlukan kamera, izin lokasi, koneksi, serta akun yang sudah punya template wajah. Regression test lint/typecheck dan uji browser dicatat di `docs/D3-002_QA_VERIFICATION.md`. Next step: otomatisasi E2E dengan akun sandbox dan data demo terisolasi. |

## Pre-flight data demo

1. Gunakan akun pegawai demo yang aktif, mempunyai `employee_id`, mapping B2, dan template biometrik wajah.
2. Gunakan akun HR demo yang aktif untuk halaman Attendance Management dan Edit Employee Profile.
3. Pastikan tanggal Jakarta hari ini belum memiliki presensi untuk akun pegawai bila ingin mendemokan clock-in; jika sudah ada, gunakan clock-out dan riwayatnya.
4. Pastikan browser mendapat izin kamera dan lokasi. Tidak perlu membuat akun atau seed baru saat presentasi.
5. Jangan menampilkan email, nomor telepon, token, atau kredensial pada layar.

## Hal yang tidak diklaim di demo

- Tidak mendemokan perubahan database di luar D3-002.
- Tidak mendemokan pembuatan pegawai; validasi BUG-D3-005 dan BUG-D3-006 sengaja dibatasi pada Edit Employee Profile sesuai laporan QA.
- Tidak mendemokan kondisi gagal biometrik sebagai alur utama; cukup sebutkan pesan kesalahan tersedia untuk kamera, lokasi, koneksi, dan wajah yang tidak cocok.
