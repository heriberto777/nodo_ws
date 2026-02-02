import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const defaultLimits = {
  day1: 20,
  day2: 40,
  day3: 80,
  day7: 200,
  normal: 1000
};

export default function Warmup() {
  const [lines, setLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadLines = async () => {
    const response = await api.get("/lines");
    setLines(response.data);
    if (!selectedLineId && response.data.length) {
      setSelectedLineId(response.data[0].id);
    }
  };

  const loadWarmup = async (lineId) => {
    if (!lineId) return;
    const response = await api.get(`/warmup/${lineId}`);
    setState(response.data);
  };

  useEffect(() => {
    loadLines();
  }, []);

  useEffect(() => {
    loadWarmup(selectedLineId);
  }, [selectedLineId]);

  const limits = state?.limits || {};

  const updateLimit = (key, value) => {
    setState((prev) => ({
      ...prev,
      limits: { ...(prev?.limits || {}), [key]: value }
    }));
  };

  const handleSave = async () => {
    if (!selectedLineId) return;
    setSaving(true);
    await api.patch(`/warmup/${selectedLineId}`, {
      enabled: state?.enabled ?? true,
      limits: {
        day1: Number(limits.day1 ?? defaultLimits.day1),
        day2: Number(limits.day2 ?? defaultLimits.day2),
        day3: Number(limits.day3 ?? defaultLimits.day3),
        day7: Number(limits.day7 ?? defaultLimits.day7),
        normal: Number(limits.normal ?? defaultLimits.normal)
      }
    });
    await loadWarmup(selectedLineId);
    setSaving(false);
  };

  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Warm-up por línea</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="text-xs text-slate-400">Línea</label>
          <select
            value={selectedLineId || ""}
            onChange={(event) => setSelectedLineId(Number(event.target.value))}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
          >
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name} ({line.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded bg-slate-800 p-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={state?.enabled ?? true}
              onChange={(event) => setState((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            Warm-up habilitado
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <label className="text-xs text-slate-400">
          Día 1
          <input
            type="number"
            value={limits.day1 ?? defaultLimits.day1}
            onChange={(event) => updateLimit("day1", event.target.value)}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400">
          Día 2
          <input
            type="number"
            value={limits.day2 ?? defaultLimits.day2}
            onChange={(event) => updateLimit("day2", event.target.value)}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400">
          Día 3
          <input
            type="number"
            value={limits.day3 ?? defaultLimits.day3}
            onChange={(event) => updateLimit("day3", event.target.value)}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400">
          Día 7
          <input
            type="number"
            value={limits.day7 ?? defaultLimits.day7}
            onChange={(event) => updateLimit("day7", event.target.value)}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-400">
          Normal
          <input
            type="number"
            value={limits.normal ?? defaultLimits.normal}
            onChange={(event) => updateLimit("normal", event.target.value)}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950 disabled:opacity-60"
      >
        Guardar
      </button>
    </div>
  );
}
