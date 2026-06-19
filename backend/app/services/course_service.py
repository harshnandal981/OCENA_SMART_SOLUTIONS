import asyncio
import logging

from fastapi import HTTPException, status

from app.schemas.course import (
    CourseGenerationRequest,
    CourseGenerationResponse,
    MCQItem,
    LessonGenerationRequest,
    LessonGenerationResponse,
    LessonRecord,
    ModuleRecord,
    ProgressSummaryResponse,
    ProgressUpsertRequest,
    QuizContent,
    QuizGenerationRequest,
    QuizGenerationResponse,
    QuizRecord,
    ShortAnswerItem,
    TrueFalseItem,
)
from app.services.gemini_service import gemini_service
from app.services.supabase_service import supabase_service
from app.services.thumbnail_service import thumbnail_service

logger = logging.getLogger(__name__)
FALLBACK_LESSON_CONTENT = "Lesson content temporarily unavailable"


async def _wait_for_operation(operation_name: str, coroutine, *, timeout: int = 30):
    try:
        return await asyncio.wait_for(coroutine, timeout=timeout)
    except asyncio.TimeoutError as exc:
        logger.exception("Operation timed out", extra={"operation": operation_name})
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"{operation_name} timed out after {timeout}s.",
        ) from exc
    except Exception:
        logger.exception("Operation failed", extra={"operation": operation_name})
        raise


async def _run_supabase_operation(
    *,
    operation_name: str,
    table_name: str,
    payload: dict,
    operation,
):
    try:
        return await asyncio.wait_for(asyncio.to_thread(operation), timeout=30)
    except asyncio.TimeoutError as exc:
        logger.exception(
            "Supabase operation timed out",
            extra={"operation": operation_name, "table": table_name, "payload": payload},
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Supabase operation timed out for table '{table_name}'.",
        ) from exc
    except Exception:
        logger.exception(
            "Supabase operation failed",
            extra={"operation": operation_name, "table": table_name, "payload": payload},
        )
        raise


async def _generate_lesson_content_with_fallback(*, lesson_title: str, course_topic: str) -> str:
    try:
        return await _wait_for_operation(
            "Gemini lesson generation",
            gemini_service.generate_lesson_content(
                lesson_title=lesson_title,
                course_topic=course_topic,
            ),
        )
    except HTTPException as exc:
        logger.exception(
            "Lesson generation failed, using fallback content",
            extra={
                "lesson_title": lesson_title,
                "course_topic": course_topic,
                "fallback_content": FALLBACK_LESSON_CONTENT,
                "status_code": exc.status_code,
                "detail": exc.detail,
            },
        )
        return FALLBACK_LESSON_CONTENT
    except Exception as exc:
        logger.exception(
            "Lesson generation failed with unexpected error, using fallback content",
            extra={
                "lesson_title": lesson_title,
                "course_topic": course_topic,
                "fallback_content": FALLBACK_LESSON_CONTENT,
            },
        )
        return FALLBACK_LESSON_CONTENT


async def _generate_quiz_content_with_fallback(
    *,
    lesson_title: str,
    lesson_content: str,
) -> QuizContent:
    try:
        return await _wait_for_operation(
            "Gemini quiz generation",
            gemini_service.generate_quiz_content(
                lesson_title=lesson_title,
                lesson_content=lesson_content,
            ),
        )
    except HTTPException as exc:
        logger.exception(
            "Quiz generation failed, using fallback content",
            extra={
                "lesson_title": lesson_title,
                "status_code": exc.status_code,
                "detail": exc.detail,
            },
        )
        return QuizContent(
            mcqs=[
                MCQItem(
                    question=f"Which statement best reflects {lesson_title}?",
                    options=[
                        "It focuses on the core concept.",
                        "It avoids the subject entirely.",
                        "It has no practical value.",
                        "It is unrelated to the course.",
                    ],
                    correct_answer="It focuses on the core concept.",
                    explanation="Fallback quizzes still reinforce the lesson's main idea.",
                )
                for _ in range(5)
            ],
            true_false=[
                TrueFalseItem(
                    question=f"{lesson_title} belongs to this course.",
                    correct_answer=True,
                    explanation="This placeholder keeps the structure valid.",
                )
                for _ in range(2)
            ],
            short_answers=[
                ShortAnswerItem(
                    question=f"Summarize the main point of {lesson_title}.",
                    sample_answer="A concise summary of the lesson's main point.",
                    explanation="A fallback short-answer prompt still checks understanding.",
                )
                for _ in range(2)
            ],
        )
    except Exception as exc:
        logger.exception(
            "Quiz generation failed with unexpected error, using fallback content",
            extra={"lesson_title": lesson_title},
        )
        return QuizContent(
            mcqs=[
                MCQItem(
                    question=f"Which statement best reflects {lesson_title}?",
                    options=[
                        "It focuses on the core concept.",
                        "It avoids the subject entirely.",
                        "It has no practical value.",
                        "It is unrelated to the course.",
                    ],
                    correct_answer="It focuses on the core concept.",
                    explanation="Fallback quizzes still reinforce the lesson's main idea.",
                )
                for _ in range(5)
            ],
            true_false=[
                TrueFalseItem(
                    question=f"{lesson_title} belongs to this course.",
                    correct_answer=True,
                    explanation="This placeholder keeps the structure valid.",
                )
                for _ in range(2)
            ],
            short_answers=[
                ShortAnswerItem(
                    question=f"Summarize the main point of {lesson_title}.",
                    sample_answer="A concise summary of the lesson's main point.",
                    explanation="A fallback short-answer prompt still checks understanding.",
                )
                for _ in range(2)
            ],
        )


async def generate_and_save_course(
    payload: CourseGenerationRequest,
) -> CourseGenerationResponse:
    logger.info(
        "Course generation started",
        extra={
            "user_id": payload.user_id,
            "topic": payload.topic,
            "difficulty": payload.difficulty,
            "audience": payload.audience,
        },
    )
    generated_course = await _wait_for_operation(
        "Gemini course generation",
        gemini_service.generate_course_content(
            topic=payload.topic,
            difficulty=payload.difficulty,
            audience=payload.audience,
        ),
    )
    thumbnail_url = await _wait_for_operation(
        "Thumbnail generation",
        thumbnail_service.generate_course_thumbnail_url(
            topic=payload.topic,
            title=generated_course.title,
            audience=payload.audience,
        ),
    )

    try:
        course_payload = {
            "topic": payload.topic,
            "difficulty": payload.difficulty,
            "audience": payload.audience,
            "title": generated_course.title,
            "description": generated_course.description,
            "learning_outcomes": generated_course.learning_outcomes,
            "thumbnail_url": thumbnail_url,
        }
        course_row = await _run_supabase_operation(
            operation_name="create_course",
            table_name="courses",
            payload=course_payload,
            operation=lambda: supabase_service.create_course(**course_payload),
        )
        logger.info("Course row inserted", extra={"course_id": course_row["id"]})

        saved_modules: list[ModuleRecord] = []
        for module in generated_course.modules:
            module_payload = {
                "course_id": course_row["id"],
                "title": module.title,
                "description": module.description,
                "order_index": module.order_index,
            }
            module_row = await _run_supabase_operation(
                operation_name="create_module",
                table_name="modules",
                payload=module_payload,
                operation=lambda module_payload=module_payload: supabase_service.create_module(
                    **module_payload
                ),
            )
            logger.info(
                "Module row inserted",
                extra={"course_id": course_row["id"], "module_id": module_row["id"]},
            )

            saved_lessons: list[LessonRecord] = []
            for lesson in module.lessons:
                lesson_payload = {
                    "module_id": module_row["id"],
                    "title": lesson.title,
                    "description": lesson.description,
                    "order_index": lesson.order_index,
                }
                lesson_row = await _run_supabase_operation(
                    operation_name="create_lesson",
                    table_name="lessons",
                    payload=lesson_payload,
                    operation=lambda lesson_payload=lesson_payload: supabase_service.create_lesson(
                        **lesson_payload
                    ),
                )
                logger.info(
                    "Lesson row inserted",
                    extra={"module_id": module_row["id"], "lesson_id": lesson_row["id"]},
                )

                lesson_content = await _generate_lesson_content_with_fallback(
                    lesson_title=lesson.title,
                    course_topic=payload.topic,
                )
                updated_lesson = await _run_supabase_operation(
                    operation_name="update_lesson_content",
                    table_name="lessons",
                    payload={"lesson_id": lesson_row["id"], "content_length": len(lesson_content)},
                    operation=lambda lesson_id=lesson_row["id"], content=lesson_content: supabase_service.update_lesson_content(
                        lesson_id=lesson_id,
                        content=content,
                    ),
                )
                logger.info(
                    "Lesson content saved",
                    extra={"lesson_id": updated_lesson["id"], "content_length": len(lesson_content)},
                )

                quiz_content = await _generate_quiz_content_with_fallback(
                    lesson_title=lesson.title,
                    lesson_content=lesson_content,
                )
                quiz_row = await _run_supabase_operation(
                    operation_name="create_quiz",
                    table_name="quizzes",
                    payload={"lesson_id": lesson_row["id"]},
                    operation=lambda lesson_id=lesson_row["id"], quiz=quiz_content: supabase_service.create_quiz(
                        lesson_id=lesson_id,
                        questions_json=quiz.model_dump(),
                    ),
                )
                logger.info(
                    "Quiz row inserted",
                    extra={"lesson_id": lesson_row["id"], "quiz_id": quiz_row["id"]},
                )

                saved_lessons.append(
                    LessonRecord(
                        **updated_lesson,
                        quiz=QuizRecord(**quiz_row),
                    )
                )

            saved_modules.append(
                ModuleRecord(
                    id=module_row["id"],
                    course_id=module_row["course_id"],
                    title=module_row["title"],
                    description=module_row["description"],
                    order_index=module_row["order_index"],
                    lessons=saved_lessons,
                )
            )

        logger.info("Course generation complete", extra={"course_id": course_row["id"]})
        return CourseGenerationResponse(
            id=course_row["id"],
            topic=course_row["topic"],
            difficulty=course_row["difficulty"],
            audience=course_row["audience"],
            title=course_row["title"],
            description=course_row["description"],
            learning_outcomes=course_row["learning_outcomes"],
            thumbnail_url=course_row.get("thumbnail_url"),
            modules=saved_modules,
        )
    except HTTPException:
        logger.exception("Course generation failed with HTTPException")
        raise
    except Exception as exc:  # pragma: no cover - defensive service boundary
        logger.exception("Course generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save generated course data to Supabase.",
        ) from exc


async def generate_and_save_lesson(
    payload: LessonGenerationRequest,
) -> LessonGenerationResponse:
    lesson_row = supabase_service.get_lesson_by_title_and_course_topic(
        lesson_title=payload.lesson_title,
        course_topic=payload.course_topic,
    )
    content = await _generate_lesson_content_with_fallback(
        lesson_title=payload.lesson_title,
        course_topic=payload.course_topic,
    )

    try:
        lesson_update_payload = {
            "lesson_id": lesson_row["id"],
            "content": content,
        }
        updated_lesson = await _run_supabase_operation(
            operation_name="update_lesson_content",
            table_name="lessons",
            payload=lesson_update_payload,
            operation=lambda: supabase_service.update_lesson_content(**lesson_update_payload),
        )
    except HTTPException:
        logger.exception("Lesson generation failed with HTTPException")
        raise
    except Exception as exc:  # pragma: no cover - defensive service boundary
        logger.exception("Lesson generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save generated lesson content to Supabase.",
        ) from exc

    return LessonGenerationResponse(
        lesson_id=updated_lesson["id"],
        content=updated_lesson["content"],
    )


async def generate_and_save_quiz(
    payload: QuizGenerationRequest,
) -> QuizGenerationResponse:
    quiz_content = await _generate_quiz_content_with_fallback(
        lesson_title=payload.lesson_title,
        lesson_content=payload.lesson_content,
    )

    try:
        quiz_payload = {
            "lesson_id": payload.lesson_id,
            "questions_json": quiz_content.model_dump(),
        }
        quiz_row = await _run_supabase_operation(
            operation_name="create_quiz",
            table_name="quizzes",
            payload=quiz_payload,
            operation=lambda: supabase_service.create_quiz(**quiz_payload),
        )
    except HTTPException:
        logger.exception("Quiz generation failed with HTTPException")
        raise
    except Exception as exc:  # pragma: no cover - defensive service boundary
        logger.exception("Quiz generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save generated quiz data to Supabase.",
        ) from exc

    return QuizGenerationResponse(
        quiz_id=quiz_row["id"],
        mcqs=quiz_content.mcqs,
        true_false=quiz_content.true_false,
        short_answers=quiz_content.short_answers,
    )


async def upsert_lesson_progress(
    payload: ProgressUpsertRequest,
) -> ProgressSummaryResponse:
    lesson_row = await _run_supabase_operation(
        operation_name="get_lesson",
        table_name="lessons",
        payload={"lesson_id": payload.lesson_id},
        operation=lambda: supabase_service.get_lesson(payload.lesson_id),
    )
    module_row = await _run_supabase_operation(
        operation_name="get_module",
        table_name="modules",
        payload={"module_id": lesson_row["module_id"]},
        operation=lambda: supabase_service.get_module(lesson_row["module_id"]),
    )

    try:
        progress_payload = {
            "user_id": payload.user_id,
            "lesson_id": payload.lesson_id,
            "completed": payload.completed,
        }
        await _run_supabase_operation(
            operation_name="upsert_progress",
            table_name="progress",
            payload=progress_payload,
            operation=lambda: supabase_service.upsert_progress(**progress_payload),
        )
    except Exception as exc:  # pragma: no cover - defensive service boundary
        logger.exception("Progress update failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save lesson progress.",
        ) from exc
    summary = await _run_supabase_operation(
        operation_name="get_course_progress",
        table_name="progress",
        payload={"course_id": module_row["course_id"], "user_id": payload.user_id},
        operation=lambda: supabase_service.get_course_progress(
            course_id=module_row["course_id"],
            user_id=payload.user_id,
        ),
    )
    return ProgressSummaryResponse(**summary)


async def get_course_progress(course_id: str, user_id: str) -> ProgressSummaryResponse:
    try:
        summary = await _run_supabase_operation(
            operation_name="get_course_progress",
            table_name="progress",
            payload={"course_id": course_id, "user_id": user_id},
            operation=lambda: supabase_service.get_course_progress(
                course_id=course_id,
                user_id=user_id,
            ),
        )
    except HTTPException:
        logger.exception("Progress fetch failed with HTTPException")
        raise
    except Exception as exc:  # pragma: no cover - defensive service boundary
        logger.exception("Progress fetch failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load course progress.",
        ) from exc

    return ProgressSummaryResponse(**summary)
