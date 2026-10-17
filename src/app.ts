import { Elysia } from "elysia";

// Import Modul Health Check
import { DrizzleHealthRepository } from "./infrastructure/repositories/drizzle-health.repository";
import { GetHealthUseCase } from "./use-cases/get-health.use-case";
import { HealthController } from "./interfaces/controllers/health.controller";
import { createHealthRoutes } from "./interfaces/routes/health.routes";

// Import Modul User (CRUD)
import { DrizzleUserRepository } from "./infrastructure/repositories/drizzle-user.repository";
import { UserService } from "./use-cases/user-service";
import { UserController } from "./interfaces/controllers/user.controller";
import { createUsersRoute } from "./interfaces/routes/users-route";

// Import Modul Autentikasi & Session
import { DrizzleSessionRepository } from "./infrastructure/repositories/drizzle-session.repository";
import { AuthService } from "./use-cases/auth-service";
import { AuthController } from "./interfaces/controllers/auth.controller";
import { createAuthRoutes } from "./interfaces/routes/auth.routes";

/**
 * Factory function yang membuat dan mengkonfigurasi instance aplikasi Elysia.
 * Dipisah dari proses listen() agar dapat digunakan pada unit/integration testing
 * tanpa perlu membuka koneksi port TCP yang sesungguhnya.
 *
 * @returns Instance Elysia yang sudah terkonfigurasi dengan semua routes
 */
export function createApp(): Elysia {
  // Layer Infrastructure: Inisialisasi Repositories (Database Adapters)
  const healthRepo = new DrizzleHealthRepository();
  const userRepo = new DrizzleUserRepository();
  const sessionRepo = new DrizzleSessionRepository();

  // Layer Use Case: Inisialisasi Services (Application Business Rules)
  const getHealthUseCase = new GetHealthUseCase(healthRepo);
  const userService = new UserService(userRepo);
  const authService = new AuthService(userRepo, sessionRepo);

  // Layer Interfaces / Delivery: Inisialisasi Controllers
  const healthController = new HealthController(getHealthUseCase);
  const userController = new UserController(userService);
  const authController = new AuthController(authService);

  return new Elysia()
    .get("/", () => ({
      message: "Welcome to Vibe Coding API (Bun + Elysia + Drizzle + PostgreSQL)!",
      architecture: "Clean Architecture",
      endpoints: {
        health: "/health",
        healthDb: "/health/db",
        users: "/users",
        auth: {
          register: "POST /auth/register",
          login: "POST /auth/login",
          me: "GET /auth/me",
          logout: "DELETE /auth/logout",
        },
      },
    }))
    .use(createHealthRoutes(healthController))
    .use(createUsersRoute(userController))
    .use(createAuthRoutes(authController));
}
