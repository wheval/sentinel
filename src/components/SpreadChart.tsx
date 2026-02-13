"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface SpreadChartProps {
  data: { time: number; value: number }[];
}

export function SpreadChart({ data }: SpreadChartProps) {
  const latest = data.length > 0 ? data[data.length - 1].value : 0;
  const color = latest < 0.05 ? "#10b981" : latest < 0.2 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">
          Spread Monitor
        </h3>
        <div className="font-mono text-lg font-bold" style={{ color }}>
          {latest.toFixed(4)}%
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.slice(-60)}>
            <defs>
              <linearGradient id="spreadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={false}
              axisLine={{ stroke: "#1e2733" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#484f58", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(3)}%`}
              domain={["auto", "auto"]}
              width={60}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-2 text-xs shadow-xl">
                    <span className="text-[#e6edf3] font-mono">
                      {Number(payload[0].value).toFixed(4)}%
                    </span>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill="url(#spreadGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
