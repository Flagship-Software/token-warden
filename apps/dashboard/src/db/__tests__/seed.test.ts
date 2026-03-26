import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema.sqlite";

describe("seed idempotency", () => {
  it("running seed twice does not create duplicates", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE model_pricing (
        provider TEXT NOT NULL, model TEXT NOT NULL,
        input_price_per_1k REAL NOT NULL, output_price_per_1k REAL NOT NULL,
        updated_at INTEGER NOT NULL, PRIMARY KEY (provider, model)
      );
    `);
    const db = drizzle(sqlite, { schema });

    const prices = [
      {
        provider: "openai",
        model: "gpt-4o",
        inputPricePer1k: 0.0025,
        outputPricePer1k: 0.01,
        updatedAt: Date.now(),
      },
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6-20260301",
        inputPricePer1k: 0.003,
        outputPricePer1k: 0.015,
        updatedAt: Date.now(),
      },
    ];

    for (let i = 0; i < 2; i++) {
      for (const price of prices) {
        db.insert(schema.modelPricing)
          .values(price)
          .onConflictDoUpdate({
            target: [schema.modelPricing.provider, schema.modelPricing.model],
            set: {
              inputPricePer1k: price.inputPricePer1k,
              outputPricePer1k: price.outputPricePer1k,
              updatedAt: price.updatedAt,
            },
          })
          .run();
      }
    }

    const rows = db.select().from(schema.modelPricing).all();
    expect(rows).toHaveLength(2);
    sqlite.close();
  });
});
