export interface SensorData {
  id: number;
  farm_id: string;
  timestamp: string;
  soil_moisture: number | null;
  soil_ph: number | null;
  temperature: number | null;
  humidity: number | null;
}

export interface WeatherData {
  id: number;
  farm_id: string;
  date: string;
  rainfall_mm: number | null;
  sunlight_hours: number | null;
}

export interface AIInsight {
  id: number;
  farm_id: string;
  timestamp: string;
  ml_disease_prediction: string | null;
  llm_advice: string | null;
}

export interface FarmRegisterPayload {
  farm_id: string;
  telegram_id: string;
  crop_type?: string;
  sowing_date?: string;
  latitude: number;
  longitude: number;
}

export interface SimulatorPayload {
  farm_id: string;
  soil_moisture: number;
  soil_ph: number;
  temperature: number;
  humidity: number;
}

export interface SimulatorOut {
  success: boolean;
  message: string;
  sensor_id: number;
  farm_id: string;
  soil_moisture: number;
  soil_ph: number;
  temperature: number;
  humidity: number;
}

export interface SimulatorPreset {
  label: string;
  soil_moisture: number;
  soil_ph: number;
  temperature: number;
  humidity: number;
}

export interface SimulatorPresets {
  [key: string]: SimulatorPreset;
}

export interface FarmOut {
  farm_id: string;
  telegram_id: string;
  crop_type: string | null;
  sowing_date: string | null;
  latitude: number;
  longitude: number;
}
