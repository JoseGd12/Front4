import React from "react";
import {
  Package,
  ShoppingBag,
  Receipt,
  X
} from "lucide-react";
import { Input } from "../../../shared/components/ui/input";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { useAuth } from "../../../shared/contexts/AuthContext";

const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString('es-CO');
};

interface ProductoDevolucionResumen {
  id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  imagen?: string;
  categoria?: string;
}

interface DetailPanelDevolucionProps {
  productos: ProductoDevolucionResumen[];
  subtotal: number;
  saldoAFavor: number;
  total: number;
  onRemoveProducto?: (productId: number) => void;
  getTarjetaInput?: (
    producto: { id: number; cantidad: number },
    campo: "cantidad"
  ) => string;
  onTarjetaInputChange?: (
    productId: number,
    campo: "cantidad",
    valor: string
  ) => void;
}

export function DetailPanelDevolucion({
  productos,
  subtotal,
  saldoAFavor,
  total,
  onRemoveProducto,
  getTarjetaInput,
  onTarjetaInputChange,
}: DetailPanelDevolucionProps) {
  const { user } = useAuth();
  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const tieneItems = productos.length > 0;

  return (
    <div className="elegante-card lg:h-full lg:min-h-0 lg:overflow-hidden flex flex-col">
      <div className="sticky top-0 z-10 px-5 py-3 border-b border-gray-dark bg-gradient-to-r from-red-500/10 to-gray-darkest">
        <h3 className="text-lg font-bold text-white-primary flex items-center gap-2">
          <Receipt className="w-5 h-5 text-red-400" />
          Resumen de Devolución
        </h3>
      </div>

      <div className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
        {productos.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-red-400" />
              <h4 className="text-sm font-normal text-gray-lightest">
                Productos ({productos.length})
              </h4>
            </div>
            <div className="space-y-2">
              {productos.map((p) => {
                const cantidadVisual = getTarjetaInput
                  ? getTarjetaInput(p, "cantidad")
                  : String(p.cantidad);

                return (
                  <div
                    key={p.id}
                    className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-red-500/20 venta-item-enter"
                  >
                    <div className="flex items-center gap-3 flex-nowrap min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                        <ImageRenderer
                          url={p.imagen || ""}
                          alt={p.nombre}
                          className="w-full h-full border-0 bg-transparent"
                        />
                      </div>

                      <div className="min-w-0 flex-1 shrink flex flex-col items-center justify-center">
                         <span
                          className="text-gray-lightest font-normal text-sm truncate block text-center w-full"
                          title={p.nombre}
                        >
                          {p.nombre}
                        </span>
                        {p.categoria && (
                          <span className="text-[11px] text-gray-400 truncate block text-center w-full">
                            {p.categoria}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0">
                        <label className="text-[11px] text-gray-400 font-normal">Cantidad</label>
                        <Input
                          type="number"
                          min={1}
                          value={cantidadVisual}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') {
                              e.preventDefault();
                            }
                          }}
                          onPaste={(e) => {
                            const text = e.clipboardData?.getData('text') || '';
                            if (/[^\d]/.test(text)) {
                              e.preventDefault();
                              const cleaned = text.replace(/\D+/g, '');
                              onTarjetaInputChange?.(p.id, 'cantidad', cleaned);
                            }
                          }}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D+/g, '');
                            onTarjetaInputChange?.(p.id, 'cantidad', cleaned);
                          }}
                          className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0">
                        <label className="text-[11px] text-gray-400 font-normal">Precio</label>
                         <span className="text-gray-lightest font-normal text-xs tabular-nums leading-7 text-right">
                          ${formatCurrency(p.precio)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0">
                        <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                         <span className="text-red-400 font-normal text-xs tabular-nums leading-7">
                          ${formatCurrency(p.cantidad * p.precio)}
                        </span>
                      </div>

                      <button
                        onClick={() => onRemoveProducto?.(p.id)}
                        className="shrink-0 p-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                        title="Eliminar producto"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!tieneItems && (
          <div className="px-5 py-8 text-center">
            <ShoppingBag className="w-10 h-10 text-gray-dark mx-auto mb-2" />
            <p className="text-sm text-gray-lightest">
              Selecciona productos de la venta para ver el resumen de la devolución
            </p>
          </div>
        )}

        <div
          className="mx-5 mb-3 flex justify-between items-center rounded-lg px-4 py-2.5"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
           <span className="text-gray-lightest font-normal text-sm">Subtotal</span>
          <span className="text-gray-lightest font-normal text-lg tabular-nums">
            ${formatCurrency(subtotal)}
          </span>
        </div>

        {saldoAFavor > 0 && (
          <div
            className="mx-5 mb-4 flex justify-between items-center rounded-lg px-4 py-2.5"
            style={{
              border: `1px solid ${isAdminOrSuperAdmin ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.15)'}`,
              background: isAdminOrSuperAdmin ? 'rgba(248,113,113,0.04)' : 'rgba(74,222,128,0.04)',
            }}
          >
             <span className={`${isAdminOrSuperAdmin ? 'text-red-400' : 'text-green-400'} font-normal text-sm`}>Saldo a Favor generado</span>
            <span className={`${isAdminOrSuperAdmin ? 'text-red-400' : 'text-green-400'} font-normal text-lg tabular-nums`}>
              +${formatCurrency(saldoAFavor)}
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90">
        <div
          className="flex justify-between items-center rounded-lg px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(248,113,113,0.08) 100%)',
            border: '1px solid rgba(248,113,113,0.25)',
          }}
        >
           <span className="text-gray-lightest font-normal text-base tracking-wide">TOTAL DEVOLUCIÓN</span>
          <span className="text-red-400 font-normal text-2xl tabular-nums">
            ${formatCurrency(Math.max(0, total))}
          </span>
        </div>
      </div>
    </div>
  );
}
