import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="mx-auto flex max-w-7xl justify-end">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="self-center">
          <p className="mb-3 text-sm uppercase tracking-[0.45em] text-cyan-300">CourseForge AI</p>
          <h1 className="mb-4 text-5xl font-semibold leading-tight text-white md:text-6xl">
            A premium workspace for building complete AI courses.
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            Generate lessons, quizzes, and learner analytics from one polished dashboard powered by Supabase and Gemini.
          </p>
        </section>
        <div className="flex justify-center">
          <div>
            <AuthForm
              title="Welcome back"
              subtitle="Sign in to manage your AI-generated course library."
              submitLabel="Login"
              onSubmit={async (email, password) => {
                await signIn({ email, password });
                navigate("/dashboard");
              }}
            />
            <p className="mt-4 text-center text-sm text-slate-300">
              New here?{" "}
              <Link className="text-cyan-300 transition hover:text-cyan-200" to="/signup">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
