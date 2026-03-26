"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

type SparklineProps = { data: { day: string; cost: number }[] };

export function Sparkline({ data }: SparklineProps) {
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type SpendChartProps = { data: { day: string; cost: number }[] };

export function SpendAreaChart({ data }: SpendChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tickFormatter={(v: string) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v: number) => `$${v.toFixed(0)}`} stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} width={50} />
          <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-geist-mono)" }} labelFormatter={(v: string) => new Date(v).toLocaleDateString()} formatter={(value: number) => [`$${value.toFixed(2)}`, "Spend"]} />
          <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} fill="url(#colorCost)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type CostLineChartProps = { data: { day: string; cost: number }[]; budgetLimit?: number };

export function CostLineChart({ data, budgetLimit }: CostLineChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="day" tickFormatter={(v: string) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v: number) => `$${v.toFixed(2)}`} stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} width={55} />
          <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-geist-mono)" }} formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]} />
          <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} dot={false} />
          {budgetLimit !== undefined && (
            <Line type="monotone" dataKey={() => budgetLimit} stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Budget" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type ModelDonutProps = { data: { model: string; totalCost: number }[] };

export function ModelDonutChart({ data }: ModelDonutProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="totalCost" nameKey="model" paddingAngle={2}>
            {data.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "13px", fontFamily: "var(--font-geist-mono)" }} formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
        {data.map((item, i) => (
          <div key={item.model} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-[var(--muted-foreground)]">{item.model}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
