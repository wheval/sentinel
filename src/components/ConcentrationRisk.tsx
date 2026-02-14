"use client";

import { ConcentrationRisk as ConcentrationRiskType } from "@/lib/types";

interface ConcentrationRiskProps {
  concentration: ConcentrationRiskType;
}

export function ConcentrationRisk({ concentration }: ConcentrationRiskProps) {
  const levelConfig = {
    low: { color: "#10b981", bg: "rgba(16,185,129,0.1)", label: "LOW RISK" },
    moderate: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "MODERATE" },
    high: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "HIGH RISK" },
  };

  const config = levelConfig[concentration.level];

  // HHI visual: 0-10000 scale, but practical range is 0-5000
  const hhiPercent = Math.min(100, (concentration.hhi / 5000) * 100);

  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">
          Concentration Risk
        </h3>
        <div
          className="px-2 py-0.5 rounded text-xs font-bold"
          style={{ color: config.color, background: config.bg }}
        >
          {config.label}
        </div>
      </div>

      {/* HHI Score */}
      <div className="text-center mb-4">
        <div className="text-3xl font-mono font-bold" style={{ color: config.color }}>
          {concentration.hhi.toLocaleString()}
        </div>
        <div className="text-xs text-[#484f58] mt-1">
          Herfindahl-Hirschman Index
        </div>
      </div>

      {/* HHI Bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-[#484f58] mb-1">
          <span>0</span>
          <span>Diversified</span>
          <span>Concentrated</span>
          <span>5000+</span>
        </div>
        <div className="h-2 bg-[#161b22] rounded-full overflow-hidden relative">
          {/* Zone markers */}
          <div className="absolute left-[30%] top-0 bottom-0 w-px bg-[#1e2733]" />
          <div className="absolute left-[50%] top-0 bottom-0 w-px bg-[#1e2733]" />
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${hhiPercent}%`,
              background: `linear-gradient(to right, #10b981, ${config.color})`,
            }}
          />
        </div>
      </div>

      {/* Detail metrics */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#8b949e]">Top Tick Share</span>
          <span className="text-xs font-mono text-[#e6edf3]">
            {concentration.topTickShare}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#8b949e]">Top 5 Ticks Share</span>
          <span className="text-xs font-mono text-[#e6edf3]">
            {concentration.top5TickShare}%
          </span>
        </div>

        {/* Per-side bars */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#238636]">Bid HHI</span>
            <span className="font-mono text-[#8b949e]">
              {concentration.bidConcentration.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 bg-[#161b22] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#238636] transition-all duration-500"
              style={{
                width: `${Math.min(100, (concentration.bidConcentration / 5000) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#da3633]">Ask HHI</span>
            <span className="font-mono text-[#8b949e]">
              {concentration.askConcentration.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 bg-[#161b22] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#da3633] transition-all duration-500"
              style={{
                width: `${Math.min(100, (concentration.askConcentration / 5000) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
