import { useEffect, useState } from 'react';
import { formatInputNumber, parseNumber } from '../../domain/format';

/**
 * Číselné pole, ktoré pri písaní zachová text (napr. "82,"), a hore posiela hotové číslo.
 * `decimal` zobrazí na mobile číselnú klávesnicu s desatinnou čiarkou.
 */
export function NumberField({
  value,
  onChange,
  decimal,
  label,
  placeholder,
  className = '',
  max,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  decimal?: boolean;
  label: string;
  placeholder?: string;
  className?: string;
  max?: number;
}) {
  const [text, setText] = useState(formatInputNumber(value));

  useEffect(() => {
    setText((t) => (parseNumber(t) === value ? t : formatInputNumber(value)));
  }, [value]);

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="next"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value;
        if (!/^[0-9]*[.,]?[0-9]{0,2}$/.test(t) || (!decimal && /[.,]/.test(t))) return;
        const n = parseNumber(t);
        if (n !== null && max !== undefined && n > max) return;
        setText(t);
        onChange(n);
      }}
      className={`t-num rounded-xl bg-raised font-bold text-center text-ink placeholder:font-medium placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-ink/70 ${className}`}
    />
  );
}
