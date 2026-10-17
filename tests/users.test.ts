import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../src/app";
import { cleanDatabase, testDb } from "./helpers/test-db";
import { sessions } from "../src/infrastructure/db/schema";
import { eq } from "drizzle-orm";

/**
 * Suite pengujian untuk modul CRUD User.
 * Menguji endpoint: POST /users, GET /users, GET /users/:id, PUT /users/:id, DELETE /users/:id
 *
 * Setiap skenario dimulai dengan database bersih agar hasilnya konsisten & reproducible.
 */
describe("User CRUD Endpoints", () => {
  const app = createApp();

  // Payload user valid yang dipakai di berbagai skenario
  const USER_A = {
    name: "Alice Johnson",
    email: "alice@example.com",
    password: "secret123",
  };

  const USER_B = {
    name: "Bob Smith",
    email: "bob@example.com",
    password: "secret456",
  };

  const USER_C = {
    name: "Charlie Brown",
    email: "charlie@example.com",
    password: "secret789",
  };

  /**
   * Helper: membuat user baru melalui POST /users dan mengembalikan response.
   */
  async function createUser(data: { name: string; email: string; password: string }) {
    const res = await app.handle(
      new Request("http://localhost/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    );
    return { res, body: await res.json() };
  }

  beforeEach(async () => {
    await cleanDatabase();
  });

  // =====================================================================
  // POST /users — Create User
  // =====================================================================

  describe("POST /users", () => {
    /**
     * Skenario 1.1: Pembuatan user baru berhasil.
     * Ekspektasi: 201 Created, user tersimpan di DB, response TIDAK bocorkan hash password.
     */
    it("Skenario 1.1: should create new user successfully without exposing password", async () => {
      const { res, body } = await createUser(USER_A);

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe(USER_A.name);
      expect(body.data.email).toBe(USER_A.email);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.password).toBeUndefined();
    });

    /**
     * Skenario 1.2: Validasi batas panjang nama (maksimal 255 karakter).
     * Ekspektasi: 400 Bad Request dengan pesan validasi yang jelas menyebut 255 karakter.
     */
    it("Skenario 1.2: should return 400 when name exceeds 255 characters", async () => {
      const { res, body } = await createUser({ ...USER_A, name: "N".repeat(300) });

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message.toLowerCase()).toContain("255");
    });

    /**
     * Skenario 1.3: Validasi batas panjang email (maksimal 150 karakter).
     * Ekspektasi: 400 Bad Request.
     */
    it("Skenario 1.3: should return 400 when email exceeds 150 characters", async () => {
      const longEmail = "a".repeat(146) + "@b.co"; // 151 chars — melebihi batas 150
      const { res, body } = await createUser({ ...USER_A, email: longEmail });

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 1.4: Mencegah pendaftaran email duplikat.
     * Ekspektasi: 409 Conflict pada percobaan kedua.
     */
    it("Skenario 1.4: should return 409 Conflict when email is duplicated", async () => {
      await createUser(USER_A);
      const { res, body } = await createUser(USER_A);

      expect(res.status).toBe(409);
      expect(body.success).toBe(false);
    });
  });

  // =====================================================================
  // GET /users — Read All Users
  // =====================================================================

  describe("GET /users", () => {
    /**
     * Skenario 2.1: Mengembalikan array kosong saat DB belum memiliki data user.
     * Ekspektasi: 200 OK, payload data: [].
     */
    it("Skenario 2.1: should return empty array when no users exist", async () => {
      const res = await app.handle(new Request("http://localhost/users"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(0);
    });

    /**
     * Skenario 2.2: Mengembalikan seluruh daftar user yang ada.
     * Kondisi: Disiapkan 3 data user di DB.
     * Ekspektasi: 200 OK, array berukuran 3, seluruh item bebas dari field password.
     */
    it("Skenario 2.2: should return all users without password field", async () => {
      await createUser(USER_A);
      await createUser(USER_B);
      await createUser(USER_C);

      const res = await app.handle(new Request("http://localhost/users"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(3);

      // Pastikan tidak ada field password pada setiap user
      for (const user of body.data) {
        expect(user.password).toBeUndefined();
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
      }
    });
  });

  // =====================================================================
  // GET /users/:id — Read User by ID
  // =====================================================================

  describe("GET /users/:id", () => {
    /**
     * Skenario 3.1: Mengambil detail user berdasarkan ID yang valid.
     * Ekspektasi: 200 OK, data sesuai dengan ID yang dicari.
     */
    it("Skenario 3.1: should return user details by valid ID", async () => {
      const { body: created } = await createUser(USER_A);
      const userId = created.data.id;

      const res = await app.handle(new Request(`http://localhost/users/${userId}`));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(userId);
      expect(body.data.email).toBe(USER_A.email);
      expect(body.data.password).toBeUndefined();
    });

    /**
     * Skenario 3.2: User tidak ditemukan karena ID tidak ada di DB.
     * Ekspektasi: 404 Not Found.
     */
    it("Skenario 3.2: should return 404 when user ID does not exist", async () => {
      const res = await app.handle(new Request("http://localhost/users/99999"));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 3.3: Parameter ID tidak valid (bukan integer).
     * Ekspektasi: 400 Bad Request.
     */
    it("Skenario 3.3: should return 400 when ID parameter is not a valid integer", async () => {
      const res = await app.handle(new Request("http://localhost/users/invalid-id"));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  // =====================================================================
  // PUT /users/:id — Update User
  // =====================================================================

  describe("PUT /users/:id", () => {
    /**
     * Skenario 4.1: Berhasil memperbarui nama user.
     * Ekspektasi: 200 OK, nama berubah di response.
     */
    it("Skenario 4.1: should update user name successfully", async () => {
      const { body: created } = await createUser(USER_A);
      const userId = created.data.id;

      const res = await app.handle(
        new Request(`http://localhost/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice Updated" }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Alice Updated");
    });

    /**
     * Skenario 4.2: Berhasil memperbarui email ke alamat baru yang unik.
     * Ekspektasi: 200 OK, email berubah.
     */
    it("Skenario 4.2: should update email to a new unique address", async () => {
      const { body: created } = await createUser(USER_A);
      const userId = created.data.id;

      const res = await app.handle(
        new Request(`http://localhost/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "alice_new@example.com" }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe("alice_new@example.com");
    });

    /**
     * Skenario 4.3: Gagal memperbarui email jika email baru sudah dipakai user lain.
     * Ekspektasi: 409 Conflict.
     */
    it("Skenario 4.3: should return 409 when new email is already used by another user", async () => {
      const { body: a } = await createUser(USER_A);
      await createUser(USER_B);
      const userAId = a.data.id;

      const res = await app.handle(
        new Request(`http://localhost/users/${userAId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: USER_B.email }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 4.4: Gagal jika nama yang diupdate melebihi 255 karakter.
     * Ekspektasi: 400 Bad Request.
     */
    it("Skenario 4.4: should return 400 when updated name exceeds 255 characters", async () => {
      const { body: created } = await createUser(USER_A);
      const userId = created.data.id;

      const res = await app.handle(
        new Request(`http://localhost/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "A".repeat(300) }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 4.5: Update password user berhasil dan di-hash ulang.
     * Ekspektasi: 200 OK. Login dengan password baru setelah update harus berhasil.
     */
    it("Skenario 4.5: should update password and allow login with new password", async () => {
      const { body: created } = await createUser(USER_A);
      const userId = created.data.id;

      // Update password
      const updateRes = await app.handle(
        new Request(`http://localhost/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "newpassword999" }),
        })
      );
      expect(updateRes.status).toBe(200);

      // Login dengan password baru harus berhasil
      const loginRes = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: USER_A.email, password: "newpassword999" }),
        })
      );
      expect(loginRes.status).toBe(200);
    });

    /**
     * Skenario 4.6: Update pada user yang tidak ada di database.
     * Ekspektasi: 404 Not Found.
     */
    it("Skenario 4.6: should return 404 when updating non-existent user", async () => {
      const res = await app.handle(
        new Request("http://localhost/users/99999", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Ghost User" }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  // =====================================================================
  // DELETE /users/:id — Delete User
  // =====================================================================

  describe("DELETE /users/:id", () => {
    /**
     * Skenario 5.1: Berhasil menghapus akun user.
     * Ekspektasi: 200 OK, GET by ID berikutnya mengembalikan 404.
     */
    it("Skenario 5.1: should delete user successfully", async () => {
      const { body: created } = await createUser(USER_A);
      const userId = created.data.id;

      const deleteRes = await app.handle(
        new Request(`http://localhost/users/${userId}`, { method: "DELETE" })
      );
      const deleteBody = await deleteRes.json();

      expect(deleteRes.status).toBe(200);
      expect(deleteBody.success).toBe(true);

      // Pastikan user sudah tidak ada
      const getRes = await app.handle(new Request(`http://localhost/users/${userId}`));
      expect(getRes.status).toBe(404);
    });

    /**
     * Skenario 5.2: Relasi sesi otomatis terhapus (CASCADE).
     * Kondisi: User memiliki sesi aktif di tabel sessions.
     * Ekspektasi: Saat user dihapus, sesi terkait di tabel sessions juga ikut terhapus.
     */
    it("Skenario 5.2: should cascade delete all sessions when user is deleted", async () => {
      // Register user melalui auth endpoint
      const regRes = await app.handle(
        new Request("http://localhost/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(USER_A),
        })
      );
      const regBody = await regRes.json();
      const userId = regBody.data.id;

      // Login untuk membuat sesi aktif
      const loginRes = await app.handle(
        new Request("http://localhost/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: USER_A.email, password: USER_A.password }),
        })
      );
      const loginBody = await loginRes.json();
      const token = loginBody.data.token;

      // Verifikasi sesi ada di DB sebelum delete
      const sessionsBeforeDelete = await testDb
        .select()
        .from(sessions)
        .where(eq(sessions.token, token));
      expect(sessionsBeforeDelete.length).toBe(1);

      // Hapus user
      await app.handle(
        new Request(`http://localhost/users/${userId}`, { method: "DELETE" })
      );

      // Verifikasi sesi ikut terhapus (CASCADE)
      const sessionsAfterDelete = await testDb
        .select()
        .from(sessions)
        .where(eq(sessions.token, token));
      expect(sessionsAfterDelete.length).toBe(0);
    });

    /**
     * Skenario 5.3: Gagal menghapus user yang ID-nya tidak terdaftar.
     * Ekspektasi: 404 Not Found.
     */
    it("Skenario 5.3: should return 404 when deleting non-existent user", async () => {
      const res = await app.handle(
        new Request("http://localhost/users/99999", { method: "DELETE" })
      );
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
    });

    /**
     * Skenario 5.4: Gagal saat parameter ID bukan angka.
     * Ekspektasi: 400 Bad Request.
     */
    it("Skenario 5.4: should return 400 when ID parameter is not a number", async () => {
      const res = await app.handle(
        new Request("http://localhost/users/not-a-number", { method: "DELETE" })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });
});
