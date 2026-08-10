// =============================================================================
//  DashboardPage – main entry point for the AgriMind two-panel dashboard
// =============================================================================
"use client";

import { Leaf, Wifi, WifiOff } from "lucide-react";
import { SensorPanel } from "@/components/dashboard/SensorPanel";
import { AIPanel }     from "@/components/dashboard/AIPanel";
import { Spinner }     from "@/components/ui/Spinner";
import { useDashboard } from "@/hooks/useDashboard";

// ── Top navigation bar ────────────────────────────────────────────────────────
function Navbar({ online }: { online: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Leaf className="h-6 w-6 text-brand-green" />
        <span className="text-lg font-bold text-gray-900">AgriMind</span>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
          Beta
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {online
            ? <><Wifi className="h-3.5 w-3.5 text-green-500" /><span>Online</span></>
            : <><WifiOff className="h-3.5 w-3.5 text-red-500" /><span>Offline</span></>
          }
        </div>

        <div className="h-4 w-px bg-gray-200" />

        {/* IBM watsonx badge */}
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-[#052FAD] flex items-center justify-center">
            <span className="text-[8px] font-bold text-white leading-none">wx</span>
          </div>
          <span className="text-xs text-gray-400">IBM watsonx.ai</span>
        </div>
      </div>
    </header>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      ⚠️ Gagal memuat data: {message}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, loading, error } = useDashboard();

  const isOnline = !error && !!data;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar online={isOnline} />

      {/* Error state */}
      {error && <ErrorBanner message={error} />}

      {/* Loading state – first paint */}
      {loading && !data && (
        <div className="flex flex-1 items-center justify-center gap-3 text-gray-500">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Memuat data sensor…</span>
        </div>
      )}

      {/* Two-panel layout */}
      {data && (
        <main className="flex flex-1 overflow-hidden">
          {/* ── LEFT: Sensor metrics ──────────────────────────────────── */}
          <section className="w-full max-w-md overflow-y-auto border-r border-gray-200 bg-white p-5 lg:w-5/12">
            <SensorPanel data={data} />
          </section>

          {/* ── RIGHT: AI Co-Worker ───────────────────────────────────── */}
          <section className="flex-1 overflow-y-auto bg-gray-50 p-5">
            <AIPanel
              staticInsight={data.insight}
              stressLevel={data.forecast.droughtStressLabel}
            />
          </section>
        </main>
      )}
    </div>
  );
}
