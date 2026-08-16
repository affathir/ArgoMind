# llm_responses/

Folder ini menyimpan **output JSON mentah** dari panggilan LLM (Langflow / WatsonX / OpenAI, dll).

## Konvensi nama file

```
{farm_id}_{YYYYMMDD_HHMMSS}.json
```

Contoh: `farm-001_20240816_083000.json`

## Struktur JSON yang disarankan

```json
{
  "farm_id": "farm-001",
  "timestamp": "2024-08-16T08:30:00Z",
  "prompt_context": { ... },
  "raw_response": "...",
  "parsed_advice": "..."
}
```

> File ini **tidak di-commit** ke Git (lihat `.gitignore`).
> Hanya `.gitkeep` yang masuk repository agar folder terlacak.
