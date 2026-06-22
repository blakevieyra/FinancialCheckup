function clientBaseUrl() {
  return (process.env.CLIENT_URL || 'https://financialcheckup.app').split(',')[0].trim();
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#60a5fa';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function money(n) {
  return Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function buildScoreSummaryEmail({
  username,
  month,
  frequencyLabel,
  overallScore,
  headline,
  income,
  totalExp,
  balance,
  expenseRatio,
  grade,
  dimensions,
  topSpending,
  topAction,
  budgetBullets,
}) {
  const appUrl = clientBaseUrl();
  const logoUrl = `${appUrl}/logo.png`;
  const score = overallScore != null ? Math.round(overallScore) : null;

  const dimRows = (dimensions || [])
    .map(
      (d) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${esc(d.label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:${scoreColor(d.score)};font-weight:700;">${Math.round(d.score)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${esc(d.grade || '—')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569;">${esc(d.summary || '')}</td>
      </tr>`,
    )
    .join('');

  const spendRows = (topSpending || [])
    .map(
      (e) => `<li style="margin-bottom:6px;"><strong>${esc(e.category)}</strong> — ${money(e.amount)}</li>`,
    )
    .join('');

  const bulletRows = (budgetBullets || [])
    .map((b) => `<li style="margin-bottom:6px;color:#334155;">${esc(b)}</li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:Inter,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ff;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 24px;color:#fff;">
            <table width="100%"><tr>
              <td><img src="${esc(logoUrl)}" alt="Financial Checkup" width="44" height="44" style="border-radius:10px;vertical-align:middle;margin-right:12px;display:inline-block;" /><span style="font-size:20px;font-weight:800;vertical-align:middle;">Financial Checkup</span></td>
            </tr></table>
            <div style="margin-top:16px;font-size:13px;opacity:0.9;text-transform:uppercase;letter-spacing:0.08em;">${esc(frequencyLabel)} summary · ${esc(month)}</div>
            <div style="margin-top:8px;font-size:15px;">Hi ${esc(username)},</div>
          </td>
        </tr>
        ${
          score != null
            ? `<tr><td style="padding:24px;text-align:center;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Your score</div>
            <div style="font-size:52px;font-weight:800;color:${scoreColor(score)};line-height:1.1;margin:8px 0;">${score}</div>
            <div style="font-size:14px;color:#475569;max-width:420px;margin:0 auto;line-height:1.5;">${esc(headline || 'Keep updating Finances to track progress.')}</div>
          </td></tr>`
            : ''
        }
        <tr><td style="padding:24px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
            <tr>
              <td style="width:25%;padding:12px;background:#f1f5f9;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:#64748b;text-transform:uppercase;">Income</div>
                <div style="font-size:18px;font-weight:700;margin-top:4px;">${money(income)}</div>
              </td>
              <td style="width:4px;"></td>
              <td style="width:25%;padding:12px;background:#f1f5f9;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:#64748b;text-transform:uppercase;">Expenses</div>
                <div style="font-size:18px;font-weight:700;margin-top:4px;">${money(totalExp)}</div>
              </td>
              <td style="width:4px;"></td>
              <td style="width:25%;padding:12px;background:#f1f5f9;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:#64748b;text-transform:uppercase;">Surplus</div>
                <div style="font-size:18px;font-weight:700;margin-top:4px;color:${balance >= 0 ? '#16a34a' : '#dc2626'};">${money(balance)}</div>
              </td>
              <td style="width:4px;"></td>
              <td style="width:25%;padding:12px;background:#f1f5f9;border-radius:10px;text-align:center;">
                <div style="font-size:11px;color:#64748b;text-transform:uppercase;">Budget</div>
                <div style="font-size:18px;font-weight:700;margin-top:4px;">${esc(grade)}</div>
                <div style="font-size:11px;color:#64748b;">${Number(expenseRatio || 0).toFixed(1)}% spent</div>
              </td>
            </tr>
          </table>

          ${
            dimRows
              ? `<div style="font-size:15px;font-weight:700;margin-bottom:10px;color:#0f172a;">Category scores</div>
          <table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
            <tr style="background:#f8fafc;">
              <th align="left" style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;">Category</th>
              <th style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;">Score</th>
              <th style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;">Grade</th>
              <th align="left" style="padding:10px 12px;font-size:11px;color:#64748b;text-transform:uppercase;">Summary</th>
            </tr>
            ${dimRows}
          </table>`
              : ''
          }

          ${
            topAction
              ? `<div style="padding:16px;background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1px solid #bfdbfe;border-radius:12px;margin-bottom:20px;">
            <div style="font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.05em;">Top priority</div>
            <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:6px;">#1 [${esc(topAction.priority || 'HIGH')}] ${esc(topAction.title)}</div>
            <div style="font-size:14px;color:#475569;margin-top:8px;line-height:1.5;">${esc(topAction.detail || topAction.steps?.[0] || '')}</div>
          </div>`
              : ''
          }

          ${
            spendRows
              ? `<div style="font-size:15px;font-weight:700;margin-bottom:8px;color:#0f172a;">Top spending</div><ul style="margin:0 0 20px;padding-left:20px;">${spendRows}</ul>`
              : ''
          }

          ${
            bulletRows
              ? `<div style="font-size:15px;font-weight:700;margin-bottom:8px;color:#0f172a;">Budget highlights</div><ul style="margin:0;padding-left:20px;">${bulletRows}</ul>`
              : ''
          }

          <div style="text-align:center;margin-top:28px;">
            <a href="${esc(appUrl)}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;">Open Financial Checkup</a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.5;text-align:center;">
          Financial Checkup · Operon E2I · Educational only — not investment, tax, or legal advice.<br/>
          <a href="mailto:info@operone2i.com" style="color:#2563eb;">info@operone2i.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return html;
}

/** Branded HTML wrapper for AI / specialist report emails. */
function buildBrandedReportEmail({
  username,
  reportTitle,
  month,
  score,
  grade,
  income,
  totalExpenses,
  summary,
  report,
  advice,
  nextSteps,
  sources,
  disclaimer,
  ctaHref,
  ctaLabel,
}) {
  const appUrl = clientBaseUrl();
  const logoUrl = `${appUrl}/logo.png`;
  const inc = Number(income) || 0;
  const exp = Number(totalExpenses) || 0;
  const surplus = inc - exp;
  const ieRatio = exp > 0 ? inc / exp : null;
  const expensePct = inc > 0 ? (exp / inc) * 100 : null;
  const healthy = inc > 0 && inc >= exp;
  const ratioColor = healthy ? '#16a34a' : '#dc2626';

  const adviceList = (advice || [])
    .map((a) => `<li style="margin-bottom:8px;color:#334155;line-height:1.5;">${esc(a)}</li>`)
    .join('');
  const stepsList = (nextSteps || [])
    .map((s, i) => `<li style="margin-bottom:8px;color:#334155;line-height:1.5;">${esc(s)}</li>`)
    .join('');
  const sourceList = (sources || [])
    .map(
      (s) =>
        `<li style="margin-bottom:6px;font-size:13px;"><a href="${esc(s.url)}" style="color:#2563eb;">${esc(s.title)}</a>${s.why ? `<span style="color:#64748b;"> — ${esc(s.why)}</span>` : ''}</li>`,
    )
    .join('');

  const metricsBlock =
    inc > 0 || exp > 0
      ? `<table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
          <tr>
            <td style="width:33%;padding:12px;background:#f1f5f9;border-radius:10px;text-align:center;">
              <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Income</div>
              <div style="font-size:17px;font-weight:700;margin-top:4px;color:#0f172a;">${money(inc)}</div>
            </td>
            <td style="width:6px;"></td>
            <td style="width:33%;padding:12px;background:#f1f5f9;border-radius:10px;text-align:center;">
              <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Expenses</div>
              <div style="font-size:17px;font-weight:700;margin-top:4px;color:#0f172a;">${money(exp)}</div>
            </td>
            <td style="width:6px;"></td>
            <td style="width:33%;padding:12px;background:#f1f5f9;border-radius:10px;text-align:center;">
              <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">Income/expense</div>
              <div style="font-size:17px;font-weight:800;margin-top:4px;color:${ratioColor};">${ieRatio != null ? `${ieRatio.toFixed(2)}×` : '—'}</div>
              ${expensePct != null ? `<div style="font-size:11px;color:${ratioColor};margin-top:2px;">${expensePct.toFixed(1)}% of income</div>` : ''}
            </td>
          </tr>
          <tr><td colspan="5" style="height:8px;"></td></tr>
          <tr><td colspan="5" style="text-align:center;font-size:13px;color:${surplus >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;">
            Monthly surplus: ${money(surplus)}
          </td></tr>
        </table>`
      : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:Inter,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ff;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 24px;color:#fff;">
            <table width="100%"><tr>
              <td><img src="${esc(logoUrl)}" alt="Financial Checkup" width="44" height="44" style="border-radius:10px;vertical-align:middle;margin-right:12px;display:inline-block;" /><span style="font-size:20px;font-weight:800;vertical-align:middle;">Financial Checkup</span></td>
            </tr></table>
            <div style="margin-top:14px;font-size:13px;opacity:0.9;text-transform:uppercase;letter-spacing:0.08em;">${esc(reportTitle)}${month ? ` · ${esc(month)}` : ''}</div>
            <div style="margin-top:8px;font-size:15px;">Hi ${esc(username)},</div>
            ${score != null ? `<div style="margin-top:10px;font-size:13px;opacity:0.95;">Category score: <strong>${Math.round(score)}/100</strong>${grade ? ` (${esc(grade)})` : ''}</div>` : ''}
          </td>
        </tr>
        <tr><td style="padding:24px;color:#0f172a;">
          ${metricsBlock}
          ${summary ? `<div style="font-size:16px;font-weight:700;line-height:1.5;margin-bottom:14px;color:#0f172a;">${esc(summary)}</div>` : ''}
          ${report ? `<div style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:18px;">${esc(report)}</div>` : ''}
          ${adviceList ? `<div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#0f172a;">Advice</div><ul style="margin:0 0 18px;padding-left:20px;">${adviceList}</ul>` : ''}
          ${stepsList ? `<div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#0f172a;">Next steps</div><ol style="margin:0 0 18px;padding-left:20px;">${stepsList}</ol>` : ''}
          ${sourceList ? `<div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#0f172a;">Sources</div><ul style="margin:0;padding-left:20px;">${sourceList}</ul>` : ''}
          <div style="text-align:center;margin-top:28px;">
            <a href="${esc(ctaHref || `${appUrl}/?section=tools`)}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;">${esc(ctaLabel || 'Open Financial Checkup')}</a>
          </div>
          <div style="margin-top:20px;font-size:12px;color:#64748b;line-height:1.5;border-top:1px solid #e2e8f0;padding-top:16px;">
            ${esc(disclaimer || 'Educational only — not investment, tax, or legal advice.')}
          </div>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.5;text-align:center;">
          Financial Checkup · Operon E2I LLC · Fresno, CA<br/>
          <a href="mailto:info@operone2i.com" style="color:#2563eb;">info@operone2i.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return html;
}

module.exports = { buildScoreSummaryEmail, buildBrandedReportEmail, clientBaseUrl, esc };
