import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function BotFlows() {
  const [flows, setFlows] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", definition: "{}" });
  const [error, setError] = useState(null);

  const loadFlows = async () => {
    const response = await api.get("/bot-flows");
    setFlows(response.data);
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    let definition = null;
    if (form.definition?.trim()) {
      try {
        definition = JSON.parse(form.definition);
      } catch (err) {
        setError("JSON inválido en la definición.");
        return;
      }
    }

    await api.post("/bot-flows", {
      name: form.name,
      description: form.description,
      definition
    });
    setForm({ name: "", description: "", definition: "{}" });
    loadFlows();
  };

  const handleDelete = async (id) => {
    await api.delete(`/bot-flows/${id}`);
    loadFlows();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={handleSubmit} className="rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Nuevo flujo</h2>
        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        <div className="mt-4 space-y-3">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Nombre"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Descripción"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <textarea
            value={form.definition}
            onChange={(event) => setForm({ ...form, definition: event.target.value })}
            placeholder="Definición JSON"
            rows={8}
            className="w-full rounded bg-slate-800 px-3 py-2 text-xs"
          />
        </div>
        <button className="mt-4 rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950">
          Guardar
        </button>
      </form>

      <div className="lg:col-span-2 rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Flujos existentes</h2>
        <div className="mt-4 space-y-3">
          {flows.map((flow) => (
            <div key={flow.id} className="rounded bg-slate-800 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{flow.name}</div>
                  <div className="text-xs text-slate-400">{flow.description || "Sin descripción"}</div>
                </div>
                <button
                  onClick={() => handleDelete(flow.id)}
                  className="rounded bg-rose-500 px-2 py-1 text-xs text-slate-950"
                >
                  Eliminar
                </button>
              </div>
              <pre className="app-scroll mt-2 max-h-48 overflow-auto rounded bg-slate-950 p-2 text-xs">
                {JSON.stringify(flow.definition || {}, null, 2)}
              </pre>
            </div>
          ))}
          {!flows.length && <p className="text-xs text-slate-400">Sin flujos aún.</p>}
        </div>
      </div>
    </div>
  );
}
