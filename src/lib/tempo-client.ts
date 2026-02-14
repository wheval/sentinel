// ============================================================================
// Tempo Sentinel — Live Tempo Chain Client
// ============================================================================
// Connects to Tempo Moderato testnet via viem/tempo SDK.
// Supports multi-pair orderbook scanning.

import { createClient, http, publicActions, type Address } from "viem";
import { tempoModerato } from "viem/chains";
import { tempoActions, Addresses, Abis } from "viem/tempo";
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
// Known pairs on Tempo Moderato
// ---------------------------------------------------------------------------

export interface TempoPair {
  id: string;
  base: Address;
  quote: Address;
  baseSymbol: string;
  quoteSymbol: string;
  label: string;
}

export const KNOWN_PAIRS: TempoPair[] = [
  {
    id: "alpha-pathusd",
    base: "0x20c0000000000000000000000000000000000001" as Address,
    quote: Addresses.pathUsd as Address,
    baseSymbol: "AlphaUSD",
    quoteSymbol: "pathUSD",
    label: "AlphaUSD / pathUSD",
  },
  {
    id: "beta-pathusd",
    base: "0x20c0000000000000000000000000000000000002" as Address,
    quote: Addresses.pathUsd as Address,
    baseSymbol: "BetaUSD",
    quoteSymbol: "pathUSD",
    label: "BetaUSD / pathUSD",
  },
  {
    id: "theta-pathusd",
    base: "0x20c0000000000000000000000000000000000003" as Address,
    quote: Addresses.pathUsd as Address,
    baseSymbol: "ThetaUSD",
    quoteSymbol: "pathUSD",
    label: "ThetaUSD / pathUSD",
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEX_ADDRESS = Addresses.stablecoinDex as `0x${string}`;
const DEX_ABI = Abis.stablecoinDex;
const PRICE_SCALE = 100_000;
const TICK_SPACING = 10;
const SCAN_MIN_TICK = -500;
const SCAN_MAX_TICK = 500;

// ---------------------------------------------------------------------------
// Fetch full orderbook via multicall
// ---------------------------------------------------------------------------

export async function fetchLiveOrderbook(
  baseToken?: Address
): Promise<OrderbookSnapshot> {
  const base = baseToken || KNOWN_PAIRS[0].base;

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
      args: [base, tick, true] as const,
    },
    {
      address: DEX_ADDRESS,
      abi: DEX_ABI,
      functionName: "getTickLevel" as const,
      args: [base, tick, false] as const,
    },
  ]);

  const results = await client.multicall({ contracts: calls });

  // 3. Parse results into OrderbookLevel arrays
  const bids: OrderbookLevel[] = [];
  const asks: OrderbookLevel[] = [];
  const ticksToSampleFlip: { tick: number; isBid: boolean; head: bigint }[] =
    [];

  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i];
    const bidResult = results[i * 2];
    const askResult = results[i * 2 + 1];

    if (bidResult.status === "success") {
      const [head, tail, totalLiquidity] = bidResult.result as [
        bigint,
        bigint,
        bigint,
      ];
      if (totalLiquidity > 0n) {
        const liqUsd = Number(totalLiquidity) / 1e6;
        bids.push({
          tick,
          price: tickToPrice(tick),
          liquidity: liqUsd,
          side: "bid",
          isFlipOrder: false,
          orderCount: estimateOrderCount(head, tail),
        });
        if (head > 0n) {
          ticksToSampleFlip.push({ tick, isBid: true, head });
        }
      }
    }

    if (askResult.status === "success") {
      const [head, tail, totalLiquidity] = askResult.result as [
        bigint,
        bigint,
        bigint,
      ];
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

  // 4. Sample flip orders
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
  const sampled = ticksToSample.slice(0, 30);

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
  const diff = Number(tail - head);
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
