// =============================================================================
//  AgriMind – API client
//  All backend calls go through this module so base URL is centralised.
// =============================================================================

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ── Generic fetch helper ──────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────
import type { DashboardData, MlForecast, AiInsight } from "@/types";

/** Fetch the full dashboard payload for a device */
export function getDashboard(deviceId: string): Promise<DashboardData> {
  return apiFetch<DashboardData>(`/api/v1/dashboard/${deviceId}`);
}

/** Fetch only the ML forecast */
export function getForecast(deviceId: string): Promise<MlForecast> {
  return apiFetch<MlForecast>(`/api/v1/predict/${deviceId}`);
}

/** Fetch only the latest AI insight */
export function getInsight(deviceId: string): Promise<AiInsight> {
  return apiFetch<AiInsight>(`/api/v1/insight/${deviceId}`);
}

/**
 * Stream AI insight via Server-Sent Events.
 * Returns an EventSource; caller is responsible for closing it.
 */
export function streamInsight(
  deviceId: string,
  onMessage: (chunk: string) => void,
  onDone: () => void,
  onError?: (e: Event) => void
): EventSource {
  const es = new EventSource(
    `${BASE_URL}/api/v1/insight/${deviceId}/stream`
  );

  es.addEventListener("message", (e) => {
    if (e.data === "[DONE]") {
      onDone();
      es.close();
      return;
    }
    onMessage(e.data);
  });

  es.addEventListener("error", (e) => {
    onError?.(e);
    es.close();
  });

  return es;
}
