// =============================================================================
//  AgriMind – Global state (Zustand)
// =============================================================================
import { create } from "zustand";
import type { DashboardData } from "@/types";

interface DashboardStore {
  /** Currently selected device ID */
  activeDeviceId: string;
  setActiveDeviceId: (id: string) => void;

  /** Full dashboard payload */
  data: DashboardData | null;
  setData: (d: DashboardData) => void;

  /** Is the initial data fetch in flight? */
  loading: boolean;
  setLoading: (v: boolean) => void;

  /** Last fetch error message */
  error: string | null;
  setError: (msg: string | null) => void;

  /** Is the AI insight SSE stream active? */
  insightStreaming: boolean;
  setInsightStreaming: (v: boolean) => void;

  /** Accumulated streamed insight text (raw LLM output) */
  streamedInsight: string;
  appendInsightChunk: (chunk: string) => void;
  resetStreamedInsight: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  activeDeviceId: "device-001",      // default device
  setActiveDeviceId: (id) => set({ activeDeviceId: id }),

  data: null,
  setData: (d) => set({ data: d }),

  loading: false,
  setLoading: (v) => set({ loading: v }),

  error: null,
  setError: (msg) => set({ error: msg }),

  insightStreaming: false,
  setInsightStreaming: (v) => set({ insightStreaming: v }),

  streamedInsight: "",
  appendInsightChunk: (chunk) =>
    set((s) => ({ streamedInsight: s.streamedInsight + chunk })),
  resetStreamedInsight: () => set({ streamedInsight: "" }),
}));
