import { describe, it, expect, vi, afterAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema.sqlite";

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
const testDb = drizzle(sqlite, { schema });

vi.mock("@/db", () => ({
  db: testDb,
  costEvents: schema.costEvents,
  budgets: schema.budgets,
  alerts: schema.alerts,
  modelPricing: schema.modelPricing,
}));

vi.mock("@/db/helpers", () => ({
  resolvedFalse: () => sql`0`,
}));

afterAll(() => {
  sqlite.close();
});

const VALID_EVENT = {
  feature: "chat",
  provider: "openai",
  model: "gpt-4o",
  inputTokens: 100,
  outputTokens: 50,
  totalTokens: 150,
};

async function postEvents(
  events: unknown[],
  authHeader: string | null = "Bearer tw_dev_key",
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authHeader !== null) {
    headers["authorization"] = authHeader;
  }
  const req = new Request("http://localhost:3100/api/events", {
    method: "POST",
    headers,
    body: JSON.stringify({ events }),
  });
  const { POST } = await import("../route");
  return POST(req);
}

describe("POST /api/events — auth", () => {
  it("rejects request with no auth header", async () => {
    const res = await postEvents([VALID_EVENT], null);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects request with wrong bearer token", async () => {
    const res = await postEvents([VALID_EVENT], "Bearer wrong-key");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("accepts request with correct bearer token", async () => {
    const res = await postEvents([VALID_EVENT]);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/events — validation", () => {
  it("rejects event missing feature", async () => {
    const bad = {
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    };
    const res = await postEvents([bad]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rejected).toBe(1);
    expect(body.accepted).toBe(0);
  });

  it("rejects event with negative inputTokens", async () => {
    const bad = { ...VALID_EVENT, inputTokens: -1 };
    const res = await postEvents([bad]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rejected).toBe(1);
    expect(body.accepted).toBe(0);
  });

  it("returns correct accepted/rejected counts for mixed batch", async () => {
    const bad = {
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    };
    const res = await postEvents([VALID_EVENT, bad, VALID_EVENT]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accepted).toBe(2);
    expect(body.rejected).toBe(1);
  });
});
