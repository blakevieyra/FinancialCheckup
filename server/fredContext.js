/**
 * Optional macro context from FRED (St. Louis Fed). Not financial advice.
 * https://fred.stlouisfed.org/docs/api/fred/
 */
async function fetchFredLatestObservation(seriesId) {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;

  const u = new URL('https://api.stlouisfed.org/fred/series/observations');
  u.searchParams.set('series_id', seriesId);
  u.searchParams.set('api_key', key);
  u.searchParams.set('file_type', 'json');
  u.searchParams.set('sort_order', 'desc');
  u.searchParams.set('limit', '1');

  const res = await fetch(u);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const obs = data?.observations?.[0];
  if (!obs || obs.value === '.' || obs.value === undefined) return null;
  return { date: obs.date, value: obs.value, seriesId };
}

/** Human-readable one-liner for the expert prompt */
async function buildMacroContextLine() {
  try {
    const fed = await fetchFredLatestObservation('FEDFUNDS');
    if (!fed) return null;
    return `US effective federal funds rate: ${Number(fed.value).toFixed(2)}% (as of ${fed.date}, FRED series FEDFUNDS). Use only as high-level macro context; do not treat as personal advice.`;
  } catch {
    return null;
  }
}

module.exports = { buildMacroContextLine, fetchFredLatestObservation };
