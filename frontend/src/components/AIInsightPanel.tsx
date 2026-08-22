import React from "react";
import type { AIInsight } from "@/types";
import { Sparkles, Brain, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

interface Props {
  insight: AIInsight | null;
  loading: boolean;
  onRefresh: () => void;
}

/**
 * Lightweight markdown renderer for Gemini output.
 *   **Bold**  → <strong>
 *   - bullet  → styled <li>
 *   \n\n      → paragraph break
 */
function renderAdvice(text: string): React.ReactNode {
  const paragraphs = text.split(/\n{2,}/);

  return paragraphs.map((para, pi) => {
    const lines = para.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, li) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const isBullet = /^[-•*]\s+/.test(trimmed);

      const renderInline = (s: string): React.ReactNode[] =>
        s.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={idx} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={idx}>{part}</span>
          )
        );

      if (isBullet) {
        elements.push(
          <li
            key={`${pi}-${li}`}
            className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed"
          >
            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
            <span>{renderInline(trimmed.replace(/^[-•*]\s+/, ""))}</span>
          </li>
        );
      } else {
        elements.push(
          <p key={`${pi}-${li}`} className="text-sm text-gray-700 leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      }
    });

    const hasBullets = elements.some(
      (el) => (el as React.ReactElement)?.type === "li"
    );
    return hasBullets ? (
      <ul key={pi} className="space-y-1.5 list-none pl-0">
        {elements}
      </ul>
    ) : (
      <div key={pi} className="space-y-1">{elements}</div>
    );
  });
}

function MLBadge({ text }: { text: string }) {
  if (/healthy|sehat/i.test(text))
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-800">
        <CheckCircle2 className="h-3.5 w-3.5" /> Healthy Crop
      </span>
    );
  if (/rot|wilt|fusarium|busuk|layu/i.test(text))
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-800">
        <AlertTriangle className="h-3.5 w-3.5" /> Critical Risk
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-0.5 text-xs font-semibold text-yellow-800">
      <Zap className="h-3.5 w-3.5" /> Needs Attention
    </span>
  );
}

export default function AIInsightPanel({ insight, loading, onRefresh }: Props) {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-indigo-900">AI Expert Insight</h2>
            <p className="text-xs text-indigo-400">XGBoost ML + RAG Gemini Analysis</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 animate-pulse" />
              Analyzing…
            </span>
          ) : (
            "Refresh Analysis"
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <Brain className="absolute inset-0 m-auto h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-indigo-600 animate-pulse">
            ArgoMind AI is analyzing farm data…
          </p>
          <p className="text-xs text-gray-400">RAG + LLM pipeline takes 5–15 seconds</p>
        </div>
      )}

      {/* Content */}
      {!loading && insight && (
        <div className="space-y-4">
          {/* ML card */}
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Disease Prediction (XGBoost ML)
              </p>
              {insight.ml_disease_prediction && (
                <MLBadge text={insight.ml_disease_prediction} />
              )}
            </div>
            <p className="text-sm leading-relaxed text-gray-700">
              {insight.ml_disease_prediction ?? "No disease prediction available."}
            </p>
          </div>

          {/* LLM advice card */}
          <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
                Action Recommendations (Gemini RAG)
              </p>
            </div>
            {insight.llm_advice ? (
              <div className="space-y-3">{renderAdvice(insight.llm_advice)}</div>
            ) : (
              <p className="text-sm text-gray-500">No AI recommendations yet.</p>
            )}
          </div>

          <p className="text-right text-xs text-gray-400">
            Updated:{" "}
            {new Date(insight.timestamp).toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !insight && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
            <Brain className="h-7 w-7 text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">
            No AI analysis available for this farm yet.
          </p>
          <p className="max-w-xs text-xs text-gray-400">
            Click{" "}
            <span className="font-semibold text-indigo-500">&quot;Refresh Analysis&quot;</span>{" "}
            to get an ML disease prediction and Gemini AI recommendations
            based on the latest sensor readings.
          </p>
        </div>
      )}
    </div>
  );
}
