# AI CLASSROOM — AI-Powered Learning Management System

Aplikasi Web modern berstandar EdTech software desktop untuk pengelolaan pembelajaran sekolah dengan dua peran utama: **Guru** dan **Siswa**, terintegrasi dengan **AI Adapter Layer (Multi-Provider)**.

---

## 🚀 Fitur Utama — Phase 1 (Completed)
- **Role-Based Authentication**:
  - Satu halaman login untuk seluruh pengguna.
  - Role otomatis terdeteksi dari akun (tanpa tab/pemilih peran manual pada login).
  - Guru diarahkan ke **Teacher Dashboard**, Siswa diarahkan ke **Student Dashboard**.
  - Password hashing dengan `bcryptjs` dan sesi aman berbasis `JSON Web Token (JWT)`.
  - Tombol pengisian cepat demo akun untuk pengujian instan.
  - Show/Hide Password interaktif.
- **Teacher Dashboard**:
  - Statistik Card: Jumlah Kelas, Jumlah Siswa, Jumlah LKPD, Tugas Aktif, Tugas Belum Diperiksa, Siswa Butuh Tindak Lanjut.
  - Daftar Kelas Binaan Aktif.
  - Feed Aktivitas Terbaru.
  - Pintasan Cepat (Buat LKPD AI, Terbitkan Tugas, Periksa Tugas, Pengaturan AI).
- **Student Dashboard**:
  - Statistik Card: Tugas Aktif, Tugas Selesai, Tugas Terlambat, Nilai Terbaru, Tindak Lanjut Aktif.
  - Daftar Tugas LKPD dengan status pengerjaan dan deadline.
  - Banner Tindak Lanjut Pembelajaran Aktif dengan indikator progres (0-100%).
  - Ulasan & feedback guru terakhir.
- **Backend Modular & Keamanan**:
  - REST API dengan Express.js.
  - Proteksi middleware `authenticateToken` dan `requireRole`.
  - Database file JSON dengan auto-seeding.
  - Password hash dan API key tidak pernah terekspos ke frontend.
- **AI Service Abstraction Foundation**:
  - `AiService` layer dengan dukungan multi-provider (`GeminiAdapter`, `OpenAIAdapter`, `OpenAICompatibleAdapter`).
  - Mendukung `MOCK_AI=true` untuk pengujian tanpa ketergantungan API key pihak ketiga.

---

## 🔑 Kredensial Akun Pengujian (Demo)

| Peran | Email | Kata Sandi | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Guru** | `guru@aiclassroom.sch.id` | `password123` | Budi Santoso, S.Pd. (Guru Kimia Kelas X-1) |
| **Siswa 1** | `siswa@aiclassroom.sch.id` | `password123` | Ahmad Fauzi (NIS 10241, Kelas X-1) |
| **Siswa 2** | `siti@aiclassroom.sch.id` | `password123` | Siti Nurhaliza (NIS 10242, Kelas X-1) |

---

## 🛠️ Cara Menjalankan Proyek

### 1. Masuk ke direktori proyek
```bash
cd /home/kholiqashidi/.gemini/antigravity/scratch/ai-classroom
```

### 2. Jalankan Pengujian Otomatis (Automated Tests)
```bash
npm test
```
*Memverifikasi 9 test case autentikasi, proteksi hak akses peran Guru & Siswa, serta integritas API.*

### 3. Jalankan Server Aplikasi
```bash
npm start
```
Server akan aktif di: **`http://localhost:3000`**

Buka peramban web Anda dan akses tautan di atas untuk menguji antarmuka langsung.

---

## 📂 Struktur Direktori Proyek
```text
ai-classroom/
├── package.json
├── .env.example
├── .env
├── README.md
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   └── components.css
│   ├── js/
│   │   ├── app.js
│   │   ├── state.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── views/
│   │       ├── loginView.js
│   │       ├── teacherDash.js
│   │       └── studentDash.js
│   └── assets/
├── backend/
│   ├── server.js
│   ├── config/config.js
│   ├── database/
│   │   ├── db.js
│   │   └── data.json
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── dashboardController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── dashboardRoutes.js
│   └── services/ai/
│       ├── AiService.js
│       ├── GeminiAdapter.js
│       ├── OpenAIAdapter.js
│       └── OpenAICompatibleAdapter.js
└── test/
    └── auth_test.js
```
