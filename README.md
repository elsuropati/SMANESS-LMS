# AI CLASSROOM (SMANESS LMS)

LMS berbasis AI untuk **Admin sekolah, Guru, dan Siswa**. Guru membuat LKPD (aktivitas, soal pilihan ganda/uraian, refleksi, tautan materi/video/Lab Maya), menugaskan ke kelas, lalu menilai. Siswa mengerjakan LKPD yang sama persis dan melihat nilai serta umpan balik.

## Alur
1. **Admin** membuat akun guru (menu *Kelola Akun Guru*).
2. **Guru** membuat kelas dan siswa (manual / impor), membuat LKPD di *LKPD Builder* (boleh dibantu AI), lalu *Tugaskan ke Kelas*.
3. **Siswa** (login `NIS@aiclassroom.sch.id`, kata sandi bawaan) membuka *Tugas Saya*, mengerjakan, dan mengumpulkan.
4. **Guru** memeriksa di *Penilaian* (jawaban berpasangan dengan soal, kunci PG otomatis, rekomendasi AI opsional), menilai, atau mengembalikan untuk revisi.
5. Nilai, umpan balik, dan kunci jawaban langsung tampil di sisi siswa; laporan dan ekspor CSV mengikuti data nyata.

## Menjalankan lokal
```bash
npm install
cp .env.example .env     # isi JWT_SECRET bila NODE_ENV=production
npm test                 # uji alur lengkap guru ⇄ siswa
npm start                # http://localhost:3000
```
Login awal: `ADMIN_EMAIL` / `ADMIN_PASSWORD` dari `.env` (bawaan `admin@aiclassroom.sch.id` / `password123` — **segera ganti** lewat klik nama di pojok kanan atas → Akun Saya).

## Deploy (WAJIB baca)
Server menyimpan data sebagai satu dokumen JSON. Di Render/Vercel/Netlify disk bersifat sementara, jadi **tanpa database cloud semua data hilang saat restart/redeploy**. Isi salah satu variabel berikut:

| Variabel | Layanan |
|---|---|
| `MONGODB_URI` | MongoDB Atlas (gratis, disarankan) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis |
| `JSONBIN_BIN_ID` + `JSONBIN_API_KEY` | JSONBin |

Variabel penting lain: `NODE_ENV=production`, `JWT_SECRET` (acak, min. 16 karakter — server menolak start tanpanya), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GEMINI_API_KEY` (opsional; atau tiap guru mengisi API key di *Pengaturan AI*), `MOCK_AI=false`.

- **Render**: hubungkan repo, `render.yaml` sudah siap; isi `MONGODB_URI` dan `ADMIN_PASSWORD` di dashboard.
- **Vercel**: impor repo (`vercel.json` sudah diatur), isi env di atas.
- **Netlify**: impor repo (`netlify.toml` sudah diatur), isi env di atas.
- Cek `GET /api/system/info` → `persistent: true` berarti data aman.

Catatan: ukuran data satu dokumen cocok untuk puluhan kelas; untuk sekolah sangat besar pertimbangkan migrasi ke tabel database terpisah.

## Keamanan
Kata sandi bcrypt, JWT, batas percobaan login, akses per peran dan per pemilik (guru hanya melihat kelas/LKPD/tugas/nilai miliknya), kunci jawaban tidak dikirim ke siswa sebelum dinilai, seluruh teks pengguna di-escape (anti XSS), ekspor CSV anti formula-injection, API key AI tiap guru terpisah dan tidak pernah dikirim balik utuh.

---

## Panduan Deploy Netlify + MongoDB Atlas (gratis)

### A. Database (MongoDB Atlas)
1. Daftar di https://www.mongodb.com/cloud/atlas → **Create** cluster gratis (M0).
2. **Database Access** → Add New Database User → buat username & password (catat).
3. **Network Access** → Add IP Address → **Allow access from anywhere (0.0.0.0/0)** (Netlify memakai IP dinamis).
4. **Database → Connect → Drivers** → salin connection string, contoh:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/smaness?retryWrites=true&w=majority`
   (ganti `USER`/`PASSWORD`; jika password mengandung karakter khusus, encode URL).

### B. Hosting (Netlify)
1. Upload isi folder ini ke repository GitHub (jangan unggah `node_modules` dan `.env`).
2. Netlify → **Add new site → Import an existing project** → pilih repo. Build settings otomatis dari `netlify.toml`.
3. **Site configuration → Environment variables**, tambahkan:
   | Key | Isi |
   |---|---|
   | `MONGODB_URI` | connection string dari langkah A |
   | `JWT_SECRET` | teks acak ≥ 32 karakter |
   | `ADMIN_PASSWORD` | password admin Anda |
   | `NODE_ENV` | `production` |
   | `GEMINI_API_KEY` | (opsional) bisa juga diisi guru lewat menu Pengaturan AI |
4. **Deploy site**. Setelah selesai buka `https://NAMA-SITE.netlify.app/api/system/info` — `persistent` harus `true`.
5. Login admin: `admin@aiclassroom.sch.id` + `ADMIN_PASSWORD`. Buat guru → guru membuat kelas & siswa.

> Ganti environment variable → lakukan **Trigger deploy** agar berlaku.
> Fungsi Netlify gratis dibatasi ±10 detik; pembuatan LKPD oleh AI memakai model "flash" agar cepat.

### C. Pengaturan Gemini
Menu **Pengaturan AI** → provider Gemini → tempel API Key → daftar model otomatis muncul di dropdown → pilih → **Simpan**.
