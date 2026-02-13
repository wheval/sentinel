"use client";

import { WhaleWall } from "@/lib/types";
import { formatLiquidity, formatPrice } from "@/lib/tempo-math";

interface WhaleWallPanelProps {
  walls: WhaleWall[];
}

export function WhaleWallPanel({ walls }: WhaleWallPanelProps) {
  const classificationConfig = {
    defense: { color: "#10b981", icon: "🛡", label: "Defense" },
    accumulation: { color: "#58a6ff", icon: "📥", label: "Accumulation" },
    distribution: { color: "#f0883e", icon: "📤", label: "Distribution" },
  };

  if (walls.length === 0) {
    return (
      <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider mb-4">
          Whale Wall Detector
        </h3>
        <div className="text-center py-6 text-[#484f58]">
          <div className="text-2xl mb-2">🐋</div>
          <div className="text-sm">No whale walls detected at current threshold.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">
          Whale Wall Detector
        </h3>
        <span className="text-xs text-[#f0883e] font-mono">
          {walls.length} detected
        </span>
      </div>

      <div className="space-y-3">
        {walls.slice(0, 5).map((wall, i) => {
          const cfg = classificationConfig[wall.classification];
          return (
            <div
              key={`wall-${i}`}
              className="flex items-center gap-3 p-3 bg-[#161b22] rounded-lg border border-[#1e2733] hover:border-[#30363d] transition-colors"
            >
              <span className="text-xl flex-shrink-0">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[#e6edf3]">
                    Tick {wall.tick}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      color: cfg.color,
                      background: `${cfg.color}15`,
                    }}
                  >
                    {cfg.label}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      wall.side === "bid"
                        ? "text-[#238636] bg-[#238636]/10"
                        : "text-[#da3633] bg-[#da3633]/10"
                    }`}
                  >
                    {wall.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#8b949e]">
                  <span>Size: {formatLiquidity(wall.liquidity)}</span>
                  <span>Share: {wall.percentOfTotal}%</span>
                  <span>Price: {formatPrice(wall.price)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
