import type { IUserRepository } from "../domain/repositories/user.repository.interface";
import type {
  CreateUserDto,
  UpdateUserDto,
  User,
  UserResponse,
} from "../domain/entities/user.entity";

export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  private sanitizeUser(user: User): UserResponse {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  async createUser(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }

    const hashedPassword = await Bun.password.hash(dto.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const created = await this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    return this.sanitizeUser(created);
  }

  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this.userRepo.findAll();
    return users.map((u) => this.sanitizeUser(u));
  }

  async getUserById(id: number): Promise<UserResponse | null> {
    const user = await this.userRepo.findById(id);
    if (!user) return null;
    return this.sanitizeUser(user);
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<UserResponse | null> {
    const existing = await this.userRepo.findById(id);
    if (!existing) return null;

    if (dto.email && dto.email !== existing.email) {
      const emailInUse = await this.userRepo.findByEmail(dto.email);
      if (emailInUse) {
        throw new Error("EMAIL_EXISTS");
      }
    }

    const updateData: Partial<Omit<User, "id" | "createdAt">> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.password !== undefined && dto.password.trim() !== "") {
      updateData.password = await Bun.password.hash(dto.password, {
        algorithm: "bcrypt",
        cost: 10,
      });
    }

    const updated = await this.userRepo.update(id, updateData);
    if (!updated) return null;

    return this.sanitizeUser(updated);
  }

  async deleteUser(id: number): Promise<boolean> {
    const existing = await this.userRepo.findById(id);
    if (!existing) return false;
    return await this.userRepo.delete(id);
  }
}
