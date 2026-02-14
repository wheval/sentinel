"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardState, OrderbookSnapshot } from "@/lib/types";
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

type DataSource = "live" | "mock";

export function useSentinel() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [historicalPSI, setHistoricalPSI] = useState<{ time: number; value: number }[]>([]);
  const [historicalSpread, setHistoricalSpread] = useState<{ time: number; value: number }[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>("live");
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "fallback">("connecting");
  const failCountRef = useRef(0);

  // Fetch live data from API route
  const fetchLiveData = useCallback(async (): Promise<OrderbookSnapshot | null> => {
    try {
      const res = await fetch("/api/orderbook");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.source === "error") throw new Error(json.message);
      failCountRef.current = 0;
      setConnectionStatus("connected");
      return json.data as OrderbookSnapshot;
    } catch {
      failCountRef.current++;
      // Fall back to mock after 3 consecutive failures
      if (failCountRef.current >= 3) {
        setDataSource("mock");
        setConnectionStatus("fallback");
      }
      return null;
    }
  }, []);

  // Process an orderbook snapshot through the metrics engine
  const processSnapshot = useCallback((orderbook: OrderbookSnapshot) => {
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
      return next.slice(-120);
    });
    setHistoricalSpread((prev) => {
      const next = [...prev, { time: Date.now(), value: spread }];
      return next.slice(-120);
    });
  }, []);

  // Main refresh function
  const refresh = useCallback(async () => {
    if (dataSource === "live") {
      const liveData = await fetchLiveData();
      if (liveData) {
        processSnapshot(liveData);
        return;
      }
    }
    // Fallback to mock
    const mockData = generateOrderbookSnapshot();
    processSnapshot(mockData);
  }, [dataSource, fetchLiveData, processSnapshot]);

  // Initialize
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

  // Toggle data source
  const toggleDataSource = useCallback(() => {
    setDataSource((prev) => {
      const next = prev === "live" ? "mock" : "live";
      if (next === "live") {
        failCountRef.current = 0;
        setConnectionStatus("connecting");
      } else {
        setConnectionStatus("fallback");
      }
      return next;
    });
  }, []);

  return {
    dashboard,
    historicalPSI,
    historicalSpread,
    isLive,
    setIsLive,
    refresh,
    dataSource,
    connectionStatus,
    toggleDataSource,
  };
}
