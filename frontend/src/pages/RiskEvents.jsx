import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function RiskEvents() {
  const [lines, setLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [events, setEvents] = useState([]);
  const [score, setScore] = useState(null);

  const loadLines = async () => {
    const response = await api.get("/lines");
    setLines(response.data);
  };

  const loadEvents = async (lineId) => {
    const response = await api.get("/risk-events", {
      params: lineId ? { lineId } : {}
    });
    setEvents(response.data);
  };

  const loadScore = async (lineId) => {
    if (!lineId) {
      setScore(null);
      return;
    }
    const response = await api.get("/risk-events/score", { params: { lineId } });
    setScore(response.data);
  };

  useEffect(() => {
    loadLines();
    loadEvents();
  }, []);

  useEffect(() => {
    loadEvents(selectedLineId || null);
    loadScore(selectedLineId || null);
  }, [selectedLineId]);

  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Eventos de riesgo</h2>
      <div className="mt-4">
        <label className="text-xs text-slate-400">Filtrar por línea</label>
        <select
          value={selectedLineId}
          onChange={(event) => setSelectedLineId(event.target.value)}
          className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          {lines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.name} ({line.phone})
            </option>
          ))}
        </select>
      </div>

      {score && (
        <div className="mt-4 rounded bg-slate-800 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Score de riesgo (60 min)</div>
            <div className="text-lg text-amber-300">{score.score}</div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            High: {score.high} · Medium: {score.medium} · Total: {score.total}
          </div>
        </div>
      )}

      <div className="app-scroll mt-4 max-h-[520px] space-y-3 overflow-auto">
        {events.map((event) => (
          <div key={event.id} className="rounded bg-slate-800 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{event.type}</div>
                <div className="text-xs text-slate-400">Severidad: {event.severity}</div>
              </div>
              <div className="text-xs text-slate-500">{event.created_at}</div>
            </div>
            {event.details && (
              <pre className="app-scroll mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-xs">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {!events.length && <p className="text-xs text-slate-400">Sin eventos.</p>}
      </div>
    </div>
  );
}
