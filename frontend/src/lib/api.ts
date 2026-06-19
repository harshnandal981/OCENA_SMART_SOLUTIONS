import { supabase } from "./supabase";
import type { CourseProgressSummary, GeneratedCourseResponse } from "../types/course";

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

async function authorizedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const method = options.method ?? "GET";
  const url = `${baseUrl}${path}`;

  console.info("[REQUEST]");
  console.info(`${method} ${url}`);
  if (options.body) {
    console.info("[PAYLOAD]");
    console.info(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      ...(options.headers ?? {}),
    },
  });

  console.info("[RESPONSE]");
  console.info(response.status);

  const responseText = await response.text();
  let parsedBody: unknown = null;

  if (responseText) {
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = responseText;
    }
  }

  if (!response.ok) {
    const detail =
      parsedBody && typeof parsedBody === "object" && "detail" in parsedBody
        ? String((parsedBody as { detail?: unknown }).detail ?? "Request failed")
        : responseText || "Request failed";

    console.error("[ERROR]");
    console.error(`${method} ${url}`);
    console.error(detail);
    throw new Error(`Failed request: ${method} ${url} -> ${response.status} ${detail}`);
  }

  return parsedBody as T;
}

export type CoursePayload = {
  topic: string;
  audience: string;
  difficulty: string;
};

export type LessonPayload = {
  lessonTitle: string;
  courseTopic: string;
};

export type QuizPayload = {
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
};

export async function generateCourse(payload: CoursePayload): Promise<GeneratedCourseResponse> {
  return authorizedFetch("/generate-course", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateLesson(payload: LessonPayload) {
  return authorizedFetch("/generate-lesson", {
    method: "POST",
    body: JSON.stringify({
      lesson_title: payload.lessonTitle,
      course_topic: payload.courseTopic,
    }),
  });
}

export async function generateQuiz(payload: QuizPayload) {
  return authorizedFetch("/generate-quiz", {
    method: "POST",
    body: JSON.stringify({
      lesson_id: payload.lessonId,
      lesson_title: payload.lessonTitle,
      lesson_content: payload.lessonContent,
    }),
  });
}

export async function markLessonComplete(payload: {
  user_id: string;
  lesson_id: string;
  completed: boolean;
}): Promise<CourseProgressSummary> {
  return authorizedFetch("/progress/mark-complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCourseProgress(courseId: string, userId: string): Promise<CourseProgressSummary> {
  const query = new URLSearchParams({ user_id: userId }).toString();
  return authorizedFetch(`/progress/course/${courseId}?${query}`, {
    method: "GET",
  });
}
