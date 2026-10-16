import { Elysia } from "elysia";
import { HealthController } from "../controllers/health.controller";

export const createHealthRoutes = (controller: HealthController) => {
  return new Elysia({ prefix: "/health" })
    .get("/", () => controller.getHealth())
    .get("/db", () => controller.getHealth());
};
