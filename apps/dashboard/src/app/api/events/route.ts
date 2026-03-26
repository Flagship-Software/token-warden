import { NextResponse } from "next/server";
import { db } from "@/db";
import { costEvents, budgets, alerts, modelPricing } from "@/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { resolvedFalse } from "@/db/helpers";

type IncomingEvent = {
  feature: string;
  team?: string;
  userId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs?: number;
  status?: "success" | "error";
  timestamp?: number;
  metadata?: Record<string, unknown>;
};

function validateEvent(event: unknown): { valid: boolean; reason?: string } {
  if (!event || typeof event !== "object") return { valid: false, reason: "not an object" };
  const e = event as Record<string, unknown>;
  if (!e.feature || typeof e.feature !== "string") return { valid: false, reason: "missing feature" };
  if (!e.provider || typeof e.provider !== "string") return { valid: false, reason: "missing provider" };
  if (!e.model || typeof e.model !== "string") return { valid: false, reason: "missing model" };
  if (typeof e.inputTokens !== "number" || e.inputTokens < 0) return { valid: false, reason: "invalid inputTokens" };
  if (typeof e.outputTokens !== "number" || e.outputTokens < 0) return { valid: false, reason: "invalid outputTokens" };
  if (typeof e.totalTokens !== "number" || e.totalTokens < 0) return { valid: false, reason: "invalid totalTokens" };
  return { valid: true };
}

export async function POST(request: Request) {
  const apiKey = process.env.WARDEN_API_KEY ?? "tw_dev_key";
  if (apiKey === "tw_dev_key") {
    console.warn("\u26a0\ufe0f Token Warden: Using default API key \u2014 set WARDEN_API_KEY for production");
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { events?: IncomingEvent[] };
  const events: IncomingEvent[] = body.events ?? [];

  if (events.length === 0) {
    return NextResponse.json({ accepted: 0, rejected: 0, alerts_triggered: 0 });
  }

  let accepted = 0;
  let rejected = 0;
  const featuresInBatch = new Set<string>();

  for (const event of events) {
    const validation = validateEvent(event);
    if (!validation.valid) { rejected++; continue; }
    try {
      const [pricing] = await db.select().from(modelPricing).where(and(eq(modelPricing.provider, event.provider), eq(modelPricing.model, event.model)));
      const inputCost = pricing ? (event.inputTokens / 1000) * pricing.inputPricePer1k : 0;
      const outputCost = pricing ? (event.outputTokens / 1000) * pricing.outputPricePer1k : 0;
      const totalCost = inputCost + outputCost;

      await db.insert(costEvents).values({
        id: ulid(), timestamp: event.timestamp ?? Date.now(), feature: event.feature, team: event.team, userId: event.userId,
        provider: event.provider, model: event.model, inputTokens: event.inputTokens, outputTokens: event.outputTokens, totalTokens: event.totalTokens,
        inputCost, outputCost, totalCost, latencyMs: event.latencyMs, status: event.status ?? "success",
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      });

      featuresInBatch.add(event.feature);
      accepted++;
    } catch { rejected++; }
  }

  let alertsTriggered = 0;

  for (const feature of featuresInBatch) {
    const featureBudgets = await db.select().from(budgets).where(eq(budgets.feature, feature));

    for (const budget of featureBudgets) {
      const now = Date.now();
      let periodStart: number;
      if (budget.period === "daily") periodStart = now - 24 * 60 * 60 * 1000;
      else if (budget.period === "weekly") periodStart = now - 7 * 24 * 60 * 60 * 1000;
      else periodStart = now - 30 * 24 * 60 * 60 * 1000;

      const [spend] = await db.select({ total: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, periodStart)));
      const threshold = budget.alertThreshold ?? 0.8;
      const thresholdAmount = budget.limitUsd * threshold;

      const [existingAlert] = await db.select().from(alerts).where(and(eq(alerts.budgetId, budget.id), eq(alerts.resolved, resolvedFalse()), gte(alerts.triggeredAt, periodStart)));

      if (!existingAlert) {
        if (spend.total >= budget.limitUsd) {
          await db.insert(alerts).values({ id: ulid(), budgetId: budget.id, feature, type: "budget_exceeded", message: `${feature} exceeded ${budget.period} budget of $${budget.limitUsd.toFixed(2)}. Current spend: $${spend.total.toFixed(2)}.`, currentSpend: spend.total, threshold: budget.limitUsd, triggeredAt: now });
          alertsTriggered++;
          if (budget.webhookUrl) { void fireWebhook(budget.webhookUrl, { feature, type: "budget_exceeded", current_spend: spend.total, limit: budget.limitUsd, message: `${feature} exceeded ${budget.period} budget of $${budget.limitUsd.toFixed(2)}` }); }
        } else if (spend.total >= thresholdAmount) {
          await db.insert(alerts).values({ id: ulid(), budgetId: budget.id, feature, type: "budget_warning", message: `${feature} has reached ${((spend.total / budget.limitUsd) * 100).toFixed(0)}% of ${budget.period} budget ($${spend.total.toFixed(2)} / $${budget.limitUsd.toFixed(2)}).`, currentSpend: spend.total, threshold: thresholdAmount, triggeredAt: now });
          alertsTriggered++;
          if (budget.webhookUrl) { void fireWebhook(budget.webhookUrl, { feature, type: "budget_warning", current_spend: spend.total, limit: budget.limitUsd, message: `${feature} at ${((spend.total / budget.limitUsd) * 100).toFixed(0)}% of ${budget.period} budget` }); }
        }
      }
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const [weeklyTotal] = await db.select({ total: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, sevenDaysAgo)));
    const hourlyAvg = weeklyTotal.total / (7 * 24);
    const [lastHour] = await db.select({ total: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, oneHourAgo)));

    if (hourlyAvg > 0 && lastHour.total > hourlyAvg * 3) {
      const [existingAnomaly] = await db.select().from(alerts).where(and(eq(alerts.feature, feature), eq(alerts.type, "anomaly"), eq(alerts.resolved, resolvedFalse()), gte(alerts.triggeredAt, oneHourAgo)));
      if (!existingAnomaly) {
        await db.insert(alerts).values({ id: ulid(), feature, type: "anomaly", message: `${feature} cost spike detected: $${lastHour.total.toFixed(4)}/hr vs $${hourlyAvg.toFixed(4)}/hr average (${(lastHour.total / hourlyAvg).toFixed(1)}x).`, currentSpend: lastHour.total, threshold: hourlyAvg * 3, triggeredAt: Date.now() });
        alertsTriggered++;
      }
    }
  }

  return NextResponse.json({ accepted, rejected, alerts_triggered: alertsTriggered });
}

async function fireWebhook(url: string, payload: { feature: string; type: string; current_spend: number; limit: number; message: string }) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: payload.message,
        blocks: [{ type: "section", text: { type: "mrkdwn", text: `*${payload.type === "budget_exceeded" ? ":rotating_light:" : ":warning:"} Token Warden Alert*\n*Feature:* ${payload.feature}\n*Type:* ${payload.type}\n*Current Spend:* $${payload.current_spend.toFixed(2)}\n*Budget Limit:* $${payload.limit.toFixed(2)}` } }],
      }),
    });
  } catch { /* Best-effort delivery */ }
}
