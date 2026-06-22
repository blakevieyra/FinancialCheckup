const { dbRun, dbGet, dbAll } = require('./db');

const SPECIALIST_AREAS = new Set(['budget', 'debt', 'insurance', 'investments', 'savings', 'retirement']);
const LOG_AREAS = new Set([...SPECIALIST_AREAS, 'ai-insights', 'comprehensive', 'expert']);

function parseRow(row, { includeBody = false } = {}) {
  let body = {};
  try {
    body = JSON.parse(row.report_json);
  } catch {
    body = {};
  }
  const out = {
    id: row.id,
    area: row.area,
    month: row.month,
    dimensionScore: row.dimension_score,
    dimensionGrade: row.dimension_grade,
    summary: body.summary || body.expert?.headline || '',
    createdAt: row.created_at,
  };
  if (includeBody) {
    out.report = body;
  }
  return out;
}

async function saveAiReport(userId, { area, month, dimensionScore, dimensionGrade, report }) {
  if (!LOG_AREAS.has(area)) {
    throw new Error(`Invalid report area: ${area}`);
  }
  const { lastInsertRowid: id } = await dbRun(
    `INSERT INTO ai_report_log (user_id, area, month, dimension_score, dimension_grade, report_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      area,
      month,
      dimensionScore != null ? Number(dimensionScore) : null,
      dimensionGrade || null,
      JSON.stringify(report),
    ],
  );
  return id;
}

async function listAiReports(userId, { area, month, limit = 30 } = {}) {
  const params = [userId];
  let sql =
    'SELECT id, area, month, dimension_score, dimension_grade, report_json, created_at FROM ai_report_log WHERE user_id = ?';
  if (area) {
    sql += ' AND area = ?';
    params.push(area);
  }
  if (month) {
    sql += ' AND month = ?';
    params.push(month);
  }
  const cap = Math.min(Math.max(Number(limit) || 30, 1), 100);
  sql += ` ORDER BY created_at DESC LIMIT ${cap}`;
  const rows = await dbAll(sql, params);
  return rows.map((r) => parseRow(r));
}

async function getAiReport(userId, id) {
  const row = await dbGet(
    `SELECT id, area, month, dimension_score, dimension_grade, report_json, created_at
     FROM ai_report_log WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  if (!row) return null;
  return parseRow(row, { includeBody: true });
}

async function deleteAiReport(userId, id) {
  const r = await dbRun('DELETE FROM ai_report_log WHERE id = ? AND user_id = ?', [id, userId]);
  return r.rowCount > 0;
}

module.exports = {
  saveAiReport,
  listAiReports,
  getAiReport,
  deleteAiReport,
  SPECIALIST_AREAS,
  LOG_AREAS,
};
