import { Elysia } from "elysia";
import { DrizzleHealthRepository } from "./infrastructure/repositories/drizzle-health.repository";
import { GetHealthUseCase } from "./use-cases/get-health.use-case";
import { HealthController } from "./interfaces/controllers/health.controller";
import { createHealthRoutes } from "./interfaces/routes/health.routes";

import { DrizzleUserRepository } from "./infrastructure/repositories/drizzle-user.repository";
import { UserService } from "./use-cases/user-service";
import { UserController } from "./interfaces/controllers/user.controller";
import { createUsersRoute } from "./interfaces/routes/users-route";

// 1. Inisialisasi Infrastructure (Adapter & Repository)
const healthRepo = new DrizzleHealthRepository();
const userRepo = new DrizzleUserRepository();

// 2. Inisialisasi Use Case / Service (Application Business Rules)
const getHealthUseCase = new GetHealthUseCase(healthRepo);
const userService = new UserService(userRepo);

// 3. Inisialisasi Presentation (Controller & Routes)
const healthController = new HealthController(getHealthUseCase);
const userController = new UserController(userService);

// 4. Inisialisasi Web Server ElysiaJS
const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .get("/", () => ({
    message: "Welcome to Vibe Coding API (Bun + Elysia + Drizzle + PostgreSQL)!",
    architecture: "Clean Architecture",
    endpoints: {
      health: "/health",
      healthDb: "/health/db",
      users: "/users",
    },
  }))
  .use(createHealthRoutes(healthController))
  .use(createUsersRoute(userController))
  .listen(port);

console.log(`🦊 Elysia server running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
