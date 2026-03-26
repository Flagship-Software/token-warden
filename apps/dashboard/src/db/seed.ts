import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { modelPricing } from "./schema.sqlite";
import { join } from "path";
import { mkdirSync } from "fs";

const dataDir = join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(join(dataDir, "warden.db"));
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

const now = Date.now();

const prices = [
  { provider: "openai", model: "gpt-4o", inputPricePer1k: 0.0025, outputPricePer1k: 0.01, updatedAt: now },
  { provider: "openai", model: "gpt-4o-mini", inputPricePer1k: 0.00015, outputPricePer1k: 0.0006, updatedAt: now },
  { provider: "openai", model: "gpt-4.1", inputPricePer1k: 0.002, outputPricePer1k: 0.008, updatedAt: now },
  { provider: "openai", model: "gpt-4.1-mini", inputPricePer1k: 0.0004, outputPricePer1k: 0.0016, updatedAt: now },
  { provider: "openai", model: "gpt-4.1-nano", inputPricePer1k: 0.0001, outputPricePer1k: 0.0004, updatedAt: now },
  { provider: "openai", model: "o3", inputPricePer1k: 0.01, outputPricePer1k: 0.04, updatedAt: now },
  { provider: "openai", model: "o3-mini", inputPricePer1k: 0.0011, outputPricePer1k: 0.0044, updatedAt: now },
  { provider: "openai", model: "o4-mini", inputPricePer1k: 0.0011, outputPricePer1k: 0.0044, updatedAt: now },
  { provider: "openai", model: "gpt-4.5-preview", inputPricePer1k: 0.075, outputPricePer1k: 0.15, updatedAt: now },
  { provider: "anthropic", model: "claude-opus-4-20250514", inputPricePer1k: 0.015, outputPricePer1k: 0.075, updatedAt: now },
  { provider: "anthropic", model: "claude-opus-4-6-20260301", inputPricePer1k: 0.015, outputPricePer1k: 0.075, updatedAt: now },
  { provider: "anthropic", model: "claude-sonnet-4-20250514", inputPricePer1k: 0.003, outputPricePer1k: 0.015, updatedAt: now },
  { provider: "anthropic", model: "claude-sonnet-4-6-20260301", inputPricePer1k: 0.003, outputPricePer1k: 0.015, updatedAt: now },
  { provider: "anthropic", model: "claude-haiku-4-5-20251001", inputPricePer1k: 0.0008, outputPricePer1k: 0.004, updatedAt: now },
  { provider: "anthropic", model: "claude-3-5-haiku-20241022", inputPricePer1k: 0.0008, outputPricePer1k: 0.004, updatedAt: now },
  { provider: "google", model: "gemini-2.5-pro", inputPricePer1k: 0.00125, outputPricePer1k: 0.01, updatedAt: now },
  { provider: "google", model: "gemini-2.5-flash", inputPricePer1k: 0.00015, outputPricePer1k: 0.0035, updatedAt: now },
  { provider: "google", model: "gemini-2.0-flash", inputPricePer1k: 0.0001, outputPricePer1k: 0.0004, updatedAt: now },
  { provider: "google", model: "gemini-2.0-flash-lite", inputPricePer1k: 0.000075, outputPricePer1k: 0.0003, updatedAt: now },
  { provider: "google", model: "gemini-1.5-pro", inputPricePer1k: 0.00125, outputPricePer1k: 0.005, updatedAt: now },
  { provider: "google", model: "gemini-1.5-flash", inputPricePer1k: 0.000075, outputPricePer1k: 0.0003, updatedAt: now },
  { provider: "deepseek", model: "deepseek-chat", inputPricePer1k: 0.00027, outputPricePer1k: 0.0011, updatedAt: now },
  { provider: "deepseek", model: "deepseek-reasoner", inputPricePer1k: 0.00055, outputPricePer1k: 0.0022, updatedAt: now },
  { provider: "mistral", model: "mistral-large-latest", inputPricePer1k: 0.002, outputPricePer1k: 0.006, updatedAt: now },
  { provider: "mistral", model: "mistral-small-latest", inputPricePer1k: 0.0002, outputPricePer1k: 0.0006, updatedAt: now },
  { provider: "mistral", model: "codestral-latest", inputPricePer1k: 0.0003, outputPricePer1k: 0.0009, updatedAt: now },
  { provider: "meta", model: "llama-4-scout", inputPricePer1k: 0.00015, outputPricePer1k: 0.0006, updatedAt: now },
  { provider: "meta", model: "llama-4-maverick", inputPricePer1k: 0.0003, outputPricePer1k: 0.0009, updatedAt: now },
  { provider: "meta", model: "llama-3.3-70b", inputPricePer1k: 0.00059, outputPricePer1k: 0.00079, updatedAt: now },
  { provider: "xai", model: "grok-3", inputPricePer1k: 0.003, outputPricePer1k: 0.015, updatedAt: now },
  { provider: "xai", model: "grok-3-mini", inputPricePer1k: 0.0003, outputPricePer1k: 0.0005, updatedAt: now },
  { provider: "cohere", model: "command-r-plus", inputPricePer1k: 0.0025, outputPricePer1k: 0.01, updatedAt: now },
  { provider: "cohere", model: "command-r", inputPricePer1k: 0.00015, outputPricePer1k: 0.0006, updatedAt: now },
  { provider: "amazon", model: "amazon.nova-pro-v1:0", inputPricePer1k: 0.0008, outputPricePer1k: 0.0032, updatedAt: now },
  { provider: "amazon", model: "amazon.nova-lite-v1:0", inputPricePer1k: 0.00006, outputPricePer1k: 0.00024, updatedAt: now },
];

for (const price of prices) {
  db.insert(modelPricing)
    .values(price)
    .onConflictDoUpdate({
      target: [modelPricing.provider, modelPricing.model],
      set: {
        inputPricePer1k: price.inputPricePer1k,
        outputPricePer1k: price.outputPricePer1k,
        updatedAt: price.updatedAt,
      },
    })
    .run();
}

console.log(`Seeded ${prices.length} model pricing entries.`);
sqlite.close();
