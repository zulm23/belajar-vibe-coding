import type { IUserRepository } from "../domain/repositories/user.repository.interface";
import type {
  CreateUserDto,
  UpdateUserDto,
  User,
  UserResponse,
} from "../domain/entities/user.entity";
import { ConflictError, NotFoundError } from "../shared/errors";
import {
  validateUserEmail,
  validateUserName,
  validateUserPassword,
} from "../shared/validators";

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
   * Membuat pengguna baru (registrasi) dengan validasi field ketat sesuai batasan database.
   * Password di-hash menggunakan bcrypt.
   * @param dto Data nama, email, dan password
   * @returns Data profil user baru
   * @throws ValidationError jika ada field tidak valid atau melebihi limit kolom DB
   * @throws ConflictError jika email sudah digunakan
   */
  async createUser(dto: CreateUserDto): Promise<UserResponse> {
    const validName = validateUserName(dto.name);
    const validEmail = validateUserEmail(dto.email);
    const validPassword = validateUserPassword(dto.password);

    const existing = await this.userRepo.findByEmail(validEmail);
    if (existing) {
      throw new ConflictError("Email is already registered");
    }

    const hashedPassword = await Bun.password.hash(validPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const created = await this.userRepo.create({
      name: validName,
      email: validEmail,
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
   * Memperbarui profil atau password user dengan validasi batasan kolom database.
   * @param id ID user
   * @param dto Data pembaruan
   * @returns UserResponse setelah diupdate
   * @throws NotFoundError jika user tidak ada
   * @throws ConflictError jika email baru telah digunakan oleh user lain
   * @throws ValidationError jika data tidak memenuhi constraint
   */
  async updateUser(id: number, dto: UpdateUserDto): Promise<UserResponse> {
    const existing = await this.userRepo.findById(id);
    if (!existing) {
      throw new NotFoundError("User not found");
    }

    const updateData: Partial<Omit<User, "id" | "createdAt">> = {};

    if (dto.name !== undefined) {
      updateData.name = validateUserName(dto.name);
    }

    if (dto.email !== undefined) {
      const validEmail = validateUserEmail(dto.email);
      if (validEmail !== existing.email) {
        const emailInUse = await this.userRepo.findByEmail(validEmail);
        if (emailInUse) {
          throw new ConflictError("Email is already registered by another user");
        }
      }
      updateData.email = validEmail;
    }

    if (dto.password !== undefined && dto.password.trim() !== "") {
      const validPassword = validateUserPassword(dto.password);
      updateData.password = await Bun.password.hash(validPassword, {
        algorithm: "bcrypt",
        cost: 10,
      });
    }

    const updated = await this.userRepo.update(id, updateData);
    if (!updated) {
      throw new NotFoundError("User not found");
    }

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


