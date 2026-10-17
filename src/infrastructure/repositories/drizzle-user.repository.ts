import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import type { User } from "../../domain/entities/user.entity";
import { DatabaseError } from "../../shared/errors";

/**
 * Implementasi konkret IUserRepository menggunakan Drizzle ORM dengan PostgreSQL.
 */
export class DrizzleUserRepository implements IUserRepository {
  /**
   * Menyimpan user baru ke database PostgreSQL.
   * @param data Objek user (name, email, password)
   * @returns User yang tersimpan
   * @throws DatabaseError jika query gagal dijalankan
   */
  async create(data: Omit<User, "id" | "createdAt">): Promise<User> {
    try {
      const [result] = await db.insert(users).values(data).returning();
      if (!result) {
        throw new DatabaseError("Failed to insert user record");
      }
      return result as User;
    } catch (err: any) {
      if (err instanceof DatabaseError) throw err;
      throw new DatabaseError(`Database error while creating user: ${err.message}`, err);
    }
  }

  /**
   * Mengambil semua daftar user dari database.
   * @returns Array User
   * @throws DatabaseError jika query gagal
   */
  async findAll(): Promise<User[]> {
    try {
      const results = await db.select().from(users);
      return results as User[];
    } catch (err: any) {
      throw new DatabaseError(`Database error while fetching users: ${err.message}`, err);
    }
  }

  /**
   * Mengambil data user berdasarkan ID.
   * @param id ID user
   * @returns User atau null jika tidak ada
   * @throws DatabaseError jika query gagal
   */
  async findById(id: number): Promise<User | null> {
    try {
      const [result] = await db.select().from(users).where(eq(users.id, id));
      return (result as User) || null;
    } catch (err: any) {
      throw new DatabaseError(`Database error while finding user by ID: ${err.message}`, err);
    }
  }

  /**
   * Mengambil data user berdasarkan email unik.
   * @param email Alamat email user
   * @returns User atau null jika tidak ada
   * @throws DatabaseError jika query gagal
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const [result] = await db.select().from(users).where(eq(users.email, email));
      return (result as User) || null;
    } catch (err: any) {
      throw new DatabaseError(`Database error while finding user by email: ${err.message}`, err);
    }
  }

  /**
   * Mengupdate data user berdasarkan ID.
   * @param id ID user
   * @param data Data yang ingin diubah
   * @returns User yang telah diupdate atau null jika user tidak ada
   * @throws DatabaseError jika query gagal
   */
  async update(
    id: number,
    data: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User | null> {
    try {
      const [result] = await db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();
      return (result as User) || null;
    } catch (err: any) {
      throw new DatabaseError(`Database error while updating user: ${err.message}`, err);
    }
  }

  /**
   * Menghapus data user dari database berdasarkan ID.
   * @param id ID user
   * @returns True jika berhasil, false jika tidak ada record yang terhapus
   * @throws DatabaseError jika query gagal
   */
  async delete(id: number): Promise<boolean> {
    try {
      const [result] = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();
      return !!result;
    } catch (err: any) {
      throw new DatabaseError(`Database error while deleting user: ${err.message}`, err);
    }
  }
}


