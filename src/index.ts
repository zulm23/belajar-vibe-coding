import { Elysia } from "elysia";

// 1. Import Modul Health Check
import { DrizzleHealthRepository } from "./infrastructure/repositories/drizzle-health.repository";
import { GetHealthUseCase } from "./use-cases/get-health.use-case";
import { HealthController } from "./interfaces/controllers/health.controller";
import { createHealthRoutes } from "./interfaces/routes/health.routes";

// 2. Import Modul User (CRUD)
import { DrizzleUserRepository } from "./infrastructure/repositories/drizzle-user.repository";
import { UserService } from "./use-cases/user-service";
import { UserController } from "./interfaces/controllers/user.controller";
import { createUsersRoute } from "./interfaces/routes/users-route";

// 3. Import Modul Autentikasi & Session
import { DrizzleSessionRepository } from "./infrastructure/repositories/drizzle-session.repository";
import { AuthService } from "./use-cases/auth-service";
import { AuthController } from "./interfaces/controllers/auth.controller";
import { createAuthRoutes } from "./interfaces/routes/auth.routes";

/**
 * -----------------------------------------------------------------------------
 * 1. Layer Infrastructure: Inisialisasi Repositories (Database Adapters)
 * -----------------------------------------------------------------------------
 */
const healthRepo = new DrizzleHealthRepository();
const userRepo = new DrizzleUserRepository();
const sessionRepo = new DrizzleSessionRepository();

/**
 * -----------------------------------------------------------------------------
 * 2. Layer Use Case: Inisialisasi Services (Application Business Rules)
 * -----------------------------------------------------------------------------
 */
const getHealthUseCase = new GetHealthUseCase(healthRepo);
const userService = new UserService(userRepo);
const authService = new AuthService(userRepo, sessionRepo);

/**
 * -----------------------------------------------------------------------------
 * 3. Layer Interfaces / Delivery: Inisialisasi Controllers
 * -----------------------------------------------------------------------------
 */
const healthController = new HealthController(getHealthUseCase);
const userController = new UserController(userService);
const authController = new AuthController(authService);

/**
 * -----------------------------------------------------------------------------
 * 4. Inisialisasi & Konfigurasi Server ElysiaJS
 * -----------------------------------------------------------------------------
 */
const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  // Root endpoint dengan metadata daftar API yang tersedia
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
  // Registrasi modular routes
  .use(createHealthRoutes(healthController))
  .use(createUsersRoute(userController))
  .use(createAuthRoutes(authController))
  .listen(port);

console.log(`🦊 Elysia server running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;

