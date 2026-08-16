"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Droplets, FlaskConical, Thermometer, Wind, CloudRain, Sun, PlusCircle, RefreshCw } from "lucide-react";
import SensorCard from "@/components/SensorCard";
import AIInsightPanel from "@/components/AIInsightPanel";
import RegisterFarmModal from "@/components/RegisterFarmModal";
import { getLatestSensor, getTodayWeather, getInsight } from "@/lib/api";
import type { SensorData, WeatherData, AIInsight } from "@/types";

const POLL_INTERVAL_MS = 15_000; // refresh sensor data every 15 s

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

export default function DashboardPage() {
  const [farmId, setFarmId] = useState<string>("");
  const [inputId, setInputId] = useState<string>("");
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [sensorLoading, setSensorLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchSensorAndWeather = useCallback(async (id: string) => {
    if (!id) return;
    setSensorLoading(true);
    try {
      const [s, w] = await Promise.all([getLatestSensor(id), getTodayWeather(id)]);
      setSensor(s);
      setWeather(w);
      setLastUpdated(new Date().toLocaleTimeString("id-ID"));
    } catch {
      // silently ignore — keep stale data
    } finally {
      setSensorLoading(false);
    }
  }, []);

  const fetchInsight = useCallback(async () => {
    if (!farmId) return;
    setInsightLoading(true);
    try {
      const data = await getInsight(farmId);
      setInsight(data);
    } finally {
      setInsightLoading(false);
    }
  }, [farmId]);

  // ── Auto-poll on farmId change ────────────────────────────────────────────

  useEffect(() => {
    if (!farmId) return;
    fetchSensorAndWeather(farmId);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchSensorAndWeather(farmId), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [farmId, fetchSensorAndWeather]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleLoadFarm(e: React.FormEvent) {
    e.preventDefault();
    if (inputId.trim()) setFarmId(inputId.trim());
  }

  function handleRegisterSuccess(id: string) {
    setShowModal(false);
    setInputId(id);
    setFarmId(id);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">ArgoMind</h1>
              <p className="text-xs text-gray-500">Smart Farming IoT Dashboard</p>
            </div>
          </div>

          {/* Farm ID selector */}
          <form onSubmit={handleLoadFarm} className="flex gap-2 items-center">
            <input
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="Masukkan Farm ID…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 w-44"
            />
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              Tampilkan
            </button>
          </form>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Daftarkan Kebun
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">

        {/* ── No farm selected ───────────────────────────────────────── */}
        {!farmId && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white py-20 text-center">
            <span className="text-5xl mb-4">🌾</span>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">Selamat Datang di ArgoMind</h2>
            <p className="text-sm text-gray-500 mb-5">
              Masukkan Farm ID di atas untuk melihat data kebun Anda,<br />
              atau daftarkan kebun baru terlebih dahulu.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Daftarkan Kebun Sekarang
            </button>
          </div>
        )}

        {/* ── Dashboard content ──────────────────────────────────────── */}
        {farmId && (
          <>
            {/* Status bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  Kebun:{" "}
                  <span className="rounded-md bg-green-100 px-2 py-0.5 text-green-800 font-mono text-sm">
                    {farmId}
                  </span>
                </h2>
                {lastUpdated && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Terakhir diperbarui: {lastUpdated} · Auto-refresh setiap 15 detik
                  </p>
                )}
              </div>
              <button
                onClick={() => fetchSensorAndWeather(farmId)}
                disabled={sensorLoading}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${sensorLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* ── Sensor Cards Grid ─────────────────────────────────── */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Data Sensor Real-Time
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SensorCard
                  label="Kelembapan Tanah"
                  value={sensor ? Math.round(sensor.soil_moisture ?? 0) : null}
                  unit="%"
                  icon={<Droplets className="h-5 w-5" />}
                  status={moistureStatus(sensor?.soil_moisture ?? null)}
                  sublabel={sensor ? `pH: ${sensor.soil_ph?.toFixed(1) ?? "—"}` : undefined}
                />
                <SensorCard
                  label="pH Tanah"
                  value={sensor?.soil_ph?.toFixed(2) ?? null}
                  icon={<FlaskConical className="h-5 w-5" />}
                  status={phStatus(sensor?.soil_ph ?? null)}
                  sublabel="Rentang ideal: 5.5 – 7.5"
                />
                <SensorCard
                  label="Suhu Udara"
                  value={sensor ? sensor.temperature?.toFixed(1) ?? null : null}
                  unit="°C"
                  icon={<Thermometer className="h-5 w-5" />}
                  status={tempStatus(sensor?.temperature ?? null)}
                  sublabel="Batas max: 38°C"
                />
                <SensorCard
                  label="Kelembapan Udara"
                  value={sensor ? Math.round(sensor.humidity ?? 0) : null}
                  unit="%"
                  icon={<Wind className="h-5 w-5" />}
                  status={humidityStatus(sensor?.humidity ?? null)}
                  sublabel={sensor?.timestamp ? new Date(sensor.timestamp).toLocaleTimeString("id-ID") : undefined}
                />
              </div>
            </section>

            {/* ── Weather Section ───────────────────────────────────── */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Prakiraan Cuaca Hari Ini
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SensorCard
                  label="Prediksi Curah Hujan"
                  value={weather?.rainfall_mm?.toFixed(1) ?? null}
                  unit="mm"
                  icon={<CloudRain className="h-5 w-5" />}
                  status={
                    weather?.rainfall_mm != null && weather.rainfall_mm > 20
                      ? "warning"
                      : "normal"
                  }
                  sublabel={weather?.date ?? "Data belum tersedia"}
                />
                <SensorCard
                  label="Estimasi Lama Sinar Matahari"
                  value={weather?.sunlight_hours?.toFixed(1) ?? null}
                  unit="jam"
                  icon={<Sun className="h-5 w-5" />}
                  status="normal"
                  sublabel="Berdasarkan tutupan awan 06:00–18:00 UTC"
                />
              </div>
            </section>

            {/* ── AI Insight ────────────────────────────────────────── */}
            <section>
              <AIInsightPanel
                insight={insight}
                loading={insightLoading}
                onRefresh={fetchInsight}
              />
            </section>

            {/* ── Sensor timestamp footer ───────────────────────────── */}
            {sensor && (
              <p className="text-center text-xs text-gray-400">
                Data sensor terakhir diterima pada{" "}
                {new Date(sensor.timestamp).toLocaleString("id-ID")}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Registration Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <RegisterFarmModal
          onClose={() => setShowModal(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}
    </main>
  );
}
