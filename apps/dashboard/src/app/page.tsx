import Link from "next/link";
import {
  getOverviewStats,
  getDailySpend,
  getFeatureBreakdown,
  getFeatureSparkline,
  getActiveAlerts,
} from "@/lib/queries";
import type { Period } from "@/lib/queries";
import { formatUsd, formatNumber, formatPct } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { SpendAreaChart, Sparkline } from "@/components/charts";
import { PeriodSelector } from "@/components/period-selector";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = (
    ["7d", "30d", "90d"].includes(periodParam ?? "") ? periodParam : "30d"
  ) as Period;

  const stats = await getOverviewStats(period);
  const dailySpend = await getDailySpend(period);
  const features = await getFeatureBreakdown(period);
  const { data: activeAlerts } = await getActiveAlerts();

  const totalCost = features.reduce((sum, f) => sum + f.totalCost, 0);

  const featuresWithSparklines = await Promise.all(
    features.map(async (f) => ({
      ...f,
      sparkline: await getFeatureSparkline(f.feature, period),
    })),
  );

  return (
    <div className="space-y-6">
      {activeAlerts.length > 0 && (
        <div
          className={`rounded-lg border px-4 py-3 ${
            activeAlerts.some(
              (a) => a.type === "budget_exceeded" || a.type === "anomaly",
            )
              ? "border-[var(--red)] bg-[var(--red-muted)]"
              : "border-[var(--amber)] bg-[var(--amber-muted)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {activeAlerts.length} active alert
                {activeAlerts.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {activeAlerts[0].message}
              </span>
            </div>
            <Link
              href="/alerts"
              className="text-xs font-medium text-[var(--foreground)] hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <PeriodSelector />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Spend"
          value={formatUsd(stats.totalCost)}
          trend={{
            value: formatPct(stats.pctChange),
            positive: stats.pctChange <= 0,
          }}
          subValue={`vs. previous ${period}`}
        />
        <StatCard
          label="Total Requests"
          value={formatNumber(stats.totalRequests)}
        />
        <StatCard
          label="Avg Cost / Request"
          value={formatUsd(stats.avgCostPerReq)}
        />
        <StatCard label="Active Features" value={String(features.length)} />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="mb-4 text-sm font-medium text-[var(--muted-foreground)]">
          Daily Spend
        </h2>
        <SpendAreaChart data={dailySpend} />
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--muted-foreground)]">
            Cost by Feature
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <th className="px-4 py-2.5 font-medium">Feature</th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Total Cost
                </th>
                <th className="px-4 py-2.5 font-medium text-right">
                  % of Total
                </th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Requests
                </th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Avg Cost/Req
                </th>
                <th className="px-4 py-2.5 font-medium text-right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {featuresWithSparklines.map((f) => (
                <tr
                  key={f.feature}
                  className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--accent)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/features/${encodeURIComponent(f.feature)}`}
                      className="font-medium hover:underline"
                    >
                      {f.feature}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)]">
                    {formatUsd(f.totalCost)}
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-[var(--muted-foreground)]">
                    {totalCost > 0
                      ? ((f.totalCost / totalCost) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)]">
                    {formatNumber(f.requests)}
                  </td>
                  <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-[var(--muted-foreground)]">
                    {formatUsd(f.avgCost)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <Sparkline data={f.sparkline} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
