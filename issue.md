# Task: Implementasi Unit & Integration Testing Menyeluruh Menggunakan Bun Test

## 📌 Ringkasan Tugas
Menyusun dan mengimplementasikan rangkaian pengujian otomatis (**Unit & Integration Testing**) untuk **seluruh endpoint API** yang tersedia pada backend Bun + ElysiaJS + Drizzle ORM + PostgreSQL.

Pengujian harus dijalankan menggunakan **`bun test`** (test runner bawaan Bun), disimpan terstruktur di dalam folder `tests/`, serta menerapkan prinsip **Test Isolation**: data pada database harus dibersihkan sebelum setiap skenario dijalankan agar hasil pengujian konsisten, independen, dan dapat direproduksi kapan saja (*reproducible*).

Dokumen ini disusun sebagai panduan spesifikasi pengujian yang lengkap namun ringkas, agar dapat langsung dieksekusi oleh **junior programmer** maupun **AI model berbiaya hemat**.

---

## 1. Lingkungan & Struktur Folder Pengujian

Seluruh file pengujian ditempatkan pada folder `tests/` di root proyek dan dikelompokkan berdasarkan modul endpoint:

```text
tests/
├── helpers/
│   └── test-db.ts        # Helper koneksi & pembersihan database (cleanup)
├── health.test.ts        # Pengujian endpoint Root (/) dan Health Check (/health, /health/db)
├── auth.test.ts          # Pengujian endpoint Autentikasi & Sesi (/auth/register, /auth/login, /auth/me, /auth/logout)
└── users.test.ts         # Pengujian endpoint CRUD User (/users: POST, GET, PUT, DELETE)
```

### Konfigurasi Script di `package.json`
Pastikan script pengujian terdaftar di `package.json`:
```json
"scripts": {
  "test": "bun test",
  "test:watch": "bun test --watch"
}
```

---

## 2. Aturan Isolasi & Pembersihan Database (Database Cleanup)

Untuk menjaga konsistensi data antar-skenario:
1. **Pembersihan Sebelum Setiap Test**: Gunakan hook `beforeEach` (atau `beforeAll`) untuk menghapus seluruh data pada tabel relasional:
   - Hapus tabel anak terlebih dahulu: `sessions`
   - Kemudian hapus tabel induk: `users`
   - Hapus tabel monitoring: `health_checks`
2. **Kemandirian Skenario**: Setiap `it(...)` atau `test(...)` harus mandiri dan tidak boleh bergantung pada hasil data dari tes sebelumnya.
3. **Mekanisme Eksekusi Request**: Disarankan menggunakan metode bawaan Elysia `app.handle(new Request(...))` untuk performa pengujian yang sangat cepat dan tanpa ketergantungan pada port server yang sedang aktif.

---

## 3. Daftar Lengkap Skenario Pengujian per Endpoint

---

### A. Modul Health Check & Root (`tests/health.test.ts`)

#### 1. Endpoint `GET /` (Welcome API)
- [ ] **Skenario 1.1: Root endpoint mengembalikan informasi service**
  - **Ekspektasi**: Status code `200 OK`.
  - **Validasi**: Response memuat pesan sambutan, arsitektur Clean Architecture, dan daftar rute (`health`, `users`, `auth`).

#### 2. Endpoint `GET /health` (Service Health)
- [ ] **Skenario 2.1: Health check aplikasi berjalan lancar**
  - **Ekspektasi**: Status code `200 OK`.
  - **Validasi**: Response berformat `{ status: "OK", timestamp: "..." }`.

#### 3. Endpoint `GET /health/db` (Database Health)
- [ ] **Skenario 3.1: Koneksi database PostgreSQL aktif**
  - **Ekspektasi**: Status code `200 OK`.
  - **Validasi**: Response menyatakan status database sehat dan operasi simpan record health check di PostgreSQL berhasil.

---

### B. Modul Autentikasi & Session (`tests/auth.test.ts`)

#### 1. Endpoint `POST /auth/register` (Registrasi Akun)
- [ ] **Skenario 1.1: Registrasi user baru dengan data valid (Positive Case)**
  - **Input**: Nama, email valid, password minimal 6 karakter.
  - **Ekspektasi**: Status `201 Created`, payload mengembalikan `id`, `name`, `email`, `createdAt`, dan **TIDAK** memuat field `password`.
- [ ] **Skenario 1.2: Registrasi gagal karena email sudah terdaftar (Conflict)**
  - **Kondisi**: Email sudah pernah disimpan di DB.
  - **Ekspektasi**: Status `409 Conflict`, pesan error menyatakan email sudah terdaftar.
- [ ] **Skenario 1.3: Registrasi gagal karena nama melebihi 255 karakter (Boundary Test)**
  - **Input**: Nama sepanjang 300 karakter.
  - **Ekspektasi**: Status `400 Bad Request`, pesan validasi panjang nama maksimal 255 karakter.
- [ ] **Skenario 1.4: Registrasi gagal karena format email salah**
  - **Input**: Email tanpa domain valid (misal `user-invalid-email`).
  - **Ekspektasi**: Status `400 Bad Request`, pesan validasi format email.
- [ ] **Skenario 1.5: Registrasi gagal karena password kurang dari 6 karakter**
  - **Input**: Password hanya 3 karakter (`123`).
  - **Ekspektasi**: Status `400 Bad Request`, pesan validasi batas minimal password.
- [ ] **Skenario 1.6: Registrasi gagal saat field wajib kosong**
  - **Input**: Body kosong `{}` atau field bernilai string kosong.
  - **Ekspektasi**: Status `400 Bad Request`.

#### 2. Endpoint `POST /auth/login` (Login Pengguna)
- [ ] **Skenario 2.1: Login berhasil dengan kredensial yang cocok (Positive Case)**
  - **Input**: Email dan password yang sudah terdaftar.
  - **Ekspektasi**: Status `200 OK`, mengembalikan token JWT, data user, serta payload token berisi informasi user dan perangkat (`device`).
  - **Validasi Database**: Record sesi baru bertambah di tabel `sessions`.
- [ ] **Skenario 2.2: Login mendeteksi informasi perangkat dari header `User-Agent`**
  - **Input**: Menyertakan header `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)`.
  - **Ekspektasi**: Status `200 OK`, payload JWT memuat platform `"Windows"` dan userAgent yang sesuai.
- [ ] **Skenario 2.3: Login gagal karena password salah**
  - **Input**: Email benar, password salah.
  - **Ekspektasi**: Status `401 Unauthorized`, pesan kredensial tidak valid.
- [ ] **Skenario 2.4: Login gagal karena email belum terdaftar**
  - **Input**: Email yang tidak ada di database.
  - **Ekspektasi**: Status `401 Unauthorized`, pesan kredensial tidak valid.
- [ ] **Skenario 2.5: Login gagal saat email atau password tidak dikirim**
  - **Input**: Body `{}` atau password kosong.
  - **Ekspektasi**: Status `400 Bad Request` atau `401 Unauthorized`.

#### 3. Endpoint `GET /auth/me` (Cek Profil Sesi Aktif)
- [ ] **Skenario 3.1: Berhasil mengambil profil dengan token Bearer JWT yang valid**
  - **Input**: Header `Authorization: Bearer <valid_jwt_token>`.
  - **Ekspektasi**: Status `200 OK`, mengembalikan data profil pengguna pemilik token.
- [ ] **Skenario 3.2: Gagal jika request tidak menyertakan header Authorization**
  - **Ekspektasi**: Status `401 Unauthorized`, pesan token tidak ditemukan.
- [ ] **Skenario 3.3: Gagal jika token JWT rusak atau tanda tangan tidak valid**
  - **Input**: Header `Authorization: Bearer token_acak_rusak_123`.
  - **Ekspektasi**: Status `401 Unauthorized`.
- [ ] **Skenario 3.4: Gagal jika token JWT valid tetapi sesi sudah dicabut / dihapus dari database**
  - **Kondisi**: Sesi di tabel `sessions` dihapus manual atau sudah logout.
  - **Ekspektasi**: Status `401 Unauthorized`.

#### 4. Endpoint `DELETE /auth/logout` (Logout Sesi)
- [ ] **Skenario 4.1: Logout berhasil menghapus sesi dari database**
  - **Input**: Header `Authorization: Bearer <token_aktif>`.
  - **Ekspektasi**: Status `200 OK`, pesan konfirmasi logout berhasil.
  - **Validasi Lanjutan**: Panggilan berikutnya ke `GET /auth/me` dengan token yang sama harus ditolak (`401 Unauthorized`).
- [ ] **Skenario 4.2: Logout gagal jika tanpa menyertakan token**
  - **Ekspektasi**: Status `401 Unauthorized`.
- [ ] **Skenario 4.3: Logout gagal jika token sudah tidak ada di database**
  - **Input**: Token yang sudah pernah di-logout.
  - **Ekspektasi**: Status `404 Not Found` atau `401 Unauthorized`.

---

### C. Modul CRUD User (`tests/users.test.ts`)

#### 1. Endpoint `POST /users` (Create User)
- [ ] **Skenario 1.1: Pembuatan user baru berhasil**
  - **Ekspektasi**: Status `201 Created`, user tersimpan di DB, response tidak membocorkan hash password.
- [ ] **Skenario 1.2: Validasi batas panjang nama (maksimal 255 karakter)**
  - **Input**: Nama 300 karakter.
  - **Ekspektasi**: Status `400 Bad Request` dengan pesan error validasi yang jelas.
- [ ] **Skenario 1.3: Validasi batas panjang email (maksimal 150 karakter)**
  - **Input**: Email dengan panjang karakter > 150.
  - **Ekspektasi**: Status `400 Bad Request`.
- [ ] **Skenario 1.4: Mencegah pendaftaran email duplikat**
  - **Ekspektasi**: Status `409 Conflict`.

#### 2. Endpoint `GET /users` (Read All Users)
- [ ] **Skenario 2.1: Mengembalikan array kosong saat database belum memiliki data user**
  - **Ekspektasi**: Status `200 OK`, payload `data: []`.
- [ ] **Skenario 2.2: Mengembalikan seluruh daftar user yang ada**
  - **Kondisi**: Disiapkan 3 data user di DB.
  - **Ekspektasi**: Status `200 OK`, array berukuran 3, seluruh item bebas dari field password.

#### 3. Endpoint `GET /users/:id` (Read User by ID)
- [ ] **Skenario 3.1: Mengambil detail user berdasarkan ID yang valid**
  - **Ekspektasi**: Status `200 OK`, data sesuai dengan ID yang dicari.
- [ ] **Skenario 3.2: User tidak ditemukan**
  - **Input**: ID numerik acak yang tidak ada di DB (`/users/99999`).
  - **Ekspektasi**: Status `404 Not Found`.
- [ ] **Skenario 3.3: Parameter ID tidak valid (bukan integer)**
  - **Input**: `/users/invalid-id`.
  - **Ekspektasi**: Status `400 Bad Request`.

#### 4. Endpoint `PUT /users/:id` (Update User)
- [ ] **Skenario 4.1: Berhasil memperbarui nama user**
  - **Input**: `{ "name": "Nama Baru" }`.
  - **Ekspektasi**: Status `200 OK`, nama berubah di database.
- [ ] **Skenario 4.2: Berhasil memperbarui email ke alamat baru yang unik**
  - **Ekspektasi**: Status `200 OK`.
- [ ] **Skenario 4.3: Gagal memperbarui email jika email baru sudah dipakai user lain**
  - **Ekspektasi**: Status `409 Conflict`.
- [ ] **Skenario 4.4: Gagal jika nama yang diupdate melebihi 255 karakter**
  - **Input**: `{ "name": "A... (300 char)" }`.
  - **Ekspektasi**: Status `400 Bad Request`.
- [ ] **Skenario 4.5: Update password user berhasil dan di-hash ulang**
  - **Input**: Password baru minimal 6 karakter.
  - **Ekspektasi**: Status `200 OK`.
- [ ] **Skenario 4.6: Update pada user yang tidak ada di database**
  - **Input**: `/users/99999`.
  - **Ekspektasi**: Status `404 Not Found`.

#### 5. Endpoint `DELETE /users/:id` (Delete User)
- [ ] **Skenario 5.1: Berhasil menghapus akun user**
  - **Ekspektasi**: Status `200 OK`, record user terhapus dari DB.
- [ ] **Skenario 5.2: Relasi sesi otomatis terhapus (CASCADE)**
  - **Kondisi**: User memiliki sesi aktif di tabel `sessions`.
  - **Ekspektasi**: Saat user dihapus, sesi terkait di tabel `sessions` juga harus bersih terhapus.
- [ ] **Skenario 5.3: Gagal menghapus user yang ID-nya tidak terdaftar**
  - **Ekspektasi**: Status `404 Not Found`.
- [ ] **Skenario 5.4: Gagal saat parameter ID bukan angka**
  - **Ekspektasi**: Status `400 Bad Request`.

---

## 4. Panduan Eksekusi untuk Pengembang

1. **Jalankan Pengujian**:
   ```bash
   bun test
   ```
2. **Jalankan Pengujian Tertentu Saja**:
   ```bash
   bun test tests/auth.test.ts
   bun test tests/users.test.ts
   bun test tests/health.test.ts
   ```
3. **Format Asersi yang Disarankan**:
   Gunakan matcher standar `expect` dari `bun:test` seperti:
   - `expect(res.status).toBe(200)`
   - `expect(body.success).toBe(true)`
   - `expect(body.data.password).toBeUndefined()`

---

## 5. Kriteria Keberhasilan (Acceptance Criteria)

- [ ] Folder `tests/` tersedia dengan pengelompokan file pengujian yang rapi (`health.test.ts`, `auth.test.ts`, `users.test.ts`).
- [ ] Tersedia mekanisme cleanup database yang membersihkan tabel `sessions` dan `users` di setiap skenario tes.
- [ ] Seluruh skenario pengujian di atas telah terimplementasi dan lulus (**100% PASSING** saat dijalankan dengan `bun test`).
- [ ] Tidak ada tes yang bergantung pada urutan eksekusi (*order-independent*).
- [ ] Semua penanganan boundary case (nama > 255 karakter, format email salah, kredensial keliru, token rusak) teruji dengan status HTTP yang benar (400, 401, 404, 409).
- [ ] Password hash tidak pernah bocor pada respons API manapun yang diuji.
