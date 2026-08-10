// =============================================================================
//  AgriMind – Shared TypeScript interfaces
// =============================================================================

/** Raw reading from one ESP32 node */
export interface SensorReading {
  id: string;
  deviceId: string;
  timestamp: string;           // ISO-8601
  soilMoisture: number;        // 0–100 %
  soilTemperature: number;     // °C
  airTemperature: number;      // °C
  airHumidity: number;         // 0–100 %
}

/** ML forecast returned by the prediction endpoint */
export interface MlForecast {
  deviceId: string;
  generatedAt: string;
  predictions: {
    hoursAhead: number;        // 24 | 48 | 72
    soilMoisture: number;      // predicted %
    confidence: number;        // 0–1
  }[];
  droughtStressLevel: 0 | 1 | 2 | 3;  // 0=healthy, 3=critical
  droughtStressLabel: "healthy" | "watch" | "alert" | "critical";
}

/** LLM-generated insight returned by the insight endpoint */
export interface AiInsight {
  deviceId: string;
  generatedAt: string;
  statusSummary: string;       // one-sentence summary
  actions: string[];           // up to 3 recommended actions
  riskIfNoAction: string;      // consequence of inaction
  language: "en" | "id";
}

/** Aggregated dashboard payload (single API call) */
export interface DashboardData {
  device: {
    id: string;
    name: string;
    location: string;
    cropType: string;
    growthStage: string;
    lastSeenAt: string;
  };
  latest: SensorReading;
  history: SensorReading[];    // last 24 h, 30-min intervals
  forecast: MlForecast;
  insight: AiInsight;
}

/** Stress level → display config mapping */
export const STRESS_CONFIG = {
  healthy:  { label: "Sehat",    color: "brand-green",  hex: "#16a34a" },
  watch:    { label: "Perhatian",color: "brand-yellow", hex: "#ca8a04" },
  alert:    { label: "Waspada",  color: "brand-red",    hex: "#dc2626" },
  critical: { label: "Kritis",   color: "brand-red",    hex: "#7f1d1d" },
} as const;

export type StressLabel = keyof typeof STRESS_CONFIG;
