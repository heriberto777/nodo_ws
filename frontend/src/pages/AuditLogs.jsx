import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  const loadLogs = async () => {
    const response = await api.get("/audit-logs", { params: { limit: 200 } });
    setLogs(response.data);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Auditoría</h2>
      <div className="mt-4 space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded bg-slate-800 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{log.action}</div>
                <div className="text-xs text-slate-400">{log.resource}</div>
              </div>
              <div className="text-xs text-slate-500">{log.created_at}</div>
            </div>
            {log.details && (
              <pre className="mt-2 rounded bg-slate-950 p-2 text-xs">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {!logs.length && <p className="text-xs text-slate-400">Sin registros.</p>}
      </div>
    </div>
  );
}
