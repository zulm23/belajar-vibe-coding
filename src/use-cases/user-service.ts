import type { IUserRepository } from "../domain/repositories/user.repository.interface";
import type {
  CreateUserDto,
  UpdateUserDto,
  User,
  UserResponse,
} from "../domain/entities/user.entity";

/**
 * Service pengelola logika bisnis untuk entitas User (CRUD).
 */
export class UserService {
  /**
   * Menginisialisasi UserService dengan repository user.
   * @param userRepo Repository yang mengimplementasikan IUserRepository
   */
  constructor(private readonly userRepo: IUserRepository) {}

  /**
   * Helper privat untuk menghapus field rahasia seperti password sebelum dikembalikan ke client.
   * @param user Data user lengkap dari database
   * @returns UserResponse yang aman
   */
  private sanitizeUser(user: User): UserResponse {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Membuat pengguna baru (registrasi) dengan password yang di-hash menggunakan bcrypt.
   * @param dto Data nama, email, dan password
   * @returns Data profil user baru
   * @throws Error "EMAIL_EXISTS" jika email sudah digunakan
   */
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

  /**
   * Mengambil semua daftar user tanpa field password.
   * @returns Array UserResponse
   */
  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this.userRepo.findAll();
    return users.map((u) => this.sanitizeUser(u));
  }

  /**
   * Mengambil data profil user berdasarkan ID.
   * @param id ID user
   * @returns UserResponse jika ada, atau null jika tidak ditemukan
   */
  async getUserById(id: number): Promise<UserResponse | null> {
    const user = await this.userRepo.findById(id);
    if (!user) return null;
    return this.sanitizeUser(user);
  }

  /**
   * Memperbarui profil atau password user.
   * @param id ID user
   * @param dto Data pembaruan
   * @returns UserResponse setelah diupdate, atau null jika ID user tidak ada
   * @throws Error "EMAIL_EXISTS" jika email baru telah digunakan oleh user lain
   */
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

  /**
   * Menghapus akun user berdasarkan ID.
   * @param id ID user yang akan dihapus
   * @returns True jika berhasil, false jika user tidak ditemukan
   */
  async deleteUser(id: number): Promise<boolean> {
    const existing = await this.userRepo.findById(id);
    if (!existing) return false;
    return await this.userRepo.delete(id);
  }
}

