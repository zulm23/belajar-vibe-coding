import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import type { ISessionRepository } from "../../domain/repositories/session.repository.interface";
import type { Session, SessionWithUser } from "../../domain/entities/session.entity";
import { DatabaseError } from "../../shared/errors";

/**
 * Implementasi konkret dari ISessionRepository yang menggunakan Drizzle ORM
 * untuk berkomunikasi dengan database PostgreSQL.
 */
export class DrizzleSessionRepository implements ISessionRepository {
  /**
   * Menyimpan sesi login baru ke tabel sessions.
   * @param data Token sesi dan ID user
   * @returns Record Session yang baru saja disimpan
   * @throws DatabaseError jika penyimpanan gagal
   */
  async create(data: { token: string; userId: number }): Promise<Session> {
    try {
      const [result] = await db
        .insert(sessions)
        .values({
          token: data.token,
          userId: data.userId,
        })
        .returning();
      if (!result) {
        throw new DatabaseError("Failed to insert session record");
      }
      return result as Session;
    } catch (err: any) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError(`Database error while creating session: ${err.message}`, err);
    }
  }

  /**
   * Mengambil record sesi berdasarkan token unik.
   * @param token Token UUID/JWT sesi
   * @returns Data Session atau null jika tidak ada
   * @throws DatabaseError jika query gagal
   */
  async findByToken(token: string): Promise<Session | null> {
    try {
      const [result] = await db.select().from(sessions).where(eq(sessions.token, token));
      return (result as Session) || null;
    } catch (err: any) {
      throw new DatabaseError(`Database error while finding session: ${err.message}`, err);
    }
  }

  /**
   * Mengambil data sesi beserta relasi data pengguna terkait menggunakan INNER JOIN.
   * @param token Token UUID/JWT sesi
   * @returns Gabungan SessionWithUser atau null jika token tidak cocok
   * @throws DatabaseError jika query gagal
   */
  async findSessionWithUserByToken(token: string): Promise<SessionWithUser | null> {
    try {
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
    } catch (err: any) {
      throw new DatabaseError(`Database error while finding session with user: ${err.message}`, err);
    }
  }

  /**
   * Menghapus sesi berdasarkan token dari tabel sessions.
   * @param token Token sesi yang dihapus
   * @returns True jika record berhasil dihapus, false jika tidak ada
   * @throws DatabaseError jika query gagal
   */
  async deleteByToken(token: string): Promise<boolean> {
    try {
      const [deleted] = await db
        .delete(sessions)
        .where(eq(sessions.token, token))
        .returning();
      return !!deleted;
    } catch (err: any) {
      throw new DatabaseError(`Database error while deleting session: ${err.message}`, err);
    }
  }

  /**
   * Menghapus seluruh sesi aktif dari seorang pengguna berdasarkan user_id.
   * @param userId ID user
   * @returns True jika ada minimal satu sesi yang terhapus, false jika tidak ada
   * @throws DatabaseError jika query gagal
   */
  async deleteByUserId(userId: number): Promise<boolean> {
    try {
      const deleted = await db
        .delete(sessions)
        .where(eq(sessions.userId, userId))
        .returning();
      return deleted.length > 0;
    } catch (err: any) {
      throw new DatabaseError(`Database error while deleting user sessions: ${err.message}`, err);
    }
  }
}

