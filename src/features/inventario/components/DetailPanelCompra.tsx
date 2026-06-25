import React from "react";
import {
  Package,
  ShoppingBag,
  Receipt,
  X
} from "lucide-react";
import { Input } from "../../../shared/components/ui/input";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";

const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString('es-CO');
};

const formatCompactCurrency = (amount: number): string => {
  const n = amount ?? 0;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${parseFloat(m.toFixed(1))}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return k % 1 === 0 ? `${k}mil` : `${parseFloat(k.toFixed(1))}mil`;
  }
  return n.toLocaleString('es-CO');
};

interface ProductoCompraResumen {
  id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  precioVenta?: number;
  imagen?: string;
  categoria?: string;
}

interface DetailPanelCompraProps {
  productos: ProductoCompraResumen[];
  subtotal: number;
  descuentoPorcentaje: number;
  descuentoMonto: number;
  total: number;
  onRemoveProducto?: (productId: number) => void;
  getTarjetaInput?: (
    producto: { id: number; cantidad: number; precio: number; precioVenta?: number },
    campo: "cantidad" | "precio" | "precioVenta"
  ) => string;
  onTarjetaInputChange?: (
    productId: number,
    campo: "cantidad" | "precio" | "precioVenta",
    valor: string
  ) => void;
}

export function DetailPanelCompra({
  productos,
  subtotal,
  descuentoPorcentaje,
  descuentoMonto,
  total,
  onRemoveProducto,
  getTarjetaInput,
  onTarjetaInputChange,
}: DetailPanelCompraProps) {
  const tieneItems = productos.length > 0;

  return (
    <div className="elegante-card lg:h-full lg:min-h-0 lg:overflow-hidden flex flex-col">
      <div className="sticky top-0 z-10 px-5 py-3 border-b border-gray-dark bg-gradient-to-r from-blue-500/10 to-gray-darkest">
        <h3 className="text-lg font-bold text-white-primary flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-400" />
          Resumen de Compra
        </h3>
      </div>

      <div className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
        {productos.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-white-primary">
                Productos ({productos.length})
              </h4>
            </div>
            <div className="space-y-2 overflow-x-auto custom-scrollbar pb-2">
              {productos.map((p) => {
                const cantidadVisual = getTarjetaInput
                  ? getTarjetaInput(p, "cantidad")
                  : String(p.cantidad);
                const precioVisual = getTarjetaInput
                  ? getTarjetaInput(p, "precio")
                  : String(p.precio);
                const precioVentaVisual = getTarjetaInput
                  ? getTarjetaInput(p, "precioVenta")
                  : String(p.precioVenta ?? 0);

                return (
                  <div
                    key={p.id}
                    className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-blue-500/20 venta-item-enter"
                    style={{ minWidth: "max-content" }}
                  >
                    <div className="flex items-center gap-3 flex-nowrap">
                      {/* Imagen */}
                      <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                        <ImageRenderer
                          url={p.imagen || ""}
                          alt={p.nombre}
                          className="w-full h-full border-0 bg-transparent"
                        />
                      </div>

                      {/* Nombre y categoría */}
                      <div className="min-w-0 flex-1 shrink flex flex-col items-center justify-center">
                        <span
                          className="text-white-primary font-semibold text-sm truncate block text-center w-full"
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

                      {/* Cantidad */}
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
                            e.preventDefault();
                            const cleaned = text.replace(/\D+/g, '').slice(0, 4);
                            onTarjetaInputChange?.(p.id, 'cantidad', cleaned);
                          }}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D+/g, '').slice(0, 4);
                            onTarjetaInputChange?.(p.id, 'cantidad', cleaned);
                          }}
                          className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5"
                        />
                      </div>

                      {/* Precio compra */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <label className="text-[11px] text-gray-400 font-normal">P. compra</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={precioVisual ? Number(precioVisual).toLocaleString('es-CO') : ''}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.') {
                              e.preventDefault();
                            }
                          }}
                          onPaste={(e) => {
                            const text = e.clipboardData?.getData('text') || '';
                            const cleaned = text.replace(/\D+/g, '').slice(0, 9);
                            e.preventDefault();
                            onTarjetaInputChange?.(p.id, 'precio', cleaned);
                          }}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D+/g, '').slice(0, 9);
                            onTarjetaInputChange?.(p.id, 'precio', cleaned);
                          }}
                          className="w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5"
                        />
                      </div>

                      {/* Precio venta */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <label className="text-[11px] text-gray-400 font-normal">P. venta</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={precioVentaVisual ? Number(precioVentaVisual).toLocaleString('es-CO') : ''}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.') {
                              e.preventDefault();
                            }
                          }}
                          onPaste={(e) => {
                            const text = e.clipboardData?.getData('text') || '';
                            const cleaned = text.replace(/\D+/g, '').slice(0, 9);
                            e.preventDefault();
                            onTarjetaInputChange?.(p.id, 'precioVenta', cleaned);
                          }}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D+/g, '').slice(0, 9);
                            onTarjetaInputChange?.(p.id, 'precioVenta', cleaned);
                          }}
                          className="w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5"
                        />
                      </div>

                      {/* Subtotal */}
                      <div className="flex flex-col gap-0.5 shrink-0 justify-center" title={`$${formatCurrency(p.precio * p.cantidad)}`}>
                        <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                        <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7 whitespace-nowrap">
                          ${formatCompactCurrency(p.precio * p.cantidad)}
                        </span>
                      </div>

                      {/* Eliminar */}
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
              Agrega productos para ver el resumen de la compra
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
          <span className="text-white-primary font-semibold text-sm">Subtotal</span>
          <span className="text-white-primary font-bold text-lg tabular-nums">
            ${formatCurrency(subtotal)}
          </span>
        </div>

        <div
          className="mx-5 mb-4 flex justify-between items-center rounded-lg px-4 py-2.5"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <span className="text-white-primary font-semibold text-sm">
            Descuento ({descuentoPorcentaje}%)
          </span>
          <span className={`font-bold text-lg tabular-nums ${descuentoMonto > 0 ? 'text-red-400' : 'text-gray-lightest'}`}>
            {descuentoMonto > 0 ? '-' : ''}${formatCurrency(descuentoMonto)}
          </span>
        </div>
      </div>

      <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90">
        <div
          className="flex justify-between items-center rounded-lg px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(96,165,250,0.08) 100%)',
            border: '1px solid rgba(96,165,250,0.25)',
          }}
        >
          <span className="text-white-primary font-bold text-base tracking-wide">TOTAL</span>
          <span className="text-blue-400 font-bold text-2xl tabular-nums">
            ${formatCurrency(Math.max(0, total))}
          </span>
        </div>
      </div>
    </div>
  );
}
