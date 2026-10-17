/**
 * Base custom error class untuk seluruh domain dan application error.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string, public readonly details?: any) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}

/**
 * Error yang dilempar saat terjadi kegagalan validasi input pengguna.
 * Menghasilkan HTTP Status 400 Bad Request.
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;

  constructor(message: string, details?: any) {
    super(message, details);
  }
}

/**
 * Error yang dilempar saat terjadi konflik data unik (misal email sudah terdaftar).
 * Menghasilkan HTTP Status 409 Conflict.
 */
export class ConflictError extends AppError {
  readonly statusCode = 409;

  constructor(message: string, details?: any) {
    super(message, details);
  }
}

/**
 * Error yang dilempar saat kredensial atau token autentikasi tidak valid.
 * Menghasilkan HTTP Status 401 Unauthorized.
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;

  constructor(message: string, details?: any) {
    super(message, details);
  }
}

/**
 * Error yang dilempar saat data entitas yang diminta tidak ditemukan.
 * Menghasilkan HTTP Status 404 Not Found.
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;

  constructor(message: string, details?: any) {
    super(message, details);
  }
}

/**
 * Error terstandar ketika terjadi kegagalan pada operasi database (PostgreSQL/Drizzle).
 * Menghasilkan HTTP Status 500 Internal Server Error dengan pesan yang aman untuk client.
 */
export class DatabaseError extends AppError {
  readonly statusCode = 500;

  constructor(message: string = "A database error occurred", details?: any) {
    super(message, details);
  }
}
