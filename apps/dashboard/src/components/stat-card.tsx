type StatCardProps = {
  label: string;
  value: string;
  subValue?: string;
  trend?: { value: string; positive: boolean };
};

export function StatCard({ label, value, subValue, trend }: StatCardProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {trend && (
          <span className={`font-[family-name:var(--font-geist-mono)] text-xs font-medium ${trend.positive ? "text-[var(--emerald)]" : "text-[var(--red)]"}`}>{trend.value}</span>
        )}
        {subValue && <span className="text-xs text-[var(--muted-foreground)]">{subValue}</span>}
      </div>
    </div>
  );
}
