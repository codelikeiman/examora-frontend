# Perubahan Frontend — Rombak Role, Daftar Akun, Dashboard per Role

Lihat juga `PERUBAHAN.md` di folder backend untuk penjelasan lengkap alur & alasan.

## Ronde perbaikan terbaru — Kode Verifikasi 6 Digit (ganti Setujui/Tolak manual)
1. **Halaman Pengguna (Admin)** — tombol "Setujui" pada akun berstatus PENDING diganti
   menjadi **"Beri Kode"**. Klik tombol ini membuka dialog `VerificationCodeDialog` yang
   membuat kode 6 digit (tombol "Buat Kode Verifikasi") dan menampilkannya besar-besar
   supaya mudah dibacakan/di-copy untuk diberikan ke pengguna secara langsung.
2. **Halaman baru: Verifikasi Akun** (`/verify`, publik/tanpa login) — `VerifyAccountPage.tsx`.
   Pengguna memasukkan email/username + kode 6 digit yang diberikan admin untuk mengaktifkan akun.
3. **Halaman Daftar** (`RegisterPage.tsx`) — setelah daftar berhasil, pengguna diarahkan dengan
   tombol "Lanjut ke Verifikasi Akun" ke `/verify` (identifier terisi otomatis), alih-alih hanya
   pesan "tunggu admin". Ada juga link "Sudah punya kode verifikasi?" di form daftar.
4. **Halaman Masuk** (`LoginPage.tsx`) — tambah link "Verifikasi akun dengan kode" untuk pengguna
   yang sudah daftar tapi belum verifikasi.
5. Hook baru di `lib/queries.ts`: `useGenerateVerificationCode` (admin, menggantikan
   `useApproveUser` yang dihapus) dan `useVerifyAccount` (publik).

## Ronde perbaikan terbaru — Hapus Soal & Hapus Pengguna Permanen
1. **Bug hapus soal di Bank Soal — diperbaiki.** Soal yang sudah pernah dipakai di ujian
   sekarang otomatis diarsipkan (bukan gagal total) saat dihapus, dan langsung hilang dari
   daftar Bank Soal dengan notifikasi yang menjelaskan kenapa. Detail teknis penyebabnya
   ada di `PERUBAHAN.md` folder backend bagian 12.
2. **Fitur baru: Hapus Pengguna Permanen** (khusus Admin) — tombol tempat sampah merah
   terpisah dari tombol Nonaktifkan/Aktifkan di halaman Pengguna, dengan dialog konfirmasi
   tegas. Jika akun punya riwayat penting, sistem menolak dan menampilkan alasannya secara
   jelas alih-alih membiarkan gagal begitu saja.

## Ronde perbaikan sebelumnya — Kelas Siswa & Profil/Foto
1. **Registrasi siswa sekarang bisa pilih kelas.** `RegisterPage.tsx` menampilkan dropdown
   "Kelas" (opsional) khusus untuk peran Siswa, diambil dari endpoint publik
   `GET /public/classes`.
2. **Admin bisa mengelola siswa di sebuah kelas.** Di halaman Data Master → tab Kelas,
   tombol baru "Kelola Siswa" (ikon orang) membuka panel cari & tambah/keluarkan siswa —
   sebelumnya fitur ini sama sekali tidak ada di UI meski backend sudah mendukungnya.
3. **Admin bisa memindahkan kelas siswa langsung dari halaman Pengguna** — kolom "Kelas"
   baru dengan tombol ubah cepat, cocok untuk kasus siswa pindah kelas.
4. **Halaman Profil & Pengaturan (`/profile`) dibuat dari nol** — sebelumnya link ini ada
   di sidebar tapi mengarah ke halaman yang tidak pernah dibuat. Sekarang berisi:
   - Upload foto profil (avatar muncul juga di pojok kanan atas setelah diunggah)
   - Edit nama, email, nomor telepon
   - Info kelas (untuk siswa, read-only — diatur admin)
   - Ubah password
5. `vite.config.ts`: ditambahkan proxy `/uploads` → backend, supaya foto profil bisa
   dimuat saat development (sebelumnya hanya `/api` dan `/socket.io` yang di-proxy).

## Perubahan sebelumnya — Siswa tidak bisa mengerjakan ujian
1. **`ExamResultPanel.tsx` yang hilang sudah dibuat.** Sebelumnya `ExamSessionPage.tsx`
   meng-import komponen ini tapi file-nya tidak pernah ada di paket, sehingga halaman
   ujian (`/exam/:examId/take`) gagal dimuat sama sekali untuk siswa. Sekarang ada
   tampilan hasil (skor, status lulus/tidak lulus, atau status "menunggu penilaian"
   bila ujian mengandung soal esai).
2. Perbaikan kecil pada `stores/exam-session.store.ts` (`useRemainingSeconds`) yang
   berpotensi menyebabkan render berulang tak berhenti (bukan yang aktif dipakai saat
   ini, tapi diperbaiki untuk mencegah bug serupa di masa depan).

Perbaikan lain (pengiriman konten soal ke siswa) ada di sisi backend — lihat
`PERUBAHAN.md` folder backend bagian 6.

## Perubahan sebelumnya
1. **3 role saja**: Admin, Guru, Siswa. Semua referensi `SUPER_ADMIN`, `PENGAWAS`,
   `KEPALA_SEKOLAH` sudah dihapus dari sidebar, routing, dan halaman Pengguna.
2. **Halaman Daftar Akun baru** (`/register`) — bisa diakses publik dari halaman login
   ("Belum punya akun? Daftar di sini"). Setelah daftar, akun berstatus menunggu persetujuan
   dan pengguna diarahkan ke halaman informasi + tombol kembali ke login.
3. **Dashboard berbeda per role** (`src/features/dashboard/`):
   - `AdminDashboard.tsx` — notifikasi akun pending, ringkasan guru/siswa, daftar ujian.
   - `GuruDashboard.tsx` — shortcut Buat Soal & Buat Ujian, statistik bank soal miliknya.
   - `SiswaDashboard.tsx` — ujian yang bisa dikerjakan sekarang + tombol "Mulai Ujian".
   - `DashboardPage.tsx` sekarang cuma router kecil yang memilih salah satu di atas
     berdasarkan `role` user yang login.
4. **Halaman Pengguna** (`UsersPage.tsx`) — ditambah tab status (Semua/Menunggu
   Persetujuan/Disetujui/Ditolak) serta tombol **Setujui** / **Tolak** (dengan alasan opsional)
   untuk akun yang mendaftar sendiri.
5. **Sidebar** (`MainLayout.tsx`) — menu disesuaikan per role, ditambah badge merah jumlah
   akun pending di menu "Pengguna" untuk Admin.
6. **Bug "Data tidak valid" saat membuat ujian — DIPERBAIKI**:
   `ExamPages.tsx` sebelumnya mengirim `classIds: ['class-xii-ipa-1']` (hardcode) setiap kali
   membuat ujian baru, sehingga selalu ditolak backend. Sekarang ada pemilih kelas asli
   (chip yang bisa diklik) yang mengambil data dari `GET /classes`, dan wajib pilih minimal
   1 kelas sebelum submit.
7. Tombol "Buat Ujian" / "Edit" / "Tambah Soal ke Pool" pada halaman Ujian sekarang hanya
   tampil untuk Guru — Admin tetap bisa melihat & memonitor ujian, tapi tidak melihat
   kontrol pembuatan/pengeditan soal.
8. Beberapa perbaikan tipe TypeScript pre-existing dirapikan (cast `unknown` yang benar)
   supaya `npm run build` berjalan lebih bersih.

## Menjalankan
```bash
cd frontend_for_claude
npm install
npm run dev
```
Pastikan `VITE_API_URL` (lihat `.env` / `src/lib/api-client.ts`) mengarah ke backend yang
sudah dijalankan sesuai `PERUBAHAN.md` di folder backend.

## Fitur Baru — Halaman Riwayat Ujian Siswa (`/my-history`)
Siswa kini punya halaman khusus untuk melihat seluruh riwayat ujian yang pernah dikerjakan,
lintas semua mata pelajaran, termasuk setiap percobaan/attempt bila suatu ujian diulang.

- Halaman baru `MyHistoryPage.tsx`, route `/my-history` (role SISWA), diambil dari endpoint
  backend baru `GET /exam-sessions/history` via hook `useMyExamHistory()`.
- Kartu statistik: total percobaan, jumlah lulus, rata-rata nilai, jumlah ujian yang diulang.
- Filter: mata pelajaran (dropdown, otomatis terisi dari data) dan status kelulusan
  (Semua / Lulus / Belum Lulus / Menunggu Nilai).
- Setiap baris menampilkan judul ujian, mapel, status, tanggal kumpul, nilai vs KKM,
  badge \"Percobaan ke-N\" bila attempt > 1, dan tombol Detail yang mengarah ke halaman
  review jawaban (`/sessions/:id`) yang sudah ada sebelumnya.
- Ditambahkan link ke halaman ini di sidebar (menu \"Riwayat Ujian\") dan sebagai kartu
  pintasan di Dashboard Siswa.
- Ini melengkapi (bukan mengganti) tab \"Riwayat Ujian Selesai\" yang sudah ada di
  `/my-exams` — tab lama berbasis daftar ujian FINISHED, halaman baru ini berbasis
  riwayat sesi pribadi siswa sehingga lebih akurat dan mencakup semua attempt.
