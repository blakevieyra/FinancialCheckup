const router = require('express').Router();
const { verifyToken } = require('./auth');
const { dbGet, dbAll } = require('./db');
const { snapshotForUserMonth } = require('./ledgerSnapshot');
const PDFDocument = require('pdfkit');

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

function money(n) {
  const x = Number(n) || 0;
  return x.toFixed(2);
}

/** PDFKit core font uses WinAnsi; strip unsupported glyphs (e.g., emoji) for clean output. */
function pdfSafeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
router.get('/csv', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }

    const user = await dbGet('SELECT id, username FROM users WHERE id = ?', [req.user.id]);
    const snap = await snapshotForUserMonth(req.user.id, month);

    const lines = [
      'sep=,',
      'FinancialCheckup export',
      `Generated,${csvEscape(new Date().toISOString())}`,
      `Username,${csvEscape(csvSafeLabel(user?.username))}`,
      `Month,${csvEscape(month)}`,
      `Income,${money(snap.income)}`,
      `Total expenses,${money(snap.totalExpenses)}`,
      `Balance,${money(snap.balance)}`,
      `Expense ratio %,${snap.expenseRatio.toFixed(1)}`,
      `Grade,${csvEscape(snap.grade)}`,
      '',
      'Category,Amount,Month',
      ...snap.expenses.map(
        (e) => `${csvEscape(csvSafeLabel(e.category))},${money(e.amount)},${csvEscape(month)}`,
      ),
    ];

    const filename = `financialcheckup-${month}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    /** Excel on Windows expects BOM for UTF-8 emoji/category labels. */
    res.send(`\uFEFF${lines.join('\r\n')}`);
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
router.get('/executive-pdf', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }

    const user = await dbGet('SELECT id, username FROM users WHERE id = ?', [req.user.id]);
    const snap = await snapshotForUserMonth(req.user.id, month);

    const savingsRate = snap.income > 0 ? (snap.balance / snap.income) * 100 : 0;
    const topExpenses = [...snap.expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

    const filename = `financialcheckup-executive-scorecard-${month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 42 });
    doc.pipe(res);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc.fontSize(20).fillColor('#111827').text('FinancialCheckup Executive Scorecard', left, 40);
    doc
      .fontSize(11)
      .fillColor('#4B5563')
      .text(
        `User: ${pdfSafeText(user?.username || 'Unknown')}   Month: ${month}   Generated: ${new Date().toISOString().slice(0, 10)}`,
      );

    doc.moveDown(1.1);
    doc.fontSize(13).fillColor('#111827').text('Core KPIs', { underline: true });
    doc.moveDown(0.4);

    const kpis = [
      ['Income', `$${Number(snap.income).toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
      ['Total Expenses', `$${Number(snap.totalExpenses).toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
      ['Net Surplus', `$${Number(snap.balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
      ['Expense Ratio', `${Number(snap.expenseRatio).toFixed(1)}%`],
      ['Savings Rate', `${Number(savingsRate).toFixed(1)}%`],
      ['Budget Grade', String(snap.grade || 'N/A')],
    ];

    kpis.forEach(([label, value]) => {
      doc.fontSize(11).fillColor('#111827').text(`${label}: `, { continued: true }).fillColor('#0F766E').text(value);
    });

    doc.moveDown(1);
    doc.fontSize(13).fillColor('#111827').text('Top Expense Categories', { underline: true });
    doc.moveDown(0.4);
    if (topExpenses.length === 0) {
      doc.fontSize(11).fillColor('#6B7280').text('No expense lines for this month.');
    } else {
      topExpenses.forEach((row, i) => {
        const pct = snap.totalExpenses > 0 ? (row.amount / snap.totalExpenses) * 100 : 0;
        doc
          .fontSize(11)
          .fillColor('#111827')
          .text(`${i + 1}. ${pdfSafeText(row.category)}`, { continued: true })
          .fillColor('#6B7280')
          .text(`  $${Number(row.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} (${pct.toFixed(1)}%)`);
      });
    }

    doc.moveDown(1);
    doc.fontSize(13).fillColor('#111827').text('Actionable Recommendations', { underline: true });
    doc.moveDown(0.4);
    (snap.deterministicTips || []).slice(0, 6).forEach((tip, i) => {
      doc.fontSize(11).fillColor('#111827').text(`• ${pdfSafeText(tip)}`);
      if (i < 5) doc.moveDown(0.15);
    });

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#6B7280').text(
      'Educational use only. This report is generated from user-entered data and is not investment, legal, or tax advice.',
      { width: pageWidth },
    );

    doc.end();
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/** GET /api/reports/forecast?month=YYYY-MM */
router.get('/forecast', async (req, res) => {
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
router.get('/business-docs', async (req, res) => {
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
router.get('/business-docs-pdf', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM.' });
    }
    const windowMonths = Math.min(24, Math.max(3, Number(req.query.months) || 12));
    const docs = await buildBusinessDocs(req.user.id, month, windowMonths);

    const filename = `financialcheckup-business-docs-${month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 42 });
    doc.pipe(res);
    doc.fontSize(20).fillColor('#111827').text('FinancialCheckup Business Documents');
    doc.fontSize(11).fillColor('#4B5563').text(`As of ${month} · Window ${windowMonths} months`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#111827').text('Balance Sheet', { underline: true });
    doc.fontSize(11).fillColor('#111827').text(`Assets: $${docs.balanceSheet.assets.totalAssets.toLocaleString()}`);
    doc.text(`Liabilities: $${docs.balanceSheet.liabilities.totalLiabilities.toLocaleString()}`);
    doc.text(`Equity: $${docs.balanceSheet.equity.totalEquity.toLocaleString()}`);
    doc.moveDown(0.8);

    doc.fontSize(13).text('Income Statement', { underline: true });
    doc.fontSize(11).text(`Revenue: $${docs.incomeStatement.revenue.toLocaleString()}`);
    doc.text(`Operating Expenses: $${docs.incomeStatement.operatingExpenses.toLocaleString()}`);
    doc.text(`Net Income: $${docs.incomeStatement.netIncome.toLocaleString()}`);
    doc.text(`Margin: ${docs.incomeStatement.marginPercent.toFixed(2)}%`);
    doc.moveDown(0.8);

    doc.fontSize(13).text('Cash Flow Summary', { underline: true });
    doc.fontSize(11).text(`Operating Cash Flow: $${docs.cashFlowSummary.operatingCashFlowProxy.toLocaleString()}`);
    doc.text(`Average Monthly Net Cash Flow: $${docs.cashFlowSummary.averageMonthlyNetCashFlow.toLocaleString()}`);
    doc.text(`Trend: ${docs.cashFlowSummary.trend}`);
    doc.moveDown(1);

    doc.fontSize(9).fillColor('#6B7280').text(
      'Professional summary generated from ledger-based cash accounting proxies. For formal reporting, use full accrual accounting systems.',
    );
    doc.end();
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error.' }); }
});

/** GET /api/reports/category-averages?month=YYYY-MM */
router.get('/category-averages', async (req, res) => {
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
