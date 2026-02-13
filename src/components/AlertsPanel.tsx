"use client";

import { SentinelAlert } from "@/lib/types";

interface AlertsPanelProps {
  alerts: SentinelAlert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const severityConfig = {
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      dot: "bg-red-500",
      text: "text-red-400",
      label: "CRITICAL",
    },
    warning: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      dot: "bg-yellow-500",
      text: "text-yellow-400",
      label: "WARNING",
    },
    info: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      dot: "bg-blue-500",
      text: "text-blue-400",
      label: "INFO",
    },
  };

  const typeIcons: Record<string, string> = {
    psi_critical: "⚡",
    liquidity_cliff: "🏔",
    whale_wall: "🐋",
    spread_warning: "⟷",
    peg_deviation: "⊘",
    flip_anomaly: "↻",
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider mb-4">
          Sentinel Alerts
        </h3>
        <div className="text-center py-8 text-[#484f58]">
          <div className="text-2xl mb-2">✓</div>
          <div className="text-sm">No active alerts. System nominal.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border border-[#1e2733] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#8b949e] uppercase tracking-wider">
          Sentinel Alerts
        </h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-xs text-[#8b949e]">{alerts.length} active</span>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {alerts.map((alert) => {
          const config = severityConfig[alert.severity];
          return (
            <div
              key={alert.id}
              className={`${config.bg} border ${config.border} rounded-lg p-3 transition-all`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {typeIcons[alert.type] || "⚠"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${config.text}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-[#484f58]">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-[#e6edf3] font-medium mb-0.5">
                    {alert.title}
                  </div>
                  <div className="text-xs text-[#8b949e]">{alert.message}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
