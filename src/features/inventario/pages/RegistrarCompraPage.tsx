import React, { useState, useMemo, useEffect } from "react";
import { Input } from "../../../shared/components/ui/input";
import {
  Calendar,
  CreditCard,
  Receipt,
  Hash,
  Calculator,
  Building,
  FileText,
  ArrowLeft,
  RotateCcw,
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
import { SearchField } from "../../../shared/components/ui/SearchField";
import { DetailPanelCompra } from "../components/DetailPanelCompra";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { canBeUsedInService, isSaleOnly } from "../../../shared/utils/usagePolicy";

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
}

export function RegistrarCompraPage({ onBack }: RegistrarCompraPageProps) {
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
    porcentajeDescuento: 0,
    productos: [] as Array<{
      id: number;
      nombre: string;
      cantidad: number;
      precio: number;
      stockVentas: number;
      stockInsumos: number;
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
      stockVentas?: string;
      stockInsumos?: string;
      precio?: string;
      precioVenta?: string;
    }>
  >({});

  // Product addition state
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [stockVentas, setStockVentas] = useState(0);
  const [stockInsumos, setStockInsumos] = useState(0);
  const [stockVentasInput, setStockVentasInput] = useState("");
  const [stockInsumosInput, setStockInsumosInput] = useState("");
  const cantidadProducto = stockVentas + stockInsumos;

  // Proveedor search state
  const [proveedorSearchTerm, setProveedorSearchTerm] = useState("");

  // Discount input
  const [porcentajeDescuentoInput, setPorcentajeDescuentoInput] = useState("");

  // Validation
  const [showCompraFormErrors, setShowCompraFormErrors] = useState(false);
  const [showAddProductoErrors, setShowAddProductoErrors] = useState(false);
  const [compraValidationAttempt, setCompraValidationAttempt] = useState(0);
  const shakeClass = compraValidationAttempt % 2 === 0 ? "input-required-shake-a" : "input-required-shake-b";

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProductoObj = useMemo(() => {
    const id = Number(productoSeleccionado);
    if (!id) return undefined;
    return productos.find((p) => Number(p.id) === id);
  }, [productoSeleccionado, productos]);

  const esSoloVentaSeleccionado = useMemo(() => {
    if (!selectedProductoObj) return false;
    return isSaleOnly(selectedProductoObj as any);
  }, [selectedProductoObj]);

  // Derived validation states
  const noProductosAgregados = (nuevaCompra.productos?.length || 0) === 0;
  const showProductoSelectorError =
    (showCompraFormErrors && noProductosAgregados && !productoSeleccionado) ||
    (showAddProductoErrors && !productoSeleccionado);
  const showStockCantidadError =
    ((showCompraFormErrors && noProductosAgregados) || showAddProductoErrors) &&
    cantidadProducto <= 0;
  const showStockVentasError = showStockCantidadError;
  const showStockInsumosError =
    showStockCantidadError && !esSoloVentaSeleccionado;

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
        const [proveedoresData, productosData, categoriasData, comprasData, usuariosData] =
          await Promise.all([
            proveedorService.obtenerProveedoresJuridicos().catch(() => []),
            productoService.getProductos().catch(() => []),
            categoriaService.getCategorias().catch(() => []),
            compraService.getCompras().catch(() => []),
            apiService.getUsuarios().catch(() => []),
          ]);

        // Proveedores
        const filtrados = (proveedoresData || []).filter(
          (p: any) => p.nombre && p.estado !== false && p.activo !== false
        );
        setProveedores(filtrados);

        // Productos enriquecidos con categoría
        const lista = (productosData as any[]).filter((p: any) => p.activo === true);
        const categoriasById = new Map<number, string>();
        (categoriasData || []).forEach((c: any) => {
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
        const maxId = (comprasData || []).reduce((max: number, compra: any) => {
          const id = Number(compra?.id ?? 0);
          return Number.isFinite(id) && id > max ? id : max;
        }, 0);
        setComprasCount(maxId);

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

  useEffect(() => {
    if (!esSoloVentaSeleccionado) return;
    setStockInsumos(0);
    setStockInsumosInput("0");
  }, [esSoloVentaSeleccionado]);

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
  const handleStockVentasInputChange = (valor: string) => {
    const onlyDigits = valor.replace(/\D+/g, "").slice(0, 4);
    setStockVentasInput(onlyDigits);
    if (showAddProductoErrors) setShowAddProductoErrors(false);
    if (onlyDigits.trim() === "") {
      setStockVentas(0);
      return;
    }
    setStockVentas(Math.max(0, parseInt(onlyDigits, 10) || 0));
  };

  const handleStockInsumosInputChange = (valor: string) => {
    if (esSoloVentaSeleccionado) {
      setStockInsumos(0);
      setStockInsumosInput("0");
      return;
    }
    const onlyDigits = valor.replace(/\D+/g, "").slice(0, 4);
    setStockInsumosInput(onlyDigits);
    if (showAddProductoErrors) setShowAddProductoErrors(false);
    if (onlyDigits.trim() === "") {
      setStockInsumos(0);
      return;
    }
    setStockInsumos(Math.max(0, parseInt(onlyDigits, 10) || 0));
  };

  const handlePorcentajeDescuentoInputChange = (valor: string) => {
    setPorcentajeDescuentoInput(valor);
    if (valor.trim() === "") {
      setNuevaCompra({ ...nuevaCompra, porcentajeDescuento: 0 });
      return;
    }
    const numero = Number(valor);
    if (!Number.isNaN(numero)) {
      const clamped = Math.min(100, Math.max(0, numero));
      setNuevaCompra({ ...nuevaCompra, porcentajeDescuento: clamped });
    }
  };

  // --- Product management ---
  const agregarProducto = () => {
    try {
      const cantidadAgregar = stockVentas + stockInsumos;

      if (!productoSeleccionado || cantidadAgregar <= 0) {
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
      const stockVentasAgregar = esSoloVentaSeleccionado ? cantidadAgregar : stockVentas;
      const stockInsumosAgregar = esSoloVentaSeleccionado ? 0 : stockInsumos;
      const precioCompraInicial = precioUnitario > 0 ? precioUnitario : getPrecioCompra(producto);

      if (existeProducto) {
        const cantidadActualizada = existeProducto.cantidad + cantidadAgregar;
        const stockVentasActualizado = existeProducto.stockVentas + stockVentasAgregar;
        const stockInsumosActualizado = existeProducto.stockInsumos + stockInsumosAgregar;
        const precioActualizado = existeProducto.precio > 0 ? existeProducto.precio : precioCompraInicial;
        setNuevaCompra({
          ...nuevaCompra,
          productos: productosActuales.map((p) =>
            p.id === producto.id
              ? {
                  ...p,
                  cantidad: cantidadActualizada,
                  precio: precioActualizado,
                  stockVentas: stockVentasActualizado,
                  stockInsumos: stockInsumosActualizado,
                  precioVenta: (p as any).precioVenta ?? getPrecioVenta(producto),
                }
              : p
          ),
        });
        setTarjetaInputs((prev) => ({
          ...prev,
          [producto.id]: {
            cantidad: String(cantidadActualizada),
            stockVentas: String(stockVentasActualizado),
            stockInsumos: String(stockInsumosActualizado),
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
              stockVentas: stockVentasAgregar,
              stockInsumos: stockInsumosAgregar,
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
            stockVentas: String(stockVentasAgregar),
            stockInsumos: String(stockInsumosAgregar),
            precio: String(precioCompraInicial),
            precioVenta: String(precioVentaInicial),
          },
        }));
      }

      // Reset product addition fields
      setProductoSeleccionado("");
      setProductSearchTerm("");
      setPrecioUnitario(0);
      setStockVentas(0);
      setStockInsumos(0);
      setStockVentasInput("");
      setStockInsumosInput("");
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
    producto: { id: number; cantidad: number; stockVentas: number; stockInsumos: number; precio: number; precioVenta?: number },
    campo: "cantidad" | "stockVentas" | "stockInsumos" | "precio" | "precioVenta"
  ) => {
    const visual = tarjetaInputs[producto.id]?.[campo];
    return visual ?? "";
  };

  const actualizarTarjetaInput = (
    productId: number,
    campo: "cantidad" | "stockVentas" | "stockInsumos" | "precio" | "precioVenta",
    valor: string
  ) => {
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [campo]: valor,
      },
    }));

    if (valor.trim() === "") return;
    const numero = Number(valor);
    if (Number.isNaN(numero)) return;

    if (campo === "cantidad" && numero >= 1) {
      actualizarCantidadProducto(productId, numero);
      return;
    }
    if (campo === "stockVentas" && numero >= 0) {
      actualizarStockVentas(productId, numero);
      return;
    }
    if (campo === "stockInsumos" && numero >= 0) {
      actualizarStockInsumos(productId, numero);
      return;
    }
    if (campo === "precio" && numero >= 0) {
      actualizarPrecioProducto(productId, numero);
      return;
    }
    if (campo === "precioVenta" && numero >= 0) {
      actualizarPrecioVentaProducto(productId, numero);
    }
  };

  const actualizarCantidadProducto = (productId: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    const productosActuales = nuevaCompra.productos || [];
    const producto = productosActuales.find((p) => p.id === productId);
    if (!producto) return;

    if (isSaleOnly(producto as any)) {
      setNuevaCompra({
        ...nuevaCompra,
        productos: productosActuales.map((p) =>
          p.id === productId ? { ...p, cantidad: nuevaCantidad, stockVentas: nuevaCantidad, stockInsumos: 0 } : p
        ),
      });
      setTarjetaInputs((prev) => ({
        ...prev,
        [productId]: { ...prev[productId], cantidad: String(nuevaCantidad), stockVentas: String(nuevaCantidad), stockInsumos: "0" },
      }));
      return;
    }

    const diferencia = nuevaCantidad - producto.cantidad;
    let nuevoStockVentas = producto.stockVentas + diferencia;
    let nuevoStockInsumos = producto.stockInsumos;

    if (nuevoStockVentas > nuevaCantidad) {
      nuevoStockVentas = nuevaCantidad;
      nuevoStockInsumos = 0;
    } else if (nuevoStockVentas < 0) {
      nuevoStockVentas = 0;
      nuevoStockInsumos = nuevaCantidad;
    } else {
      nuevoStockInsumos = nuevaCantidad - nuevoStockVentas;
    }

    setNuevaCompra({
      ...nuevaCompra,
      productos: productosActuales.map((p) =>
        p.id === productId ? { ...p, cantidad: nuevaCantidad, stockVentas: nuevoStockVentas, stockInsumos: nuevoStockInsumos } : p
      ),
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        cantidad: String(nuevaCantidad),
        stockVentas: String(nuevoStockVentas),
        stockInsumos: String(nuevoStockInsumos),
      },
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

  const actualizarStockVentas = (productId: number, nuevoStock: number) => {
    if (nuevoStock < 0) return;
    const productosActuales = nuevaCompra.productos || [];
    const producto = productosActuales.find((p) => p.id === productId);
    if (!producto) return;

    const cantidadTotal = Math.max(0, Math.floor(producto.cantidad));
    let clampedVentas = Math.max(0, Math.min(Math.floor(nuevoStock), cantidadTotal));
    let clampedInsumos = cantidadTotal - clampedVentas;

    if (isSaleOnly(producto as any)) {
      clampedVentas = cantidadTotal;
      clampedInsumos = 0;
    }

    setNuevaCompra({
      ...nuevaCompra,
      productos: productosActuales.map((p) =>
        p.id === productId ? { ...p, stockVentas: clampedVentas, stockInsumos: clampedInsumos } : p
      ),
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], stockVentas: String(clampedVentas), stockInsumos: String(clampedInsumos) },
    }));
  };

  const actualizarStockInsumos = (productId: number, nuevoStock: number) => {
    if (nuevoStock < 0) return;
    const productosActuales = nuevaCompra.productos || [];
    const producto = productosActuales.find((p) => p.id === productId);
    if (!producto) return;

    const cantidadTotal = Math.max(0, Math.floor(producto.cantidad));
    let clampedInsumos = Math.max(0, Math.min(Math.floor(nuevoStock), cantidadTotal));
    let clampedVentas = cantidadTotal - clampedInsumos;

    if (isSaleOnly(producto as any)) {
      clampedInsumos = 0;
      clampedVentas = cantidadTotal;
    }

    setNuevaCompra({
      ...nuevaCompra,
      productos: productosActuales.map((p) =>
        p.id === productId ? { ...p, stockInsumos: clampedInsumos, stockVentas: clampedVentas } : p
      ),
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], stockInsumos: String(clampedInsumos), stockVentas: String(clampedVentas) },
    }));
  };

  // --- Form reset ---
  const limpiarFormulario = () => {
    setNuevaCompra({ ...inicialNuevaCompra, fechaRegistro: generateCurrentDate() });
    setTarjetaInputs({});
    setProductoSeleccionado("");
    setProductSearchTerm("");
    setPrecioUnitario(0);
    setStockVentas(0);
    setStockInsumos(0);
    setStockVentasInput("");
    setStockInsumosInput("");
    setProveedorSearchTerm("");
    setPorcentajeDescuentoInput("");
    setShowCompraFormErrors(false);
    setShowAddProductoErrors(false);
  };

  // --- Submit ---
  const handleCreateCompra = async () => {
    if (isSubmitting) return;
    setShowCompraFormErrors(true);
    setCompraValidationAttempt((prev) => prev + 1);

    if (!user || !user.email) {
      showErrorAlert("Error de sesión", "No se ha identificado el usuario responsable. Por favor inicie sesión nuevamente.");
      return;
    }

    if (!nuevaCompra.proveedorId || !nuevaCompra.metodoPago || !nuevaCompra.fechaFactura || nuevaCompra.productos.length === 0) {
      showErrorAlert(
        "Campos obligatorios",
        "Por favor completa la fecha de factura, el método de pago, selecciona un proveedor y agrega al menos un producto."
      );
      return;
    }

    // Validate stock distribution
    const productosInvalidos = nuevaCompra.productos.filter((p) => {
      const sumaStocks = p.stockVentas + p.stockInsumos;
      return sumaStocks !== p.cantidad;
    });

    if (productosInvalidos.length > 0) {
      const nombresInvalidos = productosInvalidos.map((p) => p.nombre).join(", ");
      showErrorAlert(
        "Error en distribución de stock",
        `Los siguientes productos tienen una distribución de stock incorrecta: ${nombresInvalidos}`
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
      metodoPago: nuevaCompra.metodoPago,
      iva: 0,
      descuento: descuento,
      usuarioId: usuarioIdNum,
      detalles: nuevaCompra.productos.map((p) => ({
        productoId: p.id,
        cantidad: p.cantidad,
        precioUnitario: p.precio,
        cantidadVentas: Number.isFinite(p.stockVentas) ? p.stockVentas : 0,
        cantidadInsumos: Number.isFinite(p.stockInsumos) ? p.stockInsumos : 0,
      })),
    };

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
      <AlertContainer />

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-dark text-gray-lightest hover:text-white-primary transition-colors"
            title="Volver a Compras"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white-primary flex items-center gap-2">
              <Receipt className="w-6 h-6 text-blue-400" />
              Registrar Nueva Compra
            </h2>
            <p className="text-sm text-gray-lightest">
              Completa la información de la compra al proveedor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={limpiarFormulario}
            className="elegante-button-secondary flex items-center gap-2"
            title="Limpiar formulario"
          >
            <RotateCcw className="w-4 h-4" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div
        className="grid grid-cols-1 lg:grid-cols-master-detail gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden"
        style={{ gridTemplateRows: "minmax(0, 1fr)" }}
      >
        {/* LEFT: Form */}
        <aside className="lg:min-h-0 lg:min-w-0">
          <div className="elegante-card h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-5">
            {/* Section 1: Información Básica */}
            <FormSection
              title="Información Básica"
              icon={<Receipt className="w-4 h-4" />}
              headerRight={
                <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white-primary font-bold">
                      Nº Compra
                    </span>
                    <span className="text-gray-lightest font-medium tabular-nums">
                      {numeroCompra.toString().padStart(3, "0")}
                    </span>
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-gray-dark" />
                  <div className="flex items-center gap-2">
                    <span className="text-white-primary font-bold">
                      Fecha de Registro
                    </span>
                    <span className="text-gray-lightest font-medium">
                      {formatDate(nuevaCompra.fechaRegistro || generateCurrentDate())}
                    </span>
                  </div>
                </div>
              }
            />

            {/* Section 2: Fecha Factura y Método de Pago */}
            <FormSection title="Datos de Factura" icon={<FileText className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-lightest text-xs">Método de Pago *</Label>
                  <select
                    value={nuevaCompra.metodoPago}
                    onChange={(e) => setNuevaCompra({ ...nuevaCompra, metodoPago: e.target.value })}
                    onFocus={clearValidationErrors}
                    className={`elegante-input w-full ${showCompraFormErrors && !nuevaCompra.metodoPago ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}
                  >
                    <option value="">Seleccionar método...</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                  {showCompraFormErrors && !nuevaCompra.metodoPago && (
                    <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                  )}
                </div>
              </div>
            </FormSection>

            {/* Section 3: Proveedor y Descuento */}
            <FormSection title="Proveedor" icon={<Building className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-4">
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
                    className="elegante-input no-spin"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                  />
                </div>
              </div>
            </FormSection>

            {/* Section 4: Agregar Productos */}
            <FormSection title="Agregar Productos" icon={<ShoppingBag className="w-4 h-4" />}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-gray-lightest text-xs">Producto *</Label>
                    <SearchField
                      placeholder="Escribe para buscar un producto..."
                      value={productSearchTerm}
                      onChange={(val) => setProductSearchTerm(val)}
                      onClear={() => {
                        setProductSearchTerm("");
                        setProductoSeleccionado("");
                        setPrecioUnitario(0);
                        setStockVentas(0);
                        setStockInsumos(0);
                        setStockVentasInput("");
                        setStockInsumosInput("");
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
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-lightest leading-none">Stock ventas</span>
                                <span className={`text-xs font-bold ${((producto as any).stockVentas ?? 0) > 0 ? "text-green-400" : "text-red-400"}`}>
                                  {Number((producto as any).stockVentas ?? 0)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-lightest leading-none">Stock insumos</span>
                                <span className={`text-xs font-bold ${((producto as any).stockInsumos ?? (producto as any).stock ?? 0) > 0 ? "text-blue-400" : "text-red-400"}`}>
                                  {Number((producto as any).stockInsumos ?? (producto as any).stock ?? 0)}
                                </span>
                              </div>
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
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Stock para Ventas *</Label>
                    <Input
                      type="number"
                      value={stockVentasInput}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e" || e.key === "+" || e.key === ".") e.preventDefault();
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData?.getData("text") || "";
                        if (/[^\d]/.test(text) || text.length > 4) {
                          e.preventDefault();
                          handleStockVentasInputChange(text.replace(/\D+/g, "").slice(0, 4));
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D+/g, "").slice(0, 4);
                        handleStockVentasInputChange(val);
                      }}
                      onFocus={clearValidationErrors}
                      className={`elegante-input no-spin ${showStockVentasError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}
                      min="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Stock para Insumos *</Label>
                    <Input
                      type="number"
                      value={stockInsumosInput}
                      disabled={esSoloVentaSeleccionado}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e" || e.key === "+" || e.key === ".") e.preventDefault();
                      }}
                      onPaste={(e) => {
                        if (esSoloVentaSeleccionado) {
                          e.preventDefault();
                          return;
                        }
                        const text = e.clipboardData?.getData("text") || "";
                        if (/[^\d]/.test(text) || text.length > 4) {
                          e.preventDefault();
                          handleStockInsumosInputChange(text.replace(/\D+/g, "").slice(0, 4));
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D+/g, "").slice(0, 4);
                        handleStockInsumosInputChange(val);
                      }}
                      onFocus={clearValidationErrors}
                      className={`elegante-input no-spin ${showStockInsumosError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""} ${esSoloVentaSeleccionado ? "bg-gray-medium cursor-not-allowed" : ""}`}
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={agregarProducto}
                    className="elegante-button-primary h-11 w-full md:w-auto md:min-w-[220px] text-center"
                  >
                    Agregar Producto
                  </button>
                </div>

                {showStockCantidadError && (
                  <p className="text-xs text-red-400">
                    Ingresa al menos una unidad en stock para ventas o insumos.
                  </p>
                )}

                {esSoloVentaSeleccionado && (
                  <p className="text-xs text-gray-lightest">
                    Este producto es solo para venta, por lo que el stock para insumos permanece en 0.
                  </p>
                )}

                {(showCompraFormErrors || showAddProductoErrors) && noProductosAgregados && (
                  <p className="text-xs text-red-400">Debes agregar al menos un producto.</p>
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
