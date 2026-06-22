import { useEffect, useState } from 'react';

/** Estimated seconds until each AI tool typically finishes. */
export const TOOL_ETA_SECONDS = {
  ai: 50,
  expert: 25,
  comprehensive: 70,
  csv: 8,
  pdf: 15,
  bizpdf: 20,
};

/**
 * Countdown timer while a tool is busy — shows remaining ETA next to buttons.
 * @returns {{ remaining: number, elapsed: number, label: string }}
 */
export function useGenerationTimer(active, etaSeconds = 45) {
  const [remaining, setRemaining] = useState(etaSeconds);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setRemaining(etaSeconds);
      setElapsed(0);
      return undefined;
    }

    const start = Date.now();
    setRemaining(etaSeconds);
    setElapsed(0);

    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      setElapsed(sec);
      setRemaining(Math.max(0, etaSeconds - sec));
    }, 500);

    return () => clearInterval(id);
  }, [active, etaSeconds]);

  const label =
    remaining > 0
      ? `~${remaining}s left`
      : elapsed > etaSeconds
        ? 'Finishing up…'
        : 'Almost done…';

  return { remaining, elapsed, label };
}
