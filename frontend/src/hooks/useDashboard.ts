// =============================================================================
//  useDashboard – polls the full dashboard payload every 30 seconds
// =============================================================================
"use client";

import { useEffect, useCallback } from "react";
import { getDashboard } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboardStore";

const POLL_INTERVAL_MS = 30_000;

export function useDashboard() {
  const {
    activeDeviceId,
    setData,
    setLoading,
    setError,
    loading,
    data,
    error,
  } = useDashboardStore();

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getDashboard(activeDeviceId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [activeDeviceId, setData, setLoading, setError]);

  // Initial fetch + polling
  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
