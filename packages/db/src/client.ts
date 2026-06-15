import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const queryClient = postgres(databaseUrl, {
    max: Number(process.env.DB_POOL_MAX ?? 10)
  });

  return {
    db: drizzle(queryClient, { schema }),
    queryClient
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];

