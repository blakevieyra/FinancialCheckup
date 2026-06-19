/** Shared visual tokens — slightly lighter dashboard palette */

export const FC_THEME = {
  bg: '#1a2744',
  bgGradient:
    'radial-gradient(1600px 700px at 10% -5%, rgba(77,166,255,0.2), transparent 55%), radial-gradient(1200px 550px at 95% 0%, rgba(52,211,153,0.14), transparent 50%), #1a2744',
  text: '#f8fafc',
  textMuted: 'rgba(226,232,240,0.82)',
  card: 'rgba(42, 58, 92, 0.78)',
  cardSoft: 'rgba(38, 52, 84, 0.62)',
  border: 'rgba(148,163,184,0.38)',
  borderSoft: 'rgba(148,163,184,0.26)',
  inputBg: '#243352',
  accent: '#4da6ff',
  accentGreen: '#34d399',
};

export function scoreBarColor(score) {
  const s = Number(score) || 0;
  if (s >= 80) return '#34d399';
  if (s >= 65) return '#4da6ff';
  if (s >= 50) return '#fbbf24';
  return '#f87171';
}

export function scoreHeadline(score) {
  const s = Number(score) || 0;
  if (s >= 80) return '◆ Excellent — keep building momentum';
  if (s >= 65) return '◆ Good — a few areas to improve';
  if (s >= 50) return '◆ Fair — focus on top priorities';
  return '◆ Needs attention — start with security steps';
}
