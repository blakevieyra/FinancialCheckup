/** Shared visual tokens — professional, calm, everyday-friendly dark theme. */

export const FC_COLORS = {
  bg: '#0f172a',
  bgElevated: '#1e293b',
  surface: 'rgba(30, 41, 59, 0.82)',
  surfaceSoft: 'rgba(30, 41, 59, 0.55)',
  border: 'rgba(148, 163, 184, 0.16)',
  borderStrong: 'rgba(148, 163, 184, 0.28)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  accent: '#3b82f6',
  accentSoft: 'rgba(59, 130, 246, 0.12)',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  inputBg: '#1e293b',
};

/** @deprecated use FC_COLORS — kept for gradual migration */
export const FC_THEME = {
  bg: FC_COLORS.bg,
  bgGradient: `radial-gradient(1200px 520px at 8% -8%, rgba(59, 130, 246, 0.14), transparent 58%), radial-gradient(900px 480px at 92% 0%, rgba(52, 211, 153, 0.08), transparent 52%), linear-gradient(180deg, #0f172a 0%, #111827 100%)`,
  text: FC_COLORS.text,
  textMuted: FC_COLORS.textMuted,
  card: FC_COLORS.surface,
  cardSoft: FC_COLORS.surfaceSoft,
  border: FC_COLORS.borderStrong,
  borderSoft: FC_COLORS.border,
  inputBg: FC_COLORS.inputBg,
  accent: FC_COLORS.accent,
  accentGreen: FC_COLORS.success,
};

export function scoreBarColor(score) {
  const s = Number(score) || 0;
  if (s >= 80) return '#34d399';
  if (s >= 65) return '#3b82f6';
  if (s >= 50) return '#fbbf24';
  return '#f87171';
}

export function scoreHeadline(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'Excellent — keep building momentum';
  if (s >= 65) return 'Good — a few areas to improve';
  if (s >= 50) return 'Fair — focus on top priorities';
  return 'Needs attention — start with security steps';
}

export function buildShellStyle({ isMobile, isDesktop }) {
  return {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    minHeight: '100vh',
    boxSizing: 'border-box',
    width: '100%',
    padding: isMobile
      ? `max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left))`
      : isDesktop
        ? `1rem max(1.75rem, env(safe-area-inset-right)) 1.5rem max(1.75rem, env(safe-area-inset-left))`
        : `1.25rem max(1.25rem, env(safe-area-inset-right)) 1.5rem max(1.25rem, env(safe-area-inset-left))`,
    color: FC_COLORS.text,
    background: FC_THEME.bgGradient,
  };
}

export function buildCardStyles(isMobile) {
  const cardStyle = {
    border: `1px solid ${FC_COLORS.border}`,
    borderRadius: 16,
    padding: isMobile ? '0.85rem 0.95rem' : '1rem 1.15rem',
    background: FC_COLORS.surface,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(2, 6, 23, 0.22)',
  };
  const cardSoftStyle = {
    border: `1px solid ${FC_COLORS.border}`,
    borderRadius: 14,
    background: FC_COLORS.surfaceSoft,
    backdropFilter: 'blur(10px)',
  };
  const inputStyle = {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${FC_COLORS.borderStrong}`,
    background: FC_COLORS.inputBg,
    color: FC_COLORS.text,
  };
  const btnBase = {
    padding: isMobile ? '0.65rem 1rem' : '0.56rem 1rem',
    minHeight: isMobile ? 44 : undefined,
    cursor: 'pointer',
    color: FC_COLORS.text,
    borderRadius: 10,
    border: `1px solid ${FC_COLORS.borderStrong}`,
    transition: 'all 140ms ease',
    fontWeight: 600,
    fontSize: 14,
  };
  return {
    cardStyle,
    cardSoftStyle,
    inputStyle,
    btnPrimary: {
      ...btnBase,
      background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      border: 'none',
      boxShadow: '0 2px 12px rgba(37, 99, 235, 0.35)',
    },
    btnNeutral: { ...btnBase, background: FC_COLORS.bgElevated },
    btnDanger: { ...btnBase, background: 'linear-gradient(135deg, #991b1b, #b91c1c)', border: 'none' },
  };
}
