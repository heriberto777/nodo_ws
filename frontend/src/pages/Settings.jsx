import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Settings({ user }) {
  const [rateLimit, setRateLimit] = useState({ perMinute: 15, perHour: 300, perDay: 1000 });
  const [n8nWebhook, setN8nWebhook] = useState("");
  const isAdmin = user?.role === "admin";
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "operator" });
  const [userStatus, setUserStatus] = useState(null);
  const [settingsStatus, setSettingsStatus] = useState(null);

  const loadSettings = async () => {
    try {
      const response = await api.get("/settings");
      setRateLimit({
        perMinute: response.data.rateLimitMinute,
        perHour: response.data.rateLimitHour,
        perDay: response.data.rateLimitDay
      });
      setN8nWebhook(response.data.n8nWebhookUrl || "");
    } catch (error) {
      setSettingsStatus("No se pudieron cargar las configuraciones");
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Rate limit</h2>
        {!isAdmin && (
          <p className="mt-2 text-xs text-slate-400">Solo administradores pueden editar.</p>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={rateLimit.perMinute}
            onChange={(event) => setRateLimit({ ...rateLimit, perMinute: event.target.value })}
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <input
            value={rateLimit.perHour}
            onChange={(event) => setRateLimit({ ...rateLimit, perHour: event.target.value })}
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <input
            value={rateLimit.perDay}
            onChange={(event) => setRateLimit({ ...rateLimit, perDay: event.target.value })}
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
        </div>
        {settingsStatus && <p className="mt-3 text-xs text-emerald-400">{settingsStatus}</p>}
        <button
          disabled={!isAdmin}
          onClick={async () => {
            try {
              await api.put("/settings", {
                rateLimitMinute: Number(rateLimit.perMinute),
                rateLimitHour: Number(rateLimit.perHour),
                rateLimitDay: Number(rateLimit.perDay),
                n8nWebhookUrl: n8nWebhook
              });
              setSettingsStatus("Configuración guardada");
            } catch (error) {
              setSettingsStatus("Error al guardar configuración");
            }
          }}
          className="mt-4 rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Guardar configuración
        </button>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Webhook n8n</h2>
        <input
          value={n8nWebhook}
          onChange={(event) => setN8nWebhook(event.target.value)}
          placeholder="https://n8n.your-domain.com/webhook/wa-inbound"
          className="mt-3 w-full rounded bg-slate-800 px-3 py-2 text-sm"
          disabled={!isAdmin}
        />
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Crear usuario</h2>
        {!isAdmin && (
          <p className="mt-2 text-xs text-slate-400">Solo administradores pueden crear usuarios.</p>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={newUser.name}
            onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
            placeholder="Nombre"
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <input
            value={newUser.email}
            onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
            placeholder="Correo"
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <input
            value={newUser.password}
            onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
            placeholder="Contraseña"
            type="password"
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <select
            value={newUser.role}
            onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          >
            <option value="admin">admin</option>
            <option value="operator">operator</option>
            <option value="viewer">viewer</option>
          </select>
        </div>
        {userStatus && <p className="mt-3 text-xs text-emerald-400">{userStatus}</p>}
        <button
          disabled={!isAdmin}
          onClick={async () => {
            try {
              await api.post("/auth/register", newUser);
              setUserStatus("Usuario creado");
              setNewUser({ name: "", email: "", password: "", role: "operator" });
            } catch (error) {
              setUserStatus("Error al crear usuario");
            }
          }}
          className="mt-4 rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Crear usuario
        </button>
      </div>
    </div>
  );
}
