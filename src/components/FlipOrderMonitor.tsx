"use client";

import { FlipOrderMetrics } from "@/lib/types";

interface FlipOrderMonitorProps {
  metrics: FlipOrderMetrics;
}

export function FlipOrderMonitor({ metrics }: FlipOrderMonitorProps) {
  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">
          Flip Order Activity
        </h3>
        <span className="text-xs text-[#484f58] bg-[#161b22] px-2 py-0.5 rounded border border-[#1e2733]">
          Tempo-Native
        </span>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <div className="text-xs text-[#8b949e] mb-1">Total Flip Orders</div>
          <div className="text-2xl font-mono font-bold text-[#58a6ff]">
            {metrics.totalFlipOrders}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#8b949e] mb-1">Book Penetration</div>
          <div className="text-2xl font-mono font-bold text-[#e6edf3]">
            {metrics.flipPercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Density near peg */}
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-[#8b949e]">Flip Density Near Peg (±50 ticks)</span>
          <span className="text-[#58a6ff] font-mono">{metrics.flipDensityNearPeg.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-[#161b22] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] transition-all duration-500"
            style={{ width: `${Math.min(100, metrics.flipDensityNearPeg)}%` }}
          />
        </div>
      </div>

      {/* Bid/Ask distribution */}
      <div className="mb-4">
        <div className="text-xs text-[#8b949e] mb-2">Flip Distribution</div>
        <div className="flex h-3 rounded-full overflow-hidden">
          <div
            className="bg-[#238636] transition-all duration-500"
            style={{ width: `${metrics.flipBidRatio}%` }}
          />
          <div
            className="bg-[#da3633] transition-all duration-500"
            style={{ width: `${metrics.flipAskRatio}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-[#238636]">Bid {metrics.flipBidRatio.toFixed(0)}%</span>
          <span className="text-[#da3633]">Ask {metrics.flipAskRatio.toFixed(0)}%</span>
        </div>
      </div>

      {/* Flip summary */}
      <div className="bg-[#161b22] rounded-lg p-3 border border-[#1e2733]">
        <div className="text-xs text-[#8b949e]">
          Flip orders auto-reverse when filled, providing perpetual two-sided
          liquidity near peg. High flip density = strong market-making activity.
        </div>
      </div>
    </div>
  );
}
