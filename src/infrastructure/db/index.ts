import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:Rahasia12345@localhost:5432/vibe_coding_db";

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });
