import React from "react";
import { X, Package, Scissors } from "lucide-react";
import { Input } from "../../../shared/components/ui/input";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";

const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString('es-CO');
};

interface LineItemProps {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  imagen?: string;
  tipo: 'producto' | 'servicio';
  onRemove: (id: string) => void;
  cantidadInput?: string;
  precioInput?: string;
  onCantidadChange?: (id: string, value: string) => void;
  onPrecioChange?: (id: string, value: string) => void;
  cantidadDisabled?: boolean;
  precioDisabled?: boolean;
}

export function LineItem({
  id,
  nombre,
  cantidad,
  precio,
  imagen,
  tipo,
  onRemove,
  cantidadInput,
  precioInput,
  onCantidadChange,
  onPrecioChange,
  cantidadDisabled = false,
  precioDisabled = false,
}: LineItemProps) {
  const FallbackIcon = tipo === 'producto' ? Package : Scissors;

  return (
    <div className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20 venta-item-enter">
      <div className="flex items-center gap-4 flex-nowrap min-w-0">
        <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
          {imagen ? (
            <ImageRenderer
              url={imagen}
              alt={nombre}
              className="w-full h-full border-0 bg-transparent"
            />
          ) : (
            <FallbackIcon className="w-5 h-5 text-gray-lighter" />
          )}
        </div>
        <div className="min-w-0 flex-1 shrink">
          <span className="text-white-primary font-semibold text-sm truncate block">
            {nombre}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 shrink-0">
          <label className="text-[11px] text-gray-400 font-normal">Cant.</label>
          <Input
            type="number"
            min={1}
            value={cantidadInput ?? String(cantidad)}
            onChange={(e) => onCantidadChange?.(id, e.target.value)}
            disabled={cantidadDisabled}
            readOnly={cantidadDisabled}
            className={`w-14 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 ${cantidadDisabled ? 'bg-gray-medium cursor-not-allowed' : ''}`}
          />
        </div>

        <div className="flex flex-col gap-0.5 shrink-0">
          <label className="text-[11px] text-gray-400 font-normal">Precio</label>
          <Input
            type="number"
            min={0}
            value={precioInput ?? String(precio)}
            onChange={(e) => onPrecioChange?.(id, e.target.value)}
            disabled={precioDisabled}
            readOnly={precioDisabled}
            className={`w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5 ${precioDisabled ? 'bg-gray-medium cursor-not-allowed' : ''}`}
          />
        </div>

        <div className="flex flex-col gap-0.5 shrink-0 justify-center">
          <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
          <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7">
            ${formatCurrency(precio * cantidad)}
          </span>
        </div>

        <button
          onClick={() => onRemove(id)}
          className="shrink-0 p-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
          title={`Eliminar ${tipo}`}
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
