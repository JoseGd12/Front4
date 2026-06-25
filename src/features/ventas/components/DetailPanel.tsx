import React from "react";
import {
  Package,
  Scissors,
  ShoppingBag,
  Receipt,
  X
} from "lucide-react";
import { Input } from "../../../shared/components/ui/input";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";

const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString('es-CO');
};

interface ProductoResumen {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  imagen?: string;
  categoria?: string;
}

interface ServicioResumen {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  imagen?: string;
}

interface DetailPanelProps {
  productos: ProductoResumen[];
  servicios: ServicioResumen[];
  subtotalProductos: number;
  subtotalServicios: number;
  descuentoPorcentaje: number;
  descuentoMonto: number;
  saldoUsado: number;
  total: number;
  onRemoveProducto?: (productId: string) => void;
  onRemoveServicio?: (servicioId: string) => void;
  getTarjetaProductoInput?: (
    productId: string,
    campo: "cantidad" | "precio",
    fallback: number
  ) => string;
  onTarjetaProductoInputChange?: (
    productId: string,
    campo: "cantidad" | "precio",
    valor: string
  ) => void;
}

export function DetailPanel({
  productos,
  servicios,
  subtotalProductos,
  subtotalServicios,
  descuentoPorcentaje,
  descuentoMonto,
  saldoUsado,
  total,
  onRemoveProducto,
  onRemoveServicio,
  getTarjetaProductoInput,
  onTarjetaProductoInputChange,
}: DetailPanelProps) {
  const subtotalGeneral = subtotalProductos + subtotalServicios;
  const tieneItems = productos.length > 0 || servicios.length > 0;

  return (
    <div className="elegante-card lg:h-full lg:min-h-0 lg:overflow-hidden flex flex-col">
      <div className="sticky top-0 z-10 px-5 py-3 border-b border-gray-dark bg-gradient-to-r from-orange-primary/10 to-gray-darkest">
        <h3 className="text-lg font-bold text-white-primary flex items-center gap-2">
          <Receipt className="w-5 h-5 text-orange-primary" />
          Resumen de Venta
        </h3>
      </div>

      <div className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
        {productos.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-normal text-gray-lightest">
                Productos ({productos.length})
              </h4>
            </div>
            <div className="space-y-2">
              {productos.map((p) => {
                const cantidadVisual = getTarjetaProductoInput
                  ? getTarjetaProductoInput(p.id, "cantidad", p.cantidad)
                  : String(p.cantidad);

                return (
                  <div
                    key={p.id}
                    className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20 venta-item-enter"
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
                              onTarjetaProductoInputChange?.(p.id, 'cantidad', cleaned);
                            }
                          }}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\D+/g, '');
                            onTarjetaProductoInputChange?.(p.id, 'cantidad', cleaned);
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
                         <span className="text-orange-primary font-normal text-xs tabular-nums leading-7">
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

        {servicios.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Scissors className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-normal text-gray-lightest">
                Servicios ({servicios.length})
              </h4>
            </div>
            <div className="space-y-2">
              {servicios.map((s) => (
                <div
                  key={s.id}
                  className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20 venta-item-enter"
                >
                  <div className="flex items-center gap-3 flex-nowrap min-w-0">
                    <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                      <ImageRenderer
                        url={s.imagen || ""}
                        alt={s.nombre}
                        className="w-full h-full border-0 bg-transparent"
                      />
                    </div>

                    <div className="min-w-0 flex-1 shrink flex flex-col items-center justify-center">
                       <span
                        className="text-gray-lightest font-normal text-sm truncate block text-center w-full"
                        title={s.nombre}
                      >
                        {s.nombre}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 shrink-0">
                      <label className="text-[11px] text-gray-400 font-normal">Precio</label>
                       <span className="text-gray-lightest font-normal text-xs tabular-nums leading-7 text-right">
                        ${formatCurrency(s.precio)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 shrink-0">
                      <label className="text-[11px] text-gray-400 font-normal">Total</label>
                       <span className="text-orange-primary font-normal text-xs tabular-nums leading-7">
                        ${formatCurrency(s.cantidad * s.precio)}
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveServicio?.(s.id)}
                      className="shrink-0 p-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                      title="Eliminar servicio"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!tieneItems && (
          <div className="px-5 py-8 text-center">
            <ShoppingBag className="w-10 h-10 text-gray-dark mx-auto mb-2" />
            <p className="text-sm text-gray-lightest">
              Agrega productos o servicios para ver el resumen
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
            ${formatCurrency(subtotalGeneral)}
          </span>
        </div>

        <div
          className="mx-5 mb-3 flex justify-between items-center rounded-lg px-4 py-2.5"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
           <span className="text-gray-lightest font-normal text-sm">
            Descuento ({descuentoPorcentaje}%)
          </span>
          <span className={`font-normal text-lg tabular-nums ${descuentoMonto > 0 ? 'text-red-400' : 'text-gray-lightest'}`}>
            {descuentoMonto > 0 ? '-' : ''}${formatCurrency(descuentoMonto)}
          </span>
        </div>

        {saldoUsado > 0 && (
          <div
            className="mx-5 mb-4 flex justify-between items-center rounded-lg px-4 py-2.5"
            style={{
              border: '1px solid rgba(74,222,128,0.15)',
              background: 'rgba(74,222,128,0.04)',
            }}
          >
             <span className="text-green-400 font-normal text-sm">Saldo a Favor</span>
            <span className="text-green-400 font-normal text-lg tabular-nums">
              -${formatCurrency(saldoUsado)}
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90">
        <div
          className="flex justify-between items-center rounded-lg px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, rgba(174,120,14,0.15) 0%, rgba(244,194,69,0.08) 100%)',
            border: '1px solid rgba(244,194,69,0.25)',
          }}
        >
           <span className="text-gray-lightest font-normal text-base tracking-wide">TOTAL</span>
          <span className="text-orange-primary font-normal text-2xl tabular-nums">
            ${formatCurrency(Math.max(0, total))}
          </span>
        </div>
      </div>
    </div>
  );
}
