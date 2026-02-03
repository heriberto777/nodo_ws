import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatusCard from "../components/StatusCard.jsx";
import QRCodePanel from "../components/QRCodePanel.jsx";
import LogsPanel from "../components/LogsPanel.jsx";
import DashboardHeader from "../components/DashboardHeader.jsx";
import QRModal from "../components/QRModal.jsx";
import RecentEventsModal from "../components/RecentEventsModal.jsx";
import LineList from "../components/LineList.jsx";
import Modal from "../components/Modal.jsx";

export default function Dashboard({ statusList, qrState, logs, user, riskEvents }) {
  const [lineMap, setLineMap] = useState({});
  const [lines, setLines] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [riskScores, setRiskScores] = useState({});
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [metrics, setMetrics] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [recentEventsModalOpen, setRecentEventsModalOpen] = useState(false);
  const [selectedLineForQr, setSelectedLineForQr] = useState(null);

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

    const loadRiskScores = async () => {
      const response = await api.get("/risk-events/score-all");
      const map = response.data.reduce((acc, item) => {
        acc[item.lineId] = item;
        return acc;
      }, {});
      setRiskScores(map);
    };

    const loadMetrics = async () => {
      const response = await api.get("/metrics/summary");
      setMetrics(response.data);
    };

    const loadKpis = async () => {
      const response = await api.get("/metrics/kpis");
      setKpis(response.data);
    };

    loadLines();
    loadRecent();
    loadRiskScores();
    loadMetrics();
    loadKpis();

    const intervalId = setInterval(() => {
      loadLines();
      loadRecent();
      loadRiskScores();
      loadMetrics();
      loadKpis();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const statusMap = statusList.reduce((acc, status) => {
    acc[status.lineId] = status.status;
    return acc;
  }, {});

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {riskEvents?.length ? (
        <div className="lg:col-span-3 rounded border border-rose-900/40 bg-rose-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-rose-200">Alertas de riesgo</h2>
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="rounded bg-rose-900/40 px-3 py-1 text-xs text-rose-100"
            >
              <option value="ALL">Todas</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>
          <div className="mt-2 space-y-2">
            {riskEvents
              .filter((event) => riskFilter === "ALL" || event.severity === riskFilter)
              .slice(0, 5)
              .map((event) => (
                <div key={event.id} className="text-xs text-rose-200">
                  Línea {event.line_id}: {event.type} ({event.severity})
                </div>
              ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Estado de líneas</h2>
        {metrics && (
          <div className="grid gap-3 rounded border border-slate-800 bg-slate-900 p-4 text-sm md:grid-cols-6">
            <div>
              <p className="text-xs text-slate-400">Líneas</p>
              <p className="text-lg font-semibold">{metrics.totalLines}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Conectadas</p>
              <p className="text-lg font-semibold">{metrics.connectedLines}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Mensajes 24h</p>
              <p className="text-lg font-semibold">{metrics.messages24h}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Riesgos 24h</p>
              <p className="text-lg font-semibold">{metrics.riskEvents24h}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Respuesta 24h</p>
              <p className="text-lg font-semibold">
                {kpis?.responseRate != null ? `${kpis.responseRate}%` : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg respuesta</p>
              <p className="text-lg font-semibold">
                {kpis?.avgResponseSeconds != null ? `${kpis.avgResponseSeconds}s` : "-"}
              </p>
            </div>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {lines.map((line) => (
            <StatusCard
              key={line.id}
              lineId={line.id}
              name={line.name}
              phone={line.phone}
              status={statusMap[line.id] || line.status || "CREATED"}
              riskScore={riskScores[line.id]?.score ?? null}
            />
          ))}
          {!lines.length && (
            <p className="text-slate-400">No hay sesiones activas.</p>
          )}
        </div>
      </div>
      <div className="lg:col-span-3">
        <DashboardHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          linesCount={lines.length}
          connectedCount={metrics?.connectedLines || 0}
        />
        <div className="mt-6">
          <LineList
            lines={lines}
            searchTerm={searchTerm}
            onConnect={() => {}}
            onDisconnect={() => {}}
            onUpdateWebhook={() => {}}
            onUpdateRateLimit={() => {}}
            onSelect={() => {}}
            onDiagnose={() => {}}
            onDelete={() => {}}
            onResetSafeMode={() => {}}
            disabled={false}
            onShowQr={(lineId) => {
              const line = lines.find((l) => l.id === lineId);
              setSelectedLineForQr(line);
              setQrModalOpen(true);
            }}
            onShowRecentEvents={() => {
              setRecentEventsModalOpen(true);
            }}
          />
        </div>
      </div>
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

      {/* QR Code Modal */}
      <QRModal
        open={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedLineForQr(null);
        }}
        lineData={selectedLineForQr}
        qrDataUrl={
          selectedLineForQr ? qrState[selectedLineForQr.id]?.qr : null
        }
      />

      {/* Recent Events Modal */}
      <RecentEventsModal
        open={recentEventsModalOpen}
        onClose={() => setRecentEventsModalOpen(false)}
        events={recentLogs}
        lineMap={lineMap}
      />
    </div>
  );
}
