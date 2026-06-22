/** Build plain-text body for specialist / AI dimension reports. */
export function formatSpecialistReportText({ title, month, score, grade, aiData, income, totalExpenses }) {
  const inc = Number(income) || 0;
  const exp = Number(totalExpenses) || 0;
  const ieRatio = exp > 0 ? inc / exp : null;
  const lines = [
    `Financial Checkup — ${title}`,
    month ? `Month: ${month}` : null,
    score != null ? `Score: ${Math.round(score)}/100${grade ? ` (${grade})` : ''}` : null,
    ieRatio != null ? `Income/expense ratio: ${ieRatio.toFixed(2)}× (${inc >= exp ? 'surplus' : 'deficit'})` : null,
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
  if (aiData.primaryResources?.length) {
    lines.push('PRIMARY RESOURCES', ...aiData.primaryResources.map((s) => `• ${s.title}: ${s.url}${s.why ? ` — ${s.why}` : ''}`), '');
  }
  if (aiData.dimensionAnalysis?.length) {
    lines.push('DIMENSION ANALYSIS');
    for (const d of aiData.dimensionAnalysis) {
      lines.push(`• ${d.dimension || d.label}: ${d.analysis || d.summary || ''}`);
    }
    lines.push('');
  }
  if (aiData.actionRoadmap?.length) {
    lines.push('ACTION ROADMAP');
    for (const block of aiData.actionRoadmap) {
      lines.push(`${block.timeframe || block.phase}:`);
      for (const a of block.actions || []) lines.push(`  - ${a}`);
    }
    lines.push('');
  }
  if (aiData.riskWatchouts?.length) {
    lines.push('RISK WATCHOUTS', ...aiData.riskWatchouts.map((r) => `• ${r}`), '');
  }
  if (aiData.disclaimer) lines.push(aiData.disclaimer);
  lines.push('', '— Financial Checkup (educational only, not financial advice)');
  return lines.join('\n');
}

export function formatSpecialistReportHtml({ title, month, score, grade, aiData, income, totalExpenses }) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inc = Number(income) || 0;
  const exp = Number(totalExpenses) || 0;
  const ieRatio = exp > 0 ? inc / exp : null;
  const healthy = inc >= exp;
  const ratioColor = healthy ? '#16a34a' : '#dc2626';
  const advice = (aiData.advice || []).map((a) => `<li>${esc(a)}</li>`).join('');
  const steps = (aiData.nextSteps || []).map((s) => `<li>${esc(s)}</li>`).join('');
  const primary = (aiData.primaryResources || [])
    .map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a>${s.why ? ` — ${esc(s.why)}` : ''}</li>`)
    .join('');
  const dimensions = (aiData.dimensionAnalysis || [])
    .map((d) => `<li><strong>${esc(d.dimension || d.label)}</strong> (${Math.round(d.score || 0)}/100): ${esc(d.analysis || d.summary || '')}</li>`)
    .join('');
  const roadmap = (aiData.actionRoadmap || [])
    .map((b) => `<div style="margin-bottom:10px"><strong>${esc(b.timeframe || b.phase)}</strong><ul>${(b.actions || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>`)
    .join('');
  const risks = (aiData.riskWatchouts || []).map((r) => `<li>${esc(r)}</li>`).join('');
  const sources = (aiData.sources || [])
    .map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a>${s.why ? ` — ${esc(s.why)}` : ''}</li>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111;line-height:1.5}
  .header{background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:20px 18px;border-radius:12px;margin-bottom:18px}
  .header h1{font-size:1.25rem;margin:0} .header .sub{font-size:13px;opacity:0.9;margin-top:6px}
  .ratio{display:inline-block;padding:10px 14px;border-radius:10px;font-weight:800;font-size:1.25rem;margin:12px 0}
  h2{font-size:1rem;margin:20px 0 8px} p{margin:8px 0} ul{margin:8px 0;padding-left:20px}
  .disc{font-size:12px;color:#666;margin-top:24px;border-top:1px solid #ddd;padding-top:12px}
</style></head><body>
<div class="header"><h1>Financial Checkup</h1><div class="sub">${esc(title)}${month ? ` · ${esc(month)}` : ''}</div></div>
<div class="meta">${score != null ? `Score: ${Math.round(score)}/100${grade ? ` (${grade})` : ''}` : ''}</div>
${ieRatio != null ? `<div class="ratio" style="background:${healthy ? '#dcfce7' : '#fee2e2'};color:${ratioColor}">Income/expense: ${ieRatio.toFixed(2)}×</div>` : ''}
${aiData.summary ? `<p><strong>${esc(aiData.summary)}</strong></p>` : ''}
${aiData.report ? `<p>${esc(aiData.report)}</p>` : ''}
${advice ? `<h2>Advice</h2><ul>${advice}</ul>` : ''}
${steps ? `<h2>Next steps</h2><ol>${steps}</ol>` : ''}
${dimensions ? `<h2>Dimension analysis</h2><ul>${dimensions}</ul>` : ''}
${roadmap ? `<h2>Action roadmap</h2>${roadmap}` : ''}
${risks ? `<h2>Risk watchouts</h2><ul>${risks}</ul>` : ''}
${primary ? `<h2>Primary resources</h2><ul>${primary}</ul>` : ''}
${sources ? `<h2>Additional sources</h2><ul>${sources}</ul>` : ''}
<div class="disc">${esc(aiData.disclaimer || 'Educational only.')} · Operon E2I LLC · info@operone2i.com</div>
</body></html>`;
}

export function printReport({ title, month, score, grade, aiData, income, totalExpenses }) {
  const html = formatSpecialistReportHtml({ title, month, score, grade, aiData, income, totalExpenses });
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

export function mailtoReport({ email, title, aiData, month, score, grade, income, totalExpenses }) {
  const body = formatSpecialistReportText({ title, month, score, grade, aiData, income, totalExpenses });
  const subject = `Financial Checkup — ${title}`;
  const to = email || '';
  const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

export function aiPlanToReportData(aiPlan) {
  if (!aiPlan) return {};
  return {
    summary: aiPlan.summary,
    report: (aiPlan.specialistPlans || []).map((sp) => `${sp.area}: ${sp.summary || ''}`).join('\n'),
    advice: (aiPlan.insights || []).map((i) => `${i.title}: ${i.message}`),
    nextSteps: (aiPlan.categoryPlans || []).flatMap((c) => (c.optimizedPlan || []).slice(0, 3)),
    sources: (aiPlan.categoryPlans || []).flatMap((c) => c.sources || []).slice(0, 10),
    primaryResources: (aiPlan.categoryPlans || []).flatMap((c) => c.sources || []),
    disclaimer: aiPlan.disclaimer,
  };
}

export function expertToReportData(expertData) {
  const e = expertData?.expert || {};
  return {
    summary: e.headline,
    report: [e.executiveVerdict, e.benchmarkContext].filter(Boolean).join('\n\n'),
    advice: [],
    nextSteps: e.personalizedPriorities || [],
    riskWatchouts: e.riskWatchouts || [],
    sources: [],
    disclaimer: e.disclaimer,
  };
}

export function comprehensiveToReportData(data) {
  if (!data) return {};
  return {
    summary: data.summary,
    report: data.report,
    dimensionAnalysis: data.dimensionAnalysis,
    actionRoadmap: data.actionRoadmap,
    advice: data.advice,
    riskWatchouts: data.riskWatchouts,
    primaryResources: data.primaryResources,
    nextSteps: data.nextSteps,
    sources: data.sources,
    disclaimer: data.disclaimer,
  };
}
