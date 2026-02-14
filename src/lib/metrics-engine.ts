// ============================================================================
// Tempo Sentinel — Core Metrics Engine
// ============================================================================
// Proprietary analytics: PSI, Cliff Detection, Whale Detection, Flip Analysis

import {
  OrderbookSnapshot,
  PSIResult,
  LiquidityCliff,
  WhaleWall,
  FlipOrderMetrics,
  StabilityForecast,
  SentinelAlert,
  ConcentrationRisk,
  AlertThresholds,
  DEFAULT_THRESHOLDS,
} from "./types";
import { spreadPercent, normalize, formatPrice, formatLiquidity } from "./tempo-math";

// ---------------------------------------------------------------------------
// PSI — Peg Stress Index
// ---------------------------------------------------------------------------

let previousPSI = 25; // Track for trend

export function calculatePSI(orderbook: OrderbookSnapshot): PSIResult {
  const { spreadStress, liquidityThinness, orderImbalance } = calculatePSIComponents(orderbook);

  // PSI = Spread% × 30% + Liquidity Thinness × 40% + Order Imbalance × 30%
  const value = Math.round(
    spreadStress * 0.3 +
    liquidityThinness * 0.4 +
    orderImbalance * 0.3
  );

  const clampedValue = Math.max(0, Math.min(100, value));

  const level: PSIResult["level"] =
    clampedValue <= 30 ? "stable" : clampedValue <= 60 ? "moderate" : "critical";

  const trend: PSIResult["trend"] =
    clampedValue < previousPSI - 3
      ? "improving"
      : clampedValue > previousPSI + 3
      ? "worsening"
      : "stable";

  const result: PSIResult = {
    value: clampedValue,
    level,
    components: { spreadStress, liquidityThinness, orderImbalance },
    trend,
    previousValue: previousPSI,
  };

  previousPSI = clampedValue;
  return result;
}

function calculatePSIComponents(orderbook: OrderbookSnapshot) {
  // 1. Spread stress (0–100)
  const spread = spreadPercent(orderbook.bestBid.price, orderbook.bestAsk.price);
  // 0.01% spread = 0 stress, 0.5%+ = 100 stress
  const spreadStress = normalize(spread, 0.01, 0.5);

  // 2. Liquidity thinness within ±50 ticks of peg (0–100)
  const nearPegBids = orderbook.bids
    .filter((l) => Math.abs(l.tick) <= 50)
    .reduce((sum, l) => sum + l.liquidity, 0);
  const nearPegAsks = orderbook.asks
    .filter((l) => Math.abs(l.tick) <= 50)
    .reduce((sum, l) => sum + l.liquidity, 0);
  const totalNearPeg = nearPegBids + nearPegAsks;
  const totalLiquidity =
    orderbook.bids.reduce((s, l) => s + l.liquidity, 0) +
    orderbook.asks.reduce((s, l) => s + l.liquidity, 0);

  // If less liquidity near peg, higher thinness stress
  const nearPegRatio = totalLiquidity > 0 ? totalNearPeg / totalLiquidity : 0;
  // 80%+ near peg = 0 stress, <20% = 100 stress
  const liquidityThinness = normalize(1 - nearPegRatio, 0.2, 0.8);

  // 3. Order imbalance (0–100)
  const totalBids = orderbook.bids.reduce((s, l) => s + l.liquidity, 0);
  const totalAsks = orderbook.asks.reduce((s, l) => s + l.liquidity, 0);
  const imbalanceRatio =
    totalBids + totalAsks > 0
      ? Math.abs(totalBids - totalAsks) / (totalBids + totalAsks)
      : 0;
  // 0% imbalance = 0 stress, 50%+ = 100 stress
  const orderImbalance = normalize(imbalanceRatio, 0, 0.5);

  return {
    spreadStress: Math.round(spreadStress),
    liquidityThinness: Math.round(liquidityThinness),
    orderImbalance: Math.round(orderImbalance),
  };
}

// ---------------------------------------------------------------------------
// Liquidity Cliff Detection
// ---------------------------------------------------------------------------

export function detectLiquidityCliffs(
  orderbook: OrderbookSnapshot,
  dropThreshold: number = 0.6 // 60% drop = cliff
): LiquidityCliff[] {
  const cliffs: LiquidityCliff[] = [];

  const detectSide = (levels: typeof orderbook.bids, side: "bid" | "ask") => {
    // Sort by distance from peg
    const sorted = [...levels].sort(
      (a, b) => Math.abs(a.tick) - Math.abs(b.tick)
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (prev.liquidity > 0) {
        const drop = (prev.liquidity - curr.liquidity) / prev.liquidity;
        if (drop >= dropThreshold) {
          cliffs.push({
            tick: curr.tick,
            price: curr.price,
            side,
            dropPercent: Math.round(drop * 100),
            liquidityBefore: prev.liquidity,
            liquidityAfter: curr.liquidity,
            severity: drop >= 0.8 ? "critical" : "warning",
          });
        }
      }
    }
  };

  detectSide(orderbook.bids, "bid");
  detectSide(orderbook.asks, "ask");

  return cliffs.sort((a, b) => b.dropPercent - a.dropPercent);
}

// ---------------------------------------------------------------------------
// Whale Wall Detection
// ---------------------------------------------------------------------------

export function detectWhaleWalls(
  orderbook: OrderbookSnapshot,
  threshold: number = 0.05 // 5% of total depth
): WhaleWall[] {
  const walls: WhaleWall[] = [];
  const totalLiquidity =
    orderbook.bids.reduce((s, l) => s + l.liquidity, 0) +
    orderbook.asks.reduce((s, l) => s + l.liquidity, 0);

  const detectSide = (levels: typeof orderbook.bids, side: "bid" | "ask") => {
    for (const level of levels) {
      const percentOfTotal = level.liquidity / totalLiquidity;
      if (percentOfTotal >= threshold) {
        // Classify based on position relative to peg
        let classification: WhaleWall["classification"];
        if (side === "bid" && Math.abs(level.tick) <= 100) {
          classification = "defense";
        } else if (side === "ask" && Math.abs(level.tick) <= 100) {
          classification = "distribution";
        } else {
          classification = "accumulation";
        }

        walls.push({
          tick: level.tick,
          price: level.price,
          side,
          liquidity: level.liquidity,
          percentOfTotal: Math.round(percentOfTotal * 100),
          classification,
        });
      }
    }
  };

  detectSide(orderbook.bids, "bid");
  detectSide(orderbook.asks, "ask");

  return walls.sort((a, b) => b.liquidity - a.liquidity);
}

// ---------------------------------------------------------------------------
// Flip Order Analysis
// ---------------------------------------------------------------------------

export function analyzeFlipOrders(orderbook: OrderbookSnapshot): FlipOrderMetrics {
  const allLevels = [...orderbook.bids, ...orderbook.asks];
  const flipOrders = allLevels.filter((l) => l.isFlipOrder);
  const totalOrders = allLevels.reduce((s, l) => s + l.orderCount, 0);
  const totalFlipOrders = flipOrders.reduce((s, l) => s + l.orderCount, 0);

  const flipNearPeg = flipOrders.filter((l) => Math.abs(l.tick) <= 50);
  const totalNearPeg = allLevels.filter((l) => Math.abs(l.tick) <= 50);

  const flipBids = flipOrders.filter((l) => l.side === "bid");
  const flipAsks = flipOrders.filter((l) => l.side === "ask");

  const flipDensityNearPeg =
    totalNearPeg.length > 0 ? flipNearPeg.length / totalNearPeg.length : 0;

  const totalFlipCount = flipBids.length + flipAsks.length;

  return {
    totalFlipOrders,
    flipPercentage: totalOrders > 0 ? (totalFlipOrders / totalOrders) * 100 : 0,
    flipDensityNearPeg: flipDensityNearPeg * 100,
    flipBidRatio: totalFlipCount > 0 ? (flipBids.length / totalFlipCount) * 100 : 50,
    flipAskRatio: totalFlipCount > 0 ? (flipAsks.length / totalFlipCount) * 100 : 50,
    avgFlipSpreadCapture: 0.015, // Basis points, would be calculated from real trade data
  };
}

// ---------------------------------------------------------------------------
// Stability Forecast
// ---------------------------------------------------------------------------

export function calculateStabilityForecast(
  psi: PSIResult,
  orderbook: OrderbookSnapshot,
  cliffs: LiquidityCliff[]
): StabilityForecast {
  // Stress trend from PSI
  const stressTrend = psi.trend;

  // Liquidity velocity (simplified: based on near-peg concentration)
  const totalLiquidity =
    orderbook.bids.reduce((s, l) => s + l.liquidity, 0) +
    orderbook.asks.reduce((s, l) => s + l.liquidity, 0);
  const nearPegLiquidity =
    [...orderbook.bids, ...orderbook.asks]
      .filter((l) => Math.abs(l.tick) <= 50)
      .reduce((s, l) => s + l.liquidity, 0);

  const liquidityVelocity = totalLiquidity > 0 ? nearPegLiquidity / totalLiquidity : 0;

  // Spread trend
  const spread = spreadPercent(orderbook.bestBid.price, orderbook.bestAsk.price);
  const spreadTrend: StabilityForecast["factors"]["spreadTrend"] =
    spread < 0.05 ? "tightening" : spread > 0.2 ? "widening" : "stable";

  // Calculate probability
  let score = 100;
  score -= psi.value * 0.4; // PSI weighs 40%
  score -= cliffs.filter((c) => c.severity === "critical").length * 15;
  score -= cliffs.filter((c) => c.severity === "warning").length * 5;
  if (spreadTrend === "widening") score -= 15;
  if (stressTrend === "worsening") score -= 10;
  score = Math.max(0, Math.min(100, score));

  const probability: StabilityForecast["probability"] =
    score >= 70 ? "high" : score >= 40 ? "moderate" : "low";

  const outlookMap = {
    high: "Strong peg stability. Liquidity well-distributed with tight spreads.",
    moderate: "Moderate stability. Monitor for deterioration in key metrics.",
    low: "Elevated peg risk. Liquidity gaps and widening spreads detected.",
  };

  return {
    probability,
    confidence: Math.round(score),
    factors: {
      stressTrend,
      liquidityVelocity: Math.round(liquidityVelocity * 100),
      spreadTrend,
    },
    shortTermOutlook: outlookMap[probability],
  };
}

// ---------------------------------------------------------------------------
// Concentration Risk (HHI — Herfindahl-Hirschman Index)
// ---------------------------------------------------------------------------

export function calculateConcentrationRisk(
  orderbook: OrderbookSnapshot
): ConcentrationRisk {
  const allLevels = [...orderbook.bids, ...orderbook.asks];
  const totalLiq = allLevels.reduce((s, l) => s + l.liquidity, 0);

  if (totalLiq === 0) {
    return {
      hhi: 0,
      level: "low",
      topTickShare: 0,
      top5TickShare: 0,
      bidConcentration: 0,
      askConcentration: 0,
    };
  }

  // HHI = sum of (market share %)^2 for each tick
  const shares = allLevels.map((l) => (l.liquidity / totalLiq) * 100);
  const hhi = Math.round(shares.reduce((s, sh) => s + sh * sh, 0));

  // Top tick share
  const sorted = [...allLevels].sort((a, b) => b.liquidity - a.liquidity);
  const topTickShare = (sorted[0]?.liquidity || 0) / totalLiq * 100;
  const top5TickShare =
    sorted.slice(0, 5).reduce((s, l) => s + l.liquidity, 0) / totalLiq * 100;

  // Per-side HHI
  const calcSideHHI = (levels: typeof orderbook.bids) => {
    const total = levels.reduce((s, l) => s + l.liquidity, 0);
    if (total === 0) return 0;
    return Math.round(
      levels.reduce((s, l) => {
        const share = (l.liquidity / total) * 100;
        return s + share * share;
      }, 0)
    );
  };

  const level: ConcentrationRisk["level"] =
    hhi < 1500 ? "low" : hhi < 2500 ? "moderate" : "high";

  return {
    hhi,
    level,
    topTickShare: Math.round(topTickShare * 10) / 10,
    top5TickShare: Math.round(top5TickShare * 10) / 10,
    bidConcentration: calcSideHHI(orderbook.bids),
    askConcentration: calcSideHHI(orderbook.asks),
  };
}

// ---------------------------------------------------------------------------
// Alert Generation (with configurable thresholds)
// ---------------------------------------------------------------------------

let alertCounter = 0;

export function generateAlerts(
  psi: PSIResult,
  cliffs: LiquidityCliff[],
  whaleWalls: WhaleWall[],
  orderbook: OrderbookSnapshot,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): SentinelAlert[] {
  const alerts: SentinelAlert[] = [];
  const now = Date.now();

  // PSI alerts
  if (psi.value > thresholds.psiCritical) {
    alerts.push({
      id: `alert-${++alertCounter}`,
      timestamp: now,
      type: "psi_critical",
      severity: "critical",
      title: "Peg Stress Index Critical",
      message: `PSI at ${psi.value}/100 (threshold: ${thresholds.psiCritical}). Elevated peg risk detected across multiple indicators.`,
    });
  } else if (psi.value > thresholds.psiWarning) {
    alerts.push({
      id: `alert-${++alertCounter}`,
      timestamp: now,
      type: "psi_critical",
      severity: "warning",
      title: "Peg Stress Elevated",
      message: `PSI at ${psi.value}/100 (threshold: ${thresholds.psiWarning}). Monitoring recommended.`,
    });
  }

  // Cliff alerts
  for (const cliff of cliffs.slice(0, 3)) {
    alerts.push({
      id: `alert-${++alertCounter}`,
      timestamp: now,
      type: "liquidity_cliff",
      severity: cliff.severity,
      title: "Liquidity Cliff Detected",
      message: `${cliff.dropPercent}% liquidity drop at tick ${cliff.tick} (${cliff.side} side). Peg ${cliff.side === "bid" ? "downside" : "upside"} vulnerable.`,
      data: { tick: cliff.tick, dropPercent: cliff.dropPercent },
    });
  }

  // Whale wall alerts
  for (const wall of whaleWalls.slice(0, 2)) {
    alerts.push({
      id: `alert-${++alertCounter}`,
      timestamp: now,
      type: "whale_wall",
      severity: "info",
      title: "Whale Wall Detected",
      message: `${wall.classification} wall at tick ${wall.tick} — ${formatLiquidity(wall.liquidity)} (${wall.percentOfTotal}% of total depth).`,
      data: { tick: wall.tick, liquidity: wall.liquidity },
    });
  }

  // Spread warning
  const spread = spreadPercent(orderbook.bestBid.price, orderbook.bestAsk.price);
  if (spread > thresholds.spreadWarning) {
    alerts.push({
      id: `alert-${++alertCounter}`,
      timestamp: now,
      type: "spread_warning",
      severity: spread > thresholds.spreadCritical ? "critical" : "warning",
      title: "Spread Widening",
      message: `Current spread at ${spread.toFixed(3)}%. Market efficiency degrading.`,
    });
  }

  // Peg deviation
  const midPrice = orderbook.midPrice;
  const devPct = Math.abs(midPrice - 1.0) * 100;
  if (devPct > 0.1) {
    alerts.push({
      id: `alert-${++alertCounter}`,
      timestamp: now,
      type: "peg_deviation",
      severity: devPct > 0.5 ? "critical" : "warning",
      title: "Peg Deviation Alert",
      message: `Mid price at ${formatPrice(midPrice, 6)}. Deviation of ${devPct.toFixed(3)}% from peg.`,
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Export snapshot as JSON report
// ---------------------------------------------------------------------------

export function generateReport(
  dashboard: {
    psi: PSIResult;
    cliffs: LiquidityCliff[];
    whaleWalls: WhaleWall[];
    flipMetrics: FlipOrderMetrics;
    forecast: StabilityForecast;
    concentration: ConcentrationRisk;
    spread: { absolute: number; percentage: number };
    pegDeviation: { absolute: number; percentage: number; direction: string };
    liquidityDepth: { totalBid: number; totalAsk: number; ratio: number; nearPeg: number };
    alerts: SentinelAlert[];
  },
  pairLabel: string
): object {
  return {
    report: "Tempo Sentinel — Peg Stability Report",
    generatedAt: new Date().toISOString(),
    pair: pairLabel,
    summary: {
      pegStressIndex: dashboard.psi.value,
      pegStressLevel: dashboard.psi.level,
      stabilityForecast: dashboard.forecast.probability,
      spreadPercent: dashboard.spread.percentage,
      pegDeviation: dashboard.pegDeviation,
      concentrationRisk: dashboard.concentration.level,
    },
    metrics: {
      psi: dashboard.psi,
      concentration: dashboard.concentration,
      liquidityDepth: dashboard.liquidityDepth,
      spread: dashboard.spread,
      flipOrders: dashboard.flipMetrics,
      forecast: dashboard.forecast,
    },
    detections: {
      whaleWalls: dashboard.whaleWalls,
      liquidityCliffs: dashboard.cliffs,
    },
    alerts: dashboard.alerts,
  };
}
