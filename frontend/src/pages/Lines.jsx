import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import LineList from "../components/LineList.jsx";
import QRCodePanel from "../components/QRCodePanel.jsx";
import Modal from "../components/Modal.jsx";

export default function Lines({ statusList, qrState, user }) {
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", n8nWebhookUrl: "" });
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [lineSettings, setLineSettings] = useState(null);
  const [settingsStatus, setSettingsStatus] = useState(null);
  const [modal, setModal] = useState({ type: null, line: null });
  const [webhookValue, setWebhookValue] = useState("");
  const [rateValues, setRateValues] = useState({ perMinute: "", perHour: "", perDay: "" });
  const canManageLines = user?.role === "admin";
  const canOperateLines = user?.role === "admin" || user?.role === "operator";

  const loadLines = async () => {
    const response = await api.get("/lines");
    setLines(response.data);
  };

  useEffect(() => {
    loadLines();
    const intervalId = setInterval(() => {
      loadLines();
    }, 5000);

    return () => clearInterval(intervalId);
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
      loadLines();
    } catch (error) {
      if (error?.response?.status === 409) {
        loadLines();
        return;
      }
      throw error;
    }
  };

  const handleDisconnect = async (lineId) => {
    await api.post(`/lines/${lineId}/disconnect`);
    loadLines();
  };

  const handleUpdateWebhook = async (lineId) => {
    const current = mergedLines.find((line) => `${line.id}` === `${lineId}`);
    setWebhookValue(current?.n8n_webhook_url || "");
    setModal({ type: "webhook", line: current });
  };

  const handleUpdateRateLimit = async (lineId) => {
    const current = mergedLines.find((line) => `${line.id}` === `${lineId}`) || {};
    setRateValues({
      perMinute: current.rate_limit_minute || 15,
      perHour: current.rate_limit_hour || 300,
      perDay: current.rate_limit_day || 1000
    });
    setModal({ type: "ratelimit", line: current });
  };

  const statusMap = statusList.reduce((acc, status) => {
    acc[status.lineId] = status.status;
    return acc;
  }, {});

  const mergedLines = lines.map((line) => ({
    ...line,
    status: statusMap[line.id] || line.status
  }));

  const handleSelectLine = (lineId) => {
    setSelectedLineId(lineId);
    api
      .get(`/lines/${lineId}/settings`)
      .then((response) => {
        setLineSettings({
          webhookEnabled: response.data.webhookEnabled,
          webhookBase64: response.data.webhookBase64,
          n8nWebhookUrl: response.data.n8nWebhookUrl || "",
          ignoreGroups: response.data.ignoreGroups,
          readMessages: response.data.readMessages,
          rateLimitMinute: response.data.rateLimitMinute,
          rateLimitHour: response.data.rateLimitHour,
          rateLimitDay: response.data.rateLimitDay
        });
      })
      .catch(() => {
        setLineSettings(null);
      });
  };

  const handleDeleteLine = async (lineId) => {
    const current = mergedLines.find((line) => `${line.id}` === `${lineId}`);
    setModal({ type: "delete", line: current });
  };

  const handleResetSafeMode = async (lineId) => {
    await api.post(`/lines/${lineId}/safe-mode/reset`);
    loadLines();
  };

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
            onSelect={handleSelectLine}
            onResetSafeMode={canManageLines ? handleResetSafeMode : null}
            onDelete={canManageLines ? handleDeleteLine : null}
            disabled={!canOperateLines}
          />
        </div>
      </div>

      {selectedLineId && lineSettings && (
        <div className="rounded border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-lg font-semibold">Configuración por línea</h3>
          <p className="text-xs text-slate-400">Línea ID: {selectedLineId}</p>
          <p className="mt-2 text-xs text-slate-500">
            Algunas opciones dependen del soporte de whatsapp-web.js.
          </p>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={lineSettings.ignoreGroups}
                onChange={(event) =>
                  setLineSettings({ ...lineSettings, ignoreGroups: event.target.checked })
                }
                disabled={!canManageLines}
              />
              Ignorar grupos
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={lineSettings.readMessages}
                onChange={(event) =>
                  setLineSettings({ ...lineSettings, readMessages: event.target.checked })
                }
                disabled={!canManageLines}
              />
              Marcar mensajes como leídos
            </label>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <input
              value={lineSettings.rateLimitMinute}
              onChange={(event) =>
                setLineSettings({ ...lineSettings, rateLimitMinute: event.target.value })
              }
              className="rounded bg-slate-800 px-3 py-2 text-sm"
              disabled={!canManageLines}
              placeholder="Minuto"
            />
            <input
              value={lineSettings.rateLimitHour}
              onChange={(event) =>
                setLineSettings({ ...lineSettings, rateLimitHour: event.target.value })
              }
              className="rounded bg-slate-800 px-3 py-2 text-sm"
              disabled={!canManageLines}
              placeholder="Hora"
            />
            <input
              value={lineSettings.rateLimitDay}
              onChange={(event) =>
                setLineSettings({ ...lineSettings, rateLimitDay: event.target.value })
              }
              className="rounded bg-slate-800 px-3 py-2 text-sm"
              disabled={!canManageLines}
              placeholder="Día"
            />
          </div>

          <div className="mt-6 space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={lineSettings.webhookEnabled}
                onChange={(event) =>
                  setLineSettings({ ...lineSettings, webhookEnabled: event.target.checked })
                }
                disabled={!canManageLines}
              />
              Webhook habilitado
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={lineSettings.webhookBase64}
                onChange={(event) =>
                  setLineSettings({ ...lineSettings, webhookBase64: event.target.checked })
                }
                disabled={!canManageLines}
              />
              Enviar media en base64 (si aplica)
            </label>
            <input
              value={lineSettings.n8nWebhookUrl}
              onChange={(event) =>
                setLineSettings({ ...lineSettings, n8nWebhookUrl: event.target.value })
              }
              placeholder="Webhook URL"
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
              disabled={!canManageLines}
            />
          </div>

          {settingsStatus && <p className="mt-3 text-xs text-emerald-400">{settingsStatus}</p>}
          <button
            disabled={!canManageLines}
            onClick={async () => {
              try {
                await api.put(`/lines/${selectedLineId}/settings`, {
                  webhookEnabled: Boolean(lineSettings.webhookEnabled),
                  webhookBase64: Boolean(lineSettings.webhookBase64),
                  n8nWebhookUrl: lineSettings.n8nWebhookUrl,
                  ignoreGroups: Boolean(lineSettings.ignoreGroups),
                  readMessages: Boolean(lineSettings.readMessages)
                });
                await api.put(`/lines/${selectedLineId}/ratelimit`, {
                  rateLimitMinute: Number(lineSettings.rateLimitMinute),
                  rateLimitHour: Number(lineSettings.rateLimitHour),
                  rateLimitDay: Number(lineSettings.rateLimitDay)
                });
                setSettingsStatus("Configuración guardada");
                loadLines();
              } catch (error) {
                setSettingsStatus("Error al guardar configuración");
              }
            }}
            className="mt-4 rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Guardar configuración de línea
          </button>
        </div>
      )}

      <QRCodePanel qrState={qrState} />

      <Modal
        open={modal.type === "webhook"}
        title="Webhook por línea"
        confirmLabel="Guardar"
        onClose={() => setModal({ type: null, line: null })}
        onConfirm={async () => {
          await api.put(`/lines/${modal.line.id}/webhook`, { n8nWebhookUrl: webhookValue });
          setModal({ type: null, line: null });
          loadLines();
        }}
      >
        <input
          value={webhookValue}
          onChange={(event) => setWebhookValue(event.target.value)}
          placeholder="https://..."
          className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
        />
      </Modal>

      <Modal
        open={modal.type === "ratelimit"}
        title="Rate limit por línea"
        confirmLabel="Guardar"
        onClose={() => setModal({ type: null, line: null })}
        onConfirm={async () => {
          await api.put(`/lines/${modal.line.id}/ratelimit`, {
            rateLimitMinute: Number(rateValues.perMinute),
            rateLimitHour: Number(rateValues.perHour),
            rateLimitDay: Number(rateValues.perDay)
          });
          setModal({ type: null, line: null });
          loadLines();
        }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={rateValues.perMinute}
            onChange={(event) => setRateValues({ ...rateValues, perMinute: event.target.value })}
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            placeholder="Minuto"
          />
          <input
            value={rateValues.perHour}
            onChange={(event) => setRateValues({ ...rateValues, perHour: event.target.value })}
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            placeholder="Hora"
          />
          <input
            value={rateValues.perDay}
            onChange={(event) => setRateValues({ ...rateValues, perDay: event.target.value })}
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            placeholder="Día"
          />
        </div>
      </Modal>

      <Modal
        open={modal.type === "delete"}
        title="Eliminar línea"
        confirmLabel="Eliminar"
        onClose={() => setModal({ type: null, line: null })}
        onConfirm={async () => {
          await api.delete(`/lines/${modal.line.id}`);
          setModal({ type: null, line: null });
          loadLines();
        }}
      >
        <p className="text-sm text-slate-300">
          ¿Eliminar la línea {modal.line?.name || modal.line?.id}?
        </p>
      </Modal>
    </div>
  );
}
