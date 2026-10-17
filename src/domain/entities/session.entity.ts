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
 * Informasi mengenai perangkat (device) yang digunakan oleh user saat login.
 */
export interface DeviceInfo {
  /** User-Agent string dari browser/aplikasi client */
  userAgent: string;
  /** IP address client */
  ipAddress?: string;
  /** Sistem operasi atau platform (misal Windows, Android, iOS, Linux) */
  platform?: string;
}

/**
 * Payload data yang disimpan dan dienkode ke dalam JSON Web Token (JWT).
 */
export interface JwtPayload {
  /** ID unik user (Subject claim) */
  sub: string;
  /** ID user (numerik) */
  userId: number;
  /** Nama user */
  name: string;
  /** Email user */
  email: string;
  /** Data device yang digunakan saat login */
  device: DeviceInfo;
  /** Unique ID untuk sesi / token (jti claim) */
  jti: string;
  /** Waktu token diterbitkan (issued at timestamp) */
  iat?: number;
  /** Waktu token kadaluarsa (expiration timestamp) */
  exp?: number;
}

/**
 * Data Transfer Object (DTO) untuk permintaan login pengguna.
 */
export interface LoginDto {
  /** Alamat email akun pengguna */
  email: string;
  /** Password plaintext pengguna untuk diverifikasi */
  password: string;
  /** Informasi perangkat/device (opsional jika dikirim via body atau diekstrak dari header) */
  device?: DeviceInfo;
}

/**
 * Payload data yang dikembalikan kepada client ketika proses autentikasi berhasil.
 */
export interface AuthResponse {
  /** Token sesi JWT untuk disertakan di header `Authorization: Bearer <token>` */
  token: string;
  /** Profil pengguna yang berhasil diautentikasi (tanpa field password) */
  user: UserResponse;
  /** Payload decoded yang ada di dalam token */
  payload?: JwtPayload;
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

