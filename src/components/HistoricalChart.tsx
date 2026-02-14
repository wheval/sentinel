"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { HistoryPoint } from "@/lib/history";

interface HistoricalChartProps {
  data: HistoryPoint[];
  label: string;
  color: string;
  formatValue?: (v: number) => string;
  domain?: [number | string, number | string];
}

export function HistoricalChart({
  data,
  label,
  color,
  formatValue,
  domain,
}: HistoricalChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider mb-4">
          {label}
        </h3>
        <div className="flex items-center justify-center h-32 text-xs text-[#484f58]">
          Collecting data... ({data.length} points)
        </div>
      </div>
    );
  }

  const latest = data[data.length - 1].v;
  const oldest = data[0].v;
  const change = latest - oldest;
  const changeColor = change > 0 ? "#ef4444" : change < 0 ? "#10b981" : "#8b949e";

  const formatTime = (t: number) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">
          {label}
        </h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold" style={{ color }}>
            {formatValue ? formatValue(latest) : latest.toFixed(1)}
          </span>
          <span className="text-xs font-mono" style={{ color: changeColor }}>
            {change >= 0 ? "+" : ""}
            {formatValue ? formatValue(change) : change.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tick={{ fill: "#484f58", fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: "#1e2733" }}
              tickFormatter={formatTime}
              minTickGap={60}
            />
            <YAxis
              tick={{ fill: "#484f58", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              domain={domain || ["auto", "auto"]}
              width={45}
              tickFormatter={(v: number) =>
                formatValue ? formatValue(v) : v.toFixed(1)
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const pt = payload[0].payload as HistoryPoint;
                return (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-2 text-xs shadow-xl">
                    <div className="text-[#484f58]">
                      {new Date(pt.t).toLocaleTimeString()}
                    </div>
                    <div className="font-mono" style={{ color }}>
                      {formatValue ? formatValue(pt.v) : pt.v.toFixed(2)}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${label})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between mt-2 text-xs text-[#484f58]">
        <span>{data.length} data points</span>
        <span>
          {formatTime(data[0].t)} — {formatTime(data[data.length - 1].t)}
        </span>
      </div>
    </div>
  );
}
