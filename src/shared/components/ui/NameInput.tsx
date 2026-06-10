import React, { useState, useRef, useCallback } from "react";
import { Input } from "./input";

const DEFAULT_MIN_LENGTH = 2;
const DEFAULT_MAX_LENGTH = 18;

// Solo signos de puntuación / sin ninguna letra
const ONLY_PUNCTUATION = /^[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]+$/;

interface NameInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string;
  maxLength?: number;
  minLength?: number;
}

/**
 * Input para campos de nombre/apellido.
 * - Mínimo 2 caracteres con al menos una letra (por defecto)
 * - Máximo 18 caracteres (por defecto)
 * - Alerta temporal si se escribe un número
 * - Alerta "Mantente en el límite" si se excede
 */
export function NameInput({
  value,
  onChange,
  errorMessage,
  className,
  maxLength = DEFAULT_MAX_LENGTH,
  minLength = DEFAULT_MIN_LENGTH,
  ...props
}: NameInputProps) {
  const [showNumberError, setShowNumberError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    // Filtrar caracteres no permitidos: solo letras (incluyendo acentos y ñ), números y espacios
    let filtered = raw.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9\s]/g, '');
    
    if (raw !== filtered) {
      setShowNumberError(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowNumberError(false), 2500);
    }

    // Truncar al límite máximo
    if (filtered.length > maxLength) {
      filtered = filtered.slice(0, maxLength);
    }
    
    onChange(filtered);
  }, [onChange, maxLength]);

  const length = value?.length ?? 0;
  const isAtLimit = length === maxLength;
  const isOnlyPunctuation = length > 0 && ONLY_PUNCTUATION.test(value);
  const isTooShort = length > 0 && length < minLength;
  const isNearLimit = !isAtLimit && length >= maxLength - 3;
  const hasError = isOnlyPunctuation || isTooShort;
  const borderClass = hasError ? 'border-red-500 ring-1 ring-red-500' : '';

  let hintMessage: React.ReactNode = (
    <span className="text-[10px] text-gray-medium">Mínimo {minLength}, máximo {maxLength} caracteres</span>
  );

  if (showNumberError) {
    hintMessage = (
      <span className="text-xs text-red-400">
        {errorMessage ?? "Solo se permiten letras, números y espacios."}
      </span>
    );
  } else if (isAtLimit) {
    hintMessage = (
      <span className="text-xs text-orange-primary font-semibold">
        Máximo de {maxLength} caracteres alcanzado.
      </span>
    );
  } else if (isOnlyPunctuation) {
    hintMessage = (
      <span className="text-xs text-red-400">
        No se permiten signos de puntuación en este campo.
      </span>
    );
  } else if (isTooShort) {
    hintMessage = (
      <span className="text-xs text-orange-primary">
        Debe tener al menos {minLength} caracteres.
      </span>
    );
  }

  return (
    <div className="w-full">
      <Input
        value={value}
        onChange={handleChange}
        className={`${className ?? ''} ${borderClass}`}
        {...props}
      />
      <div className="flex items-center justify-between mt-1 min-h-[16px]">
        {hintMessage}
        <span className={`text-[10px] tabular-nums ml-2 shrink-0 ${isAtLimit ? 'text-orange-primary font-semibold' : isNearLimit ? 'text-orange-primary' : 'text-gray-medium'}`}>
          {length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
