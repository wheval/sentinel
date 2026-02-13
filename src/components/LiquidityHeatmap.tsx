"use client";

import { OrderbookSnapshot, WhaleWall, LiquidityCliff } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { formatLiquidity } from "@/lib/tempo-math";

interface LiquidityHeatmapProps {
  orderbook: OrderbookSnapshot;
  whaleWalls: WhaleWall[];
  cliffs: LiquidityCliff[];
}

export function LiquidityHeatmap({ orderbook, whaleWalls, cliffs }: LiquidityHeatmapProps) {
  // Combine bids and asks into a single dataset
  const whaleTickSet = new Set(whaleWalls.map((w) => w.tick));
  const cliffTickSet = new Set(cliffs.map((c) => c.tick));

  // Sample every Nth level for display
  const sampleRate = 3;
  const bidData = orderbook.bids
    .filter((_, i) => i % sampleRate === 0)
    .map((level) => ({
      tick: level.tick,
      liquidity: -level.liquidity, // Negative for bids (left side)
      side: "bid" as const,
      isWhale: whaleTickSet.has(level.tick),
      isCliff: cliffTickSet.has(level.tick),
      raw: level.liquidity,
    }));

  const askData = orderbook.asks
    .filter((_, i) => i % sampleRate === 0)
    .map((level) => ({
      tick: level.tick,
      liquidity: level.liquidity, // Positive for asks (right side)
      side: "ask" as const,
      isWhale: whaleTickSet.has(level.tick),
      isCliff: cliffTickSet.has(level.tick),
      raw: level.liquidity,
    }));

  const allData = [...bidData.reverse(), ...askData].sort((a, b) => a.tick - b.tick);

  const maxLiquidity = Math.max(
    ...allData.map((d) => Math.abs(d.liquidity))
  );

  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">
          Liquidity Depth by Tick
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#238636]" />
            Bids
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#da3633]" />
            Asks
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f0883e]" />
            Whale
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#a371f7]" />
            Cliff
          </span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={allData} barCategoryGap={0} barGap={0}>
            <XAxis
              dataKey="tick"
              tick={{ fill: "#484f58", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#1e2733" }}
              tickFormatter={(v: number) => (v % 50 === 0 ? `${v}` : "")}
            />
            <YAxis
              tick={{ fill: "#484f58", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatLiquidity(Math.abs(v))}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-xs shadow-xl">
                    <div className="text-[#e6edf3] font-mono mb-1">
                      Tick {d.tick}
                    </div>
                    <div className="text-[#8b949e]">
                      Liquidity: {formatLiquidity(d.raw)}
                    </div>
                    <div className="text-[#8b949e]">
                      Side: {d.side === "bid" ? "Bid" : "Ask"}
                    </div>
                    {d.isWhale && (
                      <div className="text-[#f0883e] font-medium mt-1">
                        Whale Wall
                      </div>
                    )}
                    {d.isCliff && (
                      <div className="text-[#a371f7] font-medium mt-1">
                        Liquidity Cliff
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <ReferenceLine x={0} stroke="#30363d" strokeDasharray="3 3" label="" />
            <Bar dataKey="liquidity" isAnimationActive={false}>
              {allData.map((entry, index) => {
                let fill: string;
                if (entry.isWhale) {
                  fill = "#f0883e";
                } else if (entry.isCliff) {
                  fill = "#a371f7";
                } else if (entry.side === "bid") {
                  const intensity = Math.abs(entry.liquidity) / maxLiquidity;
                  fill = `rgba(35, 134, 54, ${0.3 + intensity * 0.7})`;
                } else {
                  const intensity = Math.abs(entry.liquidity) / maxLiquidity;
                  fill = `rgba(218, 54, 51, ${0.3 + intensity * 0.7})`;
                }
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Peg marker */}
      <div className="flex justify-center mt-2">
        <span className="text-xs text-[#484f58] bg-[#161b22] px-3 py-1 rounded-full border border-[#1e2733]">
          ← Bids &nbsp;|&nbsp; Peg (1.0000) &nbsp;|&nbsp; Asks →
        </span>
      </div>
    </div>
  );
}
