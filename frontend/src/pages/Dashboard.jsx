import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatusCard from "../components/StatusCard.jsx";
import QRCodePanel from "../components/QRCodePanel.jsx";
import LogsPanel from "../components/LogsPanel.jsx";

export default function Dashboard({ statusList, qrState, logs, user }) {
  const [lineMap, setLineMap] = useState({});
  const [lines, setLines] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    const loadLines = async () => {
      const response = await api.get("/lines");
      const map = response.data.reduce((acc, line) => {
        acc[line.id] = line;
        return acc;
      }, {});
      setLineMap(map);
      setLines(response.data);
    };

    loadLines();
  }, []);

  useEffect(() => {
    const loadRecent = async () => {
      const response = await api.get("/messages/recent?limit=50");
      const mapped = response.data.map((item) => ({
        lineId: item.line_id,
        body: item.body,
        from: item.from_number,
        author: item.from_number,
        timestamp: item.created_at
      }));
      setRecentLogs(mapped);
    };

    loadRecent();
  }, []);

  const statusMap = statusList.reduce((acc, status) => {
    acc[status.lineId] = status.status;
    return acc;
  }, {});

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Estado de líneas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {lines.map((line) => (
            <StatusCard
              key={line.id}
              lineId={line.id}
              name={line.name}
              phone={line.phone}
              status={statusMap[line.id] || line.status || "CREATED"}
            />
          ))}
          {!lines.length && (
            <p className="text-slate-400">No hay sesiones activas.</p>
          )}
        </div>
      </div>
      <QRCodePanel qrState={qrState} />
      <div className="lg:col-span-3">
        <LogsPanel
          logs={[...logs, ...recentLogs].slice(0, 50)}
          lineMap={lineMap}
          onDeleteLine={
            user?.role === "admin"
              ? async (lineId) => {
                  if (!window.confirm("Eliminar esta línea?")) return;
                  await api.delete(`/lines/${lineId}`);
                  const response = await api.get("/lines");
                  const map = response.data.reduce((acc, line) => {
                    acc[line.id] = line;
                    return acc;
                  }, {});
                  setLineMap(map);
                }
              : null
          }
        />
      </div>
    </div>
  );
}
