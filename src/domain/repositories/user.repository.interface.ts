import type { User } from "../entities/user.entity";

export interface IUserRepository {
  create(data: Omit<User, "id" | "createdAt">): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: number, data: Partial<Omit<User, "id" | "createdAt">>): Promise<User | null>;
  delete(id: number): Promise<boolean>;
}
