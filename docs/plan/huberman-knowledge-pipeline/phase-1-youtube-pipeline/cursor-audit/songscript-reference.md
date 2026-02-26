# SongScript YouTube Transcript Extraction — Audit for Zikaron Reuse

**Audit date:** 2025-02-17  
**Source:** `~/Gits/songscript`  
**Target:** Zikaron podcast episode indexing

---

## 1. Where is youtube-transcript-api Used?

| File | Function | Purpose |
|------|----------|---------|
| `scripts/whisperx/fetch_lyrics.py` | `_fetch_youtube_captions()` | Fetch reference lyrics (plain text lines) for LLM line-splitting |
| `scripts/whisperx/fetch_lyrics.py` | `fetch_timed_captions()` | Fetch timed captions with start/duration for alignment |
| `scripts/whisperx/download.py` | `check_existing_captions()` | Pre-check if captions exist before running WhisperX |

---

## 2. How Transcripts Are Fetched

### API Call Pattern

```python
from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()
transcript = ytt_api.fetch(video_id, languages=lang_codes)
```

- **Video ID:** Must be the raw ID (e.g. `0th9_v-BbUI`), NOT the full URL.
- **URL parsing:** SongScript extracts ID via:
  - `url.split("v=")[1].split("&")[0]` for `?v=...`
  - `url.split("youtu.be/")[1].split("?")[0]` for short URLs

### Error Handling

- **Import:** Lazy import inside try/except; returns `None` if package not installed.
- **Fetch errors:** Broad `except Exception: return None` — no specific handling of `NoTranscriptFound`, `TranscriptsDisabled`, `VideoUnavailable`, etc.
- **Fallback (download.py only):** If target language fails, retries with `languages=["en"]`.

---

## 3. Return Format (API Data Structure)

### youtube-transcript-api v1.x

`fetch()` returns a **`FetchedTranscript`** object (iterable, list-like):

```python
# Iterable over FetchedTranscriptSnippet
for entry in transcript:
    text = entry.text      # str
    start = entry.start    # float (seconds)
    duration = entry.duration  # float (seconds)
```

### FetchedTranscriptSnippet (per segment)

| Field | Type | Description |
|-------|------|-------------|
| `text` | str | Transcript text (may contain newlines) |
| `start` | float | Timestamp when snippet appears (seconds) |
| `duration` | float | How long snippet stays on screen (seconds) — can overlap between snippets |

### Raw dict format (if needed)

```python
# Library provides:
raw = transcript.to_raw_data()
# → [{"text": "Hey there", "start": 0.0, "duration": 1.54}, ...]
```

### Sample structure (from SongScript usage)

```python
# What fetch_timed_captions returns after processing:
[
    {"text": "برای رقصیدن", "start": 12.5, "duration": 3.2},
    {"text": "برای فریاد زدن", "start": 15.8, "duration": 2.1},
    ...
]
```

---

## 4. Chunking / Splitting After Fetch

### In `_fetch_youtube_captions` (plain text)

1. **Per-entry:** `text.split("\n")` — splits newlines within each caption segment.
2. **Filtering:** Skips lines matching:
   - `[Music]`, `[Applause]`, `[موسیقی]`, `[تشویق]`, `[음악]`, `[박수]`, `[מוזיקה]`, `[موسيقى]`
   - Single-character lines (caption artifacts)
   - Empty lines
3. **Minimum:** Returns `None` if fewer than 3 lines.

### In `fetch_timed_captions` (timed)

- Filters `[Music]` and `[Applause]` only.
- No line splitting — keeps segments as returned.
- Minimum 3 entries to return.

### No semantic chunking

- No sentence/paragraph splitting for long-form content.
- For podcasts, Zikaron may want to add chunking by timestamp gaps or by token/sentence boundaries.

---

## 5. Caption Selection (Auto vs Manual, Language)

### Selection logic

- **API behavior:** `find_transcript(languages)` tries **manually created** first, then **auto-generated**.
- **SongScript:** Uses `languages=lang_codes` with a priority list.

### Language preference

```python
lang_codes = [language]
lang_map = {
    "fa": ["fa", "fa-IR"],
    "ko": ["ko", "ko-KR"],
    "ar": ["ar", "ar-SA"],
    "he": ["he", "iw"],
    "ja": ["ja"],
    "zh": ["zh", "zh-CN", "zh-TW"],
    "es": ["es", "es-ES", "es-MX", "es-419"]
}
if language in lang_map:
    lang_codes = lang_map[language]

transcript = ytt_api.fetch(video_id, languages=lang_codes)
```

- **Manual vs auto:** Not explicitly chosen; API prefers manual when available.
- **English fallback:** Only in `check_existing_captions` (download.py).

---

## 6. Rate Limiting and Retry Logic

### SongScript

- **None** — no retries, no rate limiting, no backoff.
- Errors are swallowed with `except Exception: return None`.

### youtube-transcript-api library

- **429 (IP blocked):** Library supports `ProxyConfig` with `retries_when_blocked` for retries.
- **Session:** Uses `requests.Session`; not thread-safe — one instance per thread.
- SongScript does **not** use ProxyConfig or custom retries.

### Recommendation for Zikaron

- Add retry with exponential backoff for transient failures.
- Consider ProxyConfig if indexing many videos (IP blocks possible).

---

## 7. Python Version / Venv Setup

| Item | Value |
|------|-------|
| Python | 3.10+ (per README) |
| Venv | `scripts/whisperx/venv` — `python3 -m venv venv` |
| No pyproject.toml | Dependencies only in `requirements.txt` |

---

## 8. youtube-transcript-api Version

```
youtube-transcript-api>=1.0.0
```

From `scripts/whisperx/requirements.txt` (line 34).

---

## 9. yt-dlp Usage

**Separate from transcript fetching.** yt-dlp is used for:

- **Audio download** — `yt-dlp -x --audio-format ...` for WhisperX input
- **Metadata** — `yt-dlp --dump-json --no-download` for title, duration, etc.

**Not used for captions.** Transcripts come only from youtube-transcript-api.

---

## 10. Pipeline Flow (pipeline.py)

```
Step 1: check_existing_captions(url, language)  ← youtube-transcript-api
Step 2: download_audio(url)                    ← yt-dlp
Step 3: separate_vocals()                      ← Demucs (optional)
Step 4: transcribe_audio()                     ← WhisperX
Step 4b: fetch_reference_lyrics()              ← YouTube captions OR Genius
        → split_lines_llm() with reference
Step 5: transliterate_batch()
Step 6: translate_batch()
Step 7: push_to_convex()
```

**Transcript role:** Reference lyrics for LLM line-splitting, not primary transcription. WhisperX does the main transcription; YouTube captions are a fallback/reference.

---

## 11. Exact Code Snippets

### Fetch plain text lines (fetch_lyrics.py)

```python
def _fetch_youtube_captions(video_id: str, language: str) -> Optional[List[str]]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        return None

    try:
        ytt_api = YouTubeTranscriptApi()
        lang_codes = [language]
        lang_map = {"fa": ["fa", "fa-IR"], "ko": ["ko", "ko-KR"], ...}
        if language in lang_map:
            lang_codes = lang_map[language]

        transcript = ytt_api.fetch(video_id, languages=lang_codes)

        lines = []
        for entry in transcript:
            text = entry.text.strip()
            skip_patterns = ["[Music]", "[Applause]", "[موسیقی]", ...]
            if text and not any(p in text for p in skip_patterns):
                for line in text.split("\n"):
                    line = line.strip()
                    if line and len(line) > 1:
                        lines.append(line)

        return lines if len(lines) >= 3 else None
    except Exception:
        return None
```

### Fetch timed captions (fetch_lyrics.py)

```python
def fetch_timed_captions(video_id: str, language: str) -> Optional[List[Dict[str, Any]]]:
    ytt_api = YouTubeTranscriptApi()
    transcript = ytt_api.fetch(video_id, languages=lang_codes)

    entries = []
    for entry in transcript:
        text = entry.text.strip()
        if text and text != "[Music]" and text != "[Applause]":
            entries.append({
                "text": text,
                "start": entry.start,
                "duration": entry.duration,
            })
    return entries if len(entries) >= 3 else None
```

### Check captions exist (download.py)

```python
def check_existing_captions(url: str, language: str = "fa") -> Optional[str]:
    video_id = url.split("v=")[1].split("&")[0]  # or youtu.be/...
    ytt_api = YouTubeTranscriptApi()
    try:
        return ytt_api.fetch(video_id, languages=lang_codes)
    except Exception:
        try:
            return ytt_api.fetch(video_id, languages=["en"])
        except Exception:
            return None
```

---

## 12. Gotchas and Workarounds

| Gotcha | Notes |
|--------|-------|
| **Video ID not URL** | Must extract ID; full URL will raise `InvalidVideoId` |
| **Silent failures** | Broad `except Exception` hides `NoTranscriptFound`, `TranscriptsDisabled`, etc. — consider logging |
| **download.py return type** | `check_existing_captions` returns raw `FetchedTranscript`, but the `__main__` print uses `captions[:500]` — assumes list-like; display logic is brittle |
| **Duration overlap** | `duration` is display time, not speech length; snippets can overlap |
| **No preserve_formatting** | SongScript doesn't use `preserve_formatting=True`; HTML tags are stripped by default |
| **Thread safety** | `YouTubeTranscriptApi` is not thread-safe; one instance per thread |
| **Cookie/consent** | Library handles EU consent; SongScript uses defaults |
| **IP blocking** | No ProxyConfig; heavy use may trigger blocks |

---

## 13. Minimal Reuse Template for Zikaron

```python
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id: str, languages: tuple = ("en",)) -> list[dict] | None:
    """Fetch timed transcript. video_id = raw ID, not URL."""
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=languages)
        return transcript.to_raw_data()
    except Exception:
        return None

# Usage:
# data = get_transcript("dQw4w9WgXcQ", languages=("en",))
# → [{"text": "...", "start": 0.0, "duration": 1.5}, ...]
```

---

*End of audit*
