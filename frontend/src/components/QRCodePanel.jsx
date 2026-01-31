import { QRCodeCanvas } from "qrcode.react";

export default function QRCodePanel({ qrState }) {
  if (!qrState?.qr) {
    return (
      <div className="rounded border border-dashed border-slate-700 p-6 text-slate-400">
        QR no disponible
      </div>
    );
  }

  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">QR para línea</p>
      <p className="text-lg font-semibold">{qrState.lineId}</p>
      <div className="mt-4 inline-block rounded bg-white p-4">
        <QRCodeCanvas value={qrState.qr} size={200} />
      </div>
    </div>
  );
}
