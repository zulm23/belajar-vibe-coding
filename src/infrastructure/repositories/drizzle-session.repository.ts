import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import type { ISessionRepository } from "../../domain/repositories/session.repository.interface";
import type { Session, SessionWithUser } from "../../domain/entities/session.entity";

/**
 * Implementasi konkret dari ISessionRepository yang menggunakan Drizzle ORM
 * untuk berkomunikasi dengan database PostgreSQL.
 */
export class DrizzleSessionRepository implements ISessionRepository {
  /**
   * Menyimpan sesi login baru ke tabel sessions.
   * @param data Token sesi dan ID user
   * @returns Record Session yang baru saja disimpan
   */
  async create(data: { token: string; userId: number }): Promise<Session> {
    const [result] = await db
      .insert(sessions)
      .values({
        token: data.token,
        userId: data.userId,
      })
      .returning();
    return result as Session;
  }

  /**
   * Mengambil record sesi berdasarkan token unik.
   * @param token Token UUID sesi
   * @returns Data Session atau null jika tidak ada
   */
  async findByToken(token: string): Promise<Session | null> {
    const [result] = await db.select().from(sessions).where(eq(sessions.token, token));
    return (result as Session) || null;
  }

  /**
   * Mengambil data sesi beserta relasi data pengguna terkait menggunakan INNER JOIN.
   * @param token Token UUID sesi
   * @returns Gabungan SessionWithUser atau null jika token tidak cocok
   */
  async findSessionWithUserByToken(token: string): Promise<SessionWithUser | null> {
    const rows = await db
      .select({
        sessionId: sessions.id,
        sessionToken: sessions.token,
        sessionUserId: sessions.userId,
        sessionCreatedAt: sessions.createdAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userCreatedAt: users.createdAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, token));

    const row = rows[0];
    if (!row) return null;

    return {
      session: {
        id: row.sessionId,
        token: row.sessionToken,
        userId: row.sessionUserId,
        createdAt: row.sessionCreatedAt,
      },
      user: {
        id: row.userId,
        name: row.userName,
        email: row.userEmail,
        createdAt: row.userCreatedAt,
      },
    };
  }

  /**
   * Menghapus sesi berdasarkan token UUID dari tabel sessions.
   * @param token Token UUID sesi yang dihapus
   * @returns True jika record berhasil dihapus, false jika tidak ada
   */
  async deleteByToken(token: string): Promise<boolean> {
    const [deleted] = await db
      .delete(sessions)
      .where(eq(sessions.token, token))
      .returning();
    return !!deleted;
  }

  /**
   * Menghapus seluruh sesi aktif dari seorang pengguna berdasarkan user_id.
   * @param userId ID user
   * @returns True jika ada minimal satu sesi yang terhapus, false jika tidak ada
   */
  async deleteByUserId(userId: number): Promise<boolean> {
    const deleted = await db
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning();
    return deleted.length > 0;
  }
}
