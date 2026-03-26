"use client";

import { deleteBudget, resolveAlert } from "./actions";

type AlertActionsProps = {
  budgetId?: string;
  alertId?: string;
  type: "budget" | "alert";
};

export function AlertActions({ budgetId, alertId, type }: AlertActionsProps) {
  if (type === "budget" && budgetId) {
    return (
      <button
        onClick={() => void deleteBudget(budgetId)}
        className="text-xs text-[var(--red)] hover:underline"
      >
        Delete
      </button>
    );
  }

  if (type === "alert" && alertId) {
    return (
      <button
        onClick={() => void resolveAlert(alertId)}
        className="text-xs text-[var(--emerald)] hover:underline"
      >
        Resolve
      </button>
    );
  }

  return null;
}
