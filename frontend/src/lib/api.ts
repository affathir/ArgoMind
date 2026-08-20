import axios from "axios";
import type {
  SensorData,
  WeatherData,
  AIInsight,
  FarmRegisterPayload,
  FarmOut,
  SimulatorPayload,
  SimulatorOut,
  SimulatorPresets,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const api = axios.create({ baseURL: BASE });

export async function getLatestSensor(farmId: string): Promise<SensorData | null> {
  const res = await api.get<SensorData[]>(`/api/farms/${farmId}/sensors?limit=1`);
  return res.data[0] ?? null;
}

export async function getTodayWeather(farmId: string): Promise<WeatherData | null> {
  try {
    const res = await api.get<WeatherData>(`/api/farms/${farmId}/weather`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getInsight(farmId: string): Promise<AIInsight> {
  const res = await api.get<AIInsight>(`/api/farms/${farmId}/insight`);
  return res.data;
}

export async function registerFarm(payload: FarmRegisterPayload): Promise<FarmOut> {
  const res = await api.post<FarmOut>("/api/farms/register", payload);
  return res.data;
}

export async function getSimulatorPresets(): Promise<SimulatorPresets> {
  const res = await api.get<SimulatorPresets>("/api/simulator/presets");
  return res.data;
}

export async function sendSimulatedSensor(payload: SimulatorPayload): Promise<SimulatorOut> {
  const res = await api.post<SimulatorOut>("/api/simulator/send", payload);
  return res.data;
}
