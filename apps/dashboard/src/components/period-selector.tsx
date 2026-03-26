"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Period } from "@/lib/queries";

const periods: { label: string; value: Period }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("period") as Period) ?? "30d";

  return (
    <div className="flex rounded-md border border-[var(--border)] bg-[var(--card)]">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => router.push(`?period=${p.value}`)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            current === p.value
              ? "bg-[var(--accent)] text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
