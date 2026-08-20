"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Droplets, FlaskConical, Thermometer, Wind,
  Send, RotateCcw, CheckCircle, AlertCircle, Cpu,
} from "lucide-react";
import Link from "next/link";
import { getSimulatorPresets, sendSimulatedSensor } from "@/lib/api";
import type { SimulatorPreset, SimulatorPresets, SimulatorPayload } from "@/types";

const DEFAULT_FORM: Omit<SimulatorPayload, "farm_id"> = {
  soil_moisture: 55.0,
  soil_ph: 6.5,
  temperature: 28.0,
  humidity: 65.0,
};

export default function SimulatorPage() {
  const [farmId, setFarmId] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [presets, setPresets] = useState<SimulatorPresets>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    getSimulatorPresets().then(setPresets).catch(console.error);
  }, []);

  function applyPreset(key: string, preset: SimulatorPreset) {
    setForm({
      soil_moisture: preset.soil_moisture,
      soil_ph: preset.soil_ph,
      temperature: preset.temperature,
      humidity: preset.humidity,
    });
    setActivePreset(key);
    setResult(null);
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
    setActivePreset(null);
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId.trim()) {
      setResult({ success: false, message: "Farm ID wajib diisi." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await sendSimulatedSensor({ farm_id: farmId.trim(), ...form });
      setResult({
        success: true,
        message: `✅ ${res.message} (Sensor ID: ${res.sensor_id})`,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Gagal mengirim data. Pastikan backend berjalan dan Farm ID sudah terdaftar.";
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  }, [farmId, form]);

  // ── Status color helpers ────────────────────────────────────────────────────
  function moistureColor(v: number) {
    if (v < 20) return "text-red-600";
    if (v < 35) return "text-yellow-600";
    return "text-green-600";
  }
  function phColor(v: number) {
    if (v < 5.5 || v > 7.5) return "text-red-600";
    return "text-green-600";
  }
  function tempColor(v: number) {
    if (v > 38) return "text-red-600";
    if (v > 34) return "text-yellow-600";
    return "text-green-600";
  }
  function humidityColor(v: number) {
    if (v < 30) return "text-red-600";
    if (v < 45) return "text-yellow-600";
    return "text-green-600";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">ArgoMind</h1>
              <p className="text-xs text-gray-500">Simulator Sensor IoT</p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">

        {/* ── Page title ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3">
            <Cpu className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Simulator Sensor IoT</h2>
            <p className="text-sm text-gray-500">
              Kirim data sensor virtual ke dashboard tanpa perangkat hardware.
              Cocok untuk demo dan pengujian AI Insight.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Preset Skenario ──────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Preset Skenario
            </h3>
            {Object.keys(presets).length === 0 && (
              <p className="text-xs text-gray-400">Memuat preset...</p>
            )}
            {Object.entries(presets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key, preset)}
                className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                  activePreset === key
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">{preset.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  💧 {preset.soil_moisture}% · pH {preset.soil_ph} · 🌡️ {preset.temperature}°C · 💨 {preset.humidity}%
                </p>
              </button>
            ))}
          </div>

          {/* ── Form + Preview ───────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Live Preview */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
                Preview Data Sensor
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Droplets className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className={`text-2xl font-bold ${moistureColor(form.soil_moisture)}`}>
                    {form.soil_moisture.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">Kelembapan %</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <FlaskConical className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                  <p className={`text-2xl font-bold ${phColor(form.soil_ph)}`}>
                    {form.soil_ph.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">pH Tanah</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Thermometer className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                  <p className={`text-2xl font-bold ${tempColor(form.temperature)}`}>
                    {form.temperature.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">Suhu °C</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <Wind className="h-5 w-5 mx-auto mb-1 text-teal-500" />
                  <p className={`text-2xl font-bold ${humidityColor(form.humidity)}`}>
                    {form.humidity.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400">Kelembapan Udara %</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Input Manual
              </h3>

              {/* Farm ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Farm ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  placeholder="contoh: farm-001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Farm ID harus sudah terdaftar terlebih dahulu di dashboard.
                </p>
              </div>

              {/* Sliders grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Soil Moisture */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Kelembapan Tanah</label>
                    <span className={`text-sm font-bold ${moistureColor(form.soil_moisture)}`}>
                      {form.soil_moisture.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="0.5"
                    value={form.soil_moisture}
                    onChange={(e) => handleChange("soil_moisture", e.target.value)}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>0%</span>
                    <span className="text-red-400">Kritis &lt;20%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* pH */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">pH Tanah</label>
                    <span className={`text-sm font-bold ${phColor(form.soil_ph)}`}>
                      {form.soil_ph.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range" min="3" max="10" step="0.1"
                    value={form.soil_ph}
                    onChange={(e) => handleChange("soil_ph", e.target.value)}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>3</span>
                    <span className="text-green-500">Normal 5.5–7.5</span>
                    <span>10</span>
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Suhu Udara</label>
                    <span className={`text-sm font-bold ${tempColor(form.temperature)}`}>
                      {form.temperature.toFixed(1)}°C
                    </span>
                  </div>
                  <input
                    type="range" min="10" max="55" step="0.5"
                    value={form.temperature}
                    onChange={(e) => handleChange("temperature", e.target.value)}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>10°C</span>
                    <span className="text-red-400">Kritis &gt;38°C</span>
                    <span>55°C</span>
                  </div>
                </div>

                {/* Humidity */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Kelembapan Udara</label>
                    <span className={`text-sm font-bold ${humidityColor(form.humidity)}`}>
                      {form.humidity.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="0.5"
                    value={form.humidity}
                    onChange={(e) => handleChange("humidity", e.target.value)}
                    className="w-full accent-teal-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>0%</span>
                    <span className="text-red-400">Kritis &lt;30%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Result feedback */}
              {result && (
                <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm border ${
                  result.success
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}>
                  {result.success
                    ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  }
                  <span>{result.message}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  {loading ? "Mengirim..." : "Kirim Data Sensor"}
                </button>
                <button
                  type="button"
                  onClick={() => { setForm(DEFAULT_FORM); setActivePreset(null); setResult(null); }}
                  className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              {result?.success && (
                <p className="text-center text-xs text-gray-400">
                  Data terkirim! Kembali ke{" "}
                  <Link href="/" className="text-blue-500 underline">
                    Dashboard
                  </Link>{" "}
                  dan klik <strong>Perbarul Analisis</strong> untuk melihat AI Insight.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
