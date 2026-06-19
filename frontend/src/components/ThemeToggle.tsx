import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 shadow-lg shadow-slate-950/20 backdrop-blur transition hover:border-skyline/60 hover:bg-white/10 hover:text-white"
    >
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
