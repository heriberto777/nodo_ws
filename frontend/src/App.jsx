import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import Dashboard from "./pages/Dashboard.jsx";
import Lines from "./pages/Lines.jsx";
import Settings from "./pages/Settings.jsx";
import Conversations from "./pages/Conversations.jsx";
import BotFlows from "./pages/BotFlows.jsx";
import Warmup from "./pages/Warmup.jsx";
import RiskEvents from "./pages/RiskEvents.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import Notifications from "./pages/Notifications.jsx";
import Metrics from "./pages/Metrics.jsx";
import ToastStack from "./components/ToastStack.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

const baseTabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "lines", label: "Números" },
  { id: "conversations", label: "Conversaciones" },
  { id: "botflows", label: "Bot & Flows", roles: ["admin"] },
  { id: "warmup", label: "Warm-up", roles: ["admin"] },
  { id: "risk", label: "Riesgo", roles: ["admin"] },
  { id: "notifications", label: "Notificaciones", roles: ["admin"] },
  { id: "metrics", label: "Métricas", roles: ["admin"] },
  { id: "audit", label: "Auditoría", roles: ["admin"] },
  { id: "settings", label: "Configuración", roles: ["admin"] }
];

const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:4000";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusList, setStatusList] = useState([]);
  const [qrState, setQrState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [riskEvents, setRiskEvents] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [notifySettings, setNotifySettings] = useState(() => ({
    desktop: localStorage.getItem("wa_notify_desktop") === "true",
    sound: localStorage.getItem("wa_notify_sound") === "true"
  }));
  const [unreadCount, setUnreadCount] = useState(0);
  const notifySettingsRef = useRef(notifySettings);
  const [authView, setAuthView] = useState("login");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("wa_user");
    const token = localStorage.getItem("wa_token");
    if (!stored) return null;
    if (!token) return null;
    try {
      return JSON.parse(stored);
    } catch (error) {
      localStorage.removeItem("wa_user");
      return null;
    }
  });

  const socket = useMemo(() => (user ? io(wsUrl) : null), [user]);
  const tabs = useMemo(() => {
    if (!user) return [];
    return baseTabs.filter((tab) => {
      if (!tab.roles) return true;
      return tab.roles.includes(user.role);
    });
  }, [user]);

  useEffect(() => {
    if (!socket) return undefined;

    socket.on("status:list", (payload) => setStatusList(payload));
    socket.on("status:update", (payload) => {
      setStatusList((prev) => {
        const existing = prev.filter((item) => item.lineId !== payload.lineId);
        return [...existing, payload];
      });
    });
    socket.on("qr", (payload) => setQrState(payload));
    socket.on("message", (payload) => {
      setLogs((prev) => [payload, ...prev].slice(0, 50));
    });
    socket.on("risk:event", (payload) => {
      setRiskEvents((prev) => [payload, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);
      if (["HIGH", "MEDIUM"].includes(payload?.severity)) {
        const toast = {
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          type: payload.type,
          severity: payload.severity,
          lineId: payload.line_id
        };
        setToasts((prev) => [toast, ...prev].slice(0, 5));
        setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== toast.id));
        }, 6000);
      }

      const settings = notifySettingsRef.current;
      if (settings.desktop && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(`Riesgo ${payload.severity}`, {
            body: `Línea ${payload.line_id}: ${payload.type}`
          });
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification(`Riesgo ${payload.severity}`, {
                body: `Línea ${payload.line_id}: ${payload.type}`
              });
            }
          });
        }
      }

      if (settings.sound && payload?.severity === "HIGH") {
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 720;
          gain.gain.value = 0.06;
          oscillator.connect(gain);
          gain.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.25);
        } catch (error) {
          // ignore audio errors
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      try {
        const response = await api.get("/notifications/unread");
        setUnreadCount(response.data.count || 0);
      } catch {
        setUnreadCount(0);
      }
    };
    loadUnread();
    const intervalId = setInterval(loadUnread, 15000);
    const onUpdated = () => loadUnread();
    window.addEventListener("wa:notifications-updated", onUpdated);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("wa:notifications-updated", onUpdated);
    };
  }, [user]);

  useEffect(() => {
    notifySettingsRef.current = notifySettings;
  }, [notifySettings]);

  useEffect(() => {
    const handleNotifySettings = () => {
      setNotifySettings({
        desktop: localStorage.getItem("wa_notify_desktop") === "true",
        sound: localStorage.getItem("wa_notify_sound") === "true"
      });
    };
    window.addEventListener("wa:notify-settings", handleNotifySettings);
    return () => window.removeEventListener("wa:notify-settings", handleNotifySettings);
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem("wa_token");
      localStorage.removeItem("wa_user");
      setUser(null);
    };

    window.addEventListener("wa:logout", handleLogout);
    return () => window.removeEventListener("wa:logout", handleLogout);
  }, []);

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, tabs]);

  const handleLogin = (payload) => {
    localStorage.setItem("wa_token", payload.token);
    localStorage.setItem("wa_user", JSON.stringify(payload.user));
    setUser(payload.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("wa_token");
    localStorage.removeItem("wa_user");
    setUser(null);
  };

  if (!user) {
    if (authView === "register") {
      return <Register onDone={() => setAuthView("login")} />;
    }

    return <Login onLogin={handleLogin} onRegister={() => setAuthView("register")} />;
  }

  return (
    <div className="min-h-screen">
      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
      />
      <header className="border-b border-slate-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">WhatsApp Automation</h1>
            <p className="text-xs text-slate-400">{user.role}</p>
          </div>
          {unreadCount > 0 && (
            <div className="rounded-full bg-rose-500 px-2 py-1 text-xs text-white">
              {unreadCount} alertas
            </div>
          )}
          <button onClick={handleLogout} className="rounded bg-slate-800 px-3 py-2 text-xs">
            Salir
          </button>
        </div>
        <nav className="mt-4 flex gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded px-4 py-2 text-sm ${
                activeTab === tab.id ? "bg-emerald-500 text-slate-950" : "bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-8 py-6">
        {activeTab === "dashboard" && (
          <Dashboard
            statusList={statusList}
            logs={logs}
            qrState={qrState}
            user={user}
            riskEvents={riskEvents}
          />
        )}
        {activeTab === "lines" && <Lines statusList={statusList} qrState={qrState} user={user} />}
        {activeTab === "conversations" && <Conversations />}
        {activeTab === "botflows" && user.role === "admin" && <BotFlows />}
        {activeTab === "warmup" && user.role === "admin" && <Warmup />}
        {activeTab === "risk" && user.role === "admin" && <RiskEvents />}
        {activeTab === "notifications" && user.role === "admin" && <Notifications />}
        {activeTab === "metrics" && user.role === "admin" && <Metrics />}
        {activeTab === "audit" && user.role === "admin" && <AuditLogs />}
        {activeTab === "settings" && user.role === "admin" && <Settings user={user} />}
      </main>
    </div>
  );
}
