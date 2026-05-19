import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from '../../../shared/components/ui/notify';

interface ModalCompletarParcialmenteProps {
  isOpen: boolean;
  cita: any;
  onClose: () => void;
  onComplete: (servicios: number[], productos: number[]) => Promise<void>;
}

export function ModalCompletarParcialmente({
  isOpen,
  cita,
  onClose,
  onComplete
}: ModalCompletarParcialmenteProps) {

  const [serviciosChecked, setServiciosChecked] = useState<Set<number>>(() =>
    new Set((cita?.servicioIds || []).map(Number).filter((id: number) => id > 0))
  );

  const [productosChecked, setProductosChecked] = useState<Set<number>>(() => {
    const prods = cita?.productos || [];
    return new Set(prods.map((p: any) => Number(p.productoId || p.id)).filter((id: number) => id > 0));
  });

  const [loading, setLoading] = useState(false);

  const servicios = useMemo(() => {
    const srvs = cita?.servicios || [];
    return srvs.filter((s: any) => {
      const sid = Number(s.servicioId || s.id || 0);
      return sid > 0;
    });
  }, [cita]);

  const productos = useMemo(() => {
    const prods = cita?.productos || [];
    return prods.filter((p: any) => {
      const pid = Number(p.productoId || p.id || 0);
      return pid > 0;
    });
  }, [cita]);

  const totales = useMemo(() => {
    let subtotal = 0;

    servicios.forEach((srv: any) => {
      const sid = Number(srv.servicioId || srv.id);
      if (serviciosChecked.has(sid)) {
        subtotal += Number(srv.precio || srv.precioVenta || 0);
      }
    });

    productos.forEach((prod: any) => {
      const pid = Number(prod.productoId || prod.id);
      if (productosChecked.has(pid)) {
        const cantidad = Number(prod.cantidad || 1);
        const precio = Number(prod.precioVenta || prod.precio || 0);
        subtotal += precio * cantidad;
      }
    });

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    return { subtotal, iva, total };
  }, [serviciosChecked, productosChecked, servicios, productos]);

  const handleSubmit = async () => {
    if (serviciosChecked.size === 0 && productosChecked.size === 0) {
      toast.error("Debe seleccionar al menos un servicio o producto");
      return;
    }

    setLoading(true);
    try {
      await onComplete(
        Array.from(serviciosChecked),
        Array.from(productosChecked)
      );
      onClose();
    } catch (err: any) {
      toast.error("Error", {
        description: err?.message || "No se pudo completar la cita"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[95%] max-w-md bg-gray-darkest rounded-2xl border border-gray-dark shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-dark/60 bg-gray-darker/50 shrink-0">
          <h2 className="text-lg font-semibold text-white-primary">
            Completar Parcialmente
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-lighter hover:bg-gray-dark/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          <div>
            <h3 className="text-sm font-semibold text-gray-lightest mb-3">
              Servicios Realizados
            </h3>
            <div className="space-y-2">
              {servicios.length > 0 ? (
                servicios.map((srv: any) => {
                  const sid = Number(srv.servicioId || srv.id);
                  return (
                    <label
                      key={sid}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-dark/30 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={serviciosChecked.has(sid)}
                        onChange={(e) => {
                          const next = new Set(serviciosChecked);
                          e.target.checked ? next.add(sid) : next.delete(sid);
                          setServiciosChecked(next);
                        }}
                        className="rounded w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-lightest truncate">
                          {srv.nombre}
                        </p>
                        <p className="text-xs text-gray-lighter">
                          {srv.duracion || 60} min
                        </p>
                      </div>
                      <span className="text-sm text-orange-primary font-medium shrink-0">
                        ${Number(srv.precio || srv.precioVenta || 0).toLocaleString()}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="text-xs text-gray-lighter">Sin servicios</p>
              )}
            </div>
          </div>

          {productos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-lightest mb-3">
                Productos Vendidos
              </h3>
              <div className="space-y-2">
                {productos.map((prod: any) => {
                  const pid = Number(prod.productoId || prod.id);
                  const cantidad = Number(prod.cantidad || 1);
                  const precio = Number(prod.precioVenta || prod.precio || 0);
                  return (
                    <label
                      key={pid}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-dark/30 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={productosChecked.has(pid)}
                        onChange={(e) => {
                          const next = new Set(productosChecked);
                          e.target.checked ? next.add(pid) : next.delete(pid);
                          setProductosChecked(next);
                        }}
                        className="rounded w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-lightest truncate">
                          {prod.nombre}
                        </p>
                        <p className="text-xs text-gray-lighter">
                          Cant: {cantidad}
                        </p>
                      </div>
                      <span className="text-sm text-orange-primary font-medium shrink-0">
                        ${(precio * cantidad).toLocaleString()}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        <div className="px-6 py-4 border-t border-gray-dark/60 bg-gray-darker/30 shrink-0 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-lighter">Subtotal:</span>
            <span className="text-gray-lightest font-medium">
              ${totales.subtotal.toLocaleString('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-lighter">IVA (19%):</span>
            <span className="text-gray-lightest font-medium">
              ${totales.iva.toLocaleString('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t border-gray-dark pt-2">
            <span className="text-white-primary">Total:</span>
            <span className="text-orange-primary">
              ${totales.total.toLocaleString('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </span>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-dark/60 bg-gray-darker/50 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-lighter hover:text-white-primary transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (serviciosChecked.size === 0 && productosChecked.size === 0)}
            className="px-4 py-2 text-sm bg-orange-primary text-white-primary rounded-lg hover:bg-orange-primary/90 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
          >
            {loading && (
              <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {loading ? "Guardando..." : "Completar"}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
