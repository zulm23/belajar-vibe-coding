import type { User } from "../entities/user.entity";

/**
 * Kontrak abstraksi repository untuk operasi persistensi data User.
 */
export interface IUserRepository {
  /**
   * Menyimpan data user baru ke database.
   * @param data Objek user tanpa id dan createdAt
   * @returns User yang berhasil disimpan
   */
  create(data: Omit<User, "id" | "createdAt">): Promise<User>;

  /**
   * Mengambil semua daftar user.
   * @returns Array berisi semua User
   */
  findAll(): Promise<User[]>;

  /**
   * Mencari user berdasarkan ID.
   * @param id ID user
   * @returns User jika ditemukan, atau null jika tidak ada
   */
  findById(id: number): Promise<User | null>;

  /**
   * Mencari user berdasarkan alamat email unik.
   * @param email Alamat email user
   * @returns User jika ditemukan, atau null jika belum terdaftar
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Memperbarui sebagian field data user.
   * @param id ID user yang diupdate
   * @param data Field-field yang akan diperbarui
   * @returns User yang telah diupdate, atau null jika ID tidak ada
   */
  update(id: number, data: Partial<Omit<User, "id" | "createdAt">>): Promise<User | null>;

  /**
   * Menghapus user berdasarkan ID.
   * @param id ID user
   * @returns True jika berhasil dihapus, false jika gagal / tidak ditemukan
   */
  delete(id: number): Promise<boolean>;
}

