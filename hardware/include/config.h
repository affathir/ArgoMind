#pragma once
// =============================================================================
//  AgriMind ESP32 – Hardware & network configuration
//  Edit this file before flashing. Do NOT commit real credentials to git.
// =============================================================================

// ── Device identity ───────────────────────────────────────────────────────────
#define DEVICE_ID         "device-001"
#define FIRMWARE_VERSION  "1.0.0"

// ── WiFi credentials ──────────────────────────────────────────────────────────
#define WIFI_SSID         "YOUR_WIFI_SSID"
#define WIFI_PASSWORD     "YOUR_WIFI_PASSWORD"

// ── Backend API ───────────────────────────────────────────────────────────────
// Use local IP during development, or your domain in production
#define API_HOST          "192.168.1.100"   // change to your backend IP
#define API_PORT          4000
#define API_ENDPOINT      "/api/v1/ingest"

// ── Sensor pin assignments ────────────────────────────────────────────────────
#define DHT_PIN           4     // GPIO4 – DHT22 data pin
#define DHT_TYPE          DHT22
#define SOIL_SENSOR_PIN   34    // GPIO34 (ADC1_CH6) – capacitive soil moisture

// ── Soil moisture ADC calibration ────────────────────────────────────────────
// Measure these values with your specific sensor:
//   AIR_VALUE   = raw ADC reading when probe is in dry air (0% moisture)
//   WATER_VALUE = raw ADC reading when probe is fully submerged (100% moisture)
#define SOIL_AIR_VALUE    2800
#define SOIL_WATER_VALUE  1200

// ── Timing ────────────────────────────────────────────────────────────────────
#define READ_INTERVAL_MS  30000   // 30 seconds between readings (for demo)
                                  // Change to 1800000 for 30-min prod interval

// ── Serial debug ─────────────────────────────────────────────────────────────
#define DEBUG_SERIAL      true
