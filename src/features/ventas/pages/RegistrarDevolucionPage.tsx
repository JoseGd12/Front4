import React, { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "../../../shared/components/ui/input";
import {
  Receipt,
  RotateCcw,
  Hash,
  Calendar,
  ShoppingBag,
  Package,
  AlertCircle,
  Plus,
  Check,
} from "lucide-react";
import { Label } from "../../../shared/components/ui/label";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { devolucionService, CreateDevolucionRequest } from "../services/devolucionService";
import { ventaService } from "../services/ventaService";
import { productoService } from "../../productos/services/productos";
import { clientesService } from "../../clientes/services/clientesService";
import { categoriaService } from "../../inventario/services/categoriaService";
import { useAuth } from "../../../shared/contexts/AuthContext";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { FormSection } from "../../../shared/components/ui/FormSection";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { DetailPanelDevolucion } from "../components/DetailPanelDevolucion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/select";
import { Checkbox } from "../../../shared/components/ui/checkbox";

// Utilities
const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString("es-CO");
};

const formatDate = (date: string | Date): string => {
  let dateObj: Date;
  if (typeof date === "string") {
    const plainDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (plainDateMatch) {
      const [, year, month, day] = plainDateMatch;
      dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  if (Number.isNaN(dateObj.getTime())) return String(date || "");
  return dateObj.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const normalizeSearchText = (value: unknown): string => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const MOTIVOS_DEVOLUCION = [
  { value: 'producto_defectuoso', label: 'Producto Defectuoso' },
  { value: 'error_compra', label: 'Error en la Compra' },
  { value: 'producto_vencido', label: 'Producto Vencido' },
  { value: 'reaccion_alergica', label: 'Reacción Alérgica' },
  { value: 'no_conforme', label: 'No Conforme con Expectativas' },
  { value: 'cambio_opinion', label: 'Cambio de Opinión' },
  { value: 'otros', label: 'Otros' }
];

const generateCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRemainingWarrantyDays = (fechaISO: string): number | null => {
  if (!fechaISO) return null;
  try {
    const fechaVenta = new Date(fechaISO);
    if (isNaN(fechaVenta.getTime())) return null;
    const fechaExp = new Date(fechaVenta);
    fechaExp.setDate(fechaExp.getDate() + 15);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const expCopy = new Date(fechaExp);
    expCopy.setHours(0, 0, 0, 0);
    const diffTime = expCopy.getTime() - hoy.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

interface RegistrarDevolucionPageProps {
  onBack: () => void;
}

export function RegistrarDevolucionPage({ onBack }: RegistrarDevolucionPageProps) {
  const { user } = useAuth();
  const {
    created,
    success,
    error: showErrorAlert,
    info: showInfoAlert,
    AlertContainer,
  } = useCustomAlert();

  // Data loading state
  const [loading, setLoading] = useState(true);
  const [ventasDisponibles, setVentasDisponibles] = useState<any[]>([]);
  const [devolucionesCount, setDevolucionesCount] = useState(0);
  const [imagenesProductosCatalogo, setImagenesProductosCatalogo] = useState<Record<number, string>>({});
  const [devoluciones, setDevoluciones] = useState<any[]>([]);

  // Form state - Devolución de venta
  const [ventaSearchTerm, setVentaSearchTerm] = useState("");
  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState<Record<number, boolean>>({});
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<number, string>>({});
  const [motivoCategoria, setMotivoCategoria] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Tarjeta inputs for detail panel
  const [tarjetaInputs, setTarjetaInputs] = useState<Record<number, { cantidad?: string }>>({});

  // Validation
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const shakeClass = validationAttempt % 2 === 0 ? "input-required-shake-a" : "input-required-shake-b";

  const clearValidationErrors = () => {
    if (showFormErrors) setShowFormErrors(false);
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devs, sales, clientes, productos, categorias] = await Promise.all([
        devolucionService.getDevoluciones().catch(() => []),
        ventaService.getVentas().catch(() => []),
        clientesService.getClientes().catch(() => []),
        productoService.getProductos().catch(() => []),
        categoriaService.getCategorias().catch(() => []),
      ]);

      setDevolucionesCount(Array.isArray(devs) ? devs.length : 0);
      setDevoluciones(devs || []);

      const categoriasById = new Map<number, string>();
      (categorias || []).forEach((c: any) => {
        const id = Number(c?.id ?? 0);
        if (id && c?.nombre) categoriasById.set(id, String(c.nombre));
      });

      const imagenesMap: Record<number, string> = {};
      (productos || []).forEach((p: any) => {
        const id = Number(p?.id || 0);
        const imagen = String(p?.imagen || p?.imagenProduc || p?.imagenUrl || '');
        if (id > 0 && imagen.trim()) imagenesMap[id] = imagen;
      });
      setImagenesProductosCatalogo(imagenesMap);
      // Mapa de clientes
      const clientesMapa = new Map<number, { documento: string; tipoDocumento?: string; nombreCompleto?: string }>();
      (clientes || []).forEach((cliente: any) => {
        if (cliente.id) {
          const documentoStr = cliente.documento || '';
          const partesDocumento = documentoStr.split(' ');
          const tipoDocumento = partesDocumento.length > 1 ? partesDocumento[0] : 'CC';
          const numeroDocumento = partesDocumento.length > 1 ? partesDocumento.slice(1).join(' ') : documentoStr;
          const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();
          clientesMapa.set(cliente.id, { documento: numeroDocumento, tipoDocumento, nombreCompleto });
        }
      });

      // Formatear ventas
      const normalizeEstadoVenta = (estado: string) => String(estado || '').toLowerCase().trim();
      const formattedSales = (sales || []).map((s: any) => {
        const clienteIdNum = Number(s.clienteId || 0);
        const clienteInfo = clienteIdNum > 0 ? clientesMapa.get(clienteIdNum) : undefined;
        let clienteNombre = typeof s.cliente === 'string' ? s.cliente : '';
        if (!clienteNombre || clienteNombre.toLowerCase() === 'cliente') {
          clienteNombre = clienteInfo?.nombreCompleto || clienteNombre || 'Cliente';
        }
        const clienteDocumento = String(
          s.clienteDocumento || (clienteInfo?.documento ? `${clienteInfo?.tipoDocumento || 'CC'} ${clienteInfo.documento}` : '')
        );

        return {
          id: s.id,
          numeroVenta: String(s.numeroVenta || s.id),
          cliente: clienteNombre,
          clienteDocumento,
          clienteId: s.clienteId,
          fecha: s.fecha ? new Date(s.fecha).toLocaleDateString('es-CO') : '',
          fechaISO: s.fecha || '',
          garantiaMeses: Number(s.garantiaMeses || 1),
          total: s.total,
          estado: s.estado || 'Completada',
          productos: (s.productosDetalle || []).map((p: any) => ({
            id: Number(p.id || p.productoId || p.ProductoId || 0),
            nombre: p.nombre,
            precio: Number(p.precio || 0),
            cantidad: Number(p.cantidad || 0),
            imagen: String(p.imagen || p.imagenProduc || p.imagenUrl || imagenesMap[Number(p.id || p.productoId || 0)] || '')
          }))
        };
      });

      const ventasParaDevolucion = formattedSales.filter((v: any) => {
        const estado = normalizeEstadoVenta(v.estado);
        return estado !== 'anulada' && estado !== 'anulado' && estado !== 'cancelada' && estado !== 'cancelado';
      });
      setVentasDisponibles(ventasParaDevolucion);
    } catch (err: any) {
      console.error("Error cargando datos:", err);
      showErrorAlert("Error al cargar datos", "No se pudieron cargar los datos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Computed values
  const numeroDevolucion = useMemo(() => devolucionesCount + 1, [devolucionesCount]);

  // === Devolución de venta handlers ===
  const handleVentaChange = async (ventaIdStr: string) => {
    const ventaId = Number(ventaIdStr);
    clearValidationErrors();
    let venta = ventasDisponibles.find((v: any) => v.id === ventaId);

    if (venta) {
      if (!venta.productos || venta.productos.length === 0) {
        try {
          const ventaCompleta = await ventaService.getVentaById(ventaId);
          if (ventaCompleta) {
            const devsVenta = (devoluciones || []).filter((d: any) => Number(d.ventaId) === ventaId && String(d.estado).toLowerCase() !== 'anulada');
            const yaDevueltosPorProducto: Record<number, number> = {};
            devsVenta.forEach((d: any) => {
              const pid = Number(d.productoId || 0);
              const cant = Number(d.cantidad || 0);
              if (pid > 0 && cant > 0) yaDevueltosPorProducto[pid] = (yaDevueltosPorProducto[pid] || 0) + cant;
            });

            const productosActualizados = (ventaCompleta.productosDetalle || []).map((p: any) => {
              const productoId = Number(p.id || p.productoId || p.ProductoId || 0);
              const vendidosOriginal = Number(p.cantidad || 0);
              const yaDev = yaDevueltosPorProducto[productoId] || 0;
              const disponible = Math.max(0, vendidosOriginal - yaDev);
              return {
                id: productoId,
                nombre: p.nombre,
                precio: Number(p.precio || 0),
                cantidad: disponible,
                imagen: String(p.imagen || p.imagenProduc || p.imagenUrl || imagenesProductosCatalogo[productoId] || '')
              };
            });

            const clienteNombre = (typeof ventaCompleta.cliente === 'string' && ventaCompleta.cliente.trim().toLowerCase() !== 'cliente')
              ? ventaCompleta.cliente : (venta?.cliente || 'Cliente');
            const clienteDocumento = String(ventaCompleta.clienteDocumento || venta?.clienteDocumento || '');
            venta = { ...venta, productos: productosActualizados, cliente: clienteNombre, clienteDocumento };

            setVentasDisponibles((prev: any[]) => prev.map((v: any) =>
              v.id === ventaId ? { ...v, productos: productosActualizados, cliente: clienteNombre, clienteDocumento } : v
            ));
          }
        } catch (error) {
          console.error("Error al cargar detalles de la venta:", error);
        }
      }

      setVentaSeleccionada(venta);
      const cantidadesIniciales: Record<number, string> = {};
      (venta?.productos || []).forEach((p: any) => {
        const id = Number(p.id);
        if (!Number.isNaN(id) && id > 0) cantidadesIniciales[id] = Number(p.cantidad || 0) > 0 ? '1' : '0';
      });
      setCantidadesDevolucion(cantidadesIniciales);
      setProductosSeleccionados({});
      setTarjetaInputs({});
    } else {
      setVentaSeleccionada(null);
      setProductosSeleccionados({});
      setCantidadesDevolucion({});
      setTarjetaInputs({});
    }
  };

  const handleToggleProductoSeleccion = (producto: any, checked: boolean) => {
    clearValidationErrors();
    const productoId = Number(producto?.id || 0);
    if (!productoId) return;

    setProductosSeleccionados((prev) => ({ ...prev, [productoId]: checked }));

    if (!checked) {
      // Remove from detail panel
      setTarjetaInputs((prev) => {
        const next = { ...prev };
        delete next[productoId];
        return next;
      });
      return;
    }

    const maxCantidad = Math.max(0, Number(producto?.cantidad || 0));
    if (maxCantidad <= 0) {
      showInfoAlert("Sin cantidad disponible", "No hay cantidad disponible para devolver de este producto.");
      setProductosSeleccionados((prev) => ({ ...prev, [productoId]: false }));
      return;
    }
    const rawCantidad = cantidadesDevolucion[productoId] ?? '1';
    const parsedCantidad = Number(rawCantidad);
    const cantidadValida = !Number.isNaN(parsedCantidad) && parsedCantidad > 0
      ? Math.min(maxCantidad, Math.floor(parsedCantidad)) : 1;

    setCantidadesDevolucion((prev) => ({ ...prev, [productoId]: String(cantidadValida) }));
    setTarjetaInputs((prev) => ({ ...prev, [productoId]: { cantidad: String(cantidadValida) } }));
  };

  const handleCantidadProductoChange = (producto: any, valor: string) => {
    const productoId = Number(producto?.id || 0);
    if (!productoId) return;
    clearValidationErrors();

    const maxCantidad = Math.max(0, Number(producto?.cantidad || 0));
    const cleaned = valor.replace(/\D/g, '');
    if (cleaned === '') {
      setCantidadesDevolucion((prev) => ({ ...prev, [productoId]: '' }));
      setTarjetaInputs((prev) => ({ ...prev, [productoId]: { cantidad: '' } }));
      return;
    }
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed)) {
      const valid = maxCantidad === 0 ? 0 : Math.min(maxCantidad, Math.max(1, Math.floor(parsed)));
      setCantidadesDevolucion((prev) => ({ ...prev, [productoId]: String(valid) }));
      setTarjetaInputs((prev) => ({ ...prev, [productoId]: { cantidad: String(valid) } }));
    }
  };

  // Detail panel products for ventas
  const productosParaPanel = useMemo(() => {
    if (ventaSeleccionada) {
      return (ventaSeleccionada.productos || [])
        .filter((p: any) => productosSeleccionados[Number(p.id)])
        .map((p: any) => ({
          id: Number(p.id),
          nombre: p.nombre,
          cantidad: Number(cantidadesDevolucion[Number(p.id)] || 1),
          precio: Number(p.precio || 0),
          imagen: p.imagen,
          categoria: '',
        }));
    }
    return [];
  }, [ventaSeleccionada, productosSeleccionados, cantidadesDevolucion]);

  const subtotal = useMemo(() => productosParaPanel.reduce((s: number, p: any) => s + p.cantidad * p.precio, 0), [productosParaPanel]);
  const saldoAFavor = subtotal; // En devoluciones, el subtotal se convierte en saldo a favor
  const total = subtotal;

  const removeProductoFromPanel = (productId: number) => {
    setProductosSeleccionados((prev) => ({ ...prev, [productId]: false }));
    setTarjetaInputs((prev) => { const next = { ...prev }; delete next[productId]; return next; });
  };

  const getTarjetaInput = (producto: { id: number; cantidad: number }, campo: "cantidad") => {
    const visual = tarjetaInputs[producto.id]?.cantidad;
    return visual ?? String(producto.cantidad ?? 0);
  };

  const onTarjetaInputChange = (productId: number, campo: "cantidad", valor: string) => {
    const prod = ventaSeleccionada?.productos?.find((p: any) => Number(p.id) === productId);
    if (prod) handleCantidadProductoChange(prod, valor);
  };

  // === Submit ===
  const handleCreateDevolucion = async () => {
    setShowFormErrors(true);
    setValidationAttempt((prev) => prev + 1);

    if (!user || !user.id) {
      showErrorAlert("Error de sesión", "No se ha identificado el usuario responsable.");
      return;
    }

    // Devolución de venta
    if (ventaSeleccionada) {
      const diasRestantes = getRemainingWarrantyDays(ventaSeleccionada.fechaISO);
      if (diasRestantes !== null && diasRestantes < 0) {
        showErrorAlert("Garantía expirada", "La garantía de esta venta ha expirado. No es posible realizar devoluciones.");
        return;
      }
    }

    if (!ventaSeleccionada || !ventaSeleccionada.id) {
      showErrorAlert("Venta requerida", "Selecciona una venta.");
      return;
    }

    if (!ventaSeleccionada.clienteId || Number(ventaSeleccionada.clienteId) <= 0) {
      showErrorAlert("Cliente inválido", "La venta no tiene un cliente asociado válido.");
      return;
    }

    const idsSeleccionados = Object.entries(productosSeleccionados).filter(([_, v]) => v).map(([k]) => Number(k));
    if (idsSeleccionados.length === 0) {
      showErrorAlert("Productos requeridos", "Selecciona al menos un producto.");
      return;
    }

    for (const pid of idsSeleccionados) {
      const prod = ventaSeleccionada?.productos?.find((p: any) => Number(p.id) === pid);
      const maxCant = Number(prod?.cantidad || 0);
      const raw = (cantidadesDevolucion[pid] ?? '').trim();
      const cant = Number(raw);
      if (raw === '' || Number.isNaN(cant) || cant <= 0 || (maxCant > 0 && cant > maxCant)) {
        showErrorAlert("Cantidad inválida", `Cantidad inválida para uno de los productos seleccionados.`);
        return;
      }
    }

    if (!motivoCategoria) {
      showErrorAlert("Motivo requerido", "Selecciona un motivo de devolución.");
      return;
    }

    if (isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      const currentUserId = Number(user.id);

      const items = idsSeleccionados.map((pid) => {
        const prod = ventaSeleccionada?.productos?.find((p: any) => Number(p.id) === pid);
        const precio = Number(prod?.precio || 0);
        const cant = Number(cantidadesDevolucion[pid] || 1);
        return { productoId: pid, cantidad: cant, montoDevuelto: precio * cant };
      });

      await devolucionService.createDevolucionBatch({
        ventaId: Number(ventaSeleccionada.id),
        clienteId: Number(ventaSeleccionada.clienteId),
        usuarioId: currentUserId,
        motivoCategoria,
        observaciones: observaciones || '',
        items
      });

      success("Devolución registrada", "La devolución se ha registrado exitosamente.");
      limpiarFormulario();
    } catch (error) {
      showErrorAlert("Error al registrar", "No se pudo registrar la devolución.");
      console.error(error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const limpiarFormulario = () => {
    setVentaSearchTerm("");
    setVentaSeleccionada(null);
    setProductosSeleccionados({});
    setCantidadesDevolucion({});
    setMotivoCategoria("");
    setObservaciones("");
    setTarjetaInputs({});
    setShowFormErrors(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
      <AlertContainer />

      {/* Master-Detail Layout */}
      <div
        className="grid grid-cols-1 lg:grid-cols-master-detail gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden"
        style={{ gridTemplateRows: 'minmax(0, 1fr)' }}
      >
        {/* LEFT: Form */}
        <aside className="lg:min-h-0 lg:min-w-0">
          <div className="elegante-card h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {/* Section 1: Información Básica */}
              <FormSection
                title="Información Básica"
                icon={<Receipt className="w-4 h-4" />}
                className="space-y-2"
                style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
                headerRight={
                  <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
                    <div className="flex items-center gap-2" style={{ paddingRight: '20px' }}>
                      <span className="text-gray-lightest font-normal">Nº Devolución:</span>
                      <span className="text-gray-lightest font-normal tabular-nums">
                        {numeroDevolucion.toString().padStart(3, "0")}
                      </span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-gray-dark" />
                    <div className="flex items-center gap-2">
                      <span className="text-gray-lightest font-normal">Fecha:</span>
                      <span className="text-gray-lightest font-normal">
                        {formatDate(generateCurrentDate())}
                      </span>
                    </div>
                  </div>
                }
              />

              {/* Section 2: Seleccionar Venta */}
              <>
                  {/* Section 3: Venta */}
                  <FormSection
                    title="Seleccionar Venta"
                    icon={<ShoppingBag className="w-4 h-4" />}
                    className="space-y-2"
                    style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
                  >
                    <div className="space-y-1">
                      <SearchField
                        placeholder="Busca por Nº de venta, cliente o documento..."
                        value={ventaSearchTerm}
                        onChange={(val) => setVentaSearchTerm(val)}
                        onClear={() => {
                          setVentaSearchTerm("");
                          setVentaSeleccionada(null);
                          setProductosSeleccionados({});
                          setCantidadesDevolucion({});
                          setTarjetaInputs({});
                        }}
                        items={ventasDisponibles}
                        filterFn={(v: any, query) => {
                          const q = normalizeSearchText(query);
                          const searchable = normalizeSearchText(
                            [v.id, v.numeroVenta, v.cliente, v.clienteDocumento, v.fecha].join(" ")
                          );
                          return searchable.includes(q);
                        }}
                        renderItem={(venta: any) => {
                          const diasGarantia = getRemainingWarrantyDays(venta.fechaISO);
                          return (
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-gray-lightest font-normal text-sm group-hover:text-orange-secondary transition-colors">
                                  Venta #{venta.numeroVenta} — {venta.cliente}
                                </p>
                                <p className="text-[10px] text-gray-lightest">
                                  {venta.clienteDocumento || "Sin documento"} • {venta.fecha}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-normal text-gray-lightest">${formatCurrency(venta.total)}</p>
                                {diasGarantia !== null && (
                                  <p className={`text-[9px] font-normal ${diasGarantia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {diasGarantia > 0 ? `${diasGarantia} días de garantía` : 'Garantía expirada'}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }}
                        onSelect={(venta: any) => {
                          handleVentaChange(String(venta.id));
                          setVentaSearchTerm(`Venta #${venta.numeroVenta} — ${venta.cliente}`);
                        }}
                        error={showFormErrors && !ventaSeleccionada ? "Debes seleccionar una venta." : undefined}
                        shakeClass={shakeClass}
                        onFocus={clearValidationErrors}
                      />
                    </div>
                  </FormSection>

                  {/* Section 4: Productos de la venta */}
                  {ventaSeleccionada && (
                    <FormSection
                      title="Productos de la Venta"
                      icon={<Package className="w-4 h-4" />}
                      className="space-y-2"
                      style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
                    >
                      <div className="space-y-2">
                        {(ventaSeleccionada.productos || []).length === 0 ? (
                          <p className="text-sm text-gray-lightest italic">Esta venta no tiene productos disponibles para devolución.</p>
                        ) : (
                          (ventaSeleccionada.productos || []).map((producto: any) => {
                            const productoId = Number(producto.id);
                            const isSelected = productosSeleccionados[productoId] || false;
                            const maxCant = Number(producto.cantidad || 0);
                            const cantActual = cantidadesDevolucion[productoId] ?? '1';

                            return (
                              <div
                                key={productoId}
                                className={`rounded-lg px-3 py-2.5 border transition-colors ${
                                  isSelected ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-darker border-gray-dark'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleToggleProductoSeleccion(producto, !!checked)}
                                    disabled={maxCant <= 0}
                                  />
                                  <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                    <ImageRenderer url={producto.imagen || ""} alt={producto.nombre} className="w-full h-full border-0 bg-transparent" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-lightest font-normal text-sm truncate">{producto.nombre}</p>
                                    <p className="text-[10px] text-gray-lightest">
                                      Precio: ${formatCurrency(producto.precio)} • Disponible: {maxCant}
                                    </p>
                                  </div>
                                  {isSelected && maxCant > 0 && (
                                    <div className="flex items-center gap-2">
                                      <Label className="text-gray-lightest text-xs">Cant:</Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={maxCant}
                                        value={cantActual}
                                        onKeyDown={(e) => {
                                          if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') e.preventDefault();
                                        }}
                                        onChange={(e) => handleCantidadProductoChange(producto, e.target.value)}
                                        className="w-14 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                        {showFormErrors && Object.values(productosSeleccionados).filter(Boolean).length === 0 && (
                          <p className="text-xs text-red-400">Selecciona al menos un producto.</p>
                        )}
                      </div>
                    </FormSection>
                  )}
              </>

              {/* Section: Motivo */}
              <FormSection
                title="Motivo de Devolución"
                icon={<AlertCircle className="w-4 h-4" />}
                className="space-y-2"
                style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Motivo *</Label>
                    <Select value={motivoCategoria} onValueChange={(val) => { setMotivoCategoria(val); clearValidationErrors(); }}>
                      <SelectTrigger className={`elegante-input w-full ${showFormErrors && !motivoCategoria ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}>
                        <SelectValue placeholder="Seleccionar motivo..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-darkest border-gray-dark">
                        {MOTIVOS_DEVOLUCION.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-white-primary">{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showFormErrors && !motivoCategoria && (
                      <p className="text-xs text-red-400">Selecciona un motivo.</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Observaciones (opcional)</Label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Detalles adicionales..."
                      rows={3}
                      className="elegante-input w-full resize-none"
                    />
                  </div>
                </div>
              </FormSection>
            </div>

            {/* Action Buttons */}
            <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90 flex justify-end space-x-3">
              <button onClick={onBack} className="elegante-button-secondary">
                Cancelar
              </button>
              <button
                onClick={handleCreateDevolucion}
                disabled={isSubmitting}
                className="elegante-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Registrar Devolución
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT: Detail Panel */}
        <section className="lg:min-h-0 lg:min-w-0 lg:pr-2">
          <DetailPanelDevolucion
            productos={productosParaPanel}
            subtotal={subtotal}
            saldoAFavor={saldoAFavor}
            total={total}
            onRemoveProducto={removeProductoFromPanel}
            getTarjetaInput={getTarjetaInput}
            onTarjetaInputChange={onTarjetaInputChange}
          />
        </section>
      </div>
    </div>
  );
}
