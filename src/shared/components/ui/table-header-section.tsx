import { ReactNode } from "react";
import { Filter, Search, X } from "lucide-react";
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
  searchValue: string;
  onSearchChange: (value: string) => void;
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
};

export function TableHeaderSection({
  leftContent,
  searchValue,
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
}: TableHeaderSectionProps) {
  const renderRecords = recordsText ? (
    <div className={cn("text-sm text-gray-lightest", recordsClassName)}>
      {recordsText}
    </div>
  ) : null;

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-dark", className)}>
      <div className="flex flex-wrap items-center gap-4">
        {leftContent}
        <div className={cn("relative", searchContainerClassName)}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn("elegante-input pl-11 w-80", searchInputClassName)}
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
        {statusFilter && (
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-lightest" />
            <Select value={statusFilter.value} onValueChange={statusFilter.onChange}>
              <SelectTrigger className="w-48 elegante-input">
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
        {recordsPlacement === "left" ? renderRecords : null}
      </div>
      {(rightContent || (recordsPlacement !== "left" && recordsText)) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {rightContent}
          {recordsPlacement !== "left" ? renderRecords : null}
        </div>
      )}
    </div>
  );
}
