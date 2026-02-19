import { useEffect, useState } from "react";
import { api } from "../api/client.js";
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
  const [queueStats, setQueueStats] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let cancelled = false;
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

    const loadQueueStats = async () => {
      if (!isAdmin) {
        if (!cancelled) setQueueStats(null);
        return;
      }
      try {
        const response = await api.get("/messages/queue/stats");
        if (!cancelled) setQueueStats(response.data);
      } catch (error) {
        if (!cancelled) {
          setQueueStats({ error: error?.response?.data?.message || error.message });
        }
      }
    };

    loadLines();
    loadRecent();
    loadRiskScores();
    loadMetrics();
    loadKpis();
    loadQueueStats();

    const intervalId = setInterval(() => {
      loadLines();
      loadRecent();
      loadRiskScores();
      loadMetrics();
      loadKpis();
      loadQueueStats();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isAdmin]);

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
      <div className="lg:col-span-3">
        <DashboardHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          linesCount={lines.length}
          connectedCount={metrics?.connectedLines || 0}
        />
        
        {/* Métricas 24h */}
        {metrics && (
          <div className="mt-4 grid gap-3 rounded border border-slate-800 bg-slate-900 p-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400">Mensajes 24h</p>
              <p className="mt-1 text-2xl font-bold text-blue-400">{metrics.messages24h}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Riesgos 24h</p>
              <p className="mt-1 text-2xl font-bold text-rose-400">{metrics.riskEvents24h}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Respuesta 24h</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {kpis?.responseRate != null ? `${kpis.responseRate}%` : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg respuesta</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {kpis?.avgResponseSeconds != null ? `${kpis.avgResponseSeconds}s` : "-"}
              </p>
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="mt-4 rounded border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Cola outbound</p>
                <p
                  className={`text-2xl font-semibold ${
                    queueStats?.worker?.isRunning ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {queueStats?.worker?.isRunning ? "En ejecución" : "Sin worker"}
                </p>
                <p className="text-xs text-slate-500">
                  Nodo {queueStats?.nodeId || "-"} · Conc {queueStats?.worker?.concurrency || 0}
                </p>
              </div>
              <div className="grid flex-1 grid-cols-3 gap-3 text-center">
                <div className="rounded border border-slate-700 bg-slate-950/40 p-3">
                  <p className="text-[10px] tracking-wide text-slate-400">Pendientes</p>
                  <p className="mt-1 text-xl font-bold text-slate-50">
                    {queueStats?.counts?.waiting ?? "-"}
                  </p>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950/40 p-3">
                  <p className="text-[10px] tracking-wide text-slate-400">Activos</p>
                  <p className="mt-1 text-xl font-bold text-blue-300">
                    {queueStats?.counts?.active ?? "-"}
                  </p>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950/40 p-3">
                  <p className="text-[10px] tracking-wide text-slate-400">Fallidos</p>
                  <p className="mt-1 text-xl font-bold text-rose-300">
                    {queueStats?.counts?.failed ?? "-"}
                  </p>
                </div>
              </div>
            </div>
            {queueStats?.error && (
              <p className="mt-3 text-xs text-rose-300">{queueStats.error}</p>
            )}
          </div>
        )}
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
