import type { HealthStatus } from "../entities/health.entity";

export interface IHealthRepository {
  checkDatabase(): Promise<HealthStatus>;
}
