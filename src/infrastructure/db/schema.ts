import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  status: text("status").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
