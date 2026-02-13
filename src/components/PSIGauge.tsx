"use client";

import { PSIResult } from "@/lib/types";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface PSIGaugeProps {
  psi: PSIResult;
  history: { time: number; value: number }[];
}

export function PSIGauge({ psi, history }: PSIGaugeProps) {
  const { value, level, components, trend } = psi;

  // Arc calculation for the gauge
  const gaugeAngle = (value / 100) * 180; // 0-180 degrees
  const radius = 90;
  const cx = 100;
  const cy = 100;

  // Convert angle to radians (starting from left)
  const startAngle = Math.PI;
  const endAngle = Math.PI - (gaugeAngle * Math.PI) / 180;
  const needleX = cx + radius * 0.75 * Math.cos(endAngle);
  const needleY = cy - radius * 0.75 * Math.sin(endAngle);

  const colorMap = {
    stable: { main: "#10b981", bg: "rgba(16,185,129,0.1)", label: "STABLE" },
    moderate: { main: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "MODERATE" },
    critical: { main: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "CRITICAL" },
  };

  const trendIcon = {
    improving: "arrow_downward",
    stable: "remove",
    worsening: "arrow_upward",
  };

  const colors = colorMap[level];

  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">
          Peg Stress Index
        </h3>
        <div
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{ color: colors.main, background: colors.bg }}
        >
          {colors.label}
        </div>
      </div>

      {/* Gauge SVG */}
      <div className="flex justify-center mb-4">
        <svg width="200" height="120" viewBox="0 0 200 120">
          {/* Background arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="#1e2733"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Green zone (0-30) */}
          <path
            d="M 10 100 A 90 90 0 0 1 46 28"
            fill="none"
            stroke="#10b981"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Yellow zone (30-60) */}
          <path
            d="M 46 28 A 90 90 0 0 1 154 28"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="12"
            opacity="0.3"
          />
          {/* Red zone (60-100) */}
          <path
            d="M 154 28 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke={colors.main}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="5" fill={colors.main} />
          {/* Value text */}
          <text
            x={cx}
            y={cy - 15}
            textAnchor="middle"
            fill={colors.main}
            fontSize="28"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {value}
          </text>
          <text
            x={cx}
            y={cy + 15}
            textAnchor="middle"
            fill="#8b949e"
            fontSize="10"
          >
            / 100
          </text>
        </svg>
      </div>

      {/* Trend */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span
          className="text-xs"
          style={{ color: trend === "worsening" ? "#ef4444" : trend === "improving" ? "#10b981" : "#8b949e" }}
        >
          {trend === "worsening" ? "▲" : trend === "improving" ? "▼" : "—"}{" "}
          {trend.charAt(0).toUpperCase() + trend.slice(1)}
        </span>
        <span className="text-xs text-[#484f58]">
          (prev: {psi.previousValue})
        </span>
      </div>

      {/* Component breakdown */}
      <div className="space-y-2">
        <ComponentBar label="Spread Stress" value={components.spreadStress} weight="30%" />
        <ComponentBar label="Liquidity Thinness" value={components.liquidityThinness} weight="40%" />
        <ComponentBar label="Order Imbalance" value={components.orderImbalance} weight="30%" />
      </div>

      {/* Sparkline */}
      {history.length > 0 && (
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history.slice(-60)}>
              <defs>
                <linearGradient id="psiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.main} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={colors.main} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.main}
                strokeWidth={1.5}
                fill="url(#psiGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ComponentBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  const color =
    value <= 30 ? "#10b981" : value <= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#8b949e]">{label}</span>
        <span className="text-[#484f58]">
          {value}/100 <span className="text-[#30363d]">({weight})</span>
        </span>
      </div>
      <div className="h-1.5 bg-[#161b22] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}
