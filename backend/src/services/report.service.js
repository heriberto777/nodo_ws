const nodemailer = require("nodemailer");
const logger = require("../config/logger");
const { db } = require("../models/index");
const { getSettings } = require("../models/settings.model");

const buildReportData = async () => {
  const [summary, kpis] = await Promise.all([
    db.query(
      "SELECT COUNT(*)::int AS total_lines, SUM(CASE WHEN status = 'CONNECTED' THEN 1 ELSE 0 END)::int AS connected_lines FROM lines",
      []
    ),
    db.query(
      "SELECT \n        SUM(CASE WHEN direction = 'IN' THEN 1 ELSE 0 END)::int AS inbound,\n        SUM(CASE WHEN direction = 'OUT' THEN 1 ELSE 0 END)::int AS outbound\n      FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours'",
      []
    )
  ]);

  const risk = await db.query(
    "SELECT COUNT(*)::int AS total, SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END)::int AS high, SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END)::int AS medium FROM risk_events WHERE created_at >= NOW() - INTERVAL '24 hours'",
    []
  );

  const avgResponse = await db.query(
    "SELECT AVG(EXTRACT(EPOCH FROM (o.created_at - i.created_at)))::int AS seconds FROM messages i JOIN messages o ON i.conversation_id = o.conversation_id AND o.direction = 'OUT' AND o.created_at >= i.created_at WHERE i.direction = 'IN' AND i.created_at >= NOW() - INTERVAL '24 hours'",
    []
  );

  return {
    summary: {
      totalLines: summary.rows[0]?.total_lines || 0,
      connectedLines: summary.rows[0]?.connected_lines || 0
    },
    messages24h: {
      inbound: kpis.rows[0]?.inbound || 0,
      outbound: kpis.rows[0]?.outbound || 0
    },
    risks24h: risk.rows[0] || { total: 0, high: 0, medium: 0 },
    avgResponseSeconds: avgResponse.rows[0]?.seconds || null
  };
};

const buildHtml = (data) => {
  return `
    <h2>Reporte diario WhatsApp</h2>
    <p><strong>Líneas totales:</strong> ${data.summary.totalLines}</p>
    <p><strong>Líneas conectadas:</strong> ${data.summary.connectedLines}</p>
    <p><strong>Mensajes 24h:</strong> IN ${data.messages24h.inbound} / OUT ${data.messages24h.outbound}</p>
    <p><strong>Riesgos 24h:</strong> Total ${data.risks24h.total}, High ${data.risks24h.high}, Medium ${data.risks24h.medium}</p>
    <p><strong>Avg respuesta:</strong> ${data.avgResponseSeconds ?? "-"}s</p>
  `;
};

const getTransport = (settings) => {
  if (!settings.smtp_host || !settings.smtp_port) return null;
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: Number(settings.smtp_port) === 465,
    auth: settings.smtp_user && settings.smtp_password
      ? { user: settings.smtp_user, pass: settings.smtp_password }
      : undefined
  });
};

const sendReportNow = async () => {
  const settings = await getSettings();
  if (!settings?.report_enabled) return { skipped: true, reason: "disabled" };

  const transport = getTransport(settings);
  if (!transport) return { skipped: true, reason: "smtp_not_configured" };

  const toList = (settings.smtp_to || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!toList.length || !settings.smtp_from) {
    return { skipped: true, reason: "recipients_or_from_missing" };
  }

  const data = await buildReportData();
  const html = buildHtml(data);

  await transport.sendMail({
    from: settings.smtp_from,
    to: toList,
    subject: "Reporte automático WhatsApp (24h)",
    html
  });

  await db.query("UPDATE settings SET last_report_at = NOW() WHERE id = 1", []);
  logger.info("Report email sent", { to: toList });
  return { sent: true };
};

module.exports = { sendReportNow, buildReportData };
