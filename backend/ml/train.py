# -*- coding: utf-8 -*-
"""
train.py
--------
Train an XGBoost multi-class classifier on the ArgoMind sensor dataset,
evaluate it, then export the trained model and artefacts.

Run from the backend/ directory:
    python -m ml.train                        (uses latest CSV in training_data/)
    python -m ml.train --dataset path/to.csv  (explicit file)
    python -m ml.train --gen                  (generate dataset first, then train)

Outputs written to storage/ml/models/:
    disease_classifier_v<N>.pkl   -- trained XGBClassifier + LabelEncoder (joblib)

Outputs written to storage/ml/results/:
    eval_v<N>_<YYYYMMDD>.json     -- accuracy, F1, classification report
    confusion_matrix_v<N>_<YYYYMMDD>.png  -- visual confusion matrix
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR    = Path(__file__).resolve().parent
STORAGE       = SCRIPT_DIR.parent / "storage" / "ml"
TRAINING_DIR  = STORAGE / "training_data"
MODELS_DIR    = STORAGE / "models"
RESULTS_DIR   = STORAGE / "results"

for _d in (MODELS_DIR, RESULTS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ── Feature columns ───────────────────────────────────────────────────────────
FEATURE_COLS = ["soil_moisture", "soil_ph", "temperature", "humidity", "rainfall_mm"]
TARGET_COL   = "label"


# ── Versioning ────────────────────────────────────────────────────────────────
def _next_version() -> int:
    """Return the next model version integer by scanning existing .pkl files."""
    existing = sorted(MODELS_DIR.glob("disease_classifier_v*.pkl"))
    if not existing:
        return 1
    last = existing[-1].stem          # e.g. "disease_classifier_v3"
    try:
        return int(last.split("_v")[-1]) + 1
    except ValueError:
        return len(existing) + 1


# ── Dataset loader ────────────────────────────────────────────────────────────
def _load_latest_csv() -> Path:
    csvs = sorted(TRAINING_DIR.glob("sensor_dataset_*.csv"))
    if not csvs:
        sys.exit(
            "[ERROR] No dataset found in storage/ml/training_data/.\n"
            "        Run first:  python -m ml.generate_dataset"
        )
    return csvs[-1]


def load_dataset(path: Path) -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(path)
    missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        sys.exit(f"[ERROR] Dataset missing columns: {missing}")
    X = df[FEATURE_COLS]
    y = df[TARGET_COL]
    print(f"[DATA]  Loaded {path.name} -- {len(df)} samples, {y.nunique()} classes")
    return X, y


# ── Model builder ─────────────────────────────────────────────────────────────
def build_model() -> XGBClassifier:
    return XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )


# ── Training pipeline ─────────────────────────────────────────────────────────
def train(dataset_path: Path | None = None) -> None:
    # 1. Load data
    path = dataset_path or _load_latest_csv()
    X, y_raw = load_dataset(path)

    # 2. Encode labels
    le = LabelEncoder()
    y  = le.fit_transform(y_raw)
    print(f"[TRAIN] Classes : {list(le.classes_)}")

    # 3. Train / test split  (80 / 20, stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 4. Cross-validation (5-fold) on training set
    model_cv = build_model()
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model_cv, X_train, y_train, cv=cv, scoring="accuracy", n_jobs=-1)
    print(f"\n[CV]    5-Fold Accuracy : {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    # 5. Final training on full train split
    print("[TRAIN] Training final model on full training split ...")
    model = build_model()
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # 6. Evaluation on held-out test set
    y_pred  = model.predict(X_test)
    acc     = accuracy_score(y_test, y_pred)
    f1_mac  = f1_score(y_test, y_pred, average="macro")
    f1_wtd  = f1_score(y_test, y_pred, average="weighted")
    cm      = confusion_matrix(y_test, y_pred).tolist()
    report  = classification_report(y_test, y_pred, target_names=le.classes_)

    print(f"\n[EVAL]  Test Accuracy  : {acc:.4f}")
    print(f"[EVAL]  F1 macro       : {f1_mac:.4f}")
    print(f"[EVAL]  F1 weighted    : {f1_wtd:.4f}")
    print(f"\n{report}")

    # 7. Feature importances
    importances = dict(zip(FEATURE_COLS, model.feature_importances_.tolist()))
    print("[FEAT]  Feature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        bar = "#" * int(imp * 50)
        print(f"        {feat:<20} {imp:.4f}  {bar}")

    # 8. Export model artefact (.pkl bundle: model + encoder)
    version   = _next_version()
    today_str = date.today().strftime("%Y%m%d")

    model_path = MODELS_DIR / f"disease_classifier_v{version}.pkl"
    bundle = {"model": model, "label_encoder": le, "feature_cols": FEATURE_COLS}
    joblib.dump(bundle, model_path, compress=3)
    print(f"\n[SAVE]  Model -> {model_path}")

    # 9. Export evaluation report (.json) to results/
    eval_path = RESULTS_DIR / f"eval_v{version}_{today_str}.json"
    eval_data = {
        "model_version":       f"v{version}",
        "model_file":          model_path.name,
        "trained_at":          today_str,
        "dataset":             path.name,
        "n_train":             int(len(X_train)),
        "n_test":              int(len(X_test)),
        "classes":             list(le.classes_),
        "cv_accuracy_mean":    round(float(cv_scores.mean()), 6),
        "cv_accuracy_std":     round(float(cv_scores.std()),  6),
        "test_accuracy":       round(float(acc),    6),
        "f1_macro":            round(float(f1_mac), 6),
        "f1_weighted":         round(float(f1_wtd), 6),
        "feature_importances": {k: round(v, 6) for k, v in importances.items()},
        "confusion_matrix":    cm,
        "classification_report": report,
    }
    eval_path.write_text(json.dumps(eval_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[SAVE]  Eval report -> {eval_path}")

    # 10. Save confusion matrix PNG
    _save_confusion_matrix_png(cm, list(le.classes_), version, today_str)

    print(f"\n[DONE]  Model v{version} is ready.")
    print(f"        File : {model_path.name}")
    print(f"        Tip  : pin this version by setting MODEL_VERSION in ml/model_loader.py")


# ── Confusion matrix visualisation ───────────────────────────────────────────
def _save_confusion_matrix_png(
    cm: list[list[int]],
    class_names: list[str],
    version: int,
    today_str: str,
) -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(7, 6))
        cm_arr = np.array(cm)
        im = ax.imshow(cm_arr, interpolation="nearest", cmap="Blues")
        fig.colorbar(im, ax=ax)

        ax.set(
            xticks=np.arange(len(class_names)),
            yticks=np.arange(len(class_names)),
            xticklabels=class_names,
            yticklabels=class_names,
            ylabel="True label",
            xlabel="Predicted label",
            title=f"Confusion Matrix -- disease_classifier_v{version}",
        )
        plt.setp(ax.get_xticklabels(), rotation=30, ha="right")

        thresh = cm_arr.max() / 2.0
        for i in range(len(class_names)):
            for j in range(len(class_names)):
                ax.text(
                    j, i, cm_arr[i, j],
                    ha="center", va="center",
                    color="white" if cm_arr[i, j] > thresh else "black",
                    fontsize=11,
                )

        fig.tight_layout()
        png_path = RESULTS_DIR / f"confusion_matrix_v{version}_{today_str}.png"
        fig.savefig(png_path, dpi=150)
        plt.close(fig)
        print(f"[PLOT]  Confusion matrix -> {png_path}")
    except ImportError:
        print("[WARN]  matplotlib not installed -- skipping confusion matrix PNG.")


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ArgoMind XGBoost disease classifier")
    parser.add_argument("--dataset", type=Path, default=None, help="Path to CSV dataset")
    parser.add_argument(
        "--gen", action="store_true",
        help="Generate a fresh synthetic dataset before training",
    )
    args = parser.parse_args()

    if args.gen:
        print("[GEN]   Generating synthetic dataset first ...\n")
        from ml.generate_dataset import generate, OUTPUT_FILE
        df = generate()
        df.to_csv(OUTPUT_FILE, index=False)
        print(f"[GEN]   Dataset written -> {OUTPUT_FILE}\n")
        args.dataset = OUTPUT_FILE

    train(dataset_path=args.dataset)
