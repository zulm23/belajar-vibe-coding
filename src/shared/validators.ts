import { ValidationError } from "./errors";

/**
 * Batasan panjang karakter kolom database tabel `users`.
 */
export const USER_SCHEMA_CONSTRAINTS = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 255,
  EMAIL_MIN_LENGTH: 3,
  EMAIL_MAX_LENGTH: 150,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 255,
} as const;

/**
 * Regex standar untuk validasi format alamat email RFC 5322 sederhana.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Memvalidasi nama pengguna: wajib diisi, berupa string, dan tidak melebihi 255 karakter.
 * @param name Nilai nama yang divalidasi
 * @throws ValidationError jika tidak memenuhi syarat
 */
export const validateUserName = (name: unknown): string => {
  if (typeof name !== "string" || name.trim() === "") {
    throw new ValidationError("Name is required and cannot be empty");
  }
  const trimmed = name.trim();
  if (trimmed.length > USER_SCHEMA_CONSTRAINTS.NAME_MAX_LENGTH) {
    throw new ValidationError(
      `Name must not exceed ${USER_SCHEMA_CONSTRAINTS.NAME_MAX_LENGTH} characters (received ${trimmed.length} characters)`
    );
  }
  return trimmed;
};

/**
 * Memvalidasi alamat email: format email valid dan tidak melebihi 150 karakter.
 * @param email Nilai email yang divalidasi
 * @throws ValidationError jika format salah atau melebihi limit
 */
export const validateUserEmail = (email: unknown): string => {
  if (typeof email !== "string" || email.trim() === "") {
    throw new ValidationError("Email is required and cannot be empty");
  }
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > USER_SCHEMA_CONSTRAINTS.EMAIL_MAX_LENGTH) {
    throw new ValidationError(
      `Email must not exceed ${USER_SCHEMA_CONSTRAINTS.EMAIL_MAX_LENGTH} characters`
    );
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new ValidationError("Invalid email format");
  }
  return trimmed;
};

/**
 * Memvalidasi password: wajib diisi, minimal 6 karakter, dan tidak melebihi 255 karakter.
 * @param password Nilai password yang divalidasi
 * @throws ValidationError jika tidak memenuhi syarat keamanan dasar
 */
export const validateUserPassword = (password: unknown): string => {
  if (typeof password !== "string" || password === "") {
    throw new ValidationError("Password is required and cannot be empty");
  }
  if (password.length < USER_SCHEMA_CONSTRAINTS.PASSWORD_MIN_LENGTH) {
    throw new ValidationError(
      `Password must be at least ${USER_SCHEMA_CONSTRAINTS.PASSWORD_MIN_LENGTH} characters long`
    );
  }
  if (password.length > USER_SCHEMA_CONSTRAINTS.PASSWORD_MAX_LENGTH) {
    throw new ValidationError(
      `Password must not exceed ${USER_SCHEMA_CONSTRAINTS.PASSWORD_MAX_LENGTH} characters`
    );
  }
  return password;
};
