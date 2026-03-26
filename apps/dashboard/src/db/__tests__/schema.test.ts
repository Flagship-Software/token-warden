import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema.sqlite";

describe("SQLite schema", () => {
  it("creates all 4 tables and allows insert/read", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE cost_events (
        id TEXT PRIMARY KEY, timestamp INTEGER NOT NULL,
        feature TEXT NOT NULL, team TEXT, user_id TEXT,
        provider TEXT NOT NULL, model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL, input_cost REAL NOT NULL,
        output_cost REAL NOT NULL, total_cost REAL NOT NULL,
        latency_ms INTEGER, status TEXT DEFAULT 'success', metadata TEXT
      );
      CREATE TABLE budgets (
        id TEXT PRIMARY KEY, feature TEXT NOT NULL, period TEXT NOT NULL,
        limit_usd REAL NOT NULL, alert_threshold REAL DEFAULT 0.8,
        webhook_url TEXT, email TEXT, created_at INTEGER NOT NULL
      );
      CREATE TABLE alerts (
        id TEXT PRIMARY KEY, budget_id TEXT, feature TEXT NOT NULL,
        type TEXT NOT NULL, message TEXT NOT NULL,
        current_spend REAL NOT NULL, threshold REAL NOT NULL,
        triggered_at INTEGER NOT NULL, resolved INTEGER DEFAULT 0
      );
      CREATE TABLE model_pricing (
        provider TEXT NOT NULL, model TEXT NOT NULL,
        input_price_per_1k REAL NOT NULL, output_price_per_1k REAL NOT NULL,
        updated_at INTEGER NOT NULL, PRIMARY KEY (provider, model)
      );
    `);
    const db = drizzle(sqlite, { schema });

    db.insert(schema.modelPricing)
      .values({
        provider: "test",
        model: "test-model",
        inputPricePer1k: 0.001,
        outputPricePer1k: 0.002,
        updatedAt: Date.now(),
      })
      .run();

    const rows = db.select().from(schema.modelPricing).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].provider).toBe("test");

    sqlite.close();
  });
});
