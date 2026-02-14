// ============================================================================
// Tempo Sentinel — Live Orderbook API Route
// ============================================================================
// GET /api/orderbook → Returns live orderbook from Tempo chain

import { NextResponse } from "next/server";
import { fetchLiveOrderbook } from "@/lib/tempo-client";

// Cache the last successful fetch to avoid hammering RPC
let cachedSnapshot: Awaited<ReturnType<typeof fetchLiveOrderbook>> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 2000; // 2 seconds

export async function GET() {
  try {
    const now = Date.now();

    // Return cached if fresh enough
    if (cachedSnapshot && now - lastFetchTime < CACHE_TTL) {
      return NextResponse.json({
        source: "live",
        cached: true,
        data: cachedSnapshot,
      });
    }

    // Fetch fresh data from Tempo chain
    const snapshot = await fetchLiveOrderbook();
    cachedSnapshot = snapshot;
    lastFetchTime = now;

    return NextResponse.json({
      source: "live",
      cached: false,
      data: snapshot,
    });
  } catch (error) {
    console.error("[Sentinel API] Orderbook fetch error:", error);

    // Return cached data if available, even if stale
    if (cachedSnapshot) {
      return NextResponse.json({
        source: "live",
        cached: true,
        stale: true,
        data: cachedSnapshot,
      });
    }

    return NextResponse.json(
      {
        source: "error",
        error: "Failed to fetch live orderbook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
