
Here’s a concise summary of the research and practical options for your use case.

---

# Hebrew/Multilingual NER for Zikaron Sanitization (2026)

## 1. Does `en_core_web_sm` detect Hebrew names?

**No.** `en_core_web_sm` is English-only. It will not reliably detect Hebrew names in Hebrew script. Hebrew uses a different Unicode range and RTL direction; the tokenizer and NER are trained on English and will treat Hebrew text poorly or ignore it.

---

## 2. Does `xx_ent_wiki_sm` handle Hebrew PERSON entities?

**No.** From the [spacy-models meta](https://github.com/explosion/spacy-models/blob/master/meta/xx_ent_wiki_sm-2.0.0.json):

> Supports identification of PER, LOC, ORG and MISC entities for **English, German, Spanish, French, Italian, Portuguese and Russian**.

Hebrew is not supported. Newer versions add Dutch and Polish, but still no Hebrew.

---

## 3. Alternatives for Hebrew NER

| Tool | Notes | Speed |
|------|-------|-------|
| **HebSpacy** | Community spaCy pipeline for Hebrew, MIT, `pip install hebspacy` | Similar to spaCy (CNN-based) |
| **HebPipe** | Georgetown Hebrew NLP pipeline (tokenizer, POS, NER) | Not benchmarked in docs |
| **AlephBERT-NER** | Bar Ilan ONLP Lab, SOTA Hebrew NER | Slower (transformer-based) |
| **Stanza** | Hebrew NER F1 83.9 on IAHLT, 12 entity types | Docs say “coming soon” |
| **GLiNER gliner_multi-v2.1** | Multilingual (XLM-R backbone), zero-shot, Apache 2.0 | Slower than spaCy, but single model for many languages |

---

## 4. Fastest option for both English and Hebrew

**Option A: GLiNER multilingual (single model)**  
- Model: `urchade/gliner_multi-v2.1`  
- Single pipeline for English and Hebrew  
- Zero-shot: `labels = ["person", "PERSON"]`  
- XLM-R backbone supports Hebrew  
- Slower than spaCy (transformer vs CNN)

**Option B: Script-based dual pipeline (likely fastest)**  
- Detect script per chunk: `bool(re.search(r'[\u0590-\u05FF]', text))`  
- Hebrew chunks → HebSpacy  
- English chunks → `en_core_web_sm` (NER only, other components disabled)  
- Most chunks are probably English-only, so you avoid loading HebSpacy for many chunks.

**Option C: Regex fallback for Hebrew names**  
- Hebrew names often follow patterns (e.g. בן/בת + name, common suffixes)  
- Very fast, but lower recall and more false positives  
- Useful as a fast pre-filter or when NER is too slow.

---

## 5. Performance and 20‑minute target

**Target:** 247K chunks × ~500 tokens ≈ 123.5M tokens in 20 min → ~206 chunks/sec.

**Rough throughput (CPU):**

| Model | Est. throughput | 247K chunks |
|-------|-----------------|-------------|
| spaCy `en_core_web_sm` (NER only, `n_process=8`) | ~30–80K words/sec | ~15–40 min |
| spaCy + HebSpacy (dual, script-routed) | Similar to above | ~20–45 min |
| GLiNER `gliner_multi-v2.1` | ~5–15K words/sec | ~2–6 hours |
| AlephBERT / Stanza | Slower than GLiNER | Likely 6+ hours |

**Ways to meet the 20‑minute goal:**

1. **Multiprocessing:** `nlp.pipe(texts, n_process=8, batch_size=256)`  
2. **Disable non-NER components:** `nlp = spacy.load('en_core_web_sm', disable=['tagger','parser','lemmatizer','attribute_ruler'])`  
3. **Script-based routing:** Only run HebSpacy on chunks that contain Hebrew  
4. **Batch size tuning:** Try `batch_size=128`–`512` for your chunk size  
5. **Cloud batch API:** Use Gemini Batch (or similar) for NER, like your enrichment backfill, if local speed is insufficient

---

## Recommended approach for Zikaron

1. **Implement script-based dual pipeline:**
   - English: `en_core_web_sm` with NER only  
   - Hebrew: HebSpacy (or GLiNER if HebSpacy is unstable)

2. **Benchmark on 1K–10K chunks** to measure real throughput on your machine.

3. **If still too slow:**  
   - Use Gemini Batch API for NER (similar to `cloud_backfill.py`)  
   - Or relax the 20‑minute target and run overnight.

4. **Optional:** Add a regex-based Hebrew name pass for chunks that are mostly Hebrew, to improve recall at low cost.

I can sketch a small benchmark script (script detection + dual pipeline + timing) or outline how to plug this into your existing Zikaron pipeline if you want to implement it next.
