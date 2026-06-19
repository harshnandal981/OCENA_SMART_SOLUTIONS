import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { getCourseProgress, markLessonComplete } from "../lib/api";
import { StateCard } from "../components/StateCard";
import { useUser } from "../hooks/useUser";
import { useToast } from "../hooks/useToast";
import type { CourseProgressSummary, GeneratedCourseResponse, ModuleDetail, QuizContent } from "../types/course";

type CourseRow = {
  id: string;
  topic: string;
  difficulty: string;
  audience: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  learning_outcomes: unknown;
};

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string;
  order_index: number;
  content: string | null;
};

const defaultQuiz: QuizContent = {
  mcqs: [],
  true_false: [],
  short_answers: [],
};

function parseLearningOutcomes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseQuiz(value: unknown): QuizContent {
  if (!value || typeof value !== "object") {
    return defaultQuiz;
  }

  const candidate = value as Partial<QuizContent>;

  return {
    mcqs: Array.isArray(candidate.mcqs) ? candidate.mcqs : [],
    true_false: Array.isArray(candidate.true_false) ? candidate.true_false : [],
    short_answers: Array.isArray(candidate.short_answers) ? candidate.short_answers : [],
  };
}

export function CourseViewerPage() {
  const { courseId } = useParams();
  const { user } = useUser();
  const [course, setCourse] = useState<GeneratedCourseResponse | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [quiz, setQuiz] = useState<QuizContent>(defaultQuiz);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [progressSummary, setProgressSummary] = useState<CourseProgressSummary>({
    completed_lessons: 0,
    total_lessons: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [progressSaving, setProgressSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!courseId || !user?.id) {
      return;
    }

    const currentCourseId = courseId;
    const currentUserId = user.id;
    console.info("[COURSE ROUTE PARAM]", { courseId: currentCourseId });

    async function loadProgress() {
      const summary = await getCourseProgress(currentCourseId, currentUserId);
      setProgressSummary(summary);

      const { data, error: progressError } = await supabase
        .from("progress")
        .select("lesson_id")
        .eq("user_id", currentUserId)
        .eq("completed", true);

      if (!progressError) {
        setCompletedLessons((data ?? []).map((item) => item.lesson_id));
      }
    }

    void loadProgress();
  }, [courseId, user?.id]);

  useEffect(() => {
    if (!courseId) {
      return;
    }

    const currentCourseId = courseId;

    async function loadCourse() {
      setLoading(true);
      setError(null);
      console.info("[COURSE QUERY START]", { courseId: currentCourseId });

      const { data: courseRow, error: courseError } = await supabase
        .from("courses")
        .select("id, topic, difficulty, audience, title, description, thumbnail_url, learning_outcomes")
        .eq("id", currentCourseId)
        .maybeSingle();

      if (courseError || !courseRow) {
        console.info("[COURSE QUERY RESULT]", {
          courseId: currentCourseId,
          found: false,
          error: courseError?.message ?? null,
          data: courseRow ?? null,
        });
        setError(courseError?.message ?? "Course not found.");
        setLoading(false);
        return;
      }
      console.info("[COURSE QUERY RESULT]", {
        courseId: currentCourseId,
        found: true,
        returnedCourseId: courseRow.id,
        data: courseRow,
      });

      const { data: moduleRows, error: moduleError } = await supabase
        .from("modules")
        .select("id, course_id, title, description, order_index")
        .eq("course_id", currentCourseId)
        .order("order_index", { ascending: true });

      if (moduleError) {
        console.info("[MODULE QUERY RESULT]", {
          courseId: currentCourseId,
          found: false,
          error: moduleError.message,
          data: null,
        });
        setError(moduleError.message);
        setLoading(false);
        return;
      }
      console.info("[MODULE QUERY RESULT]", {
        courseId: currentCourseId,
        found: true,
        count: moduleRows?.length ?? 0,
      });

      const moduleIds = (moduleRows ?? []).map((module) => module.id);
      let lessonRows: LessonRow[] = [];

      if (moduleIds.length > 0) {
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("id, module_id, title, description, order_index, content")
          .in("module_id", moduleIds)
          .order("order_index", { ascending: true });

        if (lessonError) {
          console.info("[LESSON QUERY RESULT]", {
            courseId: currentCourseId,
            found: false,
            error: lessonError.message,
            data: null,
          });
          setError(lessonError.message);
          setLoading(false);
          return;
        }

        lessonRows = lessonData ?? [];
        console.info("[LESSON QUERY RESULT]", {
          courseId: currentCourseId,
          found: true,
          count: lessonRows.length,
        });
      }

      const modules: ModuleDetail[] = (moduleRows ?? []).map((module) => ({
        ...(module as ModuleDetail),
        lessons: lessonRows.filter((lesson) => lesson.module_id === module.id),
      }));

      const nextCourse: GeneratedCourseResponse = {
        ...courseRow,
        learning_outcomes: parseLearningOutcomes(courseRow.learning_outcomes),
        modules,
      };

      setCourse(nextCourse);

      const firstLesson = modules.flatMap((module) => module.lessons)[0];
      setSelectedLessonId((current) => current || firstLesson?.id || "");
      setLoading(false);
    }

    void loadCourse();
  }, [courseId]);

  const selectedLesson = useMemo(() => {
    if (!course) {
      return null;
    }

    return course.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === selectedLessonId) ?? null;
  }, [course, selectedLessonId]);

  const selectedModule = useMemo(() => {
    if (!course || !selectedLesson) {
      return null;
    }

    return course.modules.find((module) => module.id === selectedLesson.module_id) ?? null;
  }, [course, selectedLesson]);

  const selectedLessonCompleted = selectedLesson ? completedLessons.includes(selectedLesson.id) : false;

  useEffect(() => {
    if (!selectedLesson) {
      setQuiz(defaultQuiz);
      return;
    }

    const currentLessonId = selectedLesson.id;

    async function loadQuiz() {
      setQuizLoading(true);
      console.info("[QUIZ QUERY START]", { lessonId: currentLessonId });
      const { data, error } = await supabase
        .from("quizzes")
        .select("questions_json")
        .eq("lesson_id", currentLessonId)
        .order("created_at", { ascending: false })
        .limit(1);

      const quizRow = data?.[0] as { questions_json?: unknown } | undefined;
      if (error || !quizRow) {
        console.info("[QUIZ QUERY RESULT]", {
          lessonId: currentLessonId,
          found: false,
          error: error?.message ?? null,
          data: quizRow ?? null,
        });
        setQuiz(defaultQuiz);
        setQuizLoading(false);
        return;
      }

      console.info("[QUIZ QUERY RESULT]", {
        lessonId: currentLessonId,
        found: true,
        data: quizRow,
      });
      setQuiz(parseQuiz(quizRow.questions_json));
      setQuizLoading(false);
    }

    void loadQuiz();
  }, [selectedLesson]);

  const toggleComplete = () => {
    if (!selectedLesson || !user?.id) {
      return;
    }

    const lessonId = selectedLesson.id;
    const currentUserId = user.id;
    const nextCompleted = !selectedLessonCompleted;

    async function updateProgress() {
      setProgressSaving(true);
      const summary = await markLessonComplete({
        user_id: currentUserId,
        lesson_id: lessonId,
        completed: nextCompleted,
      });

      setCompletedLessons((current) =>
        nextCompleted ? [...new Set([...current, lessonId])] : current.filter((currentLessonId) => currentLessonId !== lessonId)
      );
      setProgressSummary(summary);
      showToast(nextCompleted ? "Lesson marked complete." : "Lesson marked incomplete.", "success");
      setProgressSaving(false);
    }

    void updateProgress();
  };

  if (!courseId) {
    return <p className="text-slate-300">Course not found.</p>;
  }

  if (loading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
          <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-8 w-3/4 animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/10" />
            ))}
          </div>
        </aside>
        <main className="space-y-6">
          <div className="h-72 animate-pulse rounded-[2rem] border border-white/10 bg-white/5 shadow-lg shadow-slate-950/20" />
          <div className="h-80 animate-pulse rounded-[2rem] border border-white/10 bg-white/5 shadow-lg shadow-slate-950/20" />
        </main>
      </div>
    );
  }

  if (error || !course) {
    return <StateCard title="Course unavailable" body={error ?? "Course not found."} tone="error" />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="h-fit rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl xl:sticky xl:top-8">
        <div className="border-b border-white/10 pb-5">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">{course.difficulty}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{course.title}</h2>
          <p className="mt-3 text-sm text-slate-300">{course.topic}</p>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Course Progress</span>
              <span>
                {progressSummary.completed_lessons}/{progressSummary.total_lessons} lessons
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-gradient-to-r from-skyline via-cyan-400 to-violet-500 transition-all" style={{ width: `${progressSummary.percentage}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{progressSummary.percentage}% completed</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-[0.35em] text-slate-300">Modules</h3>
            <span className="text-xs text-slate-400">
              {completedLessons.length}/{course.modules.flatMap((module) => module.lessons).length} complete
            </span>
          </div>

          <div className="space-y-4">
            {course.modules.map((module) => (
              <section key={module.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Module {module.order_index}</p>
                  <h4 className="mt-1 text-base font-semibold text-white">{module.title}</h4>
                </div>

                <div className="space-y-2">
                  {module.lessons.map((lesson) => {
                    const isSelected = lesson.id === selectedLessonId;
                    const isComplete = completedLessons.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setSelectedLessonId(lesson.id)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                          isSelected
                            ? "border-cyan-400/50 bg-cyan-500/10"
                            : "border-white/10 bg-slate-950/40 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Lesson {lesson.order_index}</p>
                            <p className="mt-1 text-sm font-medium text-white">{lesson.title}</p>
                          </div>
                          <span
                            className={`mt-0.5 rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                              isComplete ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-slate-300"
                            }`}
                          >
                            {isComplete ? "Done" : "Open"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </aside>

      <main className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/25 backdrop-blur-xl md:p-8"
        >
          {course.thumbnail_url ? (
            <div className="mb-6 overflow-hidden rounded-[1.5rem] border border-white/10">
              <img src={course.thumbnail_url} alt={course.title} className="h-52 w-full object-cover md:h-72" />
            </div>
          ) : (
            <div className="mb-6 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.25),rgba(6,182,212,0.12),rgba(139,92,246,0.18))] p-8 md:p-12">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">Generated Course</p>
            </div>
          )}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
                {selectedModule ? `Module ${selectedModule.order_index}` : "Lesson"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{selectedLesson?.title ?? "Select a lesson"}</h1>
              <p className="mt-3 max-w-3xl text-slate-300">{selectedLesson?.description ?? "Choose a lesson from the sidebar."}</p>
            </div>

            {selectedLesson ? (
              <button
                type="button"
                onClick={toggleComplete}
                disabled={progressSaving}
                className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                  selectedLessonCompleted
                    ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "bg-gradient-to-r from-skyline via-cyan-400 to-violet-500 text-slate-950 hover:brightness-110"
                } ${progressSaving ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {progressSaving ? "Saving..." : selectedLessonCompleted ? "Lesson Completed" : "Mark Lesson Complete"}
              </button>
            ) : null}
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/45 p-5 md:p-6">
            {selectedLesson?.content ? (
              <article className="whitespace-pre-wrap text-sm leading-8 text-slate-200">{selectedLesson.content}</article>
            ) : (
              <div className="space-y-3 text-slate-300">
                <p className="text-lg font-medium text-white">No lesson content available yet</p>
                <p>This lesson has been created in the course structure, but the generated lesson body has not been saved to Supabase yet.</p>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6 shadow-2xl shadow-slate-950/25 backdrop-blur-xl md:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Quiz Section</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Check understanding</h2>
            </div>
            {quizLoading ? <span className="text-sm text-slate-400">Loading quiz...</span> : null}
          </div>

          {quiz.mcqs.length === 0 && quiz.true_false.length === 0 && quiz.short_answers.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-slate-300">
              No quiz found for this lesson in Supabase yet.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {quiz.mcqs.length > 0 ? (
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Multiple Choice</h3>
                  {quiz.mcqs.map((item, index) => (
                    <article key={`${item.question}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="font-medium text-white">
                        {index + 1}. {item.question}
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-slate-300">
                        {item.options.map((option) => (
                          <li key={option} className="rounded-2xl border border-white/10 px-3 py-2">
                            {option}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 text-sm text-cyan-300">Correct answer: {item.correct_answer}</p>
                      <p className="mt-2 text-sm text-slate-300">{item.explanation}</p>
                    </article>
                  ))}
                </section>
              ) : null}

              {quiz.true_false.length > 0 ? (
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">True / False</h3>
                  {quiz.true_false.map((item, index) => (
                    <article key={`${item.question}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="font-medium text-white">
                        {index + 1}. {item.question}
                      </p>
                      <p className="mt-4 text-sm text-cyan-300">Correct answer: {item.correct_answer ? "True" : "False"}</p>
                      <p className="mt-2 text-sm text-slate-300">{item.explanation}</p>
                    </article>
                  ))}
                </section>
              ) : null}

              {quiz.short_answers.length > 0 ? (
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Short Answer</h3>
                  {quiz.short_answers.map((item, index) => (
                    <article key={`${item.question}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="font-medium text-white">
                        {index + 1}. {item.question}
                      </p>
                      <p className="mt-4 text-sm text-cyan-300">Sample answer:</p>
                      <p className="mt-1 text-sm text-slate-200">{item.sample_answer}</p>
                      <p className="mt-3 text-sm text-slate-300">{item.explanation}</p>
                    </article>
                  ))}
                </section>
              ) : null}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
