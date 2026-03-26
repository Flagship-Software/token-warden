import { setDialect } from "./helpers";
import type { WardenDb, WardenSchema } from "./types";

const DATABASE_URL = process.env.DATABASE_URL;
const isPg =
  DATABASE_URL?.startsWith("postgres://") ||
  DATABASE_URL?.startsWith("postgresql://");

let _db: unknown;
let _schema: unknown;

if (isPg) {
  setDialect("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pg = await import("pg");
  const s = await import("./schema.pg");
  _schema = s;
  const pool = new pg.default.Pool({ connectionString: DATABASE_URL });
  _db = drizzle(pool, { schema: s });
} else {
  setDialect("sqlite");
  const { default: Database } = await import("better-sqlite3");
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const s = await import("./schema.sqlite");
  _schema = s;
  const { join } = await import("path");
  const { mkdirSync } = await import("fs");
  const dataDir = join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(join(dataDir, "warden.db"));
  sqlite.pragma("journal_mode = WAL");
  _db = drizzle(sqlite, { schema: s });
}

export const db = _db as WardenDb;
export const { costEvents, budgets, alerts, modelPricing } =
  _schema as WardenSchema;
