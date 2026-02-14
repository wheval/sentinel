"use client";

import { useSentinel } from "@/hooks/useSentinel";
import { PSIGauge } from "@/components/PSIGauge";
import { LiquidityHeatmap } from "@/components/LiquidityHeatmap";
import { MetricCards } from "@/components/MetricCards";
import { AlertsPanel } from "@/components/AlertsPanel";
import { FlipOrderMonitor } from "@/components/FlipOrderMonitor";
import { StabilityForecast } from "@/components/StabilityForecast";
import { SpreadChart } from "@/components/SpreadChart";
import { WhaleWallPanel } from "@/components/WhaleWallPanel";

export default function Dashboard() {
  const {
    dashboard,
    historicalPSI,
    historicalSpread,
    isLive,
    setIsLive,
    refresh,
    dataSource,
    connectionStatus,
    toggleDataSource,
  } = useSentinel();

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#010409]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">◎</div>
          <div className="text-sm text-[#8b949e]">
            Connecting to Tempo Moderato...
          </div>
          <div className="text-xs text-[#484f58] mt-2">
            Fetching live orderbook data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010409] grid-bg">
      {/* Header */}
      <header className="border-b border-[#1e2733] bg-[#010409]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#e6edf3] tracking-tight">
                  TEMPO
                </span>
                <span className="text-2xl font-light text-[#58a6ff] tracking-tight">
                  SENTINEL
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 ml-4">
                <span className="text-xs text-[#484f58] bg-[#161b22] px-2.5 py-1 rounded-full border border-[#1e2733]">
                  Peg Stability Monitor
                </span>
                <span className="text-xs text-[#484f58] bg-[#161b22] px-2.5 py-1 rounded-full border border-[#1e2733]">
                  v1.0
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Data source badge */}
              <button
                onClick={toggleDataSource}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  dataSource === "live"
                    ? connectionStatus === "connected"
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                      : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                    : "border-[#30363d] bg-[#161b22] text-[#8b949e]"
                }`}
                title={
                  dataSource === "live"
                    ? "Connected to Tempo Moderato RPC. Click to switch to mock data."
                    : "Using simulated data. Click to connect to live Tempo chain."
                }
              >
                {dataSource === "live" ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    CHAIN
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#484f58]" />
                    MOCK
                  </>
                )}
              </button>

              {/* Live/Paused toggle */}
              <button
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isLive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-[#30363d] bg-[#161b22] text-[#8b949e]"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {isLive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isLive ? "bg-emerald-500" : "bg-[#484f58]"
                    }`}
                  />
                </span>
                {isLive ? "LIVE" : "PAUSED"}
              </button>

              {/* Manual refresh */}
              <button
                onClick={refresh}
                className="px-3 py-1.5 rounded-lg text-xs text-[#8b949e] border border-[#30363d] bg-[#161b22] hover:bg-[#1e2733] hover:text-[#e6edf3] transition-all"
              >
                Refresh
              </button>

              {/* Pair + Timestamp */}
              <div className="hidden lg:flex items-center gap-3">
                <span className="text-xs font-mono text-[#58a6ff] bg-[#161b22] px-2 py-1 rounded border border-[#1e2733]">
                  AlphaUSD / pathUSD
                </span>
                <span className="text-xs text-[#484f58] font-mono">
                  {new Date(dashboard.orderbook.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Row 1: Metric cards */}
        <MetricCards dashboard={dashboard} />

        {/* Row 2: PSI + Spread + Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PSIGauge psi={dashboard.psi} history={historicalPSI} />
          <SpreadChart data={historicalSpread} />
          <StabilityForecast forecast={dashboard.forecast} />
        </div>

        {/* Row 3: Liquidity Heatmap (full width) */}
        <LiquidityHeatmap
          orderbook={dashboard.orderbook}
          whaleWalls={dashboard.whaleWalls}
          cliffs={dashboard.cliffs}
        />

        {/* Row 4: Whale + Flip + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WhaleWallPanel walls={dashboard.whaleWalls} />
          <FlipOrderMonitor metrics={dashboard.flipMetrics} />
          <AlertsPanel alerts={dashboard.alerts} />
        </div>

        {/* Footer */}
        <footer className="border-t border-[#1e2733] pt-6 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs text-[#484f58]">
            <div>
              Tempo Sentinel — Real-time peg stability monitoring for the Tempo
              DEX ecosystem.
            </div>
            <div className="flex items-center gap-4">
              <span>
                Source:{" "}
                {dataSource === "live"
                  ? "Tempo Moderato (rpc.moderato.tempo.xyz)"
                  : "Simulated Data"}
              </span>
              <span>•</span>
              <span>Refresh: 3s</span>
              <span>•</span>
              <span>
                Pair: AlphaUSD/pathUSD
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
