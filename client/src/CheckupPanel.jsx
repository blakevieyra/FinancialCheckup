import { useEffect, useState, useRef } from 'react';
import * as api from './api';
import { DEFAULT_SNAPSHOT, DIMENSION_LABELS, DIMENSION_IMPORTANCE, DIMENSION_BASICS, DEBT_STARTER_TEMPLATES, INSURANCE_COVERAGE_TYPES, BLANK_SNAPSHOT } from './checkupConstants';
import {
  DEBT_TYPES,
  EXPENSE_CATEGORY_GROUPS,
  EXPENSE_CATEGORIES,
  LEGACY_DEBT_LABELS,
  INVESTMENT_ACCOUNT_TYPES,
  INVESTMENT_STARTER_ACCOUNTS,
  RETIREMENT_ACCOUNT_TYPES,
  RETIREMENT_STARTER_ACCOUNTS,
} from './categoryOptions';
import CategorySelect from './CategorySelect';
import IncomeSourcesEditor from './IncomeSourcesEditor';
import { sumIncomeSources, ensureIncomeSources } from './incomeSources';
import {
  loadExtendedProfile,
  saveExtendedProfile,
} from './userStorage';
import SpecialistReportsGrid from './SpecialistReportsGrid';

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
    incomeSources,
    onIncomeSourcesChange,
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

      <IncomeSourcesEditor
        sources={incomeSources}
        onChange={onIncomeSourcesChange}
        inputStyle={inputStyle}
        btnNeutral={btnNeutral}
        cardSoftStyle={cardSoftStyle}
        isMobile={isMobile}
        isTablet={isTablet}
        disabled={busy}
      />

      <div>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Expenses by category</div>
        <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>
          Pick a category from the list, or choose Custom to type your own.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px', minWidth: 180 }}>
            <CategorySelect
              optionGroups={EXPENSE_CATEGORY_GROUPS}
              value={newCategory}
              onChange={onNewCategoryChange}
              inputStyle={inputStyle}
              placeholder="Choose expense category"
              customPlaceholder="Custom category name"
              disabled={catBusy}
            />
          </div>
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

function DebtEditor({ debts, onChange, onPatch, onAdd, onRemove, inputStyle, btnNeutral, cardSoftStyle, isMobile }) {
  const rows = debts || [];

  function debtDisplayName(name) {
    if (!name || LEGACY_DEBT_LABELS.has(name)) return '';
    return name;
  }

  function handleDebtTypeChange(i, type) {
    const preset = DEBT_TYPES.find((x) => x.label === type);
    if (onPatch) {
      onPatch(i, { name: type, ...(preset ? { apr: preset.defaultApr } : {}) });
      return;
    }
    onChange(i, 'name', type);
    if (preset) onChange(i, 'apr', preset.defaultApr);
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <SectionLabel>Add each loan or card below — pick a type from the list, or Custom. Remove any that do not apply.</SectionLabel>
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
            <CategorySelect
              options={DEBT_TYPES}
              value={debtDisplayName(d.name)}
              onChange={(type) => handleDebtTypeChange(i, type)}
              inputStyle={inputStyle}
              placeholder="Choose debt type"
              customPlaceholder="Custom account name"
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

function TypedAccountsEditor({
  accounts,
  onChange,
  onAdd,
  onRemove,
  typeOptions,
  showMonthlyContribution = false,
  inputStyle,
  btnNeutral,
  cardSoftStyle,
  isMobile,
  sectionLabel,
  addLabel = '+ Add another account',
  typePlaceholder = 'Choose account type',
  customPlaceholder = 'Custom account name',
}) {
  const rows = accounts || [];
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {sectionLabel ? <SectionLabel>{sectionLabel}</SectionLabel> : null}
      {rows.length ? (
        rows.map((a, i) => (
          <div
            key={`acct-${i}-${a.type}`}
            style={{ ...cardSoftStyle, padding: '0.75rem', display: 'grid', gap: 10 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <FieldLabel>Account type</FieldLabel>
              <button type="button" onClick={() => onRemove(i)} style={{ ...btnNeutral, fontSize: 11, padding: '0.25rem 0.5rem' }}>
                Remove
              </button>
            </div>
            <CategorySelect
              options={typeOptions}
              value={a.type}
              onChange={(type) => onChange(i, 'type', type)}
              inputStyle={inputStyle}
              placeholder={typePlaceholder}
              customPlaceholder={customPlaceholder}
            />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : showMonthlyContribution ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                <FieldLabel>Balance ($)</FieldLabel>
                <input type="number" value={a.balance} onChange={(e) => onChange(i, 'balance', e.target.value)} style={inputStyle} />
              </label>
              {showMonthlyContribution ? (
                <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  <FieldLabel>Monthly contribution ($)</FieldLabel>
                  <input type="number" value={a.monthlyContribution} onChange={(e) => onChange(i, 'monthlyContribution', e.target.value)} style={inputStyle} />
                </label>
              ) : null}
            </div>
          </div>
        ))
      ) : (
        <div style={{ fontSize: 13, opacity: 0.75 }}>No accounts listed — add a row to get started.</div>
      )}
      <button type="button" onClick={onAdd} style={{ ...btnNeutral, fontSize: 12, padding: '0.4rem 0.75rem', justifySelf: 'start' }}>
        {addLabel}
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
  const [guestBudget, setGuestBudget] = useState({
    incomeSources: ensureIncomeSources(null, DEFAULT_SNAPSHOT.income),
    monthlyExpenses: DEFAULT_SNAPSHOT.monthlyExpenses,
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [history, setHistory] = useState([]);
  const debtSeededRef = useRef(false);
  const accountsSeededRef = useRef(false);

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
      investmentAccounts,
      retirementAccounts,
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
      investmentAccounts: Array.isArray(investmentAccounts) ? investmentAccounts : [],
      retirementAccounts: Array.isArray(retirementAccounts) ? retirementAccounts : [],
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

  function patchDebt(i, patch) {
    setExtended((prev) => {
      const debts = [...(prev.debts || [])];
      debts[i] = { ...debts[i], ...patch };
      return { ...prev, debts };
    });
  }

  function addDebt() {
    setExtended((prev) => ({
      ...prev,
      debts: [...(prev.debts || []), { name: '', balance: 0, minPayment: 0, apr: 18 }],
    }));
  }

  function removeDebt(i) {
    setExtended((prev) => ({
      ...prev,
      debts: (prev.debts || []).filter((_, idx) => idx !== i),
    }));
  }

  function setInvestmentAccount(i, key, value) {
    setExtended((prev) => {
      const investmentAccounts = [...(prev.investmentAccounts || [])];
      investmentAccounts[i] = { ...investmentAccounts[i], [key]: value };
      return { ...prev, investmentAccounts };
    });
  }

  function addInvestmentAccount() {
    setExtended((prev) => ({
      ...prev,
      investmentAccounts: [...(prev.investmentAccounts || []), { type: '', balance: 0 }],
    }));
  }

  function removeInvestmentAccount(i) {
    setExtended((prev) => ({
      ...prev,
      investmentAccounts: (prev.investmentAccounts || []).filter((_, idx) => idx !== i),
    }));
  }

  function setRetirementAccount(i, key, value) {
    setExtended((prev) => {
      const retirementAccounts = [...(prev.retirementAccounts || [])];
      retirementAccounts[i] = { ...retirementAccounts[i], [key]: value };
      return { ...prev, retirementAccounts };
    });
  }

  function addRetirementAccount() {
    setExtended((prev) => ({
      ...prev,
      retirementAccounts: [...(prev.retirementAccounts || []), { type: '', balance: 0, monthlyContribution: 0 }],
    }));
  }

  function removeRetirementAccount(i) {
    setExtended((prev) => ({
      ...prev,
      retirementAccounts: (prev.retirementAccounts || []).filter((_, idx) => idx !== i),
    }));
  }

  function syncAccountTotals(accounts) {
    const investmentAccounts = accounts.investmentAccounts || [];
    const retirementAccounts = accounts.retirementAccounts || [];
    if (!investmentAccounts.length && !retirementAccounts.length) return accounts;

    const investmentTotal = investmentAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
    const retirementBalance = retirementAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
    const monthlyRetirementContribution = retirementAccounts.reduce(
      (s, a) => s + (Number(a.monthlyContribution) || 0),
      0,
    );

    return {
      ...accounts,
      investmentTotal,
      retirementBalance,
      monthlyRetirementContribution,
    };
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

  useEffect(() => {
    if (!dimensionCardLayout || isGuest || accountsSeededRef.current) return;
    setExtended((prev) => {
      const hasInv = (prev.investmentAccounts || []).length > 0;
      const hasRet = (prev.retirementAccounts || []).length > 0;
      if (hasInv && hasRet) {
        accountsSeededRef.current = true;
        return prev;
      }
      accountsSeededRef.current = true;

      let investmentAccounts = prev.investmentAccounts;
      if (!hasInv) {
        const total = Number(prev.investmentTotal) || 0;
        investmentAccounts = total > 0
          ? [{ type: 'Taxable brokerage', balance: total }]
          : INVESTMENT_STARTER_ACCOUNTS.map((a) => ({ ...a }));
      }

      let retirementAccounts = prev.retirementAccounts;
      if (!hasRet) {
        const bal = Number(prev.retirementBalance) || 0;
        const mo = Number(prev.monthlyRetirementContribution) || 0;
        retirementAccounts = bal > 0 || mo > 0
          ? [{ type: 'Employer 401(k)', balance: bal, monthlyContribution: mo }]
          : RETIREMENT_STARTER_ACCOUNTS.map((a) => ({ ...a }));
      }

      return syncAccountTotals({ ...prev, investmentAccounts, retirementAccounts });
    });
  }, [dimensionCardLayout, isGuest]);

  useEffect(() => {
    setExtended((prev) => {
      const invAccounts = prev.investmentAccounts || [];
      const retAccounts = prev.retirementAccounts || [];
      if (!invAccounts.length && !retAccounts.length) return prev;
      const next = syncAccountTotals(prev);
      if (
        next.investmentTotal === prev.investmentTotal
        && next.retirementBalance === prev.retirementBalance
        && next.monthlyRetirementContribution === prev.monthlyRetirementContribution
      ) {
        return prev;
      }
      return next;
    });
  }, [extended.investmentAccounts, extended.retirementAccounts]);

  async function runCheckup(silent = false) {
    if (!silent) setErr('');
    if (!silent) setBusy(true);
    try {
      const payload = isGuest
        ? {
            ...extractExtendedOnly(extended),
            income: sumIncomeSources(guestBudget.incomeSources),
            monthlyExpenses: guestBudget.monthlyExpenses,
          }
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
  const income = isGuest ? sumIncomeSources(guestBudget.incomeSources) : ledger?.income;
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
            <IncomeSourcesEditor
              sources={guestBudget.incomeSources}
              onChange={(sources) => setGuestBudget((p) => ({ ...p, incomeSources: sources }))}
              inputStyle={inputStyle}
              btnNeutral={btnNeutral}
              cardSoftStyle={cardSoftStyle}
              isMobile={isMobile}
              isTablet={isTablet}
            />
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
          onPatch={patchDebt}
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
        <TypedAccountsEditor
          accounts={extended.investmentAccounts}
          onChange={setInvestmentAccount}
          onAdd={addInvestmentAccount}
          onRemove={removeInvestmentAccount}
          typeOptions={INVESTMENT_ACCOUNT_TYPES}
          inputStyle={inputStyle}
          btnNeutral={btnNeutral}
          cardSoftStyle={cardSoftStyle}
          isMobile={isMobile}
          sectionLabel="Add each investment account — remove any that do not apply, or add another."
          typePlaceholder="Choose investment type"
        />
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Portfolio total: <strong>${Number(extended.investmentTotal || 0).toLocaleString()}</strong> (auto-summed from accounts)
        </div>
        <div style={grid}>
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
        <TypedAccountsEditor
          accounts={extended.retirementAccounts}
          onChange={setRetirementAccount}
          onAdd={addRetirementAccount}
          onRemove={removeRetirementAccount}
          typeOptions={RETIREMENT_ACCOUNT_TYPES}
          showMonthlyContribution
          inputStyle={inputStyle}
          btnNeutral={btnNeutral}
          cardSoftStyle={cardSoftStyle}
          isMobile={isMobile}
          sectionLabel="Add each retirement account — remove any that do not apply, or add another."
          typePlaceholder="Choose retirement account type"
        />
        <div style={{ fontSize: 13, opacity: 0.85, display: 'grid', gap: 4 }}>
          <div>
            Total saved: <strong>${Number(extended.retirementBalance || 0).toLocaleString()}</strong>
          </div>
          <div>
            Monthly contributions: <strong>${Number(extended.monthlyRetirementContribution || 0).toLocaleString()}</strong>
          </div>
        </div>
        <div style={grid}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Age<input type="number" value={extended.age} onChange={(e) => setField('age', e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retire at<input type="number" value={extended.targetRetirementAge} onChange={(e) => setField('targetRetirementAge', e.target.value)} style={inputStyle} /></label>
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
                <IncomeSourcesEditor
                  sources={guestBudget.incomeSources}
                  onChange={(sources) => setGuestBudget((p) => ({ ...p, incomeSources: sources }))}
                  inputStyle={inputStyle}
                  btnNeutral={btnNeutral}
                  cardSoftStyle={cardSoftStyle}
                  isMobile={isMobile}
                  isTablet={isTablet}
                />
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
              onPatch={patchDebt}
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
            <TypedAccountsEditor
              accounts={extended.investmentAccounts}
              onChange={setInvestmentAccount}
              onAdd={addInvestmentAccount}
              onRemove={removeInvestmentAccount}
              typeOptions={INVESTMENT_ACCOUNT_TYPES}
              inputStyle={inputStyle}
              btnNeutral={btnNeutral}
              cardSoftStyle={{ padding: 0, border: 'none', background: 'transparent' }}
              isMobile={isMobile}
              typePlaceholder="Choose investment type"
            />
            <div style={{ fontSize: 13, opacity: 0.85, margin: '10px 0' }}>
              Portfolio total: <strong>${Number(extended.investmentTotal || 0).toLocaleString()}</strong>
            </div>
            <div style={grid}>
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
            <TypedAccountsEditor
              accounts={extended.retirementAccounts}
              onChange={setRetirementAccount}
              onAdd={addRetirementAccount}
              onRemove={removeRetirementAccount}
              typeOptions={RETIREMENT_ACCOUNT_TYPES}
              showMonthlyContribution
              inputStyle={inputStyle}
              btnNeutral={btnNeutral}
              cardSoftStyle={{ padding: 0, border: 'none', background: 'transparent' }}
              isMobile={isMobile}
              typePlaceholder="Choose retirement account type"
            />
            <div style={{ fontSize: 13, opacity: 0.85, margin: '10px 0', display: 'grid', gap: 4 }}>
              <div>Total saved: <strong>${Number(extended.retirementBalance || 0).toLocaleString()}</strong></div>
              <div>Monthly contributions: <strong>${Number(extended.monthlyRetirementContribution || 0).toLocaleString()}</strong></div>
            </div>
            <div style={grid}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Age<input type="number" value={extended.age} onChange={(e) => setField('age', e.target.value)} style={inputStyle} /></label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>Retire at<input type="number" value={extended.targetRetirementAge} onChange={(e) => setField('targetRetirementAge', e.target.value)} style={inputStyle} /></label>
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
            <SpecialistReportsGrid
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

export { ActionPlanBlock, SpecialistReportsGrid as DetailCards };
