import { createContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (title: string, tone?: ToastTone) => void;
};

export const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const value = useMemo(
    () => ({
      showToast: (title: string, tone: ToastTone = "info") => {
        const id = crypto.randomUUID();
        setToasts((current) => [...current, { id, title, tone }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3200);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="w-full max-w-md space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${
                toast.tone === "success"
                  ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                  : toast.tone === "error"
                    ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
                    : "border-sky-400/30 bg-sky-500/15 text-sky-100"
              }`}
            >
              <p className="text-sm font-medium">{toast.title}</p>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
