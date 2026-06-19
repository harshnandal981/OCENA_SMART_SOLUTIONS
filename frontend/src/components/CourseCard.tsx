import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { CourseProgressSummary, CourseSummary } from "../types/course";

function buildThumbnailSeed(title: string) {
  const palettes = [
    "from-sky-500/35 via-cyan-400/10 to-transparent",
    "from-amber-400/35 via-orange-300/10 to-transparent",
    "from-emerald-400/35 via-teal-300/10 to-transparent",
    "from-rose-400/35 via-pink-300/10 to-transparent",
  ];

  const index = title.length % palettes.length;
  return palettes[index];
}

function getAudienceLabel(audience?: string) {
  if (!audience) {
    return "Learners";
  }

  return audience.length > 18 ? `${audience.slice(0, 18)}...` : audience;
}

export function CourseCard({
  course,
  progress,
  onDelete,
  deleting,
}: {
  course: CourseSummary;
  progress?: CourseProgressSummary;
  onDelete: (courseId: string) => void;
  deleting?: boolean;
}) {
  const navigate = useNavigate();
  const thumbnailPalette = buildThumbnailSeed(course.title);

  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/20 backdrop-blur"
    >
      <div className={`relative h-44 bg-gradient-to-br ${thumbnailPalette}`}>
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/15 bg-slate-950/45 px-3 py-1 text-xs uppercase tracking-[0.3em] text-skyline">
              {course.difficulty ?? "Course"}
            </span>
            <span className="rounded-full border border-white/15 bg-slate-950/45 px-3 py-1 text-xs text-slate-200">
              {getAudienceLabel(course.audience)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-white">{course.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{course.description}</p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-400">
            <span>Progress</span>
            <span>{progress?.percentage ?? 0}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-skyline to-glow transition-all"
              style={{ width: `${progress?.percentage ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {progress?.completed_lessons ?? 0} of {progress?.total_lessons ?? 0} lessons completed
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate(`/course/${course.id}`)}
            className="rounded-full bg-gradient-to-r from-skyline to-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-110"
          >
            Continue Course
          </button>
          <button
            type="button"
            onClick={() => navigate(`/courses/${course.id}`)}
            className="rounded-full border border-white/15 px-4 py-3 text-sm text-white transition hover:border-skyline hover:text-skyline"
          >
            View Course
          </button>
          <button
            type="button"
            onClick={() => onDelete(course.id)}
            disabled={deleting}
            className="rounded-full border border-rose-400/25 px-4 py-3 text-sm text-rose-200 transition hover:border-rose-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete Course"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
