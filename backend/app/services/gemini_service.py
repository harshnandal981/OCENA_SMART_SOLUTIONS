import asyncio
import json
import logging
import re
from json import JSONDecoder
from typing import Any, Callable, TypeVar

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.course import CourseContent, QuizContent

logger = logging.getLogger(__name__)

T = TypeVar("T")
MAX_LOG_PROMPT_CHARS = 4000
MAX_PROMPT_CHARS = 12000


class GeminiService:
    def __init__(self) -> None:
        self.model_name = self._validated_model_name(settings.gemini_model)
        self.base_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_name}:generateContent?key={settings.gemini_api_key or ''}"
        )

    def _validated_model_name(self, model_name: str) -> str:
        allowed_models = {
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-2.5-flash",
        }
        if model_name in allowed_models:
            return model_name
        logger.warning("Unsupported Gemini model configured; falling back", extra={"configured_model": model_name, "fallback_model": "gemini-2.0-flash"})
        return "gemini-2.0-flash"

    def _truncate_for_logging(self, text: str, limit: int = MAX_LOG_PROMPT_CHARS) -> str:
        if len(text) <= limit:
            return text
        return f"{text[:limit]}\n...[truncated {len(text) - limit} chars]"

    def _truncate_prompt(self, text: str, limit: int = MAX_PROMPT_CHARS) -> str:
        if len(text) <= limit:
            return text
        return f"{text[:limit]}\n...[truncated {len(text) - limit} chars]"

    def _diagnostic_error(self, operation_name: str, reason: str, last_error: Exception | None) -> HTTPException:
        detail = reason if not last_error else f"{reason}: {type(last_error).__name__}: {last_error}"
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Gemini {operation_name} failed: {detail}")

    async def generate_course_content(
        self,
        *,
        topic: str,
        difficulty: str,
        audience: str,
    ) -> CourseContent:
        if not settings.gemini_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini is not configured on the server.",
            )

        prompt = self._build_course_prompt(
            topic=topic,
            difficulty=difficulty,
            audience=audience,
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.4,
            },
        }
        return await self._retry_model_call(
            operation_name="course generation",
            prompt=prompt,
            payload=payload,
            parser=lambda text: self._normalize_order_indexes(
                CourseContent.model_validate(self._parse_json_content(text))
            ),
        )

    async def generate_lesson_content(
        self,
        *,
        lesson_title: str,
        course_topic: str,
    ) -> str:
        if not settings.gemini_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini is not configured on the server.",
            )

        prompt = self._build_lesson_prompt(
            lesson_title=lesson_title,
            course_topic=course_topic,
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.6,
            },
        }
        return await self._retry_model_call(
            operation_name="lesson generation",
            prompt=prompt,
            payload=payload,
            parser=self._parse_lesson_text,
        )

    async def generate_quiz_content(
        self,
        *,
        lesson_title: str,
        lesson_content: str,
    ) -> QuizContent:
        if not settings.gemini_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini is not configured on the server.",
            )

        prompt = self._build_quiz_prompt(
            lesson_title=lesson_title,
            lesson_content=self._truncate_prompt(lesson_content, limit=6000),
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3,
            },
        }
        return await self._retry_model_call(
            operation_name="quiz generation",
            prompt=prompt,
            payload=payload,
            parser=lambda text: QuizContent.model_validate(self._parse_json_content(text)),
        )

    async def debug_connection(self) -> str:
        if not settings.gemini_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini is not configured on the server.",
            )

        prompt = "Return the word OK"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.0,
            },
        }
        return await self._retry_model_call(
            operation_name="debug connection",
            prompt=prompt,
            payload=payload,
            parser=lambda text: self._strip_code_fences(self._coerce_text(text)).strip().strip('"').strip("'"),
        )

    async def _retry_model_call(
        self,
        *,
        operation_name: str,
        prompt: str,
        payload: dict[str, Any],
        parser: Callable[[str], T],
    ) -> T:
        last_error: Exception | None = None
        async with httpx.AsyncClient(timeout=90.0) as client:
            for attempt in range(1, 4):
                try:
                    logger.info(
                        "Gemini request starting",
                        extra={
                            "operation": operation_name,
                            "model": self.model_name,
                            "attempt": attempt,
                            "prompt_length": len(prompt),
                            "prompt_preview": self._truncate_for_logging(prompt),
                            "payload_preview": self._truncate_for_logging(json.dumps(payload)),
                        },
                    )
                    response = await client.post(self.base_url, json=payload)
                    raw_response = response.text
                    logger.info(
                        "Gemini raw response received",
                        extra={
                            "operation": operation_name,
                            "model": self.model_name,
                            "attempt": attempt,
                            "status_code": response.status_code,
                            "raw_response": self._truncate_for_logging(raw_response),
                        },
                    )
                    try:
                        response.raise_for_status()
                    except Exception as exc:
                        raise self._gemini_http_error(response, operation_name) from exc
                    text = self._extract_candidate_text(response.json())
                    logger.info(
                        "Gemini response parsing input",
                        extra={
                            "operation": operation_name,
                            "model": self.model_name,
                            "attempt": attempt,
                            "candidate_preview": self._truncate_for_logging(text),
                        },
                    )
                    if not text:
                        raise ValueError("Gemini response was empty")
                    parsed = parser(text)
                    logger.info(
                        "Gemini response parsing succeeded",
                        extra={
                            "operation": operation_name,
                            "model": self.model_name,
                            "attempt": attempt,
                            "parsed_type": type(parsed).__name__,
                        },
                    )
                    logger.info(
                        "Gemini %s succeeded on attempt %s",
                        operation_name,
                        attempt,
                    )
                    return parsed
                except Exception as exc:
                    last_error = exc
                    logger.exception(
                        "Gemini %s failed on attempt %s/%s",
                        operation_name,
                        attempt,
                        3,
                        extra={
                            "operation": operation_name,
                            "model": self.model_name,
                            "attempt": attempt,
                            "prompt_length": len(prompt),
                            "exception_type": type(exc).__name__,
                        },
                    )
                    if attempt < 3:
                        await asyncio.sleep(2 ** (attempt - 1))

        logger.exception(
            "Gemini %s failed after retries",
            operation_name,
            extra={"prompt": prompt},
        )
        raise self._diagnostic_error(operation_name, "timeout after 3 attempts" if isinstance(last_error, asyncio.TimeoutError) else "multiple attempts failed", last_error) from last_error

    def _gemini_http_error(self, response: httpx.Response, operation_name: str) -> HTTPException:
        status_code = response.status_code
        body = self._coerce_text(response.text)
        if status_code == 401 or status_code == 403:
            detail = "Gemini API key unauthorized"
        elif status_code == 429:
            detail = "Gemini quota exceeded or rate limited"
        elif status_code >= 500:
            detail = f"Gemini upstream error ({status_code})"
        else:
            detail = f"Gemini returned HTTP {status_code}"
        if body:
            detail = f"{detail}: {self._truncate_for_logging(body)}"
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Gemini {operation_name} failed: {detail}")

    def _extract_candidate_text(self, body: Any) -> str:
        if isinstance(body, list):
            return "\n".join(self._coerce_text(item) for item in body if self._coerce_text(item))

        if not isinstance(body, dict):
            return self._coerce_text(body)

        candidates = body.get("candidates")
        if isinstance(candidates, list):
            parts: list[str] = []
            for candidate in candidates:
                candidate_text = self._extract_text_from_candidate(candidate)
                if candidate_text:
                    parts.append(candidate_text)
            if parts:
                return "\n".join(parts)

        if "text" in body:
            return self._coerce_text(body["text"])

        return ""

    def _extract_text_from_candidate(self, candidate: Any) -> str:
        if not isinstance(candidate, dict):
            return self._coerce_text(candidate)

        content = candidate.get("content") or {}
        if isinstance(content, dict):
            parts = content.get("parts")
            if isinstance(parts, list):
                texts: list[str] = []
                for part in parts:
                    if not isinstance(part, dict):
                        continue
                    if "text" in part:
                        part_text = self._coerce_text(part["text"])
                        if part_text:
                            texts.append(part_text)
                if texts:
                    return "\n".join(texts)

        if "text" in candidate:
            return self._coerce_text(candidate["text"])

        return ""

    def _parse_json_content(self, text: str) -> Any:
        sanitized = self._extract_json_fragment(self._strip_code_fences(self._coerce_text(text)))
        if not sanitized:
            raise ValueError("Gemini returned empty JSON content.")

        candidates = [sanitized]
        for marker in ("{", "["):
            index = sanitized.find(marker)
            if index > 0:
                candidates.append(sanitized[index:])

        last_error: Exception | None = None
        for candidate in candidates:
            parsed = self._try_json_load(candidate)
            if parsed is not None:
                return self._normalize_json_value(parsed)
            try:
                obj, _ = JSONDecoder().raw_decode(candidate)
                return self._normalize_json_value(obj)
            except Exception as exc:
                last_error = exc

        raise ValueError("Gemini returned malformed JSON.") from last_error

    def _parse_lesson_text(self, text: str) -> str:
        sanitized = self._strip_code_fences(self._coerce_text(text)).strip()
        if not sanitized:
            raise ValueError("Gemini returned empty lesson content.")

        if sanitized.startswith("{") or sanitized.startswith("["):
            parsed = self._try_json_load(sanitized)
            if parsed is None:
                try:
                    parsed, _ = JSONDecoder().raw_decode(sanitized)
                except Exception as exc:
                    raise ValueError("Gemini returned invalid lesson content.") from exc
            return self._extract_text_from_structured_payload(parsed)

        return sanitized

    def _extract_text_from_structured_payload(self, payload: Any) -> str:
        if isinstance(payload, str):
            return payload.strip()
        if isinstance(payload, list):
            items = [self._extract_text_from_structured_payload(item) for item in payload]
            text = "\n".join(item for item in items if item)
            if text:
                return text.strip()
        if isinstance(payload, dict):
            for key in ("text", "content", "body", "markdown"):
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
        raise ValueError("Gemini returned lesson content in an unsupported format.")

    def _normalize_json_value(self, value: Any) -> Any:
        if isinstance(value, str):
            stripped = self._strip_code_fences(value).strip()
            if stripped and stripped != value:
                return self._normalize_json_value(stripped)
            return value
        if isinstance(value, list):
            if len(value) == 1 and isinstance(value[0], dict):
                return value[0]
            first_dict = next((item for item in value if isinstance(item, dict)), None)
            if first_dict is not None:
                return first_dict
        return value

    def _try_json_load(self, text: str) -> Any | None:
        try:
            return json.loads(text)
        except Exception:
            return None

    def _strip_code_fences(self, text: str) -> str:
        cleaned = text.strip()
        fenced = re.match(r"^```(?:json|markdown|text)?\s*([\s\S]*?)\s*```$", cleaned, re.IGNORECASE)
        if fenced:
            cleaned = fenced.group(1).strip()
        cleaned = re.sub(r"^```(?:json|markdown|text)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        return cleaned.strip()

    def _coerce_text(self, value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, (int, float, bool)):
            return str(value)
        if isinstance(value, list):
            return "\n".join(self._coerce_text(item) for item in value if self._coerce_text(item))
        if isinstance(value, dict):
            for key in ("text", "content", "message", "output"):
                nested = value.get(key)
                if isinstance(nested, str) and nested.strip():
                    return nested
            try:
                return json.dumps(value)
            except Exception:
                return str(value)
        return str(value)

    def _build_course_prompt(self, *, topic: str, difficulty: str, audience: str) -> str:
        return f"""
You are generating structured curriculum data for CourseForge AI.
Return only strict JSON. Do not use markdown. Do not include commentary.

Required JSON schema:
{{
  "title": "string",
  "description": "string",
  "learning_outcomes": ["string"],
  "modules": [
    {{
      "title": "string",
      "description": "string",
      "order_index": 1,
      "lessons": [
        {{
          "title": "string",
          "description": "string",
          "order_index": 1
        }}
      ]
    }}
  ]
}}

Input:
- Topic: {topic}
- Difficulty: {difficulty}
- Audience: {audience}

Rules:
- Write a compelling course title.
- Write one concise course description.
- Include 4 to 6 learning outcomes.
- Include 5 to 8 modules.
- Include 3 to 5 lessons for every module.
- Make module and lesson order indexes sequential starting at 1.
- Keep descriptions practical and clear for the audience.
- Ensure valid JSON only.
""".strip()

    def _build_lesson_prompt(self, *, lesson_title: str, course_topic: str) -> str:
        return f"""
You are creating a beginner-friendly educational lesson for CourseForge AI.
Return markdown only. Do not wrap the answer in code fences.

Lesson title: {lesson_title}
Course topic: {course_topic}

Requirements:
- Write between 1000 and 1500 words.
- Use clear markdown headings and subheadings.
- Keep the tone educational, supportive, and beginner-friendly.
- Explain concepts clearly before using jargon.
- Include practical examples and real-world context.

Use this exact structure:
# {lesson_title}

## Lesson Introduction

## Learning Objectives
- objective
- objective
- objective

## Detailed Explanation

## Real-world Examples

## Practical Applications

## Summary

## Key Takeaways
- takeaway
- takeaway
- takeaway

Do not include anything outside the lesson content.
""".strip()

    def _build_quiz_prompt(self, *, lesson_title: str, lesson_content: str) -> str:
        return f"""
You are generating an assessment for CourseForge AI.
Return only strict JSON. Do not use markdown. Do not include commentary.

Required JSON schema:
{{
  "mcqs": [
    {{
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_answer": "string",
      "explanation": "string"
    }}
  ],
  "true_false": [
    {{
      "question": "string",
      "correct_answer": true,
      "explanation": "string"
    }}
  ],
  "short_answers": [
    {{
      "question": "string",
      "sample_answer": "string",
      "explanation": "string"
    }}
  ]
}}

Lesson title: {lesson_title}
Lesson content:
{lesson_content}

Rules:
- Create exactly 5 multiple choice questions.
- Each MCQ must have exactly 4 options.
- The correct_answer must exactly match one option.
- Create exactly 2 true/false questions.
- Create exactly 2 short answer questions.
- Focus on comprehension and practical understanding.
- Ensure valid JSON only.
""".strip()

    def _normalize_order_indexes(self, course: CourseContent) -> CourseContent:
        normalized_modules = []
        for module_index, module in enumerate(course.modules, start=1):
            normalized_lessons = [
                lesson.model_copy(update={"order_index": lesson_index})
                for lesson_index, lesson in enumerate(module.lessons, start=1)
            ]
            normalized_modules.append(
                module.model_copy(
                    update={
                        "order_index": module_index,
                        "lessons": normalized_lessons,
                    }
                )
            )

        return course.model_copy(update={"modules": normalized_modules})


gemini_service = GeminiService()
