"use client";

import { StabilityForecast as ForecastType } from "@/lib/types";

interface StabilityForecastProps {
  forecast: ForecastType;
}

export function StabilityForecast({ forecast }: StabilityForecastProps) {
  const probabilityConfig = {
    high: {
      color: "#10b981",
      bg: "rgba(16,185,129,0.1)",
      border: "border-emerald-500/30",
      icon: "◉",
      label: "HIGH STABILITY",
    },
    moderate: {
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
      border: "border-yellow-500/30",
      icon: "◎",
      label: "MODERATE STABILITY",
    },
    low: {
      color: "#ef4444",
      bg: "rgba(239,68,68,0.1)",
      border: "border-red-500/30",
      icon: "◌",
      label: "LOW STABILITY",
    },
  };

  const config = probabilityConfig[forecast.probability];

  const trendConfig = {
    improving: { color: "#10b981", icon: "↗", label: "Improving" },
    stable: { color: "#8b949e", icon: "→", label: "Stable" },
    worsening: { color: "#ef4444", icon: "↘", label: "Worsening" },
  };

  const spreadConfig = {
    tightening: { color: "#10b981", icon: "⟨⟩", label: "Tightening" },
    stable: { color: "#8b949e", icon: "⟷", label: "Stable" },
    widening: { color: "#ef4444", icon: "⟨ ⟩", label: "Widening" },
  };

  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider mb-4">
        Stability Forecast
      </h3>

      {/* Main probability */}
      <div
        className={`rounded-lg p-4 mb-4 border ${config.border}`}
        style={{ background: config.bg }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl" style={{ color: config.color }}>
            {config.icon}
          </span>
          <div>
            <div
              className="text-sm font-bold"
              style={{ color: config.color }}
            >
              {config.label}
            </div>
            <div className="text-xs text-[#8b949e] mt-0.5">
              Confidence: {forecast.confidence}%
            </div>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-5">
        <div className="h-2 bg-[#161b22] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${forecast.confidence}%`,
              background: config.color,
            }}
          />
        </div>
      </div>

      {/* Contributing factors */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#8b949e]">Stress Trend</span>
          <span
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: trendConfig[forecast.factors.stressTrend].color }}
          >
            {trendConfig[forecast.factors.stressTrend].icon}{" "}
            {trendConfig[forecast.factors.stressTrend].label}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-[#8b949e]">Liquidity Velocity</span>
          <span className="text-xs font-mono text-[#e6edf3]">
            {forecast.factors.liquidityVelocity}%
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-[#8b949e]">Spread Trend</span>
          <span
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: spreadConfig[forecast.factors.spreadTrend].color }}
          >
            {spreadConfig[forecast.factors.spreadTrend].icon}{" "}
            {spreadConfig[forecast.factors.spreadTrend].label}
          </span>
        </div>
      </div>

      {/* Outlook */}
      <div className="mt-4 p-3 bg-[#161b22] rounded-lg border border-[#1e2733]">
        <div className="text-xs text-[#8b949e] mb-1">Short-term Outlook</div>
        <div className="text-sm text-[#e6edf3]">{forecast.shortTermOutlook}</div>
      </div>
    </div>
  );
}
