import React from "react";

interface Props {
  label: string;
  value: string | number | null;
  unit?: string;
  icon: React.ReactNode;
  status?: "normal" | "warning" | "critical";
  sublabel?: string;
}

const statusStyles: Record<string, string> = {
  normal:   "border-green-200 bg-white",
  warning:  "border-yellow-300 bg-yellow-50",
  critical: "border-red-300 bg-red-50",
};

const statusDot: Record<string, string> = {
  normal:   "bg-green-500",
  warning:  "bg-yellow-400",
  critical: "bg-red-500",
};

export default function SensorCard({ label, value, unit = "", icon, status = "normal", sublabel }: Props) {
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm transition-all ${statusStyles[status]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${statusDot[status]}`} />
          <span className="text-gray-400">{icon}</span>
        </div>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold tracking-tight text-gray-800">
          {value !== null && value !== undefined ? value : "—"}
        </span>
        {unit && <span className="mb-1 text-lg text-gray-500">{unit}</span>}
      </div>
      {sublabel && <p className="mt-1 text-xs text-gray-400">{sublabel}</p>}
    </div>
  );
}
