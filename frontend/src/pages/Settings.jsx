import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Settings({ user }) {
  const [rateLimit, setRateLimit] = useState({ perMinute: 15, perHour: 300, perDay: 1000 });
  const [n8nWebhook, setN8nWebhook] = useState("");
  const isAdmin = user?.role === "admin";
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "operator" });
  const [userStatus, setUserStatus] = useState(null);
  const [settingsStatus, setSettingsStatus] = useState(null);
  const [alertWebhook, setAlertWebhook] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState("MEDIUM");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpTo, setSmtpTo] = useState("");
  const [reportEnabled, setReportEnabled] = useState(false);
  const [reportCron, setReportCron] = useState("0 8 * * *");
  const [hasSmtpPassword, setHasSmtpPassword] = useState(false);
  const [reportStatus, setReportStatus] = useState(null);
  const [notifyDesktop, setNotifyDesktop] = useState(() => {
    return localStorage.getItem("wa_notify_desktop") === "true";
  });
  const [notifySound, setNotifySound] = useState(() => {
    return localStorage.getItem("wa_notify_sound") === "true";
  });

  const loadSettings = async () => {
    try {
      const response = await api.get("/settings");
      setRateLimit({
        perMinute: response.data.rateLimitMinute,
        perHour: response.data.rateLimitHour,
        perDay: response.data.rateLimitDay
      });
      setN8nWebhook(response.data.n8nWebhookUrl || "");
      setAlertWebhook(response.data.alertWebhookUrl || "");
      setAlertEnabled(Boolean(response.data.alertWebhookEnabled));
      setAlertSeverity(response.data.alertMinSeverity || "MEDIUM");
      setSmtpHost(response.data.smtpHost || "");
      setSmtpPort(response.data.smtpPort || "");
      setSmtpUser(response.data.smtpUser || "");
      setSmtpFrom(response.data.smtpFrom || "");
      setSmtpTo(response.data.smtpTo || "");
      setReportEnabled(Boolean(response.data.reportEnabled));
      setReportCron(response.data.reportCron || "0 8 * * *");
      setHasSmtpPassword(Boolean(response.data.hasSmtpPassword));
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
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        <p className="mt-2 text-xs text-slate-400">
          Se guardan localmente en tu navegador.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifyDesktop}
              onChange={(event) => {
                const value = event.target.checked;
                setNotifyDesktop(value);
                localStorage.setItem("wa_notify_desktop", String(value));
                window.dispatchEvent(new Event("wa:notify-settings"));
              }}
            />
            Notificaciones de escritorio (riesgo)
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifySound}
              onChange={(event) => {
                const value = event.target.checked;
                setNotifySound(value);
                localStorage.setItem("wa_notify_sound", String(value));
                window.dispatchEvent(new Event("wa:notify-settings"));
              }}
            />
            Sonido en alertas HIGH
          </label>
        </div>
      </div>

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
                n8nWebhookUrl: n8nWebhook,
                alertWebhookUrl: alertWebhook,
                alertWebhookEnabled: alertEnabled,
                alertMinSeverity: alertSeverity,
                smtpHost,
                smtpPort: smtpPort ? Number(smtpPort) : null,
                smtpUser,
                smtpPassword,
                smtpFrom,
                smtpTo,
                reportEnabled,
                reportCron
              });
              setSettingsStatus("Configuración guardada");
              setSmtpPassword("");
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
        <h2 className="text-lg font-semibold">Alertas (Webhook)</h2>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={alertEnabled}
            onChange={(event) => setAlertEnabled(event.target.checked)}
            disabled={!isAdmin}
          />
          Habilitar alertas
        </label>
        <input
          value={alertWebhook}
          onChange={(event) => setAlertWebhook(event.target.value)}
          placeholder="https://n8n.your-domain.com/webhook/wa-alerts"
          className="mt-3 w-full rounded bg-slate-800 px-3 py-2 text-sm"
          disabled={!isAdmin}
        />
        <div className="mt-3">
          <label className="text-xs text-slate-400">Severidad mínima</label>
          <select
            value={alertSeverity}
            onChange={(event) => setAlertSeverity(event.target.value)}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">Reportes por email (SMTP)</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={smtpHost}
            onChange={(event) => setSmtpHost(event.target.value)}
            placeholder="SMTP host"
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <input
            value={smtpPort}
            onChange={(event) => setSmtpPort(event.target.value)}
            placeholder="SMTP port"
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <input
            value={smtpUser}
            onChange={(event) => setSmtpUser(event.target.value)}
            placeholder="SMTP user"
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <input
            value={smtpPassword}
            onChange={(event) => setSmtpPassword(event.target.value)}
            placeholder={hasSmtpPassword ? "•••••••• (configurado)" : "SMTP password"}
            type="password"
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
          <input
            value={smtpFrom}
            onChange={(event) => setSmtpFrom(event.target.value)}
            placeholder="From (ej: reportes@dominio.com)"
            className="rounded bg-slate-800 px-3 py-2 text-sm md:col-span-2"
            disabled={!isAdmin}
          />
          <input
            value={smtpTo}
            onChange={(event) => setSmtpTo(event.target.value)}
            placeholder="To (separado por comas)"
            className="rounded bg-slate-800 px-3 py-2 text-sm md:col-span-2"
            disabled={!isAdmin}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reportEnabled}
              onChange={(event) => setReportEnabled(event.target.checked)}
              disabled={!isAdmin}
            />
            Habilitar reporte automático
          </label>
          <input
            value={reportCron}
            onChange={(event) => setReportCron(event.target.value)}
            placeholder="Cron (ej: 0 8 * * *)"
            className="rounded bg-slate-800 px-3 py-2 text-sm"
            disabled={!isAdmin}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Cron por defecto: 0 8 * * * (cada día 08:00).
        </p>
        {reportStatus && <p className="mt-2 text-xs text-emerald-400">{reportStatus}</p>}
        <button
          disabled={!isAdmin}
          onClick={async () => {
            try {
              const response = await api.post("/metrics/report-now");
              if (response.data?.sent) {
                setReportStatus("Reporte enviado.");
              } else if (response.data?.skipped) {
                setReportStatus(`Reporte omitido: ${response.data.reason}`);
              } else {
                setReportStatus("Reporte generado.");
              }
            } catch (error) {
              setReportStatus("Error al enviar reporte.");
            }
          }}
          className="mt-3 rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Enviar reporte ahora
        </button>
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
