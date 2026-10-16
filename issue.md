# Task: Implementasi Fitur CRUD User Lengkap dengan Clean Architecture & Format Response Terstandar

## 📌 Ringkasan Tugas
Mengimplementasikan modul **User** lengkap dengan fungsionalitas **CRUD (Create, Read, Update, Delete)** pada aplikasi backend Bun + ElysiaJS + Drizzle ORM menggunakan prinsip **Clean Architecture**.

Tugas ini mencakup:
1. Pembaruan skema tabel `users` di PostgreSQL.
2. Keamanan penyimpanan password menggunakan hashing **bcrypt**.
3. Penyusunan format respons standar (Standard API Response) untuk kondisi **Success** maupun **Error**.
4. Pembagian layer kode yang rapi (Domain, Use Case / Service, Interface / Route & Controller, Infrastructure).
5. Dokumentasi langkah implementasi yang presisi agar dapat langsung dieksekusi oleh programmer junior maupun AI model dengan biaya komputasi hemat.

---

## 1. Spesifikasi Database & Skema Tabel `users`

File target: `src/infrastructure/db/schema.ts`

Tabel `users` harus didefinisikan menggunakan tipe data dari `drizzle-orm/pg-core` dengan spesifikasi:

| Kolom        | Tipe Drizzle ORM                       | Constraint / Spesifikasi              | Keterangan                                       |
|--------------|----------------------------------------|---------------------------------------|--------------------------------------------------|
| `id`         | `serial("id")`                         | `.primaryKey()`                       | Integer, auto increment, primary key             |
| `name`       | `varchar("name", { length: 255 })`     | `.notNull()`                          | Nama pengguna, maks 255 karakter                 |
| `email`      | `varchar("email", { length: 150 })`    | `.notNull().unique()`                 | Email unik pengguna, maks 150 karakter           |
| `password`   | `varchar("password", { length: 255 })` | `.notNull()`                          | Password hash string dari bcrypt (bukan plain)   |
| `created_at` | `timestamp("created_at")`              | `.defaultNow().notNull()`             | Timestamp waktu dibuat, default `now()`          |

> ⚠️ **Aturan Bcrypt**: Password yang disimpan ke database **WAJIB di-hash** menggunakan bcrypt. Pada runtime **Bun**, gunakan fungsi bawaan tanpa dependensi tambahan:
> ```typescript
> const hashedPassword = await Bun.password.hash(password, {
>   algorithm: "bcrypt",
>   cost: 10,
> });
> ```

---

## 2. Standar Response API (Success & Error)

Agar respons API konsisten dan mudah dipahami oleh frontend/client, semua endpoint harus mengembalikan format standar JSON berikut:

### A. Format Sukses (Success Response)
```json
{
  "success": true,
  "message": "Operasi berhasil dilakukan",
  "data": { ... } // Atau array [...] jika mengambil daftar data
}
```

### B. Format Gagal (Error Response)
```json
{
  "success": false,
  "message": "Pesan ringkas mengenai kegagalan",
  "error": "Detail alasan error atau validasi (opsional)"
}
```

### C. Pemetaan HTTP Status Code
| Operasi / Kondisi                          | HTTP Status Code | Catatan                                            |
|--------------------------------------------|------------------|----------------------------------------------------|
| `POST /users` (Berhasil dibuat)            | **201 Created**  | Mengembalikan data user yang dibuat (tanpa password)|
| `GET /users` & `GET /users/:id` (Berhasil) | **200 OK**       | Mengembalikan data list / detail user              |
| `PUT /users/:id` (Berhasil diupdate)       | **200 OK**       | Mengembalikan data user setelah diupdate           |
| `DELETE /users/:id` (Berhasil dihapus)     | **200 OK**       | Mengembalikan konfirmasi penghapusan               |
| Input tidak valid / field kosong           | **400 Bad Request** | Validasi input gagal                            |
| User tidak ditemukan                       | **404 Not Found**| ID user tidak ada di database                      |
| Email duplikat                             | **409 Conflict** | Email sudah digunakan oleh user lain               |
| Kesalahan server internal                  | **500 Internal Server Error** | Exception yang tidak terduga        |

---

## 3. Daftar Endpoint Fitur User (CRUD)

| Method   | Endpoint       | Fungsi                                   | Body / Parameter                                   | Status Sukses |
|----------|----------------|------------------------------------------|----------------------------------------------------|---------------|
| `POST`   | `/users`       | Membuat user baru (Create)               | Body: `{ name, email, password }`                  | 201 Created   |
| `GET`    | `/users`       | Mengambil semua data user (Read All)     | None                                               | 200 OK        |
| `GET`    | `/users/:id`   | Mengambil detail user berdasarkan ID     | Params: `id` (integer)                             | 200 OK        |
| `PUT`    | `/users/:id`   | Memperbarui data user (Update)           | Params: `id`, Body: `{ name?, email?, password? }` | 200 OK        |
| `DELETE` | `/users/:id`   | Menghapus user berdasarkan ID (Delete)   | Params: `id` (integer)                             | 200 OK        |

> 🔒 **Keamanan Penting**: Field `password` (baik plaintext maupun hash) **TIDAK BOLEH** dikembalikan pada payload `data` di semua response `GET`, `POST`, maupun `PUT`.

---

## 4. Struktur Folder & Penamaan File (Clean Architecture)

Letakkan file pada struktur direktori berikut:

```text
src/
├── domain/                                # Layer 1: Core Domain (Entity & Kontrak Repository)
│   ├── entities/
│   │   └── user.entity.ts                 # Type/interface Entity User, DTOs, dan Sanitized Response
│   └── repositories/
│       └── user.repository.interface.ts  # Interface abstraksi repository User (CRUD)
│
├── use-cases/                             # Layer 2: Application Business Rules
│   └── user-service.ts                    # Logika bisnis CRUD, hashing bcrypt, validasi email
│
├── infrastructure/                        # Layer 4: Frameworks & Database Driver
│   ├── db/
│   │   └── schema.ts                      # Definisi skema tabel users Drizzle
│   └── repositories/
│       └── drizzle-user.repository.ts     # Implementasi IUserRepository menggunakan Drizzle ORM
│
├── interfaces/                            # Layer 3: Delivery / HTTP API
│   ├── controllers/
│   │   └── user.controller.ts             # Controller pengatur request, response format, & HTTP status
│   └── routes/
│       └── users-route.ts                 # Definisi route ElysiaJS untuk endpoint CRUD
│
├── shared/                                # Layer Pendukung Lintas Layer
│   └── api-response.ts                    # Helper pembentuk standar response JSON (success & error)
│
└── index.ts                               # Entry Point: Dependency Injection & inisialisasi server
```

---

## 5. Tahapan Implementasi Terperinci (Step-by-Step)

### Langkah 1: Update Skema Database Drizzle & Migrasi
1. Buka file `src/infrastructure/db/schema.ts`.
2. Perbarui definisi tabel `users`:
   ```typescript
   import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

   export const users = pgTable("users", {
     id: serial("id").primaryKey(),
     name: varchar("name", { length: 255 }).notNull(),
     email: varchar("email", { length: 150 }).notNull().unique(),
     password: varchar("password", { length: 255 }).notNull(),
     createdAt: timestamp("created_at").defaultNow().notNull(),
   });
   ```
3. Sinkronisasikan skema dengan database:
   ```bash
   bun run db:push
   ```

---

### Langkah 2: Buat Helper Response Terstandar
Buat file baru: `src/shared/api-response.ts`
1. Definisikan antarmuka dan fungsi pembantu:
   ```typescript
   export interface ApiResponse<T = any> {
     success: boolean;
     message: string;
     data?: T;
     error?: any;
   }

   export const successResponse = <T>(message: string, data?: T): ApiResponse<T> => ({
     success: true,
     message,
     data,
   });

   export const errorResponse = (message: string, error?: any): ApiResponse => ({
     success: false,
     message,
     error,
   });
   ```

---

### Langkah 3: Buat Domain Entity & DTO
Buat file baru: `src/domain/entities/user.entity.ts`
1. Entity inti:
   ```typescript
   export interface User {
     id: number;
     name: string;
     email: string;
     password: string;
     createdAt: Date;
   }

   export interface UserResponse {
     id: number;
     name: string;
     email: string;
     createdAt: Date;
   }

   export interface CreateUserDto {
     name: string;
     email: string;
     password: string;
   }

   export interface UpdateUserDto {
     name?: string;
     email?: string;
     password?: string;
   }
   ```

---

### Langkah 4: Buat Repository Interface
Buat file baru: `src/domain/repositories/user.repository.interface.ts`
1. Definisikan method CRUD:
   ```typescript
   import type { User } from "../entities/user.entity";

   export interface IUserRepository {
     create(data: Omit<User, "id" | "createdAt">): Promise<User>;
     findAll(): Promise<User[]>;
     findById(id: number): Promise<User | null>;
     findByEmail(email: string): Promise<User | null>;
     update(id: number, data: Partial<Omit<User, "id" | "createdAt">>): Promise<User | null>;
     delete(id: number): Promise<boolean>;
   }
   ```

---

### Langkah 5: Implementasikan Drizzle Repository
Buat file baru: `src/infrastructure/repositories/drizzle-user.repository.ts`
1. Implementasikan kelas `DrizzleUserRepository` yang mengimplementasikan `IUserRepository`.
2. Gunakan query Drizzle ORM (`eq` dari `drizzle-orm`):
   - `create`: `await db.insert(users).values(data).returning()`
   - `findAll`: `await db.select().from(users)`
   - `findById`: `await db.select().from(users).where(eq(users.id, id))`
   - `findByEmail`: `await db.select().from(users).where(eq(users.email, email))`
   - `update`: `await db.update(users).set(data).where(eq(users.id, id)).returning()`
   - `delete`: `await db.delete(users).where(eq(users.id, id)).returning()`

---

### Langkah 6: Buat Logika Bisnis di `user-service.ts`
Buat file baru: `src/use-cases/user-service.ts`
1. Inject `IUserRepository` via constructor.
2. Implementasikan logika:
   - **`createUser(dto: CreateUserDto): Promise<UserResponse>`**:
     - Cek apakah email sudah ada (`findByEmail`). Jika ya, lempar error `EMAIL_EXISTS`.
     - Hash password: `await Bun.password.hash(dto.password, { algorithm: "bcrypt", cost: 10 })`.
     - Simpan dan return `UserResponse` (tanpa field password).
   - **`getAllUsers(): Promise<UserResponse[]>`**:
     - Ambil semua user dan petakan hasilnya tanpa field `password`.
   - **`getUserById(id: number): Promise<UserResponse | null>`**:
     - Ambil user berdasarkan id, jika ada return `UserResponse`, jika tidak return `null`.
   - **`updateUser(id: number, dto: UpdateUserDto): Promise<UserResponse | null>`**:
     - Cek keberadaan user. Jika tidak ada, return `null`.
     - Jika `email` diubah, pastikan email baru belum digunakan user lain.
     - Jika `password` diubah, lakukan hash ulang dengan bcrypt.
     - Simpan pembaruan dan return `UserResponse`.
   - **`deleteUser(id: number): Promise<boolean>`**:
     - Cek keberadaan user, lalu hapus. Return `true` jika sukses, atau `false` jika tidak ditemukan.

---

### Langkah 7: Buat Controller
Buat file baru: `src/interfaces/controllers/user.controller.ts`
1. Inject `UserService` via constructor.
2. Tangani request, set status HTTP, dan gunakan helper respons:
   - `createUser({ body, set })`:
     - Validasi field `name`, `email`, `password`. Bila kosong, `set.status = 400`, kembalikan `errorResponse(...)`.
     - Panggil `userService.createUser(...)`.
     - Bila berhasil: `set.status = 201`, kembalikan `successResponse("User successfully created", user)`.
     - Tangani error email duplikat: `set.status = 409`, kembalikan `errorResponse("Email is already registered")`.
   - `getAllUsers({ set })`:
     - `set.status = 200`, kembalikan `successResponse("Users retrieved successfully", users)`.
   - `getUserById({ params, set })`:
     - Parse ID `Number(params.id)`. Jika tidak valid `set.status = 400`.
     - Jika tidak ditemukan: `set.status = 404`, kembalikan `errorResponse("User not found")`.
     - Jika ditemukan: `set.status = 200`, kembalikan `successResponse("User retrieved successfully", user)`.
   - `updateUser({ params, body, set })`:
     - Jika user tidak ditemukan: `set.status = 404`.
     - Jika email konflik: `set.status = 409`.
     - Jika berhasil: `set.status = 200`, kembalikan `successResponse("User updated successfully", updatedUser)`.
   - `deleteUser({ params, set })`:
     - Jika tidak ditemukan: `set.status = 404`, kembalikan `errorResponse("User not found")`.
     - Jika berhasil: `set.status = 200`, kembalikan `successResponse("User deleted successfully")`.

---

### Langkah 8: Buat Route ElysiaJS
Buat file baru: `src/interfaces/routes/users-route.ts`
1. Definisikan route menggunakan Elysia:
   ```typescript
   import { Elysia } from "elysia";
   import { UserController } from "../controllers/user.controller";

   export const createUsersRoute = (controller: UserController) => {
     return new Elysia({ prefix: "/users" })
       .post("/", (ctx) => controller.createUser(ctx))
       .get("/", (ctx) => controller.getAllUsers(ctx))
       .get("/:id", (ctx) => controller.getUserById(ctx))
       .put("/:id", (ctx) => controller.updateUser(ctx))
       .delete("/:id", (ctx) => controller.deleteUser(ctx));
   };
   ```

---

### Langkah 9: Integrasi & Wiring di `src/index.ts`
Buka file `src/index.ts`:
1. Inisialisasi instance secara Dependency Injection:
   ```typescript
   const userRepo = new DrizzleUserRepository();
   const userService = new UserService(userRepo);
   const userController = new UserController(userService);
   ```
2. Daftarkan router user ke app Elysia:
   ```typescript
   app.use(createUsersRoute(userController))
   ```
3. Update daftar endpoint di root route `GET /`.

---

## 6. Panduan Pengujian & Contoh Request (cURL)

Setelah server berjalan (`bun run dev`), lakukan pengujian berikut:

### 1. Create User (POST /users)
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ahmad Fauzi\",\"email\":\"ahmad@example.com\",\"password\":\"Rahasia12345\"}"
```
*Expected: 201 Created dengan JSON `{ "success": true, "message": "...", "data": { "id": 1, ... } }` tanpa field password.*

### 2. Read All Users (GET /users)
```bash
curl -X GET http://localhost:3000/users
```
*Expected: 200 OK dengan list user di `data`.*

### 3. Read User Detail (GET /users/:id)
```bash
curl -X GET http://localhost:3000/users/1
```
*Expected: 200 OK dengan detail user tunggal.*

### 4. Update User (PUT /users/:id)
```bash
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ahmad Fauzi Updated\"}"
```
*Expected: 200 OK dengan data terupdate.*

### 5. Delete User (DELETE /users/:id)
```bash
curl -X DELETE http://localhost:3000/users/1
```
*Expected: 200 OK dengan pesan sukses penghapusan.*

### 6. Pengujian Error:
- **Email Duplikat**: Kirim `POST /users` dengan email yang sama -> Status **409 Conflict**.
- **User Not Found**: Akses `GET /users/9999` -> Status **404 Not Found**.
- **Bad Request**: Kirim `POST /users` tanpa field `password` -> Status **400 Bad Request**.

---

## 7. Kriteria Keberhasilan (Acceptance Criteria)

- [ ] Kolom tabel `users` di Postgres sesuai spesifikasi: `id` (serial PK), `name` (varchar 255), `email` (varchar 150 unique), `password` (varchar 255), dan `created_at` (timestamp default now).
- [ ] Berhasil sync database via `bun run db:push`.
- [ ] Password tersimpan di database sebagai hash bcrypt (bukan plain text).
- [ ] Format respon konsisten: semua endpoint mengembalikan struktur `{ success, message, data }` atau `{ success, message, error }`.
- [ ] Status code HTTP akurat (200, 201, 400, 404, 409, 500).
- [ ] Password tidak pernah dikembalikan ke client pada respon HTTP mana pun.
- [ ] Semua 5 endpoint CRUD (`POST /users`, `GET /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`) berfungsi dengan baik.
- [ ] File terstruktur rapi sesuai Clean Architecture tanpa pelanggaran dependency rule.
