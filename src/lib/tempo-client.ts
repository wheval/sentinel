// ============================================================================
// Tempo Sentinel — Live Tempo Chain Client
// ============================================================================
// Connects to Tempo Moderato testnet via viem/tempo SDK.

import { createClient, http, publicActions, type Address } from "viem";
import { tempoModerato } from "viem/chains";
import { tempoActions, Addresses, Abis, Tick } from "viem/tempo";
import type { OrderbookSnapshot, OrderbookLevel } from "./types";

// ---------------------------------------------------------------------------
// Chain config (add multicall3 support)
// ---------------------------------------------------------------------------

const chain = {
  ...tempoModerato,
  contracts: {
    ...tempoModerato.contracts,
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address,
    },
  },
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const client = createClient({
  chain,
  transport: http(),
})
  .extend(publicActions)
  .extend(tempoActions());

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEX_ADDRESS = Addresses.stablecoinDex as `0x${string}`;
const DEX_ABI = Abis.stablecoinDex;

// AlphaUSD is the main stablecoin on Tempo testnet
const ALPHA_USD = "0x20c0000000000000000000000000000000000001" as Address;
const PATH_USD = Addresses.pathUsd;

const PRICE_SCALE = 100_000;
const TICK_SPACING = 10;
const SCAN_MIN_TICK = -500;
const SCAN_MAX_TICK = 500;

// How many orders to sample per tick for flip detection
const FLIP_SAMPLE_SIZE = 10;

// ---------------------------------------------------------------------------
// Fetch full orderbook via multicall
// ---------------------------------------------------------------------------

export async function fetchLiveOrderbook(): Promise<OrderbookSnapshot> {
  // 1. Build tick range
  const ticks: number[] = [];
  for (let t = SCAN_MIN_TICK; t <= SCAN_MAX_TICK; t += TICK_SPACING) {
    ticks.push(t);
  }

  // 2. Multicall getTickLevel for all ticks (both bid and ask)
  const calls = ticks.flatMap((tick) => [
    {
      address: DEX_ADDRESS,
      abi: DEX_ABI,
      functionName: "getTickLevel" as const,
      args: [ALPHA_USD, tick, true] as const, // bid
    },
    {
      address: DEX_ADDRESS,
      abi: DEX_ABI,
      functionName: "getTickLevel" as const,
      args: [ALPHA_USD, tick, false] as const, // ask
    },
  ]);

  const results = await client.multicall({ contracts: calls });

  // 3. Parse results into OrderbookLevel arrays
  const bids: OrderbookLevel[] = [];
  const asks: OrderbookLevel[] = [];

  // Collect ticks that need flip sampling
  const ticksToSampleFlip: { tick: number; isBid: boolean; head: bigint }[] = [];

  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i];
    const bidResult = results[i * 2];
    const askResult = results[i * 2 + 1];

    if (bidResult.status === "success") {
      const [head, tail, totalLiquidity] = bidResult.result as [bigint, bigint, bigint];
      if (totalLiquidity > 0n) {
        const liqUsd = Number(totalLiquidity) / 1e6; // TIP-20 uses 6 decimals
        bids.push({
          tick,
          price: tickToPrice(tick),
          liquidity: liqUsd,
          side: "bid",
          isFlipOrder: false, // Will be updated by flip sampling
          orderCount: estimateOrderCount(head, tail),
        });
        if (head > 0n) {
          ticksToSampleFlip.push({ tick, isBid: true, head });
        }
      }
    }

    if (askResult.status === "success") {
      const [head, tail, totalLiquidity] = askResult.result as [bigint, bigint, bigint];
      if (totalLiquidity > 0n) {
        const liqUsd = Number(totalLiquidity) / 1e6;
        asks.push({
          tick,
          price: tickToPrice(tick),
          liquidity: liqUsd,
          side: "ask",
          isFlipOrder: false,
          orderCount: estimateOrderCount(head, tail),
        });
        if (head > 0n) {
          ticksToSampleFlip.push({ tick, isBid: false, head });
        }
      }
    }
  }

  // 4. Sample flip orders (sample head order from a subset of ticks)
  await sampleFlipOrders(ticksToSampleFlip, bids, asks);

  // 5. Sort
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  const bestBid = bids[0] || createEmptyLevel("bid", -TICK_SPACING);
  const bestAsk = asks[0] || createEmptyLevel("ask", TICK_SPACING);
  const midPrice = (bestBid.price + bestAsk.price) / 2;

  return {
    timestamp: Date.now(),
    bestBid,
    bestAsk,
    bids,
    asks,
    midPrice,
    pegPrice: 1.0,
  };
}

// ---------------------------------------------------------------------------
// Flip order sampling
// ---------------------------------------------------------------------------

async function sampleFlipOrders(
  ticksToSample: { tick: number; isBid: boolean; head: bigint }[],
  bids: OrderbookLevel[],
  asks: OrderbookLevel[]
) {
  // Sample a subset of ticks to avoid too many RPC calls
  const sampled = ticksToSample.slice(0, 30); // Max 30 ticks to sample

  // Multicall getOrder for head of each sampled tick
  const orderCalls = sampled.map((t) => ({
    address: DEX_ADDRESS,
    abi: DEX_ABI,
    functionName: "getOrder" as const,
    args: [t.head] as const,
  }));

  if (orderCalls.length === 0) return;

  const orderResults = await client.multicall({ contracts: orderCalls });

  for (let i = 0; i < sampled.length; i++) {
    const result = orderResults[i];
    if (result.status !== "success") continue;

    const order = result.result as {
      amount: bigint;
      isBid: boolean;
      isFlip: boolean;
      tick: number;
      remaining: bigint;
    };

    const { tick, isBid } = sampled[i];
    const levels = isBid ? bids : asks;
    const level = levels.find((l) => l.tick === tick);

    if (level && order.isFlip) {
      level.isFlipOrder = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tickToPrice(tick: number): number {
  return (PRICE_SCALE + tick) / PRICE_SCALE;
}

function estimateOrderCount(head: bigint, tail: bigint): number {
  if (head === 0n) return 0;
  if (head === tail) return 1;
  // Orders are monotonically increasing IDs, so rough estimate
  const diff = Number(tail - head);
  // IDs aren't contiguous (gaps from cancelled orders), so heuristic
  return Math.max(1, Math.min(diff, 100));
}

function createEmptyLevel(side: "bid" | "ask", tick: number): OrderbookLevel {
  return {
    tick,
    price: tickToPrice(tick),
    liquidity: 0,
    side,
    isFlipOrder: false,
    orderCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Get books metadata (best bid/ask ticks)
// ---------------------------------------------------------------------------

export async function fetchBooksMeta() {
  const pairKey = await client.readContract({
    address: DEX_ADDRESS,
    abi: DEX_ABI,
    functionName: "pairKey",
    args: [ALPHA_USD, PATH_USD],
  });

  const books = await client.readContract({
    address: DEX_ADDRESS,
    abi: DEX_ABI,
    functionName: "books",
    args: [pairKey as `0x${string}`],
  });

  return books;
}
