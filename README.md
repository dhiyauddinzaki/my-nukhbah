# My Nukhbah

Mutabaah Yaumiyyah Santri Pesantren Nukhbah Jogja.

My Nukhbah Tahap 3 menyediakan jurnal kegiatan asrama harian, termasuk kehadiran sesi, shalat fardhu, dan foto kegiatan per kamar. Master data santri, kelas, kamar, halaqah, serta periode akademik tersedia melalui Dashboard Admin. Login, role, navigasi responsif, dan tema terang/gelap tersedia sejak Tahap 1.

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
| `SEED_AUTH_USER_ID` | User UID akun yang dibuat pada langkah 5. |
| `SEED_DISPLAY_NAME` | Nama yang tampil pada aplikasi. |
| `SEED_ROLE` | `ADMIN`, `KEPALA_ASRAMA`, `MUSYRIF`, atau `WALI_SANTRI`. |

Ganti nilai seed dengan UID berbeda untuk setiap profil tambahan, lalu jalankan `pnpm prisma db seed` kembali. Seed mempertahankan role dan status profil yang sudah ada. Untuk mengubah profil yang sudah ada gunakan Prisma Studio dari lingkungan admin tepercaya. File `.env` telah dikecualikan oleh Git. Auth menggunakan publishable key dan tidak memerlukan service key.

## Akses portal

| Role | Halaman awal | Menu yang tersedia |
| --- | --- | --- |
| Admin | Dashboard Admin | Dashboard, Master Data (di dalam Dashboard), Asrama, Pembinaan, Portfolio, Kalender, Rekap Admin |
| Kepala Asrama | Rekap Asrama | Asrama, Rekap Admin |
| Musyrif / Guru Pengampu Quran | Ruang Pembinaan | Pembinaan, Asrama, Portfolio, Kalender |
| Wali Santri | Portfolio Santri | Portfolio, Kalender |

Aturan akses halaman ada di `src/features/auth/permissions.ts` dan ditegakkan di server. Saat modul data dikembangkan, setiap query dan Server Action juga harus memeriksa cakupan data. Profil Wali hanya boleh membaca data santri yang memiliki relasi wali aktif. Profil Musyrif/Guru hanya boleh mengakses penempatan kamar/halaqah yang ditugaskan. Sambungkan jadwal, database, dan tindakan ubah data pada tahap implementasi masing-masing.

## Mengganti logo dan konstanta

Untuk mengganti logo, cukup ganti file di folder `public/` dengan nama yang sama. File `logo-pesantren.png` dipakai untuk tema terang, sedangkan `logo-pesantren-dark.png` untuk tema gelap. Komponen `Logo` memasang varian sesuai tema. Kop PDF pada Tahap 7 dapat menggunakan path logo terang dari `src/config/site.ts`.

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
4. Buat kelas, kamar dan halaqah. Jika diperlukan, pilih Musyrif kamar dan Guru Pengampu Quran dari profil aktif dengan role `MUSYRIF`.
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
4. Deploy aplikasi. GitHub Actions menjalankan instalasi terkunci, type check, dan build tanpa kredensial produksi.

## Upgrade, backup, dan troubleshooting

- **Upgrade**. Jalankan `pnpm outdated`, perbarui paket yang dibutuhkan di branch terpisah, lalu jalankan `pnpm typecheck` dan `pnpm build`. Perbarui Prisma CLI dan Prisma Client dalam versi yang sama. Commit perubahan lockfile.
- **Backup**. Buat backup database melalui fasilitas proyek Supabase sebelum migrasi produksi. Uji pemulihan di proyek terpisah dan periksa bahwa akun Auth, profil, serta hak akses sesuai.
- **P1001 / koneksi gagal**. Periksa host, password, port dan URL encoding password. Jika jaringan lokal hanya mendukung IPv4, pakai session pooler untuk `DIRECT_URL`.
- **P3014 / shadow database**. Jika Supabase membatasi pembuatan shadow database oleh `migrate dev`, untuk memasang migrasi yang sudah tersedia di proyek pengembangan jalankan `pnpm prisma migrate deploy`. Untuk membuat migrasi baru, gunakan Supabase lokal atau shadow database terpisah.
- **Login ditolak setelah akun dibuat**. Pastikan email terkonfirmasi, variabel Auth dan Prisma menunjuk proyek yang sama, UID benar, serta profil aktif.
- **Prisma Client belum tergenerate**. Jalankan `pnpm prisma generate` setelah instalasi.
- **Tema atau logo belum berubah**. Muat ulang halaman dan periksa nama file serta cache browser.

## Jurnal Kegiatan Asrama (Tahap 3)

- **Akses input**: Admin dan Musyrif/Guru Pengampu Quran dapat mengisi jurnal dari menu **Pembinaan**. Musyrif hanya dapat mengisi kamar yang ditugaskan pada semester aktif.
- **Akses rekap**: Admin, Kepala Asrama, dan Musyrif dapat melihat kelengkapan jurnal harian per kamar dari menu **Asrama**.
- **Data harian**: checklist kehadiran sesi (Tahajjud, Absen Pagi, Sekolah, Absen Sore, Kajian Adab, Absen Malam), status shalat fardhu (Muwafiq, JT, MF, Alpha, Izin, Sakit), dan foto Absen Pagi/Sore/Malam.
- **Foto**: unggahan foto disimpan di Supabase Storage bucket `mutabaah`. Pastikan bucket tersebut tersedia di proyek Supabase.
- **Periode**: jurnal terikat ke tahun ajaran dan semester aktif, serta hanya dapat diisi untuk tanggal dalam rentang semester aktif.

## Modul berikutnya

Tahap 4 mengimplementasikan jurnal Al-Quran (Ziyadah, Murajaah, Juziyyah). Ekstra, rekap Recharts, portfolio PDF, reward/pelanggaran, Mutamayyizun, kalender, dan pengingat WhatsApp mengikuti tahapan produk. Supabase Storage digunakan untuk unggahan foto; `@react-pdf/renderer` digunakan ketika PDF diimplementasikan.
