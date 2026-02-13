// ============================================================================
// Tempo Sentinel — Tick Math & Price Conversions
// ============================================================================
// Tempo uses tick-based pricing for ±2% range around peg.
// Each tick = 0.001% (1 basis point / 10)

const TICK_TO_PERCENT = 1 / 100000; // Each tick = 0.001%
const PEG_PRICE = 1.0;

/** Convert a tick value to actual price */
export function tickToPrice(tick: number): number {
  const percentage = tick * TICK_TO_PERCENT;
  return PEG_PRICE * (1 + percentage);
}

/** Convert a price to the nearest tick */
export function priceToTick(price: number): number {
  const percentage = (price - PEG_PRICE) / PEG_PRICE;
  return Math.round(percentage / TICK_TO_PERCENT);
}

/** Calculate spread between two prices as a percentage */
export function spreadPercent(bidPrice: number, askPrice: number): number {
  const mid = (bidPrice + askPrice) / 2;
  return ((askPrice - bidPrice) / mid) * 100;
}

/** Calculate peg deviation */
export function pegDeviation(midPrice: number): {
  absolute: number;
  percentage: number;
  direction: "above" | "below" | "on_peg";
} {
  const absolute = midPrice - PEG_PRICE;
  const percentage = (absolute / PEG_PRICE) * 100;
  const direction =
    Math.abs(percentage) < 0.001
      ? "on_peg"
      : percentage > 0
      ? "above"
      : "below";
  return { absolute, percentage, direction };
}

/** Normalize a value to 0–100 range */
export function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/** Format a price for display */
export function formatPrice(price: number, decimals: number = 6): string {
  return price.toFixed(decimals);
}

/** Format a large number with K/M suffixes */
export function formatLiquidity(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/** Format percentage */
export function formatPercent(value: number, decimals: number = 3): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}
