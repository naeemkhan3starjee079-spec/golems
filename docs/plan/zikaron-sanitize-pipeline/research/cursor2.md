
Summary of changes and decisions:

---

## Summary of changes

1. **Added `"role": "user"`** to each content object (required by the API).
2. **Switched to snake_case** for config: `generation_config` and `response_mime_type`.
3. **Removed `responseSchema`** to avoid batch API validation issues.
4. **Switched model** from `models/gemini-2.5-flash-lite` to `models/gemini-2.5-flash` (Flash-Lite does not support batch).
5. **Updated MIME type** from `application/jsonl` to `application/json` to avoid "Unsupported MIME type" errors.

`ENRICHMENT_PROMPT` already defines the JSON structure, so `parse_enrichment` should still work without a schema.

---

## If you still see errors

1. **Try camelCase** if snake_case fails:
   ```json
   "generationConfig": {"responseMimeType": "application/json"}
   ```

2. **Minimal test** — remove `generation_config` entirely and confirm the batch runs:
   ```json
   {"key": "test_1", "request": {"contents": [{"role": "user", "parts": [{"text": "Say hello"}]}]}}
   ```

3. **Re-add schema later** — once the minimal format works, try adding `response_schema` back to see if the batch API supports it.

Run a small sample to validate:

```bash
python3 scripts/cloud_backfill.py --sample 10
```
