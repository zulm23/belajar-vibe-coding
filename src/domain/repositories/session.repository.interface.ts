import type { Session, SessionWithUser } from "../entities/session.entity";

/**
 * Kontrak antarmuka (abstraksi) repository untuk operasi data sesi pada database.
 * Mengikuti prinsip Dependency Inversion pada Clean Architecture sehingga
 * layer domain tidak bergantung pada detail framework atau ORM tertentu.
 */
export interface ISessionRepository {
  /**
   * Menyimpan sesi login baru ke database.
   * @param data Objek berisi token sesi UUID dan ID pengguna terkait.
   * @returns Data Session yang berhasil dibuat.
   */
  create(data: { token: string; userId: number }): Promise<Session>;

  /**
   * Mencari data sesi tunggal berdasarkan string token.
   * @param token Token UUID yang dicari.
   * @returns Objek Session jika ditemukan, atau null jika tidak ada.
   */
  findByToken(token: string): Promise<Session | null>;

  /**
   * Mengambil data sesi beserta informasi profil user terkait melalui operasi JOIN.
   * @param token Token UUID sesi.
   * @returns Objek SessionWithUser jika ditemukan, atau null jika tidak valid.
   */
  findSessionWithUserByToken(token: string): Promise<SessionWithUser | null>;

  /**
   * Menghapus record sesi berdasarkan token (digunakan pada proses logout).
   * @param token Token UUID sesi yang akan dihapus.
   * @returns True jika sesi berhasil dihapus, atau false jika token tidak ditemukan.
   */
  deleteByToken(token: string): Promise<boolean>;

  /**
   * Menghapus seluruh sesi milik pengguna tertentu (misal saat revoke all sessions).
   * @param userId ID pengguna pemilik sesi.
   * @returns True jika ada sesi yang dihapus, atau false jika tidak ada.
   */
  deleteByUserId(userId: number): Promise<boolean>;
}
