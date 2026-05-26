import React, { useState, useRef } from "react";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  error?: boolean;
  requiredMessage?: string;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value = "",
  onChange,
  min,
  max,
  error,
  requiredMessage,
  readOnly,
  disabled,
  className = "",
}: DatePickerProps) {
  const [showLetterError, setShowLetterError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key.length === 1 &&
      /[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]/.test(e.key) &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      setShowLetterError(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowLetterError(false), 2500);
    }
  };

  return (
    <div className="w-full">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        readOnly={readOnly}
        disabled={disabled || readOnly}
        className={`elegante-input w-full ${error ? "border-red-500 ring-1 ring-red-500" : ""} ${disabled || readOnly ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
        style={{ colorScheme: "dark" }}
      />
      {/* Primero obligatorio, luego numérico */}
      {error && requiredMessage && (
        <p className="text-xs text-red-400 mt-1">{requiredMessage}</p>
      )}
      {showLetterError && (
        <p className="text-xs text-red-400 mt-0.5">
          Este campo solo permite caracteres numéricos.
        </p>
      )}
    </div>
  );
}
