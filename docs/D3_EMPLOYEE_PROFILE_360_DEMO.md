# Show and Tell — Employee Profile 360° (3–5 menit)

## Persiapan

- Login sebagai HR, lalu buka `/employees/HCC-HR-MGR-003`.
- Pastikan halaman memakai bahasa Indonesia agar narasi konsisten.
- Data yang memakai awalan `[DEMO]` dibuat hanya untuk presentasi dan tidak mewakili keputusan HR produksi.

## Narasi demo

1. **Masalah bisnis — 30 detik**
   Data pegawai biasanya tersebar: biodata berada di registrasi, presensi di attendance, dan pengembangan/rekognisi berada di modul lain. HR sulit membuktikan konteks seseorang tanpa membuka banyak halaman.

2. **Fitur yang selesai — 45 detik**
   Employee Profile 360° menyatukan biodata B2 dengan data D3 melalui pemetaan employee resmi. Attendance menggunakan B2 Register ID; sertifikasi, feedback, dan reward menggunakan D3 Employee ID.

3. **Demo alur utama — 2 menit**
   - Tunjukkan header profil Abimanyu dan pesan keterhubungan data.
   - Buka kartu **Attendance**: tampilkan record `PRESENT` dengan catatan `[DEMO D3-002] Face biometric attendance`.
   - Buka kartu **Sertifikasi**: tampilkan lima sertifikat dan klik **Buka dokumen** pada salah satunya sebagai bukti arsip asli tersedia.
   - Buka kartu **Umpan balik & reward**: tunjukkan empat feedback yang berasal dari workflow feedback serta satu reward `[DEMO]` berstatus `PUBLISHED`.

4. **Bukti data tersimpan — 45 detik**
   Kembali ke halaman setelah refresh. Semua kartu tetap menampilkan data karena data dibaca dari tabel Supabase yang terhubung, bukan dari placeholder UI.

5. **Batasan dan next step — 30 detik**
   Data dengan label `[DEMO]` hanya fixture presentasi. Upload dan manajemen sertifikat mandiri belum ditambahkan; next step-nya adalah halaman manajemen sertifikasi dengan upload terproteksi ke Supabase Storage.
