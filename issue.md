# Task: Inisialisasi Project Backend (Bun + ElysiaJS + Drizzle + PostgreSQL) dengan Clean Architecture

## Ringkasan Proyek
Inisialisasi backend application di root folder menggunakan runtime **Bun**, framework **ElysiaJS**, ORM **Drizzle**, serta database **PostgreSQL** via **Docker Compose**.

Struktur kode mengadopsi prinsip **Clean Architecture** (pemisahan domain, use cases, presentation/interfaces, dan infrastructure) agar mudah di-scale dan di-maintain. Pada setiap folder arsitektur, wajib disertakan file dokumentasi berformat **`namafolder.txt`** yang menjelaskan peran dan tanggung jawab folder tersebut.

Dokumen ini disusun sebagai panduan implementasi tingkat tinggi (high-level) untuk dieksekusi oleh programmer atau AI coding assistant.

---

## 1. Spesifikasi Tech Stack
- **Runtime & Package Manager**: [Bun](https://bun.sh)
- **Web Framework**: [ElysiaJS](https://elysiajs.com)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team) & `drizzle-kit`
- **Database Driver**: `postgres` (PostgreSQL client kompatibel dengan Bun)
- **Database Engine**: PostgreSQL (via Docker Compose)

---

## 2. Struktur Folder & Aturan Clean Architecture

Setiap folder di bawah `src/` harus memiliki file **`namafolder.txt`** (nama file disesuaikan dengan nama foldernya, contoh: `domain.txt`, `use-cases.txt`) yang berisi ringkasan fungsi, batasan, dan tanggung jawab folder tersebut.

```text
.
├── docker-compose.yml
├── .env
├── .env.example
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                     # Entry point server ElysiaJS
│   │
│   ├── domain/                      # Layer 1: Core Enterprise / Domain Entities
│   │   ├── domain.txt               # Dokumentasi peran folder domain
│   │   ├── entities/                # Model data & entity bisnis murni
│   │   │   └── entities.txt
│   │   └── repositories/            # Interface / kontrak repository (abstraksi)
│   │       └── repositories.txt
│   │
│   ├── use-cases/                   # Layer 2: Application Business Rules
│   │   ├── use-cases.txt            # Dokumentasi peran folder use-cases
│   │   └── ...                      # Orchestrasi flow bisnis & interaksi repo interface
│   │
│   ├── interfaces/                  # Layer 3: Presentation & Delivery (API / HTTP)
│   │   ├── interfaces.txt           # Dokumentasi peran folder interfaces
│   │   ├── controllers/             # Handler request/response
│   │   │   └── controllers.txt
│   │   └── routes/                  # Definisi route ElysiaJS
│   │       └── routes.txt
│   │
│   ├── infrastructure/              # Layer 4: Frameworks, Drivers, DB & External Tools
│   │   ├── infrastructure.txt       # Dokumentasi peran folder infrastructure
│   │   ├── db/                      # Koneksi Drizzle & skema database konkret
│   │   │   └── db.txt
│   │   └── repositories/            # Implementasi konkret dari interface repository
│   │       └── repositories.txt
│   │
│   └── shared/                      # Utility, constants, & shared types umum
│       └── shared.txt
└── README.md
```

### Panduan Isi `namafolder.txt`:
Setiap file `namafolder.txt` harus memuat deskripsi ringkas (3-15 baris) yang menjelaskan:
1. **Fungsi utama** folder tersebut.
2. **Ketergantungan (Dependency Rule)**: folder mana yang boleh atau tidak boleh di-import dari sini (misal: layer `domain` tidak boleh mengimpor layer luar seperti `infrastructure` atau `interfaces`).

---

## 3. Rencana Implementasi Bertahap (High-Level)

### Langkah 1: Setup Docker Compose (PostgreSQL)
- Buat file `docker-compose.yml` untuk menjalankan PostgreSQL:
  - **Service**: `postgres` (image: `postgres:16-alpine` atau versi stabil).
  - **Container Name**: `vibe-coding-postgres`.
  - **Database Name (`POSTGRES_DB`)**: `vibe_coding_db`.
  - **Password (`POSTGRES_PASSWORD`)**: `Rahasia12345`.
  - **User (`POSTGRES_USER`)**: `postgres`.
  - **Port**: `5432:5432`.
  - **Volume**: Named volume untuk data persistence.

### Langkah 2: Inisialisasi Project Bun & Dependensi
- Jalankan inisialisasi package manager Bun di root project (`bun init`).
- Install dependensi runtime:
  - `elysia`
  - `drizzle-orm`
  - `postgres`
- Install dependensi development:
  - `drizzle-kit`
  - `@types/bun`

### Langkah 3: Setup Environment Configuration
- Buat file `.env` dan `.env.example`:
  - `DATABASE_URL=postgres://postgres:Rahasia12345@localhost:5432/vibe_coding_db`
  - `PORT=3000`

### Langkah 4: Pembuatan Struktur Clean Architecture & File `namafolder.txt`
- Buat folder-folder sesuai hierarki Clean Architecture (`domain`, `use-cases`, `interfaces`, `infrastructure`, `shared`).
- Buat file `namafolder.txt` di setiap folder sesuai ketentuan struktur.

### Langkah 5: Setup Infrastructure & Database (Drizzle ORM)
- Buat konfigurasi `drizzle.config.ts`.
- Di dalam `src/infrastructure/db/`:
  - Buat instance client database (`index.ts`).
  - Buat definisi schema/tabel awal (`schema.ts`).
- Tambahkan script migrasi pada `package.json` (`db:generate`, `db:migrate` / `db:push`).

### Langkah 6: Implementasi Alur Contoh (Clean Architecture Flow)
- **Domain**: Buat entity sederhana dan interface repository (misal: health check status atau user).
- **Infrastructure**: Buat implementasi konkret dari interface repository tersebut menggunakan Drizzle.
- **Use Cases**: Buat use case sederhana yang mengeksekusi method repository.
- **Interfaces**: Buat controller dan route ElysiaJS yang memanggil use case.
- **Entry Point (`src/index.ts`)**: Inisialisasi app Elysia, daftarkan route, dan jalankan server pada port yang dikonfigurasi.

---

## 4. Kriteria Keberhasilan (Acceptance Criteria)
- [ ] Container PostgreSQL berjalan via `docker compose up -d` dengan database `vibe_coding_db` dan password `Rahasia12345`.
- [ ] Struktur folder Clean Architecture (`domain`, `use-cases`, `interfaces`, `infrastructure`, `shared`) terbentuk lengkap.
- [ ] Setiap folder memiliki file `namafolder.txt` dengan penjelasan peran arsitektur dan aturan dependency yang jelas.
- [ ] Project Bun terpasang dengan dependensi `elysia`, `drizzle-orm`, `postgres`, dan `drizzle-kit`.
- [ ] Server ElysiaJS berjalan sukses (`bun run dev` atau `bun src/index.ts`).
- [ ] Endpoint HTTP (misalnya `GET /health` atau `GET /`) mengembalikan respon sukses dan membuktikan koneksi aktif ke PostgreSQL melalui Drizzle dengan pola Clean Architecture.
