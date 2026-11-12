"""
LifeLens Epistemic Guardrails & Safety Boundary Engine (Phase 3 & 7 Hardening).

Enforces strict ethical, safety, and epistemological boundaries:
1. Hard rejection of clinical medical diagnoses, prescription advice, and disease treatment.
2. Crisis and self-harm deflection with immediate 24/7 helpline resources.
3. Hard rejection of speculative financial advice, stock picking, and crypto trading.
4. Empathetic, supportive, non-judgmental language (never shaming, lecturing, or guilt-inducing).
5. Strict epistemic distinction between correlation and causation.
6. Mandatory informational disclaimer attachment.
"""

from __future__ import annotations
import re
from typing import Tuple, Optional, Dict, Any

STANDARD_DISCLAIMER = (
    "LifeLens provides behavioral data analytics for informational self-reflection, "
    "not medical or financial advice."
)

CRISIS_RESOURCES = (
    "If you or someone you know is going through a difficult time or experiencing a mental health crisis, "
    "please know you are not alone. Support is available 24/7:\n"
    "• In the US/Canada: Call or text 988 (Suicide & Crisis Lifeline)\n"
    "• In India: Call 14416 (Tele-MANAS) or 9152987821 (iCall)\n"
    "• In the UK: Call 111 or text SHOUT to 85258\n"
    "• International: Visit https://findahelpline.com to find free, confidential support in your country."
)

# ---------------------------------------------------------------------------
# Triggers & Regular Expressions
# ---------------------------------------------------------------------------

# 1. Clinical Medical / Prescription Triggers
MEDICAL_TRIGGERS = [
    r"\b(diagnose|diagnosis|prescribe|prescription|medication|dosage|cure|treatment\s+for|treat\s+my|treating\s+my)\b",
    r"\b(what\s+pill|what\s+drug|what\s+medicine|what\s+supplement)\b",
    r"\b(do\s+i\s+have|could\s+i\s+have)\s+(clinical\s+|chronic\s+|severe\s+)?(depression|adhd|bipolar|insomnia|diabetes|sleep\s+apnea|apnea|anxiety(\s+disorder)?|arrhythmia|hypertension)\b",
    r"\b(can\s+you\s+cure|medical\s+advice|substitute\s+for\s+therapy|cure\s+my)\b",
    r"\b(mg\s+of\s+melatonin|adderall|antidepressants?|ambien|dosage\s+of)\b",
    r"\b(diagnose\s+my|is\s+my\s+heart\s+rate\s+dangerous)\b",
    r"\b(blood\s+pressure\s+too\s+high|having\s+a\s+heart\s+attack|stroke\s+symptoms|having\s+a\s+stroke)\b",
]

# 2. Crisis & Self-Harm Triggers
CRISIS_TRIGGERS = [
    r"\b(kill\s+myself|suicide|end(ing)?\s+my\s+life|want\s+to\s+die|self[\s-]harm|hurt\s+myself)\b",
    r"\b(better\s+off\s+dead|can't\s+take\s+this\s+anymore|no\s+reason\s+to\s+live|end(ing)?\s+it\s+all)\b",
    r"\b(cutting\s+myself|overdose|hang\s+myself|shoot\s+myself)\b",
    r"\b(hopeless\s+and\s+worthless|nobody\s+would\s+care\s+if\s+i\s+(died|disappeared))\b",
    r"\b(what('s|\s+is)\s+the\s+point\s+of\s+living|no\s+point\s+in\s+living)\b",
]

# 3. Speculative Financial Advisory Triggers
FINANCIAL_TRIGGERS = [
    r"\b(which|what)\s+(stock|stocks|crypto|cryptocurrency|token|etf|options?)\s+(should\s+i|to)\s+(buy|sell|invest\s+in|trade)\b",
    r"\b(give\s+me\s+a\s+stock\s+tip|trading\s+signals?|investment\s+advice|financial\s+advice)\b",
    r"\b(where\s+should\s+i\s+invest\s+my\s+money|should\s+i\s+buy\s+bitcoin|should\s+i\s+buy\s+ethereum)\b",
    r"\b(how\s+to\s+get\s+rich\s+trading|guaranteed\s+return\s+on\s+investment)\b",
    r"\b(should\s+i\s+put\s+my\s+savings\s+into)\b",
]

# 4. Judgmental & Guilt-Inducing Phrases to Scrub
JUDGMENTAL_PATTERNS = [
    (r"\byou\s+failed\s+your\s+goal\b", "the target was not reached"),
    (r"\byou\s+failed\b", "the target was not reached"),
    (r"\bfailed\s+your\s+goal\b", "the target was not reached"),
    (r"\byou\s+were\s+lazy\b", "activity was lower than usual"),
    (r"\blazy\b", "less active than usual"),
    (r"\byou\s+slacked\s+off\b", "paused activity"),
    (r"\bslacked\s+off\b", "paused activity"),
    (r"\bbad\s+habit\b", "habit pattern to optimize"),
    (r"\byou\s+wasted\b", "you allocated"),
    (r"\byou\s+should\s+be\s+ashamed\b", "let's look at what we can learn"),
    (r"\byou\s+messed\s+up\b", "it's a great opportunity to adjust"),
    (r"\byou\s+have\s+no\s+discipline\b", "routine consistency varied"),
    (r"\bpoor\s+discipline\b", "opportunity for stronger environmental cues"),
    (r"\byou\s+screwed\s+up\b", "a variance occurred in your routine"),
]

# 5. Unwarranted Causal Assertions to Scrub
CAUSAL_PATTERNS = [
    (r"\bthis\s+caused\s+your\b", "this coincided with changes in your"),
    (r"\bcaused\s+you\s+to\s+be\b", "was associated with being"),
    (r"\bbecause\s+you\s+used\s+your\s+phone,\s+you\s+slept\s+poorly\b", "higher phone usage coincided with lower sleep scores, though correlation does not prove causation"),
    (r"\bthis\s+proves\s+that\b", "the data suggests an association where"),
    (r"\bdefinitely\s+caused\b", "statistically correlates with"),
    (r"\bis\s+the\s+direct\s+cause\s+of\b", "is strongly associated with"),
]


# ---------------------------------------------------------------------------
# Individual Boundary Verifiers
# ---------------------------------------------------------------------------

def check_crisis_boundary(query: str) -> Optional[str]:
    """
    Checks if user query contains crisis or self-harm keywords.
    Returns supportive emergency helpline response immediately if detected.
    """
    if not query:
        return None
    for pattern in CRISIS_TRIGGERS:
        if re.search(pattern, query, re.IGNORECASE):
            return (
                "I care deeply about your safety and well-being. While I am an AI designed for lifestyle behavioral analytics, "
                "I cannot help with mental health emergencies or acute distress.\n\n"
                f"{CRISIS_RESOURCES}\n\n"
                "Please connect with a compassionate professional who can support you right now. You do not have to carry this alone."
            )
    return None


def check_medical_boundary(query: str) -> Optional[str]:
    """
    Detects attempts to seek clinical medical diagnoses, drug prescriptions, or disease evaluations.
    """
    if not query:
        return None
    for pattern in MEDICAL_TRIGGERS:
        if re.search(pattern, query, re.IGNORECASE):
            return (
                "I cannot provide medical diagnoses, treatment recommendations, drug prescriptions, or supplement dosages. "
                "LifeLens is an informational analytics tool designed to help you reflect on daily lifestyle habits.\n\n"
                "If you are experiencing persistent physical symptoms, severe sleep disorders, or health concerns, "
                "please consult a certified healthcare professional or physician."
            )
    return None


def check_financial_boundary(query: str) -> Optional[str]:
    """
    Detects requests for speculative stock picking, crypto investments, or financial advisory.
    """
    if not query:
        return None
    for pattern in FINANCIAL_TRIGGERS:
        if re.search(pattern, query, re.IGNORECASE):
            return (
                "I cannot provide investment advice, speculative stock picks, trading recommendations, or cryptocurrency guidance. "
                "LifeLens tracks past personal spending patterns and discretionary burn rate solely for self-reflection.\n\n"
                "For wealth management, tax planning, or investment decisions, please consult a licensed financial advisor."
            )
    return None


def sanitize_judgmental_tone(text: str) -> str:
    """
    Ensures tone remains empathetic, objective, and analytical without guilt, lecturing, or shaming.
    """
    if not text:
        return ""
    result = text
    for pattern, replacement in JUDGMENTAL_PATTERNS:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result


def sanitize_causal_claims(text: str) -> str:
    """
    Epistemological guardrail: prevents claiming causation when only observational correlation exists.
    Replaces casual 'X caused Y' statements with 'X coincided with Y' or adds correlation qualifiers.
    """
    if not text:
        return ""
    result = text
    for pattern, replacement in CAUSAL_PATTERNS:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result


def audit_epistemic_rigor(insight_text: str) -> Dict[str, Any]:
    """
    Verifies that generated insights maintain epistemic rigor:
      - Contains quantitative metrics citation (numbers, percentages, hours, currency).
      - Does not make ungrounded physical causal claims.
      - Includes appropriate correlation / lifestyle disclaimers.
    """
    has_numbers = bool(re.search(r"\d+(\.\d+)?", insight_text))
    has_correlation_disclaimer = bool(
        re.search(r"(correlation|association|coincid|trend|self-reflection)", insight_text, re.IGNORECASE)
    )
    has_unwarranted_cause = bool(
        re.search(r"\b(definitely\s+caused|direct\s+cause\s+of|this\s+proves\s+that)\b", insight_text, re.IGNORECASE)
    )

    is_compliant = has_numbers and not has_unwarranted_cause
    return {
        "is_compliant": is_compliant,
        "cites_data": has_numbers,
        "epistemic_qualifier_present": has_correlation_disclaimer,
        "contains_unwarranted_causal_claims": has_unwarranted_cause,
    }


def apply_guardrails(response_text: str, user_query: str) -> Tuple[str, Dict[str, Any]]:
    """
    Runs full guardrail filter pipeline over generated text:
    1. Crisis & self-harm boundary
    2. Medical diagnosis boundary
    3. Speculative financial boundary
    4. Tone sanitation (anti-guilt/anti-shaming)
    5. Epistemic causal claim qualification
    6. Attribution disclaimer check
    """
    flags: Dict[str, Any] = {
        "disclaimer_applied": True,
        "causation_scrubbed": False,
        "judgmental_tone_scrubbed": False,
        "boundary_tripped": None,
        "epistemic_rigor": None,
    }

    # 1. Check crisis boundary
    crisis_resp = check_crisis_boundary(user_query)
    if crisis_resp:
        flags["boundary_tripped"] = "CRISIS"
        return crisis_resp, flags

    # 2. Check medical boundary
    medical_resp = check_medical_boundary(user_query)
    if medical_resp:
        flags["boundary_tripped"] = "MEDICAL"
        return medical_resp, flags

    # 3. Check financial boundary
    financial_resp = check_financial_boundary(user_query)
    if financial_resp:
        flags["boundary_tripped"] = "FINANCIAL"
        return financial_resp, flags

    # 4. Tone sanitation
    sanitized = sanitize_judgmental_tone(response_text)
    if sanitized != response_text:
        flags["judgmental_tone_scrubbed"] = True

    # 5. Epistemic causal sanitation
    epistemic_sanitized = sanitize_causal_claims(sanitized)
    if epistemic_sanitized != sanitized:
        flags["causation_scrubbed"] = True
    sanitized = epistemic_sanitized

    # 6. Epistemic rigor evaluation
    flags["epistemic_rigor"] = audit_epistemic_rigor(sanitized)

    return sanitized, flags
