import { db } from "@/db";
import { costEvents, budgets, alerts, modelPricing } from "@/db";
import { desc, eq, gte, sql, and, asc } from "drizzle-orm";
import { dateFromEpoch, resolvedFalse } from "@/db/helpers";

export type Period = "7d" | "30d" | "90d";

function periodStart(period: Period): number {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function previousPeriodStart(period: Period): number {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return Date.now() - 2 * days * 24 * 60 * 60 * 1000;
}

export async function getOverviewStats(period: Period) {
  const start = periodStart(period);
  const prevStart = previousPeriodStart(period);
  const [current] = await db.select({ totalCost: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)`, totalRequests: sql<number>`COUNT(*)` }).from(costEvents).where(gte(costEvents.timestamp, start));
  const [previous] = await db.select({ totalCost: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)` }).from(costEvents).where(and(gte(costEvents.timestamp, prevStart), sql`${costEvents.timestamp} < ${start}`));
  const avgCostPerReq = current.totalRequests > 0 ? current.totalCost / current.totalRequests : 0;
  const pctChange = previous.totalCost > 0 ? ((current.totalCost - previous.totalCost) / previous.totalCost) * 100 : 0;
  return { ...current, avgCostPerReq, pctChange };
}

export async function getDailySpend(period: Period) {
  const start = periodStart(period);
  return await db.select({ day: dateFromEpoch(costEvents.timestamp).as("day"), cost: sql<number>`SUM(${costEvents.totalCost})` }).from(costEvents).where(gte(costEvents.timestamp, start)).groupBy(dateFromEpoch(costEvents.timestamp)).orderBy(asc(sql`day`));
}

export async function getFeatureBreakdown(period: Period) {
  const start = periodStart(period);
  return await db.select({ feature: costEvents.feature, totalCost: sql<number>`SUM(${costEvents.totalCost})`, requests: sql<number>`COUNT(*)`, avgCost: sql<number>`AVG(${costEvents.totalCost})` }).from(costEvents).where(gte(costEvents.timestamp, start)).groupBy(costEvents.feature).orderBy(desc(sql`SUM(${costEvents.totalCost})`));
}

export async function getFeatureSparkline(feature: string, period: Period) {
  const start = periodStart(period);
  return await db.select({ day: dateFromEpoch(costEvents.timestamp).as("day"), cost: sql<number>`SUM(${costEvents.totalCost})` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, start))).groupBy(dateFromEpoch(costEvents.timestamp)).orderBy(asc(sql`day`));
}

export async function getFeatureDetail(feature: string, period: Period) {
  const start = periodStart(period);
  const costOverTime = await db.select({ day: dateFromEpoch(costEvents.timestamp).as("day"), cost: sql<number>`SUM(${costEvents.totalCost})` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, start))).groupBy(dateFromEpoch(costEvents.timestamp)).orderBy(asc(sql`day`));
  const modelBreakdown = await db.select({ model: costEvents.model, provider: costEvents.provider, totalCost: sql<number>`SUM(${costEvents.totalCost})`, requests: sql<number>`COUNT(*)` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, start))).groupBy(costEvents.model, costEvents.provider).orderBy(desc(sql`SUM(${costEvents.totalCost})`));
  const [recentRequestsCountRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(costEvents).where(eq(costEvents.feature, feature));
  const recentRequestsData = await db.select({ id: costEvents.id, timestamp: costEvents.timestamp, model: costEvents.model, provider: costEvents.provider, inputTokens: costEvents.inputTokens, outputTokens: costEvents.outputTokens, totalCost: costEvents.totalCost, latencyMs: costEvents.latencyMs, status: costEvents.status }).from(costEvents).where(eq(costEvents.feature, feature)).orderBy(desc(costEvents.timestamp)).limit(50);
  const recentRequests = { data: recentRequestsData, total: recentRequestsCountRow?.count ?? 0 };
  const [stats] = await db.select({ totalCost: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)`, totalRequests: sql<number>`COUNT(*)` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, start)));
  return { costOverTime, modelBreakdown, recentRequests, stats };
}

export async function getFeatureBudget(feature: string) {
  const [row] = await db.select().from(budgets).where(eq(budgets.feature, feature));
  return row;
}

export async function getActiveAlerts(opts?: { limit?: number; offset?: number }) {
  const lim = opts?.limit ?? 20;
  const off = opts?.offset ?? 0;
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(alerts).where(eq(alerts.resolved, resolvedFalse()));
  const data = await db.select().from(alerts).where(eq(alerts.resolved, resolvedFalse())).orderBy(desc(alerts.triggeredAt)).limit(lim).offset(off);
  return { data, total: countRow?.count ?? 0 };
}

export async function getAllBudgets(opts?: { limit?: number; offset?: number }) {
  const lim = opts?.limit ?? 50;
  const off = opts?.offset ?? 0;
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(budgets);
  const data = await db.select().from(budgets).orderBy(asc(budgets.feature)).limit(lim).offset(off);
  return { data, total: countRow?.count ?? 0 };
}

export async function getAlertHistory(opts?: { limit?: number; offset?: number }) {
  const lim = opts?.limit ?? 20;
  const off = opts?.offset ?? 0;
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(alerts);
  const data = await db.select().from(alerts).orderBy(desc(alerts.triggeredAt)).limit(lim).offset(off);
  return { data, total: countRow?.count ?? 0 };
}

export async function getModelPrice(provider: string, model: string) {
  const [row] = await db.select().from(modelPricing).where(and(eq(modelPricing.provider, provider), eq(modelPricing.model, model)));
  return row;
}

export async function getCurrentPeriodSpend(feature: string, period: string): Promise<number> {
  const now = Date.now();
  let start: number;
  if (period === "daily") start = now - 24 * 60 * 60 * 1000;
  else if (period === "weekly") start = now - 7 * 24 * 60 * 60 * 1000;
  else start = now - 30 * 24 * 60 * 60 * 1000;
  const [result] = await db.select({ total: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, start)));
  return result.total;
}

export async function getHourlyAverage7d(feature: string): Promise<number> {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [result] = await db.select({ total: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, sevenDaysAgo)));
  return result.total / (7 * 24);
}

export async function getLastHourSpend(feature: string): Promise<number> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const [result] = await db.select({ total: sql<number>`COALESCE(SUM(${costEvents.totalCost}), 0)` }).from(costEvents).where(and(eq(costEvents.feature, feature), gte(costEvents.timestamp, oneHourAgo)));
  return result.total;
}
