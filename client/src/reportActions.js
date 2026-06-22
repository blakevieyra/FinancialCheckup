/** Build plain-text body for specialist / AI dimension reports. */
export function formatSpecialistReportText({ title, month, score, grade, aiData }) {
  const lines = [
    `Financial Checkup — ${title}`,
    month ? `Month: ${month}` : null,
    score != null ? `Score: ${Math.round(score)}/100${grade ? ` (${grade})` : ''}` : null,
    '',
    aiData.summary || '',
    '',
    aiData.report || '',
    '',
  ].filter((x) => x !== null);

  if (aiData.advice?.length) {
    lines.push('ADVICE', ...aiData.advice.map((a) => `• ${a}`), '');
  }
  if (aiData.nextSteps?.length) {
    lines.push('NEXT STEPS', ...aiData.nextSteps.map((s, i) => `${i + 1}. ${s}`), '');
  }
  if (aiData.sources?.length) {
    lines.push('SOURCES', ...aiData.sources.map((s) => `• ${s.title}: ${s.url}${s.why ? ` — ${s.why}` : ''}`), '');
  }
  if (aiData.disclaimer) lines.push(aiData.disclaimer);
  lines.push('', '— Financial Checkup (educational only, not financial advice)');
  return lines.join('\n');
}

export function formatSpecialistReportHtml({ title, month, score, grade, aiData }) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const advice = (aiData.advice || []).map((a) => `<li>${esc(a)}</li>`).join('');
  const steps = (aiData.nextSteps || []).map((s) => `<li>${esc(s)}</li>`).join('');
  const sources = (aiData.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a>${s.why ? ` — ${esc(s.why)}` : ''}</li>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111;line-height:1.5}
  h1{font-size:1.35rem;margin:0 0 4px} .meta{color:#555;font-size:14px;margin-bottom:16px}
  h2{font-size:1rem;margin:20px 0 8px} p{margin:8px 0} ul{margin:8px 0;padding-left:20px}
  .disc{font-size:12px;color:#666;margin-top:24px;border-top:1px solid #ddd;padding-top:12px}
</style></head><body>
<h1>${esc(title)}</h1>
<div class="meta">${month ? `Month: ${esc(month)}` : ''}${score != null ? ` · Score: ${Math.round(score)}/100${grade ? ` (${grade})` : ''}` : ''}</div>
${aiData.summary ? `<p><strong>${esc(aiData.summary)}</strong></p>` : ''}
${aiData.report ? `<p>${esc(aiData.report)}</p>` : ''}
${advice ? `<h2>Advice</h2><ul>${advice}</ul>` : ''}
${steps ? `<h2>Next steps</h2><ol>${steps}</ol>` : ''}
${sources ? `<h2>Sources</h2><ul>${sources}</ul>` : ''}
<div class="disc">${esc(aiData.disclaimer || 'Educational only.')}</div>
</body></html>`;
}

export function printReport({ title, month, score, grade, aiData }) {
  const html = formatSpecialistReportHtml({ title, month, score, grade, aiData });
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    window.alert('Allow pop-ups to print this report, or use Email to yourself.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.onload = () => {
    w.print();
  };
}

export function mailtoReport({ email, title, aiData, month, score, grade }) {
  const body = formatSpecialistReportText({ title, month, score, grade, aiData });
  const subject = `Financial Checkup — ${title}`;
  const to = email || '';
  const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}
