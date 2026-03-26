import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { costEvents, budgets } from "./schema.sqlite";
import { join } from "path";
import { ulid } from "ulid";

const dataDir = join(process.cwd(), "data");
const sqlite = new Database(join(dataDir, "warden.db"));
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

const features = [
  "support-bot",
  "autocomplete",
  "summarizer",
  "code-review",
  "email-drafter",
];
const models: {
  provider: string;
  model: string;
  inputPer1k: number;
  outputPer1k: number;
}[] = [
  { provider: "openai", model: "gpt-4o", inputPer1k: 0.0025, outputPer1k: 0.01 },
  { provider: "openai", model: "gpt-4o-mini", inputPer1k: 0.00015, outputPer1k: 0.0006 },
  { provider: "anthropic", model: "claude-sonnet-4-20250514", inputPer1k: 0.003, outputPer1k: 0.015 },
  { provider: "google", model: "gemini-2.0-flash", inputPer1k: 0.0001, outputPer1k: 0.0004 },
];

const featureWeights: Record<string, number> = {
  "support-bot": 40, autocomplete: 25, summarizer: 15, "code-review": 12, "email-drafter": 8,
};

const featureModels: Record<string, number[]> = {
  "support-bot": [0, 2], autocomplete: [1, 3], summarizer: [0, 2], "code-review": [2], "email-drafter": [1, 3],
};

const now = Date.now();
const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
const events: (typeof costEvents.$inferInsert)[] = [];

for (let t = thirtyDaysAgo; t < now; t += 15 * 60 * 1000) {
  for (const feature of features) {
    const weight = featureWeights[feature];
    if (Math.random() * 100 > weight) continue;

    const modelIdxs = featureModels[feature];
    const modelIdx = modelIdxs[Math.floor(Math.random() * modelIdxs.length)];
    const m = models[modelIdx];

    const inputTokens = Math.floor(200 + Math.random() * 2800);
    const outputTokens = Math.floor(50 + Math.random() * 1500);
    const totalTokens = inputTokens + outputTokens;
    const inputCost = (inputTokens / 1000) * m.inputPer1k;
    const outputCost = (outputTokens / 1000) * m.outputPer1k;

    events.push({
      id: ulid(t),
      timestamp: t + Math.floor(Math.random() * 15 * 60 * 1000),
      feature,
      provider: m.provider,
      model: m.model,
      inputTokens,
      outputTokens,
      totalTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      latencyMs: Math.floor(200 + Math.random() * 3000),
      status: Math.random() > 0.02 ? "success" : "error",
    });
  }
}

for (const event of events) {
  db.insert(costEvents).values(event).onConflictDoNothing().run();
}

console.log(`Seeded ${events.length} demo cost events across ${features.length} features.`);

const budgetData: (typeof budgets.$inferInsert)[] = [
  { id: ulid(), feature: "support-bot", period: "monthly", limitUsd: 500, alertThreshold: 0.8, createdAt: now },
  { id: ulid(), feature: "autocomplete", period: "monthly", limitUsd: 200, alertThreshold: 0.8, createdAt: now },
  { id: ulid(), feature: "summarizer", period: "weekly", limitUsd: 50, alertThreshold: 0.8, createdAt: now },
];

for (const b of budgetData) {
  db.insert(budgets).values(b).onConflictDoNothing().run();
}

console.log(`Seeded ${budgetData.length} demo budgets.`);
sqlite.close();
