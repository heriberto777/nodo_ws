export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[240px] rounded border px-4 py-3 text-sm shadow-lg ${
            toast.severity === "HIGH"
              ? "border-rose-500/60 bg-rose-950/80 text-rose-100"
              : "border-amber-500/60 bg-amber-950/80 text-amber-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{toast.type}</div>
              <div className="text-xs opacity-80">Línea {toast.lineId}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
