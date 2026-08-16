"use client";

import React, { useState } from "react";
import { registerFarm } from "@/lib/api";
import type { FarmRegisterPayload } from "@/types";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: (farmId: string) => void;
}

const EMPTY: FarmRegisterPayload = {
  farm_id: "",
  telegram_id: "",
  crop_type: "",
  sowing_date: "",
  latitude: 0,
  longitude: 0,
};

export default function RegisterFarmModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FarmRegisterPayload>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: FarmRegisterPayload = {
        ...form,
        sowing_date: form.sowing_date || undefined,
        crop_type: form.crop_type || undefined,
      };
      await registerFarm(payload);
      onSuccess(form.farm_id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Gagal mendaftarkan kebun. Coba lagi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Daftarkan Kebun</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Farm ID */}
          <div>
            <label className={labelClass}>
              Device / Farm ID <span className="text-red-500">*</span>
            </label>
            <input
              required
              name="farm_id"
              value={form.farm_id}
              onChange={handleChange}
              placeholder="contoh: farm-001"
              className={inputClass}
            />
          </div>

          {/* Telegram ID */}
          <div>
            <label className={labelClass}>
              Telegram Chat ID <span className="text-red-500">*</span>
            </label>
            <input
              required
              name="telegram_id"
              value={form.telegram_id}
              onChange={handleChange}
              placeholder="contoh: 123456789"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Dapatkan ID Anda dengan mengirim /start ke bot ArgoMind.
            </p>
          </div>

          {/* Crop Type */}
          <div>
            <label className={labelClass}>Jenis Tanaman</label>
            <input
              name="crop_type"
              value={form.crop_type}
              onChange={handleChange}
              placeholder="contoh: Padi, Jagung, Cabai"
              className={inputClass}
            />
          </div>

          {/* Sowing Date */}
          <div>
            <label className={labelClass}>Tanggal Tanam</label>
            <input
              type="date"
              name="sowing_date"
              value={form.sowing_date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Lintang (Latitude) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                step="any"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                placeholder="-6.200"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Bujur (Longitude) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                step="any"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="106.816"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Mendaftarkan…" : "Daftarkan Kebun"}
          </button>
        </form>
      </div>
    </div>
  );
}
