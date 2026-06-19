const router = require('express').Router();
const { verifyToken } = require('./auth');
const { dbGet, dbAll } = require('./db');
const { snapshotForUserMonth } = require('./ledgerSnapshot');
const { sendReportEmail } = require('./transactionalEmail');
const PDFDocument = require('pdfkit');
const { requireFeature } = require('./requireFeature');
const {
  BRAND,
  reportRef,
  pdfSafeText,
  money,
  drawBrandHeader,
  drawSectionTitle,
  drawKeyValueTable,
  drawDataTable,
  drawLegalDisclosure,
} = require('./reportBranding');

router.use(verifyToken);

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvSafeLabel(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function moneyPlain(n) {
  const x = Number(n) || 0;
  return x.toFixed(2);
}

/** PDFKit core font uses WinAnsi; strip unsupported glyphs (e.g., emoji) for clean output. */
async function reportContext(userId, month) {
  const user = await dbGet(
    `SELECT u.id, u.username, u.email, p.digest_email
     FROM users u
     LEFT JOIN user_preferences p ON p.user_id = u.id
     WHERE u.id = ?`,
    [userId],
  );
  const checkupRow = await dbGet(
    `SELECT overall_score, result_json FROM checkup_history
     WHERE user_id = ? AND month = ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId, month],
  );
  let checkup = null;
  try {
    checkup = checkupRow?.result_json ? JSON.parse(checkupRow.result_json) : null;
  } catch {
    checkup = null;
  }
  const preparedFor = user?.email || user?.digest_email || user?.username || 'Account holder';
  return {
    user,
    preparedFor,
    ref: reportRef('FC'),
    checkup,
    overallScore: checkupRow?.overall_score ?? checkup?.overallScore ?? null,
  };
}

function addMonths(yyyyMm, delta) {
  const [y, m] = String(yyyyMm).split('-').map((x) => Number(x));
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthSeries(rowsIncome, rowsExpense) {
  const incMap = new Map(rowsIncome.map((r) => [r.month, Number(r.amount) || 0]));
  const expMap = new Map(rowsExpense.map((r) => [r.month, Number(r.total) || 0]));
  const months = Array.from(new Set([...incMap.keys(), ...expMap.keys()])).sort();
  return months.map((m) => ({
    month: m,
    income: incMap.get(m) ?? 0,
    expenses: expMap.get(m) ?? 0,
    balance: (incMap.get(m) ?? 0) - (expMap.get(m) ?? 0),
  }));
}

async function buildBusinessDocs(userId, month, windowMonths = 12) {
  const current = await snapshotForUserMonth(userId, month);
  const incRows = await dbAll(
    'SELECT month, MAX(amount) AS amount FROM income WHERE user_id = ? GROUP BY month ORDER BY month ASC',
    [userId],
  );
  const expRows = await dbAll(
    'SELECT month, SUM(amount) AS total FROM expenses WHERE user_id = ? GROUP BY month ORDER BY month ASC',
    [userId],
  );
  const series = monthSeries(incRows, expRows).slice(-windowMonths);

  const ttmIncome = series.reduce((s, r) => s + r.income, 0);
  const ttmExpenses = series.reduce((s, r) => s + r.expenses, 0);
  const ttmNet = ttmIncome - ttmExpenses;

  const currentAssets = Math.max(0, current.balance);
  const currentLiabilities = Math.max(0, -current.balance);
  const equity = currentAssets - currentLiabilities;

  return {
    month,
    monthsWindow: windowMonths,
    balanceSheet: {
      asOfMonth: month,
      assets: {
        currentAssets: Number(currentAssets.toFixed(2)),
        estimatedCashFromOperations: Number(currentAssets.toFixed(2)),
        totalAssets: Number(currentAssets.toFixed(2)),
      },
      liabilities: {
        currentLiabilities: Number(currentLiabilities.toFixed(2)),
        totalLiabilities: Number(currentLiabilities.toFixed(2)),
      },
      equity: {
        retainedEarningsProxy: Number(equity.toFixed(2)),
        totalEquity: Number(equity.toFixed(2)),
      },
    },
    incomeStatement: {
      periodStart: series[0]?.month || month,
      periodEnd: series[series.length - 1]?.month || month,
      revenue: Number(ttmIncome.toFixed(2)),
      operatingExpenses: Number(ttmExpenses.toFixed(2)),
      netIncome: Number(ttmNet.toFixed(2)),
      marginPercent: Number((ttmIncome > 0 ? (ttmNet / ttmIncome) * 100 : 0).toFixed(2)),
    },
    cashFlowSummary: {
      operatingCashFlowProxy: Number(ttmNet.toFixed(2)),
      averageMonthlyNetCashFlow: Number((series.length ? ttmNet / series.length : 0).toFixed(2)),
      trend: series.length >= 2 && series[series.length - 1].balance >= series[0].balance ? 'up' : 'down',
    },
    notes: [
      'These business statements are generated from income/expense ledger entries.',
      'For formal accounting, integrate with a full chart-of-accounts + accrual workflow.',
    ],
  };
}

/** GET /api/reports/csv?month=YYYY-MM */
router.get('/csv', requireFeature('exports'), async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }

    const user = await dbGet('SELECT id, username, email FROM users WHERE id = ?', [req.user.id]);
    const snap = await snapshotForUserMonth(req.user.id, month);
    const ctx = await reportContext(req.user.id, month);
    const sortedExpenses = [...snap.expenses].sort((a, b) => b.amount - a.amount);
    const savingsRate = snap.income > 0 ? (snap.balance / snap.income) * 100 : 0;

    const lines = [
      'sep=,',
      `${BRAND.product} — Confidential data export`,
      `Report ID,${csvEscape(ctx.ref)}`,
      `Generated,${csvEscape(new Date().toISOString())}`,
      `Prepared for,${csvEscape(csvSafeLabel(ctx.preparedFor))}`,
      `Account,${csvEscape(csvSafeLabel(user?.username))}`,
      `Reporting period,${csvEscape(month)}`,
      `Support,${csvEscape(BRAND.supportEmail)}`,
      '',
      '─── SUMMARY ───',
      `Income,${moneyPlain(snap.income)}`,
      `Total expenses,${moneyPlain(snap.totalExpenses)}`,
      `Net surplus (deficit),${moneyPlain(snap.balance)}`,
      `Expense ratio %,${snap.expenseRatio.toFixed(1)}`,
      `Savings rate %,${savingsRate.toFixed(1)}`,
      `Budget grade,${csvEscape(snap.grade)}`,
      ctx.overallScore != null ? `Overall checkup score,${Math.round(ctx.overallScore)}` : null,
      ctx.checkup?.headline ? `Headline,${csvEscape(csvSafeLabel(ctx.checkup.headline))}` : null,
      '',
    ].filter(Boolean);

    if (ctx.checkup?.dimensions?.length) {
      lines.push('─── CHECKUP DIMENSIONS ───', 'Dimension,Score,Grade,Status');
      ctx.checkup.dimensions.forEach((d) => {
        lines.push(
          `${csvEscape(csvSafeLabel(d.label))},${Math.round(d.score || 0)},${csvEscape(d.grade || '')},${csvEscape(d.status || '')}`,
        );
      });
      lines.push('');
    }

    lines.push('─── EXPENSE DETAIL ───', 'Category,Amount,Share of expenses %,Month');
    sortedExpenses.forEach((e) => {
      const pct = snap.totalExpenses > 0 ? ((e.amount / snap.totalExpenses) * 100).toFixed(1) : '0.0';
      lines.push(`${csvEscape(csvSafeLabel(e.category))},${moneyPlain(e.amount)},${pct},${csvEscape(month)}`);
    });

    lines.push(
      '',
      '─── LEGAL NOTICE ───',
      `Disclaimer,"${csvEscape('Educational use only. Not investment, tax, legal, or accounting advice. Verify all figures with qualified professionals.')}"`,
      `Operator,${csvEscape(BRAND.company)}`,
      `Product,${csvEscape(BRAND.product)}`,
    );

    const filename = `financialcheckup-${month}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${lines.join('\r\n')}`);
    sendReportEmail(req.user.id, { reportType: 'csv', month }).catch(() => {});
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/** GET /api/reports/summary?month= — JSON mirror of export (for integrations) */
router.get('/summary', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }
    const user = await dbGet('SELECT username FROM users WHERE id = ?', [req.user.id]);
    const snap = await snapshotForUserMonth(req.user.id, month);
    res.json({ username: user?.username, ...snap });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/** GET /api/reports/executive-pdf?month=YYYY-MM */
router.get('/executive-pdf', requireFeature('exports'), async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }

    const user = await dbGet('SELECT id, username, email FROM users WHERE id = ?', [req.user.id]);
    const snap = await snapshotForUserMonth(req.user.id, month);
    const ctx = await reportContext(req.user.id, month);

    const savingsRate = snap.income > 0 ? (snap.balance / snap.income) * 100 : 0;
    const sortedExpenses = [...snap.expenses].sort((a, b) => b.amount - a.amount);

    const incRows = await dbAll(
      'SELECT month, MAX(amount) AS amount FROM income WHERE user_id = ? GROUP BY month ORDER BY month ASC',
      [req.user.id],
    );
    const expRows = await dbAll(
      'SELECT month, SUM(amount) AS total FROM expenses WHERE user_id = ? GROUP BY month ORDER BY month ASC',
      [req.user.id],
    );
    const trendSeries = monthSeries(incRows, expRows).slice(-6);

    const filename = `financialcheckup-executive-${month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 48, bufferPages: true });
    doc.pipe(res);

    drawBrandHeader(doc, {
      documentTitle: 'Executive Financial Scorecard',
      documentSubtitle: `Reporting period: ${month}`,
      metaLines: [
        `Report ID: ${ctx.ref}`,
        `Prepared for: ${ctx.preparedFor}`,
        `Account: ${user?.username || 'Unknown'}`,
        `Generated: ${new Date().toISOString().slice(0, 19)} UTC`,
      ],
    });

    drawSectionTitle(doc, 'Executive summary');
    const summaryParts = [
      ctx.checkup?.headline ? pdfSafeText(ctx.checkup.headline) : null,
      ctx.overallScore != null
        ? `Overall financial health score: ${Math.round(ctx.overallScore)}/100 (${pdfSafeText(ctx.checkup?.overallGrade || snap.grade)}).`
        : null,
      `Monthly income ${money(snap.income)} against expenses ${money(snap.totalExpenses)} yields a ${snap.balance >= 0 ? 'surplus' : 'deficit'} of ${money(Math.abs(snap.balance))} (${Number(snap.expenseRatio).toFixed(1)}% expense ratio).`,
    ].filter(Boolean);
    doc.font('Helvetica').fontSize(10).fillColor('#374151').text(summaryParts.join(' '), { align: 'justify' });
    doc.moveDown(0.8);

    drawSectionTitle(doc, 'Key performance indicators');
    drawKeyValueTable(doc, [
      ['Monthly income', money(snap.income)],
      ['Total operating expenses', money(snap.totalExpenses)],
      ['Net surplus / (deficit)', money(snap.balance)],
      ['Expense-to-income ratio', `${Number(snap.expenseRatio).toFixed(1)}%`],
      ['Savings rate', `${Number(savingsRate).toFixed(1)}%`],
      ['Budget grade', String(snap.grade || 'N/A')],
      ...(ctx.overallScore != null ? [['Overall checkup score', `${Math.round(ctx.overallScore)}/100`]] : []),
    ]);

    if (ctx.checkup?.dimensions?.length) {
      drawSectionTitle(doc, 'Six-dimension health scorecard');
      drawDataTable(doc, {
        headers: ['Dimension', 'Score', 'Grade', 'Status'],
        colWidths: [200, 70, 70, 180],
        rows: ctx.checkup.dimensions.map((d) => [
          d.label,
          String(Math.round(d.score || 0)),
          d.grade || '—',
          d.status || '—',
        ]),
      });
    }

    drawSectionTitle(doc, 'Expense analysis — all categories');
    if (sortedExpenses.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('No expense lines recorded for this period.');
    } else {
      drawDataTable(doc, {
        headers: ['Category', 'Amount', 'Share'],
        colWidths: [240, 100, 80],
        rows: sortedExpenses.map((row) => {
          const pct = snap.totalExpenses > 0 ? (row.amount / snap.totalExpenses) * 100 : 0;
          return [row.category, money(row.amount), `${pct.toFixed(1)}%`];
        }),
      });
    }

    if (trendSeries.length >= 2) {
      drawSectionTitle(doc, 'Trailing monthly trend (up to 6 months)');
      drawDataTable(doc, {
        headers: ['Month', 'Income', 'Expenses', 'Net'],
        colWidths: [90, 110, 110, 110],
        rows: trendSeries.map((r) => [
          r.month,
          money(r.income),
          money(r.expenses),
          money(r.balance),
        ]),
      });
    }

    drawSectionTitle(doc, 'Prioritized recommendations');
    const tips = [
      ...(ctx.checkup?.actionPlan || []).slice(0, 4).map((p) => (typeof p === 'string' ? p : p.title || p.message || p.action || '')),
      ...(snap.deterministicTips || []),
    ].filter(Boolean);
    const uniqueTips = [...new Set(tips.map((t) => pdfSafeText(t)))].slice(0, 8);
    if (!uniqueTips.length) {
      doc.font('Helvetica').fontSize(10).text('Add consistent monthly data to unlock personalized recommendations.');
    } else {
      uniqueTips.forEach((tip) => {
        doc.font('Helvetica').fontSize(10).fillColor('#111827').text(`• ${tip}`);
        doc.moveDown(0.12);
      });
    }

    doc.moveDown(0.6);
    drawLegalDisclosure(doc, { reportType: 'Executive Financial Scorecard' });

    doc.end();
    sendReportEmail(req.user.id, { reportType: 'executive-pdf', month }).catch(() => {});
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/** GET /api/reports/forecast?month=YYYY-MM */
router.get('/forecast', requireFeature('forecast'), async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }

    const uid = req.user.id;
    const incRows = await dbAll(
      'SELECT month, MAX(amount) AS amount FROM income WHERE user_id = ? GROUP BY month ORDER BY month ASC',
      [uid],
    );
    const expRows = await dbAll(
      'SELECT month, SUM(amount) AS total FROM expenses WHERE user_id = ? GROUP BY month ORDER BY month ASC',
      [uid],
    );
    const series = monthSeries(incRows, expRows);
    const tail = series.slice(-6);
    const avgIncome = tail.length ? tail.reduce((s, r) => s + r.income, 0) / tail.length : 0;
    const avgExpenses = tail.length ? tail.reduce((s, r) => s + r.expenses, 0) / tail.length : 0;
    const avgBalance = avgIncome - avgExpenses;
    const expenseRatio = avgIncome > 0 ? (avgExpenses / avgIncome) * 100 : 0;

    const horizons = [3, 6, 12].map((h) => {
      const endMonth = addMonths(month, h);
      return {
        months: h,
        endMonth,
        projectedIncome: Number((avgIncome * h).toFixed(2)),
        projectedExpenses: Number((avgExpenses * h).toFixed(2)),
        projectedNet: Number((avgBalance * h).toFixed(2)),
        projectedAvgMonthlyNet: Number(avgBalance.toFixed(2)),
      };
    });

    let longTermHealth = 'watch';
    if (expenseRatio <= 60 && avgBalance > 0) longTermHealth = 'strong';
    else if (expenseRatio > 85 || avgBalance < 0) longTermHealth = 'critical';

    const recommendations = [];
    if (avgBalance < 0) recommendations.push('Current trajectory is negative; reduce recurring categories or increase revenue within 30 days.');
    if (expenseRatio > 80) recommendations.push('Expense ratio is high for long-term resilience; target under 70% as an intermediate milestone.');
    if (avgBalance > 0) recommendations.push('Protect surplus by automating savings/reserve contributions before discretionary spending.');
    if (!recommendations.length) recommendations.push('Add 3-6 months of consistent data for stronger forecasting confidence.');

    res.json({
      baseMonth: month,
      methodology: 'Simple trailing-average projection from last up to 6 months.',
      trailingAverages: {
        monthsUsed: tail.length,
        income: Number(avgIncome.toFixed(2)),
        expenses: Number(avgExpenses.toFixed(2)),
        net: Number(avgBalance.toFixed(2)),
        expenseRatio: Number(expenseRatio.toFixed(2)),
      },
      outcomes: horizons,
      longTermHealth: {
        status: longTermHealth,
        summary:
          longTermHealth === 'strong'
            ? 'Long-term trajectory looks healthy if current behavior is sustained.'
            : longTermHealth === 'critical'
              ? 'Long-term trajectory is at risk; intervention is recommended now.'
              : 'Trajectory is mixed; improve savings consistency and monitor monthly variance.',
        recommendations,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/** GET /api/reports/business-docs?month=YYYY-MM&months=12 */
router.get('/business-docs', requireFeature('businessDocs'), async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }
    const windowMonths = Math.min(24, Math.max(3, Number(req.query.months) || 12));
    res.json(await buildBusinessDocs(req.user.id, month, windowMonths));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/** GET /api/reports/business-docs-pdf?month=YYYY-MM&months=12 */
router.get('/business-docs-pdf', requireFeature('businessDocs'), async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }
    const windowMonths = Math.min(24, Math.max(3, Number(req.query.months) || 12));
    const docs = await buildBusinessDocs(req.user.id, month, windowMonths);
    const ctx = await reportContext(req.user.id, month);
    const user = await dbGet('SELECT username FROM users WHERE id = ?', [req.user.id]);

    const filename = `financialcheckup-business-statements-${month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 48, bufferPages: true });
    doc.pipe(res);

    drawBrandHeader(doc, {
      documentTitle: 'Financial Statements Package',
      documentSubtitle: `Cash-basis summary · Period ending ${month}`,
      metaLines: [
        `Report ID: ${ctx.ref}`,
        `Prepared for: ${ctx.preparedFor}`,
        `Entity / account: ${user?.username || 'Unknown'}`,
        `Analysis window: ${windowMonths} months (${docs.incomeStatement.periodStart} to ${docs.incomeStatement.periodEnd})`,
        `Generated: ${new Date().toISOString().slice(0, 19)} UTC`,
      ],
    });

    drawSectionTitle(doc, 'Table of contents');
    [
      '1. Balance Sheet (Statement of Financial Position)',
      '2. Income Statement (Statement of Operations)',
      '3. Statement of Cash Flows (Summary)',
      '4. Notes to Financial Statements',
      '5. Disclosures & limitations',
    ].forEach((line) => {
      doc.font('Helvetica').fontSize(10).fillColor('#374151').text(line);
      doc.moveDown(0.1);
    });
    doc.moveDown(0.6);

    drawSectionTitle(doc, '1. Balance Sheet');
    doc.font('Helvetica').fontSize(10).fillColor('#374151').text(`As of ${docs.balanceSheet.asOfMonth}`);
    doc.moveDown(0.35);
    drawKeyValueTable(doc, [
      ['ASSETS', ''],
      ['  Current assets (estimated cash from operations)', money(docs.balanceSheet.assets.currentAssets)],
      ['  Total assets', money(docs.balanceSheet.assets.totalAssets)],
      ['', ''],
      ['LIABILITIES', ''],
      ['  Current liabilities (estimated)', money(docs.balanceSheet.liabilities.currentLiabilities)],
      ['  Total liabilities', money(docs.balanceSheet.liabilities.totalLiabilities)],
      ['', ''],
      ['EQUITY', ''],
      ['  Retained earnings (proxy)', money(docs.balanceSheet.equity.retainedEarningsProxy)],
      ['  Total equity', money(docs.balanceSheet.equity.totalEquity)],
    ]);

    drawSectionTitle(doc, '2. Income Statement');
    doc.font('Helvetica').fontSize(10).fillColor('#374151').text(
      `For the period ${docs.incomeStatement.periodStart} through ${docs.incomeStatement.periodEnd}`,
    );
    doc.moveDown(0.35);
    drawKeyValueTable(doc, [
      ['Revenue (total income recorded)', money(docs.incomeStatement.revenue)],
      ['Operating expenses', money(docs.incomeStatement.operatingExpenses)],
      ['Net income (loss)', money(docs.incomeStatement.netIncome)],
      ['Net margin', `${docs.incomeStatement.marginPercent.toFixed(2)}%`],
    ]);

    drawSectionTitle(doc, '3. Statement of Cash Flows (Summary)');
    drawKeyValueTable(doc, [
      ['Net cash from operations (proxy)', money(docs.cashFlowSummary.operatingCashFlowProxy)],
      ['Average monthly net cash flow', money(docs.cashFlowSummary.averageMonthlyNetCashFlow)],
      ['Trend direction', docs.cashFlowSummary.trend === 'up' ? 'Improving' : 'Declining'],
    ]);

    drawSectionTitle(doc, '4. Notes to financial statements');
    (docs.notes || []).forEach((note, i) => {
      doc.font('Helvetica').fontSize(9.5).fillColor('#374151').text(`${i + 1}. ${pdfSafeText(note)}`, { align: 'justify' });
      doc.moveDown(0.25);
    });
    doc.font('Helvetica').fontSize(9.5).text(
      `${(docs.notes?.length || 0) + 1}. Figures are derived from user-entered income and expense ledger data in ${BRAND.product}. No independent verification has been performed.`,
      { align: 'justify' },
    );
    doc.moveDown(0.5);

    drawLegalDisclosure(doc, { reportType: 'Financial Statements Package' });

    doc.end();
    sendReportEmail(req.user.id, { reportType: 'business-pdf', month }).catch(() => {});
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/** GET /api/reports/category-averages?month=YYYY-MM */
router.get('/category-averages', requireFeature('categoryCompare'), async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }

    const raw = await dbAll(
      `SELECT category, AVG(amount) AS "avgAmount", COUNT(*) AS "usersWithCategory"
       FROM expenses
       WHERE month = ?
       GROUP BY category
       ORDER BY "avgAmount" DESC`,
      [month],
    );
    const rows = raw.map((r) => ({
      category: r.category,
      avgAmount: Number(Number(r.avgAmount || 0).toFixed(2)),
      usersWithCategory: Number(r.usersWithCategory || 0),
    }));

    res.json({ month, categories: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
