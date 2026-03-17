import React, { useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "./input";

interface SearchFieldProps<T> {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  items: T[];
  filterFn: (item: T, query: string) => boolean;
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  error?: boolean;
  errorMessage?: string;
  maxResults?: number;
  className?: string;
  shakeClass?: string;
  onFocus?: () => void;
}

export function SearchField<T>({
  placeholder,
  value,
  onChange,
  onClear,
  items,
  filterFn,
  renderItem,
  onSelect,
  error = false,
  errorMessage,
  maxResults = 50,
  className = "",
  shakeClass = "",
  onFocus,
}: SearchFieldProps<T>) {
  const [showResults, setShowResults] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredResults = value.trim()
    ? items.filter((item) => filterFn(item, value)).slice(0, maxResults)
    : [];

  const handleBlur = () => {
    timeoutRef.current = setTimeout(() => setShowResults(false), 120);
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    setShowResults(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => { setShowResults(true); onFocus?.(); }}
          onBlur={handleBlur}
          className={`elegante-input pl-11 w-full ${error ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setShowResults(false);
            }}
            title="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {showResults && value.trim() !== "" && (
          <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
            {filteredResults.length === 0 ? (
              <div className="p-4 text-center text-gray-lightest italic">
                Sin resultados.
              </div>
            ) : (
              filteredResults.map((item, idx) => (
                <div
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer group"
                >
                  {renderItem(item)}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error && errorMessage && (
        <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
