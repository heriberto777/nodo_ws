import { useState } from "react";
import { api } from "../api/client.js";

export default function Register({ onDone }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      await api.post("/auth/register", form);
      setSuccess(true);
    } catch (err) {
      setError("No se pudo crear el usuario");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold">Crear usuario</h1>
        <p className="mt-2 text-sm text-slate-400">Primer usuario administrador</p>

        <div className="mt-6 space-y-4">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Nombre"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="Correo"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            type="password"
            placeholder="Contraseña"
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="admin">admin</option>
            <option value="operator">operator</option>
            <option value="viewer">viewer</option>
          </select>
        </div>

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-400">Usuario creado. Inicia sesión.</p>}

        <button className="mt-6 w-full rounded bg-emerald-500 px-4 py-2 text-sm text-slate-950">
          Crear usuario
        </button>

        <button type="button" onClick={onDone} className="mt-3 w-full rounded bg-slate-800 px-4 py-2 text-sm">
          Volver al login
        </button>
      </form>
    </div>
  );
}
