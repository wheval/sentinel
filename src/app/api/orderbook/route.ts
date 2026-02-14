// ============================================================================
// Tempo Sentinel — Live Orderbook API Route
// ============================================================================
// GET /api/orderbook?pair=alpha-pathusd → Returns live orderbook from Tempo

import { NextRequest, NextResponse } from "next/server";
import { fetchLiveOrderbook, KNOWN_PAIRS } from "@/lib/tempo-client";
import type { Address } from "viem";

// Cache per pair
const cache = new Map<
  string,
  { data: Awaited<ReturnType<typeof fetchLiveOrderbook>>; time: number }
>();
const CACHE_TTL = 2000;

export async function GET(request: NextRequest) {
  try {
    const pairId =
      request.nextUrl.searchParams.get("pair") || KNOWN_PAIRS[0].id;
    const pair = KNOWN_PAIRS.find((p) => p.id === pairId);

    if (!pair) {
      return NextResponse.json(
        { source: "error", error: "Unknown pair", availablePairs: KNOWN_PAIRS.map((p) => p.id) },
        { status: 400 }
      );
    }

    const now = Date.now();
    const cached = cache.get(pairId);

    if (cached && now - cached.time < CACHE_TTL) {
      return NextResponse.json({
        source: "live",
        cached: true,
        pair: pairId,
        data: cached.data,
      });
    }

    const snapshot = await fetchLiveOrderbook(pair.base as Address);
    cache.set(pairId, { data: snapshot, time: now });

    return NextResponse.json({
      source: "live",
      cached: false,
      pair: pairId,
      data: snapshot,
    });
  } catch (error) {
    console.error("[Sentinel API] Orderbook fetch error:", error);

    // Return any cached data
    const pairId =
      new URL(request.url).searchParams.get("pair") || KNOWN_PAIRS[0].id;
    const cached = cache.get(pairId);
    if (cached) {
      return NextResponse.json({
        source: "live",
        cached: true,
        stale: true,
        pair: pairId,
        data: cached.data,
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
