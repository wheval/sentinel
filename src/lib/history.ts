// ============================================================================
// Tempo Sentinel — Historical Data Persistence (localStorage)
// ============================================================================
// Stores time-series metrics in localStorage for "last N minutes" charts.

const STORAGE_KEY_PREFIX = "sentinel_history_";
const MAX_POINTS = 720; // 1 hour at 5-second intervals
const CLEANUP_THRESHOLD = 800;

export interface HistoryPoint {
  t: number; // timestamp
  v: number; // value
}

export type MetricKey =
  | "psi"
  | "spread"
  | "bidDepth"
  | "askDepth"
  | "imbalance"
  | "nearPegLiq"
  | "pegDev";

function getKey(pairId: string, metric: MetricKey): string {
  return `${STORAGE_KEY_PREFIX}${pairId}_${metric}`;
}

/** Read history for a metric */
export function readHistory(
  pairId: string,
  metric: MetricKey
): HistoryPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getKey(pairId, metric));
    if (!raw) return [];
    return JSON.parse(raw) as HistoryPoint[];
  } catch {
    return [];
  }
}

/** Append a new point to a metric's history */
export function appendHistory(
  pairId: string,
  metric: MetricKey,
  value: number
): void {
  if (typeof window === "undefined") return;
  try {
    const key = getKey(pairId, metric);
    const history = readHistory(pairId, metric);
    history.push({ t: Date.now(), v: value });

    // Trim if over threshold
    const trimmed =
      history.length > CLEANUP_THRESHOLD
        ? history.slice(-MAX_POINTS)
        : history;

    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // localStorage full — clear old data
    clearHistory(pairId, metric);
  }
}

/** Append multiple metrics at once */
export function appendMetrics(
  pairId: string,
  metrics: Partial<Record<MetricKey, number>>
): void {
  for (const [key, value] of Object.entries(metrics)) {
    if (value !== undefined) {
      appendHistory(pairId, key as MetricKey, value);
    }
  }
}

/** Clear history for a specific metric */
export function clearHistory(pairId: string, metric: MetricKey): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getKey(pairId, metric));
}

/** Clear all history for a pair */
export function clearPairHistory(pairId: string): void {
  if (typeof window === "undefined") return;
  const metrics: MetricKey[] = [
    "psi",
    "spread",
    "bidDepth",
    "askDepth",
    "imbalance",
    "nearPegLiq",
    "pegDev",
  ];
  metrics.forEach((m) => clearHistory(pairId, m));
}

/** Get history for the last N minutes */
export function getRecentHistory(
  pairId: string,
  metric: MetricKey,
  minutes: number = 60
): HistoryPoint[] {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return readHistory(pairId, metric).filter((p) => p.t >= cutoff);
}
