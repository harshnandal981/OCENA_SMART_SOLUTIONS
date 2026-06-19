import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { generateCourse } from "../lib/api";
import { StateCard } from "../components/StateCard";
import { useToast } from "../hooks/useToast";

const progressSteps = [
  "Generating Curriculum",
  "Creating Modules",
  "Writing Lessons",
  "Generating Quizzes",
  "Saving Course",
] as const;

export function CreateCoursePage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState<number>(-1);
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setActiveStep(0);

    const stepTimer = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= progressSteps.length - 1) {
          window.clearInterval(stepTimer);
          return current;
        }

        return current + 1;
      });
    }, 900);

    try {
      const course = await generateCourse({ topic, audience, difficulty });
      console.info("[COURSE GENERATED]", { generatedCourseId: course.id });
      window.clearInterval(stepTimer);
      setActiveStep(progressSteps.length - 1);
      showToast("Course generated successfully.", "success");
      const nextUrl = `/courses/${course.id}`;
      console.info("[COURSE NAVIGATION]", { nextUrl, generatedCourseId: course.id });
      navigate(nextUrl);
    } catch (err) {
      window.clearInterval(stepTimer);
      const message = err instanceof Error ? err.message : "Unable to generate course";
      setError(message);
      showToast(message, "error");
      setActiveStep(-1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
      <section className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/25 backdrop-blur-xl">
        <div>
          <p className="mb-2 text-sm uppercase tracking-[0.45em] text-cyan-300">Create Course</p>
          <h2 className="text-4xl font-semibold text-white">
            Shape the brief and let AI build the curriculum.
          </h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            Start with a topic, audience, and difficulty level. CourseForge AI will generate a structured course, complete lesson content and quizzes, then save everything before sending you to the details page.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">ETA</p>
            <p className="mt-3 text-3xl font-semibold text-white">2-4 min</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Coverage</p>
            <p className="mt-3 text-3xl font-semibold text-white">Lessons + Quizzes</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">State</p>
            <p className="mt-3 text-3xl font-semibold text-white">{loading ? "Live" : "Ready"}</p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/50 p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-violet-300">Generation timeline</p>
          <div className="mt-5 space-y-3">
            {progressSteps.map((step, index) => {
              const isComplete = activeStep > index;
              const isActive = activeStep === index;

              return (
                <motion.div
                  key={step}
                  animate={{ opacity: isComplete || isActive ? 1 : 0.75, x: isActive ? 2 : 0 }}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-3 transition ${
                    isComplete
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                      : isActive
                        ? "border-cyan-400/40 bg-cyan-500/10 text-white shadow-lg shadow-cyan-950/20"
                        : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current text-sm font-medium">
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step}</p>
                    <p className="text-xs uppercase tracking-[0.28em] text-current/70">
                      {isComplete ? "Completed" : isActive ? "Working now" : "Queued"}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="ml-auto rounded-full border border-cyan-400/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">
                      Live
                    </span>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <form className="space-y-5 rounded-[2rem] border border-white/10 bg-slate-950/55 p-8 shadow-2xl shadow-slate-950/35 backdrop-blur-xl" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Topic</label>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Prompt engineering for support teams"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Audience</label>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="New customer success managers"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-slate-300">Difficulty Level</label>
          <select
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>

        {error ? <StateCard title="Course generation failed" body={error} tone="error" /> : null}

        <button
          className="w-full rounded-full bg-gradient-to-r from-skyline via-cyan-400 to-violet-500 px-5 py-3 font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          type="submit"
          disabled={loading}
        >
          {loading ? "Generating course..." : "Generate Course"}
        </button>
      </form>
    </div>
  );
}
