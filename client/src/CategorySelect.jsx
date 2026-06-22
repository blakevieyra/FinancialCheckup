import { useEffect, useMemo, useState } from 'react';
import { CUSTOM_OPTION_VALUE } from './categoryOptions';

/**
 * Dropdown of common categories with optional custom text entry.
 * `value` is the stored string (preset label or custom text).
 * Pass `optionGroups` for grouped expenses, or flat `options` for debts/types.
 */
export default function CategorySelect({
  options,
  optionGroups,
  value,
  onChange,
  inputStyle,
  placeholder = 'Choose a category',
  customPlaceholder = 'Enter custom name',
  disabled = false,
  id,
}) {
  const flatOptions = useMemo(() => {
    if (optionGroups?.length) {
      return optionGroups.flatMap((g) => g.items);
    }
    return (options || []).map((o) => (typeof o === 'string' ? o : o.label));
  }, [options, optionGroups]);

  const displayValue = LEGACY_BLANK.has(value) ? '' : (value || '');
  const isCustom = displayValue && !flatOptions.includes(displayValue);
  const [customMode, setCustomMode] = useState(isCustom);

  useEffect(() => {
    setCustomMode(isCustom);
  }, [isCustom, displayValue]);

  const selectValue = customMode || isCustom ? CUSTOM_OPTION_VALUE : displayValue;

  function handleSelect(e) {
    const picked = e.target.value;
    if (picked === CUSTOM_OPTION_VALUE) {
      setCustomMode(true);
      if (!isCustom) onChange('');
      return;
    }
    setCustomMode(false);
    onChange(picked);
  }

  const selectStyle = {
    ...inputStyle,
    width: '100%',
    cursor: disabled ? 'not-allowed' : 'pointer',
    paddingRight: '2rem',
  };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <select
        id={id}
        value={selectValue}
        onChange={handleSelect}
        disabled={disabled}
        className="fc-category-select"
        style={selectStyle}
        aria-label={placeholder}
      >
        <option value="">{placeholder}</option>
        {optionGroups?.length
          ? optionGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </optgroup>
            ))
          : flatOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
        <option value={CUSTOM_OPTION_VALUE}>Custom…</option>
      </select>
      {selectValue === CUSTOM_OPTION_VALUE ? (
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={customPlaceholder}
          disabled={disabled}
          style={{ ...inputStyle, width: '100%' }}
        />
      ) : null}
    </div>
  );
}

const LEGACY_BLANK = new Set(['', 'Other loan', 'Other']);
