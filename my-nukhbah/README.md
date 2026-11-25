# My Nukhbah

Mutabaah Yaumiyyah Santri Pesantren Nukhbah Jogja.

Tahap 1 menyediakan login, profil dan role, navigasi sesuai role, layout responsif, serta tema terang dan gelap. Halaman operasional menampilkan ruang untuk modul yang akan dibangun pada tahap berikutnya. Aplikasi membaca role dan status akun dari PostgreSQL pada server. Akun Supabase yang belum memiliki profil aktif tidak dapat membuka ruang kerja.

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

Ganti nilai seed dengan UID berbeda untuk setiap profil tambahan, lalu jalankan `pnpm prisma db seed` kembali. Seed mempertahankan role dan status profil yang sudah ada. Untuk mengubah profil yang sudah ada pada Tahap 1, gunakan Prisma Studio dari lingkungan admin tepercaya. File `.env` telah dikecualikan oleh Git. Auth menggunakan publishable key dan tidak memerlukan service key.

## Akses Tahap 1

| Role | Halaman awal | Menu yang tersedia |
| --- | --- | --- |
| Admin | Dashboard Admin | Dashboard, Asrama, Pembinaan, Portfolio, Kalender, Rekap Admin |
| Kepala Asrama | Rekap Asrama | Asrama, Rekap Admin |
| Musyrif / Guru Pengampu Quran | Ruang Pembinaan | Pembinaan, Asrama, Portfolio, Kalender |
| Wali Santri | Portfolio Santri | Portfolio, Kalender |

Aturan akses halaman ada di `src/features/auth/permissions.ts` dan ditegakkan di server. Saat modul data dikembangkan, setiap query dan Server Action juga harus memeriksa cakupan data. Profil Wali hanya boleh membaca data santri yang memiliki relasi wali aktif. Profil Musyrif/Guru hanya boleh mengakses penempatan kamar/halaqah yang ditugaskan. Sambungkan jadwal, database, dan tindakan ubah data pada tahap implementasi masing-masing.

## Mengganti logo dan konstanta

Untuk mengganti logo, cukup ganti file di folder `public/` dengan nama yang sama. File `logo-pesantren.png` dipakai untuk tema terang, sedangkan `logo-pesantren-dark.png` untuk tema gelap. Komponen `Logo` memasang varian sesuai tema. Kop PDF pada Tahap 7 dapat menggunakan path logo terang dari `src/config/site.ts`.

Buka `src/config/constants.ts`, ubah nilai yang diinginkan, simpan, lalu restart dev server atau redeploy. Ambil nilai target dari `APP_CONFIG` saat membuat komponen atau layanan terkait. Tahun ajaran dan semester di konfigurasi saat ini dipakai sebagai label awal.

## Cara Memulai Tahun Ajaran Baru

Alur berikut mulai berlaku setelah model data periode (Tahap 2) dan menu Pengaturan Tahun Ajaran (Tahap 10) tersedia.

1. Masuk sebagai Admin dan buka **Pengaturan → Tahun Ajaran**.
2. Buat tahun ajaran baru, tentukan tanggal periode, dan siapkan semester Ganjil/Genap.
3. Tutup semester sebelumnya agar jurnal dan portfolio historis menjadi read-only.
4. Aktifkan tahun ajaran dan semester baru. Rekap dan input memakai periode aktif sebagai filter awal.
5. Gunakan **Naik Kelas / Pindah Kamar** untuk membuat penempatan periode baru dari data santri yang sama.

Tahap 2 akan menambahkan model `AcademicYear` dan `Semester`. Gunakan penempatan santri yang terikat periode agar perpindahan kamar tidak mengubah histori. Modul kegiatan, Al-Quran, ekstra, reward, dan portfolio wajib menyimpan pasangan ID tahun ajaran dan semester yang valid. Rekap menggunakan periode data sumber. Keputusan periode input dan publikasi portfolio harus divalidasi di server.

## GitHub dan Vercel

1. Buat repository GitHub privat. Jika mulai dari ZIP, jalankan `git init -b main`, `git add .`, dan `git commit -m "Mulai My Nukhbah Tahap 1"`. Tambahkan URL remote repo pilihan Anda dan push.
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

## Modul berikutnya

Tahap 2 memulai master data dan periode akademik. Jurnal asrama, jurnal Al-Quran, ekstra, rekap Recharts, portfolio PDF, reward/pelanggaran, Mutamayyizun, kalender, dan pengingat WhatsApp mengikuti tahapan produk. Supabase Storage dan `@react-pdf/renderer` digunakan ketika upload dan PDF diimplementasikan.
