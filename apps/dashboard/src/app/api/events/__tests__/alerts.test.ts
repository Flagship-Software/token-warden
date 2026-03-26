import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema.sqlite";

const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS cost_events (
    id TEXT PRIMARY KEY, timestamp INTEGER NOT NULL,
    feature TEXT NOT NULL, team TEXT, user_id TEXT,
    provider TEXT NOT NULL, model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL, input_cost REAL NOT NULL,
    output_cost REAL NOT NULL, total_cost REAL NOT NULL,
    latency_ms INTEGER, status TEXT DEFAULT 'success', metadata TEXT
  );
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY, feature TEXT NOT NULL, period TEXT NOT NULL,
    limit_usd REAL NOT NULL, alert_threshold REAL DEFAULT 0.8,
    webhook_url TEXT, email TEXT, created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY, budget_id TEXT, feature TEXT NOT NULL,
    type TEXT NOT NULL, message TEXT NOT NULL,
    current_spend REAL NOT NULL, threshold REAL NOT NULL,
    triggered_at INTEGER NOT NULL, resolved INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS model_pricing (
    provider TEXT NOT NULL, model TEXT NOT NULL,
    input_price_per_1k REAL NOT NULL, output_price_per_1k REAL NOT NULL,
    updated_at INTEGER NOT NULL, PRIMARY KEY (provider, model)
  );
`;

const DROP_TABLES = `
  DROP TABLE IF EXISTS cost_events;
  DROP TABLE IF EXISTS budgets;
  DROP TABLE IF EXISTS alerts;
  DROP TABLE IF EXISTS model_pricing;
`;

const sqlite = new Database(":memory:");
sqlite.exec(CREATE_TABLES);
const testDb = drizzle(sqlite, { schema });

vi.mock("@/db", () => ({
  get db() {
    return testDb;
  },
  get costEvents() {
    return schema.costEvents;
  },
  get budgets() {
    return schema.budgets;
  },
  get alerts() {
    return schema.alerts;
  },
  get modelPricing() {
    return schema.modelPricing;
  },
}));

vi.mock("@/db/helpers", () => ({
  resolvedFalse: () => sql`0`,
}));

afterAll(() => {
  sqlite.close();
});

const HOUR_MS = 60 * 60 * 1000;

function makeEvent(
  feature: string,
  targetCostUsd: number,
  overrides: Record<string, unknown> = {},
) {
  const outputTokens = Math.ceil((targetCostUsd / 0.01) * 1000);
  return {
    feature,
    provider: "openai",
    model: "gpt-4o",
    inputTokens: 0,
    outputTokens,
    totalTokens: outputTokens,
    ...overrides,
  };
}

async function postEvents(events: unknown[], auth = "Bearer tw_dev_key") {
  const { POST } = await import("../route");
  const req = new Request("http://localhost:3100/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body: JSON.stringify({ events }),
  });
  return POST(req);
}

function seedPricing() {
  testDb
    .insert(schema.modelPricing)
    .values({
      provider: "openai",
      model: "gpt-4o",
      inputPricePer1k: 0.0025,
      outputPricePer1k: 0.01,
      updatedAt: Date.now(),
    })
    .run();
}

function seedBudget(opts: {
  id: string;
  feature: string;
  limitUsd: number;
  alertThreshold?: number;
  period?: string;
}) {
  testDb
    .insert(schema.budgets)
    .values({
      id: opts.id,
      feature: opts.feature,
      period: opts.period ?? "daily",
      limitUsd: opts.limitUsd,
      alertThreshold: opts.alertThreshold ?? 0.8,
      createdAt: Date.now(),
    })
    .run();
}

function seedSteadyBaseline(feature: string, hourlyCostUsd: number) {
  const now = Date.now();
  const outputTokensPerEvent = Math.ceil((hourlyCostUsd / 0.01) * 1000);

  for (let h = 26; h <= 167; h++) {
    testDb
      .insert(schema.costEvents)
      .values({
        id: `baseline-${feature}-${h}`,
        timestamp: now - h * HOUR_MS,
        feature,
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 0,
        outputTokens: outputTokensPerEvent,
        totalTokens: outputTokensPerEvent,
        inputCost: 0,
        outputCost: hourlyCostUsd,
        totalCost: hourlyCostUsd,
        status: "success",
      })
      .run();
  }
}

function countAlerts(feature: string, type?: string): number {
  if (type) {
    return (
      sqlite
        .prepare(
          "SELECT COUNT(*) as cnt FROM alerts WHERE feature = ? AND type = ?",
        )
        .get(feature, type) as { cnt: number }
    ).cnt;
  }
  return (
    sqlite
      .prepare("SELECT COUNT(*) as cnt FROM alerts WHERE feature = ?")
      .get(feature) as { cnt: number }
  ).cnt;
}

describe("POST /api/events — budget alerts and anomaly detection", () => {
  beforeEach(() => {
    sqlite.exec(DROP_TABLES);
    sqlite.exec(CREATE_TABLES);
    seedPricing();
  });

  it("response always has correct shape", async () => {
    const res = await postEvents([makeEvent("shape-test", 0.01)]);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("accepted");
    expect(body).toHaveProperty("rejected");
    expect(body).toHaveProperty("alerts_triggered");
  });

  it("triggers budget_warning when spend reaches alert threshold", async () => {
    const feature = "warn-feature";
    seedBudget({ id: "b-warn", feature, limitUsd: 10, alertThreshold: 0.8 });
    seedSteadyBaseline(feature, 8.5);

    const res = await postEvents([makeEvent(feature, 8.5)]);
    const body = await res.json();

    expect(body.accepted).toBe(1);
    expect(body.alerts_triggered).toBeGreaterThanOrEqual(1);
    expect(countAlerts(feature, "budget_warning")).toBeGreaterThanOrEqual(1);
  });

  it("does NOT trigger budget_warning below threshold", async () => {
    const feature = "low-feature";
    seedBudget({ id: "b-low", feature, limitUsd: 10, alertThreshold: 0.8 });
    seedSteadyBaseline(feature, 5);

    const res = await postEvents([makeEvent(feature, 5)]);
    const body = await res.json();

    expect(body.alerts_triggered).toBe(0);
    expect(countAlerts(feature, "budget_warning")).toBe(0);
  });

  it("triggers budget_exceeded when spend exceeds limit", async () => {
    const feature = "exc-feature";
    seedBudget({ id: "b-exc", feature, limitUsd: 10 });
    seedSteadyBaseline(feature, 11);

    const res = await postEvents([makeEvent(feature, 11)]);
    const body = await res.json();

    expect(body.accepted).toBe(1);
    expect(countAlerts(feature, "budget_exceeded")).toBeGreaterThanOrEqual(1);
  });

  it("does not duplicate budget_exceeded alert in same period", async () => {
    const feature = "dup-feature";
    seedBudget({ id: "b-dup", feature, limitUsd: 5 });
    seedSteadyBaseline(feature, 6);

    await postEvents([makeEvent(feature, 6)]);
    expect(countAlerts(feature, "budget_exceeded")).toBe(1);

    await postEvents([makeEvent(feature, 1)]);
    expect(countAlerts(feature, "budget_exceeded")).toBe(1);
  });

  it("triggers anomaly when last-hour spend exceeds 3x average", async () => {
    const feature = "anomaly-feature";
    const now = Date.now();
    seedSteadyBaseline(feature, 1);

    const res = await postEvents([
      makeEvent(feature, 4, { timestamp: now - 5 * 60 * 1000 }),
    ]);
    const body = await res.json();

    expect(body.accepted).toBe(1);
    expect(countAlerts(feature, "anomaly")).toBeGreaterThanOrEqual(1);
  });

  it("does not trigger anomaly within 3x threshold", async () => {
    const feature = "no-anomaly-feature";
    const now = Date.now();
    seedSteadyBaseline(feature, 1);

    const res = await postEvents([
      makeEvent(feature, 2, { timestamp: now - 5 * 60 * 1000 }),
    ]);
    const body = await res.json();

    expect(body.alerts_triggered).toBe(0);
    expect(countAlerts(feature, "anomaly")).toBe(0);
  });

  it("does not duplicate anomaly alert within same hour", async () => {
    const feature = "dup-anomaly-feature";
    const now = Date.now();
    seedSteadyBaseline(feature, 1);

    await postEvents([
      makeEvent(feature, 4, { timestamp: now - 5 * 60 * 1000 }),
    ]);
    expect(countAlerts(feature, "anomaly")).toBe(1);

    await postEvents([
      makeEvent(feature, 1, { timestamp: now - 3 * 60 * 1000 }),
    ]);
    expect(countAlerts(feature, "anomaly")).toBe(1);
  });
});
