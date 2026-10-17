import { Elysia } from "elysia";
import { AuthController } from "../controllers/auth.controller";

/**
 * Factory function untuk membuat kumpulan rute (routes) autentikasi pada ElysiaJS.
 * Seluruh endpoint didaftarkan dengan prefix `/auth`.
 *
 * Daftar Rute:
 * - POST   /auth/register : Mendaftarkan akun user baru (hash password bcrypt)
 * - POST   /auth/login    : Login akun & membuat token sesi baru (UUID v4)
 * - GET    /auth/me       : Mengambil profil user aktif berdasarkan Bearer token
 * - DELETE /auth/logout   : Menghapus sesi aktif (logout)
 *
 * @param controller Instance AuthController yang mengelola setiap request
 * @returns Plugin Elysia yang siap di-use ke dalam instance app utama
 */
export const createAuthRoutes = (controller: AuthController) => {
  return new Elysia({ prefix: "/auth" })
    .post("/register", (ctx) => controller.register(ctx as any))
    .post("/login", (ctx) => controller.login(ctx as any))
    .get("/me", (ctx) => controller.me(ctx as any))
    .delete("/logout", (ctx) => controller.logout(ctx as any));
};
