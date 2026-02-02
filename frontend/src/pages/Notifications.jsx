import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Notifications() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const response = await api.get("/notifications", { params: { limit: 200 } });
    setItems(response.data);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    load();
    window.dispatchEvent(new Event("wa:notifications-updated"));
  };

  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
    window.dispatchEvent(new Event("wa:notifications-updated"));
  };

  const clearAll = async () => {
    await api.post("/notifications/clear");
    load();
    window.dispatchEvent(new Event("wa:notifications-updated"));
  };

  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        <div className="flex gap-2">
          <button
            onClick={markAll}
            className="rounded bg-slate-800 px-3 py-2 text-xs"
          >
            Marcar todas
          </button>
          <button
            onClick={clearAll}
            className="rounded bg-rose-500 px-3 py-2 text-xs text-white"
          >
            Limpiar
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded p-3 text-sm ${
              item.severity === "HIGH"
                ? "bg-rose-950/60 text-rose-100"
                : "bg-amber-950/50 text-amber-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {item.type} · Línea {item.line_id}
                </div>
                <div className="text-xs opacity-80">{item.message || ""}</div>
              </div>
              <div className="text-xs opacity-70">{item.created_at}</div>
            </div>
            {!item.is_read && (
              <button
                onClick={() => markRead(item.id)}
                className="mt-2 rounded bg-slate-800 px-2 py-1 text-xs"
              >
                Marcar leído
              </button>
            )}
          </div>
        ))}
        {!items.length && <p className="text-xs text-slate-400">Sin notificaciones.</p>}
      </div>
    </div>
  );
}
