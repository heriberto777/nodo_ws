import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Metrics() {
  const [lines, setLines] = useState([]);
  const [lineId, setLineId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);

  const loadLines = async () => {
    const response = await api.get("/lines");
    setLines(response.data);
  };

  const loadMetrics = async () => {
    const response = await api.get("/metrics/lines", {
      params: {
        lineId: lineId || undefined,
        from: from || undefined,
        to: to || undefined
      }
    });
    setData(response.data);
  };

  useEffect(() => {
    loadLines();
    loadMetrics();
  }, []);

  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Métricas por línea</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <select
          value={lineId}
          onChange={(event) => setLineId(event.target.value)}
          className="rounded bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          {lines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.name} ({line.phone})
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="rounded bg-slate-800 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="rounded bg-slate-800 px-3 py-2 text-sm"
        />
        <button
          onClick={loadMetrics}
          className="rounded bg-emerald-500 px-3 py-2 text-sm text-slate-950"
        >
          Aplicar
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded bg-slate-800 p-3 text-sm">
          <p className="text-xs text-slate-400">Entrantes</p>
          <p className="text-lg font-semibold">{data?.inbound ?? "-"}</p>
        </div>
        <div className="rounded bg-slate-800 p-3 text-sm">
          <p className="text-xs text-slate-400">Salientes</p>
          <p className="text-lg font-semibold">{data?.outbound ?? "-"}</p>
        </div>
        <div className="rounded bg-slate-800 p-3 text-sm">
          <p className="text-xs text-slate-400">Avg respuesta</p>
          <p className="text-lg font-semibold">
            {data?.avgResponseSeconds != null ? `${data.avgResponseSeconds}s` : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
