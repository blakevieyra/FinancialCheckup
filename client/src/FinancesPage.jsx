import CheckupPanel from './CheckupPanel';
import ScoreSummaryPanel from './ScoreSummaryPanel';

export default function FinancesPage({
  profile,
  onProfileChange,
  isMobile,
  isTablet,
  cardStyle,
  cardSoftStyle,
  inputStyle,
  btnPrimary,
  btnNeutral,
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
  month,
  token,
  userId,
  primaryGoal,
  isPro,
  onGoPlan,
  onResult,
  onAutoCheckup,
  totalExpenses,
  accountEmail,
  digestEnabled,
  onDigestEnabledChange,
  digestFrequency,
  onDigestFrequencyChange,
  digestEmail,
  onDigestEmailChange,
  digestWeekday,
  onDigestWeekdayChange,
  digestMsg,
  digestErr,
  digestPreview,
  digestSmtpReady,
  digestSaveBusy,
  digestTestBusy,
  onSaveDigest,
  onTestDigest,
}) {
  const expenseGrid = isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, minmax(0, 1fr))';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...cardStyle, display: 'grid', gap: 12 }}>
        <ScoreSummaryPanel
          bare
          cardSoftStyle={cardSoftStyle}
          inputStyle={inputStyle}
          btnPrimary={btnPrimary}
          btnNeutral={btnNeutral}
          accountEmail={accountEmail}
          digestEnabled={digestEnabled}
          onDigestEnabledChange={onDigestEnabledChange}
          digestFrequency={digestFrequency}
          onDigestFrequencyChange={onDigestFrequencyChange}
          digestEmail={digestEmail}
          onDigestEmailChange={onDigestEmailChange}
          digestWeekday={digestWeekday}
          onDigestWeekdayChange={onDigestWeekdayChange}
          digestMsg={digestMsg}
          digestErr={digestErr}
          digestPreview={digestPreview}
          smtpReady={digestSmtpReady}
          saveBusy={digestSaveBusy}
          testBusy={digestTestBusy}
          onSave={onSaveDigest}
          onTest={onTestDigest}
        />
      </div>

      <div style={{ ...cardStyle, display: 'grid', gap: 14 }}>
        <div>
          <h2 style={{ margin: '0 0 6px' }}>Finances & profile</h2>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 14, lineHeight: 1.45 }}>
            Enter your numbers below — your score updates automatically as you type.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                padding: '0.5rem 1rem',
                fontWeight: 700,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Tracking month: {month}</div>

        <div id="income-panel" style={{ paddingTop: 4, borderTop: '1px solid rgba(148,163,184,0.15)', display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Income & spending</h3>
          <label style={{ display: 'grid', gap: 6, fontSize: 14, maxWidth: 320 }}>
            Monthly income ($)
            <input
              type="number"
              value={income}
              step="0.01"
              onChange={(e) => onIncomeChange(e.target.value)}
              style={inputStyle}
            />
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
                  <div
                    key={e.category}
                    style={{
                      ...cardSoftStyle,
                      padding: '0.75rem',
                      display: 'grid',
                      gap: 8,
                      alignContent: 'start',
                    }}
                  >
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
      </div>

      <CheckupPanel
        token={token}
        userId={userId}
        month={month}
        isMobile={isMobile}
        isTablet={isTablet}
        cardStyle={cardStyle}
        cardSoftStyle={cardSoftStyle}
        inputStyle={inputStyle}
        btnPrimary={btnPrimary}
        btnNeutral={btnNeutral}
        ledger={{ income, totalExpenses }}
        onResult={onResult}
        showForm
        showDetails
        showHistory={false}
        profile={profile}
        primaryGoal={primaryGoal}
        isPro={isPro}
        onGoPlan={onGoPlan}
        autoSync
        onAutoCheckup={onAutoCheckup}
        dimensionCardLayout
      />
    </div>
  );
}
