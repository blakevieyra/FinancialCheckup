import { useEffect, useState } from 'react';
import * as api from './api';

export default function MarketTicker({ isMobile }) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getMarketTicker()
      .then((data) => {
        if (!cancelled) setItems(data.items || []);
      })
      .catch(() => {
        if (!cancelled) setErr(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (err || !items.length) return null;

  return (
    <div
      className="fc-market-ticker"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? 6 : 10,
        alignItems: 'center',
        fontSize: isMobile ? 11 : 12,
        maxWidth: isMobile ? '100%' : 420,
      }}
    >
      {items.map((q) => (
        <div
          key={q.symbol}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: q.up ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${q.up ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
          }}
        >
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{q.label}</span>
          <span style={{ fontWeight: 800, color: q.up ? '#86efac' : '#fca5a5' }}>
            {q.changePct >= 0 ? '+' : ''}{Number(q.changePct).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
