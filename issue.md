# Task: Implementasi Fitur Autentikasi, Tabel Sessions & Registrasi User (CRUD) dengan Clean Architecture

## 📌 Ringkasan Tugas
Mengimplementasikan modul **Sessions & Autentikasi (Fitur Login/Logout)** serta memastikan integrasi **Registrasi User (CRUD)** pada backend Bun + ElysiaJS + Drizzle ORM menggunakan prinsip **Clean Architecture**.

Tugas ini dirancang secara terstruktur dan terperinci agar dapat langsung dieksekusi dengan mudah dan tanpa ambiguitas oleh **junior programmer** maupun **AI model berbiaya hemat (cost-effective AI)**.

Tugas ini mencakup:
1. Pembuatan tabel `sessions` di PostgreSQL dengan Drizzle ORM dan relasi foreign key ke tabel `users`.
2. Pembuatan endpoint autentikasi: **Register**, **Login**, **Get Profile / Check Session (`me`)**, dan **Logout**.
3. Pemeliharaan dan integrasi endpoint **Registration User (CRUD)** yang sudah ada agar terhubung rapi ke sistem sesi.
4. Pemisahan kode yang ketat sesuai layer Clean Architecture (Domain, Use Case, Infrastructure, Interface/Delivery).
5. Format respon seragam menggunakan helper standar (`ApiResponse`: success & error).
6. Penggunaan fitur bawaan Bun: hashing dan verifikasi password menggunakan `Bun.password` (bcrypt) dan pembuatan token login menggunakan `crypto.randomUUID()`.

---

## 1. Spesifikasi Database & Skema Tabel `sessions`

File target: `src/infrastructure/db/schema.ts`

Tabel `sessions` harus ditambahkan dengan relasi Foreign Key ke tabel `users` yang sudah ada.

### A. Definisi Kolom Tabel `sessions`

| Nama Kolom   | Tipe Data Drizzle ORM                                                   | Constraint / Spesifikasi                         | Keterangan                                          |
|--------------|-------------------------------------------------------------------------|--------------------------------------------------|-----------------------------------------------------|
| `id`         | `serial("id")`                                                          | `.primaryKey()`                                  | Integer, auto increment, primary key                |
| `token`      | `varchar("token", { length: 255 })`                                     | `.notNull().unique()`                            | String token UUID untuk identifikasi sesi login     |
| `user_id`    | `integer("user_id")`                                                    | `.notNull().references(() => users.id, { onDelete: "cascade" })` | Foreign Key mengarah ke kolom `id` pada tabel `users` |
| `created_at` | `timestamp("created_at")`                                               | `.defaultNow().notNull()`                        | Timestamp saat sesi dibuat, default `now()`         |

### B. Kode Skema Target di `src/infrastructure/db/schema.ts`

```typescript
import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  status: text("status").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

> ⚠️ **Catatan Migrasi**: Setelah memperbarui file skema, sinkronisasikan database dengan menjalankan perintah:
> ```bash
> bun run db:push
> ```

---

## 2. Standar Response API (Format Seragam)

Seluruh endpoint wajib menggunakan helper `src/shared/api-response.ts` agar struktur payload JSON konsisten:

### A. Format Sukses (Success Response)
```json
{
  "success": true,
  "message": "Pesan keberhasilan operasi",
  "data": { ... }
}
```

### B. Format Gagal (Error Response)
```json
{
  "success": false,
  "message": "Pesan alasan kegagalan",
  "error": "Detail informasi error (opsional)"
}
```

### C. Pemetaan HTTP Status Code

| Skenario / Kondisi                                  | HTTP Status Code              | Keterangan                                          |
|-----------------------------------------------------|-------------------------------|-----------------------------------------------------|
| Registrasi user baru berhasil (`POST /auth/register`)| **201 Created**               | Mengembalikan data user yang dibuat (tanpa password)|
| Login berhasil & session terbentuk (`POST /auth/login`)| **201 Created** / **200 OK** | Mengembalikan `token` sesi UUID dan data user       |
| Mengambil data sesi profil aktif (`GET /auth/me`)   | **200 OK**                    | Mengembalikan data profil user berdasarkan token    |
| Logout berhasil (`DELETE /auth/logout`)             | **200 OK**                    | Menghapus session dari database                     |
| Operasi CRUD User berhasil                          | **200 OK** / **201 Created**  | Sesuai standar CRUD                                 |
| Request body tidak lengkap / format salah           | **400 Bad Request**           | Validasi input gagal                                |
| Kredensial login salah (email/password keliru)      | **401 Unauthorized**          | Autentikasi gagal                                   |
| Token sesi tidak ada atau tidak valid               | **401 Unauthorized**          | Sesi tidak dikenali atau sudah logout               |
| User / Session tidak ditemukan                      | **404 Not Found**             | Data ID tidak ditemukan                            |
| Email duplikat saat registrasi                      | **409 Conflict**              | Email sudah terdaftar                               |
| Terjadi unhandled error pada server                 | **500 Internal Server Error** | Kesalahan sistem / database                         |

---

## 3. Daftar Endpoint API

### A. Modul Autentikasi & Sesi (`/auth`)

| Method   | Endpoint        | Header                           | Body                                            | Deskripsi                                                                                     | Status Sukses |
|----------|-----------------|----------------------------------|-------------------------------------------------|-----------------------------------------------------------------------------------------------|---------------|
| `POST`   | `/auth/register`| `Content-Type: application/json` | `{ "name": "...", "email": "...", "password": "..." }` | Mendaftarkan pengguna baru (hash bcrypt)                                                      | 201 Created   |
| `POST`   | `/auth/login`   | `Content-Type: application/json` | `{ "email": "...", "password": "..." }`         | Verifikasi user, buat token sesi UUID via `crypto.randomUUID()`, simpan ke tabel `sessions`    | 200 OK        |
| `GET`    | `/auth/me`      | `Authorization: Bearer <token>`  | None                                            | Mengambil profil user yang sedang aktif berdasarkan token sesi                               | 200 OK        |
| `DELETE` | `/auth/logout`  | `Authorization: Bearer <token>`  | None                                            | Menghapus record session dari database sehingga token tidak bisa digunakan lagi               | 200 OK        |

### B. Modul User CRUD (`/users`)

| Method   | Endpoint     | Body / Params                                   | Deskripsi                                                     | Status Sukses |
|----------|--------------|-------------------------------------------------|---------------------------------------------------------------|---------------|
| `POST`   | `/users`     | Body: `{ "name": "...", "email": "...", "password": "..." }` | Registrasi / Tambah user baru (CRUD)                          | 201 Created   |
| `GET`    | `/users`     | None                                            | Mengambil seluruh daftar pengguna                             | 200 OK        |
| `GET`    | `/users/:id` | Params: `id` (integer)                          | Mengambil detail data user berdasarkan ID                     | 200 OK        |
| `PUT`    | `/users/:id` | Params: `id`, Body: `{ name?, email?, password? }` | Memperbarui informasi user                                   | 200 OK        |
| `DELETE` | `/users/:id` | Params: `id` (integer)                          | Menghapus data user (relasi session akan terhapus via CASCADE)| 200 OK        |

> 🔒 **Aturan Keamanan**:
> 1. Field `password` (baik hash maupun plain) **HARAM** dikembalikan dalam payload response manapun.
> 2. Verifikasi password login wajib menggunakan `await Bun.password.verify(plainPassword, user.password)`.
> 3. Token sesi dibangkitkan menggunakan native Web Crypto: `crypto.randomUUID()`.

---

## 4. Struktur Folder & Penamaan File (Clean Architecture)

Seluruh file diletakkan sesuai layer Clean Architecture berikut:

```text
src/
├── domain/                                      # LAYER 1: Core Domain (Entities & Abstraksi Repository)
│   ├── entities/
│   │   ├── health.entity.ts
│   │   ├── user.entity.ts                       # Entity User, UserResponse, CreateUserDto, UpdateUserDto
│   │   └── session.entity.ts                    # [BARU] Entity Session, LoginDto, AuthResponse, SessionWithUser
│   └── repositories/
│       ├── health.repository.interface.ts
│       ├── user.repository.interface.ts         # Kontrak IUserRepository (CRUD User)
│       └── session.repository.interface.ts      # [BARU] Kontrak ISessionRepository (CRUD & Lookup Session)
│
├── use-cases/                                   # LAYER 2: Application Business Rules (Service / Use Cases)
│   ├── get-health.use-case.ts
│   ├── user-service.ts                          # Business logic CRUD User & registrasi
│   └── auth-service.ts                          # [BARU] Business logic login, logout, me, validasi password bcrypt & UUID session
│
├── infrastructure/                              # LAYER 4: Frameworks, Drivers & External Tools
│   ├── db/
│   │   ├── index.ts                             # Inisialisasi koneksi Postgres Drizzle
│   │   └── schema.ts                            # Definisi tabel: users, sessions, healthChecks
│   └── repositories/
│       ├── drizzle-health.repository.ts
│       ├── drizzle-user.repository.ts           # Implementasi Drizzle untuk User
│       └── drizzle-session.repository.ts        # [BARU] Implementasi Drizzle untuk Session (CRUD database)
│
├── interfaces/                                  # LAYER 3: Delivery Mechanism (Controller & Router HTTP)
│   ├── controllers/
│   │   ├── health.controller.ts
│   │   ├── user.controller.ts                   # HTTP Controller untuk /users CRUD
│   │   └── auth.controller.ts                   # [BARU] HTTP Controller untuk /auth (login, register, logout, me)
│   └── routes/
│       ├── health.routes.ts
│       ├── users-route.ts                       # Routing ElysiaJS untuk /users
│       └── auth.routes.ts                       # [BARU] Routing ElysiaJS untuk /auth
│
├── shared/                                      # Utilities lintas layer
│   └── api-response.ts                          # Helper successResponse & errorResponse
│
└── index.ts                                     # Composition Root: Dependency Injection & Server Startup
```

---

## 5. Panduan Implementasi Langkah demi Langkah (Step-by-Step)

Ikuti langkah-langkah di bawah ini secara berurutan:

---

### Langkah 1: Tambahkan Tabel `sessions` di `src/infrastructure/db/schema.ts`

Buka `src/infrastructure/db/schema.ts` dan pastikan tabel `sessions` didefinisikan seperti berikut:

```typescript
import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

// Tabel users (yang sudah ada)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// [TAMBAHKAN INI] Tabel sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Kemudian jalankan sinkronisasi database di terminal:
```bash
bun run db:push
```

---

### Langkah 2: Buat Entity & DTO Session di `src/domain/entities/session.entity.ts`

Buat file baru `src/domain/entities/session.entity.ts`:

```typescript
import type { UserResponse } from "./user.entity";

export interface Session {
  id: number;
  token: string;
  userId: number;
  createdAt: Date;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface SessionWithUser {
  session: Session;
  user: UserResponse;
}
```

---

### Langkah 3: Buat Kontrak Repository Session di `src/domain/repositories/session.repository.interface.ts`

Buat file baru `src/domain/repositories/session.repository.interface.ts`:

```typescript
import type { Session, SessionWithUser } from "../entities/session.entity";

export interface ISessionRepository {
  create(data: { token: string; userId: number }): Promise<Session>;
  findByToken(token: string): Promise<Session | null>;
  findSessionWithUserByToken(token: string): Promise<SessionWithUser | null>;
  deleteByToken(token: string): Promise<boolean>;
  deleteByUserId(userId: number): Promise<boolean>;
}
```

---

### Langkah 4: Buat Implementasi Drizzle Repository Session di `src/infrastructure/repositories/drizzle-session.repository.ts`

Buat file baru `src/infrastructure/repositories/drizzle-session.repository.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import type { ISessionRepository } from "../../domain/repositories/session.repository.interface";
import type { Session, SessionWithUser } from "../../domain/entities/session.entity";

export class DrizzleSessionRepository implements ISessionRepository {
  async create(data: { token: string; userId: number }): Promise<Session> {
    const [result] = await db
      .insert(sessions)
      .values({
        token: data.token,
        userId: data.userId,
      })
      .returning();
    return result as Session;
  }

  async findByToken(token: string): Promise<Session | null> {
    const [result] = await db.select().from(sessions).where(eq(sessions.token, token));
    return (result as Session) || null;
  }

  async findSessionWithUserByToken(token: string): Promise<SessionWithUser | null> {
    const rows = await db
      .select({
        sessionId: sessions.id,
        sessionToken: sessions.token,
        sessionUserId: sessions.userId,
        sessionCreatedAt: sessions.createdAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userCreatedAt: users.createdAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, token));

    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    return {
      session: {
        id: row.sessionId,
        token: row.sessionToken,
        userId: row.sessionUserId,
        createdAt: row.sessionCreatedAt,
      },
      user: {
        id: row.userId,
        name: row.userName,
        email: row.userEmail,
        createdAt: row.userCreatedAt,
      },
    };
  }

  async deleteByToken(token: string): Promise<boolean> {
    const [deleted] = await db
      .delete(sessions)
      .where(eq(sessions.token, token))
      .returning();
    return !!deleted;
  }

  async deleteByUserId(userId: number): Promise<boolean> {
    const deleted = await db
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning();
    return deleted.length > 0;
  }
}
```

---

### Langkah 5: Buat Logika Bisnis di `src/use-cases/auth-service.ts`

Buat file baru `src/use-cases/auth-service.ts`:

```typescript
import type { IUserRepository } from "../domain/repositories/user.repository.interface";
import type { ISessionRepository } from "../domain/repositories/session.repository.interface";
import type { CreateUserDto, UserResponse } from "../domain/entities/user.entity";
import type { AuthResponse, LoginDto } from "../domain/entities/session.entity";

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository
  ) {}

  async register(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }

    const hashedPassword = await Bun.password.hash(dto.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const isPasswordValid = await Bun.password.verify(dto.password, user.password);
    if (!isPasswordValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    // Generate token UUID v4
    const token = crypto.randomUUID();

    await this.sessionRepo.create({
      token,
      userId: user.id,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  async getCurrentUser(token: string): Promise<UserResponse | null> {
    const sessionWithUser = await this.sessionRepo.findSessionWithUserByToken(token);
    if (!sessionWithUser) return null;
    return sessionWithUser.user;
  }

  async logout(token: string): Promise<boolean> {
    return await this.sessionRepo.deleteByToken(token);
  }
}
```

---

### Langkah 6: Buat Auth Controller di `src/interfaces/controllers/auth.controller.ts`

Buat file baru `src/interfaces/controllers/auth.controller.ts`:

```typescript
import type { AuthService } from "../../use-cases/auth-service";
import { successResponse, errorResponse } from "../../shared/api-response";
import type { CreateUserDto } from "../../domain/entities/user.entity";
import type { LoginDto } from "../../domain/entities/session.entity";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractBearerToken(headers: Record<string, string | undefined>): string | null {
    const authHeader = headers["authorization"] || headers["Authorization"];
    if (!authHeader) return null;
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return parts[1];
    }
    return null;
  }

  async register({ body, set }: { body: CreateUserDto; set: any }) {
    try {
      if (!body || !body.name || !body.email || !body.password) {
        set.status = 400;
        return errorResponse("Missing required fields: name, email, and password are required");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        set.status = 400;
        return errorResponse("Invalid email format");
      }

      const user = await this.authService.register(body);
      set.status = 201;
      return successResponse("User registration successful", user);
    } catch (err: any) {
      if (err.message === "EMAIL_EXISTS") {
        set.status = 409;
        return errorResponse("Email is already registered");
      }
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }

  async login({ body, set }: { body: LoginDto; set: any }) {
    try {
      if (!body || !body.email || !body.password) {
        set.status = 400;
        return errorResponse("Email and password are required");
      }

      const result = await this.authService.login(body);
      set.status = 200;
      return successResponse("Login successful", result);
    } catch (err: any) {
      if (err.message === "INVALID_CREDENTIALS") {
        set.status = 401;
        return errorResponse("Invalid email or password");
      }
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }

  async me({ headers, set }: { headers: Record<string, string | undefined>; set: any }) {
    try {
      const token = this.extractBearerToken(headers);
      if (!token) {
        set.status = 401;
        return errorResponse("Unauthorized: Missing or invalid Bearer token");
      }

      const user = await this.authService.getCurrentUser(token);
      if (!user) {
        set.status = 401;
        return errorResponse("Unauthorized: Session is invalid or has expired");
      }

      set.status = 200;
      return successResponse("Active session profile retrieved", user);
    } catch (err: any) {
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }

  async logout({ headers, set }: { headers: Record<string, string | undefined>; set: any }) {
    try {
      const token = this.extractBearerToken(headers);
      if (!token) {
        set.status = 401;
        return errorResponse("Unauthorized: Missing or invalid Bearer token");
      }

      const deleted = await this.authService.logout(token);
      if (!deleted) {
        set.status = 404;
        return errorResponse("Session not found or already logged out");
      }

      set.status = 200;
      return successResponse("Logout successful");
    } catch (err: any) {
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }
}
```

---

### Langkah 7: Buat Route ElysiaJS di `src/interfaces/routes/auth.routes.ts`

Buat file baru `src/interfaces/routes/auth.routes.ts`:

```typescript
import { Elysia } from "elysia";
import { AuthController } from "../controllers/auth.controller";

export const createAuthRoutes = (controller: AuthController) => {
  return new Elysia({ prefix: "/auth" })
    .post("/register", (ctx) => controller.register(ctx as any))
    .post("/login", (ctx) => controller.login(ctx as any))
    .get("/me", (ctx) => controller.me(ctx as any))
    .delete("/logout", (ctx) => controller.logout(ctx as any));
};
```

---

### Langkah 8: Hubungkan Dependency Injection di `src/index.ts`

Buka file `src/index.ts` dan hubungkan repository, service, controller, dan router baru:

```typescript
import { Elysia } from "elysia";
import { DrizzleHealthRepository } from "./infrastructure/repositories/drizzle-health.repository";
import { GetHealthUseCase } from "./use-cases/get-health.use-case";
import { HealthController } from "./interfaces/controllers/health.controller";
import { createHealthRoutes } from "./interfaces/routes/health.routes";

import { DrizzleUserRepository } from "./infrastructure/repositories/drizzle-user.repository";
import { UserService } from "./use-cases/user-service";
import { UserController } from "./interfaces/controllers/user.controller";
import { createUsersRoute } from "./interfaces/routes/users-route";

// [TAMBAHKAN IMPORT BERIKUT]
import { DrizzleSessionRepository } from "./infrastructure/repositories/drizzle-session.repository";
import { AuthService } from "./use-cases/auth-service";
import { AuthController } from "./interfaces/controllers/auth.controller";
import { createAuthRoutes } from "./interfaces/routes/auth.routes";

// 1. Inisialisasi Infrastructure (Repositories)
const healthRepo = new DrizzleHealthRepository();
const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository(); // [BARU]

// 2. Inisialisasi Use Case / Services
const getHealthUseCase = new GetHealthUseCase(healthRepo);
const userService = new UserService(userRepo);
const authService = new AuthService(userRepo, sessionRepo); // [BARU]

// 3. Inisialisasi Presentation (Controllers)
const healthController = new HealthController(getHealthUseCase);
const userController = new UserController(userService);
const authController = new AuthController(authService); // [BARU]

// 4. Inisialisasi Web Server ElysiaJS
const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .get("/", () => ({
    message: "Welcome to Vibe Coding API (Bun + Elysia + Drizzle + PostgreSQL)!",
    architecture: "Clean Architecture",
    endpoints: {
      health: "/health",
      healthDb: "/health/db",
      users: "/users",
      auth: {
        register: "POST /auth/register",
        login: "POST /auth/login",
        me: "GET /auth/me",
        logout: "DELETE /auth/logout",
      },
    },
  }))
  .use(createHealthRoutes(healthController))
  .use(createUsersRoute(userController))
  .use(createAuthRoutes(authController)) // [BARU]
  .listen(port);

console.log(`🦊 Elysia server running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
```

---

## 6. Panduan Pengujian & Contoh Request (cURL)

Setelah server berjalan (`bun run dev`), jalankan skenario pengujian berikut secara urut di terminal:

### 1. Registrasi User Baru (`POST /auth/register`)
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Budi Santoso\",\"email\":\"budi@example.com\",\"password\":\"Rahasia12345\"}"
```
*Expected Status*: **201 Created**
*Expected Body*:
```json
{
  "success": true,
  "message": "User registration successful",
  "data": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "createdAt": "..."
  }
}
```

---

### 2. Login User (`POST /auth/login`)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"budi@example.com\",\"password\":\"Rahasia12345\"}"
```
*Expected Status*: **200 OK**
*Expected Body*:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "user": {
      "id": 1,
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "createdAt": "..."
    }
  }
}
```
> Simpan nilai token UUID di atas untuk pengujian langkah berikutnya.

---

### 3. Cek Profil Session Aktif (`GET /auth/me`)
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer 3fa85f64-5717-4562-b3fc-2c963f66afa6"
```
*Expected Status*: **200 OK**
*Expected Body*:
```json
{
  "success": true,
  "message": "Active session profile retrieved",
  "data": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "createdAt": "..."
  }
}
```

---

### 4. Logout User (`DELETE /auth/logout`)
```bash
curl -X DELETE http://localhost:3000/auth/logout \
  -H "Authorization: Bearer 3fa85f64-5717-4562-b3fc-2c963f66afa6"
```
*Expected Status*: **200 OK**
*Expected Body*:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 5. Verifikasi Akses Setelah Logout (`GET /auth/me`)
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer 3fa85f64-5717-4562-b3fc-2c963f66afa6"
```
*Expected Status*: **401 Unauthorized**
*Expected Body*:
```json
{
  "success": false,
  "message": "Unauthorized: Session is invalid or has expired"
}
```

---

### 6. Pengujian Skenario Error Lainnya:
- **Password Salah Saat Login**:
  Kirim `POST /auth/login` dengan password salah -> Status **401 Unauthorized** (`"Invalid email or password"`).
- **Email Belum Terdaftar**:
  Kirim `POST /auth/login` dengan email tidak terdaftar -> Status **401 Unauthorized** (`"Invalid email or password"`).
- **Email Duplikat Saat Registrasi**:
  Kirim `POST /auth/register` dengan email yang sudah ada -> Status **409 Conflict** (`"Email is already registered"`).
- **Request Tanpa Bearer Token**:
  Akses `GET /auth/me` tanpa header `Authorization` -> Status **401 Unauthorized** (`"Unauthorized: Missing or invalid Bearer token"`).

---

## 7. Kriteria Keberhasilan (Acceptance Criteria)

Junior programmer atau AI yang mengimplementasikan tugas ini harus memastikan semua checklist berikut terpenuhi:

- [ ] **Skema Database**:
  - [ ] Tabel `sessions` dibuat dengan kolom: `id` (serial PK), `token` (varchar 255 unique not null), `user_id` (integer not null FK ke `users.id` with onDelete CASCADE), `created_at` (timestamp default now not null).
  - [ ] Migrasi / sinkronisasi sukses dijalankan menggunakan `bun run db:push`.
- [ ] **Clean Architecture & Penamaan**:
  - [ ] Domain Layer: `src/domain/entities/session.entity.ts` dan `src/domain/repositories/session.repository.interface.ts`.
  - [ ] Infrastructure Layer: `src/infrastructure/repositories/drizzle-session.repository.ts`.
  - [ ] Use Case Layer: `src/use-cases/auth-service.ts`.
  - [ ] Interface Layer: `src/interfaces/controllers/auth.controller.ts` dan `src/interfaces/routes/auth.routes.ts`.
  - [ ] Entry Point: Instance di-wire melalui Dependency Injection di `src/index.ts`.
- [ ] **Logika Keamanan**:
  - [ ] Token login di-generate menggunakan `crypto.randomUUID()` (UUID v4 valid).
  - [ ] Password diverifikasi menggunakan `await Bun.password.verify(...)`.
  - [ ] Field password **TIDAK PERNAH** bocor/tampil pada payload response apa pun.
- [ ] **Format Respons API**:
  - [ ] Semua endpoint mengembalikan format standar JSON `{ success, message, data }` atau `{ success, message, error }`.
  - [ ] HTTP status codes akurat (200, 201, 400, 401, 404, 409, 500).
- [ ] **Fungsionalitas Endpoint**:
  - [ ] `POST /auth/register` berhasil mendaftarkan user baru dengan password ter-hash bcrypt.
  - [ ] `POST /auth/login` berhasil menghasilkan token session baru yang tersimpan di PostgreSQL.
  - [ ] `GET /auth/me` berhasil mengambil data user dari token yang valid di header `Authorization: Bearer <token>`.
  - [ ] `DELETE /auth/logout` berhasil menghapus record session dari database.
  - [ ] Endpoint CRUD `/users` tetap berjalan normal dan terintegrasi baik dengan skema baru.
