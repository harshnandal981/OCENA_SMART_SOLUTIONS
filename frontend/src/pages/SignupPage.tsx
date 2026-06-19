import { Link, useNavigate } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  return (
    <div className="min-h-screen px-6 py-6">
      <div className="mx-auto flex max-w-7xl justify-end">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="self-center">
          <p className="mb-3 text-sm uppercase tracking-[0.45em] text-violet-300">Launch your academy</p>
          <h1 className="mb-4 text-5xl font-semibold leading-tight text-white md:text-6xl">
            Build a complete AI-powered course platform in minutes.
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            Start with authentication, then generate reusable course content from a single prompt and publish it instantly.
          </p>
        </section>
        <div className="flex justify-center">
          <div>
            <AuthForm
              title="Create account"
              subtitle="Join CourseForge AI and start generating polished online courses."
              submitLabel="Sign Up"
              onSubmit={async (email, password) => {
                await signUp({ email, password });
                navigate("/dashboard");
              }}
            />
            <p className="mt-4 text-center text-sm text-slate-300">
              Already registered?{" "}
              <Link className="text-cyan-300 transition hover:text-cyan-200" to="/login">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
