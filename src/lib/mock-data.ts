// ============================================================================
// Tempo Sentinel — Mock Data Service
// ============================================================================
// Simulates a realistic Tempo DEX orderbook with tick-based pricing.
// Replace with real RPC calls when connecting to live Tempo.

import { OrderbookSnapshot, OrderbookLevel } from "./types";
import { tickToPrice } from "./tempo-math";

// ---------------------------------------------------------------------------
// Seeded pseudo-random for reproducible but varying data
// ---------------------------------------------------------------------------

let seed = 42;
function seededRandom(): number {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function randomInRange(min: number, max: number): number {
  return min + seededRandom() * (max - min);
}

// ---------------------------------------------------------------------------
// Generate orderbook levels
// ---------------------------------------------------------------------------

function generateLevels(
  side: "bid" | "ask",
  count: number,
  baseVolatility: number = 1
): OrderbookLevel[] {
  const levels: OrderbookLevel[] = [];
  const direction = side === "bid" ? -1 : 1;

  for (let i = 1; i <= count; i++) {
    const tick = direction * i * 5; // Every 5 ticks
    const price = tickToPrice(tick);

    // Liquidity follows a bell curve near peg, with some randomness
    const distanceFromPeg = Math.abs(tick);
    const baseLiquidity = 500_000 * Math.exp(-distanceFromPeg / 300) * baseVolatility;
    const noise = randomInRange(0.5, 1.5);
    let liquidity = baseLiquidity * noise;

    // Add whale walls at specific ticks
    if (tick === -50 * direction || tick === -250) {
      liquidity *= randomInRange(3, 6); // Whale wall
    }

    // Create liquidity cliff at ~85 ticks on bid side
    if (side === "bid" && distanceFromPeg > 400 && distanceFromPeg < 500) {
      liquidity *= 0.15; // Thin zone
    }

    // Flip orders: ~20% of orders near peg, fewer further out
    const isFlipOrder = distanceFromPeg < 100 ? seededRandom() < 0.25 : seededRandom() < 0.05;
    const orderCount = Math.max(1, Math.floor(randomInRange(1, distanceFromPeg < 50 ? 15 : 5)));

    levels.push({
      tick,
      price,
      liquidity: Math.round(liquidity),
      side,
      isFlipOrder,
      orderCount,
    });
  }

  return levels;
}

// ---------------------------------------------------------------------------
// Generate full snapshot
// ---------------------------------------------------------------------------

let snapshotCount = 0;

export function generateOrderbookSnapshot(): OrderbookSnapshot {
  snapshotCount++;

  // Slight variation each cycle to simulate live market
  seed = 42 + snapshotCount * 7;
  const volatilityFactor = 0.8 + 0.4 * Math.sin(snapshotCount * 0.3);

  const bids = generateLevels("bid", 120, volatilityFactor);
  const asks = generateLevels("ask", 120, volatilityFactor);

  // Sort: bids descending by price, asks ascending by price
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  const bestBid = bids[0];
  const bestAsk = asks[0];
  const midPrice = (bestBid.price + bestAsk.price) / 2;

  // Simulate slight peg deviation
  const pegDeviation = 0.0001 * Math.sin(snapshotCount * 0.5);

  return {
    timestamp: Date.now(),
    bestBid,
    bestAsk,
    bids,
    asks,
    midPrice: midPrice + pegDeviation,
    pegPrice: 1.0,
  };
}

// ---------------------------------------------------------------------------
// Historical PSI data for sparkline
// ---------------------------------------------------------------------------

export function generateHistoricalPSI(points: number = 60): { time: number; value: number }[] {
  const data: { time: number; value: number }[] = [];
  const now = Date.now();

  for (let i = points; i >= 0; i--) {
    const baseValue = 22 + 8 * Math.sin(i * 0.15) + 5 * Math.cos(i * 0.07);
    const noise = (seededRandom() - 0.5) * 10;
    data.push({
      time: now - i * 60_000, // 1 minute intervals
      value: Math.max(0, Math.min(100, Math.round(baseValue + noise))),
    });
  }

  return data;
}

// ---------------------------------------------------------------------------
// Historical spread data
// ---------------------------------------------------------------------------

export function generateHistoricalSpread(points: number = 60): { time: number; value: number }[] {
  const data: { time: number; value: number }[] = [];
  const now = Date.now();

  for (let i = points; i >= 0; i--) {
    const baseValue = 0.04 + 0.02 * Math.sin(i * 0.12) + 0.01 * Math.cos(i * 0.08);
    const noise = (seededRandom() - 0.5) * 0.02;
    data.push({
      time: now - i * 60_000,
      value: Math.max(0.005, baseValue + noise),
    });
  }

  return data;
}
