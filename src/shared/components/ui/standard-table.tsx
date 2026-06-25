/**
 * StandardTable — Sistema de diseño estandarizado para tablas
 *
 * Proporciona un componente principal con API de props para tablas simples,
 * subcomponentes tipados para tablas complejas (filas expandibles, agrupadas),
 * y una función utilitaria `resolveStatusVariant` para mapear strings de estado
 * a variantes visuales desaturadas.
 *
 * Fuente: DM Sans (Google Fonts)
 * Tokens de color: --gray-lightest, --gray-darker, --black-secondary, --status-green, --status-red
 *
 * @see src/styles/globals.css — clases .std-table, .std-thead, .std-tbody, .std-td, .std-badge-*
 */

import React from "react";
import { cn } from "./utils";
import { TableEmptyStateRow } from "./table-empty-state-row";
import { TableLoadingStateRow } from "./table-loading-state-row";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Variante visual de un badge de estado */
export type StatusVariant = "positive" | "negative" | "neutral";

/** Definición de una columna para la API de props de StandardTable */
export type ColumnDef<T> = {
  /** Clave del campo en el objeto de datos, o string arbitrario para columnas calculadas */
  key: keyof T | string;
  /** Texto del encabezado de columna */
  header: string;
  /** Alineación de la celda. Default: "center". Primera columna: "left" */
  align?: "left" | "center" | "right";
  /** Función de renderizado personalizado. Si no se provee, se usa el valor directo */
  render?: (value: unknown, row: T) => React.ReactNode;
  /** Si true, esta columna usa std-td-primary (color blanco, alineación izquierda) */
  primary?: boolean;
};

// ─── Constantes de estado ─────────────────────────────────────────────────────

/** Strings de estado que mapean a la variante "positive" (verde desaturado) */
export const POSITIVE_STATUSES = [
  "completada",
  "completado",
  "activo",
  "activa",
  "pagado",
  "pagada",
  "disponible",
  "aprobado",
  "aprobada",
] as const;

/** Strings de estado que mapean a la variante "negative" (rojo desaturado) */
export const NEGATIVE_STATUSES = [
  "anulada",
  "anulado",
  "cancelada",
  "cancelado",
  "inactivo",
  "inactiva",
  "rechazado",
  "rechazada",
] as const;

// ─── Función utilitaria ───────────────────────────────────────────────────────

/**
 * Mapea un string de estado a una variante visual de badge.
 *
 * - "positive" → verde desaturado (#7aab8a) — Completada, Activo, Pagado, Disponible, Aprobado
 * - "negative" → rojo desaturado (#b07070) — Anulada, Cancelada, Inactivo, Rechazado
 * - "neutral"  → gris oscuro (#4a4a4a) — Pendiente, En proceso, o cualquier estado desconocido
 *
 * La función normaliza el input con `.toLowerCase().trim()` antes de comparar,
 * por lo que es insensible a mayúsculas/minúsculas y espacios.
 *
 * @param status - String de estado del registro
 * @returns StatusVariant
 *
 * @example
 * resolveStatusVariant("Completada") // → "positive"
 * resolveStatusVariant("ANULADA")    // → "negative"
 * resolveStatusVariant("Pendiente")  // → "neutral"
 */
export function resolveStatusVariant(status: string): StatusVariant {
  const normalized = String(status ?? "")
    .toLowerCase()
    .trim();
  if ((POSITIVE_STATUSES as readonly string[]).includes(normalized)) return "positive";
  if ((NEGATIVE_STATUSES as readonly string[]).includes(normalized)) return "negative";
  return "neutral";
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

/** Props comunes para subcomponentes de tabla */
type BaseProps = {
  children?: React.ReactNode;
  className?: string;
};

/**
 * Encabezado de tabla estándar (`<thead>`).
 * Aplica la clase `std-thead` con estilos de tipografía, color y espaciado.
 */
function Header({ children, className }: BaseProps) {
  return (
    <thead className={cn("std-thead", className)}>
      {children}
    </thead>
  );
}

/**
 * Celda de encabezado estándar (`<th>`).
 * Hereda los estilos de `.std-thead th` definidos en globals.css.
 *
 * @param align - Alineación del texto. Default: "center". Primera columna: "left" (automático via CSS :first-child)
 */
function HeadCell({
  children,
  className,
  align,
  ...props
}: BaseProps & { align?: "left" | "center" | "right" } & React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(className)}
      style={align ? { textAlign: align } : undefined}
      {...props}
    >
      {children}
    </th>
  );
}

/**
 * Cuerpo de tabla estándar (`<tbody>`).
 * Aplica la clase `std-tbody` con separadores y hover.
 */
function Body({ children, className }: BaseProps) {
  return (
    <tbody className={cn("std-tbody", className)}>
      {children}
    </tbody>
  );
}

/**
 * Fila de tabla estándar (`<tr>`).
 * Los estilos de border-bottom y hover se aplican via `.std-tbody tr` en globals.css.
 */
function Row({
  children,
  className,
  ...props
}: BaseProps & React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn(className)} {...props}>
      {children}
    </tr>
  );
}

/**
 * Celda de datos estándar (`<td>`).
 * Color: `--gray-lightest` (#d0d0d0), alineación centrada.
 *
 * @param align - Alineación del texto. Default: "center"
 */
function Cell({
  children,
  className,
  align,
  ...props
}: BaseProps & { align?: "left" | "center" | "right" } & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("std-td", className)}
      style={align && align !== "center" ? { textAlign: align } : undefined}
      {...props}
    >
      {children}
    </td>
  );
}

/**
 * Celda primaria de tabla (`<td>`).
 * Color: `--white-primary` (#ffffff), alineación izquierda.
 * Usar para la columna de identificador principal de cada fila.
 */
function PrimaryCell({
  children,
  className,
  ...props
}: BaseProps & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("std-td-primary", className)} {...props}>
      {children}
    </td>
  );
}

/**
 * Badge de estado estándar.
 * Usa colores desaturados coherentes con la paleta oscura del sistema.
 *
 * - positive → verde #7aab8a (Completada, Activo, Pagado, Disponible)
 * - negative → rojo #b07070 (Anulada, Cancelada, Inactivo, Rechazado)
 * - neutral  → gris #4a4a4a (Pendiente, En proceso, o desconocido)
 *
 * @param variant - Variante visual del badge
 * @param label   - Texto a mostrar en el badge
 */
function StatusBadge({
  variant,
  label,
  className,
}: {
  variant: StatusVariant;
  label: string;
  className?: string;
}) {
  const variantClass =
    variant === "positive"
      ? "std-badge-positive"
      : variant === "negative"
      ? "std-badge-negative"
      : "std-badge-neutral";

  return (
    <span className={cn("std-badge", variantClass, className)}>
      {label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

type StandardTableProps<T extends Record<string, unknown>> = {
  /**
   * Definición de columnas de la tabla.
   * Cada columna especifica la clave del campo, el encabezado y opcionalmente
   * una función de renderizado personalizado.
   */
  columns: ColumnDef<T>[];
  /** Array de registros a mostrar en la tabla */
  data: T[];
  /** Si true, muestra el estado de carga en lugar de las filas de datos */
  loading?: boolean;
  /** Mensaje principal del estado vacío */
  emptyMessage?: string;
  /** Título del estado vacío */
  emptyTitle?: string;
  /** Callback para recargar los datos (usado en el estado vacío y de carga) */
  onReload?: () => void;
  /** Clases CSS adicionales para el contenedor `<table>` */
  className?: string;
  /**
   * Clave para identificar cada fila de forma única.
   * Puede ser una clave del objeto de datos o una función que retorna un string.
   * Si no se provee, se usa el índice del array como fallback.
   */
  rowKey?: keyof T | ((row: T) => string);
  /** Render function for mobile card view. When provided, cards are shown on mobile and the table is hidden. */
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
};

/**
 * Componente principal de tabla estandarizada.
 *
 * Aplica automáticamente el sistema de diseño estándar:
 * - Fuente DM Sans
 * - Color gris (#d0d0d0) para celdas de datos
 * - Separadores de ancho completo
 * - Encabezados con padding simétrico, uppercase y letter-spacing
 *
 * Para tablas simples, usa la API de props (`columns` + `data`).
 * Para tablas complejas (filas expandibles, agrupadas), usa los subcomponentes:
 * `StandardTable.Header`, `StandardTable.HeadCell`, `StandardTable.Body`,
 * `StandardTable.Row`, `StandardTable.Cell`, `StandardTable.PrimaryCell`,
 * `StandardTable.StatusBadge`
 *
 * @example
 * // API de props (tabla simple)
 * <StandardTable
 *   columns={[
 *     { key: "nombre", header: "Nombre", primary: true },
 *     { key: "estado", header: "Estado", render: (v) => (
 *       <StandardTable.StatusBadge
 *         variant={resolveStatusVariant(String(v))}
 *         label={String(v)}
 *       />
 *     )},
 *   ]}
 *   data={clientes}
 *   loading={isLoading}
 *   emptyTitle="Sin clientes"
 *   emptyMessage="No hay clientes registrados."
 *   onReload={cargarClientes}
 * />
 *
 * @example
 * // Subcomponentes (tabla compleja)
 * <table className="std-table">
 *   <StandardTable.Header>
 *     <tr><StandardTable.HeadCell>Nombre</StandardTable.HeadCell></tr>
 *   </StandardTable.Header>
 *   <StandardTable.Body>
 *     {rows.map(row => (
 *       <StandardTable.Row key={row.id}>
 *         <StandardTable.PrimaryCell>{row.nombre}</StandardTable.PrimaryCell>
 *       </StandardTable.Row>
 *     ))}
 *   </StandardTable.Body>
 * </table>
 */
function StandardTableComponent<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No hay registros para mostrar.",
  emptyTitle = "Sin resultados",
  onReload = () => {},
  className,
  rowKey,
  renderMobileCard,
}: StandardTableProps<T>) {
  const colSpan = columns.length;

  const getRowKey = (row: T, index: number): string => {
    if (!rowKey) return String(index);
    if (typeof rowKey === "function") return rowKey(row);
    return String(row[rowKey] ?? index);
  };

  const hasMobileCards = !!renderMobileCard;

  return (
    <>
      {hasMobileCards && (
        <div className="block sm:hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-orange-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-lightest text-sm font-medium mb-1">{emptyTitle}</p>
              <p className="text-gray-lighter text-xs">{emptyMessage}</p>
            </div>
          ) : (
            <div className="std-mobile-cards">
              {data.map((row, i) => (
                <React.Fragment key={getRowKey(row, i)}>
                  {renderMobileCard(row, i)}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
      <div className={hasMobileCards ? "hidden sm:block" : undefined}>
        <div className="std-table-wrapper">
          <table className={cn("std-table", className)}>
            <Header>
              <tr>
                {columns.map((col, i) => (
                  <HeadCell
                    key={String(col.key)}
                    align={i === 0 ? "left" : (col.align ?? "center")}
                  >
                    {col.header}
                  </HeadCell>
                ))}
              </tr>
            </Header>
            <Body>
              {loading ? (
                <TableLoadingStateRow colSpan={colSpan} />
              ) : data.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={colSpan}
                  title={emptyTitle}
                  description={emptyMessage}
                  onReload={onReload}
                />
              ) : (
                data.map((row, rowIndex) => (
                  <Row key={getRowKey(row, rowIndex)}>
                    {columns.map((col, colIndex) => {
                      const value = col.key in row ? row[col.key as keyof T] : undefined;
                      const content = col.render
                        ? col.render(value, row)
                        : value !== undefined && value !== null
                        ? String(value)
                        : "—";

                      if (col.primary || colIndex === 0) {
                        return (
                          <PrimaryCell key={String(col.key)}>
                            {content}
                          </PrimaryCell>
                        );
                      }
                      return (
                        <Cell
                          key={String(col.key)}
                          align={col.align ?? "center"}
                        >
                          {content}
                        </Cell>
                      );
                    })}
                  </Row>
                ))
              )}
            </Body>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Adjuntar subcomponentes como propiedades estáticas ───────────────────────

export const StandardTable = Object.assign(StandardTableComponent, {
  Header,
  HeadCell,
  Body,
  Row,
  Cell,
  PrimaryCell,
  StatusBadge,
});

export default StandardTable;
