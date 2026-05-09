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

function PieChartSvg({ data, colors, wrapLegend }) {
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
      <svg viewBox="0 0 220 220" width="100%" height="240" role="img" aria-label="Expenses pie chart">
        {segments.map((s, idx) => (
          <path key={`${s.name}-${idx}`} d={s.path} fill={s.color} stroke="rgba(255,255,255,0.25)" strokeWidth="1">
            <title>{`${s.name}: $${s.value.toLocaleString()} (${((s.value / total) * 100).toFixed(1)}%)`}</title>
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
      <div style={{ display: 'grid', gap: wrapLegend ? 10 : 4 }}>
        {segments.map((s) => (
          <div
            key={`lbl-${s.name}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
              fontSize: 12,
              flexWrap: wrapLegend ? 'wrap' : 'nowrap',
              rowGap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: '1 1 120px' }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: s.color, display: 'inline-block', flexShrink: 0 }} />
              <span
                style={{
                  opacity: 0.9,
                  overflow: wrapLegend ? 'visible' : 'hidden',
                  textOverflow: wrapLegend ? 'clip' : 'ellipsis',
                  whiteSpace: wrapLegend ? 'normal' : 'nowrap',
                  wordBreak: wrapLegend ? 'break-word' : undefined,
                }}
              >
                {s.name}
              </span>
            </div>
            <div style={{ opacity: 0.86, whiteSpace: wrapLegend ? 'normal' : 'nowrap', flexShrink: 0 }}>
              ${Number(s.value).toLocaleString()} · {((s.value / total) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBarChartSvg({ data, avgByCategory = {}, compact }) {
  const rows = (data || []).filter((d) => Number(d.value) > 0).sort((a, b) => b.value - a.value);
  if (!rows.length) return <div style={{ opacity: 0.85, padding: '0.75rem 0' }}>No categories with spending yet.</div>;

  const width = 700;
  const barH = 18;
  const gap = 10;
  const padL = compact ? 100 : 132;
  const padR = compact ? 12 : 165;
  const padT = 12;
  const padB = 8;
  const height = padT + padB + rows.length * (barH + gap);
  const max = Math.max(...rows.map((r) => Number(r.value) || 0), 1);
  const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const plotW = width - padL - padR;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={Math.max(220, height)} role="img" aria-label="Descending expense categories bar chart">
      {rows.map((r, i) => {
        const y = padT + i * (barH + gap);
        const w = ((Number(r.value) || 0) / max) * plotW;
        const pct = total > 0 ? ((Number(r.value) || 0) / total) * 100 : 0;
        const avg = Number(avgByCategory?.[r.name] || 0);
        const labelMax = compact ? 14 : 19;
        const tip = `${r.name}: $${Number(r.value).toLocaleString()} (${pct.toFixed(1)}%) · avg $${avg.toLocaleString()}`;
        return (
          <g key={`${r.name}-${i}`}>
            <text x={padL - 8} y={y + barH - 4} textAnchor="end" fill="rgba(230,237,243,0.86)" fontSize={compact ? 10 : 11}>
              {r.name.length > labelMax ? `${r.name.slice(0, labelMax)}…` : r.name}
            </text>
            <rect x={padL} y={y} width={plotW} height={barH} fill="rgba(148,163,184,0.16)" rx="4">
              <title>{tip}</title>
            </rect>
            <rect x={padL} y={y} width={w} height={barH} fill="#60a5fa" rx="4">
              <title>{tip}</title>
            </rect>
            {!compact ? (
              <text x={padL + plotW + 6} y={y + barH - 4} fill="rgba(230,237,243,0.84)" fontSize="11">
                ${Number(r.value).toLocaleString()} · {pct.toFixed(1)}% · avg ${avg.toLocaleString()}
              </text>
            ) : null}
          </g>
        );
      })}
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
function TrendDualLineSvg({ series, compact }) {
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
      <text x={padL} y={16} fill="rgba(230,237,243,0.75)" fontSize={compact ? 10 : 12}>
        {compact
          ? 'Blue = health · Orange = expense % (lower better)'
          : 'Blue = health score (higher better) · Orange = expense ratio % (lower better)'}
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
  const [businessPdfBusy, setBusinessPdfBusy] = useState(false);
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
  const [categoryAverages, setCategoryAverages] = useState({});

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
  const [adviceData, setAdviceData] = useState(null);
  const [adviceBusy, setAdviceBusy] = useState(false);
  const [adviceErr, setAdviceErr] = useState('');
  const [goals, setGoals] = useState([]);
  const [goalsBusy, setGoalsBusy] = useState(false);
  const [goalsErr, setGoalsErr] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState('retirement');
  const [goalTarget, setGoalTarget] = useState('');

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

  /** Triggered by api.js whenever the server returns 401 on an authed request.
   *  By the time we get here localStorage has already been wiped by api.js — we just
   *  need to drop in-memory state so the auth screen renders on the next paint. */
  useEffect(() => {
    const onUnauth = () => {
      setToken('');
      setUser('');
      setExpenses([]);
      setIncome(0);
      setInsights([]);
      setExpertData(null);
      setRankData(null);
      setTrendsData(null);
      setForecastData(null);
      setBusinessDocs(null);
      setGoals([]);
      setAuthError('Your session expired. Please sign in again.');
    };
    window.addEventListener('fc-unauthorized', onUnauth);
    return () => window.removeEventListener('fc-unauthorized', onUnauth);
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
        api.getExpenses(token, month, profile),
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

  async function loadFinancialAdvice() {
    if (!token) return;
    setAdviceErr('');
    setAdviceBusy(true);
    try {
      const d = await api.getFinancialAdvice(token, month);
      setAdviceData(d);
    } catch (e) {
      setAdviceErr(e.message);
      setAdviceData(null);
    } finally {
      setAdviceBusy(false);
    }
  }

  async function loadGoals() {
    if (!token) return;
    setGoalsErr('');
    setGoalsBusy(true);
    try {
      const rows = await api.getGoals(token);
      setGoals(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setGoalsErr(e.message);
      setGoals([]);
    } finally {
      setGoalsBusy(false);
    }
  }

  async function createGoalItem() {
    setGoalsErr('');
    if (!goalName.trim()) {
      setGoalsErr('Goal name is required.');
      return;
    }
    const target = Number(goalTarget);
    if (!Number.isFinite(target) || target <= 0) {
      setGoalsErr('Target amount must be greater than zero.');
      return;
    }
    setGoalsBusy(true);
    try {
      await api.createGoal(token, {
        name: goalName.trim(),
        goalType,
        targetAmount: target,
      });
      setGoalName('');
      setGoalTarget('');
      await loadGoals();
    } catch (e) {
      setGoalsErr(e.message);
    } finally {
      setGoalsBusy(false);
    }
  }

  async function deleteGoalItem(id) {
    setGoalsErr('');
    setGoalsBusy(true);
    try {
      await api.deleteGoal(token, id);
      await loadGoals();
    } catch (e) {
      setGoalsErr(e.message);
    } finally {
      setGoalsBusy(false);
    }
  }

  async function addGoalProgress(goal) {
    const next = Number(goal.currentAmount || 0) + Number(totalExpenses || 0);
    setGoalsBusy(true);
    setGoalsErr('');
    try {
      await api.updateGoal(token, goal.id, { currentAmount: next });
      await loadGoals();
    } catch (e) {
      setGoalsErr(e.message);
    } finally {
      setGoalsBusy(false);
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

  async function loadCategoryAverages() {
    if (!token) return;
    try {
      const data = await api.getCategoryAverages(token, month);
      const map = Object.fromEntries(
        (data?.categories || []).map((r) => [r.category, Number(r.avgAmount) || 0]),
      );
      setCategoryAverages(map);
    } catch {
      setCategoryAverages({});
    }
  }

  useEffect(() => {
    if (!token) return undefined;
    loadFinancialAdvice();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month]);

  useEffect(() => {
    if (!token) return undefined;
    loadGoals();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!token) return undefined;
    loadCategoryAverages();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month]);

  useEffect(() => {
    if (!isAuthed) return;
    loadMonthData();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, isAuthed, profile]);

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
      await loadCategoryAverages();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveIncomeOnly() {
    setError('');
    setBusy(true);
    try {
      await api.setIncome(token, { amount: Number(income), month });
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

  async function saveExpensesOnly() {
    setError('');
    setBusy(true);
    try {
      const payloadExpenses = expenses.map((e) => ({
        category: e.category,
        amount: Number(e.amount) || 0,
      }));
      await api.updateExpenses(token, { month, expenses: payloadExpenses });
      await loadMonthData();
      await loadHistory();
      await loadLeaderboardAndTrends();
      await loadForecastAndDocs();
      await loadCategoryAverages();
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

  const monthBarData = useMemo(
    () =>
      (expenses || [])
        .map((e) => ({ name: e.category, value: Number(e.amount) || 0 }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [expenses],
  );

  const categoryStats = useMemo(() => {
    const rows = monthBarData || [];
    const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
    const nonZeroCount = rows.length;
    const top = rows[0] || null;
    const avgPerActive = nonZeroCount ? total / nonZeroCount : 0;
    const aboveAvgCount = rows.filter((r) => (Number(r.value) || 0) > (Number(categoryAverages?.[r.name]) || 0)).length;
    const topShare = total > 0 && top ? (Number(top.value) / total) * 100 : 0;
    return {
      nonZeroCount,
      avgPerActive,
      aboveAvgCount,
      topCategory: top?.name || 'N/A',
      topShare,
    };
  }, [monthBarData, categoryAverages]);

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

  const rudimentaryStats = useMemo(() => {
    if (!historySeries.length) return null;
    const vals = historySeries.map((r) => Number(r.expensesTotal) || 0);
    const n = vals.length;
    const mean = vals.reduce((s, v) => s + v, 0) / n;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const maxMonth = historySeries.find((r) => (Number(r.expensesTotal) || 0) === max)?.month;
    const minMonth = historySeries.find((r) => (Number(r.expensesTotal) || 0) === min)?.month;
    return {
      mean,
      variance,
      max,
      min,
      maxMonth,
      minMonth,
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

  async function exportBusinessDocsPdf() {
    setError('');
    setBusinessPdfBusy(true);
    try {
      const blob = await api.downloadBusinessDocsPdf(token, month, 12);
      api.saveBlobAsFile(blob, `financialcheckup-business-docs-${month}.pdf`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusinessPdfBusy(false);
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
      `FinancialCheckup (${profile}) — ${month}\n` +
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
        await navigator.share({ title: 'FinancialCheckup', text: shareText });
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
    setGoals([]);
    setGoalsErr('');
  }

  const shellStyle = {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    minHeight: '100vh',
    boxSizing: 'border-box',
    padding: isMobile
      ? `max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left))`
      : isTablet
        ? `1.25rem max(1.25rem, env(safe-area-inset-right)) 1.5rem max(1.25rem, env(safe-area-inset-left))`
        : `2rem max(2rem, env(safe-area-inset-right)) 2rem max(2rem, env(safe-area-inset-left))`,
    color: '#e6edf3',
    background:
      'radial-gradient(1200px 550px at 15% -10%, rgba(59,130,246,0.25), transparent 55%), radial-gradient(900px 450px at 90% 0%, rgba(16,185,129,0.18), transparent 50%), #0a0f1a',
  };
  const containerStyle = { maxWidth: 1080, margin: '0 auto', width: '100%', minWidth: 0 };
  const cardStyle = {
    border: '1px solid rgba(148,163,184,0.25)',
    borderRadius: 14,
    padding: isMobile ? '0.65rem 0.75rem' : '0.85rem 1rem',
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
        <h1 style={{ marginBottom: 6, fontSize: isMobile ? '1.45rem' : undefined, lineHeight: 1.2 }}>Financial Checkup</h1>
        <div style={{ ...cardStyle, marginTop: '1rem', display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 800 }}>What to expect in the app</div>
          <div style={{ opacity: 0.9, fontSize: 14, lineHeight: 1.45 }}>
            Track monthly income/expenses, view financial health score and trends, compare against user averages,
            export executive reports (CSV/PDF), and get actionable financial advice based on your data.
          </div>
          <div style={{ opacity: 0.85, fontSize: 13, lineHeight: 1.45 }}>
            Helpful workflow: register once, save monthly data, review charts/statistics, then export reports and
            check projections for 3/6/12 months.
          </div>
        </div>

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
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ marginBottom: 4, fontSize: isMobile ? '1.45rem' : undefined, lineHeight: 1.2 }}>Financial Checkup</h1>
          <div style={{ opacity: 0.85, wordBreak: 'break-word' }}>Signed in as <strong>{user}</strong></div>
        </div>
        <button
          type="button"
          onClick={logout}
          style={{ ...btnDanger, alignSelf: isMobile ? 'stretch' : undefined }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          ...cardStyle,
          marginTop: '1rem',
          display: 'grid',
          gap: 12,
          position: 'sticky',
          top: 'max(0.5rem, env(safe-area-inset-top))',
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: isMobile ? 'grid' : 'flex',
            gap: 10,
            gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : undefined,
            flexWrap: isMobile ? undefined : 'wrap',
            alignItems: isMobile ? 'stretch' : 'end',
          }}
        >
          <label
            style={{
              display: 'grid',
              gap: 4,
              gridColumn: isMobile ? '1 / -1' : undefined,
              minWidth: isMobile ? undefined : 0,
            }}
          >
            <span style={{ opacity: 0.8, fontSize: 13 }}>Month</span>
            <input
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="YYYY-MM"
              style={{ ...inputStyle, marginLeft: 0, width: '100%', maxWidth: isMobile ? 'none' : 160 }}
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

        <div style={{ ...cardStyle, order: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Quick links</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr',
              gap: 8,
            }}
          >
            {[
              ['#summary-panel', 'Month Summary'],
              ['#income-panel', 'Income'],
              ['#expenses-panel', 'Expenses'],
              ['#advice-panel', 'Financial Advice'],
              ['#goals-panel', 'Goals & Progress'],
              ['#expert-panel', 'Expert Briefing'],
              ['#leaderboard-panel', 'Leaderboard & Trend'],
              ['#projections-panel', 'Projections & Docs'],
              ['#resources-panel', 'Financial Resources'],
              ['#ai-insights-panel', 'AI Insights'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{
                  textDecoration: 'none',
                  color: '#dbeafe',
                  border: '1px solid rgba(147,197,253,0.35)',
                  borderRadius: 9,
                  padding: '0.5rem 0.6rem',
                  background: 'rgba(59,130,246,0.12)',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <details id="advice-panel" style={{ ...cardStyle, order: 40 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, outline: 'none' }}>
            Financial advice feed (free API + your data)
          </summary>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.45, fontSize: 14 }}>
              This replaces weekly digest. Advice is pulled from a free external advice API and blended with your
              current month financial health from this app.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={loadFinancialAdvice} disabled={adviceBusy} style={btnPrimary}>
                {adviceBusy ? 'Refreshing advice…' : 'Refresh financial advice'}
              </button>
            </div>
            {adviceErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{adviceErr}</div> : null}
            {adviceData?.metrics ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem', fontSize: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Health snapshot ({adviceData.month})</div>
                <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
                  Score <strong>{Number(adviceData.metrics.healthScore || 0).toFixed(1)}</strong> · Grade{' '}
                  <strong>{adviceData.metrics.grade || 'N/A'}</strong> · Ratio{' '}
                  <strong>{Number(adviceData.metrics.expenseRatio || 0).toFixed(1)}%</strong> · Balance{' '}
                  <strong>${Number(adviceData.metrics.balance || 0).toLocaleString()}</strong>
                </div>
              </div>
            ) : null}
            {Array.isArray(adviceData?.advice?.external) && adviceData.advice.external.length ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>External advice (free API)</div>
                <ul style={{ margin: '0 0 0 1.2rem', lineHeight: 1.45 }}>
                  {adviceData.advice.external.map((x, i) => (
                    <li key={`ext-${i}-${x.slice(0, 20)}`}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {Array.isArray(adviceData?.advice?.internal) && adviceData.advice.internal.length ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Internal financial health recommendations</div>
                <ul style={{ margin: '0 0 0 1.2rem', lineHeight: 1.45 }}>
                  {adviceData.advice.internal.map((x, i) => (
                    <li key={`int-${i}-${x.slice(0, 20)}`}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>

        <details id="goals-panel" style={{ ...cardStyle, order: 41 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, outline: 'none' }}>
            Goals & progress (MRR / ARR / retirement / savings)
          </summary>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr auto', gap: 8 }}>
              <input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name (e.g. Retirement 2035)" style={inputStyle} />
              <select value={goalType} onChange={(e) => setGoalType(e.target.value)} style={inputStyle}>
                <option value="mrr">MRR</option>
                <option value="arr">ARR</option>
                <option value="retirement">Retirement</option>
                <option value="savings">Savings</option>
                <option value="emergency_fund">Emergency fund</option>
                <option value="custom">Custom</option>
              </select>
              <input type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="Target $" style={inputStyle} />
              <button type="button" onClick={createGoalItem} disabled={goalsBusy} style={btnPrimary}>
                {goalsBusy ? 'Saving…' : 'Add goal'}
              </button>
            </div>
            {goalsErr ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{goalsErr}</div> : null}
            {goals.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {goals.map((g) => (
                  <div key={g.id} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.7rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{g.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.78 }}>
                          {String(g.goalType || 'custom').toUpperCase()} · target ${Number(g.targetAmount).toLocaleString()} · current $
                          {Number(g.currentAmount).toLocaleString()}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: isMobile ? 'stretch' : 'center',
                        }}
                      >
                        <button type="button" onClick={() => addGoalProgress(g)} disabled={goalsBusy} style={btnNeutral}>
                          Add this month spend
                        </button>
                        <button type="button" onClick={() => deleteGoalItem(g.id)} disabled={goalsBusy} style={btnDanger}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 10, borderRadius: 999, background: 'rgba(148,163,184,0.25)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Number(g.progressPercent) || 0)}%`, background: 'linear-gradient(90deg,#22c55e,#3b82f6)' }} />
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>{Number(g.progressPercent).toFixed(1)}% complete</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ opacity: 0.8, fontSize: 14 }}>No goals yet. Add a target above to start tracking progress.</div>
            )}
          </div>
        </details>

        <details id="expert-panel" style={{ ...cardStyle, order: 42 }}>
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
              style={{
                padding: '0.55rem 1rem',
                cursor: 'pointer',
                background: '#134',
                color: '#fff',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                maxWidth: '100%',
                width: isMobile ? '100%' : 360,
              }}
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

        <details id="leaderboard-panel" style={{ ...cardStyle, order: 43 }}>
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
                <TrendDualLineSvg series={trendsData.series} compact={isMobile} />
              </div>
            ) : trendsData?.series?.length ? (
              <div style={{ opacity: 0.8, fontSize: 14 }}>Add another month of data to see a trend chart.</div>
            ) : null}
          </div>
        </details>

        <details id="projections-panel" style={{ ...cardStyle, order: 44 }}>
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
                <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>Business accounting documents (generated)</span>
                  <button type="button" onClick={exportBusinessDocsPdf} disabled={businessPdfBusy} style={btnNeutral}>
                    {businessPdfBusy ? 'Building business PDF…' : 'Export Business Docs PDF'}
                  </button>
                </div>
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

        <details id="resources-panel" style={{ ...cardStyle, order: 45 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, outline: 'none' }}>
            Resources (authoritative help for people & businesses)
          </summary>
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.45, fontSize: 14 }}>
              Trusted financial education and support links. Always verify local/state eligibility and current guidance.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Personal finance support</div>
                <ul style={{ margin: '0 0 0 1.2rem', lineHeight: 1.45 }}>
                  <li><a href="https://www.consumerfinance.gov/" target="_blank" rel="noreferrer">Consumer Financial Protection Bureau (CFPB)</a></li>
                  <li><a href="https://www.usa.gov/money" target="_blank" rel="noreferrer">USA.gov Money & Credit</a></li>
                  <li><a href="https://www.ftc.gov/" target="_blank" rel="noreferrer">Federal Trade Commission (FTC) fraud resources</a></li>
                  <li><a href="https://www.annualcreditreport.com/" target="_blank" rel="noreferrer">AnnualCreditReport.com (official credit reports)</a></li>
                  <li><a href="https://www.irs.gov/" target="_blank" rel="noreferrer">IRS tax guidance & payment plans</a></li>
                </ul>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Business & organizational resources</div>
                <ul style={{ margin: '0 0 0 1.2rem', lineHeight: 1.45 }}>
                  <li><a href="https://www.sba.gov/" target="_blank" rel="noreferrer">U.S. Small Business Administration (SBA)</a></li>
                  <li><a href="https://www.score.org/" target="_blank" rel="noreferrer">SCORE mentoring for businesses</a></li>
                  <li><a href="https://www.irs.gov/businesses" target="_blank" rel="noreferrer">IRS business tax center</a></li>
                  <li><a href="https://www.grants.gov/" target="_blank" rel="noreferrer">Grants.gov (official grant listings)</a></li>
                  <li><a href="https://www.sba.gov/local-assistance/resource-partners/small-business-development-centers-sbdc" target="_blank" rel="noreferrer">SBDC local business development centers</a></li>
                </ul>
              </div>
            </div>
          </div>
        </details>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, order: 30 }}>
          <div id="summary-panel" style={{ ...cardStyle, display: 'grid', gap: 12, order: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                flexWrap: 'wrap',
                flexDirection: isMobile ? 'column' : 'row',
              }}
            >
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 6 }}>This Month Summary</h2>
                <div style={{ opacity: 0.9 }}>
                  <div>Income: <strong>${Number(income || 0).toLocaleString()}</strong></div>
                  <div>Expenses: <strong>${Number(totalExpenses || 0).toLocaleString()}</strong></div>
                  <div>Expense ratio: <strong>{expenseRatioText}</strong></div>
                  <div>Budget grade: <strong>{grade}</strong></div>
                </div>
              </div>

              <div style={{ minWidth: isMobile ? 0 : 260, width: isMobile ? '100%' : undefined }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
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
                  wrapLegend={isMobile}
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

              <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ marginBottom: 6, opacity: 0.9, fontWeight: 700 }}>Descending categories (your spend vs user average)</div>
                <CategoryBarChartSvg data={monthBarData} avgByCategory={categoryAverages} compact={isMobile} />
              </div>

              <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ marginBottom: 8, opacity: 0.92, fontWeight: 700 }}>Category statistics</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, fontSize: 13 }}>
                  <div>Active categories: <strong>{categoryStats.nonZeroCount}</strong></div>
                  <div>Avg per active category: <strong>${Number(categoryStats.avgPerActive).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>
                  <div>Above user average: <strong>{categoryStats.aboveAvgCount}</strong></div>
                  <div>Top concentration: <strong>{categoryStats.topCategory} ({categoryStats.topShare.toFixed(1)}%)</strong></div>
                </div>
                {rudimentaryStats ? (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 13, display: 'grid', gap: 6 }}>
                    <div style={{ fontWeight: 700 }}>Rudimentary spend statistics (over time)</div>
                    <div>Mean monthly spend: <strong>${Number(rudimentaryStats.mean).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>
                    <div>Most spend month: <strong>{rudimentaryStats.maxMonth || 'N/A'}</strong> (${Number(rudimentaryStats.max).toLocaleString(undefined, { maximumFractionDigits: 0 })})</div>
                    <div>Least spend month: <strong>{rudimentaryStats.minMonth || 'N/A'}</strong> (${Number(rudimentaryStats.min).toLocaleString(undefined, { maximumFractionDigits: 0 })})</div>
                    <div>Variance: <strong>{Number(rudimentaryStats.variance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, order: 21, display: 'grid', gap: 14 }}>
            <div style={{ fontWeight: 800 }}>Income & expense inputs</div>
            <div id="income-panel" style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '1rem' }}>
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Income</h2>
              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: isMobile ? 'stretch' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                }}
              >
                <span style={{ width: isMobile ? undefined : 90, opacity: 0.9 }}>Amount</span>
                <input
                  type="number"
                  value={income}
                  step="0.01"
                  onChange={(e) => setIncome(e.target.value)}
                  style={{ flex: 1, width: '100%', minWidth: 0, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: '#0b0f14', color: '#fff' }}
                />
              </label>
              <div style={{ marginTop: 10 }}>
                <button type="button" onClick={saveIncomeOnly} disabled={busy} style={btnPrimary}>
                  {busy ? 'Saving…' : 'Save Income'}
                </button>
              </div>
            </div>

            <div id="expenses-panel" style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '1rem' }}>
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>Expenses (editable)</h2>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginBottom: 12,
                  alignItems: isMobile ? 'stretch' : 'flex-end',
                  flexDirection: isMobile ? 'column' : 'row',
                }}
              >
                <label style={{ display: 'grid', gap: 6, flex: isMobile ? undefined : '1 1 220px', minWidth: isMobile ? undefined : 160 }}>
                  <span style={{ opacity: 0.85, fontSize: 14 }}>Add category</span>
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Health"
                    style={{
                      width: isMobile ? '100%' : 220,
                      maxWidth: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: '#0b0f14',
                      color: '#fff',
                    }}
                    disabled={catBusy}
                  />
                </label>
                <button
                  type="button"
                  onClick={addCategory}
                  disabled={catBusy || !newCategory.trim()}
                  style={{
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    background: '#134',
                    color: '#fff',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    alignSelf: isMobile ? 'stretch' : undefined,
                  }}
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
                        <td style={{ padding: '6px 8px', whiteSpace: isMobile ? 'normal' : 'nowrap', wordBreak: isMobile ? 'break-word' : undefined }}>{e.category}</td>
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
                            style={{
                              width: isMobile ? '100%' : 140,
                              maxWidth: isMobile ? 200 : undefined,
                              padding: 8,
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.2)',
                              background: '#0b0f14',
                              color: '#fff',
                              boxSizing: 'border-box',
                            }}
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
              <div style={{ marginTop: 10 }}>
                <button type="button" onClick={saveExpensesOnly} disabled={busy || catBusy} style={btnPrimary}>
                  {busy ? 'Saving…' : 'Save Expenses'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {insights && insights.length ? (
          <div id="ai-insights-panel" style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '1rem' }}>
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
        <div style={{ marginTop: 16, textAlign: 'center', opacity: 0.65, fontSize: 12 }}>
          Operon E2I
        </div>
      </div>
    </div>
  );
}
