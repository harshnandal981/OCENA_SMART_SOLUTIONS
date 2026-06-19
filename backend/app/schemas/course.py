from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CourseGenerationRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=200)
    difficulty: str = Field(min_length=3, max_length=50)
    audience: str = Field(min_length=3, max_length=200)
    user_id: str | None = Field(default=None, min_length=3, max_length=100)


class LessonContent(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10)
    order_index: int = Field(ge=1)


class ModuleContent(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10)
    order_index: int = Field(ge=1)
    lessons: list[LessonContent] = Field(min_length=3, max_length=5)


class CourseContent(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=20)
    learning_outcomes: list[str] = Field(min_length=4, max_length=8)
    modules: list[ModuleContent] = Field(min_length=5, max_length=8)


class QuizRecord(BaseModel):
    id: str
    lesson_id: str
    questions_json: dict[str, Any]


class LessonRecord(BaseModel):
    id: str
    module_id: str
    title: str
    description: str
    order_index: int
    content: str | None = None
    quiz: QuizRecord | None = None


class ModuleRecord(BaseModel):
    id: str
    course_id: str
    title: str
    description: str
    order_index: int
    lessons: list[LessonRecord]


class CourseGenerationResponse(BaseModel):
    id: str
    topic: str
    difficulty: str
    audience: str
    title: str
    description: str
    learning_outcomes: list[str]
    thumbnail_url: str | None = None
    modules: list[ModuleRecord]


class LessonGenerationRequest(BaseModel):
    lesson_title: str = Field(min_length=3, max_length=200)
    course_topic: str = Field(min_length=3, max_length=200)


class LessonGenerationResponse(BaseModel):
    lesson_id: str
    content: str


class MCQItem(BaseModel):
    question: str = Field(min_length=10)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: str = Field(min_length=1)
    explanation: str = Field(min_length=10)


class TrueFalseItem(BaseModel):
    question: str = Field(min_length=10)
    correct_answer: bool
    explanation: str = Field(min_length=10)


class ShortAnswerItem(BaseModel):
    question: str = Field(min_length=10)
    sample_answer: str = Field(min_length=10)
    explanation: str = Field(min_length=10)


class QuizGenerationRequest(BaseModel):
    lesson_id: str = Field(min_length=3, max_length=100)
    lesson_title: str = Field(min_length=3, max_length=200)
    lesson_content: str = Field(min_length=50)


class QuizContent(BaseModel):
    mcqs: list[MCQItem] = Field(min_length=5, max_length=5)
    true_false: list[TrueFalseItem] = Field(min_length=2, max_length=2)
    short_answers: list[ShortAnswerItem] = Field(min_length=2, max_length=2)


class QuizGenerationResponse(QuizContent):
    quiz_id: str


class ProgressUpsertRequest(BaseModel):
    user_id: str = Field(min_length=3)
    lesson_id: str = Field(min_length=3)
    completed: bool = True


class ProgressSummaryResponse(BaseModel):
    completed_lessons: int
    total_lessons: int
    percentage: float
