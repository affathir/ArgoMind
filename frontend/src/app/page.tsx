"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Droplets, FlaskConical, Thermometer, Wind,
  CloudRain, Sun, PlusCircle, RefreshCw, Cpu,
  Zap, Play,
} from "lucide-react";
import Link from "next/link";
import SensorCard from "@/components/SensorCard";
import AIInsightPanel from "@/components/AIInsightPanel";
import RegisterFarmModal from "@/components/RegisterFarmModal";
import { getLatestSensor, getTodayWeather, getInsight, getFarms } from "@/lib/api";
import type { SensorData, WeatherData, AIInsight, FarmOut } from "@/types";

const DEMO_FARM_ID = "demo-farm";
const POLL_INTERVAL_MS = 15_000;

// ── Status helpers ──────────────────────────────────────────────────────────────

function moistureStatus(v: number | null) {
  if (v === null) return "normal";
  if (v < 20) return "critical";
  if (v < 35) return "warning";
  return "normal";
}
function phStatus(v: number | null) {
  if (v === null) return "normal";
  if (v < 5.5 || v > 7.5) return "critical";
  if (v < 6.0 || v > 7.2) return "warning";
  return "normal";
}
function tempStatus(v: number | null) {
  if (v === null) return "normal";
  if (v > 38) return "critical";
  if (v > 34) return "warning";
  return "normal";
}
function humidityStatus(v: number | null) {
  if (v === null) return "normal";
  if (v < 30) return "critical";
  if (v < 45) return "warning";
  return "normal";
}

// ── Farm Dashboard Panel ────────────────────────────────────────────────────────

function FarmDashboard({ farmId }: { farmId: string }) {
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [sensorLoading, setSensorLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSensorAndWeather = useCallback(async () => {
    setSensorLoading(true);
    try {
      const [s, w] = await Promise.all([getLatestSensor(farmId), getTodayWeather(farmId)]);
      setSensor(s);
      setWeather(w);
      setLastUpdated(new Date().toLocaleTimeString("en-US"));
    } catch {
      // keep stale data
    } finally {
      setSensorLoading(false);
    }
  }, [farmId]);

  const fetchInsight = useCallback(async () => {
    setInsightLoading(true);
    try {
      const data = await getInsight(farmId);
      setInsight(data);
    } finally {
      setInsightLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    fetchSensorAndWeather();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchSensorAndWeather, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchSensorAndWeather]);

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            Farm:{" "}
            <span className="rounded-md bg-green-100 px-2 py-0.5 text-green-800 font-mono text-sm">
              {farmId}
            </span>
          </h2>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last updated: {lastUpdated} · Auto-refresh every 15 seconds
            </p>
          )}
        </div>
        <button
          onClick={fetchSensorAndWeather}
          disabled={sensorLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${sensorLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Sensor Cards */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Real-Time Sensor Data
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SensorCard
            label="Soil Moisture"
            value={sensor ? Math.round(sensor.soil_moisture ?? 0) : null}
            unit="%"
            icon={<Droplets className="h-5 w-5" />}
            status={moistureStatus(sensor?.soil_moisture ?? null)}
            sublabel={sensor ? `pH: ${sensor.soil_ph?.toFixed(1) ?? "—"}` : undefined}
          />
          <SensorCard
            label="Soil pH"
            value={sensor?.soil_ph?.toFixed(2) ?? null}
            icon={<FlaskConical className="h-5 w-5" />}
            status={phStatus(sensor?.soil_ph ?? null)}
            sublabel="Ideal range: 5.5 – 7.5"
          />
          <SensorCard
            label="Air Temperature"
            value={sensor ? sensor.temperature?.toFixed(1) ?? null : null}
            unit="°C"
            icon={<Thermometer className="h-5 w-5" />}
            status={tempStatus(sensor?.temperature ?? null)}
            sublabel="Max threshold: 38°C"
          />
          <SensorCard
            label="Air Humidity"
            value={sensor ? Math.round(sensor.humidity ?? 0) : null}
            unit="%"
            icon={<Wind className="h-5 w-5" />}
            status={humidityStatus(sensor?.humidity ?? null)}
            sublabel={sensor?.timestamp ? new Date(sensor.timestamp).toLocaleTimeString("en-US") : undefined}
          />
        </div>
      </section>

      {/* Weather */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Today&apos;s Weather Forecast
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SensorCard
            label="Rainfall Forecast"
            value={weather?.rainfall_mm?.toFixed(1) ?? null}
            unit="mm"
            icon={<CloudRain className="h-5 w-5" />}
            status={weather?.rainfall_mm != null && weather.rainfall_mm > 20 ? "warning" : "normal"}
            sublabel={weather?.date ?? "Data not available"}
          />
          <SensorCard
            label="Estimated Sunlight Hours"
            value={weather?.sunlight_hours?.toFixed(1) ?? null}
            unit="hrs"
            icon={<Sun className="h-5 w-5" />}
            status="normal"
            sublabel="Based on cloud cover 06:00–18:00 UTC"
          />
        </div>
      </section>

      {/* AI Insight */}
      <section>
        <AIInsightPanel insight={insight} loading={insightLoading} onRefresh={fetchInsight} />
      </section>

      {sensor && (
        <p className="text-center text-xs text-gray-400">
          Last sensor reading received at{" "}
          {new Date(sensor.timestamp).toLocaleString("en-US")}
        </p>
      )}
    </div>
  );
}

// ── Hardware Farm Card ──────────────────────────────────────────────────────────

function HardwareFarmCard({
  farm,
  isActive,
  onClick,
}: {
  farm: FarmOut;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
        isActive
          ? "border-green-500 bg-green-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800 font-mono">{farm.farm_id}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {farm.crop_type ?? "—"} · {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
          </p>
        </div>
        <div className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-300"}`} />
      </div>
    </button>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────

type Tab = "demo" | "hardware";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("demo");
  const [farms, setFarms] = useState<FarmOut[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [farmsLoading, setFarmsLoading] = useState(false);

  // Fetch hardware farms (exclude demo-farm)
  const loadFarms = useCallback(async () => {
    setFarmsLoading(true);
    try {
      const all = await getFarms();
      setFarms(all.filter((f) => f.farm_id !== DEMO_FARM_ID));
    } catch {
      // ignore
    } finally {
      setFarmsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  function handleRegisterSuccess(id: string) {
    setShowModal(false);
    loadFarms().then(() => {
      setTab("hardware");
      setActiveFarmId(id);
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">ArgoMind</h1>
              <p className="text-xs text-gray-500">Smart Farming IoT Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/simulator"
              className="flex items-center gap-2 rounded-lg border border-blue-400 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Cpu className="h-4 w-4" />
              Simulator
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Register Farm
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">

        {/* ── Tab switcher ──────────────────────────────────────────────────── */}
        <div className="flex rounded-xl bg-gray-100 p-1 w-fit">
          <button
            onClick={() => setTab("demo")}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              tab === "demo"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Play className="h-4 w-4" />
            Demo
          </button>
          <button
            onClick={() => setTab("hardware")}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              tab === "hardware"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Cpu className="h-4 w-4" />
            Hardware
            {farms.length > 0 && (
              <span className="rounded-full bg-green-500 text-white text-xs px-1.5 py-0.5 leading-none">
                {farms.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Demo Tab ──────────────────────────────────────────────────────── */}
        {tab === "demo" && (
          <div className="space-y-6">
            {/* Demo banner */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-6 py-4 flex items-start gap-4">
              <div className="rounded-xl bg-blue-100 p-2.5 shrink-0 mt-0.5">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Demo Mode — Try It Without Any Setup</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  This dashboard is connected to the <code className="bg-blue-100 px-1 rounded font-mono">demo-farm</code> that is automatically provisioned.
                  Go to the{" "}
                  <Link href="/simulator" className="underline font-semibold">Simulator</Link>
                  {" "}page to send virtual sensor data, then click <strong>Refresh Analysis</strong> below.
                </p>
              </div>
            </div>

            <FarmDashboard farmId={DEMO_FARM_ID} />
          </div>
        )}

        {/* ── Hardware Tab ──────────────────────────────────────────────────── */}
        {tab === "hardware" && (
          <div className="space-y-6">
            {farms.length === 0 && !farmsLoading && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
                <div className="rounded-2xl bg-gray-100 p-5 mb-4">
                  <Cpu className="h-10 w-10 text-gray-400" />
                </div>
                <h2 className="text-base font-semibold text-gray-700 mb-1">No Hardware Registered Yet</h2>
                <p className="text-sm text-gray-500 mb-5 max-w-sm">
                  Register a new farm — once done, ESP32 code will be auto-generated and ready to upload to your IoT device.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  Register Your First Farm
                </button>
              </div>
            )}

            {farmsLoading && (
              <div className="flex justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}

            {farms.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Farm list sidebar */}
                <div className="lg:col-span-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                      Registered Farms
                    </h3>
                    <button
                      onClick={() => setShowModal(true)}
                      className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                  {farms.map((farm) => (
                    <HardwareFarmCard
                      key={farm.farm_id}
                      farm={farm}
                      isActive={activeFarmId === farm.farm_id}
                      onClick={() => setActiveFarmId(farm.farm_id)}
                    />
                  ))}
                </div>

                {/* Dashboard panel */}
                <div className="lg:col-span-3">
                  {activeFarmId ? (
                    <FarmDashboard farmId={activeFarmId} />
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
                      <Cpu className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">Select a farm on the left to view its data.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Registration Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <RegisterFarmModal
          onClose={() => setShowModal(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}
    </main>
  );
}
