import { useEffect, useMemo, useState, useRef } from 'react';
import * as api from './api';
import LandingPage from './LandingPage';
import CheckupPanel from './CheckupPanel';
import OverviewDashboard from './OverviewDashboard';
import FinancesPage from './FinancesPage';
import ProgressGoalsPanel from './ProgressGoalsPanel';
import AppNav from './AppNav';
import FinancialHistoryPanel from './FinancialHistoryPanel';
import MoreToolsPanel from './MoreToolsPanel';
import MarketTicker from './MarketTicker';
import SupportPanel from './SupportPanel';
import SubscriptionPortal from './SubscriptionPortal';
import AppFooter from './AppFooter';
import LoadingOverlay from './LoadingOverlay';
import OnboardingWizard, { finishOnboardingWithCheckup, readOnboardingPending } from './OnboardingWizard';
import ExpandablePanel from './ExpandablePanel';
import {
  clearAuthSession,
  clearCrossUserSessionState,
  getStoredUserId,
  persistAuthSession,
  extendedStorageKey,
  loadExtendedProfile,
} from './userStorage';
import { awardXp, loadXp, saveXp, xpProgressLabel } from './progression';
import { validateRegisterForm } from './authValidation';

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
  const barH = 14;
  const gap = 12;
  const padL = compact ? 100 : 132;
  const padR = compact ? 12 : 200;
  const padT = 12;
  const padB = 8;
  const height = padT + padB + rows.length * (barH * 2 + gap);
  const max = Math.max(
    ...rows.flatMap((r) => [Number(r.value) || 0, Number(avgByCategory?.[r.name]) || 0]),
    1,
  );
  const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const plotW = width - padL - padR;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={Math.max(240, height)} role="img" aria-label="Your spending vs community average by category">
      <text x={padL} y={10} fill="rgba(230,237,243,0.55)" fontSize="10">
        Blue = you · Amber = community avg
      </text>
      {rows.map((r, i) => {
        const y = padT + 6 + i * (barH * 2 + gap);
        const val = Number(r.value) || 0;
        const avg = Number(avgByCategory?.[r.name] || 0);
        const wYou = (val / max) * plotW;
        const wAvg = (avg / max) * plotW;
        const pct = total > 0 ? (val / total) * 100 : 0;
        const labelMax = compact ? 14 : 19;
        const tip = `${r.name}: you $${val.toLocaleString()} (${pct.toFixed(1)}%) · community avg $${avg.toLocaleString()}`;
        return (
          <g key={`${r.name}-${i}`}>
            <text x={padL - 8} y={y + barH - 2} textAnchor="end" fill="rgba(230,237,243,0.86)" fontSize={compact ? 10 : 11}>
              {r.name.length > labelMax ? `${r.name.slice(0, labelMax)}…` : r.name}
            </text>
            <rect x={padL} y={y} width={plotW} height={barH} fill="rgba(148,163,184,0.12)" rx="3" />
            <rect x={padL} y={y} width={wAvg} height={barH} fill="rgba(245,158,11,0.45)" rx="3">
              <title>{tip}</title>
            </rect>
            <rect x={padL} y={y + barH + 2} width={plotW} height={barH} fill="rgba(148,163,184,0.12)" rx="3" />
            <rect x={padL} y={y + barH + 2} width={wYou} height={barH} fill="#60a5fa" rx="3">
              <title>{tip}</title>
            </rect>
            {!compact ? (
              <text x={padL + plotW + 6} y={y + barH + 2} fill="rgba(230,237,243,0.84)" fontSize="10">
                ${val.toLocaleString()} vs avg ${avg.toLocaleString()}
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
  const [userId, setUserId] = useState(() => getStoredUserId());

  const [subscription, setSubscription] = useState(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingErr, setBillingErr] = useState('');

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhase, setRegisterPhase] = useState('form'); // form | code
  const [verifyCode, setVerifyCode] = useState('');
  const [authFieldErrors, setAuthFieldErrors] = useState({});
  const [authNotice, setAuthNotice] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [month, setMonth] = useState(currentMonth());
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState([]);

  const [profile, setProfile] = useState('personal'); // personal | business | organizational
  const [aiPlan, setAiPlan] = useState(null);
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
  const [categoryAvgPeerCount, setCategoryAvgPeerCount] = useState(0);

  const [expensesHistory, setExpensesHistory] = useState([]);
  const [incomeHistory, setIncomeHistory] = useState([]);
  const [checkupHistory, setCheckupHistory] = useState([]);
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
  const [digestFrequency, setDigestFrequency] = useState('weekly');
  const [digestSmtpReady, setDigestSmtpReady] = useState(false);
  const [digestSmsReady, setDigestSmsReady] = useState(false);
  const [digestCronTz, setDigestCronTz] = useState('America/Los_Angeles');
  const [digestSaveBusy, setDigestSaveBusy] = useState(false);
  const [digestTestBusy, setDigestTestBusy] = useState(false);
  const [digestMsg, setDigestMsg] = useState('');
  const [digestErr, setDigestErr] = useState('');
  const [digestPreview, setDigestPreview] = useState(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [appLoading, setAppLoading] = useState('');
  const [goals, setGoals] = useState([]);
  const [goalsBusy, setGoalsBusy] = useState(false);
  const [goalsErr, setGoalsErr] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState('retirement');
  const [goalTarget, setGoalTarget] = useState('');

  async function loadOnboardingStatus() {
    if (!token) return;
    try {
      const o = await api.getOnboarding(token);
      setPrimaryGoal(o.primaryGoal || '');
      if (!o.complete) {
        setCheckupResult(null);
        setLastCheckupScore(null);
        setShowOnboarding(true);
      }
    } catch {
      /** best-effort */
    }
  }

  async function completeOnboarding() {
    setShowOnboarding(false);
    setAppLoading('Building your dashboard…');
    try {
      await Promise.all([loadMonthData(), loadHistory(), loadSubscription(), loadDigestSettings()]);
      const d = await api.getCheckupLatest(token, month);
      if (d?.found) {
        setLastCheckupScore(d.overallScore ?? null);
        setCheckupResult(d.result ?? null);
      }
      setActiveSection('overview');
      if (userId && token) {
        api.awardProgress(token, 'onboarding').then(({ xp }) => {
          setUserXp(xp);
          saveXp(userId, xp);
        }).catch(() => {
          setUserXp(awardXp(userId, 'onboarding'));
        });
      }
    } finally {
      setAppLoading('');
    }
  }

  async function loadSubscription() {
    if (!token) return;
    setBillingErr('');
    try {
      const data = await api.getSubscriptionStatus(token);
      setSubscription(data);
    } catch (e) {
      setBillingErr(e.message);
      setSubscription({ tier: 'free', features: {} });
    }
  }

  async function startCheckout(plan) {
    setBillingBusy(true);
    setBillingErr('');
    try {
      const { url } = await api.createCheckoutSession(token, plan);
      api.openExternalUrl(url);
    } catch (e) {
      setBillingErr(e.message);
    } finally {
      setBillingBusy(false);
    }
  }

  async function openBillingPortal() {
    setBillingBusy(true);
    setBillingErr('');
    try {
      const { url } = await api.createBillingPortalSession(token);
      api.openExternalUrl(url);
    } catch (e) {
      setBillingErr(e.message);
    } finally {
      setBillingBusy(false);
    }
  }

  async function syncBilling() {
    setBillingBusy(true);
    setBillingErr('');
    try {
      await api.syncSubscriptionStatus(token);
      await loadSubscription();
    } catch (e) {
      setBillingErr(e.message);
    } finally {
      setBillingBusy(false);
    }
  }

  function resetSessionForNewUser() {
    setCheckupResult(null);
    setLastCheckupScore(null);
    setShowGuestCheckup(false);
    setAiPlan(null);
    setExpertData(null);
    clearCrossUserSessionState();
  }

  const features = subscription?.features || {};
  const isPro = subscription?.tier === 'pro';

  const [showGuestCheckup, setShowGuestCheckup] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [tipsMsg, setTipsMsg] = useState('');
  const [tipsErr, setTipsErr] = useState('');
  const [tipsBusy, setTipsBusy] = useState(false);
  const [lastCheckupScore, setLastCheckupScore] = useState(null);
  const [checkupResult, setCheckupResult] = useState(null);
  const [checkupBusy, setCheckupBusy] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [userXp, setUserXp] = useState(() => loadXp(getStoredUserId()));
  const skipLedgerAutoSave = useRef(true);
  const lastXpAwardRef = useRef(0);

  const xpInfo = useMemo(() => xpProgressLabel(userXp), [userXp]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('checking…');
  const [viewportW, setViewportW] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );

  const isAuthed = useMemo(() => Boolean(token), [token]);
  const isTablet = viewportW < 1024;
  const isMobile = viewportW < 720;
  const isDesktop = viewportW >= 1024;

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const profile = await api.getProfile(token);
        if (cancelled) return;
        const uid = profile?.userId;
        if (uid) {
          setUserId(uid);
          localStorage.setItem('fc-user-id', String(uid));
        }
        const progress = await api.getProgress(token);
        if (cancelled) return;
        setUserXp(progress.xp);
        if (uid) saveXp(uid, progress.xp);
      } catch {
        const stored = getStoredUserId();
        if (stored) setUserXp(loadXp(stored));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (userId) setUserXp((prev) => Math.max(prev, loadXp(userId)));
  }, [userId]);

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
      setAiPlan(null);
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
    skipLedgerAutoSave.current = true;
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
      skipLedgerAutoSave.current = false;
    }
  }

  async function loadHistory() {
    setHistoryError('');
    try {
      const [incRes, expRes, ckRes] = await Promise.all([
        api.getIncomeHistory(token),
        api.getExpensesHistory(token),
        api.getCheckupHistory(token, 24),
      ]);
      setIncomeHistory(Array.isArray(incRes) ? incRes : []);
      setExpensesHistory(Array.isArray(expRes) ? expRes : []);
      setCheckupHistory(Array.isArray(ckRes?.history) ? ckRes.history : []);
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
    setDigestFrequency(p.digestFrequency || 'weekly');
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
      awardXpThrottled('goalCreated', 30000);
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
        digestChannel: digestEnabled ? 'email' : 'none',
        digestEmail: (digestEmail.trim() || accountEmail || '').trim(),
        digestPhone: digestPhone.trim(),
        digestWeekday,
        digestFrequency: digestEnabled ? digestFrequency : 'weekly',
      });
      const p = await api.getDigestPrefs(token);
      applyDigestPrefs(p);
      setDigestMsg('Email summary preferences saved.');
    } catch (e) {
      setDigestErr(e.message);
    } finally {
      setDigestSaveBusy(false);
    }
  }

  async function sendWeeklyDigestTest() {
    setDigestErr('');
    setDigestMsg('');
    if (!digestEmail.trim() && !accountEmail) {
      setDigestErr('Add an email address first.');
      return;
    }
    setDigestTestBusy(true);
    try {
      await api.sendDigestTest(token, {
        channel: 'email',
        digestEmail: (digestEmail.trim() || accountEmail).trim(),
        digestPhone: digestPhone.trim(),
        month,
      });
      setDigestMsg('Test score summary email sent. Check your inbox (and spam folder).');
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

  function scrollToProjections(focus) {
    const map = {
      outcomes: 'projections-outcomes',
      longterm: 'longterm-health',
      bizdocs: 'biz-docs',
    };
    const id = map[focus] || 'projections-results';
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  async function loadCategoryAverages() {
    if (!token) return;
    try {
      const data = await api.getCategoryAverages(token, month);
      const cats = data?.categories || [];
      const map = Object.fromEntries(cats.map((r) => [r.category, Number(r.avgAmount) || 0]));
      setCategoryAverages(map);
      setCategoryAvgPeerCount(Math.max(0, ...cats.map((r) => Number(r.usersWithCategory) || 0), 0));
    } catch {
      setCategoryAverages({});
    }
  }

  useEffect(() => {
    if (!token) return undefined;
    if (features.goals === false) {
      setGoals([]);
      return undefined;
    }
    loadGoals();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, features.goals]);

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
    if (features.categoryCompare === false) {
      setCategoryAverages({});
      return undefined;
    }
    loadCategoryAverages();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month, features.categoryCompare]);

  useEffect(() => {
    if (!token) return undefined;
    loadSubscription();
    loadOnboardingStatus();
    loadDigestSettings();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const params = new URLSearchParams(window.location.search);
    const billing = params.get('billing');
    if (billing === 'success') {
      loadSubscription();
      const pending = readOnboardingPending();
      if (params.get('onboarding') === '1' && pending?.token) {
        setAppLoading('Calculating your score…');
        finishOnboardingWithCheckup(pending)
          .then(() => completeOnboarding())
          .catch((e) => setBillingErr(e.message || 'Could not finish setup after checkout.'))
          .finally(() => setAppLoading(''));
      }
      window.history.replaceState({}, '', window.location.pathname);
    } else if (billing === 'canceled' && params.get('onboarding') === '1') {
      setBillingErr('Checkout canceled — pick a plan again or continue free.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || showOnboarding) return undefined;
    api.getCheckupLatest(token, month).then((d) => {
      if (d?.found) {
        setLastCheckupScore(d.overallScore ?? null);
        setCheckupResult(d.result ?? null);
      } else {
        setLastCheckupScore(null);
        setCheckupResult(null);
      }
    }).catch(() => {
      setLastCheckupScore(null);
      setCheckupResult(null);
    });
    return undefined;
  }, [token, month, showOnboarding]);

  function awardXpThrottled(reason, cooldownMs = 120000) {
    if (!userId || !token) return;
    const now = Date.now();
    if (now - lastXpAwardRef.current < cooldownMs) return;
    lastXpAwardRef.current = now;
    api.awardProgress(token, reason)
      .then(({ xp }) => {
        setUserXp(xp);
        saveXp(userId, xp);
      })
      .catch(() => {
        setUserXp(awardXp(userId, reason));
      });
  }

  function handleCheckupResult(data) {
    setCheckupResult(data);
    setLastCheckupScore(data?.overallScore ?? null);
    if (data?.overallScore != null) awardXpThrottled('checkup');
  }

  async function refreshCheckupScore(silent = true) {
    if (!token || showOnboarding) return;
    if (!silent) setCheckupBusy(true);
    setError('');
    try {
      let excludedFromScore = checkupResult?.excludedFromScore;
      if (!Array.isArray(excludedFromScore) && userId) {
        try {
          const saved = JSON.parse(localStorage.getItem(extendedStorageKey(userId)) || '{}');
          excludedFromScore = Array.isArray(saved.excludedFromScore) ? saved.excludedFromScore : [];
        } catch {
          excludedFromScore = [];
        }
      }
      const data = await api.runCheckup(token, { month, snapshot: { excludedFromScore } });
      handleCheckupResult(data);
      await loadHistory();
    } catch (e) {
      if (!silent) setError(e.message);
    } finally {
      if (!silent) setCheckupBusy(false);
    }
  }

  function handleAutoCheckupFromProfile() {
    loadHistory();
  }

  async function saveLedgerSilent() {
    if (!token || showOnboarding) return;
    try {
      await api.setIncome(token, { amount: Number(income), month });
      const payloadExpenses = expenses.map((e) => ({
        category: e.category,
        amount: Number(e.amount) || 0,
      }));
      await api.updateExpenses(token, { month, expenses: payloadExpenses });
      awardXpThrottled('saveData', 60000);
      await refreshCheckupScore(true);
    } catch (e) {
      setError(e.message);
    }
  }

  function openHistoryMonth(m) {
    skipLedgerAutoSave.current = true;
    setMonth(m);
    setActiveSection('finances');
  }

  function goAppTab(tab) {
    const normalized = tab === 'money' || tab === 'profile'
      ? 'finances'
      : tab === 'more'
        ? 'tools'
        : tab;
    if (['finances', 'overview', 'progress', 'tools', 'plan'].includes(normalized)) {
      setActiveSection(normalized);
    }
  }

  function handleGuideNavigate(step) {
    if (step.tab) goAppTab(step.tab);
    if (step.tool === 'ai-insights') {
      setActiveSection('tools');
      setTimeout(() => generateInsights(), 120);
      return;
    }
    if (step.tool?.startsWith('specialist-')) {
      setActiveSection('finances');
      const area = step.tool.replace('specialist-', '');
      setTimeout(() => {
        document.getElementById(`specialist-${area}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 180);
    }
  }

  useEffect(() => {
    if (!isAuthed || showOnboarding) {
      skipLedgerAutoSave.current = true;
      return;
    }
    skipLedgerAutoSave.current = true;
    loadMonthData().finally(() => {
      skipLedgerAutoSave.current = false;
    });
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, isAuthed, profile, showOnboarding]);

  useEffect(() => {
    if (!isAuthed || skipLedgerAutoSave.current || showOnboarding) return undefined;
    const t = setTimeout(() => {
      saveLedgerSilent();
    }, 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, expenses, isAuthed, showOnboarding, month]);

  async function completeAuthSession(res, { isNewAccount = false } = {}) {
    resetSessionForNewUser();
    persistAuthSession({ token: res.token, username: res.username, userId: res.userId });
    setToken(res.token);
    setUser(res.username);
    setUserId(res.userId ?? null);
    setAccountEmail(res.email || registerEmail.trim() || '');
    if (isNewAccount) {
      setIncome(0);
      setExpenses([]);
      setCheckupResult(null);
      setLastCheckupScore(null);
      setUserXp(0);
    }
    setPassword('');
    setUsername('');
    setRegisterEmail('');
    setVerifyCode('');
    setRegisterPhase('form');
    setAuthFieldErrors({});
    setAuthNotice('');
    if (res.email) setDigestEmail(res.email);
    try {
      const pendingTips = localStorage.getItem('fc-tips-email');
      if (pendingTips) {
        await api.signupMoneyTips(res.token, pendingTips);
        localStorage.removeItem('fc-tips-email');
      }
    } catch {
      /** tips signup is best-effort */
    }
  }

  async function submitAuth(e) {
    e.preventDefault();
    setAuthError('');
    setAuthFieldErrors({});

    if (authMode === 'register') {
      if (registerPhase === 'code') {
        if (!verifyCode.trim() || verifyCode.trim().length < 6) {
          setAuthError('Enter the 6-digit code from your email.');
          return;
        }
        setBusy(true);
        try {
          const res = await api.verifyRegister(registerEmail.trim(), verifyCode.trim());
          await completeAuthSession(res, { isNewAccount: true });
          setShowOnboarding(true);
        } catch (e2) {
          setAuthError(e2.message);
        } finally {
          setBusy(false);
        }
        return;
      }

      const v = validateRegisterForm({ username, email: registerEmail, password });
      if (!v.valid) {
        setAuthFieldErrors({ username: v.username, email: v.email, password: v.password });
        return;
      }
      setBusy(true);
      try {
        await api.sendRegisterCode(username, password, registerEmail.trim());
        setRegisterPhase('code');
        setAuthNotice(`We sent a 6-digit code to ${registerEmail.trim()}. Check your spam folder if it does not arrive within a minute.`);
      } catch (e2) {
        setAuthError(e2.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const res = await api.login(username, password);
      await completeAuthSession(res);
    } catch (e2) {
      setAuthError(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function resendRegisterCode() {
    setAuthError('');
    setResendBusy(true);
    try {
      await api.resendRegisterCode(registerEmail.trim());
      setAuthNotice(`New code sent to ${registerEmail.trim()}. Check spam if needed.`);
    } catch (e) {
      setAuthError(e.message);
    } finally {
      setResendBusy(false);
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

  const profileSummary = useMemo(() => {
    const ext = loadExtendedProfile(userId, !token);
    const totalDebt = (ext.debts || []).reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
    const insuranceCount = [
      ext.hasLifeInsurance,
      ext.hasDisabilityInsurance,
      ext.hasLiabilityInsurance,
    ].filter(Boolean).length;
    return {
      totalDebt,
      emergencyFund: Number(ext.emergencyFund) || 0,
      investmentTotal: Number(ext.investmentTotal) || 0,
      retirementBalance: Number(ext.retirementBalance) || 0,
      insuranceCount,
    };
  }, [userId, token, checkupResult]);

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
    const aboveAvgCount = rows.filter(
      (r) => (Number(r.value) || 0) > (Number(categoryAverages?.[r.name]) || 0) + 0.5,
    ).length;
    const topShare = total > 0 && top ? (Number(top.value) / total) * 100 : 0;
    const peerComparisonReady = categoryAvgPeerCount > 1;
    return {
      nonZeroCount,
      avgPerActive,
      aboveAvgCount: peerComparisonReady ? aboveAvgCount : null,
      peerComparisonReady,
      topCategory: top?.name || 'N/A',
      topShare,
    };
  }, [monthBarData, categoryAverages, categoryAvgPeerCount]);

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
    setAiPlan(null);
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
        dimensions: (checkupResult?.dimensions || []).map((d) => ({
          key: d.key,
          label: d.label,
          score: d.score,
          grade: d.grade,
        })),
        overallScore: checkupResult?.overallScore,
        headline: checkupResult?.headline,
      });

      setAiPlan(res);
      awardXpThrottled('aiReport', 60000);
    } catch (e) {
      const msg = e.message || 'AI insights failed.';
      setAiError(
        /model|anthropic|ANTHROPIC/i.test(msg)
          ? 'AI model unavailable — set ANTHROPIC_MODEL=claude-sonnet-4-6 on Render if this persists.'
          : msg,
      );
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

  async function handleTipsSignup() {
    setTipsErr('');
    setTipsMsg('');
    const email = guestEmail.trim();
    if (!email) {
      setTipsErr('Enter your email address.');
      return;
    }
    if (token) {
      setTipsBusy(true);
      try {
        const r = await api.signupMoneyTips(token, email);
        setTipsMsg(r.message || 'Subscribed!');
      } catch (e) {
        setTipsErr(e.message);
      } finally {
        setTipsBusy(false);
      }
      return;
    }
    try {
      localStorage.setItem('fc-tips-email', email);
    } catch {
      /** ignore */
    }
    setTipsMsg('Create a free account below — we will save your email when you register.');
  }

  function logout() {
    clearAuthSession();
    clearCrossUserSessionState();
    setToken('');
    setUser('');
    setUserId(null);
    setSubscription(null);
    setExpenses([]);
    setIncome(0);
    setAiPlan(null);
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
    setLastCheckupScore(null);
    setCheckupResult(null);
    setActiveSection('overview');
  }

  const shellStyle = {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    minHeight: '100vh',
    boxSizing: 'border-box',
    width: '100%',
    padding: isMobile
      ? `max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left))`
      : isDesktop
        ? `1rem max(1.75rem, env(safe-area-inset-right)) 1.5rem max(1.75rem, env(safe-area-inset-left))`
        : `1.25rem max(1.25rem, env(safe-area-inset-right)) 1.5rem max(1.25rem, env(safe-area-inset-left))`,
    color: '#e6edf3',
    background:
      'radial-gradient(1600px 700px at 10% -5%, rgba(77,166,255,0.2), transparent 55%), radial-gradient(1200px 550px at 95% 0%, rgba(52,211,153,0.14), transparent 50%), #1a2744',
  };
  const containerStyle = { width: '100%', maxWidth: '100%', margin: 0, minWidth: 0 };
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
  const btnPrimary = { ...btnBase, background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', border: 'none' };
  const btnNeutral = { ...btnBase, background: '#101827' };
  const btnDanger = { ...btnBase, background: 'linear-gradient(135deg, #7f1d1d, #991b1b)' };

  if (!isAuthed) {
    return (
      <>
        <LandingPage
          shellStyle={shellStyle}
          cardStyle={cardStyle}
          cardSoftStyle={cardSoftStyle}
          inputStyle={inputStyle}
          btnPrimary={btnPrimary}
          btnNeutral={btnNeutral}
          isMobile={isMobile}
          authMode={authMode}
          setAuthMode={(mode) => {
            setAuthMode(mode);
            setRegisterPhase('form');
            setAuthError('');
            setAuthFieldErrors({});
            setAuthNotice('');
          }}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          registerPhase={registerPhase}
          verifyCode={verifyCode}
          setVerifyCode={setVerifyCode}
          authError={authError}
          authFieldErrors={authFieldErrors}
          authNotice={authNotice}
          busy={busy}
          submitAuth={submitAuth}
          onResendCode={resendRegisterCode}
          resendBusy={resendBusy}
        />
        {showGuestCheckup ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(2,6,23,0.88)',
              overflowY: 'auto',
              padding: isMobile ? '0.75rem' : '1.5rem',
            }}
          >
            <div style={{ ...containerStyle, maxWidth: 920, margin: '0 auto' }}>
              <button
                type="button"
                onClick={() => setShowGuestCheckup(false)}
                style={{ ...btnNeutral, marginBottom: 10 }}
              >
                ← Back to landing
              </button>
              <CheckupPanel
                token=""
                month={month}
                isMobile={isMobile}
                isTablet={isTablet}
                cardStyle={cardStyle}
                cardSoftStyle={cardSoftStyle}
                inputStyle={inputStyle}
                btnPrimary={btnPrimary}
                btnNeutral={btnNeutral}
                onResult={handleCheckupResult}
              />
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div style={shellStyle} className="fc-dashboard-shell">
      {appLoading ? <LoadingOverlay message={appLoading} /> : null}
      {showSupport ? (
        <SupportPanel
          token={token}
          accountEmail={accountEmail}
          cardStyle={cardStyle}
          inputStyle={inputStyle}
          btnPrimary={btnPrimary}
          btnNeutral={btnNeutral}
          onClose={() => setShowSupport(false)}
        />
      ) : null}
      {showOnboarding ? (
        <OnboardingWizard
          token={token}
          userId={userId}
          month={month}
          cardSoftStyle={cardSoftStyle}
          inputStyle={inputStyle}
          btnPrimary={btnPrimary}
          btnNeutral={btnNeutral}
          isMobile={isMobile}
          accountEmail={accountEmail}
          billingConfigured={subscription?.billingConfigured}
          onComplete={completeOnboarding}
        />
      ) : null}
      <div style={containerStyle} className="fc-dashboard">
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
          <img src="/logo.png" alt="" width={isMobile ? 40 : 48} height={isMobile ? 40 : 48} style={{ borderRadius: 10, flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ marginBottom: 4, fontSize: isMobile ? '1.45rem' : undefined, lineHeight: 1.2 }}>Financial Checkup</h1>
          <div style={{ opacity: 0.85, wordBreak: 'break-word' }}>
            Signed in as <strong>{user}</strong>
            {userId ? (
              <span> · Level <strong>{xpInfo.level}</strong> ({xpInfo.current}/{xpInfo.next} XP)</span>
            ) : null}
            {lastCheckupScore != null ? (
              <span> · Score <strong>{Math.round(lastCheckupScore)}</strong>/100</span>
            ) : null}
            {subscription?.tierLabel ? (
              <span>
                {' '}
                · Plan <strong>{subscription.tierLabel}</strong>
                {subscription.stripeTrial && subscription.trialDaysRemaining != null ? (
                  <> · <strong>{subscription.trialDaysRemaining}d</strong> trial left</>
                ) : null}
              </span>
            ) : null}
          </div>
          {!isMobile ? (
            <div style={{ marginTop: 10 }}>
              <MarketTicker isMobile={isMobile} />
            </div>
          ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {isMobile ? <MarketTicker isMobile={isMobile} /> : null}
        <button
          type="button"
          onClick={() => setShowSupport(true)}
          style={{ ...btnNeutral, fontSize: 13 }}
        >
          Support
        </button>
        <button
          type="button"
          onClick={logout}
          style={{ ...btnDanger, alignSelf: isMobile ? 'stretch' : undefined }}
        >
          Logout
        </button>
        </div>
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
        {error ? <div style={{ color: '#ffb3b3' }}>{error}</div> : null}

        {!showOnboarding ? (
        <>
        <AppNav
          active={activeSection}
          onChange={setActiveSection}
          isMobile={isMobile}
          btnPrimary={btnPrimary}
          btnNeutral={btnNeutral}
        />

        {activeSection === 'finances' && (
          <FinancesPage
            profile={profile}
            onProfileChange={setProfile}
            isMobile={isMobile}
            isTablet={isTablet}
            cardStyle={cardStyle}
            cardSoftStyle={cardSoftStyle}
            inputStyle={inputStyle}
            btnPrimary={btnPrimary}
            btnNeutral={btnNeutral}
            income={income}
            onIncomeChange={setIncome}
            expenses={expenses}
            onExpenseChange={(category, val) => {
              setExpenses((prev) => prev.map((row) => (row.category === category ? { ...row, amount: val } : row)));
            }}
            newCategory={newCategory}
            onNewCategoryChange={setNewCategory}
            onAddCategory={addCategory}
            onDeleteCategory={removeCategory}
            catBusy={catBusy}
            busy={busy}
            month={month}
            token={token}
            userId={userId}
            primaryGoal={primaryGoal}
            isPro={isPro}
            onGoPlan={() => setActiveSection('plan')}
            onResult={handleCheckupResult}
            onAutoCheckup={handleAutoCheckupFromProfile}
            totalExpenses={totalExpenses}
            accountEmail={accountEmail}
            digestEnabled={digestEnabled}
            onDigestEnabledChange={setDigestEnabled}
            digestFrequency={digestFrequency}
            onDigestFrequencyChange={setDigestFrequency}
            digestEmail={digestEmail}
            onDigestEmailChange={setDigestEmail}
            digestWeekday={digestWeekday}
            onDigestWeekdayChange={setDigestWeekday}
            digestMsg={digestMsg}
            digestErr={digestErr}
            digestPreview={digestPreview}
            digestSmtpReady={digestSmtpReady}
            digestSaveBusy={digestSaveBusy}
            digestTestBusy={digestTestBusy}
            onSaveDigest={saveDigestSettings}
            onTestDigest={sendWeeklyDigestTest}
          />
        )}

        {activeSection === 'progress' && (
          <>
        <ProgressGoalsPanel
          primaryGoal={primaryGoal}
          checkupResult={checkupResult}
          profileSummary={profileSummary}
          income={income}
          totalExpenses={totalExpenses}
          savingsRate={savingsRate}
          goals={goals}
          goalsBusy={goalsBusy}
          goalsErr={goalsErr}
          goalName={goalName}
          onGoalNameChange={setGoalName}
          goalType={goalType}
          onGoalTypeChange={setGoalType}
          goalTarget={goalTarget}
          onGoalTargetChange={setGoalTarget}
          onCreateGoal={createGoalItem}
          onDeleteGoal={deleteGoalItem}
          onAddGoalProgress={addGoalProgress}
          isMobile={isMobile}
          cardStyle={cardStyle}
          cardSoftStyle={cardSoftStyle}
          inputStyle={inputStyle}
          btnPrimary={btnPrimary}
          btnNeutral={btnNeutral}
          btnDanger={btnDanger}
        />

        <div id="summary-panel" style={{ ...cardStyle, display: 'grid', gap: 12 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Spending charts — {month}</h2>
            <div style={{ opacity: 0.85, fontSize: 14 }}>
              Edit on{' '}
              <button type="button" onClick={() => setActiveSection('finances')} style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                Finances
              </button>
              {' '}— your score updates automatically.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            <div style={{ ...cardSoftStyle, padding: '0.65rem' }}>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Avg monthly spend</div>
              <div style={{ fontWeight: 800, marginTop: 2 }}>${monthlyExpenseAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div style={{ ...cardSoftStyle, padding: '0.65rem' }}>
              <div style={{ opacity: 0.7, fontSize: 12 }}>MoM expenses</div>
              <div style={{ fontWeight: 800, marginTop: 2 }}>
                {monthOverMonthDelta ? `${monthOverMonthDelta.expenses >= 0 ? '+' : ''}$${Math.abs(monthOverMonthDelta.expenses).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
              </div>
            </div>
            <div style={{ ...cardSoftStyle, padding: '0.65rem' }}>
              <div style={{ opacity: 0.7, fontSize: 12 }}>MoM income</div>
              <div style={{ fontWeight: 800, marginTop: 2 }}>
                {monthOverMonthDelta ? `${monthOverMonthDelta.income >= 0 ? '+' : ''}$${Math.abs(monthOverMonthDelta.income).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'N/A'}
              </div>
            </div>
            <div style={{ ...cardSoftStyle, padding: '0.65rem' }}>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Top concentration</div>
              <div style={{ fontWeight: 800, marginTop: 2, fontSize: 14 }}>{categoryStats.topCategory} ({categoryStats.topShare.toFixed(0)}%)</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem' }}>
              <div style={{ marginBottom: 6, opacity: 0.9, fontWeight: 700 }}>Expenses breakdown (pie)</div>
              <PieChartSvg data={monthPieData} colors={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6']} wrapLegend={isMobile} />
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem' }}>
              <div style={{ marginBottom: 6, opacity: 0.9, fontWeight: 700 }}>Income vs expenses (history)</div>
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
              <div style={{ marginBottom: 6, opacity: 0.9, fontWeight: 700 }}>Your spend vs community average</div>
              <CategoryBarChartSvg data={monthBarData} avgByCategory={categoryAverages} compact={isMobile} />
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem' }}>
              <div style={{ marginBottom: 8, opacity: 0.92, fontWeight: 700 }}>Category statistics</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div>Active categories: <strong>{categoryStats.nonZeroCount}</strong></div>
                <div>Avg per active category: <strong>${Number(categoryStats.avgPerActive).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>
                <div>
                  Above community avg:{' '}
                  <strong>
                    {categoryStats.peerComparisonReady
                      ? categoryStats.aboveAvgCount
                      : '— (need 2+ users)'}
                  </strong>
                </div>
                <div>Top concentration: <strong>{categoryStats.topCategory} ({categoryStats.topShare.toFixed(1)}%)</strong></div>
              </div>
              {rudimentaryStats ? (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 13, display: 'grid', gap: 6 }}>
                  <div style={{ fontWeight: 700 }}>Spend statistics over time</div>
                  <div>Mean monthly spend: <strong>${Number(rudimentaryStats.mean).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>
                  <div>Most spend month: <strong>{rudimentaryStats.maxMonth || 'N/A'}</strong></div>
                  <div>Least spend month: <strong>{rudimentaryStats.minMonth || 'N/A'}</strong></div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <ExpandablePanel title="Budget trend" hint="Score and expense ratio over time — tap to expand" cardSoftStyle={cardSoftStyle}>
          <div style={{ display: 'grid', gap: 18 }}>
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
        </ExpandablePanel>

        <FinancialHistoryPanel
          incomeHistory={incomeHistory}
          expensesHistory={expensesHistory}
          checkupHistory={checkupHistory}
          currentMonth={month}
          onSelectMonth={openHistoryMonth}
          isMobile={isMobile}
          cardStyle={cardStyle}
          btnNeutral={btnNeutral}
        />
          </>
        )}

        {activeSection === 'plan' && (
          <SubscriptionPortal
            subscription={subscription}
            billingBusy={billingBusy}
            billingErr={billingErr}
            token={token}
            accountEmail={accountEmail}
            onSubscribeMonthly={() => startCheckout('monthly')}
            onSubscribeAnnual={() => startCheckout('annual')}
            onManageBilling={openBillingPortal}
            onSync={syncBilling}
            cardStyle={cardStyle}
            cardSoftStyle={cardSoftStyle}
            inputStyle={inputStyle}
            btnPrimary={btnPrimary}
            btnNeutral={btnNeutral}
            isMobile={isMobile}
            isTablet={isTablet}
          />
        )}

        {activeSection === 'tools' && (
          <MoreToolsPanel
            isPro={isPro}
            isMobile={isMobile}
            isTablet={isTablet}
            cardStyle={cardStyle}
            cardSoftStyle={cardSoftStyle}
            inputStyle={inputStyle}
            btnPrimary={btnPrimary}
            btnNeutral={btnNeutral}
            onGoPlan={() => setActiveSection('plan')}
            exportBusy={exportBusy}
            pdfBusy={pdfBusy}
            businessPdfBusy={businessPdfBusy}
            busy={busy}
            onExportCsv={exportMonthCsv}
            onExportPdf={exportExecutivePdf}
            onExportBusinessPdf={exportBusinessDocsPdf}
            profile={profile}
            onProfileChange={setProfile}
            aiBusy={aiBusy}
            onAiInsights={generateInsights}
            aiError={aiError}
            aiPlan={aiPlan}
            token={token}
            userEmail={accountEmail || digestEmail}
            onAccountDeleted={logout}
            expertBusy={expertBusy}
            onExpert={loadExpertBriefing}
            expertError={expertError}
            expertData={expertData}
            forecastBusy={forecastBusy}
            forecastErr={forecastErr}
            forecastData={forecastData}
            businessDocs={businessDocs}
            onOpenProjections={loadForecastAndDocs}
            onScrollToProjections={scrollToProjections}
          />
        )}

        {activeSection === 'overview' && (
          <OverviewDashboard
            isMobile={isMobile}
            isDesktop={isDesktop}
            checkupResult={checkupResult}
            income={income}
            totalExpenses={totalExpenses}
            budgetGrade={grade}
            cardSoftStyle={cardSoftStyle}
            btnPrimary={btnPrimary}
            btnNeutral={btnNeutral}
            checkupBusy={checkupBusy}
            onGoFinances={() => setActiveSection('finances')}
            onGoTab={goAppTab}
            onGoProgress={() => setActiveSection('progress')}
            onGuideNavigate={handleGuideNavigate}
            primaryGoal={primaryGoal}
            profileSummary={profileSummary}
            userXp={userXp}
            rankData={rankData}
            rankBusy={rankBusy}
            rankErr={rankErr}
          />
        )}
        </>
        ) : null}
        <AppFooter />
      </div>
      </div>
    </div>
  );
}
