"use client";

import { DashboardState } from "@/lib/types";
import { formatPrice, formatPercent, formatLiquidity } from "@/lib/tempo-math";

interface MetricCardsProps {
  dashboard: DashboardState;
}

export function MetricCards({ dashboard }: MetricCardsProps) {
  const { spread, pegDeviation, liquidityDepth, psi } = dashboard;

  const cards = [
    {
      label: "Peg Deviation",
      value: formatPercent(pegDeviation.percentage),
      sub: formatPrice(dashboard.orderbook.midPrice),
      color:
        Math.abs(pegDeviation.percentage) < 0.01
          ? "#10b981"
          : Math.abs(pegDeviation.percentage) < 0.05
          ? "#f59e0b"
          : "#ef4444",
      icon: pegDeviation.direction === "above" ? "↑" : pegDeviation.direction === "below" ? "↓" : "●",
    },
    {
      label: "Spread",
      value: `${spread.percentage.toFixed(4)}%`,
      sub: formatPrice(spread.absolute, 8),
      color: spread.percentage < 0.05 ? "#10b981" : spread.percentage < 0.2 ? "#f59e0b" : "#ef4444",
      icon: "⟷",
    },
    {
      label: "Bid Depth",
      value: formatLiquidity(liquidityDepth.totalBid),
      sub: `${((liquidityDepth.ratio / (1 + liquidityDepth.ratio)) * 100).toFixed(1)}% of total`,
      color: "#238636",
      icon: "◧",
    },
    {
      label: "Ask Depth",
      value: formatLiquidity(liquidityDepth.totalAsk),
      sub: `${((1 / (1 + liquidityDepth.ratio)) * 100).toFixed(1)}% of total`,
      color: "#da3633",
      icon: "◨",
    },
    {
      label: "Near-Peg Liquidity",
      value: formatLiquidity(liquidityDepth.nearPeg),
      sub: "Within ±50 ticks",
      color: "#58a6ff",
      icon: "◎",
    },
    {
      label: "Bid/Ask Ratio",
      value: liquidityDepth.ratio.toFixed(3),
      sub: liquidityDepth.ratio > 1.2 ? "Bid-heavy" : liquidityDepth.ratio < 0.8 ? "Ask-heavy" : "Balanced",
      color:
        Math.abs(liquidityDepth.ratio - 1) < 0.2
          ? "#10b981"
          : Math.abs(liquidityDepth.ratio - 1) < 0.5
          ? "#f59e0b"
          : "#ef4444",
      icon: "⚖",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-4 hover:border-[#30363d] transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg" style={{ color: card.color }}>
              {card.icon}
            </span>
            <span className="text-xs text-[#8b949e] uppercase tracking-wide">
              {card.label}
            </span>
          </div>
          <div
            className="text-xl font-mono font-bold mb-1"
            style={{ color: card.color }}
          >
            {card.value}
          </div>
          <div className="text-xs text-[#484f58]">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
