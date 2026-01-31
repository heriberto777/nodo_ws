import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import LineList from "../components/LineList.jsx";
import QRCodePanel from "../components/QRCodePanel.jsx";

export default function Lines({ statusList, qrState, user }) {
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", n8nWebhookUrl: "" });
  const canManageLines = user?.role === "admin";
  const canOperateLines = user?.role === "admin" || user?.role === "operator";

  const loadLines = async () => {
    const response = await api.get("/lines");
    setLines(response.data);
  };

  useEffect(() => {
    loadLines();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.phone) return;
    await api.post("/lines", form);
    setForm({ name: "", phone: "", n8nWebhookUrl: "" });
    loadLines();
  };

  const handleConnect = async (lineId) => {
    try {
      await api.post(`/lines/${lineId}/connect`);
    } catch (error) {
      if (error?.response?.status === 409) {
        return;
      }
      throw error;
    }
  };

  const handleDisconnect = async (lineId) => {
    await api.post(`/lines/${lineId}/disconnect`);
  };

  const handleUpdateWebhook = async (lineId) => {
    const current = mergedLines.find((line) => `${line.id}` === `${lineId}`);
    const webhook = window.prompt("Webhook n8n para esta línea", current?.n8n_webhook_url || "");
    if (webhook === null) return;
    await api.put(`/lines/${lineId}/webhook`, { n8nWebhookUrl: webhook });
    loadLines();
  };

  const handleUpdateRateLimit = async (lineId) => {
    const current = mergedLines.find((line) => `${line.id}` === `${lineId}`) || {};
    const perMinute = window.prompt("Mensajes por minuto", current.rate_limit_minute || 15);
    if (perMinute === null) return;
    const perHour = window.prompt("Mensajes por hora", current.rate_limit_hour || 300);
    if (perHour === null) return;
    const perDay = window.prompt("Mensajes por día", current.rate_limit_day || 1000);
    if (perDay === null) return;

    await api.put(`/lines/${lineId}/ratelimit`, {
      rateLimitMinute: Number(perMinute),
      rateLimitHour: Number(perHour),
      rateLimitDay: Number(perDay)
    });
    loadLines();
  };

  const statusMap = statusList.reduce((acc, status) => {
    acc[status.lineId] = status.status;
    return acc;
  }, {});

  const mergedLines = lines.map((line) => ({
    ...line,
    status: statusMap[line.id] || line.status
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSubmit} className="rounded border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Crear línea</h2>
          {!canManageLines && (
            <p className="mt-2 text-xs text-slate-400">
              Solo administradores pueden crear líneas.
            </p>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Nombre"
              className="rounded bg-slate-800 px-3 py-2 text-sm"
              disabled={!canManageLines}
            />
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="Número"
              className="rounded bg-slate-800 px-3 py-2 text-sm"
              disabled={!canManageLines}
            />
            <input
              value={form.n8nWebhookUrl}
              onChange={(event) => setForm({ ...form, n8nWebhookUrl: event.target.value })}
              placeholder="Webhook n8n (opcional)"
              className="rounded bg-slate-800 px-3 py-2 text-sm md:col-span-2"
              disabled={!canManageLines}
            />
          </div>
          <button
            disabled={!canManageLines}
            className="mt-4 rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Guardar
          </button>
        </form>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Líneas registradas</h2>
          {!canOperateLines && (
            <p className="text-xs text-slate-400">
              Tu rol no permite conectar o desconectar líneas.
            </p>
          )}
          <LineList
            lines={mergedLines}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onUpdateWebhook={handleUpdateWebhook}
            onUpdateRateLimit={handleUpdateRateLimit}
            disabled={!canOperateLines}
          />
        </div>
      </div>

      <QRCodePanel qrState={qrState} />
    </div>
  );
}
