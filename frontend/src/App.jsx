import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import Dashboard from "./pages/Dashboard.jsx";
import Lines from "./pages/Lines.jsx";
import Settings from "./pages/Settings.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

const baseTabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "lines", label: "Números" },
  { id: "settings", label: "Configuración", roles: ["admin"] }
];

const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:4000";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusList, setStatusList] = useState([]);
  const [qrState, setQrState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [authView, setAuthView] = useState("login");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("wa_user");
    if (!stored) return null;
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

    return () => {
      socket.disconnect();
    };
  }, [socket]);

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
      <header className="border-b border-slate-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">WhatsApp Automation</h1>
            <p className="text-xs text-slate-400">{user.role}</p>
          </div>
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
          <Dashboard statusList={statusList} logs={logs} qrState={qrState} user={user} />
        )}
        {activeTab === "lines" && <Lines statusList={statusList} qrState={qrState} user={user} />}
        {activeTab === "settings" && user.role === "admin" && <Settings user={user} />}
      </main>
    </div>
  );
}
