// =============================================================================
//  ForecastBar – 24 / 48 / 72h moisture forecast mini-bars
// =============================================================================
"use client";

import type { MlForecast } from "@/types";
import { cn } from "@/lib/formatters";

interface Props {
  forecast: MlForecast;
}

function BarItem({ label, value, confidence }: { label: string; value: number; confidence: number }) {
  const fillColor =
    value >= 40 ? "bg-brand-green" : value >= 20 ? "bg-brand-yellow" : "bg-brand-red";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span>{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className={cn("h-2 rounded-full transition-all", fillColor)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <div className="text-right text-[10px] text-gray-400">
        conf. {(confidence * 100).toFixed(0)}%
      </div>
    </div>
  );
}

export function ForecastBar({ forecast }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {forecast.predictions.map((p) => (
        <BarItem
          key={p.hoursAhead}
          label={`+${p.hoursAhead}h`}
          value={p.soilMoisture}
          confidence={p.confidence}
        />
      ))}
    </div>
  );
}
