# My Nukhbah

Mutabaah Yaumiyyah Santri Pesantren Nukhbah Jogja.

My Nukhbah Tahap 3 menyediakan jurnal kegiatan asrama harian dan pekanan: kehadiran, Tahajjud, pendampingan, penilaian adab, dan pelanggaran. Master data santri, kelas, kamar, halaqah, serta periode akademik tersedia melalui Dashboard Admin. Login, role, navigasi responsif, dan tema terang/gelap tersedia sejak Tahap 1.

## Struktur proyek

```text
my-nukhbah/
├── .github/workflows/ci.yml
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── logo-pesantren.png
│   └── logo-pesantren-dark.png
├── src/
│   ├── app/
│   │   ├── (portal)/[section]/page.tsx
│   │   ├── (portal)/admin/master/page.tsx
│   │   ├── (portal)/layout.tsx
│   │   ├── login/page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/button.tsx
│   │   ├── logo.tsx
│   │   ├── portal-nav.tsx
│   │   └── theme.tsx
│   ├── config/
│   │   ├── constants.ts
│   │   └── site.ts
│   ├── features/auth/
│   ├── features/academic/
│   ├── lib/
│   └── middleware.ts
├── .env.example
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## Instalasi lokal

1. Pasang Node.js 24 LTS, Git, dan pnpm sesuai versi `packageManager` di `package.json`. Siapkan proyek Supabase khusus pengembangan.
2. Untuk paket ZIP, ekstrak lalu masuk ke folder `my-nukhbah`. Jika proyek sudah diunggah ke GitHub, clone repo lalu masuk ke foldernya.
3. Jalankan `pnpm install --frozen-lockfile`. Instalasi menjalankan `prisma generate` secara otomatis.
4. Salin `.env.example` menjadi `.env`. Isi konfigurasi sesuai tabel berikut.
5. Di Dashboard Supabase, buka **Authentication → Users**, buat akun pertama dengan email terkonfirmasi, lalu salin **User UID**. Matikan pendaftaran publik jika akun hanya dibuat oleh admin.
6. Isi konfigurasi seed. Jalankan migrasi lalu seed dan server pengembangan.

```bash
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000), lalu gunakan email dan kata sandi akun Supabase tadi. Di Windows PowerShell, salin berkas env dengan `Copy-Item .env.example .env`.

| Variabel | Isi |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL untuk runtime. Di Vercel, gunakan transaction pooler Supabase dengan `pgbouncer=true`. |
| `DIRECT_URL` | URL koneksi direct atau session pooler port 5432 untuk Prisma CLI dan migrasi. Gunakan URL dari panel **Connect**. |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key dari proyek yang sama. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key untuk URL sementara foto Asrama/portfolio dan upload foto/tanda tangan oleh Admin. Hanya di environment server; jangan beri awalan `NEXT_PUBLIC_` atau bagikan nilainya. |
| `SEED_AUTH_USER_ID` | User UID akun yang dibuat pada langkah 5. |
| `SEED_DISPLAY_NAME` | Nama yang tampil pada aplikasi. |
| `SEED_ROLE` | `ADMIN`, `KEPALA_ASRAMA`, `MUSYRIF`, atau `WALI_SANTRI`. |

Ganti nilai seed dengan UID berbeda untuk setiap profil tambahan, lalu jalankan `pnpm prisma db seed` kembali. Seed mempertahankan role dan status profil yang sudah ada. Untuk mengubah profil yang sudah ada gunakan Prisma Studio dari lingkungan admin tepercaya. File `.env` telah dikecualikan oleh Git. Login menggunakan publishable key; `SUPABASE_SERVICE_ROLE_KEY` hanya digunakan di server dan tidak pernah dikirim ke browser.

## Akses portal

| Role | Halaman awal | Menu yang tersedia |
| --- | --- | --- |
| Admin | Dashboard Admin | Dashboard, Master Data (di dalam Dashboard), Asrama, Pembinaan, Ekstra, Portfolio, Kalender, Rekap Admin |
| Kepala Asrama | Rekap Asrama | Asrama, Rekap Admin |
| Murabbi / Muhaffizh | Ruang Pembinaan | Pembinaan, Ekstra, Asrama, Portfolio, Kalender |
| Wali Santri | Portfolio Santri | Portfolio, Kalender |

Aturan akses halaman ada di `src/features/auth/permissions.ts` dan ditegakkan di server. Saat modul data dikembangkan, setiap query dan Server Action juga harus memeriksa cakupan data. Profil Wali hanya boleh membaca data santri yang memiliki relasi wali aktif. Profil Murabbi/Muhaffizh hanya boleh mengakses penempatan kamar/halaqah yang ditugaskan.

## Mengganti logo dan konstanta

Untuk mengganti logo, cukup ganti file di folder `public/` dengan nama yang sama. File `logo-pesantren.png` dipakai untuk tema terang, sedangkan `logo-pesantren-dark.png` untuk tema gelap. Komponen `Logo` memasang varian sesuai tema. Kop PDF portfolio memakai logo terang dari `src/config/site.ts`.

Buka `src/config/constants.ts`, ubah nilai yang diinginkan, simpan, lalu restart dev server atau redeploy. Ambil nilai target dari `APP_CONFIG` saat membuat komponen atau layanan terkait. Dashboard membaca tahun ajaran dan semester aktif dari database. Nilai tahun ajaran dan semester di konfigurasi hanya referensi pengaturan awal.

## Upgrade dari Tahap 1

Salin perubahan ke repo yang sama dan pertahankan riwayat commit, konfigurasi `.env`, serta logo yang sudah Anda ganti. Tambahkan migrasi baru di `prisma/migrations/` bersama perubahan skema Prisma. Cadangkan database tujuan sebelum migrasi.

```bash
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm dev
```

Jalankan migrasi pada database produksi sebelum deploy kode baru di Vercel. Jika akun Admin Tahap 1 sudah bisa masuk, Anda dapat memakai profil yang sama tanpa seed ulang. Jika repo Anda sudah memiliki pengaturan pnpm khusus untuk Vercel, pertahankan pengaturan tersebut beserta lockfile yang kompatibel.

## Cara Memulai Tahun Ajaran Baru

1. Masuk sebagai Admin. Buka **Dashboard → Buka master data**.
2. Buat tahun ajaran, misalnya **2026/2027**. Isi awal dan akhir Ganjil serta akhir Genap. Genap dimulai sehari setelah Ganjil berakhir. Kedua semester dibuat bersama dalam satu transaksi.
3. Pilih semester pembuka, lalu tekan **Aktifkan semester ini**. Aktivasi awal menandai tahun ajaran dan semester dalam satu transaksi.
4. Buat kelas, kamar dan halaqah. Jika diperlukan, pilih Murabbi kamar dan Muhaffizh halaqah dari profil aktif dengan role internal `MUSYRIF`.
5. Tambahkan santri dengan NIS unik. Buka **Atur penempatan** pada nama santri, lalu pilih kelas, kamar atau halaqah dan simpan. Gunakan filter periode untuk meninjau penempatan semester lain.

Admin bisa menyiapkan periode berikutnya dan melihat periode lain melalui filter. Portal menggunakan semester aktif dari database. Penempatan dan kelompok di periode nonaktif tersedia dalam mode baca. **Penutupan semester, pergantian periode aktif, dan kenaikan kelas atau pindah kamar massal** mengikuti Tahap 10.

### Struktur data akademik

- `Student` adalah identitas tetap. Koreksi nama dan NIS berlaku pada profil santri, termasuk ketika identitas yang sama ditampilkan bersama riwayat penempatan.
- `Enrollment` menyimpan satu penempatan per santri per semester. Relasi gabungan memeriksa kesesuaian tahun ajaran, semester, serta kelas/kamar/halaqah dalam database.
- Kelas, kamar dan halaqah berumur satu semester. Keanggotaan periode berikutnya harus dibuat di semester tujuan agar riwayat sebelumnya tetap utuh.
- Modul jurnal, ekstra, reward dan portfolio mengikat data ke pasangan ID tahun ajaran dan semester. Rekap mengikuti periode data sumber. Saat membangun modul data, periksa penugasan staf dan relasi wali–santri pada setiap query dan tindakan server.

## GitHub dan Vercel

1. Buat repository GitHub privat. Jika mulai dari ZIP, jalankan `git init -b main`, `git add .`, dan `git commit -m "Tambahkan My Nukhbah Tahap 2"`. Tambahkan URL remote repo pilihan Anda dan push.
2. Impor repo dari dashboard Vercel. Pilih Next.js dan Node.js 24. Salin empat variabel runtime dari tabel env ke pengaturan proyek, gunakan database terpisah untuk preview dan produksi.
3. Dari terminal yang terhubung ke database tujuan, jalankan `pnpm prisma migrate deploy` dengan kredensial migrasi yang sesuai. Siapkan akun dan profil Admin memakai seed sebelum login.
4. Deploy aplikasi. Perintah build menjalankan `prisma generate` sebelum Next.js memeriksa tipe agar Prisma Client selalu mengikuti `prisma/schema.prisma`. GitHub Actions menjalankan instalasi terkunci, type check, dan build tanpa kredensial produksi.

## Upgrade, backup, dan troubleshooting

- **Upgrade**. Jalankan `pnpm outdated`, perbarui paket yang dibutuhkan di branch terpisah, lalu jalankan `pnpm typecheck` dan `pnpm build`. Perbarui Prisma CLI dan Prisma Client dalam versi yang sama. Commit perubahan lockfile.
- **Backup**. Buat backup database melalui fasilitas proyek Supabase sebelum migrasi produksi. Uji pemulihan di proyek terpisah dan periksa bahwa akun Auth, profil, serta hak akses sesuai.
- **P1001 / koneksi gagal**. Periksa host, password, port dan URL encoding password. Jika jaringan lokal hanya mendukung IPv4, pakai session pooler untuk `DIRECT_URL`.
- **P3014 / shadow database**. Jika Supabase membatasi pembuatan shadow database oleh `migrate dev`, untuk memasang migrasi yang sudah tersedia di proyek pengembangan jalankan `pnpm prisma migrate deploy`. Untuk membuat migrasi baru, gunakan Supabase lokal atau shadow database terpisah.
- **Login ditolak setelah akun dibuat**. Pastikan email terkonfirmasi, variabel Auth dan Prisma menunjuk proyek yang sama, UID benar, serta profil aktif.
- **Prisma Client belum tergenerate**. Jalankan `pnpm prisma generate` setelah instalasi.
- **Tema atau logo belum berubah**. Muat ulang halaman dan periksa nama file serta cache browser.

## Jurnal Kegiatan Asrama (Tahap 3)

- **Akses input**: Admin dan Murabbi dapat mengisi jurnal dari menu **Pembinaan**. Murabbi hanya dapat menyimpan data untuk kamar yang ditugaskan pada semester aktif.
- **Kehadiran utama**: setiap santri dicatat sebagai Hadir (H), Sakit/UKP (S), Izin (I), atau Alpa (A). Keterangan opsional. Status menjadi nilai awal Pendampingan Pagi/Sore/Malam, dan masih dapat diubah pada masing-masing kartu.
- **Kriteria harian**: Tahajjud (Ya/Tidak), Pendampingan Pagi, Sore, dan Malam (H/S/I/A). Tiap kartu disimpan secara terpisah; persentase laporan harian dihitung dari empat kartu kegiatan.
- **Foto**: setiap kartu kegiatan menerima satu foto, termasuk Tahajjud. Input foto mendukung pemilih file/kamera pada perangkat yang mendukung dan penghapusan foto tersimpan. Foto disimpan pada bucket Supabase Storage `mutabaah`; pastikan bucket dan policy Storage tersedia. Kepala Asrama/Admin dapat melihat foto pada **Asrama → Rincian hasil input** melalui URL sementara; tambahkan `SUPABASE_SERVICE_ROLE_KEY` di environment server untuk mengaktifkan preview foto.
- **Kriteria pekanan**: penilaian Huquq Sittah Senin–Minggu (enam nilai 1–10; nilai di bawah 8 wajib memiliki keterangan), serta entri pelanggaran dengan total poin otomatis dihitung dari pengulangan × poin per kejadian.
- **Prestasi**: Murabbi/Admin mencatat apresiasi atau prestasi santri melalui form pekanan di **Pembinaan**.
- **Pemeriksaan hasil**: Admin dan Kepala Asrama membuka **Asrama → Rincian hasil input**, memilih kamar, tanggal, dan pekan untuk melihat seluruh status kehadiran, Tahajjud, status pendampingan, foto, nilai dan catatan Huquq Sittah, prestasi, serta pelanggaran. Tampilan mengambil data terbaru saat dimuat dan diperbarui otomatis tiap 15 detik.
- **Notifikasi kelengkapan**: di bagian atas rekap Asrama, Admin/Kepala Asrama melihat kamar dan kriteria yang masih ditunggu untuk tanggal/pekan terpilih. Kehadiran, kegiatan, foto, Huquq Sittah, pelanggaran, serta status pemeriksaan prestasi dicek terpisah. Prestasi dapat ditandai sudah diperiksa meskipun tidak ada catatan, sehingga tidak muncul sebagai kekurangan berulang.
- **Rekap**: Admin dan Kepala Asrama dapat membuka **Daftar Izin** dan rekap pelanggaran pekanan dari menu **Asrama**. Portfolio tetap mengikuti ringkasan yang saat ini tersedia untuk role yang memang mendapat akses.
- **Periode**: jurnal dan penilaian terikat ke tahun ajaran/semester aktif. Input harian dibatasi rentang semester; penilaian pekanan menggunakan pekan yang beririsan dengan semester aktif.
- **Wali Santri**: portfolio wali hanya menampilkan santri yang relasinya diaktifkan Admin; aplikasi tidak menebak atau membuka data santri tanpa relasi tersebut.

Setelah mengambil perubahan Tahap 3 terbaru, jalankan migrasi baru di database lokal/dev:

```powershell
pnpm prisma migrate dev
pnpm prisma generate
```

Migrasi `20261126000000_dorm_journal_criteria` menambah data kehadiran, pengiriman per kriteria, penilaian pekanan, dan pelanggaran tanpa menghapus tabel jurnal lama. Migrasi `20261127090000_dorm_achievements` menambah pencatatan prestasi pekanan, sedangkan `20261127103000_dorm_achievement_review_status` menambah status bahwa prestasi telah diperiksa.

## Jurnal Al-Quran (Tahap 4)

- **Akses input**: Admin dan Muhaffizh dapat mengisi jurnal dari menu **Pembinaan**. Muhaffizh dibatasi pada halaqah yang ditugaskan pada semester aktif.
- **Ziyadah**: mencatat juz, halaman awal–akhir, jumlah baris, serta nilai kelancaran A–D. Nilai default Ziyadah diambil dari `APP_CONFIG.defaultZiyadahTarget`.
- **Murajaah**: mencatat juz, halaman awal–akhir, dan nilai kelancaran A–D. Target bulanan awal memakai `APP_CONFIG.defaultMurajaahTarget`.
- **Juziyyah**: mencatat juz (1–30), halaman yang diuji, nilai ujian 0–100, dan kelancaran A–D.
- **Riwayat**: 20 entri terakhir halaqah ditampilkan di form Pembinaan. Jurnal Tahfidz juga tampil pada rekap Asrama dan portfolio santri dalam cakupan role.
- **Periode**: setiap entri terikat tahun ajaran, semester, halaqah, santri, dan tanggal; input dibatasi rentang semester aktif.

Terapkan juga migrasi Tahap 4:

```powershell
pnpm prisma migrate dev
pnpm prisma generate
pnpm dev
```

Migrasi `20261126010000_tahfidz_journal` menambah tabel jurnal Tahfidz dan tidak mengubah data Tahap 1–3.

### Revisi UI dan pencatatan Tahap 4

- Kartu input harian dan pekanan kini dipisahkan. Kartu kategori dimulai dalam keadaan ringkas dan dibuka lewat tombol **Isi**.
- Tahfizh dipilih berdasarkan pekan Senin–Minggu. Kelengkapan laporan dihitung dari tiga kategori (Ziyadah, Murajaah, Juziyyah), masing-masing harus tersimpan untuk seluruh santri halaqah.
- Posisi hafalan dicatat dengan Juz, halaman awal/akhir, jumlah baris, serta nilai kelancaran A–D. Target bulanan portfolio memakai `APP_CONFIG.defaultZiyadahTarget` dan `APP_CONFIG.defaultMurajaahTarget`.
- Portfolio merangkum kehadiran, hafalan, Huquq Sittah, prestasi, dan pelanggaran dalam satu kartu dengan visual persentase.

Jalankan migrasi revisi posisi hafalan/pekan:

```powershell
pnpm prisma migrate dev
pnpm prisma generate
```

Migrasi `20261126020000_tahfidz_weekly_position` menambahkan kolom Juz/halaman dan nilai kelancaran tanpa menghapus kolom surah/ayat lama.

## Program Ekstra (Tahap 5)

- **Master data**: dari **Dashboard → Master Data**, Admin mengatur maksimal 5 halaqah Tahfizh Intensif dan 10 halaqah Tahsin UMMI, menetapkan Muhaffizh berbeda pada tiap kelompok, dan memilih anggota. Jumlah minimum yang disarankan adalah 3 dan 6 halaqah. Satu santri hanya dapat mengikuti satu program ekstra di satu semester. Santri Tahfizh Intensif tidak wajib memiliki halaqah Tahfizh reguler.
- **Akses**: Admin dan Muhaffizh dapat mengisi program di menu **Ekstra**. Muhaffizh hanya melihat kelompok yang diampu; setiap query dan simpanan dibatasi kelompok serta semester aktif.
- **Tahfizh Intensif Nukhbatul Huffazh**: tab Ziyadah, Murajaah, dan Ujian Tasmi'. Ziyadah mencatat halaman, posisi Juz/halaman, catatan Muhaffizh, serta tanda pekan Murajaah. Target semester adalah 60 halaman (3 putaran × 4 pekan × 5 halaman); pekan Murajaah yang ditandai tidak menambah capaian halaman. Murajaah menyimpan checklist Jadid/Qadim. Tasmi' mendukung beberapa juz, nilai A–D per juz, dan catatan Muhaffizh.
- **Tahsin UMMI**: tab Pembelajaran dan Ujian; jenjang Jilid 1–3, Gharib, Tajwid, atau Al-Qur'an. Pembelajaran mencatat rentang halaman dan nilai A–D; nilai selain A wajib memiliki catatan. Tombol **Terapkan ke semua** menyalin jenjang, halaman, dan nilai dari panel bersama, sedangkan catatan tetap per santri.
- **Simpan dan riwayat**: pilih halaqah dan pekan pada form. Baris menandai data tersimpan, dapat ditimpa, atau dikosongkan. Catatan Tahap 5 lama tetap disimpan di `ExtraWeeklyEntry` sebagai arsip dan tidak dipetakan otomatis ke kelompok baru.
- **Portfolio**: santri Tahfizh Intensif menampilkan kartu khusus dengan capaian halaman bulanan dibanding target semester 60 halaman dan indikator bintang untuk ujian Tasmi'. Kartu Tahfizh reguler tidak ditampilkan untuk anggota Intensif.
- **Periode**: data program baru terikat tahun ajaran, semester, kelompok, anggota, dan pekan Senin–Minggu yang beririsan dengan semester aktif.

Terapkan migrasi Tahap 5 pada database development:

```powershell
pnpm prisma migrate dev
pnpm prisma generate
pnpm dev
```

Migrasi `20261126040000_extra_program_cohorts` menambah halaqah khusus, roster, dan jurnal terstruktur; tabel jurnal lama tetap dipertahankan. Rekap pekanan Asrama menampilkan progres jurnal Tahfizh dan Ekstra.

## Portfolio Bulanan (Tahap 7)

- Admin membuka **Dashboard → Master Data → Akses portfolio wali**, lalu mengatur santri yang dapat dibaca untuk setiap akun Wali Santri aktif. Simpan mengganti seluruh daftar relasi aktif wali tersebut; pilihan yang dihapus dinonaktifkan dan tidak lagi memberikan akses.
- Wali masuk melalui akun dengan role `WALI_SANTRI`, memilih santri yang sudah ditautkan dan bulan yang beririsan dengan semester aktif. Tampilan wali bersifat hanya-baca; mengirim `studentId` lain tidak memberi akses.
- Admin dan Murabbi dapat mengisi narasi perkembangan bulanan: kalimat pembuka, hal yang berkembang baik, area penguatan, arahan bulan berikutnya, dan catatan tambahan. Murabbi hanya dapat menyunting portfolio santri pada kamar/halaqah/kelompok ekstra yang ditugaskan di semester aktif.
- Portfolio web dan PDF menampilkan data yang selaras: foto close-up, kehadiran, Tahfizh, Huquq Sittah, prestasi, pelanggaran, diagram, kesimpulan otomatis, catatan editable, dan identitas penilai.
- Admin mengunggah foto santri dan gambar tanda tangan di **Dashboard → Master Data → Foto santri & tanda tangan**. File JPG/PNG/WebP maksimal 5 MB disimpan privat pada bucket Supabase Storage `mutabaah`; siapkan `SUPABASE_SERVICE_ROLE_KEY` di environment server. Tanda tangan yang tersedia akan tercetak pada portfolio. Jika belum diunggah, area tanda tangan tetap disediakan.
- Lupa kata sandi tersedia dari halaman login melalui tautan email. Di Supabase, masukkan URL `/auth/callback` ke daftar Redirect URLs Auth agar tautan reset dapat kembali ke aplikasi.
- Migrasi lanjutan `20261128150000_portfolio_media_and_templates` menambahkan path foto, tanda tangan, dan template narasi. Terapkan migrasi terbaru ke database lokal/development sebelum menguji upload atau menyimpan narasi.
- Data narasi terikat ke santri, semester, dan bulan. Data jurnal asal tidak disalin; ringkasan dihitung dari catatan sumber yang tersedia.

Untuk menguji perubahan database, pastikan `.env` menunjuk ke database lokal/development. Jangan menjalankan `migrate dev` terhadap database produksi.

```powershell
pnpm prisma migrate dev
pnpm prisma generate
pnpm typecheck
pnpm dev
```

Masuk sebagai Admin untuk menautkan akun Wali dan santri, mengelola foto, serta mengunggah tanda tangan. Masuk dengan akun Wali tersebut untuk memeriksa bahwa hanya santri tertaut yang muncul; uji narasi sebagai Admin/Murabbi lalu unduh PDF.

## Modul berikutnya

Tahap 4 mengimplementasikan jurnal Al-Quran (Ziyadah, Murajaah, Juziyyah), Tahap 5 mencatat Tahfizh Intensif serta Tahsin UMMI, Tahap 6 menyediakan rekap terpadu berbasis Recharts, dan Tahap 7 menyediakan portfolio bulanan dengan narasi Murabbi, akses baca Wali yang ditautkan Admin, serta unduhan PDF. Reward/pelanggaran lanjutan, Mutamayyizun, kalender akademik, dan pengingat WhatsApp mengikuti tahapan produk. Supabase Storage digunakan untuk unggahan foto.
