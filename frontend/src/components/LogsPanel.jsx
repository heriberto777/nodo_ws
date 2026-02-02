export default function LogsPanel({ logs, lineMap, onDeleteLine }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">Eventos recientes</p>
      <ul className="app-scroll mt-3 max-h-72 space-y-2 overflow-auto text-xs text-slate-300">
        {logs.map((log, index) => (
          <li key={index} className="border-b border-slate-800 pb-2">
            <p className="font-semibold">
              {lineMap?.[log.lineId]?.name || `Línea ${log.lineId}`}
            </p>
            <p className="text-slate-400">
              {log.author || log.from} · {log.body}
            </p>
            {onDeleteLine && (
              <button
                onClick={() => onDeleteLine(log.lineId)}
                className="mt-2 rounded bg-rose-500 px-2 py-1 text-[10px] text-white"
              >
                Eliminar línea
              </button>
            )}
          </li>
        ))}
        {!logs.length && <li className="text-slate-500">Sin eventos</li>}
      </ul>
    </div>
  );
}
