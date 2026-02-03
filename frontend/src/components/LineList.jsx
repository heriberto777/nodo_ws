import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function LineList({
  lines,
  onConnect,
  onDisconnect,
  onUpdateWebhook,
  onUpdateRateLimit,
  onSelect,
  onDiagnose,
  onDelete,
  onResetSafeMode,
  onShowQr,
  disabled,
  searchTerm = ""
}) {
  const [stats, setStats] = useState({});
  
  // Filter lines by search term
  const filteredLines = lines.filter(line => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (line.name?.toLowerCase().includes(searchLower)) ||
      (line.phone?.toLowerCase().includes(searchLower)) ||
      (line.lineId?.toLowerCase().includes(searchLower))
    );
  });

  useEffect(() => {
    const fetchStats = async () => {
      const newStats = {};
      for (const line of lines) {
        try {
          const response = await api.get(`/lines/${line.id || line.lineId}/stats`);
          if (response.status === 200) {
            newStats[line.id || line.lineId] = response.data;
          }
        } catch (error) {
          console.error(`Error fetching stats for line ${line.id}:`, error);
        }
      }
      setStats(newStats);
    };

    if (lines.length > 0) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000); // Refrescar cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [lines]);

  if (!filteredLines.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/30 py-8 text-center">
        <p className="text-slate-400">
          {lines.length === 0 ? "No hay líneas registradas." : "No se encontraron líneas que coincidan con tu búsqueda."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredLines.map((line) => {
        const lineStats = stats[line.id || line.lineId] || { chats: 0, contacts: 0 };
        const isConnected = line.status === "CONNECTED";

        return (
          <div
            key={line.id || line.lineId}
            className="relative flex flex-col rounded-lg border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-lg transition-all hover:border-slate-600 hover:shadow-xl"
          >
            {/* Header con nombre */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Línea</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{line.name || "Línea"}</h3>
              </div>
              {isConnected && (
                <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></span>
              )}
            </div>

            {/* Teléfono y estado */}
            <div className="mb-4 flex items-center gap-3">
              <p className="text-2xl font-bold text-slate-100">{line.phone || line.lineId}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs uppercase font-semibold tracking-widest ${
                  isConnected
                    ? "bg-emerald-500/20 text-emerald-300"
                    : line.status === "QR"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-slate-700/40 text-slate-400"
                }`}
              >
                {isConnected ? "Conectado" : line.status || "Desconectado"}
              </span>
            </div>

            {/* Stats - Conversaciones y Contactos */}
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-700/30 p-3 text-center">
                <p className="text-sm text-slate-400">Conversaciones</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">{lineStats.chats}</p>
              </div>
              <div className="rounded-lg bg-slate-700/30 p-3 text-center">
                <p className="text-sm text-slate-400">Contactos</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">{lineStats.contacts}</p>
              </div>
            </div>

            {/* Safe mode warning */}
            {line.safeMode?.active && (
              <p className="mb-3 rounded bg-rose-500/10 px-2 py-1 text-xs text-rose-300">
                ⚠️ Safe mode: {line.safeMode.reason || "Activo"}
              </p>
            )}

            {/* Webhook info */}
            {line.n8n_webhook_url && (
              <p className="mb-3 truncate text-xs text-slate-500">
                Webhook: {line.n8n_webhook_url}
              </p>
            )}

            {/* Botones */}
            <div className="flex flex-wrap gap-2">
              {isConnected && onShowQr && (
                <button
                  onClick={() => onShowQr(line.id || line.lineId)}
                  disabled={disabled}
                  className="flex-1 rounded bg-purple-500/20 px-2 py-2 text-xs font-medium text-purple-300 hover:bg-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  title="Mostrar código QR"
                >
                  QR
                </button>
              )}
              {onSelect && (
                <button
                  onClick={() => onSelect(line.id || line.lineId)}
                  disabled={disabled}
                  className="flex-1 rounded bg-slate-700/50 px-2 py-2 text-xs font-medium text-slate-300 hover:bg-slate-600/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Config
                </button>
              )}
              {onDiagnose && (
                <button
                  onClick={() => onDiagnose(line.id || line.lineId)}
                  disabled={disabled}
                  className="flex-1 rounded bg-slate-700/50 px-2 py-2 text-xs font-medium text-slate-300 hover:bg-slate-600/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Diagnóstico
                </button>
              )}
              {onResetSafeMode && line.safeMode?.active && (
                <button
                  onClick={() => onResetSafeMode(line.id || line.lineId)}
                  disabled={disabled}
                  className="flex-1 rounded bg-amber-500/20 px-2 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset Safe
                </button>
              )}
              <button
                onClick={() => onConnect(line.id || line.lineId)}
                disabled={disabled || isConnected}
                className="flex-1 rounded bg-emerald-500/20 px-2 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Conectar
              </button>
              <button
                onClick={() => onDisconnect(line.id || line.lineId)}
                disabled={disabled || !isConnected}
                className="flex-1 rounded bg-slate-600/50 px-2 py-2 text-xs font-medium text-slate-300 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Desconectar
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(line.id || line.lineId)}
                  disabled={disabled}
                  className="flex-1 rounded bg-rose-500/20 px-2 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
