import { RotateCcw } from "lucide-react";
import { ReactNode } from "react";

type TableEmptyStateRowProps = {
  colSpan: number;
  /** Título principal del estado vacío */
  title?: string;
  /** Descripción secundaria */
  description?: string;
  /** Alias de description — para compatibilidad con usos anteriores */
  message?: string;
  /** Si se omite, no se muestra el botón de recarga */
  onReload?: () => void;
  reloadLabel?: string;
  extraAction?: ReactNode;
};

export function TableEmptyStateRow({
  colSpan,
  title = "Sin resultados",
  description,
  message,
  onReload,
  reloadLabel = "Recargar tabla",
  extraAction
}: TableEmptyStateRowProps) {
  const bodyText = description ?? message ?? "No hay datos para mostrar.";
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <RotateCcw className="w-12 h-12 text-gray-medium" />
          <div className="text-center">
            <p className="font-medium text-white-primary">{title}</p>
            <p className="text-sm text-gray-lightest">{bodyText}</p>
          </div>
          {onReload && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onReload}
                className="elegante-button-secondary gap-2 flex items-center"
              >
                <RotateCcw className="w-4 h-4" />
                {reloadLabel}
              </button>
              {extraAction}
            </div>
          )}
          {!onReload && extraAction && (
            <div className="flex items-center justify-center gap-3">{extraAction}</div>
          )}
        </div>
      </td>
    </tr>
  );
}
