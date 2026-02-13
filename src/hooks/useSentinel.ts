"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardState } from "@/lib/types";
import {
  generateOrderbookSnapshot,
  generateHistoricalPSI,
  generateHistoricalSpread,
} from "@/lib/mock-data";
import {
  calculatePSI,
  detectLiquidityCliffs,
  detectWhaleWalls,
  analyzeFlipOrders,
  calculateStabilityForecast,
  generateAlerts,
} from "@/lib/metrics-engine";
import { spreadPercent, pegDeviation } from "@/lib/tempo-math";

const REFRESH_INTERVAL = 3000; // 3 seconds

export function useSentinel() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [historicalPSI, setHistoricalPSI] = useState<{ time: number; value: number }[]>([]);
  const [historicalSpread, setHistoricalSpread] = useState<{ time: number; value: number }[]>([]);
  const [isLive, setIsLive] = useState(true);

  const refresh = useCallback(() => {
    const orderbook = generateOrderbookSnapshot();
    const psi = calculatePSI(orderbook);
    const cliffs = detectLiquidityCliffs(orderbook);
    const whaleWalls = detectWhaleWalls(orderbook);
    const flipMetrics = analyzeFlipOrders(orderbook);
    const forecast = calculateStabilityForecast(psi, orderbook, cliffs);
    const alerts = generateAlerts(psi, cliffs, whaleWalls, orderbook);

    const spread = spreadPercent(orderbook.bestBid.price, orderbook.bestAsk.price);
    const deviation = pegDeviation(orderbook.midPrice);

    const totalBid = orderbook.bids.reduce((s, l) => s + l.liquidity, 0);
    const totalAsk = orderbook.asks.reduce((s, l) => s + l.liquidity, 0);
    const nearPeg = [...orderbook.bids, ...orderbook.asks]
      .filter((l) => Math.abs(l.tick) <= 50)
      .reduce((s, l) => s + l.liquidity, 0);

    setDashboard({
      orderbook,
      psi,
      cliffs,
      whaleWalls,
      flipMetrics,
      forecast,
      alerts,
      spread: {
        absolute: orderbook.bestAsk.price - orderbook.bestBid.price,
        percentage: spread,
      },
      pegDeviation: deviation,
      liquidityDepth: {
        totalBid,
        totalAsk,
        ratio: totalAsk > 0 ? totalBid / totalAsk : 1,
        nearPeg,
      },
    });

    // Append to historical
    setHistoricalPSI((prev) => {
      const next = [...prev, { time: Date.now(), value: psi.value }];
      return next.slice(-120); // Keep last 120 points
    });
    setHistoricalSpread((prev) => {
      const next = [...prev, { time: Date.now(), value: spread }];
      return next.slice(-120);
    });
  }, []);

  // Initialize with historical data
  useEffect(() => {
    setHistoricalPSI(generateHistoricalPSI(60));
    setHistoricalSpread(generateHistoricalSpread(60));
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [isLive, refresh]);

  return {
    dashboard,
    historicalPSI,
    historicalSpread,
    isLive,
    setIsLive,
    refresh,
  };
}
