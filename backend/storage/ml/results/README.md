# ml/results/

Simpan **laporan evaluasi model** di sini: classification report, confusion matrix, metrik akurasi, dll.

## Konvensi nama file

```
eval_{model_version}_{YYYYMMDD}.json
```

## Contoh isi file

```json
{
  "model_version": "v1",
  "trained_at": "2024-08-16",
  "accuracy": 0.94,
  "f1_macro": 0.91,
  "confusion_matrix": [[...], [...]],
  "classification_report": "..."
}
```

> File hasil **tidak di-commit** ke Git (lihat `.gitignore`).
