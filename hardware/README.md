# ArgoMind — Hardware & Simulator

Folder ini berisi semua kode untuk menghubungkan perangkat keras IoT ke ArgoMind,
serta simulator berbasis software bila hardware belum tersedia.

---

## 📁 Struktur Folder

```
hardware/
├── esp32/
│   └── argomind_sensor/
│       └── argomind_sensor.ino   ← Kode Arduino untuk ESP32
│
├── simulator_mqtt/
│   └── simulator_mqtt.py         ← Simulator Python via MQTT
│
└── README.md                     ← Dokumen ini
```

---

## 🔌 Opsi 1 — Hardware Nyata (ESP32)

### Komponen yang Dibutuhkan

| Komponen | Fungsi | Harga Estimasi |
|---|---|---|
| ESP32 DevKit / NodeMCU-32S | Mikrokontroler utama + WiFi | Rp 50.000 |
| DHT22 | Suhu udara + Kelembapan udara | Rp 35.000 |
| Soil Moisture Sensor (kapasitif) | Kelembapan tanah | Rp 20.000 |
| pH Sensor Analog (SEN0161) | pH tanah | Rp 150.000 |
| Breadboard + Kabel Jumper | Koneksi komponen | Rp 20.000 |

### Wiring Diagram

```
ESP32           Sensor
──────────────────────────────────
GPIO 4    ───── DHT22 DATA
3.3V      ───── DHT22 VCC
GND       ───── DHT22 GND

GPIO 34   ───── Soil Moisture AO
3.3V      ───── Soil Moisture VCC
GND       ───── Soil Moisture GND

GPIO 35   ───── pH Sensor AO
5V        ───── pH Sensor VCC  (gunakan pin VIN / 5V)
GND       ───── pH Sensor GND
```

> ⚠️ pH Sensor butuh tegangan 5V. Gunakan voltage divider (2x10kΩ) jika output sensor >3.3V sebelum masuk ke GPIO ESP32.

### Cara Install & Upload

**1. Install Arduino IDE:**
Download dari https://www.arduino.cc/en/software

**2. Tambahkan ESP32 Board ke Arduino IDE:**
- Buka `File` → `Preferences`
- Tambahkan URL berikut ke *Additional Board Manager URLs*:
  ```
  https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
  ```
- Buka `Tools` → `Board` → `Boards Manager` → cari `esp32` → Install

**3. Install Library yang dibutuhkan:**
Buka `Tools` → `Manage Libraries`, install:
- `DHT sensor library` by Adafruit
- `Adafruit Unified Sensor` by Adafruit
- `ArduinoJson` by Benoit Blanchon
- `PubSubClient` by Nick O'Leary

**4. Edit konfigurasi di `argomind_sensor.ino`:**
```cpp
const char* WIFI_SSID     = "NAMA_WIFI_KAMU";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_KAMU";
const char* MQTT_BROKER   = "192.168.1.100";  // IP komputer ArgoMind
const char* FARM_ID       = "farm-001";
```

> Cari IP komputer kamu: jalankan `ipconfig` di Windows, lihat *IPv4 Address*.

**5. Upload ke ESP32:**
- Pilih board: `Tools` → `Board` → `ESP32 Arduino` → `ESP32 Dev Module`
- Pilih port: `Tools` → `Port` → pilih COM port ESP32
- Klik tombol **Upload** (→)

**6. Monitor output:**
Buka `Tools` → `Serial Monitor`, set baud rate ke `115200`.
Kamu akan melihat data terkirim setiap 30 detik.

### Kalibrasi Sensor

**Soil Moisture:**
1. Baca nilai ADC saat sensor di udara (kering) → isi `MOISTURE_DRY`
2. Baca nilai ADC saat sensor dicelup air → isi `MOISTURE_WET`

**pH Sensor:**
1. Celupkan probe ke larutan buffer pH 7.0 → catat tegangan → isi `PH_VOLTAGE_7`
2. Celupkan probe ke larutan buffer pH 4.0 → catat tegangan → isi `PH_VOLTAGE_4`

---

## 💻 Opsi 2 — Simulator Python via MQTT (Tanpa Hardware)

Gunakan ini jika belum punya hardware atau untuk testing/demo.

### Install Dependency

```bash
cd hardware/simulator_mqtt
pip install paho-mqtt
```

### Cara Jalankan

```bash
# Skenario normal
python simulator_mqtt.py --farm-id farm-001 --scenario normal

# Skenario kekeringan (trigger alert Telegram)
python simulator_mqtt.py --farm-id farm-001 --scenario kekeringan

# Data random, kirim setiap 5 detik
python simulator_mqtt.py --farm-id farm-001 --scenario random --interval 5

# Kirim tepat 10 data lalu berhenti
python simulator_mqtt.py --farm-id farm-001 --scenario banjir --count 10
```

### Semua Parameter

| Parameter | Default | Keterangan |
|---|---|---|
| `--farm-id` | `farm-001` | Farm ID tujuan (harus sudah terdaftar) |
| `--scenario` | `normal` | `normal`, `kekeringan`, `banjir`, `panas_ekstrem`, `ph_tinggi`, `ph_rendah`, `random` |
| `--interval` | `10` | Detik antar pengiriman |
| `--broker` | `localhost` | Alamat MQTT broker |
| `--port` | `1883` | Port MQTT |
| `--count` | `0` | Jumlah kirim (0 = terus-menerus) |

---

## 🌐 Opsi 3 — Simulator Web (Paling Mudah)

Buka dashboard ArgoMind di browser → klik tombol **"Simulator"** di header.

Fitur:
- Pilih preset skenario (kekeringan, banjir, suhu ekstrem, dll)
- Atur nilai sensor dengan slider interaktif
- Kirim langsung ke backend tanpa perlu MQTT atau hardware

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---|---|
| ESP32 tidak bisa konek WiFi | Pastikan SSID dan password benar, ESP32 harus di jaringan 2.4GHz |
| MQTT connection refused | Pastikan Mosquitto berjalan: `net start mosquitto` |
| DHT22 gagal baca | Periksa resistor pull-up 10kΩ antara DATA dan VCC |
| Nilai pH tidak akurat | Lakukan kalibrasi ulang dengan larutan buffer pH 4.0 dan 7.0 |
| Soil moisture selalu 0 atau 100 | Kalibrasi ulang nilai `MOISTURE_DRY` dan `MOISTURE_WET` |
