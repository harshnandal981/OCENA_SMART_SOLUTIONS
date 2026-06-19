import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { ThemeToggle } from "./ThemeToggle";

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button className="text-left" onClick={() => navigate("/dashboard")}>
            <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">CourseForge AI</p>
            <h1 className="text-lg font-semibold text-white md:text-xl">
              Generate complete online courses with confidence
            </h1>
          </button>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <p className="hidden text-sm text-slate-300 md:block">{user?.email}</p>
            <button
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-skyline/60 hover:text-white"
              onClick={async () => {
                await signOut();
                showToast("Signed out successfully.", "info");
                navigate("/login");
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
