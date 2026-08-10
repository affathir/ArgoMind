// =============================================================================
//  StatusBadge – visual pill for drought stress level
// =============================================================================
import { cn } from "@/lib/formatters";
import type { StressLabel } from "@/types";
import { STRESS_CONFIG } from "@/types";

interface StatusBadgeProps {
  level: StressLabel;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const SIZE = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1  text-sm",
  lg: "px-4 py-1.5 text-base font-semibold",
};

const BG_COLOR: Record<StressLabel, string> = {
  healthy:  "bg-green-100  text-green-800  border-green-300",
  watch:    "bg-yellow-100 text-yellow-800 border-yellow-300",
  alert:    "bg-red-100    text-red-700    border-red-300",
  critical: "bg-red-900    text-red-100    border-red-700",
};

export function StatusBadge({ level, size = "md", pulse = false }: StatusBadgeProps) {
  const cfg = STRESS_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        SIZE[size],
        BG_COLOR[level],
        pulse && "animate-pulse_slow"
      )}
    >
      {/* Dot indicator */}
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: cfg.hex }}
      />
      {cfg.label}
    </span>
  );
}
