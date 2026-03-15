import { RotateCcw } from "lucide-react";
import { ReactNode } from "react";

type TableEmptyStateRowProps = {
  colSpan: number;
  title: string;
  description: string;
  onReload: () => void;
  reloadLabel?: string;
  extraAction?: ReactNode;
};

export function TableEmptyStateRow({
  colSpan,
  title,
  description,
  onReload,
  reloadLabel = "Recargar tabla",
  extraAction
}: TableEmptyStateRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <RotateCcw className="w-12 h-12 text-gray-medium" />
          <div className="text-center">
            <p className="font-medium text-white-primary">{title}</p>
            <p className="text-sm text-gray-lightest">{description}</p>
          </div>
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
        </div>
      </td>
    </tr>
  );
}
