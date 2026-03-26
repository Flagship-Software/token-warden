import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const costEvents = sqliteTable("cost_events", {
  id: text("id").primaryKey(),
  timestamp: integer("timestamp").notNull(),
  feature: text("feature").notNull(),
  team: text("team"),
  userId: text("user_id"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  inputCost: real("input_cost").notNull(),
  outputCost: real("output_cost").notNull(),
  totalCost: real("total_cost").notNull(),
  latencyMs: integer("latency_ms"),
  status: text("status").default("success"),
  metadata: text("metadata"),
});

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  feature: text("feature").notNull(),
  period: text("period").notNull(),
  limitUsd: real("limit_usd").notNull(),
  alertThreshold: real("alert_threshold").default(0.8),
  webhookUrl: text("webhook_url"),
  email: text("email"),
  createdAt: integer("created_at").notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id"),
  feature: text("feature").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  currentSpend: real("current_spend").notNull(),
  threshold: real("threshold").notNull(),
  triggeredAt: integer("triggered_at").notNull(),
  resolved: integer("resolved").default(0),
});

export const modelPricing = sqliteTable(
  "model_pricing",
  {
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputPricePer1k: real("input_price_per_1k").notNull(),
    outputPricePer1k: real("output_price_per_1k").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.provider, table.model] })],
);
