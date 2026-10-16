import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import type { User } from "../../domain/entities/user.entity";

export class DrizzleUserRepository implements IUserRepository {
  async create(data: Omit<User, "id" | "createdAt">): Promise<User> {
    const [result] = await db.insert(users).values(data).returning();
    return result as User;
  }

  async findAll(): Promise<User[]> {
    const results = await db.select().from(users);
    return results as User[];
  }

  async findById(id: number): Promise<User | null> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return (result as User) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return (result as User) || null;
  }

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

  async delete(id: number): Promise<boolean> {
    const [result] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return !!result;
  }
}
