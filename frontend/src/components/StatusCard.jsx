export default function StatusCard({ lineId, name, phone, status }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">Línea</p>
      <p className="text-lg font-semibold">{name || `Línea ${lineId}`}</p>
      <p className="text-xs text-slate-500">{phone || lineId}</p>
      <p className="mt-2 text-xs uppercase tracking-widest text-emerald-400">{status}</p>
    </div>
  );
}
