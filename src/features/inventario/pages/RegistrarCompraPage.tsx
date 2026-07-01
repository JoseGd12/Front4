import React, { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "../../../shared/components/ui/input";
import {
  Calendar,
  CreditCard,
  Receipt,
  Hash,
  Calculator,
  Building,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { Label } from "../../../shared/components/ui/label";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { compraService, CreateCompraRequest } from "../services/compraService";
import { proveedorService, Proveedor } from "../services/proveedorService";
import { insumosService, Insumo } from "../services/insumosService";
import { categoriaService } from "../services/categoriaService";
import { productoService } from "../../productos/services/productos";
import { apiService, ApiUser } from "../../../shared/services/api";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { FormSection } from "../../../shared/components/ui/FormSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { DetailPanelCompra } from "../components/DetailPanelCompra";
import { useAuth } from "../../../shared/contexts/AuthContext";

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

const getPrecioCompra = (p: any): number => {
  const candidates = [p?.precioCompra, p?.PrecioCompra, p?.precio_compra];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && !Number.isNaN(n)) return n;
  }
  return 0;
};

const getPrecioVenta = (p: any): number => {
  const candidates = [p?.precioVenta, p?.PrecioVenta, p?.precioBase, p?.PrecioBase, p?.precio];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && !Number.isNaN(n)) return n;
  }
  return 0;
};

const getCategoriaNombre = (p: any): string => {
  const c = p?.categoria;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object') return String(c.nombre || c.Nombre || '');
  return String(p?.categoriaNombre || p?.CategoriaNombre || '');
};

const generateCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface RegistrarCompraPageProps {
  onBack: () => void;
  initialProducto?: string;
}

export function RegistrarCompraPage({ onBack, initialProducto }: RegistrarCompraPageProps) {
  const { user } = useAuth();
  const {
    created,
    error: showErrorAlert,
    AlertContainer,
  } = useCustomAlert();

  // Data loading
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Insumo[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [comprasCount, setComprasCount] = useState(0);

  // Form state
  const inicialNuevaCompra = {
    proveedorId: 0,
    metodoPago: "",
    fechaRegistro: generateCurrentDate(),
    fechaFactura: "",
    numeroRecibo: "",
    porcentajeDescuento: 0,
    productos: [] as Array<{
      id: number;
      nombre: string;
      cantidad: number;
      precio: number;
      precioVenta?: number;
      imagen?: string;
      categoria?: string;
    }>,
  };

  const [nuevaCompra, setNuevaCompra] = useState(inicialNuevaCompra);

  // Tarjeta inputs tracking (for editable fields in DetailPanel)
  const [tarjetaInputs, setTarjetaInputs] = useState<
    Record<number, {
      cantidad?: string;
      precio?: string;
      precioVenta?: string;
    }>
  >({});

  // Product addition state
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState(0);

  // Proveedor search state
  const [proveedorSearchTerm, setProveedorSearchTerm] = useState("");

  // Discount input
  const [porcentajeDescuentoInput, setPorcentajeDescuentoInput] = useState("");
  const [showDiscountWarning, setShowDiscountWarning] = useState(false);

  // Validation
  const [showCompraFormErrors, setShowCompraFormErrors] = useState(false);
  const [showAddProductoErrors, setShowAddProductoErrors] = useState(false);
  const [compraValidationAttempt, setCompraValidationAttempt] = useState(0);
  const shakeClass = compraValidationAttempt % 2 === 0 ? "input-required-shake-a" : "input-required-shake-b";

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Derived validation states
  const noProductosAgregados = (nuevaCompra.productos?.length || 0) === 0;
  const showProductoSelectorError =
    (showCompraFormErrors && noProductosAgregados && !productoSeleccionado) ||
    (showAddProductoErrors && !productoSeleccionado);

  const numeroCompra = useMemo(() => {
    return comprasCount + 1;
  }, [comprasCount]);

  const clearValidationErrors = () => {
    if (showCompraFormErrors) setShowCompraFormErrors(false);
    if (showAddProductoErrors) setShowAddProductoErrors(false);
  };

  // --- Data loading ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [proveedoresData, productosResponse, categoriasData, comprasResponse, usuariosData] =
          await Promise.all([
            proveedorService.getProveedores(1, 100).catch(() => []),
            productoService.getProductosPaged({ page: 1, pageSize: 500 }).catch(() => ({ items: [], totalCount: 0 })),
            categoriaService.getCategoriasPaged(1, 100).catch(() => ({ items: [], totalCount: 0 })),
            compraService.getCompras(1, 100).catch(() => []),
            apiService.getUsuarios().catch(() => []),
          ]);

        // Proveedores
        const filtrados = (proveedoresData || []).filter(
          (p: any) => p.nombre && p.estado !== false && p.activo !== false
        );
        setProveedores(filtrados);

        // Productos enriquecidos con categoría
        const lista = ((productosResponse as any).items || []).filter((p: any) => p.activo === true);
        const categoriasById = new Map<number, string>();
        const categoriasList = (categoriasData as any).items || [];
        categoriasList.forEach((c: any) => {
          const id = Number(c?.id ?? 0);
          if (id && c?.nombre) categoriasById.set(id, String(c.nombre));
        });
        const enriquecidos = lista.map((p: any) => {
          const cat = p?.categoria;
          if (cat && typeof cat === "object" && cat.id && !String(cat.nombre || "").trim() && categoriasById.has(cat.id)) {
            return { ...p, categoria: { ...cat, nombre: categoriasById.get(cat.id) || cat.nombre } };
          }
          return p;
        });
        setProductos(enriquecidos);

        // Compras count
        const comprasData = (comprasResponse as any).items || comprasResponse || [];
        const maxId = (comprasData || []).reduce((max: number, compra: any) => {
          const id = Number(compra?.id ?? 0);
          return Number.isFinite(id) && id > max ? id : max;
        }, 0);
        setComprasCount(maxId);
        setNuevaCompra((prev) => ({ ...prev, numeroRecibo: String(maxId + 1) }));

        // Usuarios
        setUsers(usuariosData || []);
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Pre-select product when coming from dashboard low stock
  useEffect(() => {
    if (!initialProducto || productos.length === 0) return;
    const found = productos.find(
      (p) => String(p.nombre || "").toLowerCase().trim() === initialProducto.toLowerCase().trim()
    );
    if (found) {
      setProductSearchTerm(found.nombre || initialProducto);
      setProductoSeleccionado(String(found.id));
    }
  }, [initialProducto, productos]);

  // Auto-fill precio when product selected
  useEffect(() => {
    if (productoSeleccionado) {
      const prod = productos.find((p) => p.id === Number(productoSeleccionado));
      (async () => {
        let pc = 0;
        if (prod) pc = getPrecioCompra(prod as any);
        if (!pc || pc <= 0) {
          try {
            const full = await productoService.getProductoById(Number(productoSeleccionado));
            pc = getPrecioCompra(full as any);
          } catch {}
        }
        setPrecioUnitario(pc || 0);
      })();
    } else {
      setPrecioUnitario(0);
    }
  }, [productoSeleccionado, productos]);

  // --- Calculations ---
  const calcularSubtotal = () => {
    if (!nuevaCompra.productos || !Array.isArray(nuevaCompra.productos)) return 0;
    return nuevaCompra.productos.reduce((total, p) => total + p.precio * p.cantidad, 0);
  };

  const calcularDescuento = (subtotal: number) => {
    return subtotal * (nuevaCompra.porcentajeDescuento / 100);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento(subtotal);
    return subtotal - descuento;
  };

  // --- Input handlers ---
  const handlePorcentajeDescuentoInputChange = (valor: string) => {
    if (valor.trim() === "") {
      setPorcentajeDescuentoInput("");
      setNuevaCompra({ ...nuevaCompra, porcentajeDescuento: 0 });
      return;
    }
    const numero = Number(valor);
    if (!Number.isNaN(numero)) {
      if (numero > 100) {
        setPorcentajeDescuentoInput("100");
        setNuevaCompra({ ...nuevaCompra, porcentajeDescuento: 100 });
        setShowDiscountWarning(true);
      } else {
        setPorcentajeDescuentoInput(valor);
        setNuevaCompra({ ...nuevaCompra, porcentajeDescuento: Math.max(0, numero) });
        setShowDiscountWarning(false);
      }
    } else {
      setPorcentajeDescuentoInput(valor);
      setShowDiscountWarning(false);
    }
  };

  // --- Product management ---
  const agregarProducto = () => {
    try {
      const cantidadAgregar = 1;

      if (!productoSeleccionado) {
        setShowAddProductoErrors(true);
        setCompraValidationAttempt((prev) => prev + 1);
        return;
      }

      const producto = productos.find((p) => p.id === Number(productoSeleccionado));
      if (!producto) {
        setShowAddProductoErrors(true);
        setCompraValidationAttempt((prev) => prev + 1);
        return;
      }

      const productosActuales = nuevaCompra.productos || [];
      const existeProducto = productosActuales.find((p) => p.id === producto.id);
      const precioCompraInicial = precioUnitario > 0 ? precioUnitario : getPrecioCompra(producto);

      if (existeProducto) {
        const cantidadActualizada = existeProducto.cantidad + cantidadAgregar;
        const precioActualizado = existeProducto.precio > 0 ? existeProducto.precio : precioCompraInicial;
        setNuevaCompra({
          ...nuevaCompra,
          productos: productosActuales.map((p) =>
            p.id === producto.id
              ? { ...p, cantidad: cantidadActualizada, precio: precioActualizado, precioVenta: (p as any).precioVenta ?? getPrecioVenta(producto) }
              : p
          ),
        });
        setTarjetaInputs((prev) => ({
          ...prev,
          [producto.id]: {
            cantidad: String(cantidadActualizada),
            precio: prev[producto.id]?.precio ?? String(precioActualizado),
            precioVenta: prev[producto.id]?.precioVenta ?? String((existeProducto as any)?.precioVenta ?? getPrecioVenta(producto)),
          },
        }));
      } else {
        const precioVentaInicial = getPrecioVenta(producto);
        setNuevaCompra({
          ...nuevaCompra,
          productos: [
            ...productosActuales,
            {
              id: producto.id,
              nombre: producto.nombre,
              cantidad: cantidadAgregar,
              precio: precioCompraInicial,
              precioVenta: precioVentaInicial,
              imagen: (producto as any).imagen ?? (producto as any).imagenProduc ?? "",
              categoria:
                (producto as any).categoria && typeof (producto as any).categoria === "object"
                  ? (producto as any).categoria.nombre || ""
                  : (producto as any).categoria ?? "",
            },
          ],
        });
        setTarjetaInputs((prev) => ({
          ...prev,
          [producto.id]: {
            cantidad: String(cantidadAgregar),
            precio: String(precioCompraInicial),
            precioVenta: String(precioVentaInicial),
          },
        }));
      }

      // Reset product addition fields
      setProductoSeleccionado("");
      setProductSearchTerm("");
      setPrecioUnitario(0);
      setShowAddProductoErrors(false);
      setShowCompraFormErrors(false);
    } catch (err) {
      console.error("Error al agregar producto:", err);
      showErrorAlert("Error inesperado", "No se pudo agregar el producto. Intenta nuevamente.");
    }
  };

  const eliminarProducto = (productId: number) => {
    setNuevaCompra({
      ...nuevaCompra,
      productos: (nuevaCompra.productos || []).filter((p) => p.id !== productId),
    });
    setTarjetaInputs((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // --- Tarjeta input management (for DetailPanel editable fields) ---
  const getTarjetaInput = (
    producto: { id: number; cantidad: number; precio: number; precioVenta?: number },
    campo: "cantidad" | "precio" | "precioVenta"
  ) => {
    return tarjetaInputs[producto.id]?.[campo] ?? "";
  };

  const actualizarTarjetaInput = (
    productId: number,
    campo: "cantidad" | "precio" | "precioVenta",
    valor: string
  ) => {
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [campo]: valor },
    }));

    if (valor.trim() === "") return;
    const numero = Number(valor);
    if (Number.isNaN(numero)) return;

    if (campo === "cantidad" && numero >= 1) { actualizarCantidadProducto(productId, numero); return; }
    if (campo === "precio" && numero >= 0) { actualizarPrecioProducto(productId, numero); return; }
    if (campo === "precioVenta" && numero >= 0) { actualizarPrecioVentaProducto(productId, numero); }
  };

  const actualizarCantidadProducto = (productId: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    setNuevaCompra({
      ...nuevaCompra,
      productos: (nuevaCompra.productos || []).map((p) =>
        p.id === productId ? { ...p, cantidad: nuevaCantidad } : p
      ),
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], cantidad: String(nuevaCantidad) },
    }));
  };

  const actualizarPrecioProducto = (productId: number, nuevoPrecio: number) => {
    if (nuevoPrecio < 0) return;
    setNuevaCompra({
      ...nuevaCompra,
      productos: (nuevaCompra.productos || []).map((p) => (p.id === productId ? { ...p, precio: nuevoPrecio } : p)),
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], precio: String(nuevoPrecio) },
    }));
  };

  const actualizarPrecioVentaProducto = (productId: number, nuevoPrecioVenta: number) => {
    if (nuevoPrecioVenta < 0) return;
    setNuevaCompra({
      ...nuevaCompra,
      productos: (nuevaCompra.productos || []).map((p) => (p.id === productId ? { ...p, precioVenta: nuevoPrecioVenta } : p)),
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], precioVenta: String(nuevoPrecioVenta) },
    }));
  };

  // --- Submit ---
  const handleCreateCompra = async () => {
    if (isSubmittingRef.current) return;
    setShowCompraFormErrors(true);
    setCompraValidationAttempt((prev) => prev + 1);

    if (!user || !user.email) {
      showErrorAlert("Error de sesión", "No se ha identificado el usuario responsable. Por favor inicie sesión nuevamente.");
      return;
    }

    if (!nuevaCompra.proveedorId || !nuevaCompra.metodoPago || !nuevaCompra.fechaFactura || !nuevaCompra.numeroRecibo?.trim() || nuevaCompra.productos.length === 0) {
      showErrorAlert(
        "Campos obligatorios",
        !nuevaCompra.numeroRecibo?.trim()
          ? "Por favor ingresa el número de recibo."
          : "Por favor completa la fecha de factura, el método de pago, selecciona un proveedor y agrega al menos un producto."
      );
      return;
    }

    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento(subtotal);

    const resolveUsuarioId = async (): Promise<number> => {
      const numericId = Number(user.id);
      if (Number.isFinite(numericId) && numericId > 0) return numericId;
      const byList = (users || []).find(
        (u) => String(u.correo || "").toLowerCase() === String(user.email || "").toLowerCase()
      );
      if (byList?.id && Number.isFinite(Number(byList.id))) return Number(byList.id);
      try {
        const all = await apiService.getUsuarios();
        const matched = (all || []).find(
          (u) => String(u.correo || "").toLowerCase() === String(user.email || "").toLowerCase()
        );
        if (matched?.id && Number.isFinite(Number(matched.id))) return Number(matched.id);
      } catch {}
      return 0;
    };

    const usuarioIdNum = await resolveUsuarioId();
    if (!Number.isFinite(usuarioIdNum) || usuarioIdNum <= 0) {
      showErrorAlert(
        "Usuario no registrado en la API",
        "Tu sesión está activa pero no se pudo vincular tu cuenta con el sistema. Cierra sesión y vuelve a ingresar."
      );
      return;
    }

    const compraRequest: CreateCompraRequest = {
      proveedorId: Number(nuevaCompra.proveedorId),
      fecha: nuevaCompra.fechaRegistro || generateCurrentDate(),
      fechaFactura: nuevaCompra.fechaFactura,
      numeroRecibo: nuevaCompra.numeroRecibo.trim(),
      metodoPago: nuevaCompra.metodoPago,
      iva: 0,
      descuento: descuento,
      usuarioId: usuarioIdNum,
      detalles: nuevaCompra.productos.map((p) => ({
        productoId: p.id,
        cantidad: p.cantidad,
        precioUnitario: p.precio,
      })),
    };

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const compraCreada = await compraService.createCompra(compraRequest);

      // Update product prices
      try {
        const updates = nuevaCompra.productos.map(async (p) => {
          const full = await productoService.getProductoById(p.id);
          if (!full) return;
          const precioVentaFinal = (p as any).precioVenta !== undefined ? Number((p as any).precioVenta) : (full as any).precioVenta;
          const precioCompraFinal = Number(p.precio);
          const categoriaName = typeof full.categoria === "string" ? full.categoria : full.categoria?.nombre || "";
          await productoService.updateProducto(p.id, {
            ...full,
            categoria: categoriaName || full.categoria || null,
            precioVenta: precioVentaFinal,
            precioCompra: precioCompraFinal,
          } as any);
        });
        await Promise.allSettled(updates);
      } catch {}

      const compraIdCreada = Number((compraCreada as any)?.id ?? 0);
      created(
        "Compra creada",
        `La compra #${compraIdCreada > 0 ? compraIdCreada : numeroCompra} ha sido registrada exitosamente.`
      );

      // Clear session cache so ComprasPage reloads fresh data
      sessionStorage.removeItem("compras_cache");

      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error: any) {
      const msg = String(error?.message || "Error al crear compra");
      const description = msg.includes("El usuario no existe")
        ? "No se reconoció tu usuario en el sistema. Cierra sesión y vuelve a ingresar."
        : msg || "Hubo un problema al guardar la compra.";
      showErrorAlert("Error al crear compra", description);
      console.error(error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
      {AlertContainer}

      {/* Master-Detail Layout */}
      <div
        className="grid grid-cols-1 lg:grid-cols-master-detail gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden"
        style={{ gridTemplateRows: "minmax(0, 1fr)" }}
      >
        {/* LEFT: Form */}
        <aside className="lg:min-h-0 lg:min-w-0">
          <div className="elegante-card lg:h-full lg:min-h-0 flex flex-col lg:overflow-hidden">
            <div className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scrollbar p-4" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {/* Section 1: Información Básica */}
            <FormSection
              title="Información Básica"
              icon={<Receipt className="w-4 h-4" />}
              className="space-y-2 py-2"
              headerRight={
                <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-lightest font-normal text-xs sm:text-sm">
                      Nº Recibo:*
                    </span>
                    <div className="relative flex flex-col">
                      <Input
                        value={nuevaCompra.numeroRecibo}
                        onChange={(e) => {
                          setNuevaCompra((prev) => ({
                            ...prev,
                            numeroRecibo: e.target.value.slice(0, 20),
                          }));
                          clearValidationErrors();
                        }}
                        maxLength={20}
                        style={{ width: "110px", height: "26px", padding: "2px 8px", fontSize: "12px" }}
                        className={`elegante-input ${showCompraFormErrors && !nuevaCompra.numeroRecibo.trim()
                          ? `border-red-500 ring-1 ring-red-500 ${shakeClass}`
                          : ""
                          }`}
                        placeholder="Nº recibo"
                      />
                      {showCompraFormErrors && !nuevaCompra.numeroRecibo.trim() && (
                        <span className="absolute top-[28px] left-0 text-[10px] text-red-400 whitespace-nowrap leading-none mt-1 animate-pulse font-medium">
                          campo obligatorio
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-gray-lightest font-normal text-xs sm:text-sm">
                      Nº Compra:
                    </span>
                    <span className="text-gray-lightest font-medium tabular-nums text-xs sm:text-sm">
                      {numeroCompra}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-gray-lightest font-normal text-xs sm:text-sm">
                      Fecha:
                    </span>
                    <span className="text-gray-lightest font-medium text-xs sm:text-sm">
                      {formatDate(nuevaCompra.fechaRegistro || generateCurrentDate())}
                    </span>
                  </div>
                </div>
              }
            />

            {/* Section 2: Fecha Factura y Método de Pago */}
            <FormSection
              title="Datos de Factura"
              icon={<FileText className="w-4 h-4" />}
              className="space-y-2"
              style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-lightest text-xs">Fecha de Factura *</Label>
                  <Input
                    type="date"
                    value={nuevaCompra.fechaFactura}
                    min={(() => {
                      const now = new Date();
                      const prev = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                      return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
                    })()}
                    max={generateCurrentDate()}
                    onChange={(e) => {
                      const val = e.target.value;
                      const max = generateCurrentDate();
                      const now = new Date();
                      const prev = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                      const min = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
                      if (!val) {
                        setNuevaCompra({ ...nuevaCompra, fechaFactura: "" });
                        return;
                      }
                      const clamped = val < min ? min : val > max ? max : val;
                      setNuevaCompra({ ...nuevaCompra, fechaFactura: clamped });
                    }}
                    onFocus={clearValidationErrors}
                    className={`elegante-input ${showCompraFormErrors && !nuevaCompra.fechaFactura ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}
                  />
                  {showCompraFormErrors && !nuevaCompra.fechaFactura && (
                    <p className="text-xs text-red-400 mt-1">Este campo es obligatorio.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-lightest text-xs">Método de Pago *</Label>
                  <Select
                    value={nuevaCompra.metodoPago || undefined}
                    onValueChange={(val) => {
                      setNuevaCompra({ ...nuevaCompra, metodoPago: val });
                      clearValidationErrors();
                    }}
                  >
                    <SelectTrigger className={`elegante-input w-full ${showCompraFormErrors && !nuevaCompra.metodoPago ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}>
                      <SelectValue placeholder="Seleccionar método..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-darkest border-gray-dark">
                      <SelectItem value="Efectivo" className="text-white-primary">Efectivo</SelectItem>
                      <SelectItem value="Tarjeta" className="text-white-primary">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCompraFormErrors && !nuevaCompra.metodoPago && (
                    <p className="text-xs text-red-400 mt-1">Este campo es obligatorio.</p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Section 3: Proveedor y Descuento */}
            <FormSection
              title="Proveedor"
              icon={<Building className="w-4 h-4" />}
              className="space-y-2"
              style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-lightest text-xs">Proveedor *</Label>
                  <SearchField
                    placeholder="Escribe para buscar un proveedor..."
                    value={proveedorSearchTerm}
                    onChange={(val) => setProveedorSearchTerm(val)}
                    onClear={() => {
                      setProveedorSearchTerm("");
                      setNuevaCompra({ ...nuevaCompra, proveedorId: 0 });
                    }}
                    items={proveedores}
                    filterFn={(p, query) => {
                      const q = normalizeSearchText(query);
                      const searchable = normalizeSearchText(
                        [p.id, p.nombre, p.nit, p.correo].join(" ")
                      );
                      return searchable.includes(q);
                    }}
                    renderItem={(proveedor) => (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white-primary font-medium text-sm group-hover:text-orange-secondary transition-colors">
                            {proveedor.nombre}
                          </p>
                          <p className="text-[10px] text-gray-lightest">
                            {proveedor.nit ? `NIT ${proveedor.nit}` : "Sin NIT"} · {proveedor.correo || "Sin correo"}
                          </p>
                        </div>
                      </div>
                    )}
                    onSelect={(proveedor) => {
                      setNuevaCompra({ ...nuevaCompra, proveedorId: Number(proveedor.id ?? 0) });
                      setProveedorSearchTerm(
                        `${proveedor.nombre || ""}${proveedor.nit ? ` — NIT ${proveedor.nit}` : ""}`
                      );
                    }}
                    error={showCompraFormErrors && !nuevaCompra.proveedorId ? "Debes seleccionar un proveedor del buscador." : undefined}
                    shakeClass={shakeClass}
                    onFocus={clearValidationErrors}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-lightest text-xs">Descuento (%)</Label>
                  <Input
                    type="number"
                    value={porcentajeDescuentoInput}
                    onChange={(e) => {
                      if (e.target.value.length <= 5) {
                        handlePorcentajeDescuentoInputChange(e.target.value);
                      }
                    }}
                    onFocus={clearValidationErrors}
                    className={`elegante-input no-spin ${showDiscountWarning ? "border-red-500 ring-1 ring-red-500" : ""}`}
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                  />
                  {showDiscountWarning && (
                    <p className="text-xs text-red-400 mt-1">el descuento no puede ser superior a 100</p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Section 4: Agregar Productos */}
            <FormSection
              title="Agregar Productos"
              icon={<ShoppingBag className="w-4 h-4" />}
              className="space-y-2"
              style={{ paddingTop: "0.35rem", paddingBottom: "0.35rem" }}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-gray-lightest text-xs">Producto *</Label>
                  <SearchField
                    placeholder="Escribe para buscar un producto..."
                    value={productSearchTerm}
                    onChange={(val) => setProductSearchTerm(val)}
                    onClear={() => {
                      setProductSearchTerm("");
                      setProductoSeleccionado("");
                      setPrecioUnitario(0);
                    }}
                    items={productos}
                    filterFn={(p, query) => {
                      const q = normalizeSearchText(query);
                      const searchable = normalizeSearchText(
                        [p.id, p.nombre, getCategoriaNombre(p)].join(" ")
                      );
                      return searchable.includes(q);
                    }}
                    renderItem={(producto) => (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white-primary font-medium text-sm group-hover:text-orange-secondary transition-colors">
                            {producto.nombre}
                          </p>
                          <p className="text-[10px] text-gray-lightest">
                            ${formatCurrency(getPrecioCompra(producto as any))}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {getCategoriaNombre(producto) || "Sin categoría"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-lightest leading-none">Stock</span>
                            <span className={`text-xs font-bold ${((producto as any).stock ?? 0) > 0 ? "text-green-400" : "text-red-400"}`}>
                              {Number((producto as any).stock ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    onSelect={(producto) => {
                      setProductoSeleccionado(producto.id.toString());
                      setProductSearchTerm(producto.nombre);
                      if (showAddProductoErrors) setShowAddProductoErrors(false);
                    }}
                    error={showProductoSelectorError ? "Debes seleccionar un producto del buscador." : undefined}
                    shakeClass={shakeClass}
                    maxResults={20}
                    onFocus={clearValidationErrors}
                    dropUp
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={agregarProducto}
                    className="elegante-button-primary h-11 w-full md:w-auto md:min-w-[220px] text-center"
                  >
                    Agregar Producto
                  </button>
                </div>

                {(showCompraFormErrors || showAddProductoErrors) && noProductosAgregados && (
                  <p className="text-xs text-red-400 mt-1">Debes seleccionar y agregar al menos un producto.</p>
                )}
              </div>
            </FormSection>

            </div>
            {/* Action Buttons */}
            <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90 flex justify-end space-x-3">
              <button onClick={onBack} className="elegante-button-secondary">
                Cancelar
              </button>
              <button
                onClick={handleCreateCompra}
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
                    <Receipt className="w-4 h-4" />
                    Registrar Compra
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT: Detail Panel */}
        <section className="lg:min-h-0 lg:min-w-0 lg:pr-2">
          <DetailPanelCompra
            productos={nuevaCompra.productos || []}
            subtotal={calcularSubtotal()}
            descuentoPorcentaje={nuevaCompra.porcentajeDescuento}
            descuentoMonto={calcularDescuento(calcularSubtotal())}
            total={calcularTotal()}
            onRemoveProducto={eliminarProducto}
            getTarjetaInput={getTarjetaInput}
            onTarjetaInputChange={actualizarTarjetaInput}
          />
        </section>
      </div>
    </div>
  );
}
