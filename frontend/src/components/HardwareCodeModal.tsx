"use client";

import React, { useState } from "react";
import { X, Copy, CheckCheck, Cpu, Wifi } from "lucide-react";

interface Props {
  farmId: string;
  mqttBrokerIp: string; // shown as placeholder in the code
  onClose: () => void;
}

function buildArduinoCode(farmId: string, mqttBrokerIp: string): string {
  return `/*
 * ============================================================
 * ArgoMind — ESP32 IoT Sensor Node
 * Farm ID : ${farmId}
 * ============================================================
 * Sensors used:
 *   - DHT22        → Air temperature + Air humidity
 *   - Soil Moisture Sensor (analog) → Soil moisture
 *   - pH Sensor (analog) → Soil pH
 *
 * Required libraries (install via Arduino Library Manager):
 *   - DHT sensor library by Adafruit
 *   - Adafruit Unified Sensor
 *   - ArduinoJson by Benoit Blanchon
 *   - PubSubClient by Nick O'Leary
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ── EDIT THIS SECTION ──────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER   = "${mqttBrokerIp}";  // IP of the machine running ArgoMind
const int   MQTT_PORT     = 1883;
// ──────────────────────────────────────────────────────────────────────────────

const char* MQTT_TOPIC    = "farm/sensor";
const char* FARM_ID       = "${farmId}";

#define DHT_PIN         4
#define DHT_TYPE        DHT22
#define MOISTURE_PIN    34
#define PH_PIN          35

const unsigned long SEND_INTERVAL_MS = 30000;

const int   MOISTURE_DRY  = 3500;
const int   MOISTURE_WET  = 1200;
const float PH_VOLTAGE_4  = 3.05;
const float PH_VOLTAGE_7  = 2.50;

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  connectWifi();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  Serial.printf("Farm ID : %s\\n", FARM_ID);
}

void loop() {
  if (!mqtt.connected()) reconnectMqtt();
  mqtt.loop();
  if (millis() - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = millis();
    sendSensorData();
  }
}

void sendSensorData() {
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  if (isnan(temperature) || isnan(humidity)) { Serial.println("[ERROR] DHT22 read failed."); return; }

  int   moistureRaw = analogRead(MOISTURE_PIN);
  float moisture    = constrain(map(moistureRaw, MOISTURE_DRY, MOISTURE_WET, 0, 100), 0, 100);

  int   phRaw     = analogRead(PH_PIN);
  float phVoltage = phRaw * (3.3 / 4095.0);
  float slope     = (7.0 - 4.0) / (PH_VOLTAGE_7 - PH_VOLTAGE_4);
  float ph        = constrain(7.0 + slope * (phVoltage - PH_VOLTAGE_7), 0.0, 14.0);

  StaticJsonDocument<200> doc;
  doc["farm_id"]       = FARM_ID;
  doc["temperature"]   = round(temperature * 10.0) / 10.0;
  doc["humidity"]      = round(humidity * 10.0) / 10.0;
  doc["soil_moisture"] = round(moisture * 10.0) / 10.0;
  doc["soil_ph"]       = round(ph * 100.0) / 100.0;

  char payload[200];
  serializeJson(doc, payload);
  if (mqtt.publish(MQTT_TOPIC, payload)) Serial.printf("[OK] %s\\n", payload);
  else Serial.println("[ERROR] Publish failed.");
}

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.printf("\\nWiFi connected: %s\\n", WiFi.localIP().toString().c_str());
}

void reconnectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("Connecting MQTT...");
    String clientId = "argomind-" + String(FARM_ID) + "-" + String(random(0xffff), HEX);
    if (mqtt.connect(clientId.c_str())) Serial.println(" connected!");
    else { Serial.printf(" failed rc=%d. Retry in 5s...\\n", mqtt.state()); delay(5000); }
  }
}`;
}

export default function HardwareCodeModal({ farmId, mqttBrokerIp, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const code = buildArduinoCode(farmId, mqttBrokerIp);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-100 p-2">
              <Cpu className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">ESP32 Code Ready to Upload</h2>
              <p className="text-xs text-gray-500">Farm ID: <span className="font-mono font-semibold text-green-700">{farmId}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-6 pt-4 shrink-0">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5" /> Before uploading to ESP32:</p>
            <p>1. Replace <code className="bg-amber-100 px-1 rounded">YOUR_WIFI_NAME</code> and <code className="bg-amber-100 px-1 rounded">YOUR_WIFI_PASSWORD</code></p>
            <p>2. Replace <code className="bg-amber-100 px-1 rounded">{mqttBrokerIp}</code> with the IP address of the machine running ArgoMind</p>
            <p>3. Install libraries: <strong>DHT sensor library</strong>, <strong>PubSubClient</strong>, <strong>ArduinoJson</strong></p>
          </div>
        </div>

        {/* Code block */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <pre className="rounded-xl bg-gray-900 text-gray-100 p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre font-mono">
            {code}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
