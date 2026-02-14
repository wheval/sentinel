# Tempo Sentinel

Real-time peg stability monitoring for the Tempo DEX ecosystem.

Tempo Sentinel transforms raw orderbook data into actionable peg risk intelligence, providing traders, market makers, and the protocol itself with institutional-grade insight into stablecoin peg health.

## Features

- **Peg Stress Index (PSI)** -- Proprietary composite score (0-100) combining spread stress, liquidity thinness, and order imbalance to diagnose peg health at a glance.
- **Liquidity Cliff Detector** -- Identifies sudden liquidity drops across the tick range that leave the peg vulnerable to directional pressure.
- **Whale Wall Detector** -- Flags large liquidity concentrations at specific ticks, classifying them as defense, accumulation, or distribution activity.
- **Flip Order Activity Monitor** -- Tracks Tempo's unique flip order mechanism -- orders that auto-reverse when filled, providing perpetual two-sided liquidity.
- **Concentration Risk (HHI)** -- Herfindahl-Hirschman Index analysis of liquidity distribution across ticks, per-side and aggregate.
- **Stability Forecast** -- Lightweight predictive outlook based on stress trend, liquidity velocity, and spread behavior.
- **Liquidity Heatmap** -- Visual representation of orderbook depth by tick with whale wall and cliff annotations.
- **Multi-Pair Support** -- Monitor any stablecoin pair on Tempo (AlphaUSD, BetaUSD, ThetaUSD, and more).
- **Historical Persistence** -- LocalStorage-backed time-series for PSI, spread, depth, and other metrics with interactive charts.
- **Configurable Alert Thresholds** -- Customize PSI, spread, cliff, and whale detection sensitivity.
- **Snapshot Export** -- Download a full JSON report for offline analysis or record-keeping.

## Architecture

```
Next.js (App Router)
  |
  ├── /api/orderbook       API route -- fetches live data from Tempo chain
  |     |
  |     └── tempo-client    viem/tempo SDK -- multicall batched tick scanning
  |
  ├── useSentinel hook      Orchestrates fetch -> compute -> render cycle
  |     |
  |     ├── metrics-engine  PSI, cliffs, whales, flips, HHI, forecast, alerts
  |     └── history         localStorage persistence layer
  |
  └── Dashboard             11 specialized visualization components
```

## Tech Stack

- **Next.js 15** + TypeScript + Tailwind CSS
- **viem** with `viem/tempo` extension for Starknet interaction
- **Recharts** for data visualization
- **Tempo Moderato** testnet (live chain data)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The dashboard starts in live mode, connecting to Tempo Moderato via `rpc.moderato.tempo.xyz`. If the chain is unreachable, it falls back to simulated data automatically. Toggle between CHAIN and MOCK mode via the header button.

## Data Flow

1. **Fetch** -- API route calls `dex.getTickLevel` via multicall (1000 ticks per batch) on the Tempo stablecoin DEX precompile (`0xdec0de...`).
2. **Parse** -- Raw tick data is converted to `OrderbookSnapshot` with prices derived from Tempo's tick math.
3. **Analyze** -- Metrics engine computes PSI, detects cliffs/whales, analyzes flip orders, calculates HHI, and generates alerts.
4. **Persist** -- Each data point is appended to localStorage time-series (up to 720 points per metric per pair).
5. **Render** -- Dashboard components consume the `DashboardState` and display the results with 3-second auto-refresh.

## License

MIT
