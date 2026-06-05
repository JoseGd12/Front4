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

  // Cuando variant=dark: el contador siempre va a la derecha en la misma línea del toolbar
  // (igual que devoluciones: margin-left: auto en el mismo flex row)
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

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 pb-6",
        variant === "dark"
          ? "mb-0"
          : "mb-6 border-b border-gray-dark justify-between",
        className
      )}
      style={variant === "dark" ? {
        marginLeft: "-24px",
        marginRight: "-24px",
        paddingLeft: "22px",
        paddingRight: "22px",
        paddingBottom: "22px",
        borderBottom: "1px solid var(--gray-darker)",
      } : undefined}
    >
      {leftContent}
      {onSearchChange && (
        <div
          className={cn("relative", searchContainerClassName)}
          style={variant === "dark" ? {
            flex: "1",
            minWidth: "200px",
            maxWidth: "380px",
          } : undefined}
        >
          {variant === "dark" ? (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn("elegante-input-dark", searchInputClassName)}
              style={{ width: "100%" }}
            />
          ) : (
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn("elegante-input w-80", searchInputClassName)}
            />
          )}
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
      {/* En variant=dark: contador y rightContent a la derecha */}
      {variant === "dark" && (renderRecords || rightContent) && (
        <div className="flex items-center gap-3 ml-auto">
          {rightContent}
          {renderRecords}
        </div>
      )}
      {/* En variant=default: comportamiento original */}
      {variant !== "dark" && (rightContent || recordsText) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 ml-auto">
          {rightContent}
          {recordsPlacement !== "left" ? renderRecords : null}
        </div>
      )}
    </div>
  );
}
