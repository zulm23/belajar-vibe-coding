import type { AuthService } from "../../use-cases/auth-service";
import { successResponse, errorResponse } from "../../shared/api-response";
import type { CreateUserDto } from "../../domain/entities/user.entity";
import type { DeviceInfo, LoginDto } from "../../domain/entities/session.entity";
import { AppError } from "../../shared/errors";

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
      if (!body) {
        set.status = 400;
        return errorResponse("Request body is required");
      }

      const user = await this.authService.register(body);
      set.status = 201;
      return successResponse("User registration successful", user);
    } catch (err: any) {
      if (err instanceof AppError) {
        set.status = err.statusCode;
        return errorResponse(err.message, err.details);
      }
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }

  /**
   * Helper privat untuk mengekstrak informasi perangkat (device) dari request headers & body.
   * @param headers Objek request headers
   * @param bodyDevice Data device opsional dari request body
   * @returns Objek DeviceInfo yang telah diparsing
   */
  private extractDeviceInfo(
    headers: Record<string, string | undefined>,
    bodyDevice?: Partial<DeviceInfo>
  ): DeviceInfo {
    const userAgent =
      bodyDevice?.userAgent || headers["user-agent"] || headers["User-Agent"] || "Unknown Device";
    const ipAddress =
      bodyDevice?.ipAddress ||
      headers["x-forwarded-for"] ||
      headers["x-real-ip"] ||
      "127.0.0.1";

    let platform = bodyDevice?.platform || "Unknown Platform";
    if (!bodyDevice?.platform && userAgent) {
      if (/windows/i.test(userAgent)) platform = "Windows";
      else if (/android/i.test(userAgent)) platform = "Android";
      else if (/iphone|ipad|ipod/i.test(userAgent)) platform = "iOS";
      else if (/macintosh|mac os x/i.test(userAgent)) platform = "macOS";
      else if (/linux/i.test(userAgent)) platform = "Linux";
    }

    return {
      userAgent,
      ipAddress,
      platform,
    };
  }

  /**
   * Handler untuk login pengguna (POST /auth/login).
   * Memvalidasi kredensial email & password, mengembalikan token sesi JWT dengan payload
   * yang memuat data profil pengguna dan data device yang sedang digunakan.
   *
   * @param ctx Objek context Elysia berisi request body, request headers, dan setter status response
   * @returns ApiResponse dengan token sesi JWT, decoded payload, dan data user
   */
  async login({
    body,
    headers,
    set,
  }: {
    body: LoginDto;
    headers?: Record<string, string | undefined>;
    set: any;
  }) {
    try {
      if (!body || !body.email || !body.password) {
        set.status = 400;
        return errorResponse("Email and password are required");
      }

      // Deteksi dan ekstrak informasi perangkat dari header dan body
      const device = this.extractDeviceInfo(headers || {}, body.device);

      const result = await this.authService.login({
        ...body,
        device,
      });

      set.status = 200;
      return successResponse("Login successful", result);
    } catch (err: any) {
      if (err instanceof AppError) {
        set.status = err.statusCode;
        return errorResponse(err.message, err.details);
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
      if (err instanceof AppError) {
        set.status = err.statusCode;
        return errorResponse(err.message, err.details);
      }
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
      if (err instanceof AppError) {
        set.status = err.statusCode;
        return errorResponse(err.message, err.details);
      }
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }
}
