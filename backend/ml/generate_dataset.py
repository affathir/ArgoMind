"""
generate_dataset.py
───────────────────
Generates a labelled synthetic sensor dataset for training the
ArgoMind disease-risk XGBoost classifier.

Run from the backend/ directory:
    python -m ml.generate_dataset

Output:
    backend/storage/ml/training_data/sensor_dataset_<YYYYMMDD>.csv
"""

import os
import numpy as np
import pandas as pd
from datetime import date
from pathlib import Path

# ── Reproducibility ───────────────────────────────────────────────────────────
SEED = 42
rng  = np.random.default_rng(SEED)

# ── Output path ───────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parent
STORAGE_ROOT = SCRIPT_DIR.parent / "storage" / "ml" / "training_data"
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE  = STORAGE_ROOT / f"sensor_dataset_{date.today().strftime('%Y%m%d')}.csv"

# ── Class definitions ─────────────────────────────────────────────────────────
# Each class is (label, n_samples, feature_distribution_params)
#
# Features: soil_moisture (%), soil_ph, temperature (°C), humidity (%), rainfall_mm
#
# Disease ecology rationale:
#   Sehat        → balanced soil, moderate temp & humidity
#   Blast        → padi blast thrives: low moisture, high temp, low humidity
#   Bercak_Daun  → leaf blight: moderate pH drift, high temp, low humidity
#   Busuk_Akar   → root rot: waterlogged (high moisture), acidic, cool, high humidity
#   Layu_Fusarium→ fusarium wilt: alkaline pH, high temp, low moisture

CLASSES = [
    # (label, n, [moisture_mean,std], [ph_mean,std], [temp_mean,std], [hum_mean,std], [rain_mean,std])
    ("Sehat",          400, (55, 10),  (6.5, 0.3), (27, 2),  (65, 8),  (8, 4)),
    ("Blast",          200, (18, 6),   (6.2, 0.4), (34, 3),  (28, 7),  (1, 1)),
    ("Bercak_Daun",    200, (35, 8),   (7.0, 0.5), (33, 3),  (32, 8),  (2, 2)),
    ("Busuk_Akar",     200, (78, 8),   (4.8, 0.4), (22, 2),  (88, 6),  (22, 5)),
    ("Layu_Fusarium",  200, (20, 7),   (7.8, 0.4), (35, 3),  (30, 7),  (1, 1)),
]


def _clip(arr: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return np.clip(arr, lo, hi)


def generate() -> pd.DataFrame:
    rows = []

    for label, n, (mm, ms), (pm, ps), (tm, ts), (hm, hs), (rm, rs) in CLASSES:
        moisture   = _clip(rng.normal(mm, ms, n),   0,  100)
        ph         = _clip(rng.normal(pm, ps, n),   3.5, 9.0)
        temp       = _clip(rng.normal(tm, ts, n),   10,  50)
        humidity   = _clip(rng.normal(hm, hs, n),   0,  100)
        rainfall   = _clip(rng.normal(rm, rs, n),   0,  60)

        for i in range(n):
            rows.append({
                "soil_moisture": round(float(moisture[i]),  2),
                "soil_ph":       round(float(ph[i]),        2),
                "temperature":   round(float(temp[i]),      2),
                "humidity":      round(float(humidity[i]),  2),
                "rainfall_mm":   round(float(rainfall[i]),  2),
                "label":         label,
            })

    df = pd.DataFrame(rows).sample(frac=1, random_state=SEED).reset_index(drop=True)
    return df


if __name__ == "__main__":
    df = generate()
    df.to_csv(OUTPUT_FILE, index=False)

    print(f"[GEN]  Dataset generated -> {OUTPUT_FILE}")
    print(f"       Total samples : {len(df)}")
    print(f"       Class balance :")
    print(df["label"].value_counts().to_string())
