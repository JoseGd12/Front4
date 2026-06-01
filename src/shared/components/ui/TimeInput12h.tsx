import { useMemo } from "react";

interface TimeInput12hProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Input de hora en formato 12h (AM/PM).
 * value / onChange usan "HH:mm" (24h) para compatibilidad con el backend.
 */
export function TimeInput12h({ value, onChange, className = '', disabled = false }: TimeInput12hProps) {
  const { hour12, minute, ampm } = useMemo(() => {
    const parts = (value || '').split(':').map(Number);
    const h24 = !isNaN(parts[0]) ? parts[0] : 9;
    const min = !isNaN(parts[1]) ? parts[1] : 0;
    const ap = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return { hour12: h12, minute: min, ampm: ap };
  }, [value]);

  const emit = (h12: number, min: number, ap: string) => {
    let h24 = h12 % 12;
    if (ap === 'PM') h24 += 12;
    onChange(`${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  };

  const selectClass = `bg-gray-darker border border-gray-dark rounded-md text-white-primary text-sm px-2 h-9 text-center focus:outline-none focus:border-orange-primary disabled:opacity-50 disabled:cursor-not-allowed`;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <select
        value={hour12}
        onChange={e => emit(Number(e.target.value), minute, ampm)}
        disabled={disabled}
        className={selectClass}
        style={{ width: '60px' }}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      <span className="text-white-primary font-bold text-base">:</span>
      <select
        value={minute}
        onChange={e => emit(hour12, Number(e.target.value), ampm)}
        disabled={disabled}
        className={selectClass}
        style={{ width: '60px' }}
      >
        {Array.from({ length: 60 }, (_, i) => i).map(m => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => !disabled && emit(hour12, minute, ampm === 'AM' ? 'PM' : 'AM')}
        disabled={disabled}
        className="bg-gray-darker border border-gray-dark rounded-md text-orange-primary text-sm font-semibold px-3 h-9 hover:bg-orange-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {ampm}
      </button>
    </div>
  );
}
