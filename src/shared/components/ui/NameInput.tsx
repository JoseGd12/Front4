import React, { useState, useRef, useCallback } from "react";
import { Input } from "./input";

const MIN_LENGTH = 2;   // mínimo 2 letras reales
const MAX_LENGTH = 18;  // máximo 18 caracteres

// Solo signos de puntuación / sin ninguna letra
const ONLY_PUNCTUATION = /^[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]+$/;

interface NameInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  errorMessage?: string;
}

/**
 * Input para campos de nombre/apellido.
 * - Mínimo 2 caracteres con al menos una letra
 * - Máximo 18 caracteres
 * - Alerta temporal si se escribe un número
 * - Alerta "Mantente en el límite" si se excede
 */
export function NameInput({
  value,
  onChange,
  errorMessage,
  className,
  ...props
}: NameInputProps) {
  const [showNumberError, setShowNumberError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    // Filtrar caracteres no permitidos: solo letras (incluyendo acentos y ñ) y espacios
    // Removemos números y caracteres especiales
    const filtered = raw.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
    
    if (raw !== filtered) {
      setShowNumberError(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowNumberError(false), 2500);
    }
    
    onChange(filtered);
  }, [onChange]);

  const length = value?.length ?? 0;
  const isOver = length > MAX_LENGTH;
  const isOnlyPunctuation = length > 0 && ONLY_PUNCTUATION.test(value);
  const isTooShort = length > 0 && length < MIN_LENGTH;
  const isNearLimit = !isOver && length >= MAX_LENGTH - 3;
  const hasError = isOver || isOnlyPunctuation || isTooShort;
  const borderClass = hasError ? 'border-red-500 ring-1 ring-red-500' : '';

  let hintMessage: React.ReactNode = (
    <span className="text-[10px] text-gray-medium">Mínimo {MIN_LENGTH}, máximo {MAX_LENGTH} caracteres</span>
  );

  if (showNumberError) {
    hintMessage = (
      <span className="text-xs text-red-400">
        {errorMessage ?? "Solo se permiten letras y espacios."}
      </span>
    );
  } else if (isOver) {
    hintMessage = (
      <span className="text-xs text-red-400 font-semibold">
        ⚠ Mantente en el límite sugerido (máx. {MAX_LENGTH} caracteres).
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
        Debe tener al menos {MIN_LENGTH} caracteres.
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
        <span className={`text-[10px] tabular-nums ml-2 shrink-0 ${isOver ? 'text-red-400 font-semibold' : isNearLimit ? 'text-orange-primary' : 'text-gray-medium'}`}>
          {length}/{MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}
