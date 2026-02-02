const { db } = require("../models/index");
const { sendReportNow } = require("../services/report.service");

const summary = async (_req, res) => {
  const [lines, connected, messages, risks] = await Promise.all([
    db.query("SELECT COUNT(*)::int AS count FROM lines", []),
    db.query("SELECT COUNT(*)::int AS count FROM lines WHERE status = 'CONNECTED'", []),
    db.query(
      "SELECT COUNT(*)::int AS count FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours'",
      []
    ),
    db.query(
      "SELECT COUNT(*)::int AS count FROM risk_events WHERE created_at >= NOW() - INTERVAL '24 hours'",
      []
    )
  ]);

  res.json({
    totalLines: lines.rows[0]?.count || 0,
    connectedLines: connected.rows[0]?.count || 0,
    messages24h: messages.rows[0]?.count || 0,
    riskEvents24h: risks.rows[0]?.count || 0
  });
};

const kpis = async (_req, res) => {
  const [inbound, outbound] = await Promise.all([
    db.query(
      "SELECT COUNT(*)::int AS count FROM messages WHERE direction = 'IN' AND created_at >= NOW() - INTERVAL '24 hours'",
      []
    ),
    db.query(
      "SELECT COUNT(*)::int AS count FROM messages WHERE direction = 'OUT' AND created_at >= NOW() - INTERVAL '24 hours'",
      []
    )
  ]);

  const responseRate = inbound.rows[0].count
    ? Math.min(100, Math.round((outbound.rows[0].count / inbound.rows[0].count) * 100))
    : 0;

  const avgResponse = await db.query(
    "SELECT AVG(EXTRACT(EPOCH FROM (o.created_at - i.created_at)))::int AS seconds FROM messages i JOIN messages o ON i.conversation_id = o.conversation_id AND o.direction = 'OUT' AND o.created_at >= i.created_at WHERE i.direction = 'IN' AND i.created_at >= NOW() - INTERVAL '24 hours'",
    []
  );

  res.json({
    responseRate,
    avgResponseSeconds: avgResponse.rows[0]?.seconds || null
  });
};

const lineMetrics = async (req, res) => {
  const schema = require("joi").object({
    lineId: require("joi").number().integer().positive().optional(),
    from: require("joi").date().iso().optional(),
    to: require("joi").date().iso().optional()
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ message: "Invalid query" });

  const from = value.from ? new Date(value.from) : null;
  const to = value.to ? new Date(value.to) : null;

  const where = [];
  const params = [];
  if (value.lineId) {
    params.push(value.lineId);
    where.push(`line_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    where.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    where.push(`created_at <= $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const counts = await db.query(
    `SELECT
      SUM(CASE WHEN direction = 'IN' THEN 1 ELSE 0 END)::int AS inbound,
      SUM(CASE WHEN direction = 'OUT' THEN 1 ELSE 0 END)::int AS outbound
     FROM messages ${whereSql}`,
    params
  );

  const responseTime = await db.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (o.created_at - i.created_at)))::int AS seconds
     FROM messages i
     JOIN messages o ON i.conversation_id = o.conversation_id AND o.direction = 'OUT' AND o.created_at >= i.created_at
     ${whereSql.replace(/line_id/g, 'i.line_id').replace(/created_at/g, 'i.created_at')}`,
    params
  );

  res.json({
    inbound: counts.rows[0]?.inbound || 0,
    outbound: counts.rows[0]?.outbound || 0,
    avgResponseSeconds: responseTime.rows[0]?.seconds || null
  });
};

const triggerReport = async (_req, res) => {
  const result = await sendReportNow();
  res.json(result);
};

module.exports = { summary, kpis, lineMetrics, sendReportNow: triggerReport };
