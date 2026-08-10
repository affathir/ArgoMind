// =============================================================================
//  useInsightStream – streams the AI insight via SSE
// =============================================================================
"use client";

import { useEffect, useRef } from "react";
import { streamInsight } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboardStore";

export function useInsightStream() {
  const {
    activeDeviceId,
    setInsightStreaming,
    appendInsightChunk,
    resetStreamedInsight,
    streamedInsight,
    insightStreaming,
  } = useDashboardStore();

  const esRef = useRef<EventSource | null>(null);

  const start = () => {
    // Close any existing connection before opening a new one
    esRef.current?.close();
    resetStreamedInsight();
    setInsightStreaming(true);

    esRef.current = streamInsight(
      activeDeviceId,
      (chunk) => appendInsightChunk(chunk),
      () => setInsightStreaming(false),
      () => setInsightStreaming(false)
    );
  };

  // Auto-start on mount; re-start when device changes
  useEffect(() => {
    start();
    return () => {
      esRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeviceId]);

  return { streamedInsight, insightStreaming, refresh: start };
}
