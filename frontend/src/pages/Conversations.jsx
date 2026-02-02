import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

export default function Conversations() {
  const [lines, setLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);

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

  const selectedLine = lines.find((line) => `${line.id}` === `${selectedLineId}`);
  const canSend = selectedLine?.status === "CONNECTED";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Conversaciones</h2>
        <div className="mt-3">
          <label className="text-xs text-slate-400">Línea</label>
          <select
            value={selectedLineId || ""}
            onChange={(event) => {
              setSelectedLineId(Number(event.target.value));
              setSelectedConversation(null);
              setMessages([]);
            }}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
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
              className={`w-full rounded px-3 py-2 text-left text-sm ${
                selectedConversation?.id === item.id ? "bg-emerald-500 text-slate-950" : "bg-slate-800"
              }`}
            >
              <div className="font-semibold">{item.contact}</div>
              <div className="text-xs opacity-70">{item.status}</div>
            </button>
          ))}
          {!conversations.length && (
            <p className="text-xs text-slate-400">Sin conversaciones.</p>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Detalle</h2>
        {!selectedConversation ? (
          <p className="mt-3 text-xs text-slate-400">Selecciona una conversación.</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm">{selectedConversation.contact}</span>
              <span className="rounded bg-slate-800 px-2 py-1 text-xs">
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

            <div className="mt-4 max-h-[420px] space-y-3 overflow-auto rounded bg-slate-950 p-4">
              {selectedMessages.map((item) => {
                const isOutbound = item.direction === "OUT";
                return (
                  <div
                    key={item.id}
                    className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        isOutbound
                          ? "bg-emerald-500/20 text-emerald-100 border border-emerald-500/40"
                          : "bg-slate-900 text-slate-100 border border-slate-800"
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
                className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={sending || !canSend}
                className="rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950 disabled:opacity-60"
              >
                Enviar
              </button>
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
