import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

export default function Conversations() {
  const [lines, setLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [locationMode, setLocationMode] = useState(false);
  const [location, setLocation] = useState({ latitude: "", longitude: "", name: "", address: "" });

  const loadLines = async () => {
    const response = await api.get("/lines");
    setLines(response.data);
    if (!selectedLineId && response.data.length) {
      setSelectedLineId(response.data[0].id);
    }
  };

  const loadConversations = async (lineId) => {
    if (!lineId) return;
    const response = await api.get("/conversations", {
      params: { lineId }
    });
    setConversations(response.data);
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    const response = await api.get(`/conversations/${conversationId}/messages`, {
      params: { limit: 100 }
    });
    setMessages(response.data);
  };

  useEffect(() => {
    loadLines();
    const intervalId = setInterval(loadLines, 8000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const loadActive = async () => {
      try {
        const response = await api.get("/lines/active-sessions");
        setActiveSessions(response.data || []);
      } catch {
        setActiveSessions([]);
      }
    };
    loadActive();
    const intervalId = setInterval(loadActive, 8000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!selectedLineId) return;
    loadConversations(selectedLineId);
    const intervalId = setInterval(() => loadConversations(selectedLineId), 8000);
    return () => clearInterval(intervalId);
  }, [selectedLineId]);

  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation.id);
    setReplyText("");
    setSendStatus(null);
    setLocationMode(false);
  }, [selectedConversation]);

  const selectedMessages = useMemo(() => messages.slice().reverse(), [messages]);

  const handleStatusChange = async (status) => {
    if (!selectedConversation) return;
    const response = await api.patch(`/conversations/${selectedConversation.id}`, { status });
    setSelectedConversation(response.data);
    loadConversations(selectedLineId);
  };

  const handleSend = async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setSending(true);
    setSendStatus(null);
    try {
      await api.post(`/conversations/${selectedConversation.id}/reply`, {
        type: "text",
        message: replyText.trim()
      });
      setReplyText("");
      await loadMessages(selectedConversation.id);
      setSendStatus("Mensaje enviado.");
    } catch (error) {
      if (error?.response?.status === 409) {
        setSendStatus("La línea no está conectada.");
      } else if (error?.response?.status === 423) {
        setSendStatus("Safe mode activo. No se pueden enviar mensajes.");
      } else if (error?.response?.status === 429) {
        setSendStatus("Límite superado (warm-up o rate limit).");
      } else {
        setSendStatus("Error al enviar el mensaje.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendLocation = async () => {
    if (!selectedConversation) return;
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSendStatus("Latitud/longitud inválidas.");
      return;
    }
    setSending(true);
    setSendStatus(null);
    try {
      await api.post(`/conversations/${selectedConversation.id}/reply`, {
        type: "location",
        location: {
          latitude,
          longitude,
          name: location.name || null,
          address: location.address || null
        }
      });
      setLocation({ latitude: "", longitude: "", name: "", address: "" });
      await loadMessages(selectedConversation.id);
      setSendStatus("Ubicación enviada.");
    } catch (error) {
      if (error?.response?.status === 409) {
        setSendStatus("La línea no está conectada.");
      } else if (error?.response?.status === 423) {
        setSendStatus("Safe mode activo. No se pueden enviar mensajes.");
      } else if (error?.response?.status === 429) {
        setSendStatus("Límite superado (warm-up o rate limit).");
      } else {
        setSendStatus("Error al enviar la ubicación.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleReconnect = async () => {
    if (!selectedLineId) return;
    setSendStatus(null);
    try {
      await api.post(`/lines/${selectedLineId}/qr/cleanup`);
      await api.post(`/lines/${selectedLineId}/connect`);
      setSendStatus("Reconectando línea, espera el QR si es necesario.");
    } catch (error) {
      if (error?.response?.status === 409) {
        setSendStatus("La línea ya está inicializando o conectada.");
      } else if (error?.response?.status === 500) {
        setSendStatus("Sesión en conflicto. Intenta limpiar sesión y reconectar.");
      } else {
        setSendStatus("No se pudo reconectar la línea.");
      }
    }
  };

  const selectedLine = lines.find((line) => `${line.id}` === `${selectedLineId}`);
  const activeSession = activeSessions.find((session) => `${session.lineId}` === `${selectedLineId}`);
  const canSend = Boolean(activeSession?.ready);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/40">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversaciones</h2>
          <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300">
            {conversations.length} activas
          </span>
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-400">Línea</label>
          <select
            value={selectedLineId || ""}
            onChange={(event) => {
              setSelectedLineId(Number(event.target.value));
              setSelectedConversation(null);
              setMessages([]);
            }}
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm shadow-inner shadow-slate-950/50"
          >
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name} ({line.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-2">
          {conversations.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedConversation(item)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                selectedConversation?.id === item.id
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-100"
                  : "border-slate-800 bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <div className="font-semibold">
                {item.display_name || item.contact}
              </div>
              <div className="text-xs text-slate-400">{item.contact}</div>
            </button>
          ))}
          {!conversations.length && (
            <p className="text-xs text-slate-400">Sin conversaciones.</p>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Detalle</h2>
          {selectedLine ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-1">
                Línea: {selectedLine.name || selectedLine.phone}
              </span>
              <span
                className={`rounded-full px-2 py-1 text-[10px] ${
                  canSend
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-amber-500/15 text-amber-200"
                }`}
              >
                {canSend ? "CONECTADA" : "DESCONECTADA"}
              </span>
              <button
                onClick={handleReconnect}
                className="rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
              >
                Reconectar
              </button>
            </div>
          ) : null}
        </div>
        {!selectedConversation ? (
          <p className="mt-3 text-xs text-slate-400">Selecciona una conversación.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900 text-xs text-slate-300">
                  {(selectedConversation.display_name || selectedConversation.contact)
                    ?.slice(0, 2)
                    ?.toUpperCase() || "WA"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {selectedConversation.display_name || selectedConversation.contact}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedConversation.contact}
                  </div>
                </div>
              </div>
              <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300">
                {selectedConversation.status}
              </span>
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                className="rounded bg-emerald-500 px-2 py-1 text-xs text-slate-950"
              >
                Activar
              </button>
              <button
                onClick={() => handleStatusChange("PAUSED")}
                className="rounded bg-amber-500 px-2 py-1 text-xs text-slate-950"
              >
                Pausar
              </button>
              <button
                onClick={() => handleStatusChange("CLOSED")}
                className="rounded bg-rose-500 px-2 py-1 text-xs text-slate-950"
              >
                Cerrar
              </button>
            </div>

            <div className="chat-scroll chat-surface mt-4 max-h-[420px] space-y-3 overflow-auto rounded-2xl border border-slate-900/80 p-4 shadow-inner shadow-slate-950/60">
              {selectedMessages.map((item) => {
                const isOutbound = item.direction === "OUT";
                return (
                  <div
                    key={item.id}
                    className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`bubble max-w-[78%] px-4 py-2 text-sm shadow-md backdrop-blur ${
                        isOutbound
                          ? "bubble-out bg-emerald-500/15 text-emerald-50 border border-emerald-500/40"
                          : "bubble-in bg-slate-900/80 text-slate-100 border border-slate-800/80"
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{item.body}</div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!selectedMessages.length && (
                <p className="text-xs text-slate-400">Sin mensajes.</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm shadow-inner shadow-slate-950/40"
              />
              <button
                onClick={handleSend}
                disabled={sending || !canSend}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                Enviar
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Acciones rápidas</p>
                <button
                  onClick={() => setLocationMode((prev) => !prev)}
                  className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200"
                >
                  {locationMode ? "Ocultar" : "Enviar ubicación"}
                </button>
              </div>
              {locationMode && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    value={location.latitude}
                    onChange={(event) => setLocation({ ...location, latitude: event.target.value })}
                    placeholder="Latitud"
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
                  />
                  <input
                    value={location.longitude}
                    onChange={(event) => setLocation({ ...location, longitude: event.target.value })}
                    placeholder="Longitud"
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
                  />
                  <input
                    value={location.name}
                    onChange={(event) => setLocation({ ...location, name: event.target.value })}
                    placeholder="Nombre (opcional)"
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs md:col-span-2"
                  />
                  <input
                    value={location.address}
                    onChange={(event) => setLocation({ ...location, address: event.target.value })}
                    placeholder="Dirección (opcional)"
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs md:col-span-2"
                  />
                  <button
                    onClick={handleSendLocation}
                    disabled={sending || !canSend}
                    className="rounded-lg bg-emerald-500 px-3 py-2 text-xs text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    Enviar ubicación
                  </button>
                </div>
              )}
            </div>
            {sendStatus && <p className="mt-2 text-xs text-slate-400">{sendStatus}</p>}
            {!canSend && (
              <p className="mt-1 text-xs text-amber-300">
                La línea debe estar conectada para enviar mensajes.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
