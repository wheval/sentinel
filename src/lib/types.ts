// ============================================================================
// Tempo Sentinel — Core Type Definitions
// ============================================================================

/** A single level in the orderbook at a specific tick */
export interface OrderbookLevel {
  tick: number;
  price: number;
  liquidity: number;
  side: "bid" | "ask";
  isFlipOrder: boolean;
  orderCount: number;
}

/** The full orderbook snapshot */
export interface OrderbookSnapshot {
  timestamp: number;
  bestBid: OrderbookLevel;
  bestAsk: OrderbookLevel;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  midPrice: number;
  pegPrice: number; // Target peg (1.0 for stablecoins)
}

/** Peg Stress Index result */
export interface PSIResult {
  value: number; // 0–100
  level: "stable" | "moderate" | "critical";
  components: {
    spreadStress: number;     // 0–100, weighted 30%
    liquidityThinness: number; // 0–100, weighted 40%
    orderImbalance: number;    // 0–100, weighted 30%
  };
  trend: "improving" | "stable" | "worsening";
  previousValue: number;
}

/** Liquidity cliff detection result */
export interface LiquidityCliff {
  tick: number;
  price: number;
  side: "bid" | "ask";
  dropPercent: number; // How much liquidity drops at this point
  liquidityBefore: number;
  liquidityAfter: number;
  severity: "warning" | "critical";
}

/** Whale wall detection result */
export interface WhaleWall {
  tick: number;
  price: number;
  side: "bid" | "ask";
  liquidity: number;
  percentOfTotal: number;
  classification: "defense" | "accumulation" | "distribution";
}

/** Flip order activity metrics */
export interface FlipOrderMetrics {
  totalFlipOrders: number;
  flipPercentage: number; // % of total book
  flipDensityNearPeg: number; // Density within ±50 ticks
  flipBidRatio: number; // % of flips on bid side
  flipAskRatio: number; // % of flips on ask side
  avgFlipSpreadCapture: number; // Average spread captured by flip orders
}

/** Stability forecast */
export interface StabilityForecast {
  probability: "high" | "moderate" | "low";
  confidence: number; // 0–100
  factors: {
    stressTrend: "improving" | "stable" | "worsening";
    liquidityVelocity: number; // Change rate
    spreadTrend: "tightening" | "stable" | "widening";
  };
  shortTermOutlook: string;
}

/** Alert from the monitoring system */
export interface SentinelAlert {
  id: string;
  timestamp: number;
  type: "psi_critical" | "liquidity_cliff" | "whale_wall" | "spread_warning" | "peg_deviation" | "flip_anomaly";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/** Liquidity concentration risk (HHI-based) */
export interface ConcentrationRisk {
  hhi: number; // Herfindahl–Hirschman Index (0–10000)
  level: "low" | "moderate" | "high";
  topTickShare: number; // % of liquidity in the single largest tick
  top5TickShare: number; // % of liquidity in the top 5 ticks
  bidConcentration: number; // HHI for bid side only
  askConcentration: number; // HHI for ask side only
}

/** Custom alert threshold settings */
export interface AlertThresholds {
  psiWarning: number;
  psiCritical: number;
  spreadWarning: number;
  spreadCritical: number;
  cliffDropPercent: number;
  whalePercent: number;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  psiWarning: 30,
  psiCritical: 60,
  spreadWarning: 0.3,
  spreadCritical: 0.5,
  cliffDropPercent: 60,
  whalePercent: 5,
};

/** Top-level dashboard state */
export interface DashboardState {
  orderbook: OrderbookSnapshot;
  psi: PSIResult;
  cliffs: LiquidityCliff[];
  whaleWalls: WhaleWall[];
  flipMetrics: FlipOrderMetrics;
  forecast: StabilityForecast;
  alerts: SentinelAlert[];
  concentration: ConcentrationRisk;
  spread: {
    absolute: number;
    percentage: number;
  };
  pegDeviation: {
    absolute: number;
    percentage: number;
    direction: "above" | "below" | "on_peg";
  };
  liquidityDepth: {
    totalBid: number;
    totalAsk: number;
    ratio: number; // bid/ask ratio
    nearPeg: number; // Liquidity within ±50 ticks
  };
}
