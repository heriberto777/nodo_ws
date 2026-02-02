export default function LineList({
  lines,
  onConnect,
  onDisconnect,
  onUpdateWebhook,
  onUpdateRateLimit,
  onSelect,
  onDelete,
  onResetSafeMode,
  onShowQr,
  disabled
}) {
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
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">{line.phone || line.lineId}</p>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  line.status === "CONNECTED" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                }`}
              />
              <span
                className={`rounded px-2 py-1 text-[10px] uppercase tracking-wider ${
                  line.status === "CONNECTED"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : line.status === "QR"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-slate-700/40 text-slate-300"
                }`}
              >
                {line.status || "CREATED"}
              </span>
            </div>
            {line.n8n_webhook_url && (
              <p className="text-xs text-slate-500">Webhook: {line.n8n_webhook_url}</p>
            )}
            {line.safeMode?.active && (
              <p className="mt-1 text-xs text-rose-400">
                Safe mode activo{line.safeMode.reason ? ` (${line.safeMode.reason})` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {onSelect && (
              <button
                onClick={() => onSelect(line.id || line.lineId)}
                disabled={disabled}
                className="rounded bg-slate-800 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                Config
              </button>
            )}
            <button
              onClick={() => onConnect(line.id || line.lineId)}
              disabled={disabled}
              className="rounded bg-emerald-500 px-3 py-2 text-xs text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Conectar
            </button>
            {onShowQr && (
              <button
                onClick={() => onShowQr(line.id || line.lineId)}
                disabled={disabled}
                className="rounded bg-amber-500 px-3 py-2 text-xs text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                QR
              </button>
            )}
            <button
              onClick={() => onDisconnect(line.id || line.lineId)}
              disabled={disabled}
              className="rounded bg-slate-700 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              Desconectar
            </button>
            {onUpdateWebhook && (
              <button
                onClick={() => onUpdateWebhook(line.id || line.lineId)}
                disabled={disabled}
                className="rounded bg-slate-800 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                Webhook
              </button>
            )}
            {onUpdateRateLimit && (
              <button
                onClick={() => onUpdateRateLimit(line.id || line.lineId)}
                disabled={disabled}
                className="rounded bg-slate-800 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                Rate
              </button>
            )}
            {onResetSafeMode && line.safeMode?.active && (
              <button
                onClick={() => onResetSafeMode(line.id || line.lineId)}
                disabled={disabled}
                className="rounded bg-amber-500 px-3 py-2 text-xs text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Safe
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(line.id || line.lineId)}
                disabled={disabled}
                className="rounded bg-rose-500 px-3 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
