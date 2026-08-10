// =============================================================================
//  MetricTile – single KPI number with label and unit
// =============================================================================
import { cn } from "@/lib/formatters";
import type { ReactNode } from "react";

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "stable";
  className?: string;
}

const TREND_ICON = {
  up:     <span className="text-green-600 text-xs">▲</span>,
  down:   <span className="text-red-600   text-xs">▼</span>,
  stable: <span className="text-gray-400  text-xs">─</span>,
};

export function MetricTile({
  label,
  value,
  unit,
  icon,
  trend,
  className,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg bg-gray-50 p-4 border border-gray-100",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && (
          <span className="mb-0.5 text-sm text-gray-500">{unit}</span>
        )}
        {trend && <span className="mb-0.5">{TREND_ICON[trend]}</span>}
      </div>
    </div>
  );
}
