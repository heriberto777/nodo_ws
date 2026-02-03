export default function DashboardHeader({ searchTerm, onSearchChange, linesCount, connectedCount }) {
  return (
    <div className="mb-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-white">WhatsApp Automation</h1>
        <p className="mt-1 text-sm text-slate-400">Panel de control centralizado</p>
      </div>
      
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar línea por nombre o número..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 px-3 py-2 border border-slate-700">
          <p className="text-xs text-slate-400">Total líneas</p>
          <p className="text-xl font-bold text-white">{linesCount}</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-emerald-900/30 to-slate-900 px-3 py-2 border border-emerald-700/30">
          <p className="text-xs text-emerald-300">Conectadas</p>
          <p className="text-xl font-bold text-emerald-400">{connectedCount}</p>
        </div>
      </div>
    </div>
  );
}
