#!/usr/bin/env python3
"""
NLP & Named Entity Recognition (NER) Prompt Sanitizer.
Strips irrelevant conversational add-ons and redacts personal information (PII)
before routing the customer's core question to the embedding encoder and AI router.
"""

import json
import re
import sys
import time
from typing import Any, Dict, List, Tuple


# NER patterns for personal / account identifiers that add noise and privacy risk
NER_PATTERNS: List[Tuple[str, re.Pattern[str], str]] = [
    (
        "EMAIL",
        re.compile(
            r"(?:\b(?:my\s+)?e-?mail\s*(?:is|:)?\s*)?\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
            re.IGNORECASE,
        ),
        "[EMAIL]",
    ),
    (
        "PHONE",
        re.compile(
            r"(?:\b(?:my\s+)?(?:phone|cell|mobile|tel)(?:\s+number)?\s*(?:is|:)?\s*)?(?<!\w)(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b",
            re.IGNORECASE,
        ),
        "[PHONE]",
    ),
    (
        "ORDER_ID",
        re.compile(
            r"\b(?:order|confirmation|tracking|acct|account)\s*(?:number|no\.?|id|#)?\s*[:#-]?\s*[A-Z0-9-]{4,16}\b"
            r"|#(?:LULU|ORD|TRK)?-?\d{4,12}\b",
            re.IGNORECASE,
        ),
        "[ORDER_ID]",
    ),
    (
        "PAYMENT_CARD",
        re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
        "[CARD]",
    ),
    (
        "STREET_ADDRESS",
        re.compile(
            r"\b\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\s+"
            r"(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\.?\b",
            re.IGNORECASE,
        ),
        "[ADDRESS]",
    ),
    (
        "PERSON_NAME",
        re.compile(
            r"\b(?:(?i:my\s+name\s+is|i\s+am|i'm|this\s+is))\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?=[,\.\!\?\s]|$)"
        ),
        "",
    ),
]

# Conversational filler add-ons that inflate word count without changing product intent
FILLER_ADDONS: List[Tuple[str, re.Pattern[str]]] = [
    (
        "GREETING",
        re.compile(
            r"^\s*(?:hi|hello|hey(?:\s+there)?|good\s+(?:morning|afternoon|evening)|yo|sup)\b[!,.\s-]*",
            re.IGNORECASE,
        ),
    ),
    (
        "PLEASANTRY",
        re.compile(
            r"\b(?:hope\s+you(?:'re|\s+are)\s+(?:having\s+a\s+great|doing\s+well)\s*(?:day|week)?|"
            r"how\s+are\s+you(?:\s+doing)?|"
            r"just\s+(?:wondering|curious|wanted\s+to\s+ask)\s*(?:real\s+quick)?|"
            r"quick\s+question\s*(?:for\s+you)?|"
            r"sorry\s+to\s+bother\s+you)\b[!,.\s-]*",
            re.IGNORECASE,
        ),
    ),
    (
        "SIGN_OFF",
        re.compile(
            r"[!,.\s-]*(?:thanks\s*(?:so\s+much|a\s+lot|in\s+advance)?|"
            r"thank\s+you(?:\s+so\s+much)?|"
            r"please\s+and\s+thank\s+you|"
            r"best|sincerely|cheers|xoxo)\b[!,.\s]*$",
            re.IGNORECASE,
        ),
    ),
]


def tokenize_words(text: str) -> List[str]:
    return [tok for tok in re.findall(r"[A-Za-z0-9'\"-]+", text) if tok]


def sanitize_prompt(raw_prompt: str) -> Dict[str, Any]:
    start = time.perf_counter()
    working = raw_prompt.strip()
    extracted_entities: List[Dict[str, str]] = []

    # 1. Run Named Entity Recognition (NER) & strip personal identifiers
    for entity_type, pattern, _placeholder in NER_PATTERNS:
        for match in pattern.finditer(working):
            matched_text = match.group(1) if entity_type == "PERSON_NAME" and match.lastindex else match.group(0)
            extracted_entities.append(
                {
                    "entityType": entity_type,
                    "text": matched_text.strip(),
                    "action": "stripped",
                }
            )
        working = pattern.sub(" ", working)

    # Remove leftover intro connector phrases like "my email is", "my order is", "reach me at"
    working = re.sub(
        r"\b(?:my\s+(?:email|phone(?:\s+number)?|number|address|order(?:\s+number)?)\s+is|"
        r"email\s*:|phone\s*:|order\s*:|reach\s+me\s+at|you\s+can\s+call\s+me\s+at)\b[,\s:-]*",
        " ",
        working,
        flags=re.IGNORECASE,
    )

    # 2. Strip irrelevant conversational filler add-ons
    for addon_type, pattern in FILLER_ADDONS:
        for match in pattern.finditer(working):
            snippet = match.group(0).strip(" ,.-!?")
            if snippet:
                extracted_entities.append(
                    {
                        "entityType": addon_type,
                        "text": snippet,
                        "action": "stripped",
                    }
                )
        working = pattern.sub(" ", working)

    # 3. Normalize whitespace and punctuation artifacts left after stripping
    cleaned = re.sub(r"\s*[—–-]+\s*", " ", working)
    cleaned = re.sub(r"\s+([,?!.])", r"\1", cleaned)
    cleaned = re.sub(r"^[,;:\s.-]+", "", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()

    # Fallback: if the user ONLY sent a greeting or PII, keep original trimmed text so model can respond politely
    if not cleaned:
        cleaned = raw_prompt.strip()

    orig_tokens = tokenize_words(raw_prompt)
    clean_tokens = tokenize_words(cleaned)

    orig_count = len(orig_tokens)
    clean_count = len(clean_tokens)
    reduction_pct = (
        max(0, round(((orig_count - clean_count) / orig_count) * 100))
        if orig_count > 0
        else 0
    )

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    return {
        "originalPrompt": raw_prompt.strip(),
        "cleanedPrompt": cleaned,
        "extractedEntities": extracted_entities,
        "originalWordCount": orig_count,
        "cleanedWordCount": clean_count,
        "wordsStripped": max(0, orig_count - clean_count),
        "tokenReductionPct": reduction_pct,
        "latencyMs": elapsed_ms,
    }


def main() -> None:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        payload = {"prompt": raw}

    prompt_text = str(payload.get("prompt", ""))
    result = sanitize_prompt(prompt_text)
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
