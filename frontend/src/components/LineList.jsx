export default function LineList({ lines, onConnect, onDisconnect, disabled }) {
  if (!lines.length) {
    return <p className="text-slate-400">No hay líneas registradas.</p>;
  }

  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <div
          key={line.id || line.lineId}
          className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 p-4"
        >
          <div>
            <p className="text-sm text-slate-400">{line.name || "Línea"}</p>
            <p className="text-lg font-semibold">{line.phone || line.lineId}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onConnect(line.id || line.lineId)}
              disabled={disabled}
              className="rounded bg-emerald-500 px-3 py-2 text-xs text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Conectar
            </button>
            <button
              onClick={() => onDisconnect(line.id || line.lineId)}
              disabled={disabled}
              className="rounded bg-slate-700 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              Desconectar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
