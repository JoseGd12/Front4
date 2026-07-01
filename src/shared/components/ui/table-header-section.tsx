import { ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { cn } from "./utils";

type TableHeaderFilterOption = {
  value: string;
  label: string;
};

type TableHeaderStatusFilterConfig = {
  value: string;
  onChange: (value: string) => void;
  options: TableHeaderFilterOption[];
  placeholder?: string;
};

type DarkSearchBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchContainerClassName?: string;
  searchInputClassName?: string;
  maxWidth?: string;
};

type TableHeaderSectionProps = {
  leftContent?: ReactNode;
  /** Omitir para ocultar la barra de búsqueda */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: TableHeaderStatusFilterConfig;
  extraFilters?: ReactNode;
  rightContent?: ReactNode;
  recordsText?: ReactNode;
  className?: string;
  searchInputClassName?: string;
  searchContainerClassName?: string;
  recordsClassName?: string;
  recordsPlacement?: "right" | "left";
  /** Variante visual del buscador y filtro.
   * - "default": fondo gris oscuro (#333232) — comportamiento original.
   * - "dark": fondo negro (#111111) — estándar para tablas estandarizadas.
   * @default "default"
   */
  variant?: "default" | "dark";
};

function DarkSearchBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchContainerClassName,
  searchInputClassName,
  maxWidth,
}: DarkSearchBarProps) {
  return (
    <div
      className={cn("relative", searchContainerClassName)}
      style={{ flex: "1", minWidth: "160px", maxWidth: maxWidth ?? "100%" }}
    >
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className={cn("elegante-input-dark", searchInputClassName)}
        style={{ width: "100%" }}
      />
      {searchValue && (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          title="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function TableHeaderSection({
  leftContent,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = "Buscar...",
  statusFilter,
  extraFilters,
  rightContent,
  recordsText,
  className,
  searchInputClassName,
  searchContainerClassName,
  recordsClassName,
  recordsPlacement = "right",
  variant = "default",
}: TableHeaderSectionProps) {
  const inputBaseClass = variant === "dark" ? "elegante-input-dark" : "elegante-input";

  const renderRecords = recordsText ? (
    variant === "dark" ? (
      <div className={cn("std-records-count", recordsClassName)}>
        {recordsText}
      </div>
    ) : (
      <div className={cn("text-sm text-gray-lightest", recordsClassName)}>
        {recordsText}
      </div>
    )
  ) : null;

  const filterWidget = statusFilter ? (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-gray-lightest shrink-0" />
      <Select value={statusFilter.value} onValueChange={statusFilter.onChange}>
        <SelectTrigger className={cn("w-44", inputBaseClass)}>
          <SelectValue placeholder={statusFilter.placeholder || "Estado"} />
        </SelectTrigger>
        <SelectContent className="bg-gray-darkest border-gray-dark">
          {statusFilter.options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-white-primary">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  if (variant === "dark") {
    const wrapperStyle = {
      marginLeft: "-24px",
      marginRight: "-24px",
      paddingLeft: "22px",
      paddingRight: "22px",
      paddingBottom: "22px",
      borderBottom: "1px solid var(--gray-darker)",
    };

    return (
      <div className={cn("pb-0 mb-0", className)} style={wrapperStyle}>

        {/* ══ DESKTOP (sm+): fila única — igual que antes ══ */}
        <div className="hidden sm:flex items-center gap-4">
          {leftContent}
          {onSearchChange && (
            <DarkSearchBar
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
              searchContainerClassName={searchContainerClassName}
              searchInputClassName={searchInputClassName}
              maxWidth="380px"
            />
          )}
          {filterWidget}
          {extraFilters}
          <div className="flex items-center gap-3 ml-auto">
            {rightContent}
            {renderRecords}
          </div>
        </div>

        {/* ══ MOBILE (<sm): layout de 3 filas ══ */}
        <div className="flex sm:hidden flex-col gap-2">
          {/* Fila 1: botones */}
          {leftContent && (
            <div className="flex items-center gap-2 flex-wrap">
              {leftContent}
            </div>
          )}
          {/* Fila 2: buscador ancho completo */}
          {onSearchChange && (
            <DarkSearchBar
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
              searchContainerClassName={searchContainerClassName}
              searchInputClassName={searchInputClassName}
              maxWidth="100%"
            />
          )}
          {/* Fila 3: filtro (izquierda) + contador (derecha) */}
          {(filterWidget || extraFilters || renderRecords) && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {filterWidget}
                {extraFilters}
              </div>
              {renderRecords}
            </div>
          )}
          {/* Fila 4: rightContent en su propia fila en mobile */}
          {rightContent && (
            <div className="overflow-x-auto -mx-[22px] px-[22px]">
              {rightContent}
            </div>
          )}
        </div>

      </div>
    );
  }

  /* ── Variante default: comportamiento original sin cambios ── */
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 pb-6 mb-6 border-b border-gray-dark justify-between",
        className
      )}
    >
      {leftContent}
      {onSearchChange && (
        <div className={cn("relative", searchContainerClassName)}>
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn("elegante-input w-80", searchInputClassName)}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              title="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      {statusFilter && (
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-lightest" />
          <Select value={statusFilter.value} onValueChange={statusFilter.onChange}>
            <SelectTrigger className={cn("w-48", inputBaseClass)}>
              <SelectValue placeholder={statusFilter.placeholder || "Estado"} />
            </SelectTrigger>
            <SelectContent className="bg-gray-darkest border-gray-dark">
              {statusFilter.options.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-white-primary">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {extraFilters}
      {(rightContent || recordsText) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 ml-auto">
          {rightContent}
          {recordsPlacement !== "left" ? renderRecords : null}
        </div>
      )}
    </div>
  );
}
