import { describe, it, expect, beforeEach } from "bun:test";
import { createApp } from "../src/app";
import { cleanDatabase } from "./helpers/test-db";

/**
 * Suite pengujian untuk modul Health Check & Root endpoint.
 * Menguji endpoint: GET /, GET /health, GET /health/db
 *
 * Setiap skenario dimulai dengan database yang bersih untuk memastikan konsistensi.
 */
describe("Health Check & Root Endpoints", () => {
  const app = createApp();

  beforeEach(async () => {
    await cleanDatabase();
  });

  // =====================================================================
  // GET / — Root endpoint
  // =====================================================================

  describe("GET /", () => {
    /**
     * Skenario 1.1: Root endpoint mengembalikan informasi service.
     * Memvalidasi pesan sambutan, arsitektur Clean Architecture, dan daftar rute tersedia.
     */
    it("Skenario 1.1: should return 200 with service metadata and route list", async () => {
      const res = await app.handle(new Request("http://localhost/"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.message).toBeDefined();
      expect(body.architecture).toBe("Clean Architecture");
      expect(body.endpoints).toBeDefined();
      expect(body.endpoints.health).toBeDefined();
      expect(body.endpoints.users).toBeDefined();
      expect(body.endpoints.auth).toBeDefined();
      expect(body.endpoints.auth.register).toBeDefined();
      expect(body.endpoints.auth.login).toBeDefined();
    });
  });

  // =====================================================================
  // GET /health — Application Health
  // =====================================================================

  describe("GET /health", () => {
    /**
     * Skenario 2.1: Health check aplikasi berjalan lancar.
     * Memvalidasi response mengandung status service dan timestamp.
     */
    it("Skenario 2.1: should return 200 with health status data", async () => {
      const res = await app.handle(new Request("http://localhost/health"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      // Endpoint health mengembalikan service, database, timestamp
      expect(body.data.service).toBeDefined();
      expect(body.data.timestamp).toBeDefined();
    });
  });

  // =====================================================================
  // GET /health/db — Database Health
  // =====================================================================

  describe("GET /health/db", () => {
    /**
     * Skenario 3.1: Koneksi database PostgreSQL aktif dan sehat.
     * Memvalidasi response menyatakan database "connected" dan timestamp valid.
     */
    it("Skenario 3.1: should return 200 with database=connected status", async () => {
      const res = await app.handle(new Request("http://localhost/health/db"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.database).toBe("connected");
      expect(body.data.timestamp).toBeDefined();
    });
  });
});
