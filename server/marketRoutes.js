const router = require('express').Router();

const SYMBOLS = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: '^DJI', label: 'Dow' },
];

let cache = { at: 0, data: null };

async function fetchSymbolChart({ symbol, label }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinancialCheckup/1.0)' },
  });
  if (!res.ok) throw new Error(`Chart ${symbol} HTTP ${res.status}`);

  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Chart ${symbol} empty`);

  const price = Number(meta.regularMarketPrice ?? meta.previousClose ?? 0);
  const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
  const change = price - prev;
  const changePct = prev > 0 ? (change / prev) * 100 : 0;

  if (!Number.isFinite(price) || price <= 0) throw new Error(`Chart ${symbol} invalid price`);

  return {
    symbol,
    label,
    price,
    change,
    changePct,
    up: change >= 0,
  };
}

async function fetchQuotes() {
  const now = Date.now();
  if (cache.data && now - cache.at < 5 * 60 * 1000) return cache.data;

  const settled = await Promise.allSettled(SYMBOLS.map((s) => fetchSymbolChart(s)));
  const items = settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  if (!items.length) {
    const reason = settled.find((r) => r.status === 'rejected')?.reason;
    throw reason || new Error('Market data unavailable');
  }

  cache = { at: now, data: { items, updatedAt: new Date().toISOString() } };
  return cache.data;
}

router.get('/ticker', async (_req, res) => {
  try {
    const data = await fetchQuotes();
    res.json(data);
  } catch (e) {
    console.error('[market]', e.message);
    if (cache.data) {
      return res.json({ ...cache.data, stale: true });
    }
    res.status(200).json({
      items: [],
      updatedAt: new Date().toISOString(),
      unavailable: true,
    });
  }
});

module.exports = router;
