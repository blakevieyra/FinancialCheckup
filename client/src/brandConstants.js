/** Shared logo sizes — keep app surfaces consistent. */
export const LOGO_PX = {
  landing: 56,
  headerMobile: 52,
  headerDesktop: 64,
};

export function logoStyle(size, { borderRadius = 12 } = {}) {
  return {
    width: size,
    height: size,
    borderRadius,
    flexShrink: 0,
    display: 'block',
  };
}
