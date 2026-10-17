import type { AuthService } from "../../use-cases/auth-service";
import { successResponse, errorResponse } from "../../shared/api-response";
import type { CreateUserDto } from "../../domain/entities/user.entity";
import type { LoginDto } from "../../domain/entities/session.entity";

/**
 * Controller untuk menangani request dan response HTTP pada endpoint autentikasi (/auth).
 * Bertanggung jawab melakukan parsing input, validasi format, pengaturan HTTP status code,
 * serta membungkus respons ke dalam format seragam (ApiResponse).
 */
export class AuthController {
  /**
   * Menginisialisasi AuthController dengan instance AuthService.
   * @param authService Service yang berisi business logic autentikasi
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Fungsi helper privat untuk mengekstraksi token UUID dari header HTTP Authorization.
   * Mendukung format header "Authorization: Bearer <token>".
   * @param headers Objek request headers dari Elysia context
   * @returns String token UUID jika valid, atau null jika tidak ada
   */
  private extractBearerToken(headers: Record<string, string | undefined>): string | null {
    const authHeader = headers["authorization"] || headers["Authorization"];
    if (!authHeader) return null;
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer") {
      return parts[1] ?? null;
    }
    return null;
  }


  /**
   * Handler untuk registrasi user baru (POST /auth/register).
   * @param ctx Objek context Elysia berisi request body dan setter status response
   * @returns ApiResponse dengan status 201 jika sukses, atau pesan error jika gagal
   */
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

  /**
   * Handler untuk login pengguna (POST /auth/login).
   * Memvalidasi kredensial email & password, mengembalikan token sesi UUID jika berhasil.
   * @param ctx Objek context Elysia berisi request body dan setter status response
   * @returns ApiResponse dengan token sesi dan data user, atau status 401 jika kredensial salah
   */
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

  /**
   * Handler untuk memeriksa profil pengguna yang sedang login berdasarkan token sesi aktif (GET /auth/me).
   * Membaca header `Authorization: Bearer <token>`.
   * @param ctx Objek context Elysia berisi request headers dan setter status response
   * @returns Profil user yang sedang aktif, atau status 401 jika sesi tidak sah/kadaluarsa
   */
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

  /**
   * Handler untuk logout pengguna (DELETE /auth/logout).
   * Menghapus record token sesi dari database sehingga tidak dapat digunakan kembali.
   * @param ctx Objek context Elysia berisi request headers dan setter status response
   * @returns Pesan konfirmasi logout berhasil, atau status 401/404 jika token tidak valid
   */
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
