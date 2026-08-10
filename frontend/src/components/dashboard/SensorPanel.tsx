// =============================================================================
//  SensorPanel – LEFT panel of the dashboard
//  Shows live sensor metrics, 24h chart, and 72h forecast bars
// =============================================================================
"use client";

import { Droplets, Thermometer, Wind, Clock } from "lucide-react";
import { Card }        from "@/components/ui/Card";
import { MetricTile }  from "@/components/ui/MetricTile";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MoistureChart } from "./MoistureChart";
import { ForecastBar }   from "./ForecastBar";
import { fmtRelative, round1 } from "@/lib/formatters";
import type { DashboardData } from "@/types";

interface Props {
  data: DashboardData;
}

export function SensorPanel({ data }: Props) {
  const { latest, history, forecast, device } = data;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Device header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{device.name}</h2>
          <p className="text-xs text-gray-500">{device.location} · {device.cropType}</p>
        </div>
        <StatusBadge level={forecast.droughtStressLabel} size="md" pulse />
      </div>

      {/* ── Live KPI grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          label="Kelembapan Tanah"
          value={round1(latest.soilMoisture)}
          unit="%"
          icon={<Droplets className="h-4 w-4" />}
        />
        <MetricTile
          label="Suhu Tanah"
          value={round1(latest.soilTemperature)}
          unit="°C"
          icon={<Thermometer className="h-4 w-4" />}
        />
        <MetricTile
          label="Suhu Udara"
          value={round1(latest.airTemperature)}
          unit="°C"
          icon={<Thermometer className="h-4 w-4" />}
        />
        <MetricTile
          label="Kelembapan Udara"
          value={round1(latest.airHumidity)}
          unit="%"
          icon={<Wind className="h-4 w-4" />}
        />
      </div>

      {/* ── Last-updated row ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Clock className="h-3 w-3" />
        <span>Diperbarui {fmtRelative(latest.timestamp)}</span>
      </div>

      {/* ── 24h moisture trend chart ──────────────────────────────────── */}
      <Card title="Tren Kelembapan 24 Jam">
        <MoistureChart history={history} predictions={forecast.predictions} />
      </Card>

      {/* ── 72h forecast bars ─────────────────────────────────────────── */}
      <Card title="Prediksi Kelembapan (ML)">
        <ForecastBar forecast={forecast} />
      </Card>

    </div>
  );
}
