// =============================================================================
//  Service – IBM watsonx.ai  (RAG + LLM generation)
//
//  RAG pipeline:
//    1. RETRIEVE  – last 24 h sensor data + device/crop profile from DB
//    2. ML AUGMENT – latest forecast (from mlService)
//    3. GENERATE  – build structured prompt → call Granite via watsonx.ai
//    4. PERSIST   – save insight to DB, return to caller
// =============================================================================
import WatsonxAiMlV1 from "@ibm-cloud/watsonx-ai";
import { IamAuthenticator } from "ibm-cloud-sdk-core";

import { env }             from "../config/env";
import { logger }          from "../config/logger";
import { prisma }          from "./dbService";
import { requestForecast } from "./mlService";

// ── watsonx.ai SDK client (singleton) ────────────────────────────────────────
let _client: InstanceType<typeof WatsonxAiMlV1> | null = null;

function getWatsonxClient() {
  if (!_client) {
    _client = WatsonxAiMlV1.newInstance({
      authenticator: new IamAuthenticator({ apikey: env.IBM_WATSONX_API_KEY }),
      serviceUrl:    env.IBM_WATSONX_URL,
      version:       "2024-05-31",
    });
  }
  return _client;
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(ctx: {
  cropType:    string;
  growthStage: string;
  location:    string;
  latest: {
    soilMoisture: number;
    soilTemperature: number;
    airTemperature: number;
    airHumidity: number;
    timestamp: Date;
  };
  avgMoisture24h: number;
  minMoisture24h: number;
  forecast: {
    droughtStressLabel: string;
    predictions: { hoursAhead: number; soilMoisture: number; confidence: number }[];
  };
}): string {
  const p = ctx.forecast.predictions;
  const forecastStr = p.map(
    (f) => `  +${f.hoursAhead}h: ${f.soilMoisture.toFixed(1)}% (conf ${(f.confidence * 100).toFixed(0)}%)`
  ).join("\n");

  return `<|system|>
Kamu adalah AgriMind, asisten agronomi AI yang membantu petani membuat keputusan irigasi.
Selalu jawab dalam Bahasa Indonesia yang sederhana dan mudah dipahami petani tanpa latar belakang teknis.
Jawaban harus spesifik, dapat langsung dieksekusi, dan singkat.
<|user|>
DATA SENSOR SAAT INI (${new Date(ctx.latest.timestamp).toLocaleString("id-ID")}):
- Kelembapan tanah: ${ctx.latest.soilMoisture.toFixed(1)}%
- Suhu tanah: ${ctx.latest.soilTemperature.toFixed(1)}°C
- Suhu udara: ${ctx.latest.airTemperature.toFixed(1)}°C
- Kelembapan udara: ${ctx.latest.airHumidity.toFixed(1)}%

RATA-RATA 24 JAM TERAKHIR:
- Rata-rata kelembapan tanah: ${ctx.avgMoisture24h.toFixed(1)}%
- Minimum kelembapan tanah: ${ctx.minMoisture24h.toFixed(1)}%

PREDIKSI ML (72 JAM KE DEPAN):
${forecastStr}
Status stres kekeringan: ${ctx.forecast.droughtStressLabel.toUpperCase()}

PROFIL TANAMAN:
- Jenis tanaman: ${ctx.cropType}
- Fase pertumbuhan: ${ctx.growthStage}
- Lokasi: ${ctx.location}

Berdasarkan data di atas, berikan respons PERSIS dalam format JSON berikut (tanpa teks lain):
{
  "statusSummary": "<satu kalimat ringkasan kondisi saat ini>",
  "actions": [
    "<tindakan konkret 1 yang harus dilakukan dalam 24 jam>",
    "<tindakan konkret 2>",
    "<tindakan konkret 3>"
  ],
  "riskIfNoAction": "<konsekuensi jika tidak ada tindakan dalam 24-48 jam>"
}
<|assistant|>`;
}

// ── Generate insight (JSON response) ─────────────────────────────────────────
export async function generateInsight(deviceId: string) {
  const client = getWatsonxClient();

  // 1. RETRIEVE context from DB
  const device = await prisma.device.findUniqueOrThrow({ where: { id: deviceId } });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const readings = await prisma.sensorReading.findMany({
    where:   { deviceId, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
  });

  const latest = await prisma.sensorReading.findFirstOrThrow({
    where:   { deviceId },
    orderBy: { timestamp: "desc" },
  });

  const avgMoisture24h = readings.length
    ? readings.reduce((s, r) => s + r.soilMoisture, 0) / readings.length
    : latest.soilMoisture;

  const minMoisture24h = readings.length
    ? Math.min(...readings.map((r) => r.soilMoisture))
    : latest.soilMoisture;

  // 2. ML AUGMENT
  const forecast = await requestForecast(deviceId);

  // 3. GENERATE
  const prompt = buildPrompt({
    cropType:    device.cropType,
    growthStage: device.growthStage,
    location:    device.location,
    latest,
    avgMoisture24h,
    minMoisture24h,
    forecast,
  });

  logger.debug(`Calling watsonx.ai for device ${deviceId}`);

  const response = await client.generateText({
    modelId:   env.WATSONX_MODEL_ID,
    projectId: env.IBM_PROJECT_ID,
    input:     prompt,
    parameters: {
      max_new_tokens:  512,
      temperature:     0.3,
      repetition_penalty: 1.1,
    },
  });

  const rawText = response.result.results?.[0]?.generated_text ?? "{}";

  // Parse JSON from LLM output (strip any markdown fences if present)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  let parsed: { statusSummary: string; actions: string[]; riskIfNoAction: string };
  try {
    parsed = JSON.parse(jsonMatch?.[0] ?? "{}");
  } catch {
    logger.warn("Failed to parse LLM JSON response, using fallback");
    parsed = {
      statusSummary:  rawText.slice(0, 120),
      actions:        ["Periksa sensor secara manual", "Pantau kelembapan setiap 2 jam"],
      riskIfNoAction: "Tanaman mungkin mengalami stres air.",
    };
  }

  // 4. PERSIST
  const insight = await prisma.aiInsight.create({
    data: {
      deviceId,
      statusSummary:  parsed.statusSummary  ?? "",
      actions:        parsed.actions        ?? [],
      riskIfNoAction: parsed.riskIfNoAction ?? "",
      language:       "id",
      modelId:        env.WATSONX_MODEL_ID,
    },
  });

  return {
    deviceId,
    generatedAt:    insight.generatedAt.toISOString(),
    statusSummary:  insight.statusSummary,
    actions:        insight.actions as string[],
    riskIfNoAction: insight.riskIfNoAction,
    language:       insight.language,
  };
}

// ── Stream insight via SSE (token-by-token) ───────────────────────────────────
export async function streamInsightSSE(
  deviceId: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const client = getWatsonxClient();

  const device = await prisma.device.findUniqueOrThrow({ where: { id: deviceId } });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const readings = await prisma.sensorReading.findMany({
    where: { deviceId, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
  });

  const latest = await prisma.sensorReading.findFirstOrThrow({
    where:   { deviceId },
    orderBy: { timestamp: "desc" },
  });

  const avgMoisture24h = readings.length
    ? readings.reduce((s, r) => s + r.soilMoisture, 0) / readings.length
    : latest.soilMoisture;

  const minMoisture24h = readings.length
    ? Math.min(...readings.map((r) => r.soilMoisture))
    : latest.soilMoisture;

  const forecast = await requestForecast(deviceId);

  const prompt = buildPrompt({
    cropType:    device.cropType,
    growthStage: device.growthStage,
    location:    device.location,
    latest,
    avgMoisture24h,
    minMoisture24h,
    forecast,
  });

  // watsonx.ai streaming generation
  const stream = await client.generateTextStream({
    modelId:   env.WATSONX_MODEL_ID,
    projectId: env.IBM_PROJECT_ID,
    input:     prompt,
    parameters: {
      max_new_tokens:  512,
      temperature:     0.3,
      repetition_penalty: 1.1,
    },
  });

  for await (const chunk of stream) {
    const token = (chunk as { results?: { generated_text?: string }[] })
      .results?.[0]?.generated_text;
    if (token) onChunk(token);
  }
}
