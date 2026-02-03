import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import LineList from "../components/LineList.jsx";
import QRCodePanel from "../components/QRCodePanel.jsx";
import Modal from "../components/Modal.jsx";
import DashboardHeader from "../components/DashboardHeader.jsx";

export default function Lines({ statusList, qrState, user }) {
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    n8nWebhookUrl: "",
    webhookEnabled: false,
    webhookBase64: false,
    ignoreGroups: true,
    readMessages: true
  });
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [lineSettings, setLineSettings] = useState(null);
  const [settingsStatus, setSettingsStatus] = useState(null);
  const [modal, setModal] = useState({ type: null, line: null });
  const [webhookValue, setWebhookValue] = useState("");
  const [rateValues, setRateValues] = useState({ perMinute: "", perHour: "", perDay: "" });
  const [qrPreview, setQrPreview] = useState(null);
  const [qrInfo, setQrInfo] = useState(null);
  const [qrNow, setQrNow] = useState(Date.now());
  const [activeSessions, setActiveSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [createLineModalOpen, setCreateLineModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
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

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get("/lines/active-sessions");
        setActiveSessions(response.data || []);
      } catch {
        setActiveSessions([]);
      }
    };
    loadSessions();
    const intervalId = setInterval(loadSessions, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.phone) return;
    await api.post("/lines", form);
    setForm({
      name: "",
      phone: "",
      n8nWebhookUrl: "",
      webhookEnabled: false,
      webhookBase64: false,
      ignoreGroups: true,
      readMessages: true
    });
    loadLines();
  };

  const handleConnect = async (lineId) => {
    try {
      await api.post(`/lines/${lineId}/connect`);
      loadLines();
      const current = mergedLines.find((line) => `${line.id}` === `${lineId}`) || { id: lineId };
      setModal({ type: "qr", line: current });
    } catch (error) {
      if (error?.response?.status === 409) {
        loadLines();
        const current = mergedLines.find((line) => `${line.id}` === `${lineId}`) || { id: lineId };
        setModal({ type: "qr", line: current });
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

  const handleShowQr = async (lineId) => {
    const current = mergedLines.find((line) => `${line.id}` === `${lineId}`) || { id: lineId };
    setModal({ type: "qr", line: current });
  };

  const handleDiagnose = async (lineId) => {
    const current = mergedLines.find((line) => `${line.id}` === `${lineId}`) || { id: lineId };
    setModal({ type: "diagnostic", line: current });
  };

  const handleResetSafeMode = async (lineId) => {
    await api.post(`/lines/${lineId}/safe-mode/reset`);
    loadLines();
  };

  const qrMatchesLine =
    (modal.type === "qr" || modal.type === "diagnostic") &&
    qrState?.lineId &&
    `${qrState.lineId}` === `${modal.line?.id}`;
  const previewMatchesLine =
    (modal.type === "qr" || modal.type === "diagnostic") &&
    qrPreview?.lineId &&
    `${qrPreview.lineId}` === `${modal.line?.id}`;
  const modalLineStatus =
    modal.type === "qr" || modal.type === "diagnostic"
      ? statusMap[modal.line?.id] || modal.line?.status || "CREATED"
      : null;
  const statusLabel =
    modalLineStatus === "CONNECTED"
      ? "Conectado"
      : modalLineStatus === "QR"
      ? "Generando QR"
      : modalLineStatus === "DISCONNECTED"
      ? "Desconectado"
      : modalLineStatus === "BLOCKED"
      ? "Bloqueado"
      : "Conectando";

  useEffect(() => {
    if (modal.type !== "qr" && modal.type !== "diagnostic") return;
    if (modalLineStatus === "CONNECTED") {
      setModal({ type: null, line: null });
    }
  }, [modal.type, modalLineStatus]);

  useEffect(() => {
    if ((modal.type !== "qr" && modal.type !== "diagnostic") || !modal.line?.id) {
      setQrPreview(null);
      setQrInfo(null);
      return undefined;
    }

    let active = true;
    const fetchQr = async () => {
      try {
        const response = await api.get(`/lines/${modal.line.id}/qr`);
        if (!active) return;
        if (response.data?.qr) {
          setQrPreview({ lineId: modal.line.id, qr: response.data.qr });
        }
        if (response.data?.info) {
          setQrInfo(response.data.info);
        }
      } catch {
        // ignore
      }
    };

    fetchQr();
    const intervalId = setInterval(fetchQr, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [modal.type, modal.line?.id]);

  useEffect(() => {
    if (modal.type !== "qr" && modal.type !== "diagnostic") return undefined;
    const intervalId = setInterval(() => setQrNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [modal.type]);

  const lastQrAtMs = qrInfo?.lastQrAt ? new Date(qrInfo.lastQrAt).getTime() : null;
  const qrExpiresInMs = lastQrAtMs ? Math.max(0, 60_000 - (qrNow - lastQrAtMs)) : null;
  const qrExpiresInSec = qrExpiresInMs != null ? Math.ceil(qrExpiresInMs / 1000) : null;

  return (
    <div className="space-y-6">
      {/* Header con búsqueda */}
      <DashboardHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        linesCount={lines.length}
        connectedCount={lines.filter((l) => statusMap[l.id]?.status === "CONNECTED").length}
      />

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3">
        {canManageLines && (
          <button
            onClick={() => setCreateLineModalOpen(true)}
            className="rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950 font-semibold hover:bg-emerald-600 transition-colors"
          >
            + Crear línea
          </button>
        )}
        <button
          onClick={() => setSessionsModalOpen(true)}
          className="rounded bg-slate-700 px-4 py-2 text-sm text-slate-100 font-semibold hover:bg-slate-600 transition-colors relative"
        >
          Sesiones activas
          {activeSessions.length > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
              {activeSessions.length}
            </span>
          )}
        </button>
      </div>

      {!canOperateLines && (
        <p className="rounded bg-slate-800/50 px-4 py-2 text-xs text-slate-400">
          Tu rol no permite conectar o desconectar líneas.
        </p>
      )}

      {/* LineList con búsqueda */}
      <LineList
        lines={mergedLines.filter((line) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            line.name?.toLowerCase().includes(searchLower) ||
            line.phone?.toLowerCase().includes(searchLower) ||
            line.lineId?.toLowerCase().includes(searchLower)
          );
        })}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onUpdateWebhook={handleUpdateWebhook}
        onUpdateRateLimit={handleUpdateRateLimit}
        onSelect={handleSelectLine}
        onDiagnose={handleDiagnose}
        onShowQr={handleShowQr}
        onResetSafeMode={canManageLines ? handleResetSafeMode : null}
        onDelete={canManageLines ? handleDeleteLine : null}
        disabled={!canOperateLines}
      />

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

      <Modal
        open={modal.type === "qr" || modal.type === "diagnostic"}
        title={
          modal.type === "diagnostic"
            ? `Diagnóstico de línea ${modal.line?.name || modal.line?.id || ""}`
            : `QR de línea ${modal.line?.name || modal.line?.id || ""}`
        }
        confirmLabel="Cerrar"
        onClose={() => setModal({ type: null, line: null })}
        onConfirm={() => setModal({ type: null, line: null })}
      >
        <div className="rounded bg-slate-800 px-3 py-2 text-xs text-slate-200">
          Estado: {statusLabel}
        </div>
        {qrInfo && (
          <div className="rounded bg-slate-900/80 px-3 py-2 text-[11px] text-slate-400">
            <div>Inicializando: {qrInfo.initializing ? "sí" : "no"}</div>
            <div>Último QR: {qrInfo.lastQrAt || "-"}</div>
            {qrExpiresInSec != null && (
              <div>
                QR expira en: {qrExpiresInSec <= 0 ? "expirado" : `${qrExpiresInSec}s`}
              </div>
            )}
          </div>
        )}
        {qrInfo?.lastError && (
          <div className="rounded border border-rose-900/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            Error sesión: {qrInfo.lastError}
          </div>
        )}
        {qrInfo?.lock?.locked && (
          <div className="rounded border border-amber-900/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
            Sesión bloqueada por navegador previo. Archivos: {qrInfo.lock.files?.join(", ") || "-"}
          </div>
        )}
        {qrInfo?.lock?.locked && (
          <button
            onClick={async () => {
              if (!modal.line?.id) return;
              await api.post(`/lines/${modal.line.id}/lock/release`);
              await api.post(`/lines/${modal.line.id}/connect`);
            }}
            className="mt-2 rounded bg-amber-500 px-3 py-2 text-xs text-slate-950"
          >
            Liberar lock y reconectar
          </button>
        )}
        {qrInfo?.lastError?.includes("browser is already running") && (
          <div className="rounded border border-amber-900/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
            Ya existe un navegador usando esa sesión. Detén ese proceso y luego pulsa “Regenerar QR”.
          </div>
        )}
        {modal.type !== "diagnostic" &&
          (qrMatchesLine ? (
            <QRCodePanel qrState={qrState} />
          ) : previewMatchesLine ? (
            <QRCodePanel qrState={qrPreview} />
          ) : (
            <div className="rounded border border-dashed border-slate-700 p-6 text-slate-400">
              QR no disponible para esta línea. Espera a que se genere luego de conectar.
            </div>
          ))}
        <button
          onClick={async () => {
            if (!modal.line?.id) return;
            await api.post(`/lines/${modal.line.id}/qr/reset`);
            try {
              await api.post(`/lines/${modal.line.id}/connect`);
            } catch (error) {
              if (error?.response?.status !== 409) {
                throw error;
              }
            }
          }}
          className="mt-2 rounded bg-amber-500 px-3 py-2 text-xs text-slate-950"
        >
          Regenerar QR
        </button>
        <button
          onClick={async () => {
            if (!modal.line?.id) return;
            await api.post(`/lines/${modal.line.id}/qr/cleanup`);
            try {
              await api.post(`/lines/${modal.line.id}/connect`);
            } catch (error) {
              if (error?.response?.status !== 409) {
                throw error;
              }
            }
          }}
          className="mt-2 rounded bg-rose-500 px-3 py-2 text-xs text-white"
        >
          Limpiar sesión bloqueada
        </button>
      </Modal>

      {/* Modal: Crear línea */}
      <Modal
        open={createLineModalOpen}
        title="Crear nueva línea"
        confirmLabel="Guardar"
        onClose={() => setCreateLineModalOpen(false)}
        onConfirm={async (e) => {
          if (!form.name || !form.phone) {
            alert("Por favor completa nombre y número");
            return;
          }
          try {
            await handleSubmit({ preventDefault: () => {} });
            setCreateLineModalOpen(false);
          } catch (error) {
            console.error("Error creating line:", error);
          }
        }}
      >
        <div className="space-y-3">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Nombre"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="Número"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            value={form.n8nWebhookUrl}
            onChange={(event) => setForm({ ...form, n8nWebhookUrl: event.target.value })}
            placeholder="Webhook n8n (opcional)"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.webhookEnabled}
              onChange={(event) => setForm({ ...form, webhookEnabled: event.target.checked })}
            />
            Webhook habilitado
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.webhookBase64}
              onChange={(event) => setForm({ ...form, webhookBase64: event.target.checked })}
            />
            Enviar media en base64
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.ignoreGroups}
              onChange={(event) => setForm({ ...form, ignoreGroups: event.target.checked })}
            />
            Ignorar grupos
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.readMessages}
              onChange={(event) => setForm({ ...form, readMessages: event.target.checked })}
            />
            Marcar mensajes como leídos
          </label>
        </div>
      </Modal>

      {/* Modal: Sesiones activas */}
      <Modal
        open={sessionsModalOpen}
        title="Sesiones activas"
        confirmLabel="Cerrar"
        onClose={() => setSessionsModalOpen(false)}
        onConfirm={() => setSessionsModalOpen(false)}
      >
        {activeSessions.length > 0 ? (
          <div className="max-h-96 overflow-y-auto space-y-2">
            {activeSessions.map((session) => (
              <div key={session.lineId} className="rounded bg-slate-800/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Línea {session.lineId}</span>
                  <span className={`text-xs font-bold ${session.status === 'ready' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {session.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400 space-y-1">
                  {session.initializing && <p>• Inicializando...</p>}
                  {session.ready && <p>• Listo para usar</p>}
                  {session.lastError && <p className="text-rose-400">• Error: {session.lastError}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400 py-4">No hay sesiones activas en este momento.</p>
        )}
      </Modal>
    </div>
  );
}
