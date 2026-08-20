/*
 * ============================================================
 * ArgoMind — Python MQTT Simulator (tanpa hardware)
 * File   : simulator_mqtt.py
 * ============================================================
 *
 * Jalankan script ini untuk mensimulasikan data sensor
 * langsung via MQTT ke ArgoMind backend — tanpa ESP32.
 *
 * Install dependency:
 *   pip install paho-mqtt
 *
 * Cara pakai:
 *   python simulator_mqtt.py --farm-id farm-001 --scenario kekeringan
 *
 * Skenario tersedia:
 *   normal, kekeringan, banjir, panas_ekstrem, ph_tinggi, ph_rendah, random
 * ============================================================
 */

import argparse
import json
import random
import time

import paho.mqtt.client as mqtt

# ── Konfigurasi default ───────────────────────────────────────────────────────

MQTT_BROKER   = "localhost"
MQTT_PORT     = 1883
MQTT_TOPIC    = "farm/sensor"
SEND_INTERVAL = 10   # detik antar pengiriman

# ── Preset skenario ───────────────────────────────────────────────────────────

SCENARIOS = {
    "normal": {
        "soil_moisture": 55.0,
        "soil_ph":       6.5,
        "temperature":   28.0,
        "humidity":      65.0,
    },
    "kekeringan": {
        "soil_moisture": 12.0,
        "soil_ph":       6.2,
        "temperature":   37.0,
        "humidity":      28.0,
    },
    "banjir": {
        "soil_moisture": 88.0,
        "soil_ph":       4.8,
        "temperature":   26.0,
        "humidity":      92.0,
    },
    "panas_ekstrem": {
        "soil_moisture": 30.0,
        "soil_ph":       6.8,
        "temperature":   41.0,
        "humidity":      22.0,
    },
    "ph_tinggi": {
        "soil_moisture": 50.0,
        "soil_ph":       8.2,
        "temperature":   30.0,
        "humidity":      60.0,
    },
    "ph_rendah": {
        "soil_moisture": 48.0,
        "soil_ph":       4.5,
        "temperature":   29.0,
        "humidity":      55.0,
    },
}


def build_payload(farm_id: str, scenario: str) -> dict:
    if scenario == "random":
        return {
            "farm_id":      farm_id,
            "soil_moisture": round(random.uniform(5, 95), 1),
            "soil_ph":       round(random.uniform(4.0, 9.0), 2),
            "temperature":   round(random.uniform(20, 45), 1),
            "humidity":      round(random.uniform(20, 95), 1),
        }

    base = SCENARIOS[scenario].copy()
    # Tambahkan sedikit noise agar data tidak identik setiap kirim
    base["farm_id"]       = farm_id
    base["soil_moisture"] = round(base["soil_moisture"] + random.uniform(-2, 2), 1)
    base["soil_ph"]       = round(base["soil_ph"]       + random.uniform(-0.1, 0.1), 2)
    base["temperature"]   = round(base["temperature"]   + random.uniform(-1, 1), 1)
    base["humidity"]      = round(base["humidity"]       + random.uniform(-3, 3), 1)
    return base


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Terhubung ke MQTT broker {MQTT_BROKER}:{MQTT_PORT}")
    else:
        print(f"❌ Gagal konek, rc={rc}")


def main():
    parser = argparse.ArgumentParser(description="ArgoMind MQTT Simulator")
    parser.add_argument("--farm-id",   default="farm-001",  help="Farm ID tujuan")
    parser.add_argument("--scenario",  default="normal",
                        choices=list(SCENARIOS.keys()) + ["random"],
                        help="Skenario simulasi")
    parser.add_argument("--interval",  type=int, default=SEND_INTERVAL,
                        help="Interval kirim data (detik)")
    parser.add_argument("--broker",    default=MQTT_BROKER, help="Alamat MQTT broker")
    parser.add_argument("--port",      type=int, default=MQTT_PORT, help="Port MQTT")
    parser.add_argument("--count",     type=int, default=0,
                        help="Jumlah kiriman (0 = terus-menerus)")
    args = parser.parse_args()

    client = mqtt.Client(client_id=f"argomind-sim-{args.farm_id}")
    client.on_connect = on_connect
    client.connect(args.broker, args.port, keepalive=60)
    client.loop_start()

    print(f"🌱 ArgoMind MQTT Simulator")
    print(f"   Farm ID  : {args.farm_id}")
    print(f"   Scenario : {args.scenario}")
    print(f"   Interval : {args.interval}s")
    print(f"   Broker   : {args.broker}:{args.port}")
    print(f"   Topic    : {MQTT_TOPIC}")
    print(f"   Ctrl+C untuk berhenti\n")

    sent = 0
    try:
        while True:
            payload = build_payload(args.farm_id, args.scenario)
            msg     = json.dumps(payload)
            result  = client.publish(MQTT_TOPIC, msg)
            sent   += 1
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print(f"[{sent}] ✅ Terkirim: {msg}")
            else:
                print(f"[{sent}] ❌ Gagal publish (rc={result.rc})")

            if args.count and sent >= args.count:
                print(f"\n✅ Selesai — {sent} data terkirim.")
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print(f"\n⏹  Dihentikan — {sent} data terkirim.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
