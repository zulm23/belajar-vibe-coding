import { SignJWT, jwtVerify } from "jose";
import type { IUserRepository } from "../domain/repositories/user.repository.interface";
import type { ISessionRepository } from "../domain/repositories/session.repository.interface";
import type { CreateUserDto, UserResponse } from "../domain/entities/user.entity";
import type { AuthResponse, DeviceInfo, JwtPayload, LoginDto } from "../domain/entities/session.entity";
import { ConflictError, UnauthorizedError } from "../shared/errors";
import {
  validateUserEmail,
  validateUserName,
  validateUserPassword,
} from "../shared/validators";

/**
 * Service untuk menangani logika bisnis autentikasi, registrasi akun, dan manajemen sesi pengguna.
 * Mengikuti prinsip Use Case / Interactor pada Clean Architecture.
 * Menggunakan JSON Web Token (JWT) yang memuat informasi user aktif dan data perangkat (device).
 */
export class AuthService {
  private readonly jwtSecretKey: Uint8Array;

  /**
   * Menginisialisasi AuthService dengan meng-inject dependensi repository yang dibutuhkan.
   * @param userRepo Repository untuk operasi data user
   * @param sessionRepo Repository untuk operasi data session
   * @param jwtSecret Kunci rahasia untuk menandatangani JWT (opsional, default dari process.env.JWT_SECRET)
   */
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    jwtSecret?: string
  ) {
    const secret = jwtSecret || process.env.JWT_SECRET || "default_jwt_secret_key_vibe_coding_2026";
    this.jwtSecretKey = new TextEncoder().encode(secret);
  }

  /**
   * Menandatangani (sign) payload dan menghasilkan token JWT.
   * @param payload Data payload yang akan dienkode ke dalam JWT
   * @returns String JWT yang valid
   */
  async signJwt(payload: JwtPayload): Promise<string> {
    return await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setJti(payload.jti)
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(this.jwtSecretKey);
  }

  /**
   * Memverifikasi dan memecahkan isi payload token JWT.
   * @param token String JWT yang diterima dari client
   * @returns Payload JWT jika valid, atau null jika signature/format tidak valid
   */
  async verifyJwt(token: string): Promise<JwtPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecretKey);
      return payload as unknown as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Mendaftarkan pengguna baru dengan mengenkripsi password menggunakan bcrypt.
   * Melakukan validasi batas panjang karakter nama (maks 255) dan email (maks 150).
   * @param dto Data registrasi (nama, email, password)
   * @returns Data profil user yang baru dibuat tanpa field password
   * @throws ValidationError jika panjang/format tidak valid
   * @throws ConflictError jika email sudah digunakan
   */
  async register(dto: CreateUserDto): Promise<UserResponse> {
    const validName = validateUserName(dto.name);
    const validEmail = validateUserEmail(dto.email);
    const validPassword = validateUserPassword(dto.password);

    const existing = await this.userRepo.findByEmail(validEmail);
    if (existing) {
      throw new ConflictError("Email is already registered");
    }

    // Enkripsi password menggunakan bcrypt native dari Bun
    const hashedPassword = await Bun.password.hash(validPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await this.userRepo.create({
      name: validName,
      email: validEmail,
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
   * Membangkitkan JSON Web Token (JWT) dengan payload yang memuat data user yang sedang login
   * serta informasi device/perangkat yang digunakannya.
   * Token JWT juga disimpan pada tabel sesi database.
   *
   * @param dto Kredensial login (email, password, dan informasi device)
   * @returns Objek AuthResponse berisi token sesi JWT, profil user, dan decoded payload
   * @throws UnauthorizedError jika email tidak ditemukan atau password tidak cocok
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const validEmail = validateUserEmail(dto.email);
    if (!dto.password) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const user = await this.userRepo.findByEmail(validEmail);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verifikasi password plain terhadap hash bcrypt di database
    const isPasswordValid = await Bun.password.verify(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Default informasi device jika tidak disertakan secara spesifik
    const device: DeviceInfo = dto.device || {
      userAgent: "Unknown Device",
      platform: "Unknown Platform",
    };

    // Susun payload JWT lengkap dengan data user yang sedang login dan device
    const jti = crypto.randomUUID();
    const jwtPayload: JwtPayload = {
      sub: String(user.id),
      userId: user.id,
      name: user.name,
      email: user.email,
      device: {
        userAgent: device.userAgent,
        ipAddress: device.ipAddress,
        platform: device.platform,
      },
      jti,
    };

    // Buat token JWT yang ditandatangani dengan algoritma HS256
    const token = await this.signJwt(jwtPayload);

    // Simpan token JWT sesi baru ke database
    await this.sessionRepo.create({
      token,
      userId: user.id,
    });

    const userResponse: UserResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    return {
      token,
      user: userResponse,
      payload: jwtPayload,
    };
  }

  /**
   * Mengambil data profil user yang sedang aktif berdasarkan token sesi Bearer.
   * Memverifikasi integritas JWT dan memastikan sesi masih tercatat aktif di database.
   *
   * @param token Token JWT sesi pengguna
   * @returns Data profil user jika sesi valid, atau null jika tidak ditemukan/kadaluarsa
   */
  async getCurrentUser(token: string): Promise<UserResponse | null> {
    // 1. Verifikasi tanda tangan kriptografis JWT
    const decoded = await this.verifyJwt(token);
    if (!decoded) {
      return null;
    }

    // 2. Cek apakah sesi masih terdaftar di database (belum logout/revoked)
    const sessionWithUser = await this.sessionRepo.findSessionWithUserByToken(token);
    if (!sessionWithUser) {
      return null;
    }

    return sessionWithUser.user;
  }

  /**
   * Mengakhiri sesi pengguna (logout) dengan menghapus record token JWT sesi dari database.
   * @param token Token JWT sesi yang akan dicabut
   * @returns True jika sesi berhasil dicabut, false jika sesi tidak ditemukan
   */
  async logout(token: string): Promise<boolean> {
    return await this.sessionRepo.deleteByToken(token);
  }
}

