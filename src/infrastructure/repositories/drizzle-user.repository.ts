import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import type { User } from "../../domain/entities/user.entity";

/**
 * Implementasi konkret IUserRepository menggunakan Drizzle ORM dengan PostgreSQL.
 */
export class DrizzleUserRepository implements IUserRepository {
  /**
   * Menyimpan user baru ke database PostgreSQL.
   * @param data Objek user (name, email, password)
   * @returns User yang tersimpan
   */
  async create(data: Omit<User, "id" | "createdAt">): Promise<User> {
    const [result] = await db.insert(users).values(data).returning();
    return result as User;
  }

  /**
   * Mengambil semua daftar user dari database.
   * @returns Array User
   */
  async findAll(): Promise<User[]> {
    const results = await db.select().from(users);
    return results as User[];
  }

  /**
   * Mengambil data user berdasarkan ID.
   * @param id ID user
   * @returns User atau null jika tidak ada
   */
  async findById(id: number): Promise<User | null> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return (result as User) || null;
  }

  /**
   * Mengambil data user berdasarkan email unik.
   * @param email Alamat email user
   * @returns User atau null jika tidak ada
   */
  async findByEmail(email: string): Promise<User | null> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return (result as User) || null;
  }

  /**
   * Mengupdate data user berdasarkan ID.
   * @param id ID user
   * @param data Data yang ingin diubah
   * @returns User yang telah diupdate atau null jika user tidak ada
   */
  async update(
    id: number,
    data: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User | null> {
    const [result] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return (result as User) || null;
  }

  /**
   * Menghapus data user dari database berdasarkan ID.
   * @param id ID user
   * @returns True jika berhasil, false jika tidak ada record yang terhapus
   */
  async delete(id: number): Promise<boolean> {
    const [result] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return !!result;
  }
}

