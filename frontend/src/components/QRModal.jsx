import Modal from "./Modal";

export default function QRModal({ open, onClose, lineData, qrDataUrl }) {
  return (
    <Modal
      open={open}
      title={`QR Code - ${lineData?.name || "Línea"}`}
      onClose={onClose}
      onConfirm={onClose}
      confirmLabel="Cerrar"
    >
      <div className="flex flex-col items-center space-y-4">
        {qrDataUrl ? (
          <div className="rounded-lg border border-slate-700 bg-white p-4">
            <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
          </div>
        ) : (
          <div className="rounded-lg bg-slate-700/30 px-8 py-12 text-center">
            <p className="text-sm text-slate-400">Esperando código QR...</p>
          </div>
        )}
        
        <div className="w-full space-y-2 rounded-lg bg-slate-800/50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Línea:</span>
            <span className="font-mono text-white">{lineData?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Teléfono:</span>
            <span className="font-mono text-white">{lineData?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Estado:</span>
            <span className={`font-semibold ${lineData?.status === "CONNECTED" ? "text-emerald-400" : "text-amber-400"}`}>
              {lineData?.status === "CONNECTED" ? "Conectado" : "Pendiente"}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
