/*
 * ============================================================
 * ArgoMind — ESP32 IoT Sensor Node
 * File   : argomind_sensor.ino
 * Board  : ESP32 (wemos D1 mini32 / DevKitC / NodeMCU-32S)
 * ============================================================
 *
 * Sensor yang digunakan:
 *   - DHT22        → Suhu udara + Kelembapan udara
 *   - Soil Moisture Sensor (analog) → Kelembapan tanah
 *   - pH Sensor (analog, 0-14 range) → pH tanah
 *
 * Wiring:
 *   DHT22    DATA  → GPIO 4
 *   Moisture AO   → GPIO 34 (ADC1)
 *   pH Sensor AO  → GPIO 35 (ADC1)
 *
 * Library yang dibutuhkan (install via Arduino Library Manager):
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

// ── Konfigurasi — EDIT BAGIAN INI ──────────────────────────────────────────────

const char* WIFI_SSID     = "NAMA_WIFI_KAMU";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_KAMU";

const char* MQTT_BROKER   = "192.168.1.100";   // IP komputer yang menjalankan ArgoMind
const int   MQTT_PORT     = 1883;
const char* MQTT_TOPIC    = "farm/sensor";
const char* FARM_ID       = "farm-001";         // Harus sama dengan Farm ID yang didaftarkan

// ── Pin konfigurasi ─────────────────────────────────────────────────────────────

#define DHT_PIN         4
#define DHT_TYPE        DHT22
#define MOISTURE_PIN    34
#define PH_PIN          35

// ── Interval pengiriman data (ms) ───────────────────────────────────────────────

const unsigned long SEND_INTERVAL_MS = 30000;   // Kirim setiap 30 detik

// ── Kalibrasi sensor tanah (sesuaikan dengan sensor kamu) ───────────────────────

// Soil Moisture: nilai ADC saat tanah kering vs basah
const int MOISTURE_DRY   = 3500;   // nilai ADC saat tanah kering
const int MOISTURE_WET   = 1200;   // nilai ADC saat tanah basah (terendam air)

// pH Sensor: kalibrasi 2 titik
// Ukur tegangan output saat dicelup ke larutan pH 4.0 dan pH 7.0
const float PH_VOLTAGE_4  = 3.05;   // tegangan (V) saat pH = 4.0
const float PH_VOLTAGE_7  = 2.50;   // tegangan (V) saat pH = 7.0

// ── Objek ───────────────────────────────────────────────────────────────────────

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long lastSendTime = 0;


// ── Setup ────────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=== ArgoMind Sensor Node ===");
  Serial.printf("Farm ID : %s\n", FARM_ID);
  Serial.printf("Topic   : %s\n", MQTT_TOPIC);

  dht.begin();
  connectWifi();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
}


// ── Main loop ────────────────────────────────────────────────────────────────────

void loop() {
  if (!mqtt.connected()) reconnectMqtt();
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;
    sendSensorData();
  }
}


// ── Baca dan kirim sensor data ────────────────────────────────────────────────────

void sendSensorData() {
  // Baca DHT22
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("[ERROR] Gagal membaca DHT22. Periksa koneksi sensor.");
    return;
  }

  // Baca soil moisture (konversi ADC ke persentase)
  int   moistureRaw = analogRead(MOISTURE_PIN);
  float moisture    = map(moistureRaw, MOISTURE_DRY, MOISTURE_WET, 0, 100);
  moisture          = constrain(moisture, 0.0, 100.0);

  // Baca pH sensor (konversi tegangan ke nilai pH)
  int   phRaw       = analogRead(PH_PIN);
  float phVoltage   = phRaw * (3.3 / 4095.0);
  float slope       = (7.0 - 4.0) / (PH_VOLTAGE_7 - PH_VOLTAGE_4);
  float ph          = 7.0 + slope * (phVoltage - PH_VOLTAGE_7);
  ph                = constrain(ph, 0.0, 14.0);

  // Bangun JSON payload
  StaticJsonDocument<200> doc;
  doc["farm_id"]      = FARM_ID;
  doc["temperature"]  = round(temperature * 10.0) / 10.0;
  doc["humidity"]     = round(humidity * 10.0) / 10.0;
  doc["soil_moisture"]= round(moisture * 10.0) / 10.0;
  doc["soil_ph"]      = round(ph * 100.0) / 100.0;

  char payload[200];
  serializeJson(doc, payload);

  // Kirim via MQTT
  if (mqtt.publish(MQTT_TOPIC, payload)) {
    Serial.printf("[OK] Terkirim: %s\n", payload);
  } else {
    Serial.println("[ERROR] Gagal publish ke MQTT.");
  }
}


// ── WiFi ─────────────────────────────────────────────────────────────────────────

void connectWifi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nWiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
}


// ── MQTT reconnect ────────────────────────────────────────────────────────────────

void reconnectMqtt() {
  while (!mqtt.connected()) {
    Serial.printf("Connecting to MQTT broker %s:%d ...", MQTT_BROKER, MQTT_PORT);
    String clientId = "argomind-" + String(FARM_ID) + "-" + String(random(0xffff), HEX);
    if (mqtt.connect(clientId.c_str())) {
      Serial.println(" connected!");
    } else {
      Serial.printf(" failed (rc=%d). Retry in 5s...\n", mqtt.state());
      delay(5000);
    }
  }
}
