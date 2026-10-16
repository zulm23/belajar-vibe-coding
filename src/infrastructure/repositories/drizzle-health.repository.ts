import { sql } from "drizzle-orm";
import { db } from "../db";
import type { IHealthRepository } from "../../domain/repositories/health.repository.interface";
import type { HealthStatus } from "../../domain/entities/health.entity";

export class DrizzleHealthRepository implements IHealthRepository {
  async checkDatabase(): Promise<HealthStatus> {
    try {
      // Eksekusi query test ke database PostgreSQL
      await db.execute(sql`SELECT 1`);
      return {
        service: "vibe-coding-api",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        service: "vibe-coding-api",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      };
    }
  }
}
