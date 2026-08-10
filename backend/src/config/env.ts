// =============================================================================
//  AgriMind Backend – Environment variable validation (Zod)
//  Fails fast at startup if any required var is missing.
// =============================================================================
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV:            z.enum(["development", "production", "test"]).default("development"),
  PORT:                z.string().default("4000").transform(Number),
  DATABASE_URL:        z.string().min(1, "DATABASE_URL is required"),

  // IBM watsonx.ai
  IBM_WATSONX_API_KEY: z.string().min(1, "IBM_WATSONX_API_KEY is required"),
  IBM_WATSONX_URL:     z.string().url().default("https://us-south.ml.cloud.ibm.com"),
  IBM_PROJECT_ID:      z.string().min(1, "IBM_PROJECT_ID is required"),
  WATSONX_MODEL_ID:    z.string().default("ibm/granite-13b-chat-v2"),

  // ML micro-service
  ML_SERVICE_URL:      z.string().url().default("http://ml:5001"),

  // Auth
  JWT_SECRET:          z.string().min(32, "JWT_SECRET must be at least 32 chars"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
