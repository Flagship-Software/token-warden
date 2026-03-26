import {
  pgTable,
  text,
  integer,
  bigint,
  doublePrecision,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

export const costEvents = pgTable("cost_events", {
  id: text("id").primaryKey(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  feature: text("feature").notNull(),
  team: text("team"),
  userId: text("user_id"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  inputCost: doublePrecision("input_cost").notNull(),
  outputCost: doublePrecision("output_cost").notNull(),
  totalCost: doublePrecision("total_cost").notNull(),
  latencyMs: integer("latency_ms"),
  status: text("status").default("success"),
  metadata: text("metadata"),
});

export const budgets = pgTable("budgets", {
  id: text("id").primaryKey(),
  feature: text("feature").notNull(),
  period: text("period").notNull(),
  limitUsd: doublePrecision("limit_usd").notNull(),
  alertThreshold: doublePrecision("alert_threshold").default(0.8),
  webhookUrl: text("webhook_url"),
  email: text("email"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const alerts = pgTable("alerts", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id"),
  feature: text("feature").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  currentSpend: doublePrecision("current_spend").notNull(),
  threshold: doublePrecision("threshold").notNull(),
  triggeredAt: bigint("triggered_at", { mode: "number" }).notNull(),
  resolved: boolean("resolved").default(false),
});

export const modelPricing = pgTable(
  "model_pricing",
  {
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputPricePer1k: doublePrecision("input_price_per_1k").notNull(),
    outputPricePer1k: doublePrecision("output_price_per_1k").notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.provider, table.model] })],
);
