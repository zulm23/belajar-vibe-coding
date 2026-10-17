import type { UserResponse } from "./user.entity";

/**
 * Entity yang merepresentasikan data satu baris sesi pada tabel `sessions`.
 */
export interface Session {
  /** ID unik sesi (auto increment primary key) */
  id: number;
  /** Token sesi UUID v4 untuk identifikasi autentikasi */
  token: string;
  /** ID user yang memiliki sesi ini (Foreign Key ke tabel users) */
  userId: number;
  /** Waktu sesi dibuat */
  createdAt: Date;
}

/**
 * Data Transfer Object (DTO) untuk permintaan login pengguna.
 */
export interface LoginDto {
  /** Alamat email akun pengguna */
  email: string;
  /** Password plaintext pengguna untuk diverifikasi */
  password: string;
}

/**
 * Payload data yang dikembalikan kepada client ketika proses autentikasi berhasil.
 */
export interface AuthResponse {
  /** Token sesi UUID untuk disertakan di header `Authorization: Bearer <token>` */
  token: string;
  /** Profil pengguna yang berhasil diautentikasi (tanpa field password) */
  user: UserResponse;
}

/**
 * Representasi gabungan data Sesi beserta profil Pengguna (hasil JOIN).
 */
export interface SessionWithUser {
  /** Data sesi aktif */
  session: Session;
  /** Data pengguna pemilik sesi */
  user: UserResponse;
}
