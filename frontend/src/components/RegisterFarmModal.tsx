"use client";

import React, { useState } from "react";
import { registerFarm } from "@/lib/api";
import type { FarmRegisterPayload } from "@/types";
import { X } from "lucide-react";
import HardwareCodeModal from "@/components/HardwareCodeModal";

interface Props {
  onClose: () => void;
  onSuccess: (farmId: string) => void;
}

const EMPTY: FarmRegisterPayload = {
  farm_id: "",
  crop_type: "",
  sowing_date: "",
  location_name: "",
};

export default function RegisterFarmModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FarmRegisterPayload>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredFarmId, setRegisteredFarmId] = useState<string | null>(null);

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
      // Show hardware code modal after success
      setRegisteredFarmId(form.farm_id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to register farm. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // If registration succeeded, show the hardware code modal on top
  if (registeredFarmId) {
    return (
      <HardwareCodeModal
        farmId={registeredFarmId}
        mqttBrokerIp="192.168.1.100"
        onClose={() => {
          onSuccess(registeredFarmId);
        }}
      />
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Register Farm</h2>
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
              placeholder="e.g. farm-001"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              This ID will be used in the ESP32 code as the device identity.
            </p>
          </div>

          {/* Crop Type */}
          <div>
            <label className={labelClass}>Crop Type</label>
            <input
              name="crop_type"
              value={form.crop_type}
              onChange={handleChange}
              placeholder="e.g. Rice, Corn, Chili"
              className={inputClass}
            />
          </div>

          {/* Sowing Date */}
          <div>
            <label className={labelClass}>Sowing Date</label>
            <input
              type="date"
              name="sowing_date"
              value={form.sowing_date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>
              Farm Location <span className="text-red-500">*</span>
            </label>
            <input
              required
              name="location_name"
              value={form.location_name ?? ""}
              onChange={handleChange}
              placeholder="e.g. Bandung, Subang, Malang"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              City or district name where the farm is located. Coordinates are resolved automatically.
            </p>
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
            {loading ? "Registering…" : "Register Farm"}
          </button>
        </form>
      </div>
    </div>
  );
}
