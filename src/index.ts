import { Elysia } from "elysia";
import { DrizzleHealthRepository } from "./infrastructure/repositories/drizzle-health.repository";
import { GetHealthUseCase } from "./use-cases/get-health.use-case";
import { HealthController } from "./interfaces/controllers/health.controller";
import { createHealthRoutes } from "./interfaces/routes/health.routes";

// 1. Inisialisasi Infrastructure (Adapter & Repository)
const healthRepo = new DrizzleHealthRepository();

// 2. Inisialisasi Use Case (Application Business Rules)
const getHealthUseCase = new GetHealthUseCase(healthRepo);

// 3. Inisialisasi Presentation (Controller & Routes)
const healthController = new HealthController(getHealthUseCase);

// 4. Inisialisasi Web Server ElysiaJS
const port = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .get("/", () => ({
    message: "Welcome to Vibe Coding API (Bun + Elysia + Drizzle + PostgreSQL)!",
    architecture: "Clean Architecture",
    endpoints: {
      health: "/health",
      healthDb: "/health/db",
    },
  }))
  .use(createHealthRoutes(healthController))
  .listen(port);

console.log(`🦊 Elysia server running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
