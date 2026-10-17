import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../src/app";
import { cleanDatabase, testDb } from "./helpers/test-db";
import { sessions } from "../src/infrastructure/db/schema";
import { eq } from "drizzle-orm";

/**
 * Suite pengujian untuk modul Autentikasi & Session.
 * Menguji endpoint: POST /auth/register, POST /auth/login, GET /auth/me, DELETE /auth/logout
 *
 * Setiap skenario dimulai dengan database bersih agar hasilnya konsisten & reproducible.
 */
describe("Authentication & Session Endpoints", () => {
  const app = createApp();

  // Data user valid yang digunakan pada berbagai skenario
  const VALID_USER = {
    name: "Budi Santoso",
    email: "budi@example.com",
    password: "password123",
  };

  /**
   * Helper: mendaftarkan user dan melakukan login, mengembalikan token JWT.
   */
  async function registerAndLogin(
    userData = VALID_USER,
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  ): Promise<{ token: string; userId: number }> {
    await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      })
    );

    const loginRes = await app.handle(
      new Request("http://localhost/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": userAgent,
        },
        body: JSON.stringify({ email: userData.email, password: userData.password }),
      })
    );
    const loginBody = await loginRes.json();
    return {
      token: loginBody.data.token,
      userId: loginBody.data.user.id,
    };
  }

  beforeEach(async () => {
    await cleanDatabase();
  });

  // =====================================================================
  // POST /auth/register
  // =====================================================================

  describe("POST /auth/register", () => {
    /**
     * Skenario 1.1: Registrasi user baru dengan data valid (Positive Case).
     * Ekspektasi: 201, berisi id/name/email/createdAt, TIDAK memuat password.
     */
    it("Skenario 1.1: should register new user successfully and not expose password", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(VALID_USER),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe(VALID_USER.name);
      expect(body.data.email).toBe(VALID_USER.email);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.password).toBeUndefined();
    });

    /**
     * Skenario 1.2: Registrasi gagal karena email sudah terdaftar (Conflict).
     * Ekspektasi: 409 Conflict.
     */
    it("Skenario 1.2: should return 409 Conflict when email already registered", async () => {
      // Registrasi pertama
      await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(VALID_USER),
        })
      );

      // Registrasi kedua dengan email yang sama
      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(VALID_USER),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 1.3: Registrasi gagal karena nama melebihi 255 karakter (Boundary Test).
     * Ekspektasi: 400 Bad Request, pesan validasi menyebut batas 255 karakter.
     */
    it("Skenario 1.3: should return 400 when name exceeds 255 characters", async () => {
      const longName = "A".repeat(300);
      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...VALID_USER, name: longName }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message.toLowerCase()).toContain("255");
    });

    /**
     * Skenario 1.4: Registrasi gagal karena format email salah.
     * Ekspektasi: 400 Bad Request.
     */
    it("Skenario 1.4: should return 400 when email format is invalid", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...VALID_USER, email: "user-invalid-email" }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 1.5: Registrasi gagal karena password kurang dari 6 karakter.
     * Ekspektasi: 400 Bad Request.
     */
    it("Skenario 1.5: should return 400 when password is shorter than 6 characters", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...VALID_USER, password: "123" }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 1.6: Registrasi gagal saat field wajib kosong.
     * Ekspektasi: 400 Bad Request.
     */
    it("Skenario 1.6: should return 400 when required fields are missing", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // =====================================================================
  // POST /auth/login
  // =====================================================================

  describe("POST /auth/login", () => {
    /**
     * Skenario 2.1: Login berhasil dengan kredensial yang cocok (Positive Case).
     * Ekspektasi: 200, token JWT, data user, payload berisi device.
     * Validasi database: record sesi baru bertambah di tabel sessions.
     */
    it("Skenario 2.1: should login successfully and persist session to database", async () => {
      await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(VALID_USER),
        })
      );

      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: VALID_USER.email, password: VALID_USER.password }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe(VALID_USER.email);
      expect(body.data.user.password).toBeUndefined();
      expect(body.data.payload).toBeDefined();
      expect(body.data.payload.userId).toBeDefined();

      // Validasi: sesi baru tersimpan di database
      const dbSessions = await testDb.select().from(sessions).where(
        eq(sessions.token, body.data.token)
      );
      expect(dbSessions.length).toBe(1);
    });

    /**
     * Skenario 2.2: Login mendeteksi informasi perangkat dari header User-Agent.
     * Ekspektasi: 200, payload JWT memuat platform "Windows" dari UA header Windows.
     */
    it("Skenario 2.2: should detect Windows platform from User-Agent header", async () => {
      await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(VALID_USER),
        })
      );

      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          },
          body: JSON.stringify({ email: VALID_USER.email, password: VALID_USER.password }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.payload.device).toBeDefined();
      expect(body.data.payload.device.platform).toBe("Windows");
      expect(body.data.payload.device.userAgent).toContain("Windows");
    });

    /**
     * Skenario 2.3: Login gagal karena password salah.
     * Ekspektasi: 401 Unauthorized.
     */
    it("Skenario 2.3: should return 401 when password is wrong", async () => {
      await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(VALID_USER),
        })
      );

      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: VALID_USER.email, password: "wrongpassword" }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 2.4: Login gagal karena email belum terdaftar.
     * Ekspektasi: 401 Unauthorized.
     */
    it("Skenario 2.4: should return 401 when email is not registered", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "notregistered@example.com", password: "password123" }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 2.5: Login gagal saat email atau password tidak dikirim.
     * Ekspektasi: 400 Bad Request.
     */
    it("Skenario 2.5: should return 400 when email or password is missing", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // =====================================================================
  // GET /auth/me
  // =====================================================================

  describe("GET /auth/me", () => {
    /**
     * Skenario 3.1: Berhasil mengambil profil dengan token Bearer JWT yang valid.
     * Ekspektasi: 200, data profil user pemilik token.
     */
    it("Skenario 3.1: should return user profile with valid Bearer token", async () => {
      const { token } = await registerAndLogin();

      const res = await app.handle(
        new Request("http://localhost/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(VALID_USER.email);
      expect(body.data.password).toBeUndefined();
    });

    /**
     * Skenario 3.2: Gagal jika request tidak menyertakan header Authorization.
     * Ekspektasi: 401 Unauthorized.
     */
    it("Skenario 3.2: should return 401 when Authorization header is missing", async () => {
      const res = await app.handle(new Request("http://localhost/auth/me"));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 3.3: Gagal jika token JWT rusak / tanda tangan tidak valid.
     * Ekspektasi: 401 Unauthorized.
     */
    it("Skenario 3.3: should return 401 when token signature is invalid", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/me", {
          headers: { Authorization: "Bearer token_acak_rusak_12345" },
        })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 3.4: Gagal jika token JWT valid tetapi sesi sudah dicabut / dihapus dari DB.
     * Ekspektasi: 401 Unauthorized.
     */
    it("Skenario 3.4: should return 401 when session is revoked from database", async () => {
      const { token } = await registerAndLogin();

      // Hapus sesi manual dari database (simulasi revoke)
      await testDb.delete(sessions).where(eq(sessions.token, token));

      const res = await app.handle(
        new Request("http://localhost/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });
  });

  // =====================================================================
  // DELETE /auth/logout
  // =====================================================================

  describe("DELETE /auth/logout", () => {
    /**
     * Skenario 4.1: Logout berhasil menghapus sesi dari database.
     * Validasi lanjutan: /auth/me dengan token yang sama harus 401 Unauthorized.
     */
    it("Skenario 4.1: should logout successfully and revoke session", async () => {
      const { token } = await registerAndLogin();

      const logoutRes = await app.handle(
        new Request("http://localhost/auth/logout", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const logoutBody = await logoutRes.json();

      expect(logoutRes.status).toBe(200);
      expect(logoutBody.success).toBe(true);

      // Validasi lanjutan: token lama tidak boleh bisa digunakan
      const meRes = await app.handle(
        new Request("http://localhost/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(meRes.status).toBe(401);
    });

    /**
     * Skenario 4.2: Logout gagal jika tanpa menyertakan token.
     * Ekspektasi: 401 Unauthorized.
     */
    it("Skenario 4.2: should return 401 when no token is provided", async () => {
      const res = await app.handle(
        new Request("http://localhost/auth/logout", { method: "DELETE" })
      );
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 4.3: Logout gagal jika token sudah tidak ada di database (sudah pernah logout).
     * Ekspektasi: 404 Not Found.
     */
    it("Skenario 4.3: should return 404 when token is already logged out", async () => {
      const { token } = await registerAndLogin();

      // Logout pertama
      await app.handle(
        new Request("http://localhost/auth/logout", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      // Logout kedua dengan token yang sama
      const res = await app.handle(
        new Request("http://localhost/auth/logout", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });
});
