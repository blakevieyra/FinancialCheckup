import { useEffect, useState } from 'react';
import { scoreBarColor, scoreHeadline } from './theme';

function ProgressBar({ score, height = 8 }) {
  const color = scoreBarColor(score);
  return (
    <div
      style={{
        height,
        borderRadius: 99,
        background: 'rgba(15,23,42,0.45)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, score))}%`,
          height: '100%',
          borderRadius: 99,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 12px ${color}55`,
          transition: 'width 500ms ease',
        }}
      />
    </div>
  );
}

function BarRow({ dim, selected, onSelect, large }) {
  const color = scoreBarColor(dim.score);
  return (
    <button
      type="button"
      onClick={() => onSelect(dim.key)}
      style={{
        display: 'grid',
        gridTemplateColumns: large ? 'minmax(88px, 110px) 1fr 44px' : 'minmax(72px, 96px) 1fr 36px',
        gap: large ? 14 : 10,
        alignItems: 'center',
        width: '100%',
        padding: large ? '10px 12px' : '8px 10px',
        borderRadius: 12,
        border: selected ? `2px solid ${color}` : '1px solid transparent',
        background: selected ? `${color}12` : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        transition: 'background 200ms ease, border-color 200ms ease',
      }}
    >
      <span style={{ fontSize: large ? 14 : 13, opacity: 0.88, fontWeight: 500 }}>{dim.label}</span>
      <ProgressBar score={dim.score} height={large ? 10 : 8} />
      <span style={{ fontWeight: 700, fontSize: large ? 15 : 14, textAlign: 'right', color }}>{Math.round(dim.score)}</span>
    </button>
  );
}

export default function ScoreBreakdownShowcase({
  overallScore,
  headline,
  dimensions = [],
  badge = 'Your financial score',
  live = true,
  large = false,
  isMobile,
  renderDetail,
  initialSelectedKey,
}) {
  const [selectedKey, setSelectedKey] = useState(initialSelectedKey || dimensions[0]?.key || null);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (dimensions.length && !dimensions.find((d) => d.key === selectedKey)) {
      setSelectedKey(dimensions[0].key);
    }
  }, [dimensions, selectedKey]);

  const selected = dimensions.find((d) => d.key === selectedKey);
  const displayHeadline = headline || scoreHeadline(overallScore);
  const scoreColor = scoreBarColor(overallScore);

  function selectKey(key) {
    if (key === selectedKey) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey(key);
    setFadeKey((k) => k + 1);
  }

  return (
    <div
      className="fc-score-showcase"
      style={{
        borderRadius: 18,
        border: '1px solid rgba(77,166,255,0.22)',
        background: 'linear-gradient(155deg, rgba(36,50,82,0.92), rgba(28,40,68,0.88))',
        padding: large ? (isMobile ? '1.25rem' : '1.75rem 2rem') : (isMobile ? '1rem' : '1.35rem 1.5rem'),
        boxShadow: '0 20px 50px rgba(8,15,35,0.35)',
        display: 'grid',
        gap: large ? 22 : 16,
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: large ? 'center' : 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px 5px 8px',
            borderRadius: 99,
            background: 'rgba(77,166,255,0.1)',
            border: '1px solid rgba(77,166,255,0.25)',
            fontSize: 12,
            fontWeight: 600,
            color: '#93c5fd',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 99, background: '#4da6ff' }} />
          {badge}
        </span>
        {live ? (
          <span style={{ fontSize: 11, opacity: 0.65, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
            live
          </span>
        ) : null}
      </div>

      <div style={{ textAlign: large || isMobile ? 'center' : 'left' }}>
        <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Your financial score
        </div>
        <div
          style={{
            fontSize: large ? (isMobile ? 64 : 88) : (isMobile ? 48 : 72),
            fontWeight: 800,
            lineHeight: 1,
            marginTop: 8,
            color: scoreColor,
            letterSpacing: '-0.03em',
          }}
        >
          {Math.round(overallScore)}
        </div>
        <div
          style={{
            fontSize: large ? 15 : 14,
            marginTop: 12,
            color: scoreColor,
            opacity: 0.95,
            lineHeight: 1.45,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {displayHeadline}
        </div>
      </div>

      {dimensions.length ? (
        <div style={{ display: 'grid', gap: 4, width: '100%' }}>
          {dimensions.map((d) => (
            <BarRow
              key={d.key}
              dim={d}
              selected={selectedKey === d.key}
              onSelect={selectKey}
              large={large}
            />
          ))}
        </div>
      ) : null}

      {selected && renderDetail ? (
        <div key={fadeKey} className="fc-fade-in" style={{ borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: 14 }}>
          {renderDetail(selected)}
        </div>
      ) : null}
    </div>
  );
}
