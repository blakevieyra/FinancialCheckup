import { useEffect, useState, useRef } from 'react';
import * as api from './api';
import { DEFAULT_SNAPSHOT, DIMENSION_LABELS, DIMENSION_IMPORTANCE, DIMENSION_BASICS, DEBT_STARTER_TEMPLATES, INSURANCE_COVERAGE_TYPES, BLANK_SNAPSHOT } from './checkupConstants';
import {
  loadExtendedProfile,
  saveExtendedProfile,
} from './userStorage';
import SpecialistInsightPanel from './SpecialistInsightPanel';

const fieldGrid = (isMobile) => ({
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
  gap: 10,
});

function dimScoreLine(result, key) {
  const d = result?.dimensions?.find((x) => x.key === key);
  if (!d) return null;
  return `${Math.round(d.score)}/100 · Grade ${d.grade}`;
}

function DimensionCard({
  title,
  importance,
  basics,
  included,
  onToggleInclude,
  cardStyle,
  btnNeutral,
  scoreLine,
  scoreAtBottom = false,
  footerExtra,
  children,
}) {
  const [showWhy, setShowWhy] = useState(false);

  const scoreBlock = (
    <>
      {scoreLine ? <div style={{ fontSize: 13, opacity: 0.85 }}>{scoreLine}</div> : null}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={included} onChange={onToggleInclude} />
        Include in overall score
      </label>
    </>
  );

  return (
    <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
          {!scoreAtBottom && scoreLine ? <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{scoreLine}</div> : null}
          {basics ? (
            <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.5, marginTop: 8, padding: '0.55rem 0.65rem', borderRadius: 8, background: 'rgba(148,163,184,0.08)' }}>
              <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.75 }}>Basics</strong>
              <div style={{ marginTop: 4 }}>{basics}</div>
            </div>
          ) : null}
          {!scoreAtBottom ? (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={included} onChange={onToggleInclude} />
              Include in overall score
            </label>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          style={{ ...btnNeutral, fontSize: 12, padding: '0.4rem 0.75rem', flexShrink: 0 }}
        >
          {showWhy ? 'Hide' : 'Why this matters'}
        </button>
      </div>
      {showWhy ? (
        <div
          style={{
            fontSize: 13,
            opacity: 0.88,
            lineHeight: 1.55,
            padding: '0.65rem 0.75rem',
            borderRadius: 8,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(77,166,255,0.2)',
          }}
        >
          {importance}
        </div>
      ) : null}
      {children}
      {scoreAtBottom ? (
        <div
          style={{
            paddingTop: 12,
            borderTop: '1px solid rgba(148,163,184,0.15)',
            display: 'grid',
            gap: 10,
            fontSize: 13,
            opacity: 0.9,
          }}
        >
          {scoreBlock}
          {footerExtra}
        </div>
      ) : null}
    </div>
  );
}

function BudgetLedgerEditor({
  editor,
  cardSoftStyle,
  inputStyle,
  btnNeutral,
  btnPrimary,
  isMobile,
  isTablet,
}) {
  const expenseGrid = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';
  const {
    profile,
    onProfileChange,
    month,
    income,
    onIncomeChange,
    expenses,
    onExpenseChange,
    newCategory,
    onNewCategoryChange,
    onAddCategory,
    onDeleteCategory,
    catBusy,
    busy,
  } = editor;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {[
          { id: 'personal', label: 'Personal' },
          { id: 'business', label: 'Business' },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onProfileChange(p.id)}
            style={{
              ...(profile === p.id ? btnPrimary : btnNeutral),
              padding: '0.45rem 0.9rem',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {p.label}
          </button>
        ))}
        <span style={{ fontSize: 12, opacity: 0.65 }}>Month: {month}</span>
      </div>

      <label style={{ display: 'grid', gap: 6, fontSize: 14, maxWidth: 320 }}>
        Monthly income ($)
        <input type="number" value={income} step="0.01" onChange={(e) => onIncomeChange(e.target.value)} style={inputStyle} />
      </label>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Expenses by category</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <input
            value={newCategory}
            onChange={(e) => onNewCategoryChange(e.target.value)}
            placeholder="Add category"
            style={{ ...inputStyle, flex: '1 1 160px', minWidth: 140 }}
            disabled={catBusy}
          />
          <button type="button" onClick={onAddCategory} disabled={catBusy || !newCategory.trim()} style={btnNeutral}>
            Add
          </button>
        </div>
        {expenses?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: expenseGrid, gap: 10 }}>
            {(expenses || []).map((e) => (
              <div key={e.category} style={{ ...cardSoftStyle, padding: '0.75rem', display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{e.category}</div>
                <input
                  type="number"
                  value={e.amount}
                  step="0.01"
                  onChange={(ev) => onExpenseChange(e.category, ev.target.value)}
                  style={{ ...inputStyle, width: '100%', padding: 8 }}
                  aria-label={`${e.category} amount`}
                />
                <button
                  type="button"
                  onClick={() => onDeleteCategory(e.category)}
                  disabled={busy}
                  style={{ ...btnNeutral, fontSize: 12, padding: '0.35rem 0.5rem', justifySelf: 'start' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.75, fontSize: 13 }}>Add a category to start tracking spending.</div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 12, opacity: 0.72, letterSpacing: '0.03em', lineHeight: 1.45, marginBottom: 4 }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>{children}</div>;
}

function tierColor(tier) {
  if (tier === 'Essential') return '#fca5a5';
  if (tier === 'Important') return '#fbbf24';
  return '#93c5fd';
}

function DebtEditor({ debts, onChange, onAdd, onRemove, inputStyle, btnNeutral, cardSoftStyle, isMobile }) {
  const rows = debts || [];
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <SectionLabel>Add each loan or card below — remove any that do not apply, or add another debt.</SectionLabel>
      {rows.length ? (
        rows.map((d, i) => (
          <div
            key={`debt-${i}-${d.name}`}
            style={{ ...cardSoftStyle, padding: '0.75rem', display: 'grid', gap: 10 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <FieldLabel>Account type</FieldLabel>
              <button type="button" onClick={() => onRemove(i)} style={{ ...btnNeutral, fontSize: 11, padding: '0.25rem 0.5rem' }}>
                Remove
              </button>
            </div>
            <input
              value={d.name}
              onChange={(e) => onChange(i, 'name', e.target.value)}
              placeholder="e.g. Mortgage, credit card, auto loan"
              style={inputStyle}
            />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <FieldLabel>Balance ($)</FieldLabel>
                <input type="number" value={d.balance} onChange={(e) => onChange(i, 'balance', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <FieldLabel>Min payment ($)</FieldLabel>
                <input type="number" value={d.minPayment} onChange={(e) => onChange(i, 'minPayment', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <FieldLabel>APR %</FieldLabel>
                <input type="number" step="0.01" value={d.apr} onChange={(e) => onChange(i, 'apr', e.target.value)} style={inputStyle} />
              </label>
            </div>
          </div>
        ))
      ) : (
        <div style={{ fontSize: 13, opacity: 0.75 }}>No debts listed — add a row if you carry balances.</div>
      )}
      <button type="button" onClick={onAdd} style={{ ...btnNeutral, fontSize: 12, padding: '0.4rem 0.75rem', justifySelf: 'start' }}>
        + Add another debt
      </button>
    </div>
  );
}

function InsuranceEditor({ extended, onToggle, cardSoftStyle }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <SectionLabel>Check coverage you have today — weighted by importance (essential policies count most toward your score).</SectionLabel>
      {INSURANCE_COVERAGE_TYPES.map((item) => (
        <label
          key={item.field}
          style={{
            ...cardSoftStyle,
            padding: '0.65rem 0.75rem',
            display: 'grid',
            gap: 4,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={Boolean(extended[item.field])} onChange={(e) => onToggle(item.field, e.target.checked)} />
              {item.label}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: tierColor(item.tier),
                opacity: 0.95,
              }}
            >
              {item.tier} · {item.weight}pts
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4, paddingLeft: 24 }}>{item.hint}</div>
        </label>
      ))}
    </div>
  );
}

function ActionPlanBlock({ actionPlan, cardSoftStyle, compact, bare }) {
  const items = (actionPlan || []).slice(0, compact ? 3 : 6);
  if (!items.length) return null;
  return (
    <div style={bare ? { display: 'grid', gap: 10 } : { ...cardSoftStyle, padding: '0.85rem' }}>
      {!bare ? <div style={{ fontWeight: 700, marginBottom: 10 }}>Top priorities right now</div> : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item, i) => (
          <div key={`${item.title}-${i}`} style={{ borderLeft: `3px solid ${item.priority === 'HIGH' ? '#ef4444' : '#f59e0b'}`, paddingLeft: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              #{i + 1} [{item.priority}] {item.title}
              {item.horizon ? (
                <span style={{ fontWeight: 500, fontSize: 10, marginLeft: 6, opacity: 0.7 }}>
                  {item.horizon === 'wealth' ? 'long-term' : 'security'}
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 13, opacity: 0.88, marginTop: 4 }}>{item.detail}</div>
            {item.steps?.[0] ? <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Start: {item.steps[0]}</div> : null}
            {item.timeline ? <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{item.timeline}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailCards({
  result,
  isTablet,
  cardSoftStyle,
  token,
  month,
  profile,
  primaryGoal,
  isPro,
  onGoPlan,
  btnPrimary,
  btnNeutral,
  income,
  totalExpenses,
  extended,
}) {
  if (!result) return null;
  const budgetDim = result.dimensions?.find((d) => d.key === 'budget');
  const debtDim = result.dimensions?.find((d) => d.key === 'debt');
  const savingsDim = result.dimensions?.find((d) => d.key === 'savings');
  const investDim = result.dimensions?.find((d) => d.key === 'investments');
  const insDim = result.dimensions?.find((d) => d.key === 'insurance');
  const retireDim = result.dimensions?.find((d) => d.key === 'retirement');

  const debtSummary = result.debtPlanner
    ? `Extra $${result.debtPlanner.extraMonthly?.toLocaleString()}/mo · Avalanche ${result.debtPlanner.avalanche?.months ?? 0} mo vs Snowball ${result.debtPlanner.snowball?.months ?? 0} mo`
    : debtDim?.summary;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12 }}>
      <SpecialistInsightPanel
        area="budget"
        summary={budgetDim?.summary || (result.budgetGapAnalysis || [])[0]}
        gaps={(result.budgetGapAnalysis || []).slice(0, 5)}
        dimensionScore={budgetDim?.score}
        dimensionGrade={budgetDim?.grade}
        snapshot={{ income, totalExpenses, ...extended }}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="debt"
        summary={debtSummary}
        gaps={[
          result.debtPlanner?.avalanche ? `Avalanche: ${result.debtPlanner.avalanche.months} mo, $${result.debtPlanner.avalanche.totalInterest?.toLocaleString()} interest` : null,
          result.debtPlanner?.snowball ? `Snowball: ${result.debtPlanner.snowball.months} mo, $${result.debtPlanner.snowball.totalInterest?.toLocaleString()} interest` : null,
        ].filter(Boolean)}
        dimensionScore={debtDim?.score}
        dimensionGrade={debtDim?.grade}
        snapshot={extended}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="insurance"
        summary={insDim?.summary}
        gaps={result.insuranceGaps}
        dimensionScore={insDim?.score}
        dimensionGrade={insDim?.grade}
        snapshot={{ ...extended, hasLifeInsurance: extended?.hasLifeInsurance, hasDisabilityInsurance: extended?.hasDisabilityInsurance }}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="investments"
        summary={result.investmentHealth?.summary || investDim?.summary}
        gaps={result.investmentHealth?.gaps || []}
        dimensionScore={investDim?.score}
        dimensionGrade={investDim?.grade}
        snapshot={extended}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="savings"
        summary={savingsDim?.summary}
        gaps={savingsDim?.gap ? [{ label: `Emergency fund gap: $${Number(savingsDim.gap).toLocaleString()}` }] : []}
        dimensionScore={savingsDim?.score}
        dimensionGrade={savingsDim?.grade}
        snapshot={extended}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
      <SpecialistInsightPanel
        area="retirement"
        summary={result.retirementTrajectory?.summary || retireDim?.summary}
        gaps={result.retirementTrajectory?.monthlyGap ? [`Suggested +$${Number(result.retirementTrajectory.monthlyGap).toLocaleString()}/mo to benchmark`] : []}
        dimensionScore={retireDim?.score}
        dimensionGrade={retireDim?.grade}
        snapshot={extended}
        token={token}
        month={month}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        cardSoftStyle={cardSoftStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        income={income}
        totalExpenses={totalExpenses}
      />
    </div>
  );
}

export default function CheckupPanel({
  token,
  userId,
  month,
  isMobile,
  isTablet,
  cardStyle,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
  ledger,
  onResult,
  onGoTab,
  showForm = true,
  showDetails = true,
  showHistory = true,
  profile = 'personal',
  primaryGoal = '',
  isPro = false,
  onGoPlan,
  autoSync = false,
  onAutoCheckup,
  dimensionCardLayout = false,
  ledgerEditor = null,
}) {
  const isGuest = !token;
  const [extended, setExtended] = useState(() => loadExtendedProfile(userId, isGuest));
  const [guestBudget, setGuestBudget] = useState({ income: DEFAULT_SNAPSHOT.income, monthlyExpenses: DEFAULT_SNAPSHOT.monthlyExpenses });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);
  const debtSeededRef = useRef(false);

  useEffect(() => {
    if (isGuest) return;
    saveExtendedProfile(userId, extractExtendedOnly(extended));
  }, [extended, isGuest, userId]);

  useEffect(() => {
    if (!autoSync || isGuest || !token) return undefined;
    const t = setTimeout(() => {
      runCheckup(true);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extended, autoSync, token, month]);

  useEffect(() => {
    if (!token || !userId) return;
    setExtended(loadExtendedProfile(userId, false));
  }, [userId, token]);

  function extractExtendedOnly(s) {
    const {
      debts,
      emergencyFund,
      monthlySavings,
      investmentTotal,
      stockPct,
      bondPct,
      internationalPct,
      cashPct,
      feePct,
      hasLifeInsurance,
      hasDisabilityInsurance,
      hasLiabilityInsurance,
      hasHealthInsurance,
      hasHomeInsurance,
      hasAutoInsurance,
      age,
      targetRetirementAge,
      retirementBalance,
      monthlyRetirementContribution,
      excludedFromScore,
    } = s;
    return {
      debts,
      emergencyFund,
      monthlySavings,
      investmentTotal,
      stockPct,
      bondPct,
      internationalPct,
      cashPct,
      feePct,
      hasLifeInsurance,
      hasDisabilityInsurance,
      hasLiabilityInsurance,
      hasHealthInsurance,
      hasHomeInsurance,
      hasAutoInsurance,
      age,
      targetRetirementAge,
      retirementBalance,
      monthlyRetirementContribution,
      excludedFromScore: Array.isArray(excludedFromScore) ? excludedFromScore : [],
    };
  }

  function toggleScoreDimension(key) {
    setExtended((prev) => {
      const excluded = new Set(prev.excludedFromScore || []);
      if (excluded.has(key)) {
        excluded.delete(key);
      } else {
        if (DIMENSION_LABELS.length - excluded.size <= 1) return prev;
        excluded.add(key);
      }
      return { ...prev, excludedFromScore: [...excluded] };
    });
  }

  useEffect(() => {
    if (!token) return;
    api.getCheckupPrefill(token, month).then((d) => {
      if (d?.extended && Object.keys(d.extended).length) {
        setExtended((prev) => ({ ...BLANK_SNAPSHOT, ...prev, ...d.extended }));
      }
    }).catch(() => {});
    api.getCheckupHistory(token).then((d) => setHistory(d.history || [])).catch(() => setHistory([]));
  }, [token, month]);

  function setField(key, value) {
    setExtended((prev) => ({ ...prev, [key]: value }));
  }

  function setDebt(i, key, value) {
    setExtended((prev) => {
      const debts = [...(prev.debts || [])];
      debts[i] = { ...debts[i], [key]: value };
      return { ...prev, debts };
    });
  }

  function addDebt(name = 'Other loan') {
    setExtended((prev) => ({
      ...prev,
      debts: [...(prev.debts || []), { name, balance: 0, minPayment: 0, apr: 18 }],
    }));
  }

  function removeDebt(i) {
    setExtended((prev) => ({
      ...prev,
      debts: (prev.debts || []).filter((_, idx) => idx !== i),
    }));
  }

  useEffect(() => {
    if (!dimensionCardLayout || isGuest || debtSeededRef.current) return;
    setExtended((prev) => {
      if ((prev.debts || []).length > 0) {
        debtSeededRef.current = true;
        return prev;
      }
      debtSeededRef.current = true;
      return { ...prev, debts: DEBT_STARTER_TEMPLATES.map((d) => ({ ...d })) };
    });
  }, [dimensionCardLayout, isGuest]);

  async function runCheckup(silent = false) {
    if (!silent) setErr('');
    if (!silent) setBusy(true);
    try {
      const payload = isGuest
        ? { ...extractExtendedOnly(extended), ...guestBudget }
        : extractExtendedOnly(extended);
      const data = token
        ? await api.runCheckup(token, { month, snapshot: payload })
        : await api.previewCheckup(payload);
      setResult(data);
      onResult?.(data);
      if (token && autoSync) onAutoCheckup?.();
      if (token) {
        const h = await api.getCheckupHistory(token);
        setHistory(h.history || []);
      }
    } catch (e) {
      if (!silent) setErr(e.message);
    } finally {
      if (!silent) setBusy(false);
    }
  }

  const grid = fieldGrid(isMobile);
  const income = isGuest ? guestBudget.income : ledger?.income;
  const expenses = isGuest ? guestBudget.monthlyExpenses : ledger?.totalExpenses;
  const isDimIncluded = (key) => !(extended.excludedFromScore || []).includes(key);
  const inc = Number(income) || 0;
  const exp = Number(expenses) || 0;
  const budgetNet = inc - exp;
  const budgetRatio = inc > 0 ? ((exp / inc) * 100).toFixed(1) : null;

  const budgetFooter = ledgerEditor ? (
    <div style={{ display: 'grid', gap: 6, lineHeight: 1.5 }}>
      <div>
        This month: <strong>${inc.toLocaleString()}</strong> income · <strong>${exp.toLocaleString()}</strong> expenses
      </div>
      <div>
        {budgetNet < 0 ? (
          <>Deficit: <strong style={{ color: '#fca5a5' }}>${Math.abs(budgetNet).toLocaleString()}</strong></>
        ) : budgetNet > 0 ? (
          <>Surplus: <strong style={{ color: '#86efac' }}>${budgetNet.toLocaleString()}</strong></>
        ) : (
          <>Even — no surplus or deficit</>
        )}
        {budgetRatio != null ? <> · Expense ratio <strong>{budgetRatio}%</strong></> : null}
      </div>
    </div>
  ) : null;

  const dimensionFormCards = dimensionCardLayout ? (
    <>
      <DimensionCard
        title="Budget"
        importance={DIMENSION_IMPORTANCE.budget}
        included={isDimIncluded('budget')}
        onToggleInclude={() => toggleScoreDimension('budget')}
        cardStyle={cardStyle}
        btnNeutral={btnNeutral}
        scoreLine={dimScoreLine(result, 'budget')}
        scoreAtBottom={Boolean(ledgerEditor)}
        footerExtra={budgetFooter}
      >
        {ledgerEditor ? (
          <BudgetLedgerEditor
            editor={ledgerEditor}
            cardSoftStyle={cardSoftStyle}
            inputStyle={inputStyle}
            btnNeutral={btnNeutral}
            btnPrimary={btnPrimary}
            isMobile={isMobile}
            isTablet={isTablet}
          />
        ) : isGuest ? (
          <div style={grid}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              Monthly income ($)
              <input type="number" value={guestBudget.income} onChange={(e) => setGuestBudget((p) => ({ ...p, income: e.target.value }))} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              Monthly expenses ($)
              <input type="number" value={guestBudget.monthlyExpenses} onChange={(e) => setGuestBudget((p) => ({ ...p, monthlyExpenses: e.target.value }))} style={inputStyle} />
            </label>
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.88, lineHeight: 1.5 }}>
            Enter income and spending categories in this card — your score updates automatically.
          </div>
        )}
      </DimensionCard>

      <DimensionCard
        title="Savings"
        importance={DIMENSION_IMPORTANCE.savings}
        included={isDimIncluded('savings')}
        onToggleInclude={() => toggleScoreDimension('savings')}
        cardStyle={cardStyle}
        btnNeutral={btnNeutral}
        scoreLine={dimScoreLine(result, 'savings')}
      >
        <div style={grid}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Emergency fund ($)
            <input type="number" value={extended.emergencyFund} onChange={(e) => setField('emergencyFund', e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Monthly savings ($)
            <input type="number" value={extended.monthlySavings} onChange={(e) => setField('monthlySavings', e.target.value)} style={inputStyle} />
          </label>
        </div>
      </DimensionCard>

      <DimensionCard
        title="Debt"
        importance={DIMENSION_IMPORTANCE.debt}
        included={isDimIncluded('debt')}
        onToggleInclude={() => toggleScoreDimension('debt')}
        cardStyle={cardStyle}
        btnNeutral={btnNeutral}
        scoreLine={dimScoreLine(result, 'debt')}
      >
        <DebtEditor
          debts={extended.debts}
          onChange={setDebt}
          onAdd={() => addDebt()}
          onRemove={removeDebt}
          inputStyle={inputStyle}
          btnNeutral={btnNeutral}
          cardSoftStyle={cardSoftStyle}
          isMobile={isMobile}
        />
      </DimensionCard>

      <DimensionCard
        title="Investments"
        importance={DIMENSION_IMPORTANCE.investments}
        basics={DIMENSION_BASICS.investments}
        included={isDimIncluded('investments')}
        onToggleInclude={() => toggleScoreDimension('investments')}
        cardStyle={cardStyle}
        btnNeutral={btnNeutral}
        scoreLine={dimScoreLine(result, 'investments')}
      >
        <div style={grid}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Portfolio ($)
            <input type="number" value={extended.investmentTotal} onChange={(e) => setField('investmentTotal', e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            Fees %/yr
            <input type="number" step="0.01" value={extended.feePct} onChange={(e) => setField('feePct', e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Stocks %<input type="number" value={extended.stockPct} onChange={(e) => setField('stockPct', e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Bonds %<input type="number" value={extended.bondPct} onChange={(e) => setField('bondPct', e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Intl %<input type="number" value={extended.internationalPct} onChange={(e) => setField('internationalPct', e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Cash %<input type="number" value={extended.cashPct} onChange={(e) => setField('cashPct', e.target.value)} style={inputStyle} /></label>
        </div>
      </DimensionCard>

      <DimensionCard
        title="Insurance"
        importance={DIMENSION_IMPORTANCE.insurance}
        basics={DIMENSION_BASICS.insurance}
        included={isDimIncluded('insurance')}
        onToggleInclude={() => toggleScoreDimension('insurance')}
        cardStyle={cardStyle}
        btnNeutral={btnNeutral}
        scoreLine={dimScoreLine(result, 'insurance')}
      >
        <InsuranceEditor extended={extended} onToggle={setField} cardSoftStyle={cardSoftStyle} />
      </DimensionCard>

      <DimensionCard
        title="Retirement"
        importance={DIMENSION_IMPORTANCE.retirement}
        basics={DIMENSION_BASICS.retirement}
        included={isDimIncluded('retirement')}
        onToggleInclude={() => toggleScoreDimension('retirement')}
        cardStyle={cardStyle}
        btnNeutral={btnNeutral}
        scoreLine={dimScoreLine(result, 'retirement')}
      >
        <div style={grid}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Age<input type="number" value={extended.age} onChange={(e) => setField('age', e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retire at<input type="number" value={extended.targetRetirementAge} onChange={(e) => setField('targetRetirementAge', e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retirement $ saved<input type="number" value={extended.retirementBalance} onChange={(e) => setField('retirementBalance', e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Monthly 401k/IRA<input type="number" value={extended.monthlyRetirementContribution} onChange={(e) => setField('monthlyRetirementContribution', e.target.value)} style={inputStyle} /></label>
        </div>
      </DimensionCard>

      {autoSync && busy ? (
        <div style={{ fontSize: 13, opacity: 0.75 }}>Updating score…</div>
      ) : null}
      {!autoSync ? (
        <button type="button" onClick={() => runCheckup(false)} disabled={busy} style={btnPrimary}>
          {busy ? 'Calculating score…' : isGuest ? 'Get my score' : 'Save profile & update score'}
        </button>
      ) : null}
    </>
  ) : null;

  return (
    <div
      id="checkup-panel"
      style={dimensionCardLayout ? { display: 'grid', gap: 16 } : { ...(cardStyle || {}), display: 'grid', gap: 14 }}
    >
      {showForm ? (
        dimensionCardLayout ? (
          dimensionFormCards
        ) : (
        <>
          <div>
            <h2 style={{ margin: '0 0 6px' }}>{isGuest ? 'Quick financial checkup' : 'Debt, savings, investments & insurance'}</h2>
            <p style={{ margin: 0, opacity: 0.88, fontSize: 14, lineHeight: 1.45 }}>
              {isGuest
                ? 'Enter a snapshot below — no bank login.'
                : autoSync
                  ? 'Complete these fields — your score recalculates automatically.'
                  : 'Add debt, savings, investments, insurance, and retirement details.'}
            </p>
          </div>

          {!isGuest && ledger && !autoSync ? (
            <div style={{ ...cardSoftStyle, padding: '0.75rem', fontSize: 13, opacity: 0.9 }}>
              <strong>Ledger ({month}):</strong> ${Number(income || 0).toLocaleString()} income · ${Number(expenses || 0).toLocaleString()} expenses
            </div>
          ) : null}

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Overall score — include or exclude categories</div>
            <p style={{ margin: '0 0 10px', fontSize: 13, opacity: 0.85, lineHeight: 1.45 }}>
              Uncheck a category to remove it from your <strong>total</strong> score. It still appears individually. At least one category must stay included.
            </p>
            <div style={{ display: 'grid', gap: 6 }}>
              {DIMENSION_LABELS.map(({ key, label }) => {
                const included = !(extended.excludedFromScore || []).includes(key);
                return (
                  <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => toggleScoreDimension(key)}
                    />
                    <span>
                      Include <strong>{label}</strong> in overall score
                      {!included ? <span style={{ opacity: 0.65, marginLeft: 6 }}>(excluded from total)</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {isGuest ? (
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Income & spending</div>
              <div style={grid}>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Monthly income ($)
                  <input type="number" value={guestBudget.income} onChange={(e) => setGuestBudget((p) => ({ ...p, income: e.target.value }))} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  Monthly expenses ($)
                  <input type="number" value={guestBudget.monthlyExpenses} onChange={(e) => setGuestBudget((p) => ({ ...p, monthlyExpenses: e.target.value }))} style={inputStyle} />
                </label>
              </div>
            </div>
          ) : null}

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Savings</div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Emergency fund ($)
                <input type="number" value={extended.emergencyFund} onChange={(e) => setField('emergencyFund', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Monthly savings ($)
                <input type="number" value={extended.monthlySavings} onChange={(e) => setField('monthlySavings', e.target.value)} style={inputStyle} />
              </label>
            </div>
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Debts</div>
            <DebtEditor
              debts={extended.debts}
              onChange={setDebt}
              onAdd={() => addDebt()}
              onRemove={removeDebt}
              inputStyle={inputStyle}
              btnNeutral={btnNeutral}
              cardSoftStyle={{ padding: 0, border: 'none', background: 'transparent' }}
              isMobile={isMobile}
            />
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Investments</div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Portfolio ($)
                <input type="number" value={extended.investmentTotal} onChange={(e) => setField('investmentTotal', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Fees %/yr
                <input type="number" step="0.01" value={extended.feePct} onChange={(e) => setField('feePct', e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Stocks %<input type="number" value={extended.stockPct} onChange={(e) => setField('stockPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Bonds %<input type="number" value={extended.bondPct} onChange={(e) => setField('bondPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Intl %<input type="number" value={extended.internationalPct} onChange={(e) => setField('internationalPct', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Cash %<input type="number" value={extended.cashPct} onChange={(e) => setField('cashPct', e.target.value)} style={inputStyle} /></label>
            </div>
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Insurance</div>
            <InsuranceEditor
              extended={extended}
              onToggle={setField}
              cardSoftStyle={{ padding: '0.55rem 0.65rem', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8, background: 'rgba(15,23,42,0.35)' }}
            />
          </div>

          <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Retirement</div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Age<input type="number" value={extended.age} onChange={(e) => setField('age', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retire at<input type="number" value={extended.targetRetirementAge} onChange={(e) => setField('targetRetirementAge', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retirement $ saved<input type="number" value={extended.retirementBalance} onChange={(e) => setField('retirementBalance', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Monthly 401k/IRA<input type="number" value={extended.monthlyRetirementContribution} onChange={(e) => setField('monthlyRetirementContribution', e.target.value)} style={inputStyle} /></label>
            </div>
          </div>

          {autoSync && busy ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>Updating score…</div>
          ) : null}
          {!autoSync ? (
            <button type="button" onClick={() => runCheckup(false)} disabled={busy} style={btnPrimary}>
              {busy ? 'Calculating score…' : isGuest ? 'Get my score' : 'Save profile & update score'}
            </button>
          ) : null}
        </>
        )
      ) : null}

      {err ? <div style={{ color: '#ffb3b3', fontSize: 14 }}>{err}</div> : null}

      {result ? (
        <>
          {showDetails ? (
            <DetailCards
              result={result}
              isTablet={isTablet}
              cardSoftStyle={cardSoftStyle}
              token={token}
              month={month}
              profile={profile}
              primaryGoal={primaryGoal}
              isPro={isPro}
              onGoPlan={onGoPlan}
              btnPrimary={btnPrimary}
              btnNeutral={btnNeutral}
              income={income}
              totalExpenses={expenses}
              extended={extended}
            />
          ) : null}
          {showHistory && history.length > 1 ? (
            <div style={{ ...cardSoftStyle, padding: '0.75rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Score over time</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {history.slice(0, 12).map((h) => (
                  <span key={`${h.month}-${h.createdAt}`} style={{ fontSize: 12, padding: '0.35rem 0.5rem', borderRadius: 8, background: 'rgba(59,130,246,0.15)' }}>
                    {h.month}: {Math.round(h.overallScore)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export { ActionPlanBlock, DetailCards };
