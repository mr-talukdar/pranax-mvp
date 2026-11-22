"""Guarded conversational answers over explicitly supplied studio aggregates."""

from __future__ import annotations

import json
import logging
import os
import re
from collections.abc import Callable
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .contracts import (
    AssistantAnalytics,
    AssistantAnswerOutput,
    AssistantEvidence,
    AssistantMode,
    AssistantOperation,
    AssistantOperationInput,
    AssistantRouteInput,
    AssistantRoutingOutput,
    AssistantScope,
    AssistantSuggestion,
    AssistantSuggestionsInput,
    AssistantSuggestionsOutput,
)

logger = logging.getLogger(__name__)

_GEMINI_MODEL = "gemini-2.5-flash"
_GEMINI_TIMEOUT_SECONDS = 8
_GEMINI_RESPONSE_LIMIT = 512_000

_OPERATION_QUESTIONS = {
    AssistantOperation.ATTENDANCE_SUMMARY: (
        "How has attendance changed over the last 14 days?"
    ),
    AssistantOperation.MEMBERSHIP_SUMMARY: (
        "Which membership statuses need attention in my studio?"
    ),
    AssistantOperation.RETENTION_SUMMARY: (
        "What is the retention risk picture at my studio?"
    ),
    AssistantOperation.STUDIO_OVERVIEW: "How is my studio doing right now?",
}

_SUGGESTION_INSTRUCTION = """You select suggested questions for a fitness studio using
aggregate analytics. Choose one to three operation IDs from the supplied candidate
list, prioritizing issues shown by the studio's values. Do not invent IDs, questions,
metrics, or facts. Return JSON with exactly this field:
{\"operations\": [<candidate operation IDs>]}."""

_ANSWER_INSTRUCTION = """Answer the approved read-only analytics operation using only its
supplied evidence. The evidence is already scoped to this studio. Do not infer
individual people, causes, forecasts, revenue, bookings, or advice. Do not invent
numbers. If evidence is limited, say so plainly. Keep the answer to four short
sentences or fewer and include evidence IDs from the supplied list. Return JSON with
exactly these fields: {\"answer\": <plain text>, \"evidenceIds\": [<IDs used>]}."""

_MUTATION_OR_PERSON_QUERY = re.compile(
    r"\b(?:add|create|update|edit|delete|remove|cancel|pause|resume|renew|"
    r"book|schedule|charge|refund|pay|message|email|phone|contact|who|"
    r"names?|individuals?|which\s+members?|what\s+members?|"
    r"(?:show|list|find)\s+(?:me\s+)?members?|"
    r"member\s+(?:profiles?|list)|top\s+(?:high[- ]?risk\s+)?members?)\b"
)
_RECORD_MUTATION_QUERY = re.compile(
    r"\b(?:record|enter|log|mark)\s+(?:an?\s+)?"
    r"(?:attendance|check[ -]?in|membership)\b|"
    r"\b(?:change|switch|set)\s+(?:the\s+)?"
    r"(?:membership|pass|member)\s+status\b"
)
_ADVICE_QUERY = re.compile(
    r"\b(?:how\s+(?:do|can)\s+i|what\s+should\s+i|give\s+me\s+(?:advice|tips)|"
    r"strategy|recommend(?:ation)?s?\s+for|ideas\s+for)\b"
)
_FOLLOW_UP = re.compile(
    r"^(?:why\??|how so\??|tell me more\.?|explain(?: that)?\.?|"
    r"what about it\??|can you clarify\??)$",
    re.IGNORECASE,
)
_OUT_OF_SCOPE_MESSAGE = (
    "I can answer aggregate questions about this studio's attendance, membership "
    "status, retention priorities, and overview. I can't answer general questions, "
    "identify individual members, or change records. Try one of the suggested questions."
)


def _call_gemini_json(
    *, stage: str, instruction: str, payload: dict[str, Any]
) -> dict[str, Any] | None:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    request_body = {
        "systemInstruction": {"parts": [{"text": instruction}]},
        "contents": [{"role": "user", "parts": [{"text": json.dumps(payload)}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
        },
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_GEMINI_MODEL}:generateContent?{urlencode({'key': api_key})}"
    )
    request = Request(
        url,
        data=json.dumps(request_body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=_GEMINI_TIMEOUT_SECONDS) as response:
            response_body = response.read(_GEMINI_RESPONSE_LIMIT + 1)
    except HTTPError as error:
        logger.warning(
            "Gemini assistant request failed",
            extra={"stage": stage, "http_status": error.code},
        )
        return None
    except (URLError, TimeoutError, OSError):
        logger.warning("Gemini assistant request unavailable", extra={"stage": stage})
        return None

    if len(response_body) > _GEMINI_RESPONSE_LIMIT:
        logger.warning(
            "Gemini assistant response exceeded limit", extra={"stage": stage}
        )
        return None

    try:
        decoded = json.loads(response_body)
        candidate = decoded["candidates"][0]
        parts = candidate["content"]["parts"]
        text = next(part["text"] for part in parts if isinstance(part.get("text"), str))
        result = json.loads(text)
    except (
        AttributeError,
        KeyError,
        IndexError,
        TypeError,
        StopIteration,
        json.JSONDecodeError,
    ):
        logger.warning("Gemini assistant response was invalid", extra={"stage": stage})
        return None
    return result if isinstance(result, dict) else None


def _operation_for_question(question: str) -> AssistantOperation | None:
    normalized = question.casefold()
    if (
        _MUTATION_OR_PERSON_QUERY.search(normalized)
        or _RECORD_MUTATION_QUERY.search(normalized)
        or _ADVICE_QUERY.search(normalized)
    ):
        return None

    if re.search(r"\b(attendance|check[ -]?ins?|visits?)\b", normalized):
        return AssistantOperation.ATTENDANCE_SUMMARY
    if re.search(r"\b(retention|risk|triage|churn)\b", normalized):
        return AssistantOperation.RETENTION_SUMMARY
    if re.search(
        r"\b(memberships?|renewals?|expir(?:y|ation|ing)|expired|paused|"
        r"active\s+passes?)\b",
        normalized,
    ):
        return AssistantOperation.MEMBERSHIP_SUMMARY
    if re.search(r"\b(studio|business|overall)\b", normalized) and re.search(
        r"\b(overview|summary|doing|performance|health|numbers?)\b", normalized
    ):
        return AssistantOperation.STUDIO_OVERVIEW
    if re.search(r"\b(members?|registrations?)\b", normalized) and re.search(
        r"\b(how\s+many|count|total|new|registered|active)\b", normalized
    ):
        return AssistantOperation.STUDIO_OVERVIEW
    return None


def _route_question(request: AssistantRouteInput) -> AssistantOperation | None:
    operation = _operation_for_question(request.question)
    if operation is not None:
        return operation
    if not _FOLLOW_UP.fullmatch(request.question.strip()):
        return None
    for message in reversed(request.history):
        if message.role == "user":
            return _operation_for_question(message.content)
    return None


def _evidence(identifier: str, label: str, value: object) -> AssistantEvidence:
    return AssistantEvidence(id=identifier, label=label, value=str(value))


def _attendance_evidence(
    analytics: AssistantAnalytics,
) -> tuple[AssistantEvidence, ...]:
    recent = analytics.attendance_trends[-7:]
    previous = analytics.attendance_trends[-14:-7]
    recent_count = sum(point.count for point in recent)
    previous_count = sum(point.count for point in previous)
    if len(previous) == 7 and previous_count > 0:
        change_percent = round((recent_count - previous_count) / previous_count * 100)
        change = f"{change_percent:+d}% vs previous 7 days"
    elif len(previous) == 7 and recent_count == 0:
        change = "0 visits in both 7-day periods"
    else:
        change = "comparison unavailable; previous 7-day data is incomplete"

    return (
        _evidence(
            "attendance_recent_7d",
            "Recorded check-ins, last 7 days",
            f"{recent_count} visits",
        ),
        _evidence(
            "attendance_previous_7d",
            "Recorded check-ins, previous 7 days",
            f"{previous_count} visits" if len(previous) == 7 else "incomplete data",
        ),
        _evidence("attendance_change", "Week-over-week comparison", change),
        _evidence(
            "attendance_today", "Recorded check-ins today", analytics.attendance_today
        ),
        _evidence(
            "attendance_as_of", "Analytics as of", analytics.as_of_date.isoformat()
        ),
    )


def _membership_evidence(
    analytics: AssistantAnalytics,
) -> tuple[AssistantEvidence, ...]:
    breakdown = analytics.membership_breakdown
    return (
        _evidence("members_total", "Members on roster", analytics.total_members),
        _evidence("members_active", "Active memberships", breakdown.active),
        _evidence("members_paused", "Paused memberships", breakdown.paused),
        _evidence(
            "members_expiring",
            "Memberships expiring in 7 days",
            analytics.expiring_in_7_days,
        ),
        _evidence("members_expired", "Expired memberships", breakdown.expired),
        _evidence("members_as_of", "Analytics as of", analytics.as_of_date.isoformat()),
    )


def _retention_evidence(analytics: AssistantAnalytics) -> tuple[AssistantEvidence, ...]:
    summary = analytics.retention_summary
    if not summary.assessments_available:
        return (
            _evidence(
                "retention_availability",
                "Retention assessment data",
                "No current assessments are available",
            ),
            _evidence(
                "retention_as_of",
                "Analytics as of",
                analytics.as_of_date.isoformat(),
            ),
            _evidence(
                "retention_note",
                "Score meaning",
                "Operational prioritization, not a churn probability",
            ),
        )
    assessed_count = (
        summary.low_count
        + summary.medium_count
        + summary.high_count
        + summary.limited_count
    )
    return (
        _evidence(
            "retention_assessed",
            "Members with current assessments",
            assessed_count,
        ),
        _evidence("retention_high", "High-priority members", summary.high_count),
        _evidence("retention_medium", "Medium-priority members", summary.medium_count),
        _evidence("retention_low", "Low-priority members", summary.low_count),
        _evidence("retention_limited", "Limited assessments", summary.limited_count),
        _evidence(
            "retention_note",
            "Score meaning",
            "Operational prioritization, not a churn probability",
        ),
        _evidence(
            "retention_as_of", "Analytics as of", analytics.as_of_date.isoformat()
        ),
    )


def _overview_evidence(analytics: AssistantAnalytics) -> tuple[AssistantEvidence, ...]:
    high_priority_value: int | str = (
        analytics.retention_summary.high_count
        if analytics.retention_summary.assessments_available
        else "No current assessments"
    )
    return (
        _evidence(
            "overview_total_members", "Members on roster", analytics.total_members
        ),
        _evidence(
            "overview_active_members", "Active members", analytics.active_members
        ),
        _evidence(
            "overview_new_registrations",
            "New registrations in the last 30 days",
            analytics.new_registrations,
        ),
        _evidence(
            "overview_attendance_today",
            "Recorded check-ins today",
            analytics.attendance_today,
        ),
        _evidence(
            "overview_expiring",
            "Memberships expiring in 7 days",
            analytics.expiring_in_7_days,
        ),
        _evidence(
            "overview_high_priority",
            "High-priority assessed members",
            high_priority_value,
        ),
    )


_READ_ONLY_OPERATIONS: dict[
    AssistantOperation, Callable[[AssistantAnalytics], tuple[AssistantEvidence, ...]]
] = {
    AssistantOperation.ATTENDANCE_SUMMARY: _attendance_evidence,
    AssistantOperation.MEMBERSHIP_SUMMARY: _membership_evidence,
    AssistantOperation.RETENTION_SUMMARY: _retention_evidence,
    AssistantOperation.STUDIO_OVERVIEW: _overview_evidence,
}


def _deterministic_answer(
    operation: AssistantOperation, evidence: tuple[AssistantEvidence, ...]
) -> str:
    facts = "; ".join(f"{item.label}: {item.value}" for item in evidence[:5])
    if operation == AssistantOperation.ATTENDANCE_SUMMARY:
        return (
            f"Here is the recent attendance recorded in PranaX: {facts}. "
            "These are check-ins recorded for your studio."
        )
    if operation == AssistantOperation.RETENTION_SUMMARY:
        return (
            f"Here is your current retention-priority summary: {facts}. "
            "Retention scores prioritize outreach; they are not churn probabilities."
        )
    if operation == AssistantOperation.MEMBERSHIP_SUMMARY:
        return f"Here is the current membership summary for your studio: {facts}."
    return f"Here is the current overview for your studio: {facts}."


def _numeric_tokens(value: str) -> set[str]:
    return set(re.findall(r"\b\d+(?:\.\d+)?%?\b", value))


def _gemini_answer(
    operation: AssistantOperation,
    evidence: tuple[AssistantEvidence, ...],
) -> tuple[str, tuple[AssistantEvidence, ...]] | None:
    payload = {
        "approved_operation": operation.value,
        "approved_question": _OPERATION_QUESTIONS[operation],
        "evidence": [item.model_dump(by_alias=True) for item in evidence],
    }
    result = _call_gemini_json(
        stage="answer",
        instruction=_ANSWER_INSTRUCTION,
        payload=payload,
    )
    if result is None or set(result) != {"answer", "evidenceIds"}:
        return None
    answer = result.get("answer")
    evidence_ids = result.get("evidenceIds")
    if not isinstance(answer, str) or not answer.strip() or len(answer) > 1200:
        return None
    if not isinstance(evidence_ids, list) or not evidence_ids:
        return None

    evidence_by_id = {item.id: item for item in evidence}
    if any(
        not isinstance(identifier, str) or identifier not in evidence_by_id
        for identifier in evidence_ids
    ):
        return None
    allowed_numbers: set[str] = set()
    for item in evidence:
        allowed_numbers.update(_numeric_tokens(f"{item.label} {item.value}"))
    if not _numeric_tokens(answer).issubset(allowed_numbers):
        return None

    selected_evidence = tuple(
        dict.fromkeys(evidence_by_id[item] for item in evidence_ids)
    )
    return answer.strip(), selected_evidence


def route_studio_question(request: AssistantRouteInput) -> AssistantRoutingOutput:
    operation = _route_question(request)
    if operation is None:
        return AssistantRoutingOutput(
            scope=AssistantScope.OUT_OF_SCOPE,
            operation=None,
            message=_OUT_OF_SCOPE_MESSAGE,
        )
    return AssistantRoutingOutput(
        scope=AssistantScope.IN_SCOPE,
        operation=operation,
        message="This question matches an approved studio analytics operation.",
    )


def answer_studio_operation(
    request: AssistantOperationInput,
) -> AssistantAnswerOutput:
    operation = request.operation
    evidence = _READ_ONLY_OPERATIONS[operation](request.analytics)
    generated_answer = _gemini_answer(operation, evidence)
    if generated_answer is None:
        return AssistantAnswerOutput(
            scope=AssistantScope.IN_SCOPE,
            operation=operation,
            answer=_deterministic_answer(operation, evidence),
            evidence=evidence,
            mode=AssistantMode.DETERMINISTIC,
        )

    answer, cited_evidence = generated_answer
    return AssistantAnswerOutput(
        scope=AssistantScope.IN_SCOPE,
        operation=operation,
        answer=answer,
        evidence=cited_evidence,
        mode=AssistantMode.GEMINI,
    )


def _eligible_suggestions(
    analytics: AssistantAnalytics,
) -> tuple[AssistantOperation, ...]:
    candidates: list[AssistantOperation] = [AssistantOperation.STUDIO_OVERVIEW]
    if analytics.total_members > 0:
        candidates.extend(
            [
                AssistantOperation.MEMBERSHIP_SUMMARY,
                AssistantOperation.RETENTION_SUMMARY,
            ]
        )
    if any(point.count > 0 for point in analytics.attendance_trends):
        candidates.append(AssistantOperation.ATTENDANCE_SUMMARY)
    return tuple(dict.fromkeys(candidates))


def _fallback_suggestions(
    analytics: AssistantAnalytics,
    candidates: tuple[AssistantOperation, ...],
) -> tuple[AssistantOperation, ...]:
    ranked: list[AssistantOperation] = []
    if analytics.expiring_in_7_days > 0:
        ranked.append(AssistantOperation.MEMBERSHIP_SUMMARY)
    if (
        analytics.retention_summary.high_count > 0
        or analytics.retention_summary.limited_count > 0
    ):
        ranked.append(AssistantOperation.RETENTION_SUMMARY)
    if any(point.count > 0 for point in analytics.attendance_trends):
        ranked.append(AssistantOperation.ATTENDANCE_SUMMARY)
    ranked.append(AssistantOperation.STUDIO_OVERVIEW)
    ranked.extend(candidates)
    return tuple(
        operation for operation in dict.fromkeys(ranked) if operation in candidates
    )[:3]


def suggest_studio_questions(
    request: AssistantSuggestionsInput,
) -> AssistantSuggestionsOutput:
    candidates = _eligible_suggestions(request.analytics)
    candidate_payload = [
        {
            "operation": operation.value,
            "question": _OPERATION_QUESTIONS[operation],
        }
        for operation in candidates
    ]
    result = _call_gemini_json(
        stage="suggestions",
        instruction=_SUGGESTION_INSTRUCTION,
        payload={
            "studio_analytics": request.analytics.model_dump(
                mode="json", by_alias=True
            ),
            "candidates": candidate_payload,
        },
    )

    mode = AssistantMode.DETERMINISTIC
    selected: tuple[AssistantOperation, ...] = ()
    if result is not None and set(result) == {"operations"}:
        raw_operations = result.get("operations")
        if isinstance(raw_operations, list):
            candidate_set = set(candidates)
            parsed: list[AssistantOperation] = []
            for raw_operation in raw_operations:
                try:
                    operation = AssistantOperation(raw_operation)
                except (ValueError, TypeError):
                    continue
                if operation in candidate_set and operation not in parsed:
                    parsed.append(operation)
            if parsed:
                selected = tuple(parsed[:3])
                mode = AssistantMode.GEMINI

    if not selected:
        selected = _fallback_suggestions(request.analytics, candidates)

    return AssistantSuggestionsOutput(
        suggestions=tuple(
            AssistantSuggestion(
                operation=operation,
                question=_OPERATION_QUESTIONS[operation],
            )
            for operation in selected
        ),
        mode=mode,
    )
