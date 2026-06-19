const router = require('express').Router();

const SYMBOLS = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: '^DJI', label: 'Dow' },
];

let cache = { at: 0, data: null };

async function fetchQuotes() {
  const now = Date.now();
  if (cache.data && now - cache.at < 5 * 60 * 1000) return cache.data;

  const symbols = SYMBOLS.map((s) => s.symbol).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FinancialCheckup/1.0' },
  });
  if (!res.ok) throw new Error('Market data unavailable');

  const json = await res.json();
  const quotes = json?.quoteResponse?.result || [];
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  const items = SYMBOLS.map(({ symbol, label }) => {
    const q = bySymbol.get(symbol) || {};
    const price = Number(q.regularMarketPrice ?? q.postMarketPrice ?? 0);
    const change = Number(q.regularMarketChange ?? 0);
    const changePct = Number(q.regularMarketChangePercent ?? 0);
    return {
      symbol,
      label,
      price,
      change,
      changePct,
      up: change >= 0,
    };
  }).filter((x) => x.price > 0);

  cache = { at: now, data: { items, updatedAt: new Date().toISOString() } };
  return cache.data;
}

router.get('/ticker', async (_req, res) => {
  try {
    const data = await fetchQuotes();
    res.json(data);
  } catch (e) {
    console.error('[market]', e.message);
    res.status(502).json({ error: 'Could not load market data.', items: [] });
  }
});

module.exports = router;
