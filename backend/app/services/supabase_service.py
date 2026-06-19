import logging
from typing import Any, Callable

from fastapi import HTTPException, status

from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)


class SupabaseService:
    def create_course(
        self,
        *,
        topic: str,
        difficulty: str,
        audience: str,
        title: str,
        description: str,
        learning_outcomes: list[str],
        thumbnail_url: str | None,
    ) -> dict[str, Any]:
        payload = {
            "topic": topic,
            "difficulty": difficulty,
            "audience": audience,
            "title": title,
            "description": description,
            "learning_outcomes": learning_outcomes,
            "thumbnail_url": thumbnail_url,
        }
        return self._insert_one("courses", payload, "course")

    def create_module(
        self,
        *,
        course_id: str,
        title: str,
        description: str,
        order_index: int,
    ) -> dict[str, Any]:
        payload = {
            "course_id": course_id,
            "title": title,
            "description": description,
            "order_index": order_index,
        }
        return self._insert_one("modules", payload, "module")

    def create_lesson(
        self,
        *,
        module_id: str,
        title: str,
        description: str,
        order_index: int,
    ) -> dict[str, Any]:
        payload = {
            "module_id": module_id,
            "title": title,
            "description": description,
            "order_index": order_index,
            "content": None,
        }
        return self._insert_one("lessons", payload, "lesson")

    def create_quiz(
        self,
        *,
        lesson_id: str,
        questions_json: dict[str, Any],
    ) -> dict[str, Any]:
        payload = {
            "lesson_id": lesson_id,
            "questions_json": questions_json,
        }
        return self._insert_one("quizzes", payload, "quiz")

    def get_course(self, course_id: str) -> dict[str, Any]:
        response = self._query(
            "courses",
            lambda table: table.select("*").eq("id", course_id).limit(2).execute(),
            operation_name="get_course",
            payload={"course_id": course_id},
        )
        return self._single_row_or_404(response, "Course not found.")

    def get_lesson(self, lesson_id: str) -> dict[str, Any]:
        response = self._query(
            "lessons",
            lambda table: table.select("id, module_id, title, description, order_index, content").eq("id", lesson_id).limit(2).execute(),
            operation_name="get_lesson",
            payload={"lesson_id": lesson_id},
        )
        return self._single_row_or_404(response, "Lesson not found.")

    def get_module(self, module_id: str) -> dict[str, Any]:
        response = self._query(
            "modules",
            lambda table: table.select("id, course_id, title, description, order_index").eq("id", module_id).limit(2).execute(),
            operation_name="get_module",
            payload={"module_id": module_id},
        )
        return self._single_row_or_404(response, "Module not found.")

    def get_lesson_by_title_and_course_topic(
        self,
        *,
        lesson_title: str,
        course_topic: str,
    ) -> dict[str, Any]:
        course_response = self._query(
            "courses",
            lambda table: table.select("id").eq("topic", course_topic).order("created_at", desc=True).limit(2).execute(),
            operation_name="get_course_by_topic",
            payload={"course_topic": course_topic},
        )
        course_row = self._single_row_or_404(
            course_response,
            "Course not found for the provided topic.",
        )

        module_response = self._query(
            "modules",
            lambda table: table.select("id").eq("course_id", course_row["id"]).order("order_index", desc=False).limit(100).execute(),
            operation_name="list_modules_for_course",
            payload={"course_id": course_row["id"]},
        )
        module_ids = [module["id"] for module in module_response]
        if not module_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No modules found for the provided course topic.",
            )

        lesson_response = self._query(
            "lessons",
            lambda table: table.select("id, module_id, title, description, order_index, content").in_("module_id", module_ids).eq("title", lesson_title).order("created_at", desc=True).limit(2).execute(),
            operation_name="get_lesson_by_title",
            payload={"lesson_title": lesson_title, "course_topic": course_topic},
        )
        return self._single_row_or_404(
            lesson_response,
            "Lesson not found for the provided title and course topic.",
        )

    def update_lesson_content(self, *, lesson_id: str, content: str) -> dict[str, Any]:
        response = self._query(
            "lessons",
            lambda table: table.update({"content": content}).eq("id", lesson_id).execute(),
            operation_name="update_lesson_content",
            payload={"lesson_id": lesson_id, "content_length": len(content)},
        )
        return self._single_row_or_404(response, "Lesson update did not return a row.")

    def upsert_progress(
        self,
        *,
        user_id: str,
        lesson_id: str,
        completed: bool,
    ) -> dict[str, Any]:
        response = self._query(
            "progress",
            lambda table: table.upsert(
                {
                    "user_id": user_id,
                    "lesson_id": lesson_id,
                    "completed": completed,
                },
                on_conflict="user_id,lesson_id",
            ).execute(),
            operation_name="upsert_progress",
            payload={"user_id": user_id, "lesson_id": lesson_id, "completed": completed},
        )
        return self._single_row_or_404(response, "Progress update did not return a row.")

    def get_course_progress(self, *, course_id: str, user_id: str) -> dict[str, Any]:
        module_response = self._query(
            "modules",
            lambda table: table.select("id").eq("course_id", course_id).execute(),
            operation_name="list_modules_for_progress",
            payload={"course_id": course_id},
        )
        module_ids = [module["id"] for module in module_response]

        if not module_ids:
            return {"completed_lessons": 0, "total_lessons": 0, "percentage": 0.0}

        lesson_response = self._query(
            "lessons",
            lambda table: table.select("id").in_("module_id", module_ids).execute(),
            operation_name="list_lessons_for_progress",
            payload={"module_ids": module_ids},
        )
        lesson_ids = [lesson["id"] for lesson in lesson_response]
        total_lessons = len(lesson_ids)
        if total_lessons == 0:
            return {"completed_lessons": 0, "total_lessons": 0, "percentage": 0.0}

        progress_response = self._query(
            "progress",
            lambda table: table.select("lesson_id").eq("user_id", user_id).eq("completed", True).in_("lesson_id", lesson_ids).execute(),
            operation_name="list_completed_lessons",
            payload={"user_id": user_id, "lesson_ids": lesson_ids},
        )
        completed_lessons = len(progress_response)
        percentage = round((completed_lessons / total_lessons) * 100, 2) if total_lessons else 0.0
        return {
            "completed_lessons": completed_lessons,
            "total_lessons": total_lessons,
            "percentage": percentage,
        }

    def _client(self):
        if supabase is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase is not configured on the server.",
            )

        return supabase

    def _insert_one(self, table_name: str, payload: dict[str, Any], entity_name: str) -> dict[str, Any]:
        response = self._query(
            table_name,
            lambda table: table.insert(payload).execute(),
            operation_name=f"create_{entity_name}",
            payload=payload,
        )
        row = self._single_row_or_502(response, entity_name)
        logger.info(
            "Supabase insert returned row",
            extra={"table": table_name, "entity_name": entity_name, "inserted_id": row.get("id")},
        )
        return row

    def _query(
        self,
        table_name: str,
        operation: Callable[[Any], Any],
        *,
        operation_name: str,
        payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        response = None
        try:
            logger.info(
                "Supabase operation started",
                extra={"table": table_name, "operation": operation_name, "payload": payload},
            )
            response = operation(self._client().table(table_name))
            rows = self._coerce_rows(response.data)
            logger.info(
                "Supabase operation completed",
                extra={"table": table_name, "operation": operation_name, "row_count": len(rows)},
            )
            return rows
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception(
                "Supabase operation failed",
                extra={
                    "table": table_name,
                    "operation": operation_name,
                    "payload": payload,
                    "response": getattr(response, "data", None),
                },
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase operation '{operation_name}' failed for table '{table_name}'.",
            ) from exc

    def _coerce_rows(self, data: Any) -> list[dict[str, Any]]:
        if data is None:
            return []
        if isinstance(data, list):
            return [row for row in data if isinstance(row, dict)]
        if isinstance(data, dict):
            return [data]
        return []

    def _single_row_or_404(self, rows: list[dict[str, Any]], detail: str) -> dict[str, Any]:
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
        if len(rows) > 1:
            logger.warning("Supabase returned multiple rows where one was expected", extra={"row_count": len(rows), "detail": detail})
        return rows[0]

    def _single_row_or_502(self, rows: list[dict[str, Any]], entity_name: str) -> dict[str, Any]:
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase did not return a saved {entity_name} row.",
            )
        if len(rows) > 1:
            logger.warning(
                "Supabase returned multiple rows for an insert/update response",
                extra={"entity_name": entity_name, "row_count": len(rows)},
            )
        return rows[0]


supabase_service = SupabaseService()
