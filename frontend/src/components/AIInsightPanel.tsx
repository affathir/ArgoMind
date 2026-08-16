import React from "react";
import type { AIInsight } from "@/types";
import { Sparkles, Brain } from "lucide-react";

interface Props {
  insight: AIInsight | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function AIInsightPanel({ insight, loading, onRefresh }: Props) {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-indigo-800">Saran Pakar (AI Insight)</h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Memuat..." : "Perbarui Analisis"}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-indigo-500 animate-pulse">
          <Brain className="h-4 w-4" />
          <span className="text-sm">Menganalisis data kebun Anda…</span>
        </div>
      )}

      {!loading && insight && (
        <div className="space-y-4">
          {/* ML Disease Prediction */}
          <div className="rounded-xl bg-white border border-indigo-100 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Prediksi Penyakit (ML)
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              {insight.ml_disease_prediction ?? "Belum ada prediksi."}
            </p>
          </div>

          {/* LLM Advice */}
          <div className="rounded-xl bg-white border border-indigo-100 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Saran Tindakan
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              {insight.llm_advice ?? "Belum ada saran."}
            </p>
          </div>

          <p className="text-right text-xs text-gray-400">
            Diperbarui: {new Date(insight.timestamp).toLocaleString("id-ID")}
          </p>
        </div>
      )}

      {!loading && !insight && (
        <p className="text-sm text-gray-500">
          Klik "Perbarui Analisis" untuk mendapatkan saran AI berdasarkan kondisi kebun terkini.
        </p>
      )}
    </div>
  );
}
