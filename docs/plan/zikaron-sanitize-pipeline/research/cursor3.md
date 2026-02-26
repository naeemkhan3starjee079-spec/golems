
# Production-Quality PII Sanitization Patterns in Python

Here are typed, production-oriented patterns for PII sanitization, suitable for large-scale text processing (e.g., 250K chunks).

## 1. Regex patterns for common PII types

```python
"""PII regex patterns — compiled once for performance."""
import re
from dataclasses import dataclass
from typing import Pattern

# Compile once at module load (critical for 250K chunks)
EMAIL_RE = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    re.IGNORECASE
)
# International: E.164-ish, common formats
PHONE_RE = re.compile(
    r'\b(?:\+?[1-9]\d{0,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}(?:[-.\s]?\d{2,4})?\b'
    r'|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
    re.VERBOSE
)
IPV4_RE = re.compile(
    r'\b(?:(?:25[0-5]|2[0-4]\d|1?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|1?\d\d?)\b'
)
IPV6_RE = re.compile(
    r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b'
    r'|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b'
    r'|\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b',
    re.VERBOSE
)
# JWT: header.payload.signature (base64url)
JWT_RE = re.compile(
    r'\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b'
)
# Unix/Windows paths with username segments
FILE_PATH_RE = re.compile(
    r'\b(?:/Users?|/home|~|C:\\Users)\s*/[^\s\'"<>|*?]+\b'
    r'|\b/home/[a-zA-Z0-9_-]+/[^\s\'"<>|*?]+\b',
    re.IGNORECASE
)
# 1Password references
ONEPASSWORD_RE = re.compile(
    r'\bop://[^\s\'"<>]+\b',
    re.IGNORECASE
)


@dataclass(frozen=True)
class PIIPattern:
    name: str
    pattern: Pattern[str]
    placeholder: str


PII_PATTERNS: tuple[PIIPattern, ...] = (
    PIIPattern("email", EMAIL_RE, "[EMAIL_REDACTED]"),
    PIIPattern("phone", PHONE_RE, "[PHONE_REDACTED]"),
    PIIPattern("ipv4", IPV4_RE, "[IP_REDACTED]"),
    PIIPattern("ipv6", IPV6_RE, "[IP_REDACTED]"),
    PIIPattern("jwt", JWT_RE, "[JWT_REDACTED]"),
    PIIPattern("file_path", FILE_PATH_RE, "[PATH_REDACTED]"),
    PIIPattern("onepassword", ONEPASSWORD_RE, "[OP_REF_REDACTED]"),
)


def sanitize_regex(text: str) -> str:
    result = text
    for pii in PII_PATTERNS:
        result = pii.pattern.sub(pii.placeholder, result)
    return result
```

## 2. spaCy NER with consistent pseudonyms

```python
"""spaCy NER + consistent pseudonym mapping across documents."""
from dataclasses import dataclass
from typing import ClassVar
import spacy
from spacy.tokens import Doc, Span

# Load once (expensive)
_nlp: spacy.Language | None = None


def get_nlp() -> spacy.Language:
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm", exclude=["parser"])  # faster
    return _nlp


@dataclass
class PersonPseudonymizer:
    """Maps real names → consistent placeholders. Thread-safe for batch processing."""
    prefix: str = "PERSON_"
    mapping: dict[str, str] | None = None
    _counter: ClassVar[int] = 0

    def __post_init__(self) -> None:
        self.mapping = self.mapping or {}
        self._local_counter = 0

    def _get_or_create_pseudonym(self, name: str) -> str:
        normalized = name.strip()
        if not normalized:
            return ""
        key = normalized.lower()
        if key not in self.mapping:
            self._local_counter += 1
            self.mapping[key] = f"{self.prefix}{self._local_counter}"
        return self.mapping[key]

    def replace_persons(self, text: str, nlp: spacy.Language | None = None) -> str:
        nlp = nlp or get_nlp()
        doc = nlp(text)
        if not doc.ents:
            return text
        # Sort by start (desc) so replacements don't shift offsets
        sorted_ents = sorted(
            [e for e in doc.ents if e.label_ == "PERSON"],
            key=lambda e: e.start_char,
            reverse=True
        )
        result = list(text)
        for ent in sorted_ents:
            pseudonym = self._get_or_create_pseudonym(ent.text)
            result[ent.start_char:ent.end_char] = pseudonym
        return "".join(result)

    def get_mapping(self) -> dict[str, str]:
        return dict(self.mapping or {})
```

## 3. Name dictionary with efficient matching

```python
"""Efficient name dictionary: known names, partial/case handling."""
from dataclasses import dataclass
from typing import Iterable
import re

@dataclass
class NameDictionary:
    """Trie-like lookup for known names. Handles case, partials, first-name-only."""
    names: set[str]
    _lower_to_canonical: dict[str, str]  # lower → canonical for replacement
    _first_names: set[str]  # first names that appear alone
    _compiled: re.Pattern[str] | None = None

    @classmethod
    def from_names(cls, names: Iterable[str]) -> "NameDictionary":
        names_list = [n.strip() for n in names if n.strip()]
        lower_to_canonical: dict[str, str] = {}
        first_names: set[str] = set()
        for full in names_list:
            lower = full.lower()
            lower_to_canonical[lower] = full
            parts = full.split()
            if parts:
                first = parts[0].lower()
                lower_to_canonical[first] = lower_to_canonical.get(first, full)
                first_names.add(first)
        # Build regex: \b(?:name1|name2|...)\b — word boundaries
        escaped = sorted(
            (re.escape(n) for n in lower_to_canonical),
            key=len,
            reverse=True  # longer first to avoid partial matches
        )
        pattern = r"\b(?:" + "|".join(escaped) + r")\b"
        inst = cls(
            names=set(names_list),
            _lower_to_canonical=lower_to_canonical,
            _first_names=first_names,
        )
        inst._compiled = re.compile(pattern, re.IGNORECASE)
        return inst

    def replace(self, text: str, placeholder: str = "[NAME_REDACTED]") -> str:
        if not self._compiled:
            return text

        def repl(m: re.Match[str]) -> str:
            return placeholder
        return self._compiled.sub(repl, text)
```

## 4. Hebrew name handling (nicknames, partials)

```python
"""Hebrew name handling: known list + nickname/partial variants."""
from dataclasses import dataclass
from typing import Iterable
import re
import unicodedata

def _normalize_hebrew(s: str) -> str:
    """Normalize for matching: strip nikud, normalize alef-bet."""
    # Remove nikud (vowel points) — range U+0591–U+05C7
    no_nikud = "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    return unicodedata.normalize("NFKC", no_nikud).strip()


@dataclass
class HebrewNameMatcher:
    """Known Hebrew names + common nicknames/partials. RTL-aware."""
    canonical_names: set[str]
    # Maps: normalized_form -> canonical (for consistent placeholder)
    _norm_to_canonical: dict[str, str]
    _patterns: list[tuple[re.Pattern[str], str]]  # (pattern, canonical)

    @classmethod
    def from_names(
        cls,
        names: Iterable[str],
        nickname_map: dict[str, str] | None = None,
    ) -> "HebrewNameMatcher":
        nickname_map = nickname_map or {}
        canonical = set()
        norm_to_canonical: dict[str, str] = {}
        for n in names:
            n = n.strip()
            if not n:
                continue
            canonical.add(n)
            norm = _normalize_hebrew(n)
            norm_to_canonical[norm] = n
            # Nickname → canonical
            for nick, canon in nickname_map.items():
                if canon == n:
                    norm_nick = _normalize_hebrew(nick)
                    norm_to_canonical[norm_nick] = n
            # First word only (partial)
            parts = n.split()
            if parts:
                first_norm = _normalize_hebrew(parts[0])
                norm_to_canonical[first_norm] = n
        # Build patterns — escape Hebrew, use word boundaries
        patterns: list[tuple[re.Pattern[str], str]] = []
        seen: set[str] = set()
        for norm, canon in norm_to_canonical.items():
            if norm in seen:
                continue
            seen.add(norm)
            # Hebrew word boundary: use \b or explicit space/punctuation
            pat = re.compile(r"(?<![^\s\W])" + re.escape(norm) + r"(?![^\s\W])")
            patterns.append((pat, canon))
        return cls(
            canonical_names=canonical,
            _norm_to_canonical=norm_to_canonical,
            _patterns=patterns,
        )

    def replace(self, text: str, placeholder: str = "[NAME_REDACTED]") -> str:
        result = text
        for pat, _ in self._patterns:
            result = pat.sub(placeholder, result)
        return result
```

## 5. Reversible sanitization with mapping file

```python
"""Reversible PII sanitization with mapping persistence."""
from dataclasses import dataclass, field
from pathlib import Path
import json
import hashlib
from typing import Any
from datetime import datetime

@dataclass
class SanitizationMapping:
    """Persistent mapping for de-sanitization. Append-safe for batch processing."""
    version: str = "1.0"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    # token_id -> original_value (for placeholders like EMAIL_abc123)
    token_to_original: dict[str, str] = field(default_factory=dict)
    # For names: placeholder -> list of originals (if 1:many)
    placeholder_to_originals: dict[str, list[str]] = field(default_factory=dict)

    def add_mapping(self, placeholder: str, original: str) -> None:
        if placeholder not in self.placeholder_to_originals:
            self.placeholder_to_originals[placeholder] = []
        if original not in self.placeholder_to_originals[placeholder]:
            self.placeholder_to_originals[placeholder].append(original)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "version": self.version,
                    "created_at": self.created_at,
                    "token_to_original": self.token_to_original,
                    "placeholder_to_originals": self.placeholder_to_originals,
                },
                f,
                ensure_ascii=False,
                indent=2,
            )

    @classmethod
    def load(cls, path: Path) -> "SanitizationMapping":
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        m = cls(
            version=data.get("version", "1.0"),
            created_at=data.get("created_at", ""),
        )
        m.token_to_original = data.get("token_to_original", {})
        m.placeholder_to_originals = data.get("placeholder_to_originals", {})
        return m


def _stable_id(value: str, prefix: str) -> str:
    """Deterministic placeholder for reversible redaction."""
    h = hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]
    return f"{prefix}_{h}"


def reversible_sanitize_email(text: str, mapping: SanitizationMapping) -> str:
    """Replace emails with reversible placeholders; record mapping."""
    for m in EMAIL_RE.finditer(text):
        orig = m.group(0)
        placeholder = _stable_id(orig, "EMAIL")
        mapping.token_to_original[placeholder] = orig
        text = text[: m.start()] + placeholder + text[m.end() :]
    return text
```

## 6. Unified pipeline for 250K chunks

```python
"""Unified PII sanitization pipeline — optimized for 250K chunks."""
from dataclasses import dataclass
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import multiprocessing
from typing import Iterator

@dataclass
class SanitizerConfig:
    use_regex: bool = True
    use_spacy_person: bool = False  # slower
    use_name_dict: bool = False
    name_list: list[str] | None = None
    use_hebrew_matcher: bool = False
    hebrew_names: list[str] | None = None
    reversible: bool = False
    mapping_path: Path | None = None


class PIIPipeline:
    def __init__(self, config: SanitizerConfig) -> None:
        self.config = config
        self._person_pseudo: PersonPseudonymizer | None = None
        self._name_dict: NameDictionary | None = None
        self._hebrew_matcher: HebrewNameMatcher | None = None
        self._mapping: SanitizationMapping | None = None
        self._init_components()

    def _init_components(self) -> None:
        if self.config.use_spacy_person:
            self._person_pseudo = PersonPseudonymizer()
        if self.config.use_name_dict and self.config.name_list:
            self._name_dict = NameDictionary.from_names(self.config.name_list)
        if self.config.use_hebrew_matcher and self.config.hebrew_names:
            self._hebrew_matcher = HebrewNameMatcher.from_names(
                self.config.hebrew_names
            )
        if self.config.reversible and self.config.mapping_path:
            if self.config.mapping_path.exists():
                self._mapping = SanitizationMapping.load(self.config.mapping_path)
            else:
                self._mapping = SanitizationMapping()

    def sanitize(self, text: str) -> str:
        if not text:
            return text
        if self.config.use_regex:
            text = sanitize_regex(text)
        if self._name_dict:
            text = self._name_dict.replace(text)
        if self._hebrew_matcher:
            text = self._hebrew_matcher.replace(text)
        if self._person_pseudo:
            text = self._person_pseudo.replace_persons(text)
        return text

    def process_batch(
        self,
        chunks: Iterator[str],
        *,
        max_workers: int | None = None,
    ) -> Iterator[str]:
        workers = max_workers or min(32, (multiprocessing.cpu_count() or 4) + 4)
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {ex.submit(self.sanitize, c): c for c in chunks}
            for fut in as_completed(futures):
                yield fut.result()

    def save_mapping(self) -> None:
        if self._mapping and self.config.mapping_path:
            self._mapping.save(self.config.mapping_path)
```

## Performance notes for 250K chunks

| Technique | Recommendation |
|-----------|-----------------|
| **Regex** | Compile patterns once at module/class init |
| **spaCy** | Load model once; use `exclude=["parser"]` if you only need NER |
| **Name dict** | Precompile regex; sort patterns by length (longest first) |
| **Batch** | Use `ThreadPoolExecutor` for I/O-bound; `ProcessPoolExecutor` if CPU-bound |
| **Memory** | Stream chunks; avoid loading all 250K into memory |
| **Hebrew** | Normalize nikud once per name; cache compiled patterns |

If you want, this can be turned into a small module under `zikaron` (e.g. `pipeline/pii_sanitizer.py`) and wired into your enrichment pipeline.
