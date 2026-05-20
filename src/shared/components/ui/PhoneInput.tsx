import { useState, useEffect, useRef } from "react";

interface CountryCode {
  flag: string;
  name: string;
  code: string;
  dialCode: string;
  maxLength: number;
}

const COUNTRY_CODES: CountryCode[] = [
  { flag: "🇨🇴", name: "Colombia",       code: "CO", dialCode: "+57",  maxLength: 10 },
  { flag: "🇺🇸", name: "Estados Unidos", code: "US", dialCode: "+1",   maxLength: 10 },
  { flag: "🇲🇽", name: "México",         code: "MX", dialCode: "+52",  maxLength: 10 },
  { flag: "🇪🇸", name: "España",         code: "ES", dialCode: "+34",  maxLength: 9  },
  { flag: "🇦🇷", name: "Argentina",      code: "AR", dialCode: "+54",  maxLength: 10 },
  { flag: "🇻🇪", name: "Venezuela",      code: "VE", dialCode: "+58",  maxLength: 10 },
  { flag: "🇨🇱", name: "Chile",          code: "CL", dialCode: "+56",  maxLength: 9  },
  { flag: "🇵🇪", name: "Perú",           code: "PE", dialCode: "+51",  maxLength: 9  },
  { flag: "🇧🇷", name: "Brasil",         code: "BR", dialCode: "+55",  maxLength: 11 },
  { flag: "🇪🇨", name: "Ecuador",        code: "EC", dialCode: "+593", maxLength: 9  },
  { flag: "🇵🇦", name: "Panamá",         code: "PA", dialCode: "+507", maxLength: 8  },
  { flag: "🇨🇷", name: "Costa Rica",     code: "CR", dialCode: "+506", maxLength: 8  },
  { flag: "🇬🇧", name: "Reino Unido",    code: "GB", dialCode: "+44",  maxLength: 10 },
  { flag: "🇩🇪", name: "Alemania",       code: "DE", dialCode: "+49",  maxLength: 10 },
  { flag: "🇫🇷", name: "Francia",        code: "FR", dialCode: "+33",  maxLength: 9  },
];

const DEFAULT_COUNTRY = COUNTRY_CODES[0]; // Colombia

/** Parses a value like "+57 3001234567" or "3001234567" into { country, localNumber } */
function parseValue(value: string): { country: CountryCode; localNumber: string } {
  if (value && value.startsWith("+")) {
    // Try to match the longest dial code first (e.g. +593 before +5)
    const sorted = [...COUNTRY_CODES].sort(
      (a, b) => b.dialCode.length - a.dialCode.length
    );
    for (const country of sorted) {
      if (value.startsWith(country.dialCode)) {
        const rest = value.slice(country.dialCode.length).replace(/^\s+/, "");
        return { country, localNumber: rest };
      }
    }
  }
  // No prefix found — assume Colombia
  return { country: DEFAULT_COUNTRY, localNumber: value };
}

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder,
  className = "",
  disabled = false,
  error,
}: PhoneInputProps) {
  const { country: parsedCountry, localNumber: parsedNumber } = parseValue(value);

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(parsedCountry);
  const [localNumber, setLocalNumber] = useState<string>(parsedNumber);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state when the external value changes
  useEffect(() => {
    const { country, localNumber: num } = parseValue(value);
    setSelectedCountry(country);
    setLocalNumber(num);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    // Trim number to new country's max length
    const trimmed = localNumber.slice(0, country.maxLength);
    setLocalNumber(trimmed);
    onChange(trimmed ? `${country.dialCode} ${trimmed}` : "");
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, selectedCountry.maxLength);
    setLocalNumber(digits);
    onChange(digits ? `${selectedCountry.dialCode} ${digits}` : "");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows, home, end
    const allowed = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Home", "End",
    ];
    if (allowed.includes(e.key)) return;
    // Allow Ctrl/Cmd shortcuts (copy, paste, select all, etc.)
    if (e.ctrlKey || e.metaKey) return;
    // Block anything that is not a digit
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`elegante-input flex items-center gap-0 p-0 overflow-hidden ${
          error ? "border-red-500" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {/* Country selector button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-2 h-full border-r border-gray-dark bg-transparent hover:bg-gray-dark/40 transition-colors shrink-0 text-sm font-medium text-white-primary focus:outline-none"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-gray-lighter text-xs">{selectedCountry.dialCode}</span>
          <svg
            className={`w-3 h-3 text-gray-lighter transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Number input */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localNumber}
          onChange={handleNumberChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? `Ej: ${"0".repeat(selectedCountry.maxLength)}`}
          disabled={disabled}
          maxLength={selectedCountry.maxLength}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-white-primary placeholder:text-gray-medium focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-1 w-56 rounded-xl bg-gray-darkest border border-gray-dark shadow-2xl z-[9999]" style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {COUNTRY_CODES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => handleCountrySelect(country)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-gray-dark transition-colors ${
                selectedCountry.code === country.code
                  ? "bg-gray-dark text-orange-primary"
                  : "text-white-primary"
              }`}
            >
              <span className="text-sm shrink-0">{country.flag}</span>
              <span className="flex-1 truncate">{country.name}</span>
              <span className="text-gray-lighter text-xs shrink-0">{country.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
