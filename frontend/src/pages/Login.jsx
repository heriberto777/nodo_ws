import { useState } from "react";
import { api } from "../api/client.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await api.post("/auth/login", { email, password });
      onLogin(response.data);
    } catch (err) {
      setError("Credenciales inválidas");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-400">Acceso al panel administrativo</p>

        <div className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Contraseña"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <button className="mt-6 w-full rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950">
          Entrar
        </button>
      </form>
    </div>
  );
}
