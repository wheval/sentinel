"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DashboardState,
  OrderbookSnapshot,
  AlertThresholds,
  DEFAULT_THRESHOLDS,
} from "@/lib/types";
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
  calculateConcentrationRisk,
  generateReport,
} from "@/lib/metrics-engine";
import { spreadPercent, pegDeviation } from "@/lib/tempo-math";
import { appendMetrics, getRecentHistory, type HistoryPoint } from "@/lib/history";
import { KNOWN_PAIRS, type TempoPair } from "@/lib/tempo-client";

const REFRESH_INTERVAL = 3000;

type DataSource = "live" | "mock";

export function useSentinel() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [historicalPSI, setHistoricalPSI] = useState<HistoryPoint[]>([]);
  const [historicalSpread, setHistoricalSpread] = useState<HistoryPoint[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>("live");
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "fallback"
  >("connecting");
  const [selectedPair, setSelectedPairRaw] = useState<TempoPair>(KNOWN_PAIRS[0]);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [isSwitchingPair, setIsSwitchingPair] = useState(false);
  const failCountRef = useRef(0);

  // Load thresholds from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sentinel_thresholds");
    if (saved) {
      try {
        setThresholds({ ...DEFAULT_THRESHOLDS, ...JSON.parse(saved) });
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Save thresholds
  const updateThresholds = useCallback((t: AlertThresholds) => {
    setThresholds(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("sentinel_thresholds", JSON.stringify(t));
    }
  }, []);

  // Load historical data from localStorage on pair change
  useEffect(() => {
    const psiHistory = getRecentHistory(selectedPair.id, "psi", 60);
    const spreadHistory = getRecentHistory(selectedPair.id, "spread", 60);
    setHistoricalPSI(psiHistory);
    setHistoricalSpread(spreadHistory);

    // If no history, seed with mock for visual
    if (psiHistory.length === 0) {
      const mock = generateHistoricalPSI(30);
      setHistoricalPSI(mock.map((m) => ({ t: m.time, v: m.value })));
    }
    if (spreadHistory.length === 0) {
      const mock = generateHistoricalSpread(30);
      setHistoricalSpread(mock.map((m) => ({ t: m.time, v: m.value })));
    }
  }, [selectedPair]);

  // Fetch live data
  const fetchLiveData = useCallback(
    async (): Promise<OrderbookSnapshot | null> => {
      try {
        const res = await fetch(
          `/api/orderbook?pair=${selectedPair.id}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.source === "error") throw new Error(json.message);
        failCountRef.current = 0;
        setConnectionStatus("connected");
        return json.data as OrderbookSnapshot;
      } catch {
        failCountRef.current++;
        if (failCountRef.current >= 3) {
          setDataSource("mock");
          setConnectionStatus("fallback");
        }
        return null;
      }
    },
    [selectedPair]
  );

  // Process a snapshot
  const processSnapshot = useCallback(
    (orderbook: OrderbookSnapshot) => {
      const psi = calculatePSI(orderbook, selectedPair.id);
      const cliffs = detectLiquidityCliffs(
        orderbook,
        thresholds.cliffDropPercent / 100
      );
      const whaleWalls = detectWhaleWalls(
        orderbook,
        thresholds.whalePercent / 100
      );
      const flipMetrics = analyzeFlipOrders(orderbook);
      const forecast = calculateStabilityForecast(psi, orderbook, cliffs);
      const concentration = calculateConcentrationRisk(orderbook);
      const alerts = generateAlerts(
        psi,
        cliffs,
        whaleWalls,
        orderbook,
        thresholds
      );

      const spread = spreadPercent(
        orderbook.bestBid.price,
        orderbook.bestAsk.price
      );
      const deviation = pegDeviation(orderbook.midPrice);

      const totalBid = orderbook.bids.reduce((s, l) => s + l.liquidity, 0);
      const totalAsk = orderbook.asks.reduce((s, l) => s + l.liquidity, 0);
      const nearPeg = [...orderbook.bids, ...orderbook.asks]
        .filter((l) => Math.abs(l.tick) <= 50)
        .reduce((s, l) => s + l.liquidity, 0);

      const newDashboard: DashboardState = {
        orderbook,
        psi,
        cliffs,
        whaleWalls,
        flipMetrics,
        forecast,
        alerts,
        concentration,
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
      };

      setDashboard(newDashboard);

      // Persist to localStorage
      appendMetrics(selectedPair.id, {
        psi: psi.value,
        spread,
        bidDepth: totalBid,
        askDepth: totalAsk,
        imbalance: totalBid / (totalBid + totalAsk) * 100,
        nearPegLiq: nearPeg,
        pegDev: deviation.percentage,
      });

      // Update in-memory historical arrays
      const now = Date.now();
      setHistoricalPSI((prev) => {
        const next = [...prev, { t: now, v: psi.value }];
        return next.slice(-720);
      });
      setHistoricalSpread((prev) => {
        const next = [...prev, { t: now, v: spread }];
        return next.slice(-720);
      });
    },
    [selectedPair, thresholds]
  );

  // Main refresh
  const refresh = useCallback(async () => {
    if (dataSource === "live") {
      const liveData = await fetchLiveData();
      if (liveData) {
        processSnapshot(liveData);
        setIsSwitchingPair(false);
        return;
      }
    }
    const mockData = generateOrderbookSnapshot();
    processSnapshot(mockData);
    setIsSwitchingPair(false);
  }, [dataSource, fetchLiveData, processSnapshot]);

  // Wrap setSelectedPair — only show banner when switching to a different pair
  const setSelectedPair = useCallback((pair: TempoPair) => {
    if (pair.id === selectedPair.id) return;
    setIsSwitchingPair(true);
    setSelectedPairRaw(pair);
  }, [selectedPair.id]);

  // Initialize
  useEffect(() => {
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

  // Export report
  const exportReport = useCallback(() => {
    if (!dashboard) return;
    const report = generateReport(dashboard, selectedPair.label);
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentinel-report-${selectedPair.id}-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dashboard, selectedPair]);

  return {
    dashboard,
    historicalPSI,
    historicalSpread,
    isLive,
    setIsLive,
    isSwitchingPair,
    refresh,
    dataSource,
    connectionStatus,
    toggleDataSource,
    selectedPair,
    setSelectedPair,
    pairs: KNOWN_PAIRS,
    thresholds,
    updateThresholds,
    exportReport,
  };
}
