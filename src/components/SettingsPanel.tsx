"use client";

import { useState } from "react";
import { AlertThresholds, DEFAULT_THRESHOLDS } from "@/lib/types";

interface SettingsPanelProps {
  thresholds: AlertThresholds;
  onUpdate: (t: AlertThresholds) => void;
  onClose: () => void;
}

export function SettingsPanel({
  thresholds,
  onUpdate,
  onClose,
}: SettingsPanelProps) {
  const [local, setLocal] = useState<AlertThresholds>({ ...thresholds });

  const update = (key: keyof AlertThresholds, value: number) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    onUpdate(local);
    onClose();
  };

  const reset = () => {
    setLocal({ ...DEFAULT_THRESHOLDS });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#1e2733]">
          <h2 className="text-lg font-semibold text-[#e6edf3]">
            Alert Thresholds
          </h2>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors text-xl leading-none"
          >
            x
          </button>
        </div>

        <div className="p-5 space-y-5">
          <ThresholdSlider
            label="PSI Warning Level"
            value={local.psiWarning}
            min={10}
            max={90}
            step={5}
            onChange={(v) => update("psiWarning", v)}
            color="#f59e0b"
          />
          <ThresholdSlider
            label="PSI Critical Level"
            value={local.psiCritical}
            min={10}
            max={90}
            step={5}
            onChange={(v) => update("psiCritical", v)}
            color="#ef4444"
          />
          <ThresholdSlider
            label="Spread Warning (%)"
            value={local.spreadWarning}
            min={0.05}
            max={1}
            step={0.05}
            onChange={(v) => update("spreadWarning", v)}
            color="#f59e0b"
            format={(v) => `${v.toFixed(2)}%`}
          />
          <ThresholdSlider
            label="Spread Critical (%)"
            value={local.spreadCritical}
            min={0.1}
            max={2}
            step={0.1}
            onChange={(v) => update("spreadCritical", v)}
            color="#ef4444"
            format={(v) => `${v.toFixed(1)}%`}
          />
          <ThresholdSlider
            label="Cliff Drop Threshold (%)"
            value={local.cliffDropPercent}
            min={30}
            max={95}
            step={5}
            onChange={(v) => update("cliffDropPercent", v)}
            color="#a371f7"
            format={(v) => `${v}%`}
          />
          <ThresholdSlider
            label="Whale Wall Threshold (%)"
            value={local.whalePercent}
            min={1}
            max={20}
            step={1}
            onChange={(v) => update("whalePercent", v)}
            color="#f0883e"
            format={(v) => `${v}%`}
          />
        </div>

        <div className="flex items-center justify-between p-5 border-t border-[#1e2733]">
          <button
            onClick={reset}
            className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#8b949e] border border-[#30363d] rounded-lg hover:bg-[#161b22] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-4 py-2 text-xs text-white bg-[#1f6feb] rounded-lg hover:bg-[#388bfd] transition-colors"
            >
              Save Thresholds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThresholdSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  color,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color: string;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-[#8b949e]">{label}</span>
        <span className="font-mono" style={{ color }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${((value - min) / (max - min)) * 100}%, #1e2733 ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </div>
  );
}
