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

module.exports = { buildScoreSummaryEmail, clientBaseUrl };
