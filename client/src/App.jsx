import { useEffect, useMemo, useState } from 'react';
import * as api from './api';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeTotalExpenses(expenses) {
  return (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

function computeExpenseRatio({ income, totalExpenses }) {
  const incomeNum = Number(income) || 0;
  if (incomeNum <= 0) return 0;
  return (Number(totalExpenses) / incomeNum) * 100;
}

function gradeFromExpenseRatio(ratio) {
  if (!Number.isFinite(ratio)) return 'N/A';
  if (ratio < 30) return 'A';
  if (ratio < 50) return 'B';
  if (ratio < 65) return 'C';
  if (ratio < 80) return 'D';
  return 'F';
}

function PieChartSvg({ data, colors }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 78;
  const cx = 110;
  const cy = 110;
  const toXY = (angleRad) => ({
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  });

  if (!data.length || total <= 0) {
    return (
      <div style={{ opacity: 0.85, padding: '0.75rem 0' }}>
        No expenses to chart for this month yet.
      </div>
    );
  }

  let angle = -Math.PI / 2;
  const segments = [];
  for (let i = 0; i < data.length; i += 1) {
    const slice = (data[i].value / total) * Math.PI * 2;
    const start = angle;
    const end = angle + slice;
    angle = end;

    const startXY = toXY(start);
    const endXY = toXY(end);
    const largeArc = slice > Math.PI ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${startXY.x} ${startXY.y}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${endXY.x} ${endXY.y}`,
      'Z',
    ].join(' ');

    segments.push({ path: d, name: data[i].name, value: data[i].value, color: colors[i % colors.length] });
  }

  return (
    <svg viewBox="0 0 220 220" width="100%" height="240" role="img" aria-label="Expenses pie chart">
      {segments.map((s, idx) => (
        <path key={`${s.name}-${idx}`} d={s.path} fill={s.color} stroke="rgba(255,255,255,0.25)" strokeWidth="1">
          <title>{`${s.name}: $${s.value.toLocaleString()}`}</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={45} fill="#0b0f14" stroke="rgba(255,255,255,0.08)" />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#e6edf3" fontSize="18" fontWeight="700">
        {data.length ? data.length : ''}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill="rgba(230,237,243,0.8)" fontSize="12">
        categories
      </text>
    </svg>
  );
}

function LineChartSvg({ data }) {
  const width = 680;
  const height = 240;
  const padL = 55;
  const padR = 15;
  const padT = 20;
  const padB = 35;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const expensesVals = data.map((d) => d.expensesTotal);
  const incomeVals = data.map((d) => d.incomeAmount);
  const allVals = expensesVals.concat(incomeVals);
  const maxY = Math.max(1, ...allVals);
  const y = (v) => padT + plotH * (1 - v / maxY);
  const x = (i) => padL + (plotW * (data.length <= 1 ? 0 : i / (data.length - 1)));

  const expensesPoints = data.map((d, i) => `${x(i)},${y(d.expensesTotal)}`).join(' ');
  const incomePoints = data.map((d, i) => `${x(i)},${y(d.incomeAmount)}`).join(' ');

  const gridCount = 3;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => i);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="260" role="img" aria-label="History line chart">
      {gridLines.map((i) => {
        const v = (maxY * i) / gridCount;
        const yy = y(v);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={width - padR} y2={yy} stroke="rgba(255,255,255,0.08)" />
            <text x={8} y={yy + 4} fill="rgba(230,237,243,0.65)" fontSize="11">
              {Math.round(v / 1000)}k
            </text>
          </g>
        );
      })}

      {data.map((d, i) => (
        <circle
          key={`exp-${d.month}-${i}`}
          cx={x(i)}
          cy={y(d.expensesTotal)}
          r={3}
          fill="#f59e0b"
          opacity={0.9}
        >
          <title>{`Expenses ${d.month}: $${d.expensesTotal.toLocaleString()}`}</title>
        </circle>
      ))}
      {data.map((d, i) => (
        <circle
          key={`inc-${d.month}-${i}`}
          cx={x(i)}
          cy={y(d.incomeAmount)}
          r={3}
          fill="#3b82f6"
          opacity={0.9}
        >
          <title>{`Income ${d.month}: $${d.incomeAmount.toLocaleString()}`}</title>
        </circle>
      ))}

      <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={expensesPoints} />
      <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={incomePoints} />

      {data.map((d, i) => (
        <text key={`lbl-${d.month}-${i}`} x={x(i)} y={height - 12} textAnchor="middle" fill="rgba(230,237,243,0.65)" fontSize="11">
          {d.month}
        </text>
      ))}
    </svg>
  );
}

/** healthScore 0–100 (blue) and expenseRatio % (orange), shared vertical scale up to maxNeeded */
function TrendDualLineSvg({ series }) {
  const width = 680;
  const height = 260;
  const padL = 48;
  const padR = 18;
  const padT = 24;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const data = (series || []).filter((d) => d.eligible && d.expenseRatio != null);

  if (data.length < 2) {
    return <div style={{ opacity: 0.85, padding: '0.75rem 0' }}>Need at least two comparable months to plot improvement.</div>;
  }

  const scores = data.map((d) => Number(d.healthScore) || 0);
  const ratios = data.map((d) => Number(d.expenseRatio) || 0);
  const maxY = Math.max(105, ...scores, ...ratios, 1);
  const y = (v) => padT + plotH * (1 - v / maxY);
  const x = (i) => padL + plotW * (data.length <= 1 ? 0 : i / (data.length - 1));

  const scorePts = data.map((d, i) => `${x(i)},${y(Number(d.healthScore) || 0)}`).join(' ');
  const ratioPts = data.map((d, i) => `${x(i)},${y(Number(d.expenseRatio) || 0)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="280" role="img" aria-label="Health score and expense ratio trend">
      <text x={padL} y={16} fill="rgba(230,237,243,0.75)" fontSize="12">
        Blue = health score (higher better) · Orange = expense ratio % (lower better)
      </text>
      {[0, 0.5, 1].map((t) => {
        const v = maxY * t;
        const yy = y(v);
        return (
          <line key={t} x1={padL} y1={yy} x2={width - padR} y2={yy} stroke="rgba(255,255,255,0.06)" />
        );
      })}
      <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={scorePts} />
      <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" points={ratioPts} />
      {data.map((d, i) => (
        <circle key={`sc-${d.month}`} cx={x(i)} cy={y(Number(d.healthScore) || 0)} r={3} fill="#3b82f6">
          <title>{`${d.month} health ${d.healthScore}`}</title>
        </circle>
      ))}
      {data.map((d, i) => (
        <circle key={`rt-${d.month}`} cx={x(i)} cy={y(Number(d.expenseRatio) || 0)} r={3} fill="#f59e0b">
          <title>{`${d.month} ratio ${d.expenseRatio}%`}</title>
        </circle>
      ))}
      {data.map((d, i) => (
        <text key={`lx-${d.month}`} x={x(i)} y={height - 10} textAnchor="middle" fill="rgba(230,237,243,0.6)" fontSize="10">
          {d.month}
        </text>
      ))}
    </svg>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => localStorage.getItem('username') || '');

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [month, setMonth] = useState(currentMonth());
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState([]);

  const [profile, setProfile] = useState('personal'); // personal | business | organizational
  const [insights, setInsights] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const [exportBusy, setExportBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [expertBusy, setExpertBusy] = useState(false);
  const [expertError, setExpertError] = useState('');
  const [expertData, setExpertData] = useState(null);

  const [rankData, setRankData] = useState(null);
  const [rankErr, setRankErr] = useState('');
  const [rankBusy, setRankBusy] = useState(false);
  const [rankMaskOthers, setRankMaskOthers] = useState(true);

  const [trendsData, setTrendsData] = useState(null);
  const [trendsErr, setTrendsErr] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [businessDocs, setBusinessDocs] = useState(null);
  const [forecastBusy, setForecastBusy] = useState(false);
  const [forecastErr, setForecastErr] = useState('');

  const [expensesHistory, setExpensesHistory] = useState([]);
  const [incomeHistory, setIncomeHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');

  const [newCategory, setNewCategory] = useState('');
  const [catError, setCatError] = useState('');
  const [catBusy, setCatBusy] = useState(false);

  /** Weekly digest (email / SMS) */
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestChannel, setDigestChannel] = useState('none');
  const [digestEmail, setDigestEmail] = useState('');
  const [digestPhone, setDigestPhone] = useState('');
  const [digestWeekday, setDigestWeekday] = useState(1);
  const [digestSmtpReady, setDigestSmtpReady] = useState(false);
  const [digestSmsReady, setDigestSmsReady] = useState(false);
  const [digestCronTz, setDigestCronTz] = useState('America/Los_Angeles');
  const [digestSaveBusy, setDigestSaveBusy] = useState(false);
  const [digestTestBusy, setDigestTestBusy] = useState(false);
  const [digestMsg, setDigestMsg] = useState('');
  const [digestErr, setDigestErr] = useState('');
  const [digestPreview, setDigestPreview] = useState(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('checking…');
  const [viewportW, setViewportW] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );

  const isAuthed = useMemo(() => Boolean(token), [token]);
  const isTablet = viewportW < 1024;
  const isMobile = viewportW < 720;

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    api
      .health()
      .then((j) => setStatus(JSON.stringify(j)))
      .catch((e) => setStatus(`error: ${e.message}`));
  }, []);

  async function loadMonthData() {
    setError('');
    setBusy(true);
    try {
      const [incomeRes, expensesRes] = await Promise.all([
        api.getIncome(token, month),
        api.getExpenses(token, month),
      ]);
      setIncome(Number(incomeRes.amount) || 0);
      setExpenses(Array.isArray(expensesRes) ? expensesRes : []);
    } catch (e) {
      setError(e.message);
      // If token is invalid/expired, force logout
      if (/token/i.test(e.message)) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setToken('');
        setUser('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory() {
    setHistoryError('');
    try {
      const [incRes, expRes] = await Promise.all([
        api.getIncomeHistory(token),
        api.getExpensesHistory(token),
      ]);
      setIncomeHistory(Array.isArray(incRes) ? incRes : []);
      setExpensesHistory(Array.isArray(expRes) ? expRes : []);
    } catch (e) {
      setHistoryError(e.message);
    }
  }

  function applyDigestPrefs(p) {
    setDigestEnabled(Boolean(p.digestEnabled));
    setDigestChannel(p.digestChannel || 'none');
    setDigestEmail(p.digestEmail || '');
    setDigestPhone(p.digestPhone || '');
    setDigestWeekday(Number(p.digestWeekday ?? 1));
    setDigestSmtpReady(Boolean(p.smtpReady));
    setDigestSmsReady(Boolean(p.smsReady));
    setDigestCronTz(p.cronTimezone || 'America/Los_Angeles');
    setDigestPreview(p.preview || null);
  }

  async function loadDigestSettings() {
    setDigestErr('');
    try {
      const p = await api.getDigestPrefs(token);
      applyDigestPrefs(p);
    } catch (e) {
      setDigestErr(e.message);
    }
  }

  async function saveDigestSettings() {
    setDigestErr('');
    setDigestMsg('');
    setDigestSaveBusy(true);
    try {
      await api.updateDigestPrefs(token, {
        digestEnabled,
        digestChannel: digestEnabled ? digestChannel : 'none',
        digestEmail: digestEmail.trim(),
        digestPhone: digestPhone.trim(),
        digestWeekday,
      });
      const p = await api.getDigestPrefs(token);
      applyDigestPrefs(p);
      setDigestMsg('Weekly digest settings saved.');
    } catch (e) {
      setDigestErr(e.message);
    } finally {
      setDigestSaveBusy(false);
    }
  }

  async function sendWeeklyDigestTest() {
    setDigestErr('');
    setDigestMsg('');
    if (digestChannel !== 'email' && digestChannel !== 'sms') {
      setDigestErr('Choose Email or SMS as the delivery channel first.');
      return;
    }
    setDigestTestBusy(true);
    try {
      await api.sendDigestTest(token, {
        channel: digestChannel,
        digestEmail: digestEmail.trim(),
        digestPhone: digestPhone.trim(),
        month,
      });
      setDigestMsg(digestChannel === 'sms' ? 'Test SMS sent.' : 'Test email sent. Check your inbox (and spam folder).');
    } catch (e) {
      setDigestErr(e.message);
    } finally {
      setDigestTestBusy(false);
    }
  }

  async function loadLeaderboardAndTrends() {
    if (!token) return;
    setRankErr('');
    setTrendsErr('');
    setRankBusy(true);
    try {
      const lb = await api.getLeaderboard(token, month, { mask: rankMaskOthers, limit: 25 });
      setRankData(lb);
    } catch (e) {
      setRankErr(e.message);
      setRankData(null);
    }
    try {
      const tr = await api.getMyTrends(token, 14);
      setTrendsData(tr);
    } catch (e) {
      setTrendsErr(e.message);
      setTrendsData(null);
    } finally {
      setRankBusy(false);
    }
  }

  async function loadForecastAndDocs() {
    if (!token) return;
    setForecastErr('');
    setForecastBusy(true);
    try {
      const [forecast, docs] = await Promise.all([
        api.getForecastOutcomes(token, month),
        api.getBusinessDocs(token, month, 12),
      ]);
      setForecastData(forecast);
      setBusinessDocs(docs);
    } catch (e) {
      setForecastErr(e.message);
      setForecastData(null);
      setBusinessDocs(null);
    } finally {
      setForecastBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return undefined;
    loadDigestSettings();
    return undefined;
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    loadLeaderboardAndTrends();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month, rankMaskOthers]);

  useEffect(() => {
    if (!token) return undefined;
    loadForecastAndDocs();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month]);

  useEffect(() => {
    if (!isAuthed) return;
    loadMonthData();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, isAuthed]);

  async function submitAuth(e) {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      const res = authMode === 'register' ? await api.register(username, password) : await api.login(username, password);
      setToken(res.token);
      setUser(res.username);
      localStorage.setItem('token', res.token);
      localStorage.setItem('username', res.username);
      setPassword('');
      setUsername('');
    } catch (e2) {
      setAuthError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAll() {
    setError('');
    setBusy(true);
    try {
      await api.setIncome(token, { amount: Number(income), month });

      const payloadExpenses = expenses.map((e) => ({
        category: e.category,
        amount: Number(e.amount) || 0,
      }));
      await api.updateExpenses(token, { month, expenses: payloadExpenses });

      // Refresh to reflect any server-side normalization/defaults
      await loadMonthData();
      await loadHistory();
      await loadLeaderboardAndTrends();
      await loadForecastAndDocs();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const totalExpenses = useMemo(() => computeTotalExpenses(expenses), [expenses]);
  const expenseRatio = useMemo(() => computeExpenseRatio({ income, totalExpenses }), [income, totalExpenses]);
  const grade = useMemo(() => gradeFromExpenseRatio(expenseRatio), [expenseRatio]);
  const expenseRatioText = useMemo(() => `${expenseRatio.toFixed(1)}%`, [expenseRatio]);
  const savingsAmount = useMemo(() => Number(income || 0) - Number(totalExpenses || 0), [income, totalExpenses]);
  const savingsRate = useMemo(() => {
    const inc = Number(income) || 0;
    if (inc <= 0) return 0;
    return (savingsAmount / inc) * 100;
  }, [income, savingsAmount]);

  const monthPieData = useMemo(() => {
    // Use top categories only; otherwise pie gets unreadable.
    const rows = expenses
      .map((e) => ({ name: e.category, value: Number(e.amount) || 0 }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
    return rows.slice(0, 6);
  }, [expenses]);

  const historySeries = useMemo(() => {
    const expMap = new Map((expensesHistory || []).map((e) => [e.month, Number(e.total) || 0]));
    const incMap = new Map((incomeHistory || []).map((e) => [e.month, Number(e.amount) || 0]));
    const months = Array.from(new Set([...(expensesHistory || []).map((e) => e.month), ...(incomeHistory || []).map((e) => e.month)]));
    months.sort();
    // Keep last 12 months max (server already limits, but be defensive).
    const lastMonths = months.slice(-12);
    return lastMonths.map((m) => ({
      month: m,
      expensesTotal: expMap.get(m) || 0,
      incomeAmount: incMap.get(m) || 0,
    }));
  }, [expensesHistory, incomeHistory]);

  const monthlyExpenseAvg = useMemo(() => {
    if (!historySeries.length) return Number(totalExpenses || 0);
    const total = historySeries.reduce((s, row) => s + (Number(row.expensesTotal) || 0), 0);
    return total / historySeries.length;
  }, [historySeries, totalExpenses]);

  const topCategory = useMemo(() => {
    const rows = (expenses || [])
      .map((e) => ({ category: e.category, amount: Number(e.amount) || 0 }))
      .filter((e) => e.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    if (!rows.length) return null;
    const pct = totalExpenses > 0 ? (rows[0].amount / totalExpenses) * 100 : 0;
    return { ...rows[0], pct };
  }, [expenses, totalExpenses]);

  const monthOverMonthDelta = useMemo(() => {
    if (historySeries.length < 2) return null;
    const prev = historySeries[historySeries.length - 2];
    const curr = historySeries[historySeries.length - 1];
    return {
      expenses: (Number(curr.expensesTotal) || 0) - (Number(prev.expensesTotal) || 0),
      income: (Number(curr.incomeAmount) || 0) - (Number(prev.incomeAmount) || 0),
    };
  }, [historySeries]);

  async function generateInsights() {
    setAiError('');
    setAiBusy(true);
    setInsights([]);
    try {
      const payloadExpenses = expenses.map((e) => ({
        category: e.category,
        amount: Number(e.amount) || 0,
      }));

      const res = await api.getAiInsights(token, {
        income: Number(income) || 0,
        expenses: payloadExpenses,
        totalExpenses: totalExpenses,
        grade,
        expenseRatio: expenseRatio,
        month,
        profile,
      });

      setInsights(Array.isArray(res.insights) ? res.insights : []);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  async function exportMonthCsv() {
    setError('');
    setExportBusy(true);
    try {
      const blob = await api.downloadMonthlyCsv(token, month);
      api.saveBlobAsFile(blob, `financialcheckup-${month}.csv`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExportBusy(false);
    }
  }

  async function exportExecutivePdf() {
    setError('');
    setPdfBusy(true);
    try {
      const blob = await api.downloadExecutivePdf(token, month);
      api.saveBlobAsFile(blob, `financialcheckup-executive-scorecard-${month}.pdf`);
    } catch (e) {
      setError(e.message);
    } finally {
      setPdfBusy(false);
    }
  }

  async function loadExpertBriefing() {
    setExpertError('');
    setExpertData(null);
    setExpertBusy(true);
    try {
      const d = await api.getExpertBriefing(token, { month, profile });
      setExpertData(d);
    } catch (e) {
      setExpertError(e.message);
    } finally {
      setExpertBusy(false);
    }
  }

  const topExpensesForShare = useMemo(() => {
    const total = totalExpenses || 0;
    return (expenses || [])
      .map((e) => ({
        category: e.category,
        amount: Number(e.amount) || 0,
      }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((x) => ({
        ...x,
        pct: total > 0 ? (x.amount / total) * 100 : 0,
      }));
  }, [expenses, totalExpenses]);

  const shareText = useMemo(() => {
    const top = topExpensesForShare;
    const topLine = top.length
      ? top.map((t) => `${t.category} $${t.amount.toLocaleString()} (${t.pct.toFixed(0)}%)`).join('; ')
      : 'No spending recorded yet.';
    return (
      `Financial Checkup (${profile}) — ${month}\n` +
      `Grade: ${grade} (Expense ratio ${expenseRatioText})\n` +
      `Income: $${Number(income || 0).toLocaleString()}\n` +
      `Expenses: $${Number(totalExpenses || 0).toLocaleString()}\n` +
      `Top categories: ${topLine}\n\n` +
      `Try it: ${window.location.origin} (choose your own month, then share again).`
    );
  }, [profile, month, grade, expenseRatioText, income, totalExpenses, topExpensesForShare]);

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  async function shareResult() {
    // Try native share first (works on mobile + some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Financial Checkup', text: shareText });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    const ok = await copyToClipboard(shareText);
    if (!ok) setError('Could not copy share text. Please copy manually.');
  }

  async function addCategory() {
    setCatError('');
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    setCatBusy(true);
    try {
      await api.addExpenseCategory(token, { category: trimmed, month });
      setNewCategory('');
      await loadMonthData();
      await loadHistory();
    } catch (e) {
      setCatError(e.message);
    } finally {
      setCatBusy(false);
    }
  }

  async function removeCategory(category) {
    setCatError('');
    setCatBusy(true);
    try {
      await api.deleteExpenseCategory(token, { category, month });
      await loadMonthData();
      await loadHistory();
    } catch (e) {
      setCatError(e.message);
    } finally {
      setCatBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUser('');
    setExpenses([]);
    setIncome(0);
    setInsights([]);
    setAiError('');
    setHistoryError('');
    setDigestMsg('');
    setDigestErr('');
    setExpertData(null);
    setExpertError('');
    setRankData(null);
    setRankErr('');
    setTrendsData(null);
    setTrendsErr('');
    setForecastData(null);
    setBusinessDocs(null);
    setForecastErr('');
  }

  const shellStyle = {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    minHeight: '100vh',
    padding: '2rem',
    color: '#e6edf3',
    background:
      'radial-gradient(1200px 550px at 15% -10%, rgba(59,130,246,0.25), transparent 55%), radial-gradient(900px 450px at 90% 0%, rgba(16,185,129,0.18), transparent 50%), #0a0f1a',
  };
  const containerStyle = { maxWidth: 1080, margin: '0 auto' };
  const cardStyle = {
    border: '1px solid rgba(148,163,184,0.25)',
    borderRadius: 14,
    padding: '0.85rem 1rem',
    background: 'rgba(15,23,42,0.62)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 10px 28px rgba(2,6,23,0.28)',
  };
  const cardSoftStyle = {
    border: '1px solid rgba(148,163,184,0.22)',
    borderRadius: 12,
    background: 'rgba(15,23,42,0.5)',
    backdropFilter: 'blur(8px)',
  };
  const inputStyle = {
    padding: 10,
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.35)',
    background: '#0b1220',
    color: '#fff',
  };
  const btnBase = {
    padding: '0.56rem 1rem',
    cursor: 'pointer',
    color: '#fff',
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.35)',
    transition: 'all 120ms ease',
  };
  const btnPrimary = { ...btnBase, background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' };
  const btnNeutral = { ...btnBase, background: '#101827' };
  const btnDanger = { ...btnBase, background: 'linear-gradient(135deg, #7f1d1d, #991b1b)' };

  if (!isAuthed) {
    return (
      <div style={shellStyle}>
        <div style={{ ...containerStyle, maxWidth: 860 }}>
        <h1 style={{ marginBottom: 6 }}>FinancialCheckup</h1>
        <p style={{ opacity: 0.85 }}>API via dev proxy: <code>/api</code></p>
        <pre style={{ ...cardStyle, color: '#7dd3fc', overflowX: 'auto' }}>{status}</pre>

        <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              style={authMode === 'login' ? btnPrimary : btnNeutral}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              style={authMode === 'register' ? btnPrimary : btnNeutral}
            >
              Register
            </button>
          </div>

          <form onSubmit={submitAuth} style={{ display: 'grid', gap: 10, maxWidth: 380 }}>
            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ ...inputStyle, width: '100%', marginTop: 4 }}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, width: '100%', marginTop: 4 }}
              />
            </label>

            {authError ? (
              <div style={{ color: '#ffb3b3', fontSize: 14, marginTop: 2 }}>
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              style={{ ...btnPrimary, marginTop: 6 }}
            >
              {busy ? 'Working…' : authMode === 'register' ? 'Create account' : 'Login'}
            </button>
          </form>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Financial Checkup</h1>
          <div style={{ opacity: 0.85 }}>Signed in as <strong>{user}</strong></div>
        </div>
        <button
          type="button"
          onClick={logout}
          style={btnDanger}
        >
          Logout
        </button>
      </div>

      <div style={{ ...cardStyle, marginTop: '1rem', display: 'grid', gap: 12, position: 'sticky', top: 10, zIndex: 5 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>
            <span style={{ opacity: 0.8, fontSize: 13 }}>Month</span>
            <input
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="YYYY-MM"
              style={{ ...inputStyle, marginLeft: 8, width: 160 }}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={loadMonthData}
            style={btnNeutral}
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={saveAll}
            style={btnPrimary}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            disabled={exportBusy || busy}
            onClick={exportMonthCsv}
            style={btnNeutral}
          >
            {exportBusy ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            disabled={pdfBusy || busy}
            onClick={exportExecutivePdf}
            style={btnNeutral}
          >
            {pdfBusy ? 'Building PDF…' : 'Export Executive PDF'}
          </button>
        </div>

        {error ? <div style={{ color: '#ffb3b3' }}>{error}</div> : null}

        <details style={cardStyle}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, outline: 'none' }}>
            Weekly digest (email or SMS)
          </summary>
          <div style={{ marginTop: 12, display: 'grid', gap: 12, maxWidth: 520 }}>
            <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.45, fontSize: 14 }}>
              Get an automated check-in on your chosen weekday. The message summarizes your <strong>current ledger month</strong>{' '}
              (same <code>YYYY-MM</code> as above), with income, expenses, grade, and quick tips — then nudges you to open the app.
            </p>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="checkbox"
                checked={digestEnabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  setDigestEnabled(on);
                  if (on && digestChannel === 'none') setDigestChannel('email');
                  if (!on) setDigestChannel('none');
                }}
              />
              <span>Enable weekly digest</span>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ opacity: 0.85, fontSize: 14 }}>Delivery</span>
              <select
                value={digestChannel}
                disabled={!digestEnabled}
                onChange={(e) => setDigestChannel(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
              >
                {!digestEnabled ? <option value="none">Off</option> : null}
                {digestEnabled ? <option value="email">Email</option> : null}
                {digestEnabled ? <option value="sms">SMS (Twilio)</option> : null}
              </select>
            </label>
            {digestChannel === 'email' ? (
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ opacity: 0.85, fontSize: 14 }}>Email address</span>
                <input
                  value={digestEmail}
                  onChange={(e) => setDigestEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
                />
              </label>
            ) : null}
            {digestChannel === 'sms' ? (
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ opacity: 0.85, fontSize: 14 }}>Mobile (E.164)</span>
                <input
                  value={digestPhone}
                  onChange={(e) => setDigestPhone(e.target.value)}
                  placeholder="+14155552671"
                  style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
                />
              </label>
            ) : null}
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ opacity: 0.85, fontSize: 14 }}>Send on (weekday in {digestCronTz})</span>
              <select
                value={digestWeekday}
                disabled={!digestEnabled}
                onChange={(e) => setDigestWeekday(Number(e.target.value))}
                style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
              >
                {WEEKDAY_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.4 }}>
              Server status: email ready = <strong>{digestSmtpReady ? 'yes' : 'no'}</strong>, SMS ready ={' '}
              <strong>{digestSmsReady ? 'yes' : 'no'}</strong>. Configure <code>SENDGRID_API_KEY</code> + <code>MAIL_FROM</code>{' '}
              and/or Twilio env vars on the server.
            </div>
            {digestPreview ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.7rem', fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  API digest preview ({digestPreview.month})
                </div>
                <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
                  Income <strong>${Number(digestPreview.income || 0).toLocaleString()}</strong> · Expenses{' '}
                  <strong>${Number(digestPreview.totalExpenses || 0).toLocaleString()}</strong> · Balance{' '}
                  <strong>${Number(digestPreview.balance || 0).toLocaleString()}</strong> · Ratio{' '}
                  <strong>{Number(digestPreview.expenseRatio || 0).toFixed(1)}%</strong> · Grade{' '}
                  <strong>{digestPreview.grade || 'N/A'}</strong>
                </div>
                {Array.isArray(digestPreview.topLines) && digestPreview.topLines.length ? (
                  <div style={{ marginTop: 6, opacity: 0.86 }}>
                    Top lines:{' '}
                    {digestPreview.topLines
                      .map((x) => `${x.category} $${Number(x.amount || 0).toLocaleString()}`)
                      .join(' · ')}
                  </div>
                ) : null}
              </div>
            ) : null}
            {digestErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{digestErr}</div> : null}
            {digestMsg ? <div style={{ color: '#86efac', fontSize: 14 }}>{digestMsg}</div> : null}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={digestSaveBusy}
                onClick={saveDigestSettings}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#134', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {digestSaveBusy ? 'Saving…' : 'Save digest settings'}
              </button>
              <button
                type="button"
                disabled={digestTestBusy || !digestEnabled}
                onClick={sendWeeklyDigestTest}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#111', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {digestTestBusy ? 'Sending…' : 'Send test now'}
              </button>
            </div>
          </div>
        </details>

        <details style={cardStyle}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, outline: 'none' }}>
            Expert financial briefing
          </summary>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.45, fontSize: 14 }}>
              One API call pulls an <strong>expert-style CFO / coach brief</strong> (personal vs business vs org) focused on
              budget quality, risk flags, and next best actions. Uses <strong>Anthropic</strong>; add <code>FRED_API_KEY</code> on
              the server for optional US macro context.
            </p>
            <button
              type="button"
              disabled={expertBusy}
              onClick={loadExpertBriefing}
              style={{ padding: '0.55rem 1rem', cursor: 'pointer', background: '#134', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', maxWidth: 360 }}
            >
              {expertBusy ? 'Calling expert API…' : 'Generate expert briefing'}
            </button>
            {expertError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{expertError}</div> : null}
            {expertData ? (
              <div style={{ display: 'grid', gap: 14 }}>
                {expertData.macroUsed ? (
                  <div style={{ fontSize: 13, opacity: 0.82 }}>Macro context from FRED was included.</div>
                ) : (
                  <div style={{ fontSize: 13, opacity: 0.72 }}>
                    No FRED macro line (optional). Set <code>FRED_API_KEY</code> in server <code>.env</code>.
                  </div>
                )}
                <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.75rem' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{expertData.expert?.headline}</div>
                  <div style={{ opacity: 0.92, lineHeight: 1.45 }}>{expertData.expert?.executiveVerdict}</div>
                  <div style={{ marginTop: 10, opacity: 0.88, fontSize: 13 }}>{expertData.expert?.benchmarkContext}</div>
                  {Array.isArray(expertData.expert?.personalizedPriorities) && expertData.expert.personalizedPriorities.length ? (
                    <>
                      <div style={{ marginTop: 10, fontWeight: 700 }}>Priorities</div>
                      <ul style={{ margin: '6px 0 0 1.25rem', lineHeight: 1.45 }}>
                        {expertData.expert.personalizedPriorities.map((x, i) => (
                          <li key={`${i}-${x.slice(0, 24)}`}>{x}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {Array.isArray(expertData.expert?.riskWatchouts) && expertData.expert.riskWatchouts.length ? (
                    <>
                      <div style={{ marginTop: 10, fontWeight: 700 }}>Risks to watch</div>
                      <ul style={{ margin: '6px 0 0 1.25rem', lineHeight: 1.45 }}>
                        {expertData.expert.riskWatchouts.map((x, i) => (
                          <li key={`${i}-${x.slice(0, 24)}`}>{x}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {expertData.expert?.disclaimer ? (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>{expertData.expert.disclaimer}</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </details>

        <details style={cardStyle}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, outline: 'none' }}>
            Leaderboard & your improvement trend
          </summary>
          <div style={{ marginTop: 12, display: 'grid', gap: 18 }}>
            <p style={{ margin: 0, opacity: 0.86, lineHeight: 1.45, fontSize: 14 }}>
              <strong>Ranking</strong> uses the same month as the picker above. Score = <code>100 − expense ratio %</code>{' '}
              (0–100), only for users with income for that month. <strong>Trends</strong> use your stored history across months.
            </p>

            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, opacity: 0.9 }}>
              <input type="checkbox" checked={rankMaskOthers} onChange={(e) => setRankMaskOthers(e.target.checked)} />
              Mask other usernames on leaderboard
            </label>

            {rankBusy ? <div style={{ opacity: 0.8 }}>Updating rankings…</div> : null}
            {rankErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{rankErr}</div> : null}
            {rankData ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Your standing — {rankData.month}</div>
                <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
                  Rank <strong>{rankData.yourRankLabel}</strong> of <strong>{rankData.totalRanked}</strong> scored users{' '}
                  ({rankData.totalUsers} accounts total).
                  {!rankData.you?.eligible ? (
                    <span> Add income for this month to get a ranked score.</span>
                  ) : null}
                  {rankData.you?.eligible && !rankData.youInTopSlice ? (
                    <span>
                      {' '}
                      Full leaderboard shows top <strong>{rankData.leaderboard?.length ?? 25}</strong> — you’re still ranked overall.
                    </span>
                  ) : null}
                </div>
                {rankData.you?.eligible ? (
                  <div style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>
                    Your score <strong>{Number(rankData.you.healthScore).toFixed(1)}</strong> · ratio{' '}
                    <strong>{rankData.you.expenseRatio != null ? `${rankData.you.expenseRatio}%` : '—'}</strong> · surplus{' '}
                    <strong>
                      ${Number(rankData.you.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </strong>
                  </div>
                ) : null}
                <div style={{ marginTop: 12, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', opacity: 0.8 }}>
                        <th style={{ padding: '6px 8px' }}>#</th>
                        <th style={{ padding: '6px 8px' }}>User</th>
                        <th style={{ padding: '6px 8px' }}>Score</th>
                        <th style={{ padding: '6px 8px' }}>Ratio</th>
                        <th style={{ padding: '6px 8px' }}>Grade</th>
                        <th style={{ padding: '6px 8px' }}>Surplus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rankData.leaderboard || []).map((row, idx) => (
                        <tr
                          key={`${row.rank}-${row.username}-${idx}`}
                          style={{
                            background: row.isYou ? 'rgba(59,130,246,0.14)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '6px 8px' }}>{row.rank}</td>
                          <td style={{ padding: '6px 8px' }}>
                            {row.username}
                            {row.isYou ? ' (you)' : ''}
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            {row.healthScore != null ? Number(row.healthScore).toFixed(1) : '—'}
                          </td>
                          <td style={{ padding: '6px 8px' }}>{row.expenseRatio != null ? `${row.expenseRatio}%` : '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{row.grade}</td>
                          <td style={{ padding: '6px 8px' }}>
                            ${Number(row.surplus ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {trendsErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{trendsErr}</div> : null}
            {trendsData?.improvement ? (
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 10,
                  padding: '0.75rem',
                  borderLeft: `4px solid ${
                    trendsData.improvement.direction === 'improving'
                      ? '#22c55e'
                      : trendsData.improvement.direction === 'declining'
                        ? '#ef4444'
                        : '#94a3b8'
                  }`,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Financial trajectory</div>
                <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>{trendsData.improvement.summary}</div>
                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
                  Direction: <strong>{trendsData.improvement.direction}</strong> · Δ health score{' '}
                  <strong>
                    {trendsData.improvement.healthScoreDelta >= 0 ? '+' : ''}
                    {trendsData.improvement.healthScoreDelta}
                  </strong>
                  {trendsData.improvement.expenseRatioDelta != null ? (
                    <>
                      {' '}
                      · Δ expense ratio{' '}
                      <strong>
                        {trendsData.improvement.expenseRatioDelta >= 0 ? '+' : ''}
                        {trendsData.improvement.expenseRatioDelta} pp
                      </strong>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {trendsData?.series?.length >= 2 ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Score vs expense ratio over time</div>
                <TrendDualLineSvg series={trendsData.series} />
              </div>
            ) : trendsData?.series?.length ? (
              <div style={{ opacity: 0.8, fontSize: 14 }}>Add another month of data to see a trend chart.</div>
            ) : null}
          </div>
        </details>

        <details style={cardStyle}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, outline: 'none' }}>
            Projections, long-term health & business documents
          </summary>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, opacity: 0.86, lineHeight: 1.45, fontSize: 14 }}>
              Uses your trailing history to project <strong>3 / 6 / 12 month outcomes</strong>, estimate <strong>long-term financial health</strong>, and generate
              simplified <strong>business accounting statements</strong> from current ledger data.
            </p>
            {forecastBusy ? <div style={{ opacity: 0.8 }}>Building financial outlook…</div> : null}
            {forecastErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{forecastErr}</div> : null}

            {forecastData?.outcomes?.length ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Projected outcomes</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                  {forecastData.outcomes.map((o) => (
                    <div key={o.months} style={{ ...cardSoftStyle, padding: '0.6rem' }}>
                      <div style={{ fontWeight: 700 }}>{o.months}-month</div>
                      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>to {o.endMonth}</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>Income: <strong>${Number(o.projectedIncome).toLocaleString()}</strong></div>
                      <div style={{ fontSize: 13 }}>Expenses: <strong>${Number(o.projectedExpenses).toLocaleString()}</strong></div>
                      <div style={{ fontSize: 13 }}>Net: <strong>${Number(o.projectedNet).toLocaleString()}</strong></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {forecastData?.longTermHealth ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700 }}>
                  Long-term health: <span style={{ textTransform: 'capitalize' }}>{forecastData.longTermHealth.status}</span>
                </div>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>{forecastData.longTermHealth.summary}</div>
                <ul style={{ margin: '8px 0 0 1.25rem', opacity: 0.88, lineHeight: 1.4 }}>
                  {(forecastData.longTermHealth.recommendations || []).map((r, i) => (
                    <li key={`${i}-${r.slice(0, 24)}`}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {businessDocs ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Business accounting documents (generated)</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Balance Sheet</div>
                    <div>Assets: <strong>${Number(businessDocs.balanceSheet?.assets?.totalAssets || 0).toLocaleString()}</strong></div>
                    <div>Liabilities: <strong>${Number(businessDocs.balanceSheet?.liabilities?.totalLiabilities || 0).toLocaleString()}</strong></div>
                    <div>Equity: <strong>${Number(businessDocs.balanceSheet?.equity?.totalEquity || 0).toLocaleString()}</strong></div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Income Statement</div>
                    <div>Revenue: <strong>${Number(businessDocs.incomeStatement?.revenue || 0).toLocaleString()}</strong></div>
                    <div>Expenses: <strong>${Number(businessDocs.incomeStatement?.operatingExpenses || 0).toLocaleString()}</strong></div>
                    <div>Net Income: <strong>${Number(businessDocs.incomeStatement?.netIncome || 0).toLocaleString()}</strong></div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Cash Flow Summary</div>
                    <div>Operating CF: <strong>${Number(businessDocs.cashFlowSummary?.operatingCashFlowProxy || 0).toLocaleString()}</strong></div>
                    <div>Avg Monthly CF: <strong>${Number(businessDocs.cashFlowSummary?.averageMonthlyNetCashFlow || 0).toLocaleString()}</strong></div>
                    <div>Trend: <strong>{businessDocs.cashFlowSummary?.trend || 'n/a'}</strong></div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </details>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 6 }}>This Month Summary</h2>
                <div style={{ opacity: 0.9 }}>
                  <div>Income: <strong>${Number(income || 0).toLocaleString()}</strong></div>
                  <div>Expenses: <strong>${Number(totalExpenses || 0).toLocaleString()}</strong></div>
                  <div>Expense ratio: <strong>{expenseRatioText}</strong></div>
                  <div>Budget grade: <strong>{grade}</strong></div>
                </div>
              </div>

              <div style={{ minWidth: 260 }}>
                <div style={{ opacity: 0.85, marginBottom: 8 }}>Insights profile</div>
                <select
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
                >
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                  <option value="organizational">Organizational</option>
                </select>

                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={generateInsights}
                  style={{ marginTop: 10, width: '100%', padding: '0.6rem 1rem', cursor: 'pointer', background: '#134', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {aiBusy ? 'Generating…' : 'Get AI insights'}
                </button>
                {aiError ? <div style={{ marginTop: 8, color: '#ffb3b3', fontSize: 14 }}>{aiError}</div> : null}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              <div style={{ ...cardSoftStyle, padding: '0.65rem' }}>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Net surplus</div>
                <div style={{ fontWeight: 800, marginTop: 2 }}>${savingsAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div style={{ ...cardSoftStyle, padding: '0.65rem' }}>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Savings rate</div>
                <div style={{ fontWeight: 800, marginTop: 2 }}>{savingsRate.toFixed(1)}%</div>
              </div>
              <div style={{ ...cardSoftStyle, padding: '0.65rem' }}>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Avg monthly spend</div>
                <div style={{ fontWeight: 800, marginTop: 2 }}>${monthlyExpenseAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div style={{ ...cardSoftStyle, padding: '0.65rem' }}>
                <div style={{ opacity: 0.7, fontSize: 12 }}>Largest category</div>
                <div style={{ fontWeight: 800, marginTop: 2 }}>
                  {topCategory ? `${topCategory.category} (${topCategory.pct.toFixed(0)}%)` : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Analytics snapshot</div>
              <div style={{ display: 'grid', gap: 4, fontSize: 14, opacity: 0.9 }}>
                <div>
                  Financial trajectory:{' '}
                  <strong>{trendsData?.improvement?.direction || 'insufficient history'}</strong>
                </div>
                <div>
                  Month-over-month expenses:{' '}
                  <strong>
                    {monthOverMonthDelta ? `${monthOverMonthDelta.expenses >= 0 ? '+' : ''}$${Math.abs(monthOverMonthDelta.expenses).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
                  </strong>
                </div>
                <div>
                  Month-over-month income:{' '}
                  <strong>
                    {monthOverMonthDelta ? `${monthOverMonthDelta.income >= 0 ? '+' : ''}$${Math.abs(monthOverMonthDelta.income).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 300px', opacity: 0.85 }}>
                Share your budget score to help friends compare and improve.
              </div>
              <button
                type="button"
                onClick={shareResult}
                disabled={!isAuthed}
                style={{ padding: '0.6rem 1rem', cursor: 'pointer', background: '#111', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Copy/Share result
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ marginBottom: 6, opacity: 0.9, fontWeight: 700 }}>Expenses breakdown (pie)</div>
                <PieChartSvg
                  data={monthPieData}
                  colors={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6']}
                />
              </div>

              <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ marginBottom: 6, opacity: 0.9, fontWeight: 700 }}>Last 12 months (income vs expenses)</div>
                {historyError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{historyError}</div> : null}
                {historySeries.length ? (
                  <LineChartSvg
                    data={historySeries.map((d) => ({
                      month: d.month,
                      expensesTotal: d.expensesTotal,
                      incomeAmount: d.incomeAmount,
                    }))}
                  />
                ) : (
                  <div style={{ opacity: 0.85, padding: '0.75rem 0' }}>No history yet.</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Income</h2>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 90, opacity: 0.9 }}>Amount</span>
              <input
                type="number"
                value={income}
                step="0.01"
                onChange={(e) => setIncome(e.target.value)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
              />
            </label>
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Expenses (editable)</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ opacity: 0.85, fontSize: 14 }}>Add category</span>
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Health"
                  style={{ width: 220, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
                  disabled={catBusy}
                />
              </label>
              <button
                type="button"
                onClick={addCategory}
                disabled={catBusy || !newCategory.trim()}
                style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#134', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {catBusy ? 'Adding…' : 'Add'}
              </button>
              {catError ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{catError}</div> : null}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.85 }}>
                    <th style={{ padding: '6px 8px' }}>Category</th>
                    <th style={{ padding: '6px 8px' }}>Amount</th>
                    <th style={{ padding: '6px 8px', width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id ?? e.category}>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{e.category}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          type="number"
                          value={e.amount}
                          step="0.01"
                          onChange={(ev) => {
                            const val = ev.target.value;
                            setExpenses((prev) =>
                              prev.map((row) => (row.id === e.id ? { ...row, amount: val } : row))
                            );
                          }}
                          style={{ width: 140, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <button
                          type="button"
                          onClick={() => removeCategory(e.category)}
                          disabled={catBusy}
                          style={{ padding: '0.35rem 0.6rem', cursor: 'pointer', background: '#321', color: '#fff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 10, opacity: 0.8 }}>
                        No expenses loaded.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {insights && insights.length ? (
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>AI Insights</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {insights.map((ins, idx) => {
                const color =
                  ins.type === 'alert'
                    ? '#ef4444'
                    : ins.type === 'warning'
                      ? '#f59e0b'
                      : ins.type === 'success'
                        ? '#22c55e'
                        : '#3b82f6';
                return (
                  <div key={`${ins.title}-${idx}`} style={{ border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 10, padding: '0.8rem' }}>
                    <div style={{ fontWeight: 800, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: 'inline-block' }} />
                      {ins.title}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.9, lineHeight: 1.35 }}>{ins.message}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      </div>
    </div>
  );
}
