import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.course import (
    CourseGenerationRequest,
    CourseGenerationResponse,
    LessonGenerationRequest,
    LessonGenerationResponse,
    ProgressSummaryResponse,
    ProgressUpsertRequest,
    QuizGenerationRequest,
    QuizGenerationResponse,
)
from app.services.course_service import (
    generate_and_save_course,
    generate_and_save_lesson,
    get_course_progress,
    generate_and_save_quiz,
    upsert_lesson_progress,
)
from app.services.gemini_service import gemini_service

router = APIRouter(tags=["courses"])
logger = logging.getLogger(__name__)


def _log_route_error(endpoint: str) -> None:
    logger.exception("Route failed: %s", endpoint)


@router.post(
    "/generate-course",
    response_model=CourseGenerationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_course(payload: CourseGenerationRequest) -> CourseGenerationResponse:
    try:
        logger.info(
            "POST /generate-course payload received: user_id=%s topic=%s difficulty=%s audience=%s",
            payload.user_id,
            payload.topic,
            payload.difficulty,
            payload.audience,
        )
        response = await generate_and_save_course(payload)
        logger.info(
            "POST /generate-course completed: status=%s course_id=%s",
            status.HTTP_201_CREATED,
            response.id,
        )
        return response
    except HTTPException as exc:
        _log_route_error("POST /generate-course")
        raise
    except Exception as exc:
        _log_route_error("POST /generate-course")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate course.",
        ) from exc


@router.post(
    "/generate-lesson",
    response_model=LessonGenerationResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_lesson(payload: LessonGenerationRequest) -> LessonGenerationResponse:
    try:
        return await generate_and_save_lesson(payload)
    except HTTPException as exc:
        _log_route_error("POST /generate-lesson")
        raise
    except Exception as exc:
        _log_route_error("POST /generate-lesson")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate lesson.",
        ) from exc


@router.post(
    "/generate-quiz",
    response_model=QuizGenerationResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_quiz(payload: QuizGenerationRequest) -> QuizGenerationResponse:
    try:
        return await generate_and_save_quiz(payload)
    except HTTPException as exc:
        _log_route_error("POST /generate-quiz")
        raise
    except Exception as exc:
        _log_route_error("POST /generate-quiz")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate quiz.",
        ) from exc


@router.post(
    "/progress/mark-complete",
    response_model=ProgressSummaryResponse,
    status_code=status.HTTP_200_OK,
)
async def mark_progress(payload: ProgressUpsertRequest) -> ProgressSummaryResponse:
    try:
        return await upsert_lesson_progress(payload)
    except HTTPException as exc:
        _log_route_error("POST /progress/mark-complete")
        raise
    except Exception as exc:
        _log_route_error("POST /progress/mark-complete")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save progress.",
        ) from exc


@router.get(
    "/progress/course/{course_id}",
    response_model=ProgressSummaryResponse,
    status_code=status.HTTP_200_OK,
)
async def fetch_course_progress(course_id: str, user_id: str) -> ProgressSummaryResponse:
    try:
        return await get_course_progress(course_id=course_id, user_id=user_id)
    except HTTPException as exc:
        _log_route_error("GET /progress/course/{course_id}")
        raise
    except Exception as exc:
        _log_route_error("GET /progress/course/{course_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load progress.",
        ) from exc


@router.get("/debug/gemini", status_code=status.HTTP_200_OK)
async def debug_gemini() -> dict[str, str]:
    try:
        response = await gemini_service.debug_connection()
        return {"status": "success", "response": response}
    except HTTPException:
        _log_route_error("GET /debug/gemini")
        raise
    except Exception as exc:
        _log_route_error("GET /debug/gemini")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to debug Gemini.",
        ) from exc
