"use client";

import { useState } from "react";
import { useSentinel } from "@/hooks/useSentinel";
import { PSIGauge } from "@/components/PSIGauge";
import { LiquidityHeatmap } from "@/components/LiquidityHeatmap";
import { MetricCards } from "@/components/MetricCards";
import { AlertsPanel } from "@/components/AlertsPanel";
import { FlipOrderMonitor } from "@/components/FlipOrderMonitor";
import { StabilityForecast } from "@/components/StabilityForecast";
import { SpreadChart } from "@/components/SpreadChart";
import { WhaleWallPanel } from "@/components/WhaleWallPanel";
import { ConcentrationRisk } from "@/components/ConcentrationRisk";
import { HistoricalChart } from "@/components/HistoricalChart";
import { SettingsPanel } from "@/components/SettingsPanel";

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
    selectedPair,
    setSelectedPair,
    pairs,
    thresholds,
    updateThresholds,
    exportReport,
  } = useSentinel();

  const [showSettings, setShowSettings] = useState(false);
  const [showPairDropdown, setShowPairDropdown] = useState(false);

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#010409]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">◎</div>
          <div className="text-sm text-[#8b949e]">
            Connecting to Tempo Moderato...
          </div>
          <div className="text-xs text-[#484f58] mt-2">
            Fetching live orderbook data for {selectedPair.label}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010409] grid-bg">
      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel
          thresholds={thresholds}
          onUpdate={updateThresholds}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Header */}
      <header className="border-b border-[#1e2733] bg-[#010409]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Brand + Pair Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-[#e6edf3] tracking-tight">
                  TEMPO
                </span>
                <span className="text-xl font-light text-[#58a6ff] tracking-tight">
                  SENTINEL
                </span>
              </div>

              {/* Pair Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowPairDropdown(!showPairDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border border-[#30363d] bg-[#161b22] hover:bg-[#1e2733] text-[#e6edf3] transition-all"
                >
                  <span className="text-[#58a6ff]">{selectedPair.baseSymbol}</span>
                  <span className="text-[#484f58]">/</span>
                  <span className="text-[#8b949e]">{selectedPair.quoteSymbol}</span>
                  <span className="text-[#484f58] ml-1">▾</span>
                </button>

                {showPairDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 py-1">
                    {pairs.map((pair) => (
                      <button
                        key={pair.id}
                        onClick={() => {
                          setSelectedPair(pair);
                          setShowPairDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-[#1e2733] transition-colors flex items-center justify-between ${
                          pair.id === selectedPair.id
                            ? "text-[#58a6ff] bg-[#58a6ff]/5"
                            : "text-[#e6edf3]"
                        }`}
                      >
                        <span className="font-mono">{pair.label}</span>
                        {pair.id === selectedPair.id && (
                          <span className="text-[#58a6ff]">●</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-2">
                <span className="text-xs text-[#484f58] bg-[#161b22] px-2.5 py-1 rounded-full border border-[#1e2733]">
                  Peg Stability Monitor
                </span>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {/* Data source */}
              <button
                onClick={toggleDataSource}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  dataSource === "live"
                    ? connectionStatus === "connected"
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                      : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                    : "border-[#30363d] bg-[#161b22] text-[#8b949e]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    dataSource === "live" ? "bg-cyan-400" : "bg-[#484f58]"
                  }`}
                />
                {dataSource === "live" ? "CHAIN" : "MOCK"}
              </button>

              {/* Live toggle */}
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

              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs text-[#8b949e] border border-[#30363d] bg-[#161b22] hover:bg-[#1e2733] hover:text-[#e6edf3] transition-all"
                title="Alert thresholds"
              >
                Settings
              </button>

              {/* Export */}
              <button
                onClick={exportReport}
                className="px-2.5 py-1.5 rounded-lg text-xs text-[#8b949e] border border-[#30363d] bg-[#161b22] hover:bg-[#1e2733] hover:text-[#e6edf3] transition-all"
                title="Export snapshot report"
              >
                Export
              </button>

              {/* Refresh */}
              <button
                onClick={refresh}
                className="px-2.5 py-1.5 rounded-lg text-xs text-[#8b949e] border border-[#30363d] bg-[#161b22] hover:bg-[#1e2733] hover:text-[#e6edf3] transition-all"
              >
                Refresh
              </button>

              {/* Timestamp */}
              <div className="hidden xl:block text-xs text-[#484f58] font-mono">
                {new Date(dashboard.orderbook.timestamp).toLocaleTimeString()}
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
          <PSIGauge psi={dashboard.psi} history={historicalPSI.map((p) => ({ time: p.t, value: p.v }))} />
          <SpreadChart data={historicalSpread.map((p) => ({ time: p.t, value: p.v }))} />
          <StabilityForecast forecast={dashboard.forecast} />
        </div>

        {/* Row 3: Liquidity Heatmap */}
        <LiquidityHeatmap
          orderbook={dashboard.orderbook}
          whaleWalls={dashboard.whaleWalls}
          cliffs={dashboard.cliffs}
        />

        {/* Row 4: Historical Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HistoricalChart
            data={historicalPSI}
            label="PSI History"
            color="#f59e0b"
            domain={[0, 100]}
          />
          <HistoricalChart
            data={historicalSpread}
            label="Spread History"
            color="#58a6ff"
            formatValue={(v) => `${v.toFixed(4)}%`}
          />
        </div>

        {/* Row 5: Whale + Concentration + Flip + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <WhaleWallPanel walls={dashboard.whaleWalls} />
          <ConcentrationRisk concentration={dashboard.concentration} />
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
              <span>Pair: {selectedPair.label}</span>
              {/* <span>•</span>
              <span>
                Features: PSI, HHI, Cliffs, Whales, Flips, Forecast, Export
              </span> */}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
