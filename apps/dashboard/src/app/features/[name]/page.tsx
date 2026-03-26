import Link from "next/link";
import { getFeatureDetail, getFeatureBudget } from "@/lib/queries";
import type { Period } from "@/lib/queries";
import {
  formatUsd,
  formatNumber,
  formatDate,
  formatLatency,
} from "@/lib/format";
import { CostLineChart, ModelDonutChart } from "@/components/charts";
import { StatCard } from "@/components/stat-card";
import { PeriodSelector } from "@/components/period-selector";

export default async function FeatureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { name } = await params;
  const { period: periodParam } = await searchParams;
  const feature = decodeURIComponent(name);
  const period = (
    ["7d", "30d", "90d"].includes(periodParam ?? "") ? periodParam : "30d"
  ) as Period;

  const detail = await getFeatureDetail(feature, period);
  const budget = await getFeatureBudget(feature);

  const budgetProgress = budget
    ? (detail.stats.totalCost / budget.limitUsd) * 100
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            &larr; Dashboard
          </Link>
          <span className="text-[var(--muted-foreground)]">/</span>
          <h1 className="text-xl font-semibold tracking-tight">{feature}</h1>
        </div>
        <PeriodSelector />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Cost"
          value={formatUsd(detail.stats.totalCost)}
        />
        <StatCard
          label="Total Requests"
          value={formatNumber(detail.stats.totalRequests)}
        />
        <StatCard
          label="Avg Cost / Request"
          value={formatUsd(
            detail.stats.totalRequests > 0
              ? detail.stats.totalCost / detail.stats.totalRequests
              : 0,
          )}
        />
      </div>

      {budget && budgetProgress !== null && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">
              {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)}{" "}
              Budget
            </span>
            <span className="font-[family-name:var(--font-geist-mono)]">
              {formatUsd(detail.stats.totalCost)} /{" "}
              {formatUsd(budget.limitUsd)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--muted)]">
            <div
              className={`h-full rounded-full transition-all ${
                budgetProgress >= 100
                  ? "bg-[var(--red)]"
                  : budgetProgress >= 80
                    ? "bg-[var(--amber)]"
                    : "bg-[var(--emerald)]"
              }`}
              style={{ width: `${Math.min(budgetProgress, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-right font-[family-name:var(--font-geist-mono)] text-xs text-[var(--muted-foreground)]">
            {budgetProgress.toFixed(1)}%
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-4 text-sm font-medium text-[var(--muted-foreground)]">
            Cost Over Time
          </h2>
          <CostLineChart
            data={detail.costOverTime}
            budgetLimit={budget?.limitUsd}
          />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="mb-4 text-sm font-medium text-[var(--muted-foreground)]">
            Model Usage
          </h2>
          <ModelDonutChart data={detail.modelBreakdown} />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--muted-foreground)]">
            Recent Requests
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <th className="px-4 py-2.5 font-medium">Timestamp</th>
                <th className="px-4 py-2.5 font-medium">Model</th>
                <th className="px-4 py-2.5 font-medium text-right">Input</th>
                <th className="px-4 py-2.5 font-medium text-right">Output</th>
                <th className="px-4 py-2.5 font-medium text-right">Cost</th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Latency
                </th>
                <th className="px-4 py-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.recentRequests.data.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--muted-foreground)]">
                    {formatDate(r.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{r.model}</td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-geist-mono)] text-xs">
                    {formatNumber(r.inputTokens)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-geist-mono)] text-xs">
                    {formatNumber(r.outputTokens)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-geist-mono)] text-xs">
                    {formatUsd(r.totalCost)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-geist-mono)] text-xs text-[var(--muted-foreground)]">
                    {formatLatency(r.latencyMs)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        r.status === "success"
                          ? "bg-[var(--emerald-muted)] text-[var(--emerald)]"
                          : "bg-[var(--red-muted)] text-[var(--red)]"
                      }`}
                    >
                      {r.status}
                    </span>
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
