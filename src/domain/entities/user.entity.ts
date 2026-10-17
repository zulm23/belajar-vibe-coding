/**
 * Entity utama yang merepresentasikan pengguna pada tabel `users`.
 */
export interface User {
  /** ID unik pengguna (Primary Key) */
  id: number;
  /** Nama lengkap pengguna */
  name: string;
  /** Alamat email unik pengguna */
  email: string;
  /** Hash password bcrypt pengguna (rahasia) */
  password: string;
  /** Waktu saat akun dibuat */
  createdAt: Date;
}

/**
 * Payload data pengguna yang aman untuk dikembalikan ke client (tanpa field password).
 */
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

/**
 * Data Transfer Object (DTO) untuk pembuatan / registrasi user baru.
 */
export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

/**
 * Data Transfer Object (DTO) untuk pembaruan profil user (bersifat opsional).
 */
export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
}

