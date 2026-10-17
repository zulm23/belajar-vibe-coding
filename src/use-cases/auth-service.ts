import type { IUserRepository } from "../domain/repositories/user.repository.interface";
import type { ISessionRepository } from "../domain/repositories/session.repository.interface";
import type { CreateUserDto, UserResponse } from "../domain/entities/user.entity";
import type { AuthResponse, LoginDto } from "../domain/entities/session.entity";

/**
 * Service untuk menangani logika bisnis autentikasi, registrasi akun, dan manajemen sesi pengguna.
 * Mengikuti prinsip Use Case / Interactor pada Clean Architecture.
 */
export class AuthService {
  /**
   * Menginisialisasi AuthService dengan meng-inject dependensi repository yang dibutuhkan.
   * @param userRepo Repository untuk operasi data user
   * @param sessionRepo Repository untuk operasi data session
   */
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository
  ) {}

  /**
   * Mendaftarkan pengguna baru dengan mengenkripsi password menggunakan bcrypt.
   * @param dto Data registrasi (nama, email, password)
   * @returns Data profil user yang baru dibuat tanpa field password
   * @throws Error "EMAIL_EXISTS" jika alamat email telah digunakan
   */
  async register(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }

    // Enkripsi password menggunakan bcrypt native dari Bun
    const hashedPassword = await Bun.password.hash(dto.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Melakukan proses login pengguna dengan memverifikasi kredensial email dan password bcrypt.
   * Jika valid, akan membangkitkan UUID v4 sebagai token sesi login dan menyimpannya ke database.
   * @param dto Kredensial login (email dan password)
   * @returns Objek AuthResponse berisi token sesi UUID dan profil user
   * @throws Error "INVALID_CREDENTIALS" jika email tidak ditemukan atau password tidak cocok
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    // Verifikasi password plain terhadap hash bcrypt di database
    const isPasswordValid = await Bun.password.verify(dto.password, user.password);
    if (!isPasswordValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    // Bangkitkan UUID v4 unik menggunakan standar Web Crypto API
    const token = crypto.randomUUID();

    // Simpan sesi baru ke database
    await this.sessionRepo.create({
      token,
      userId: user.id,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Mengambil data profil user yang sedang aktif berdasarkan token sesi Bearer.
   * @param token Token UUID sesi pengguna
   * @returns Data profil user jika sesi valid, atau null jika tidak ditemukan/kadaluarsa
   */
  async getCurrentUser(token: string): Promise<UserResponse | null> {
    const sessionWithUser = await this.sessionRepo.findSessionWithUserByToken(token);
    if (!sessionWithUser) return null;
    return sessionWithUser.user;
  }

  /**
   * Mengakhiri sesi pengguna (logout) dengan menghapus record sesi dari database.
   * @param token Token UUID sesi yang akan dicabut
   * @returns True jika sesi berhasil dicabut, false jika sesi tidak ditemukan
   */
  async logout(token: string): Promise<boolean> {
    return await this.sessionRepo.deleteByToken(token);
  }
}
