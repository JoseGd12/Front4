import React, { useState, useRef, useLayoutEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { Search, X, ChevronDown } from "lucide-react";

interface SearchFieldProps<T> {
  placeholder: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  items: T[];
  filterFn: (item: T, query: string) => boolean;
  renderItem: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  error?: string;
  isSelected?: boolean;
  maxResults?: number;
  className?: string;
  shakeClass?: string;
  onFocus?: () => void;
  dropUp?: boolean;
  /** Modo Google Calendar: muestra placeholder como texto hasta que el usuario hace click */
  ghostMode?: boolean;
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
  error,
  maxResults = 50,
  className = "",
  shakeClass = "",
  onFocus,
  dropUp = false,
  ghostMode = false,
}: SearchFieldProps<T>) {
  const [showResults, setShowResults] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  // En ghostMode, solo muestra ghost si nunca se ha activado Y no hay valor
  const showAsGhost = ghostMode && !isActive && !value;

  const filteredResults = value.trim()
    ? items.filter((item) => filterFn(item, value)).slice(0, maxResults)
    : items.slice(0, maxResults);

  const updatePortalPosition = useCallback(() => {
    if (!dropUp || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPortalStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      bottom: window.innerHeight - rect.top + 8,
      zIndex: 9999,
    });
  }, [dropUp]);

  useLayoutEffect(() => {
    if (dropUp && showResults) {
      updatePortalPosition();
    }
  }, [dropUp, showResults, updatePortalPosition]);

  const handleBlur = () => {
    timeoutRef.current = setTimeout(() => {
      setShowResults(false);
      // No volver a ghost una vez activado — el input permanece visible
    }, 120);
  };

  const handleSelect = (item: T) => {
    onSelect(item);
    setShowResults(false);
    // En ghostMode, volver al estado ghost tras seleccionar para permitir agregar más
    if (ghostMode) setIsActive(false);
  };

  const handleGhostClick = () => {
    setIsActive(true);
    setShowResults(true);
    onFocus?.();
    // Focus el input real en el siguiente frame
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const dropdownContent = (
    <>
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
    </>
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Ghost state: placeholder como texto corriente */}
      {showAsGhost ? (
        <button
          type="button"
          onClick={handleGhostClick}
          className="w-full text-left py-1.5 px-3 text-gray-lighter hover:text-gray-lightest hover:bg-gray-dark rounded-md transition-colors duration-150 text-base cursor-pointer"
        >
          {placeholder}
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
          <input
            ref={inputRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => { setShowResults(true); setIsActive(true); onFocus?.(); }}
            onBlur={handleBlur}
            className={`elegante-input pl-11 pr-8 w-full ${error ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                setShowResults(false);
                if (ghostMode) setIsActive(false);
              }}
              title="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none transition-transform duration-200 ${dropUp ? (showResults ? "" : "rotate-180") : (showResults ? "rotate-180" : "")}`} />
          )}

          {showResults && !dropUp && (
            <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
              {dropdownContent}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}

      {showResults && dropUp && ReactDOM.createPortal(
        <div
          className="bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200"
          style={portalStyle}
        >
          {dropdownContent}
        </div>,
        document.body
      )}
    </div>
  );
}
