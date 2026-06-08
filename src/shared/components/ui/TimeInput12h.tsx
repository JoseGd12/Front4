import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface TimeInput12hProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: number;
  options: number[];
  onChange: (val: number) => void;
  disabled?: boolean;
  format?: (n: number) => string;
}

const ITEM_HEIGHT = 32; // px — py-1.5 (12px) + text-sm line-height (~20px)
const VISIBLE_ITEMS = 5;

function CustomSelect({ value, options, onChange, disabled, format }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 60 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const openDropdown = () => {
    if (disabled) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !wrapperRef.current) return;
    const list = wrapperRef.current;
    const idx = options.indexOf(value);
    if (idx !== -1) {
      list.scrollTop = Math.max(0, idx * ITEM_HEIGHT - ITEM_HEIGHT * 2);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (wrapperRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const label = format ? format(value) : String(value).padStart(2, "0");

  const dropdown = open ? createPortal(
    <div
      ref={wrapperRef}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: dropPos.top,
        left: dropPos.left,
        width: dropPos.width,
        maxHeight: ITEM_HEIGHT * VISIBLE_ITEMS,
        overflowY: "auto",
        zIndex: 300000,
        pointerEvents: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--gray-dark) transparent",
      } as React.CSSProperties}
      className="bg-gray-darker border border-gray-dark rounded-md shadow-lg"
    >
      {options.map(opt => {
        const lbl = format ? format(opt) : String(opt).padStart(2, "0");
        const selected = opt === value;
        return (
          <div
            key={opt}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => { onChange(opt); setOpen(false); }}
            className={`
              flex items-center justify-center text-sm cursor-pointer tabular-nums
              transition-colors select-none
              ${selected
                ? "bg-orange-primary/20 text-orange-primary font-semibold"
                : "text-white-primary hover:bg-gray-dark"}
            `}
          >
            {lbl}
          </div>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ width: "60px" }}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className={`
          w-full h-9 flex items-center justify-between gap-1 px-2
          bg-gray-darker border rounded-md text-sm text-white-primary
          transition-colors focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? "border-orange-primary" : "border-gray-dark hover:border-gray-lighter"}
        `}
      >
        <span className="flex-1 text-center tabular-nums">{label}</span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 text-gray-lighter transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {dropdown}
    </div>
  );
}

/**
 * Input de hora en formato 12h (AM/PM).
 * value / onChange usan "HH:mm" (24h) para compatibilidad con el backend.
 */
export function TimeInput12h({ value, onChange, className = "", disabled = false }: TimeInput12hProps) {
  const { hour12, minute, ampm } = useMemo(() => {
    const parts = (value || "").split(":").map(Number);
    const h24 = !isNaN(parts[0]) ? parts[0] : 9;
    const min = !isNaN(parts[1]) ? parts[1] : 0;
    const ap = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    return { hour12: h12, minute: min, ampm: ap };
  }, [value]);

  const emit = (h12: number, min: number, ap: string) => {
    let h24 = h12 % 12;
    if (ap === "PM") h24 += 12;
    onChange(`${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <CustomSelect
        value={hour12}
        options={hours}
        onChange={h => emit(h, minute, ampm)}
        disabled={disabled}
      />
      <span className="text-white-primary font-bold text-base">:</span>
      <CustomSelect
        value={minute}
        options={minutes}
        onChange={m => emit(hour12, m, ampm)}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => !disabled && emit(hour12, minute, ampm === "AM" ? "PM" : "AM")}
        disabled={disabled}
        className="bg-gray-darker border border-gray-dark rounded-md text-orange-primary text-sm font-semibold px-3 h-9 hover:bg-orange-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {ampm}
      </button>
    </div>
  );
}
