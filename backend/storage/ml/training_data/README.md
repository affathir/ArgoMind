# ml/training_data/

Simpan dataset CSV / Parquet yang digunakan untuk **melatih model ML** penyakit tanaman.

## Konvensi nama file

```
sensor_dataset_{YYYYMMDD}.csv
```

## Kolom yang diharapkan

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `soil_moisture` | float | % kelembapan tanah |
| `soil_ph` | float | nilai pH |
| `temperature` | float | suhu udara (°C) |
| `humidity` | float | kelembapan udara (%) |
| `rainfall_mm` | float | curah hujan hari itu |
| `label` | str | nama penyakit / "sehat" |

> File data **tidak di-commit** ke Git (lihat `.gitignore`).
