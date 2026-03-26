import {
  getAllBudgets,
  getAlertHistory,
  getCurrentPeriodSpend,
} from "@/lib/queries";
import { formatUsd, formatDate } from "@/lib/format";
import { BudgetForm } from "./budget-form";
import { AlertActions } from "./alert-actions";

export default async function AlertsPage() {
  const { data: budgetList } = await getAllBudgets();
  const { data: alertHistory } = await getAlertHistory();

  const budgetsWithSpend = await Promise.all(
    budgetList.map(async (b) => {
      const currentSpend = await getCurrentPeriodSpend(b.feature, b.period);
      return {
        ...b,
        currentSpend,
        progress: (currentSpend / b.limitUsd) * 100,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Alerts & Budgets
      </h1>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--muted-foreground)]">
            Budgets
          </h2>
          <BudgetForm />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <th className="px-4 py-2.5 font-medium">Feature</th>
                <th className="px-4 py-2.5 font-medium">Period</th>
                <th className="px-4 py-2.5 font-medium text-right">Limit</th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Current Spend
                </th>
                <th className="px-4 py-2.5 font-medium">Progress</th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Alert At
                </th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {budgetsWithSpend.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium">{b.feature}</td>
                  <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                    {b.period}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-geist-mono)]">
                    {formatUsd(b.limitUsd)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-geist-mono)]">
                    {formatUsd(b.currentSpend)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-[var(--muted)]">
                        <div
                          className={`h-full rounded-full ${
                            b.progress >= 100
                              ? "bg-[var(--red)]"
                              : b.progress >= 80
                                ? "bg-[var(--amber)]"
                                : "bg-[var(--emerald)]"
                          }`}
                          style={{
                            width: `${Math.min(b.progress, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--muted-foreground)]">
                        {b.progress.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-geist-mono)] text-xs text-[var(--muted-foreground)]">
                    {((b.alertThreshold ?? 0.8) * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <AlertActions budgetId={b.id} type="budget" />
                  </td>
                </tr>
              ))}
              {budgetsWithSpend.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]"
                  >
                    No budgets configured. Add one to start tracking costs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--muted-foreground)]">
            Alert History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Feature</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Message</th>
                <th className="px-4 py-2.5 font-medium text-right">Spend</th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Status
                </th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {alertHistory.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--muted-foreground)]">
                    {formatDate(a.triggeredAt)}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{a.feature}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        a.type === "anomaly"
                          ? "bg-[var(--red-muted)] text-[var(--red)]"
                          : a.type === "budget_exceeded"
                            ? "bg-[var(--red-muted)] text-[var(--red)]"
                            : "bg-[var(--amber-muted)] text-[var(--amber)]"
                      }`}
                    >
                      {a.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-xs text-[var(--muted-foreground)]">
                    {a.message}
                  </td>
                  <td className="px-4 py-2.5 text-right font-[family-name:var(--font-geist-mono)] text-xs">
                    {formatUsd(a.currentSpend)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        a.resolved
                          ? "bg-[var(--emerald-muted)] text-[var(--emerald)]"
                          : "bg-[var(--amber-muted)] text-[var(--amber)]"
                      }`}
                    >
                      {a.resolved ? "resolved" : "active"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!a.resolved && (
                      <AlertActions alertId={a.id} type="alert" />
                    )}
                  </td>
                </tr>
              ))}
              {alertHistory.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]"
                  >
                    No alerts triggered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
