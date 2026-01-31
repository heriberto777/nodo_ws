export default function Modal({ open, title, children, onClose, onConfirm, confirmLabel = "Guardar" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-4">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded bg-slate-800 px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
