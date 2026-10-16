import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  status: text("status").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
