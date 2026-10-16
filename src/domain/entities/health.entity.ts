export interface HealthStatus {
  service: string;
  database: "connected" | "disconnected";
  timestamp: string;
}
