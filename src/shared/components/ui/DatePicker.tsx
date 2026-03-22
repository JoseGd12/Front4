import React from "react";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  error?: boolean;
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
  readOnly,
  disabled,
  className = "",
}: DatePickerProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      min={min}
      max={max}
      readOnly={readOnly}
      disabled={disabled || readOnly}
      className={`elegante-input w-full ${error ? "border-red-500 ring-1 ring-red-500" : ""} ${disabled || readOnly ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
      style={{ colorScheme: "dark" }}
    />
  );
}
