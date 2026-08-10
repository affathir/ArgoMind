// =============================================================================
//  MoistureChart – 24h soil moisture trend line (Recharts)
// =============================================================================
"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { SensorReading } from "@/types";
import { fmtTime } from "@/lib/formatters";

interface Props {
  history: SensorReading[];
  predictions?: { hoursAhead: number; soilMoisture: number }[];
}

/** Merge historical + forecast points into a single chart series */
function buildChartData(
  history: SensorReading[],
  predictions: Props["predictions"] = []
) {
  const now = Date.now();

  const historical = history.map((r) => ({
    time: fmtTime(r.timestamp),
    moisture: r.soilMoisture,
    type: "actual" as const,
  }));

  const forecast = predictions.map((p) => ({
    time: `+${p.hoursAhead}h`,
    moisture: p.soilMoisture,
    type: "forecast" as const,
  }));

  return [...historical, ...forecast];
}

export function MoistureChart({ history, predictions }: Props) {
  const data = buildChartData(history, predictions);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          unit="%"
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(v: number) => [`${v.toFixed(1)}%`, "Kelembapan"]}
        />
        {/* Danger threshold line at 20% */}
        <ReferenceLine y={20} stroke="#dc2626" strokeDasharray="4 2" label={{ value: "Batas Kritis", fill: "#dc2626", fontSize: 10 }} />
        {/* Warning threshold at 35% */}
        <ReferenceLine y={35} stroke="#ca8a04" strokeDasharray="4 2" />
        <Line
          type="monotone"
          dataKey="moisture"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
