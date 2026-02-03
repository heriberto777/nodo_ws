import Modal from "./Modal";

export default function RecentEventsModal({ open, onClose, events, lineMap }) {
  const getLineName = (lineId) => {
    return lineMap[lineId]?.name || `Línea ${lineId}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <Modal
      open={open}
      title="Eventos Recientes"
      onClose={onClose}
      onConfirm={onClose}
      confirmLabel="Cerrar"
    >
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {events && events.length > 0 ? (
          events.slice(0, 20).map((event, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-sm"
            >
              <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">
                    {getLineName(event.lineId || event.line_id)}
                  </span>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {formatTime(event.timestamp || event.created_at)}
                  </span>
                </div>
                <p className="break-words text-slate-400 text-xs">
                  {event.body || event.message || "Evento registrado"}
                </p>
                {event.from && (
                  <p className="text-xs text-slate-500">
                    De: {event.from || event.from_number}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg bg-slate-800/30 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">No hay eventos recientes</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
