# ml/models/

Simpan **file model terlatih** di sini (pickle, joblib, ONNX, atau format lainnya).

## Konvensi nama file

```
disease_classifier_{version}.pkl
disease_classifier_{version}.onnx
```

Contoh: `disease_classifier_v1.pkl`

## Cara memuat model di `ai_service.py`

```python
import joblib, os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../storage/ml/models/disease_classifier_v1.pkl")
model = joblib.load(MODEL_PATH)

def predict_disease(sensor_payload):
    X = [[
        sensor_payload["soil_moisture"],
        sensor_payload["soil_ph"],
        sensor_payload["temperature"],
        sensor_payload["humidity"],
    ]]
    return model.predict(X)[0]
```

> File model **tidak di-commit** ke Git (lihat `.gitignore`).
