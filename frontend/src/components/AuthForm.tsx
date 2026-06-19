import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "../hooks/useToast";

type AuthFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
};

export function AuthForm({ title, subtitle, submitLabel, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onSubmit(email, password);
      showToast(`${submitLabel} successful.`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl"
    >
      <h1 className="text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-2 mb-6 text-sm leading-6 text-slate-300">{subtitle}</p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-skyline/70"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-skyline/70"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button
          className="w-full rounded-2xl bg-gradient-to-r from-skyline via-cyan-400 to-violet-500 px-4 py-3 font-medium text-slate-950 transition hover:brightness-110 disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading ? "Please wait..." : submitLabel}
        </button>
      </form>
    </motion.div>
  );
}
