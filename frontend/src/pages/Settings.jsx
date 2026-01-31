import { useState } from "react";

export default function Settings({ user }) {
  const [rateLimit, setRateLimit] = useState({ perMinute: 15, perHour: 300, perDay: 1000 });
  const [n8nWebhook, setN8nWebhook] = useState("");
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
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
    </div>
  );
}
