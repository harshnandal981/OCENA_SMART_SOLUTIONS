export function StateCard({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={`rounded-3xl border p-6 ${
        tone === "error"
          ? "border-rose-400/30 bg-rose-500/10 text-rose-100 shadow-lg shadow-rose-950/20"
          : "border-white/10 bg-white/5 text-slate-300 shadow-lg shadow-slate-950/20 backdrop-blur"
      }`}
    >
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6">{body}</p>
    </div>
  );
}
