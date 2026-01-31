import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatusCard from "../components/StatusCard.jsx";
import QRCodePanel from "../components/QRCodePanel.jsx";
import LogsPanel from "../components/LogsPanel.jsx";

export default function Dashboard({ statusList, qrState, logs, user }) {
  const [lineMap, setLineMap] = useState({});

  useEffect(() => {
    const loadLines = async () => {
      const response = await api.get("/lines");
      const map = response.data.reduce((acc, line) => {
        acc[line.id] = line;
        return acc;
      }, {});
      setLineMap(map);
    };

    loadLines();
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Estado de líneas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {statusList.map((status) => (
            <StatusCard
              key={status.lineId}
              lineId={status.lineId}
              name={lineMap[status.lineId]?.name}
              phone={lineMap[status.lineId]?.phone}
              status={status.status}
            />
          ))}
          {!statusList.length && (
            <p className="text-slate-400">No hay sesiones activas.</p>
          )}
        </div>
      </div>
      <QRCodePanel qrState={qrState} />
      <div className="lg:col-span-3">
        <LogsPanel
          logs={logs}
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
