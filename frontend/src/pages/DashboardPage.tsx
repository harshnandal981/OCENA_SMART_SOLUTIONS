import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { CourseCard } from "../components/CourseCard";
import { StateCard } from "../components/StateCard";
import { useUser } from "../hooks/useUser";
import { getCourseProgress } from "../lib/api";
import { useToast } from "../hooks/useToast";
import type { CourseProgressSummary, CourseSummary } from "../types/course";

export function DashboardPage() {
  const { user } = useUser();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [progressByCourse, setProgressByCourse] = useState<Record<string, CourseProgressSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string>("");
  const { showToast } = useToast();

  useEffect(() => {
    async function loadCourses() {
      setError(null);
      setLoading(true);
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, difficulty, audience, thumbnail_url, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else if (data) {
        setCourses(data as CourseSummary[]);
        if (user?.id) {
          const progressEntries = await Promise.all(
            (data as CourseSummary[]).map(async (course) => [
              course.id,
              await getCourseProgress(course.id, user.id),
            ] as const)
          );
          setProgressByCourse(Object.fromEntries(progressEntries));
        }
      }
      setLoading(false);
    }

    void loadCourses();
  }, [user?.id]);

  const totalCourses = courses.length;
  const completedLessons = Object.values(progressByCourse).reduce(
    (sum, item) => sum + item.completed_lessons,
    0
  );
  const totalLessons = Object.values(progressByCourse).reduce(
    (sum, item) => sum + item.total_lessons,
    0
  );
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const handleDeleteCourse = async (courseId: string) => {
    const confirmed = window.confirm("Delete this course and all of its modules, lessons, quizzes, and progress?");
    if (!confirmed) {
      return;
    }

    setDeletingCourseId(courseId);
    const { error: deleteError } = await supabase.from("courses").delete().eq("id", courseId);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingCourseId("");
      showToast(deleteError.message, "error");
      return;
    }

    setCourses((current) => current.filter((course) => course.id !== courseId));
    setProgressByCourse((current) => {
      const next = { ...current };
      delete next[courseId];
      return next;
    });
    setDeletingCourseId("");
    showToast("Course deleted.", "success");
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl">
        <div className="grid gap-8 px-8 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.4em] text-cyan-300">Dashboard</p>
            <h2 className="max-w-3xl text-4xl font-semibold text-white md:text-5xl">
              Build, track, and continue every AI-generated course in one place.
            </h2>
            <p className="mt-4 max-w-2xl text-slate-300">
              CourseForge gives you a live view of curriculum progress, lesson completion, and the fastest way back into your active courses.
            </p>
            <p className="mt-3 text-sm text-slate-400">Signed in as {user?.email}</p>
            <div className="mt-6">
              <Link
                to="/create-course"
                className="inline-flex rounded-full bg-gradient-to-r from-skyline via-cyan-400 to-violet-500 px-5 py-3 text-center font-medium text-slate-950 transition hover:brightness-110"
              >
                Create Course
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <article className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 shadow-lg shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total Courses</p>
              <p className="mt-4 text-4xl font-semibold text-white">{totalCourses}</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 shadow-lg shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Completed Lessons</p>
              <p className="mt-4 text-4xl font-semibold text-white">{completedLessons}</p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 shadow-lg shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Progress %</p>
              <p className="mt-4 text-4xl font-semibold text-white">{overallProgress}%</p>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-gradient-to-r from-skyline to-glow" style={{ width: `${overallProgress}%` }} />
              </div>
            </article>
          </div>
        </div>
      </section>

        {loading ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-[2rem] border border-white/10 bg-white/5 shadow-lg shadow-slate-950/20" />
            ))}
          </section>
        ) : error ? (
        <StateCard title="Unable to load dashboard" body={error} tone="error" />
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center shadow-lg shadow-slate-950/20 backdrop-blur-xl">
          <h3 className="mb-2 text-2xl font-semibold text-white">No courses yet</h3>
          <p className="mb-6 text-slate-300">Create your first AI-generated course to populate the dashboard.</p>
          <Link to="/create-course" className="rounded-full border border-skyline/50 px-5 py-3 text-cyan-300">
            Start a new course
          </Link>
        </div>
      ) : (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Course Library</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Continue where you left off</h3>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <motion.div key={course.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <CourseCard
                  course={course}
                  progress={progressByCourse[course.id]}
                  onDelete={handleDeleteCourse}
                  deleting={deletingCourseId === course.id}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
