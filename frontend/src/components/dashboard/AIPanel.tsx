// =============================================================================
//  AIPanel – RIGHT panel of the dashboard
//  Displays IBM watsonx.ai-generated insight streamed via SSE
// =============================================================================
"use client";

import { RefreshCw, AlertTriangle, CheckCircle, Info, Zap } from "lucide-react";
import { Card }        from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner }     from "@/components/ui/Spinner";
import { useInsightStream } from "@/hooks/useInsightStream";
import { useDashboardStore } from "@/store/dashboardStore";
import { fmtDateTime } from "@/lib/formatters";
import type { AiInsight, StressLabel } from "@/types";

interface Props {
  /** Static insight from last full API fetch (shown before/between streams) */
  staticInsight: AiInsight;
  stressLevel: StressLabel;
}

// ── Internal sub-components ──────────────────────────────────────────────────

function ActionItem({ text, index }: { text: string; index: number }) {
  return (
    <li className="flex gap-3 items-start text-sm text-gray-700">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-xs font-bold text-brand-green">
        {index + 1}
      </span>
      {text}
    </li>
  );
}

function RiskBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

/** Renders the streaming / static insight body */
function InsightBody({
  streamed,
  streaming,
  staticInsight,
}: {
  streamed: string;
  streaming: boolean;
  staticInsight: AiInsight;
}) {
  // While streaming, show raw accumulated text with a blinking cursor
  if (streaming || streamed) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
        <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
          {streamed}
          {streaming && (
            <span className="inline-block w-0.5 h-4 bg-brand-green align-middle ml-0.5 animate-pulse" />
          )}
        </p>
      </div>
    );
  }

  // After stream finishes (or on initial load), show structured static insight
  return (
    <div className="flex flex-col gap-4">
      {/* Status summary */}
      <div className="flex items-start gap-2 text-sm text-gray-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
        <p>{staticInsight.statusSummary}</p>
      </div>

      {/* Action list */}
      {staticInsight.actions.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Zap className="h-3.5 w-3.5" />
            Tindakan yang Disarankan
          </p>
          <ul className="flex flex-col gap-2">
            {staticInsight.actions.map((a, i) => (
              <ActionItem key={i} text={a} index={i} />
            ))}
          </ul>
        </div>
      )}

      {/* Risk box */}
      <RiskBox text={staticInsight.riskIfNoAction} />
    </div>
  );
}

// ── Main AIPanel component ───────────────────────────────────────────────────

export function AIPanel({ staticInsight, stressLevel }: Props) {
  const { streamedInsight, insightStreaming, refresh } = useInsightStream();

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* IBM watsonx logo placeholder */}
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#052FAD]">
            <span className="text-[10px] font-bold text-white">wx</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">AI Co-Worker</h2>
            <p className="text-[10px] text-gray-400">Powered by IBM watsonx.ai · Granite</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={insightStreaming}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh insight"
        >
          {insightStreaming
            ? <Spinner className="h-3.5 w-3.5" />
            : <RefreshCw className="h-3.5 w-3.5" />
          }
          Refresh
        </button>
      </div>

      {/* ── Current status ─────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status Saat Ini</span>
          <StatusBadge level={stressLevel} size="md" pulse={stressLevel !== "healthy"} />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          Dianalisis: {fmtDateTime(staticInsight.generatedAt)}
        </p>
      </Card>

      {/* ── Insight body ───────────────────────────────────────────────── */}
      <Card title="Rekomendasi Operasional" className="flex-1 overflow-auto">
        {!streamedInsight && !insightStreaming ? (
          // Skeleton loader while first stream hasn't started
          <div className="flex flex-col gap-2 animate-pulse">
            {[80, 60, 90, 50].map((w, i) => (
              <div key={i} className={`h-3 rounded bg-gray-100`} style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <InsightBody
            streamed={streamedInsight}
            streaming={insightStreaming}
            staticInsight={staticInsight}
          />
        )}
      </Card>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span>Rekomendasi ini dihasilkan AI dan bukan pengganti ahli agronomi.</span>
      </div>
    </div>
  );
}
