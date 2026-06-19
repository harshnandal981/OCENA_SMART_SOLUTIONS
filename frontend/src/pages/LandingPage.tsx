import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";

const features = [
  {
    title: "Curriculum generation",
    body: "Transform a single topic into modules, lessons, quizzes, and a polished course structure.",
  },
  {
    title: "Learner analytics",
    body: "Track completion, progress, and lesson-level status from one premium dashboard.",
  },
  {
    title: "Fast publishing",
    body: "Move from idea to live course in minutes with reliable AI and Supabase persistence.",
  },
];

const stats = [
  { value: "5-8", label: "modules per course" },
  { value: "3-5", label: "lessons per module" },
  { value: "100%", label: "generated with quiz coverage" },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[linear-gradient(180deg,rgba(2,6,23,0.7),transparent)]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">CourseForge AI</p>
            <p className="mt-1 text-sm text-slate-300">Premium AI course creation for modern teams</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-skyline/60 hover:bg-white/5">
              Login
            </Link>
            <Link to="/signup" className="rounded-full bg-gradient-to-r from-skyline via-cyan-400 to-violet-500 px-4 py-2 text-sm font-medium text-slate-950">
              Get Started
            </Link>
          </div>
        </header>

        <main className="grid gap-10 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <section className="self-center">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 inline-flex rounded-full border border-skyline/25 bg-skyline/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200"
            >
              Premium AI Course Builder
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="max-w-4xl text-5xl font-semibold leading-tight text-white md:text-7xl"
            >
              Build a premium learning product from one prompt.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-6 max-w-2xl text-lg leading-8 text-slate-300"
            >
              CourseForge AI helps creators, educators, and teams generate structured learning experiences with lessons, quizzes, thumbnails, and progress tracking in a polished SaaS workspace.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link to="/signup" className="rounded-full bg-gradient-to-r from-skyline via-cyan-400 to-violet-500 px-6 py-3 font-medium text-slate-950">
                Start Building
              </Link>
              <Link to="/login" className="rounded-full border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition hover:border-skyline/60 hover:bg-white/10">
                Open Dashboard
              </Link>
            </motion.div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.06 }}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl"
                >
                  <p className="text-3xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-300">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="grid gap-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">What you get</p>
              <div className="mt-5 space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + index * 0.06 }}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                  >
                    <p className="text-base font-medium text-white">{feature.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{feature.body}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(8,47,73,0.72),rgba(88,28,135,0.75))] p-6 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Designed for velocity</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-3xl font-semibold">5 steps</p>
                  <p className="mt-2 text-sm text-slate-300">Curriculum, modules, lessons, quizzes, save</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-3xl font-semibold">Live</p>
                  <p className="mt-2 text-sm text-slate-300">Status updates, progress, and completion tracking</p>
                </div>
              </div>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}
