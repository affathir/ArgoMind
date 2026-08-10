// =============================================================================
//  AgriMind – ESP32 Firmware
//  Reads DHT22 (air temp + humidity) and capacitive soil moisture sensor,
//  then POSTs a JSON payload to the AgriMind backend every READ_INTERVAL_MS.
//
//  Wiring:
//    DHT22  DATA  → GPIO4   (+ 10kΩ pull-up to 3.3V)
//    Soil sensor  → GPIO34  (analog, 3.3V powered)
//    Both sensors → GND + 3.3V
// =============================================================================
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "config.h"

// ── Sensor instance ───────────────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);

// ── State ─────────────────────────────────────────────────────────────────────
unsigned long lastReadMs = 0;
uint8_t       wifiRetries = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────
void debugLog(const String& msg) {
#if DEBUG_SERIAL
    Serial.println(msg);
#endif
}

/**
 * Map raw ADC value to soil moisture percentage.
 * Inverted: lower ADC = wetter soil (capacitive sensor behaviour).
 */
float adcToMoisturePct(int raw) {
    float pct = map(raw, SOIL_AIR_VALUE, SOIL_WATER_VALUE, 0, 100);
    return constrain(pct, 0.0f, 100.0f);
}

/**
 * Read soil moisture: average 5 samples to reduce ADC noise.
 */
float readSoilMoisture() {
    long sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += analogRead(SOIL_SENSOR_PIN);
        delay(10);
    }
    int avgRaw = sum / 5;
    debugLog("Soil ADC raw: " + String(avgRaw));
    return adcToMoisturePct(avgRaw);
}

/**
 * Connect (or reconnect) to WiFi with retries.
 */
bool ensureWiFi() {
    if (WiFi.status() == WL_CONNECTED) return true;

    debugLog("Connecting to WiFi: " + String(WIFI_SSID));
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint8_t attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        debugLog(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        debugLog("\nWiFi connected. IP: " + WiFi.localIP().toString());
        wifiRetries = 0;
        return true;
    }

    wifiRetries++;
    debugLog("WiFi connection failed (attempt " + String(wifiRetries) + ")");
    return false;
}

/**
 * Serialise sensor readings into JSON and POST to backend.
 * Returns HTTP status code, or -1 on connection failure.
 */
int postSensorData(float soilMoisture, float soilTemp,
                   float airTemp,      float airHumidity) {
    HTTPClient http;
    String url = "http://" + String(API_HOST) + ":" + String(API_PORT) + API_ENDPOINT;

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(8000);   // 8 s timeout

    // Build JSON payload
    StaticJsonDocument<256> doc;
    doc["deviceId"]        = DEVICE_ID;
    doc["soilMoisture"]    = roundf(soilMoisture * 10) / 10.0f;
    doc["soilTemperature"] = roundf(soilTemp     * 10) / 10.0f;
    doc["airTemperature"]  = roundf(airTemp      * 10) / 10.0f;
    doc["airHumidity"]     = roundf(airHumidity  * 10) / 10.0f;

    String body;
    serializeJson(doc, body);
    debugLog("POST → " + url);
    debugLog("Body: " + body);

    int httpCode = http.POST(body);

    if (httpCode > 0) {
        debugLog("HTTP " + String(httpCode) + " ← " + http.getString());
    } else {
        debugLog("HTTP error: " + http.errorToString(httpCode));
    }

    http.end();
    return httpCode;
}

// ── Arduino lifecycle ─────────────────────────────────────────────────────────
void setup() {
#if DEBUG_SERIAL
    Serial.begin(115200);
    delay(500);
    Serial.println("\n=== AgriMind ESP32 v" FIRMWARE_VERSION " ===");
#endif

    // Configure ADC for 12-bit resolution (0–4095)
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);   // full 3.3V range on GPIO34

    dht.begin();
    ensureWiFi();
}

void loop() {
    unsigned long now = millis();

    // Only read + send every READ_INTERVAL_MS
    if (now - lastReadMs < READ_INTERVAL_MS) return;
    lastReadMs = now;

    // ── 1. Ensure connectivity ─────────────────────────────────────────────
    if (!ensureWiFi()) {
        debugLog("Skipping read: no WiFi");
        return;
    }

    // ── 2. Read DHT22 ─────────────────────────────────────────────────────
    float airHumidity = dht.readHumidity();
    float airTemp     = dht.readTemperature();   // Celsius

    if (isnan(airHumidity) || isnan(airTemp)) {
        debugLog("DHT22 read failed — retrying next cycle");
        return;
    }

    // ── 3. Read soil moisture ─────────────────────────────────────────────
    float soilMoisture = readSoilMoisture();

    // Estimate soil temperature from air temp + empirical offset
    // (replace with DS18B20 probe for higher accuracy)
    float soilTemp = airTemp - 2.5f;

    debugLog(
        "Sensors → Soil: "   + String(soilMoisture, 1) + "% | "
        "SoilT: "            + String(soilTemp,     1) + "°C | "
        "AirT: "             + String(airTemp,      1) + "°C | "
        "AirH: "             + String(airHumidity,  1) + "%"
    );

    // ── 4. POST to backend ────────────────────────────────────────────────
    int code = postSensorData(soilMoisture, soilTemp, airTemp, airHumidity);

    if (code == 201) {
        debugLog("✅  Reading accepted by server");
    } else if (code == -1) {
        debugLog("❌  Failed to reach server");
    }
}
