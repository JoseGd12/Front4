import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import {
  DollarSign,
  Search,
  User,
  Package,
  X,
  CreditCard,
  Receipt,
  Plus,
  Scissors,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/select";
import { Label } from "../../../shared/components/ui/label";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { ventaService } from "../services/ventaService";
import { productoService, ApiProducto } from "../../productos/services/productos";
import { barberosService, Barbero as ApiBarbero } from "../../administracion/services/barberosService";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { FormSection } from "../../../shared/components/ui/FormSection";

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

/** Calcula el precio de venta al barbero: precioCompra si > 0, sino precioBase * 0.7 */
const getPrecioBarbero = (producto: ApiProducto): number => {
  const compra = Number(producto.precioCompra ?? 0);
  if (compra > 0) return compra;
  const base = Number(producto.precioBase ?? 0);
  return base > 0 ? Math.round(base * 0.7) : 0;
};

interface ProductoEnCarrito {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  imagen?: string;
}

interface RegistrarVentaBarberoPageProps {
  onBack: () => void;
}

export function RegistrarVentaBarberoPage({ onBack }: RegistrarVentaBarberoPageProps) {
  const { user } = useAuth();
  const { created, error: showErrorAlert, AlertContainer } = useCustomAlert();

  // Data
  const [loading, setLoading] = useState(true);
  const [productosAPI, setProductosAPI] = useState<ApiProducto[]>([]);
  const [barberosAPI, setBarberosAPI] = useState<ApiBarbero[]>([]);
  const [ventasCount, setVentasCount] = useState(0);

  // Form state
  const [barberoId, setBarberoId] = useState<number | null>(null);
  const [barberoNombre, setBarberoNombre] = useState("");
  const [barberoSearchTerm, setBarberoSearchTerm] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [fecha, setFecha] = useState("");
  const [productos, setProductos] = useState<ProductoEnCarrito[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [cantidadInput, setCantidadInput] = useState("1");

  // Validation
  const [showErrors, setShowErrors] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shakeClass = validationAttempt % 2 === 0 ? "input-required-shake-a" : "input-required-shake-b";

  const generateCurrentDate = () => new Date().toISOString().split("T")[0] || "";

  useEffect(() => {
    loadData();
    setFecha(generateCurrentDate());
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ventasData, productosData, barberosData] = await Promise.all([
        ventaService.getVentas().catch(() => []),
        productoService.getProductos().catch(() => []),
        barberosService.getBarberos().catch(() => []),
      ]);

      const maxNumVenta =
        Array.isArray(ventasData) && ventasData.length > 0
          ? Math.max(...ventasData.map((v: any) => Number(v.numeroVenta || v.id) || 0))
          : 0;
      setVentasCount(maxNumVenta);

      // Solo productos activos con stock > 0
      setProductosAPI(
        (productosData || []).filter((p: ApiProducto) => p.activo && (p.stock ?? p.cantidad ?? 0) > 0)
      );

      // Barberos activos
      const barberos = Array.isArray(barberosData)
        ? barberosData
            .map((b: any) => barberosService.mapApiToComponent(b))
            .filter((b: ApiBarbero) => b.status === "active" || b.estado === true)
        : [];
      setBarberosAPI(barberos);
    } catch (err: any) {
      showErrorAlert("Error al cargar datos", "No se pudieron cargar los datos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const numeroVenta = useMemo(() => ventasCount + 1, [ventasCount]);

  // Producto seleccionado en el buscador
  const productoInfo = useMemo(
    () => productosAPI.find((p) => p.id.toString() === productoSeleccionado),
    [productoSeleccionado, productosAPI]
  );

  const cantidadNum = Math.max(1, Math.floor(Number(cantidadInput) || 1));

  const isStockExceeded = useMemo(() => {
    if (!productoInfo) return false;
    const yaAgregado = productos.find((p) => p.id === productoSeleccionado);
    const cantYa = yaAgregado ? yaAgregado.cantidad : 0;
    return cantidadNum + cantYa > (productoInfo.stock ?? productoInfo.cantidad ?? 0);
  }, [productoInfo, cantidadNum, productos, productoSeleccionado]);

  const agregarProducto = () => {
    if (!productoSeleccionado || !productoInfo) {
      setShowErrors(true);
      setValidationAttempt((p) => p + 1);
      return;
    }
    if (isStockExceeded) {
      setValidationAttempt((p) => p + 1);
      return;
    }

    const precio = getPrecioBarbero(productoInfo);
    const existente = productos.find((p) => p.id === productoSeleccionado);

    if (existente) {
      setProductos(
        productos.map((p) =>
          p.id === productoSeleccionado
            ? { ...p, cantidad: p.cantidad + cantidadNum }
            : p
        )
      );
    } else {
      setProductos([
        ...productos,
        {
          id: productoInfo.id.toString(),
          nombre: productoInfo.nombre,
          cantidad: cantidadNum,
          precio,
          imagen: productoInfo.imagenProduc || "",
        },
      ]);
    }

    setProductoSeleccionado("");
    setProductSearchTerm("");
    setCantidadInput("1");
    setShowErrors(false);
  };

  const eliminarProducto = (id: string) => {
    setProductos(productos.filter((p) => p.id !== id));
  };

  const actualizarCantidad = (id: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    const prod = productosAPI.find((p) => p.id.toString() === id);
    if (prod && nuevaCantidad > (prod.stock ?? prod.cantidad ?? 0)) {
      showErrorAlert(
        "Stock insuficiente",
        `Stock disponible: ${prod.stock ?? prod.cantidad ?? 0} unidades.`
      );
      return;
    }
    setProductos(productos.map((p) => (p.id === id ? { ...p, cantidad: nuevaCantidad } : p)));
  };

  // Totales
  const subtotal = useMemo(
    () => productos.reduce((sum, p) => sum + p.precio * p.cantidad, 0),
    [productos]
  );
  const total = subtotal;

  // Barberos filtrados por búsqueda
  const barberosFiltrados = useMemo(() => {
    if (!barberoSearchTerm.trim()) return barberosAPI;
    const term = normalizeSearchText(barberoSearchTerm);
    return barberosAPI.filter((b) =>
      normalizeSearchText(`${b.nombre} ${b.apellido ?? ""}`).includes(term)
    );
  }, [barberosAPI, barberoSearchTerm]);

  // Productos filtrados por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!productSearchTerm.trim()) return productosAPI;
    const term = normalizeSearchText(productSearchTerm);
    return productosAPI.filter((p) =>
      normalizeSearchText(p.nombre).includes(term)
    );
  }, [productosAPI, productSearchTerm]);

  const [barberoDropdownOpen, setBarberoDropdownOpen] = useState(false);
  const [productoDropdownOpen, setProductoDropdownOpen] = useState(false);

  const handleSubmit = async () => {
    setShowErrors(true);
    setValidationAttempt((p) => p + 1);

    if (!user?.id) {
      showErrorAlert("Error de sesión", "No se ha identificado el usuario responsable.");
      return;
    }
    if (!barberoId) {
      showErrorAlert("Datos incompletos", "Por favor selecciona un barbero.");
      return;
    }
    if (!metodoPago) {
      showErrorAlert("Datos incompletos", "Por favor selecciona el método de pago.");
      return;
    }
    if (productos.length === 0) {
      showErrorAlert("Venta vacía", "Debes agregar al menos un producto.");
      return;
    }

    try {
      setIsSubmitting(true);
      const productosTexto = productos.map((p) => `${p.nombre} (x${p.cantidad})`).join(", ");

      await ventaService.createVenta({
        numeroVenta: ventasCount + 1,
        tipoVenta: "Barbero",
        clienteId: null,
        clienteDocumento: "",
        fecha,
        servicios: "Ninguno",
        productos: productosTexto,
        subtotal,
        iva: 0,
        descuento: 0,
        total,
        barberoId,
        barberoNombre,
        usuarioId: Number(user.id),
        estado: "Completada",
        metodoPago,
        garantiaMeses: 0,
        productosDetalle: productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          cantidad: p.cantidad,
          precio: p.precio,
        })),
        serviciosDetalle: [],
      });

      created(
        "Venta registrada",
        `Venta al barbero ${barberoNombre} por $${formatCurrency(total)} registrada exitosamente.`
      );
      setTimeout(() => onBack(), 1500);
    } catch (err: any) {
      showErrorAlert("Error al registrar la venta", err?.message || "Error desconocido");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "var(--orange-primary)", borderTopColor: "transparent" }} />
          <p style={{ color: "var(--gray-lightest)" }}>Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
      <AlertContainer />

      <div
        className="grid grid-cols-1 lg:grid-cols-master-detail gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden"
        style={{ gridTemplateRows: "minmax(0, 1fr)" }}
      >
        {/* Formulario izquierdo */}
        <aside className="lg:min-h-0 lg:min-w-0">
          <div className="elegante-card h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-5">

              {/* Encabezado */}
              <FormSection
                title="Venta a Barbero"
                icon={<Scissors className="w-4 h-4" />}
                headerRight={
                  <div className="flex items-center gap-4 text-sm" style={{ color: "var(--gray-lightest)" }}>
                    <span>Fecha: {formatDate(fecha)}</span>
                    <span>Venta #{(ventasCount + 1).toString().padStart(3, "0")}</span>
                  </div>
                }
              />

              {/* Selector de barbero */}
              <FormSection title="Barbero" icon={<User className="w-4 h-4" />}>
                <div className="space-y-2">
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--gray-lightest)" }} />
                        <input
                          type="text"
                          placeholder="Buscar barbero..."
                          value={barberoSearchTerm}
                          onChange={(e) => {
                            setBarberoSearchTerm(e.target.value);
                            setBarberoDropdownOpen(true);
                            if (!e.target.value) {
                              setBarberoId(null);
                              setBarberoNombre("");
                            }
                          }}
                          onFocus={() => setBarberoDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setBarberoDropdownOpen(false), 150)}
                          className={`elegante-input w-full pl-9 pr-4 py-2 text-sm ${showErrors && !barberoId ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}
                        />
                      </div>
                      {barberoId && (
                        <button
                          type="button"
                          onClick={() => { setBarberoId(null); setBarberoNombre(""); setBarberoSearchTerm(""); }}
                          className="p-1.5 rounded hover:bg-gray-medium transition-colors"
                        >
                          <X className="w-4 h-4" style={{ color: "var(--gray-lightest)" }} />
                        </button>
                      )}
                    </div>

                    {barberoDropdownOpen && barberosFiltrados.length > 0 && !barberoId && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border shadow-lg overflow-hidden max-h-48 overflow-y-auto" style={{ backgroundColor: "var(--gray-darker)", borderColor: "var(--gray-medium)" }}>
                        {barberosFiltrados.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onMouseDown={() => {
                              setBarberoId(Number(b.id));
                              setBarberoNombre(`${b.nombre} ${b.apellido ?? ""}`.trim());
                              setBarberoSearchTerm(`${b.nombre} ${b.apellido ?? ""}`.trim());
                              setBarberoDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-left hover:bg-gray-medium transition-colors"
                            style={{ color: "var(--gray-lightest)" }}
                          >
                            <User className="w-4 h-4 flex-shrink-0" style={{ color: "var(--orange-primary)" }} />
                            <span>{b.nombre} {b.apellido}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {barberoId && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm" style={{ backgroundColor: "var(--gray-medium)", color: "var(--gray-lightest)" }}>
                      <User className="w-4 h-4" style={{ color: "var(--orange-primary)" }} />
                      <span className="font-medium">{barberoNombre}</span>
                    </div>
                  )}

                  {showErrors && !barberoId && (
                    <p className="text-xs text-red-400 animate-pulse">Selecciona un barbero</p>
                  )}
                </div>
              </FormSection>

              {/* Método de pago */}
              <FormSection title="Método de Pago" icon={<CreditCard className="w-4 h-4" />}>
                <div className="space-y-2">
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger className={`elegante-input ${showErrors && !metodoPago ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}>
                      <SelectValue placeholder="Selecciona método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CreditoBarbero">Crédito Barbero</SelectItem>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Nequi">Nequi</SelectItem>
                      <SelectItem value="Daviplata">Daviplata</SelectItem>
                    </SelectContent>
                  </Select>
                  {showErrors && !metodoPago && (
                    <p className="text-xs text-red-400 animate-pulse">Selecciona un método de pago</p>
                  )}
                  {metodoPago === "CreditoBarbero" && (
                    <p className="text-xs px-2 py-1 rounded" style={{ color: "var(--orange-primary)", backgroundColor: "color-mix(in srgb, var(--orange-primary) 10%, transparent)" }}>
                      La deuda se registrara en el credito del barbero al precio de compra.
                    </p>
                  )}
                </div>
              </FormSection>

              {/* Agregar productos */}
              <FormSection title="Productos" icon={<Package className="w-4 h-4" />}>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--gray-lightest)" }} />
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={productSearchTerm}
                        onChange={(e) => {
                          setProductSearchTerm(e.target.value);
                          setProductoSeleccionado("");
                          setProductoDropdownOpen(true);
                        }}
                        onFocus={() => setProductoDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setProductoDropdownOpen(false), 150)}
                        className="elegante-input w-full pl-9 pr-4 py-2 text-sm"
                      />
                      {productoDropdownOpen && productosFiltrados.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border shadow-lg overflow-hidden max-h-48 overflow-y-auto" style={{ backgroundColor: "var(--gray-darker)", borderColor: "var(--gray-medium)" }}>
                          {productosFiltrados.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={() => {
                                setProductoSeleccionado(p.id.toString());
                                setProductSearchTerm(p.nombre);
                                setProductoDropdownOpen(false);
                              }}
                              className="flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-gray-medium transition-colors"
                              style={{ color: "var(--gray-lightest)" }}
                            >
                              <span>{p.nombre}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: "var(--orange-primary)" }}>${formatCurrency(getPrecioBarbero(p))}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--gray-medium)" }}>Stock: {p.stock ?? p.cantidad ?? 0}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        value={cantidadInput}
                        onChange={(e) => setCantidadInput(e.target.value)}
                        className="elegante-input w-16 text-center text-sm"
                        placeholder="Cant."
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={agregarProducto}
                      disabled={!productoSeleccionado || isStockExceeded}
                      className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{ backgroundColor: "var(--orange-primary)", color: "white" }}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </Button>
                  </div>

                  {isStockExceeded && productoSeleccionado && (
                    <p className="text-xs text-red-400">Stock insuficiente para la cantidad solicitada.</p>
                  )}

                  {showErrors && productos.length === 0 && (
                    <p className="text-xs text-red-400 animate-pulse">Agrega al menos un producto</p>
                  )}
                </div>
              </FormSection>

            </div>

            {/* Footer con botones */}
            <div className="p-4 border-t" style={{ borderColor: "var(--gray-medium)" }}>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={onBack}
                  variant="outline"
                  className="elegante-btn-secondary px-4 py-2 text-sm"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || productos.length === 0}
                  className="px-6 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{ backgroundColor: "var(--orange-primary)", color: "white", opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? "Registrando..." : "Registrar Venta"}
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Panel derecho: carrito */}
        <div className="elegante-card h-full min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--gray-medium)" }}>
            <Receipt className="w-4 h-4" style={{ color: "var(--orange-primary)" }} />
            <h3 className="text-base font-semibold text-white-primary">Resumen de la Venta</h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
            {productos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <Package className="w-10 h-10" style={{ color: "var(--gray-medium)" }} />
                <p className="text-sm" style={{ color: "var(--gray-lightest)" }}>Sin productos agregados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {productos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: "var(--gray-medium)" }}
                  >
                    {p.imagen ? (
                      <img src={p.imagen} alt={p.nombre} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--gray-darker)" }}>
                        <Package className="w-5 h-5" style={{ color: "var(--gray-lightest)" }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--gray-lightest)" }}>{p.nombre}</p>
                      <p className="text-xs" style={{ color: "var(--orange-primary)" }}>${formatCurrency(p.precio)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => actualizarCantidad(p.id, p.cantidad - 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-darker transition-colors"
                        style={{ color: "var(--gray-lightest)" }}
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums" style={{ color: "var(--gray-lightest)" }}>{p.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => actualizarCantidad(p.id, p.cantidad + 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-darker transition-colors"
                        style={{ color: "var(--gray-lightest)" }}
                      >
                        +
                      </button>
                      <span className="w-20 text-right text-sm font-medium tabular-nums" style={{ color: "var(--gray-lightest)" }}>
                        ${formatCurrency(p.precio * p.cantidad)}
                      </span>
                      <button
                        type="button"
                        onClick={() => eliminarProducto(p.id)}
                        className="p-1 rounded hover:bg-red-500/20 transition-colors ml-1"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t space-y-2" style={{ borderColor: "var(--gray-medium)" }}>
            <div className="flex justify-between text-sm" style={{ color: "var(--gray-lightest)" }}>
              <span>Subtotal</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span style={{ color: "var(--gray-lightest)" }}>Total</span>
              <span style={{ color: "var(--orange-primary)" }}>${formatCurrency(total)}</span>
            </div>
            {metodoPago === "CreditoBarbero" && barberoNombre && (
              <p className="text-xs pt-1" style={{ color: "var(--gray-lightest)" }}>
                Se registrara como deuda de <strong>{barberoNombre}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
