"use client";

import { useState } from "react";
import { createBudget } from "./actions";

export function BudgetForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-[var(--emerald)] px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90"
      >
        Add Budget
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="mb-4 text-sm font-semibold">Add Budget</h3>
        <form
          action={(formData) => {
            void createBudget(formData).then(() => setOpen(false));
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
              Feature Name
            </label>
            <input
              name="feature"
              required
              placeholder="e.g., support-bot"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Period
              </label>
              <select
                name="period"
                required
                defaultValue="monthly"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Limit (USD)
              </label>
              <input
                name="limitUsd"
                type="number"
                step="0.01"
                required
                placeholder="100.00"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
              Alert Threshold (%)
            </label>
            <input
              name="alertThreshold"
              type="number"
              defaultValue={80}
              min={1}
              max={100}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
              Webhook URL (optional)
            </label>
            <input
              name="webhookUrl"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
              Email (optional)
            </label>
            <input
              name="email"
              type="email"
              placeholder="team@company.com"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[var(--emerald)] px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
