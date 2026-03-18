import React, { useState, useEffect, useMemo } from "react";
import { Input } from "../../../shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/select";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import {
  Plus,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  CreditCard,
  Receipt,
  Hash,
  Building,
  FileText,
  Ban,
  Calculator,
  FileDown,
  Boxes,
  ShoppingBag,
  DollarSign,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { toast } from "../../../shared/components/ui/notify";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { compraService, Compra, CreateCompraRequest } from "../services/compraService";
import { proveedorService, Proveedor } from "../services/proveedorService";
import { insumosService, Insumo } from "../services/insumosService";
import { categoriaService } from "../services/categoriaService";
import { productoService } from "../../productos/services/productos";
import { apiService, ApiUser } from "../../../shared/services/api";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import jsPDF from "jspdf";
import { canBeUsedInService, isSaleOnly } from "../../../shared/utils/usagePolicy";
import manitoLogo from "../../../assets/Manito.jpeg";

// Función para formatear moneda colombiana con puntos para separar miles
const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return amount.toLocaleString('es-CO');
};

const getPrecioCompra = (p: any): number => {
  const candidates = [p?.precioCompra, p?.PrecioCompra, p?.precio_compra];
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

const getPrecioVenta = (p: any): number => {
  const candidates = [p?.precioVenta, p?.PrecioVenta, p?.precioBase, p?.PrecioBase, p?.precio];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && !Number.isNaN(n)) return n;
  }
  return 0;
};
const normalizeSearchText = (value: unknown): string => {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

import { useAuth } from "../../../shared/contexts/AuthContext";

// Lazy load components incorrectly was causing a crash. 
// Standardizing imports at the top and only using lazy if strictly necessary.
// For now, using the static imports already present for stability.

// Memoized row component defined outside to avoid recreation
const CompraRow = React.memo(({
  compra,
  onViewDetails,
  onGenerateReport,
  onAnular,
  getEstadoColor
}: {
  compra: Compra & { totalFormatted: string; fechaFormatted: string, proveedorDocumento?: string },
  onViewDetails: (c: Compra) => void,
  onGenerateReport: (c: Compra) => void,
  onAnular: (id: number) => void,
  getEstadoColor: (e: string) => string
}) => (
  <tr className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
    <td className="py-4 px-4 text-center">
      <div className="flex items-center gap-2 justify-center">
        <Hash className="w-4 h-4 text-orange-primary" />
        <span className="text-gray-lighter">{String(compra.id)}</span>
      </div>
    </td>
    <td className="py-4 px-4 text-center">
      <span className="text-gray-lighter">{compra.proveedorDocumento || 'N/A'}</span>
    </td>
    <td className="py-4 px-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Building className="w-4 h-4 text-orange-primary" />
        <span className="text-gray-lighter">{compra.proveedorNombre}</span>
      </div>
    </td>
    <td className="py-4 px-4 text-center">
      <span className="text-gray-lighter font-bold">${compra.totalFormatted}</span>
    </td>
    <td className="py-4 px-4 text-center">
      <span className="text-sm text-gray-lighter">{compra.fechaFormatted}</span>
    </td>
    <td className="py-4 px-4 text-center">
      <span className={`px-3 py-1 rounded-full text-xs ${getEstadoColor(compra.estado)}`}>
        {compra.estado}
      </span>
    </td>
    <td className="py-4 px-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <button
            onClick={() => compra.estado?.toLowerCase() !== "anulada" && compra.estado?.toLowerCase() !== "anulado" && onAnular(compra.id)}
            disabled={compra.estado?.toLowerCase() === "anulada" || compra.estado?.toLowerCase() === "anulado"}
            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title={compra.estado?.toLowerCase() === "anulada" || compra.estado?.toLowerCase() === "anulado" ? "Compra anulada" : "Anular"}
          >
            <Ban className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
          </button>
        <button
          onClick={() => onViewDetails(compra)}
          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
          title="Ver detalles"
        >
          <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
        </button>
        <button
          onClick={() => onGenerateReport(compra)}
          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
          title="Descargar PDF"
        >
          <FileDown className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
        </button>
      </div>
    </td>
  </tr>
));

interface ComprasPageProps {
  onNavigate?: (page: string) => void;
}

export function ComprasPage({ onNavigate }: ComprasPageProps) {
  const { user } = useAuth();
  const { confirmDeleteAction, DoubleConfirmationContainer } = useDoubleConfirmation();
  const { created, success, error: showErrorAlert, info: showInfoAlert, AlertContainer } = useCustomAlert();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Insumo[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completada" | "anulada">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [loading, setLoading] = useState(!sessionStorage.getItem('compras_cache'));

  // Función para generar fecha automática (solo visualización o defaults)
  const generateCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para formatear fecha en formato estándar DD/MM/YYYY
  const formatDate = (date: string | Date) => {
    let dateObj: Date;
    if (typeof date === 'string') {
      const plainDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (plainDateMatch) {
        const [, year, month, day] = plainDateMatch;
        // Importante: crear fecha en zona local para evitar desfase de -1 día
        dateObj = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    return dateObj.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCompraResponsableDisplay = (compra: any) => {
    if (!compra) return 'N/A';
    const c = compra as any;
    let doc =
      c.responsableDocumento ??
      c.ResponsableDocumento ??
      c.usuarioDocumento ??
      c.UsuarioDocumento ??
      c.userDocumento ??
      c.UserDocumento ??
      '';

    const nombreDirecto =
      c.responsableNombre ?? c.ResponsableNombre ?? c.usuarioNombre ?? c.UsuarioNombre ?? c.responsable ?? c.usuario;
    if (nombreDirecto) return `${String(nombreDirecto)}${doc ? ` — CC ${doc}` : ''}`;

    const respObj = c.responsable ?? c.Responsable ?? c.usuario ?? c.Usuario;
    if (respObj) {
      if (typeof respObj === 'string') return `${respObj}${doc ? ` — CC ${doc}` : ''}`;
      const nombre = respObj.nombre ?? respObj.Nombre ?? respObj.name ?? respObj.Name;
      const apellido = respObj.apellido ?? respObj.Apellido ?? respObj.lastName ?? respObj.LastName;
      if (!doc) doc = respObj.documento ?? respObj.Documento ?? '';
      const fullName = [nombre, apellido].filter(Boolean).join(' ').trim();
      if (fullName) return `${fullName}${doc ? ` — CC ${doc}` : ''}`;
    }
    if (doc) return `CC ${doc}`;
    return 'N/A';
  };

  const inicialNuevaCompra = {
    proveedorId: 0,
    metodoPago: '',
    fechaRegistro: generateCurrentDate(),
    fechaFactura: '',
    porcentajeDescuento: 0,
    productos: [] as Array<{
      id: number,
      nombre: string,
      cantidad: number,
      precio: number,
      stockVentas: number,
      stockInsumos: number,
      precioVenta?: number,
      imagen?: string,
      categoria?: string
    }>
  };

  const [nuevaCompra, setNuevaCompra] = useState(inicialNuevaCompra);
  const [tarjetaInputs, setTarjetaInputs] = useState<Record<number, {
    cantidad?: string;
    stockVentas?: string;
    stockInsumos?: string;
    precio?: string;
    precioVenta?: string;
  }>>({});
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [proveedorSearchTerm, setProveedorSearchTerm] = useState('');
  const [showProveedorResults, setShowProveedorResults] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  const [productSearchFocused, setProductSearchFocused] = useState(false);
  const [proveedorSearchFocused, setProveedorSearchFocused] = useState(false);
  const [cantidadProducto, setCantidadProducto] = useState(0);
  const [cantidadProductoInput, setCantidadProductoInput] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [precioUnitarioInput, setPrecioUnitarioInput] = useState('');
  const [stockVentas, setStockVentas] = useState(0);
  const [stockInsumos, setStockInsumos] = useState(0);
  const [stockVentasInput, setStockVentasInput] = useState('');
  const [stockInsumosInput, setStockInsumosInput] = useState('');
  const [porcentajeDescuentoInput, setPorcentajeDescuentoInput] = useState('');
  const [showCompraFormErrors, setShowCompraFormErrors] = useState(false);
  const [showAddCompraProductoErrors, setShowAddCompraProductoErrors] = useState(false);
  const [compraValidationAttempt, setCompraValidationAttempt] = useState(0);
  const shakeClass = compraValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';
  const [creatingPurchase, setCreatingPurchase] = useState(false);
  const noProductosAgregados = (nuevaCompra.productos?.length || 0) === 0;
  const showProductoSelectorError = (showCompraFormErrors && noProductosAgregados && !productoSeleccionado) || (showAddCompraProductoErrors && !productoSeleccionado);
  const showCantidadProductoError = (showCompraFormErrors && noProductosAgregados && cantidadProducto <= 0) || (showAddCompraProductoErrors && cantidadProducto <= 0);
  const showStockVentasError = ((showCompraFormErrors && noProductosAgregados) || showAddCompraProductoErrors) && stockVentasInput.trim() === '' && stockInsumos !== cantidadProducto;
  const showStockInsumosError = ((showCompraFormErrors && noProductosAgregados) || showAddCompraProductoErrors) && stockInsumosInput.trim() === '' && stockVentas !== cantidadProducto;
  const distribucionDiff = (stockVentas + stockInsumos) - cantidadProducto;
  const showDistribucionExceso = (showCompraFormErrors || showAddCompraProductoErrors) && cantidadProducto > 0 && distribucionDiff > 0;
  const showDistribucionFalta = (showCompraFormErrors || showAddCompraProductoErrors) && cantidadProducto > 0 && distribucionDiff < 0;
  const showDistribucionError = showDistribucionExceso || showDistribucionFalta;
  const maxVentasPermitido = Math.max(0, cantidadProducto);
  const maxEntregasPermitido = Math.max(0, cantidadProducto);
  const baseErrorGate = (showCompraFormErrors || showAddCompraProductoErrors) && cantidadProducto > 0;
  const showExcesoVentas = baseErrorGate && stockVentas > cantidadProducto;
  const showExcesoEntregas = baseErrorGate && stockInsumos > cantidadProducto;
  const numeroCompras = useMemo(() => {
    const maxId = (compras || []).reduce((max, compra) => {
      const id = Number((compra as any)?.id ?? 0);
      return Number.isFinite(id) && id > max ? id : max;
    }, 0);
    return maxId + 1;
  }, [compras]);
  // Cargar datos de forma separada y perezosa con cache SWR

  const selectedProductoObj = useMemo(() => {
    const id = Number(productoSeleccionado);
    if (!id) return undefined;
    return productos.find(p => Number(p.id) === id);
  }, [productoSeleccionado, productos]);

  const esSoloVentaSeleccionado = useMemo(() => {
    if (!selectedProductoObj) return false;
    return isSaleOnly(selectedProductoObj as any);
  }, [selectedProductoObj]);
  const loadCompras = async (useCache = false) => {
    if (useCache) {
      const cached = sessionStorage.getItem('compras_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setCompras(parsed);
          // Si tenemos cache, ya no necesitamos mostrar el spinner principal
          // aunque sigamos cargando datos frescos en background
          setLoading(false);
        } catch (e) {
          console.error("Error parsing cache", e);
        }
      }
    }

    try {
      const comprasData = await compraService.getCompras();
      setCompras(comprasData);
      sessionStorage.setItem('compras_cache', JSON.stringify(comprasData));
    } catch (error) {
      showErrorAlert("Error al cargar compras", "No se pudieron obtener las compras.");
      console.error(error);
    }
  };

  const loadProveedores = async () => {
    try {
      const proveedoresData = await proveedorService.obtenerProveedoresJuridicos();
      const filtrados = (proveedoresData || []).filter(p => p.nombre && (p.estado !== false && p.activo !== false));
      setProveedores(filtrados);
    } catch (error) {
      showErrorAlert("Error al cargar proveedores", "No se pudieron obtener los proveedores.");
      console.error("❌ Error en loadProveedores:", error);
    }
  };

  const loadProductos = async () => {
    try {
      const [productosData, categoriasData] = await Promise.all([
        productoService.getProductos(),
        categoriaService.getCategorias().catch(() => [])
      ]);
      const lista = (productosData as any[]).filter((p: any) => p.activo === true);
      const categoriasById = new Map<number, string>();
      (categoriasData || []).forEach((c: any) => {
        const id = Number(c?.id ?? 0);
        if (id && c?.nombre) categoriasById.set(id, String(c.nombre));
      });
      const enriquecidos = lista.map((p: any) => {
        const cat = p?.categoria;
        if (cat && typeof cat === 'object' && cat.id && !String(cat.nombre || '').trim() && categoriasById.has(cat.id)) {
          return { ...p, categoria: { ...cat, nombre: categoriasById.get(cat.id) || cat.nombre } };
        }
        return p;
      });
      setProductos(enriquecidos);
    } catch (error) {
      showErrorAlert("Error al cargar productos", "No se pudieron obtener los productos.");
      console.error(error);
    }
  };

  // Cargar datos iniciales (compras y proveedores)
  const initData = async () => {
    const hasCache = !!sessionStorage.getItem('compras_cache');

    // Solo mostrar loading si NO hay cache
    if (!hasCache) {
      setLoading(true);
    }

    try {
      // Iniciamos ambas cargas. loadCompras(true) se encarga de mostrar la cache
      // primero si existe, y luego actualizar con datos frescos.
      const comprasPromise = loadCompras(true);
      const proveedoresPromise = loadProveedores();
      const usuariosPromise = apiService.getUsuarios().then(setUsers).catch(() => setUsers([]));

      // Esperamos que loadCompras termine (incluyendo la petición de red)
      // para asegurar que los datos estén actualizados, pero permitimos
      // que proveedores se cargue en background si tarda más.
      await comprasPromise;

      // Proveedores es secundario (solo para el diálogo de nueva compra)
      proveedoresPromise.catch(err => console.error("Error background providers:", err));
      usuariosPromise.catch(err => console.error("Error background usuarios:", err));
    } catch (error) {
      console.error("Error en la carga inicial:", error);
    } finally {
      // Si la carga de compras fue exitosa o falló, quitamos el loading.
      // Si hubo cache, loadCompras ya habrá quitado el loading antes.
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // Cargar productos cuando se abre el diálogo de crear compra
  useEffect(() => {
    if (isDialogOpen) {
      loadProductos();
    }
  }, [isDialogOpen]);
  // Debounce search term to avoid recomputing on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);


  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Memoized filtered compras based on debounced term
  const filteredCompras = useMemo(() => {
    const query = normalizeSearchText(debouncedSearch);
    return compras.filter(compra => {
      const estadoTxt = String((compra as any).estado || '');
      const estadoNormalizado = estadoTxt.toLowerCase().trim();
      const isAnulada = estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado';
      const isCompletada = estadoNormalizado === 'completada' || estadoNormalizado === 'completado';
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "anulada" && isAnulada) ||
        (statusFilter === "completada" && isCompletada);
      if (!matchesStatus) return false;
      if (!query) return true;
      // Solo campos visibles en la tabla: Número, Documento/NIT, Proveedor, Total, Fecha, Estado
      const numero = String((compra as any).numeroCompra || (compra as any).numeroFactura || (compra as any).id || '');
      const documento = String((compra as any).proveedorDocumento || '');
      const proveedor = String((compra as any).proveedorNombre || '');
      const totalTxt = String((compra as any).total ?? '');
      const fechaTxt = formatDate((compra as any).fecha || '');
      const visible = normalizeSearchText([numero, documento, proveedor, totalTxt, fechaTxt, estadoTxt].join(' '));
      return visible.includes(query);
    });
  }, [compras, debouncedSearch, statusFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredCompras.length / itemsPerPage)), [filteredCompras, itemsPerPage]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  // Pre‑compute formatted fields for displayed rows
  const displayedCompras = useMemo(() => {
    return filteredCompras.slice(startIndex, startIndex + itemsPerPage).map(compra => ({
      ...compra,
      totalFormatted: formatCurrency(compra.total),
      fechaFormatted: formatDate(compra.fecha)
    }));
  }, [filteredCompras, startIndex, itemsPerPage]);


  // Ajustar página actual si el total de páginas cambia
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const getEstadoColor = (estado: string) => {
    const estadoNormalizado = (estado || '').toLowerCase().trim();
    if (estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado') {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    if (estadoNormalizado === 'completada' || estadoNormalizado === 'completado') {
      return 'bg-green-500/10 text-green-400 border border-green-500/20';
    }
    return 'bg-gray-medium text-gray-lighter';
  };

  const calcularSubtotal = () => {
    if (!nuevaCompra.productos || !Array.isArray(nuevaCompra.productos)) {
      return 0;
    }
    return nuevaCompra.productos.reduce((total, producto) =>
      total + (producto.precio * producto.cantidad), 0
    );
  };

  const calcularDescuento = (subtotal: number) => {
    return subtotal * (nuevaCompra.porcentajeDescuento / 100);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento(subtotal);
    return subtotal - descuento;
  };

  // Al seleccionar producto, actualizar precio unitario sugerido
  useEffect(() => {
    if (productoSeleccionado) {
      const prod = productos.find(p => p.id === Number(productoSeleccionado));
      (async () => {
        let pc = 0;
        if (prod) {
          pc = getPrecioCompra(prod as any);
        }
        if (!pc || pc <= 0) {
          try {
            const full = await productoService.getProductoById(Number(productoSeleccionado));
            pc = getPrecioCompra(full as any);
          } catch {}
        }
        setPrecioUnitario(pc || 0);
        setPrecioUnitarioInput(String(pc || 0));
      })();
    } else {
      setPrecioUnitario(0);
      setPrecioUnitarioInput('');
    }
  }, [productoSeleccionado, productos]);

  const agregarProducto = () => {
    try {
      if (
        !productoSeleccionado ||
        cantidadProducto <= 0 ||
        (stockVentasInput.trim() === '' && stockInsumos !== cantidadProducto) ||
        (stockInsumosInput.trim() === '' && stockVentas !== cantidadProducto)
      ) {
        setShowAddCompraProductoErrors(true);
        setCompraValidationAttempt((prev) => prev + 1);
        return;
      }

      const producto = productos.find(p => p.id === Number(productoSeleccionado));
      if (!producto) {
        setShowAddCompraProductoErrors(true);
        setCompraValidationAttempt((prev) => prev + 1);
        return;
      }

      const sumaDistribucion = stockVentas + stockInsumos;
      if (sumaDistribucion > cantidadProducto) {
        setShowAddCompraProductoErrors(true);
        setCompraValidationAttempt((prev) => prev + 1);
        const maxVentas = Math.max(0, cantidadProducto - stockInsumos);
        const maxInsumos = Math.max(0, cantidadProducto - stockVentas);
        const partes: string[] = [];
        if (stockVentas > maxVentas) partes.push(`Stock Ventas excede el máximo permitido (${maxVentas}).`);
        if (stockInsumos > maxInsumos) partes.push(`Stock Entregas excede el máximo permitido (${maxInsumos}).`);
        const description = partes.length > 0
          ? partes.join(' ')
          : `Ventas + Entregas (${sumaDistribucion}) no puede superar la Cantidad Total (${cantidadProducto}).`;
        showErrorAlert("Error en distribución", description);
        return;
      }

      if (sumaDistribucion !== cantidadProducto) {
        setShowAddCompraProductoErrors(true);
        setCompraValidationAttempt((prev) => prev + 1);
        showErrorAlert("Distribución incompleta", `Faltan ${cantidadProducto - sumaDistribucion} unidades por asignar.`);
        return;
      }

      const productosActuales = nuevaCompra.productos || [];
      const existeProducto = productosActuales.find(p => p.id === producto.id);

      if (existeProducto) {
        const cantidadActualizada = existeProducto.cantidad + cantidadProducto;
        const stockVentasActualizado = existeProducto.stockVentas + stockVentas;
        const stockInsumosActualizado = existeProducto.stockInsumos + stockInsumos;
        setNuevaCompra({
          ...nuevaCompra,
          productos: productosActuales.map(p =>
            p.id === producto.id
              ? {
                ...p,
                cantidad: cantidadActualizada,
                precio: precioUnitario,
                stockVentas: stockVentasActualizado,
                stockInsumos: stockInsumosActualizado,
                precioVenta: (p as any).precioVenta ?? getPrecioVenta(producto)
              }
              : p
          )
        });
        setTarjetaInputs((prev) => ({
          ...prev,
          [producto.id]: {
            cantidad: String(cantidadActualizada),
            stockVentas: String(stockVentasActualizado),
            stockInsumos: String(stockInsumosActualizado),
            precio: String(precioUnitario),
            precioVenta: prev[producto.id]?.precioVenta ?? String((existeProducto as any)?.precioVenta ?? getPrecioVenta(producto))
          }
        }));
      } else {
        const cantidadNueva = cantidadProducto;
        const stockVentasNuevo = stockVentas;
        const stockInsumosNuevo = stockInsumos;
        const precioVentaInicial = getPrecioVenta(producto);
        setNuevaCompra({
          ...nuevaCompra,
          productos: [...productosActuales, {
            id: producto.id,
            nombre: producto.nombre,
            cantidad: cantidadNueva,
            precio: precioUnitario,
            stockVentas: stockVentasNuevo,
            stockInsumos: stockInsumosNuevo,
            precioVenta: precioVentaInicial,
            imagen: (producto as Insumo).imagen ?? (producto as { imagenProduc?: string }).imagenProduc ?? '',
            categoria: (producto as any).categoria && typeof (producto as any).categoria === 'object'
              ? ((producto as any).categoria.nombre || '')
              : ((producto as any).categoria ?? '')
          }]
        });
        setTarjetaInputs((prev) => ({
          ...prev,
          [producto.id]: {
            cantidad: String(cantidadNueva),
            stockVentas: String(stockVentasNuevo),
            stockInsumos: String(stockInsumosNuevo),
            precio: String(precioUnitario),
            precioVenta: String(precioVentaInicial)
          }
        }));
      }

      setProductoSeleccionado('');
      setCantidadProducto(0);
      setCantidadProductoInput('');
      setPrecioUnitario(0);
      setPrecioUnitarioInput('');
      setStockVentas(0);
      setStockInsumos(0);
      setStockVentasInput('');
      setStockInsumosInput('');
      setShowAddCompraProductoErrors(false);
      setShowCompraFormErrors(false);
    } catch (err) {
      console.error("❌ Error al agregar producto a la compra:", err);
      showErrorAlert("Error inesperado", "No se pudo agregar el producto. Intenta nuevamente.");
    }
  };

  const eliminarProducto = (productId: number) => {
    const productosActuales = nuevaCompra.productos || [];
    setNuevaCompra({
      ...nuevaCompra,
      productos: productosActuales.filter(p => p.id !== productId)
    });
    setTarjetaInputs((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const getTarjetaInput = (
    producto: { id: number; cantidad: number; stockVentas: number; stockInsumos: number; precio: number; precioVenta?: number },
    campo: 'cantidad' | 'stockVentas' | 'stockInsumos' | 'precio' | 'precioVenta'
  ) => {
    const visual = tarjetaInputs[producto.id]?.[campo];
    return visual ?? '';
  };

  const actualizarTarjetaInput = (
    productId: number,
    campo: 'cantidad' | 'stockVentas' | 'stockInsumos' | 'precio' | 'precioVenta',
    valor: string
  ) => {
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [campo]: valor
      }
    }));

    if (valor.trim() === '') return;

    const numero = Number(valor);
    if (Number.isNaN(numero)) return;

    if (campo === 'cantidad' && numero >= 1) {
      actualizarCantidadProducto(productId, numero);
      return;
    }
    if (campo === 'stockVentas' && numero >= 0) {
      actualizarStockVentas(productId, numero);
      return;
    }
    if (campo === 'stockInsumos' && numero >= 0) {
      actualizarStockInsumos(productId, numero);
      return;
    }
    if (campo === 'precio' && numero >= 0) {
      actualizarPrecioProducto(productId, numero);
      return;
    }
    if (campo === 'precioVenta' && numero >= 0) {
      actualizarPrecioVentaProducto(productId, numero);
    }
  };

  const handleCantidadProductoInputChange = (valor: string) => {
    setCantidadProductoInput(valor);
    if (showAddCompraProductoErrors) setShowAddCompraProductoErrors(false);
    if (valor.trim() === '') {
      setCantidadProducto(0);
      return;
    }
    const numero = Number(valor);
    if (!Number.isNaN(numero)) {
      setCantidadProducto(Math.max(0, Math.floor(numero)));
    }
  };

  const handlePrecioUnitarioInputChange = (valor: string) => {
    setPrecioUnitarioInput(valor);
    if (valor.trim() === '') {
      setPrecioUnitario(0);
      return;
    }
    const numero = Number(valor);
    if (!Number.isNaN(numero)) {
      setPrecioUnitario(Math.max(0, numero));
    }
  };



  const handleStockVentasInputChange = (valor: string) => {
    const max = Math.max(0, Number.isFinite(cantidadProducto) ? cantidadProducto : 0);
    const onlyDigits = valor.replace(/\D+/g, '');
    setStockVentasInput(onlyDigits);
    if (showAddCompraProductoErrors) setShowAddCompraProductoErrors(false);
    if (onlyDigits.trim() === '') {
      const ventas = 0;
      const insumos = Math.max(0, max - ventas);
      setStockVentas(ventas);
      setStockInsumos(insumos);
      setStockInsumosInput(String(insumos));
      return;
    }
    const n = Math.min(parseInt(onlyDigits, 10) || 0, max);
    const ventas = Math.max(0, Math.floor(n));
    const insumos = Math.max(0, max - ventas);
    setStockVentas(ventas);
    setStockInsumos(insumos);
    setStockInsumosInput(String(insumos));
  };

  const handleStockInsumosInputChange = (valor: string) => {
    const max = Math.max(0, Number.isFinite(cantidadProducto) ? cantidadProducto : 0);
    const onlyDigits = valor.replace(/\D+/g, '');
    setStockInsumosInput(onlyDigits);
    if (showAddCompraProductoErrors) setShowAddCompraProductoErrors(false);
    if (onlyDigits.trim() === '') {
      const insumos = 0;
      const ventas = Math.max(0, max - insumos);
      setStockInsumos(insumos);
      setStockVentas(ventas);
      setStockVentasInput(String(ventas));
      return;
    }
    const n = Math.min(parseInt(onlyDigits, 10) || 0, max);
    const insumos = Math.max(0, Math.floor(n));
    const ventas = Math.max(0, max - insumos);
    setStockInsumos(insumos);
    setStockVentas(ventas);
    setStockVentasInput(String(ventas));
  };

  const handlePorcentajeDescuentoInputChange = (valor: string) => {
    setPorcentajeDescuentoInput(valor);
    if (valor.trim() === '') {
      setNuevaCompra({ ...nuevaCompra, porcentajeDescuento: 0 });
      return;
    }
    const numero = Number(valor);
    if (!Number.isNaN(numero)) {
      const clamped = Math.min(100, Math.max(0, numero));
      setNuevaCompra({ ...nuevaCompra, porcentajeDescuento: clamped });
    }
  };

  useEffect(() => {
    const max = Math.max(0, Number.isFinite(cantidadProducto) ? Math.floor(cantidadProducto) : 0);
    if (esSoloVentaSeleccionado) {
      setStockVentas(max);
      setStockInsumos(0);
      setStockVentasInput(String(max));
      setStockInsumosInput('0');
      return;
    }
    const ventas = Math.max(0, Math.min(Math.floor(stockVentas), max));
    const insumos = Math.max(0, max - ventas);
    setStockVentas(ventas);
    setStockInsumos(insumos);
    setStockVentasInput(String(ventas));
    setStockInsumosInput(String(insumos));
  }, [cantidadProducto, esSoloVentaSeleccionado]);

  const actualizarCantidadProducto = (productId: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    const productosActuales = nuevaCompra.productos || [];
    const producto = productosActuales.find(p => p.id === productId);
    if (!producto) return;

    if (isSaleOnly(producto as any)) {
      const nuevoStockVentas = nuevaCantidad;
      const nuevoStockInsumos = 0;
      setNuevaCompra({
        ...nuevaCompra,
        productos: productosActuales.map(p =>
          p.id === productId
            ? { ...p, cantidad: nuevaCantidad, stockVentas: nuevoStockVentas, stockInsumos: nuevoStockInsumos }
            : p
        )
      });
      setTarjetaInputs((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          cantidad: String(nuevaCantidad),
          stockVentas: String(nuevoStockVentas),
          stockInsumos: String(nuevoStockInsumos)
        }
      }));
      return;
    }

    const diferencia = nuevaCantidad - producto.cantidad;
    let nuevoStockVentas = producto.stockVentas + diferencia;
    let nuevoStockInsumos = producto.stockInsumos;

    // Si el stock de ventas excede la nueva cantidad, ajustar proporcionalmente
    if (nuevoStockVentas > nuevaCantidad) {
      nuevoStockVentas = nuevaCantidad;
      nuevoStockInsumos = 0;
    } else if (nuevoStockVentas < 0) {
      nuevoStockVentas = 0;
      nuevoStockInsumos = nuevaCantidad;
    } else {
      // Mantener stockInsumos ajustado para que sumen la cantidad total
      nuevoStockInsumos = nuevaCantidad - nuevoStockVentas;
    }

    setNuevaCompra({
      ...nuevaCompra,
      productos: productosActuales.map(p =>
        p.id === productId
          ? { ...p, cantidad: nuevaCantidad, stockVentas: nuevoStockVentas, stockInsumos: nuevoStockInsumos }
          : p
      )
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        cantidad: String(nuevaCantidad),
        stockVentas: String(nuevoStockVentas),
        stockInsumos: String(nuevoStockInsumos)
      }
    }));
  };

  const actualizarPrecioProducto = (productId: number, nuevoPrecio: number) => {
    if (nuevoPrecio < 0) return;
    const productosActuales = nuevaCompra.productos || [];
    setNuevaCompra({
      ...nuevaCompra,
      productos: productosActuales.map(p =>
        p.id === productId ? { ...p, precio: nuevoPrecio } : p
      )
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        precio: String(nuevoPrecio)
      }
    }));
  };

  const actualizarPrecioVentaProducto = (productId: number, nuevoPrecioVenta: number) => {
    if (nuevoPrecioVenta < 0) return;
    const productosActuales = nuevaCompra.productos || [];
    setNuevaCompra({
      ...nuevaCompra,
      productos: productosActuales.map(p =>
        p.id === productId ? { ...p, precioVenta: nuevoPrecioVenta } : p
      )
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        precioVenta: String(nuevoPrecioVenta)
      }
    }));
  };

  const actualizarStockVentas = (productId: number, nuevoStock: number) => {
    if (nuevoStock < 0) return;
    const productosActuales = nuevaCompra.productos || [];
    const producto = productosActuales.find(p => p.id === productId);
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
      productos: productosActuales.map(p =>
        p.id === productId
          ? { ...p, stockVentas: clampedVentas, stockInsumos: clampedInsumos }
          : p
      )
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        stockVentas: String(clampedVentas),
        stockInsumos: String(clampedInsumos)
      }
    }));
  };

  const actualizarStockInsumos = (productId: number, nuevoStock: number) => {
    if (nuevoStock < 0) return;
    const productosActuales = nuevaCompra.productos || [];
    const producto = productosActuales.find(p => p.id === productId);
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
      productos: productosActuales.map(p =>
        p.id === productId
          ? { ...p, stockInsumos: clampedInsumos, stockVentas: clampedVentas }
          : p
      )
    });
    setTarjetaInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        stockInsumos: String(clampedInsumos),
        stockVentas: String(clampedVentas)
      }
    }));
  };

  const handleViewDetails = async (compra: Compra) => {
    try {
      // Show dialog immediately or loading state
      const detalles = await compraService.getDetallesPorCompra(compra.id);
      let responsableDocumento = '';
      try {
        const uid = (compra as any).usuarioId || (compra as any).UsuarioId || 0;
        if (uid) {
          const usuario = await apiService.getUsuarioById(Number(uid));
          responsableDocumento = String(
            (usuario as any)?.documento ||
            (usuario as any)?.Documento ||
            ''
          );
        }
      } catch {
        // silently ignore doc fetch errors
      }
      setSelectedCompra({ ...compra, detalles: detalles, responsableDocumento } as any);
      setIsDetailDialogOpen(true);
    } catch (error) {
      showErrorAlert("Error al cargar detalles", "No se pudieron cargar los detalles de la compra.");
    }
  };

  const handleCreateCompra = React.useCallback(async () => {
    if (creatingPurchase) return;
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

    // Validar que todos los productos tengan stockVentas + stockInsumos = cantidad
    const productosInvalidos = nuevaCompra.productos.filter(p => {
      const sumaStocks = p.stockVentas + p.stockInsumos;
      return sumaStocks !== p.cantidad;
    });

    if (productosInvalidos.length > 0) {
      const nombresInvalidos = productosInvalidos.map(p => p.nombre).join(', ');
      showErrorAlert("Error en distribución de stock", `Los siguientes productos tienen una distribución de stock incorrecta (la suma de ventas e insumos debe igualar la cantidad total): ${nombresInvalidos}`);
      return;
    }

    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento(subtotal);

    const resolveUsuarioId = async (): Promise<number> => {
      const numericId = Number(user.id);
      if (Number.isFinite(numericId) && numericId > 0) return numericId;
      const byList = (users || []).find(u => String(u.correo || '').toLowerCase() === String(user.email || '').toLowerCase());
      if (byList?.id && Number.isFinite(Number(byList.id))) return Number(byList.id);
      try {
        const all = await apiService.getUsuarios();
        const matched = (all || []).find(u => String(u.correo || '').toLowerCase() === String(user.email || '').toLowerCase());
        if (matched?.id && Number.isFinite(Number(matched.id))) return Number(matched.id);
      } catch {}
      return 0;
    };

    const usuarioIdNum = await resolveUsuarioId();
    if (!Number.isFinite(usuarioIdNum) || usuarioIdNum <= 0) {
      showErrorAlert("Usuario no registrado en la API", "Tu sesión está activa pero no se pudo vincular tu cuenta con el sistema. Cierra sesión y vuelve a ingresar para sincronizar tu usuario.");
      return;
    }

    const compraRequest: CreateCompraRequest = {
      proveedorId: Number(nuevaCompra.proveedorId),
      fecha: nuevaCompra.fechaRegistro || generateCurrentDate(),
      fechaFactura: nuevaCompra.fechaFactura,
      metodoPago: nuevaCompra.metodoPago,
      // subtotal and total removed as per API requirement
      iva: 0,
      descuento: descuento,
      usuarioId: usuarioIdNum,
      detalles: nuevaCompra.productos.map(p => ({
        productoId: p.id,
        cantidad: p.cantidad,
        precioUnitario: p.precio,
        cantidadVentas: Number.isFinite(p.stockVentas) ? p.stockVentas : 0,
        cantidadInsumos: Number.isFinite(p.stockInsumos) ? p.stockInsumos : 0
      }))
    };

    setCreatingPurchase(true);
    try {
      const compraCreada = await compraService.createCompra(compraRequest);

      try {
        const updates = nuevaCompra.productos.map(async (p) => {
          const full = await productoService.getProductoById(p.id);
          if (!full) return;
          const precioVentaFinal = (p as any).precioVenta !== undefined ? Number((p as any).precioVenta) : (full as any).precioVenta;
          const precioCompraFinal = Number(p.precio);
          const categoriaName = typeof full.categoria === 'string' ? full.categoria : full.categoria?.nombre || '';
          await productoService.updateProducto(p.id, {
            ...full,
            categoria: categoriaName || full.categoria || null,
            precioVenta: precioVentaFinal,
            precioCompra: precioCompraFinal,
          } as any);
        });
        await Promise.allSettled(updates);
      } catch {}

      // El backend ajusta los stocks según los detalles enviados

      const compraIdCreada = Number((compraCreada as any)?.id ?? 0);
      created("Compra creada ✔️", `La compra #${compraIdCreada > 0 ? compraIdCreada : numeroCompras} ha sido registrada exitosamente.`);
      setIsDialogOpen(false);
      setNuevaCompra({
        ...inicialNuevaCompra,
        fechaRegistro: generateCurrentDate()
      });
      setTarjetaInputs({});
      setCantidadProducto(0);
      setCantidadProductoInput('');
      setPrecioUnitario(0);
      setPrecioUnitarioInput('');
      setStockVentas(0);
      setStockInsumos(0);
      setStockVentasInput('');
      setStockInsumosInput('');
      setPorcentajeDescuentoInput('');

      // Recargar compras y productos (usando fuente consistente de insumos) para reflejar cambios de stock
      await Promise.all([
        loadCompras().catch(() => { }),
        loadProductos().catch(() => { })
      ]);
    } catch (error: any) {
      const msg = String(error?.message || 'Error al crear compra');
      const description = msg.includes('El usuario no existe')
        ? 'No se reconoció tu usuario en el sistema. Cierra sesión y vuelve a ingresar para sincronizar tu cuenta.'
        : (msg || 'Hubo un problema al guardar la compra o actualizar el stock.');
      showErrorAlert("Error al crear compra", description);
      console.error(error);
    } finally {
      setCreatingPurchase(false);
    }
  }, [user, nuevaCompra, inicialNuevaCompra, generateCurrentDate, loadCompras, created, creatingPurchase]);
  const handleAnularCompra = (compraId: number) => {
    const compra = compras.find(c => c.id === compraId);
    if (!compra) return;

    confirmDeleteAction(
      String(compraId),
      async () => {
        try {
          // 1. Obtener detalles ANTES de anular, para asegurar que tenemos las cantidades originales
          const detallesCompra = await compraService.getDetallesPorCompra(compraId);

          // 2. Anular la compra en el backend (esto revierte stock de ventas automáticamente)
          await compraService.anularCompra(compraId);

          // 3. Revertir manualmente el stock de insumos usando los detalles capturados
          try {
            for (const detalle of detallesCompra) {
              const productoId = Number(detalle.productoId);
              if (!productoId) continue;

              const cantidadTotal = Number(detalle.cantidad || 0);
              const cantidadVentas = Number(detalle.cantidadVentas || 0);
              const cantidadInsumosPersistida = Number(detalle.cantidadInsumos || 0);

              // Si el backend no persiste cantidadInsumos, inferimos el resto
              const insumosARevertir = cantidadInsumosPersistida > 0
                ? cantidadInsumosPersistida
                : Math.max(0, cantidadTotal - cantidadVentas);

              if (insumosARevertir > 0) {
                 await productoService.adjustStock(productoId, insumosARevertir, 'decrement', 'insumos');
              }
            }
          } catch (revertError) {
             console.error("Error al revertir stock de insumos en el cliente:", revertError);
          }

          await Promise.all([
            loadCompras().catch(() => { }),
            productoService.getProductos()
              .then(data => setProductos(data as any))
              .catch(() => setProductos([]))
          ]);
        } catch (error: any) {
          const errorMsg = error.message || "";
          if (errorMsg.includes("ya está anulada") || errorMsg.includes("ya esta anulada")) {
            showInfoAlert("Información", "Esta compra ya figuraba como anulada en el sistema.");
            await loadCompras().catch(() => { });
            return;
          }
          showErrorAlert("Error al anular", "No se pudo anular la compra.");
          console.error("Error al anular compra:", error);
        }
      },
      {
        confirmTitle: "Confirmar Anulación",
        confirmMessage: `¿Estás seguro de que deseas anular la compra?`,
        successTitle: "Compra anulada ✔️",
        successMessage: `La compra ha sido anulada exitosamente.`,
        requireInput: false,
        confirmButtonText: "Anular"
      }
    );
  };

  const generatePurchasePDF = async (compra: Compra) => {
    try {
      let detalles = (compra as any).detalles || [];
      if (!detalles || detalles.length === 0) {
        try {
          detalles = await compraService.getDetallesPorCompra(compra.id);
        } catch {
          showErrorAlert("No se pudieron cargar los detalles de la compra.");
          return;
        }
      }
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const hMargin = 20;

      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 65, 'F');

      try {
        doc.addImage(manitoLogo, 'JPEG', pageWidth / 2 - 12.5, 5, 25, 25);
      } catch {}

      const negocioNombre = "Manito BarberShop";
      const negocioEmail = "Edwainsolano007@gmail.com";
      const negocioDireccion = "Calle 79 #52 12 Aranjuez, Medellín";
      const negocioTelefono = "301 4836189";
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(negocioNombre, pageWidth - hMargin, 12, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(negocioEmail, pageWidth - hMargin, 18, { align: "right" });
      doc.text(negocioDireccion, pageWidth - hMargin, 24, { align: "right" });
      doc.text(negocioTelefono, pageWidth - hMargin, 30, { align: "right" });

      doc.setTextColor(216, 176, 129);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("MANITO BARBERSHOP", pageWidth / 2, 40, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(170, 170, 170);
      doc.text("Comprobante de Compra", pageWidth / 2, 48, { align: "center" });

      doc.setFillColor(216, 176, 129);
      doc.roundedRect(pageWidth / 2 - 25, 52, 50, 7, 3.5, 3.5, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const compraId = String((compra as any).numeroCompra || compra.id || "N/A");
      doc.text(`COMPRA #${compraId}`, pageWidth / 2, 56.5, { align: "center" });

      let y = 80;
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMACIÓN GENERAL", hMargin, y);

      doc.setDrawColor(216, 176, 129);
      doc.setLineWidth(0.5);
      doc.line(hMargin, y + 2, 85, y + 2);

      const responsableCompra = getCompraResponsableDisplay(compra as any);
      const fechaRegistro = formatDate((compra as any).fecha || '');
      const fechaFactura = (compra as any).fechaFactura ? formatDate((compra as any).fechaFactura) : 'N/A';
      const numeroCompraRegistro = String((compra as any).id ?? 'N/A');

      y += 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("N. de compra:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(numeroCompraRegistro, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Proveedor:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String((compra as any).proveedorNombre || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Fecha y Hora:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(fechaRegistro, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Estado:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(compra.estado || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Responsable:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(responsableCompra, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Fecha Factura:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(fechaFactura, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Método Pago:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String((compra as any).metodoPago || "N/A"), hMargin + 40, y);

      const totalItems = Array.isArray(detalles) ? detalles.reduce((sum, d) => sum + Number((d as any).cantidad || 0), 0) : 0;
      const subtotalNum = Number((compra as any).subtotal || 0);
      const ivaNum = Number((compra as any).iva || 0);
      const descuentoNum = Number((compra as any).descuento || 0);
      const totalNum = Number((compra as any).total || subtotalNum + ivaNum - descuentoNum);
      y += 15;
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE PRODUCTOS", hMargin, y);
      doc.line(hMargin, y + 2, 87, y + 2);

      y += 12;
      doc.setFillColor(26, 26, 26);
      doc.rect(hMargin, y, pageWidth - (hMargin * 2), 10, 'F');
      doc.setTextColor(216, 176, 129);
      doc.setFontSize(9);
      doc.text("PRODUCTO", hMargin + 2, y + 6.5);
      doc.text("CATEGORÍA", hMargin + 60, y + 6.5);
      doc.text("CANT.", hMargin + 100, y + 6.5, { align: "right" });
      doc.text("PREC. UNIT", hMargin + 130, y + 6.5, { align: "right" });
      doc.text("SUBTOTAL", hMargin + 160, y + 6.5, { align: "right" });

      y += 10;
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");

      if (!Array.isArray(detalles) || detalles.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.text("No hay detalles disponibles para esta compra.", pageWidth / 2, y + 10, { align: "center" });
      } else {
        detalles.forEach((item: any, index: number) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }

          if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(hMargin, y, pageWidth - (hMargin * 2), 8, 'F');
          }

          const nombre = String(item?.productoNombre || item?.nombre || 'Producto');
          const prodId = Number(item?.productoId || item?.id || 0);
          const categoriaDesdeDetalle = typeof item?.categoria === 'string' ? item.categoria : '';
          const prodMatch = productos.find(p => Number(p.id) === prodId);
          const categoriaRaw = categoriaDesdeDetalle || (prodMatch ? (prodMatch as any).categoria : null) || (item as any)?.categoria;
          const categoria = typeof categoriaRaw === 'string' ? categoriaRaw : String(categoriaRaw?.nombre || categoriaRaw || 'N/A');
          const cantidad = Number(item?.cantidad || 0);
          const precioUnitario = Number(item?.precioUnitario || item?.precio || 0);
          const subtotal = Number(item?.subtotal || (cantidad * precioUnitario) || 0);

          const nombreTruncado = nombre.length > 35 ? `${nombre.substring(0, 32)}...` : nombre;
          const catTruncada = categoria.length > 20 ? `${categoria.substring(0, 17)}...` : categoria;

          doc.setFontSize(8);
          doc.text(nombreTruncado, hMargin + 2, y + 5.5);
          doc.text(catTruncada || 'N/A', hMargin + 60, y + 5.5);

          doc.setFont("helvetica", "bold");
          doc.text(String(cantidad), hMargin + 100, y + 5.5, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.text(`$${formatCurrency(precioUnitario)}`, hMargin + 125, y + 5.5, { align: "right" });
          doc.setFont("helvetica", "bold");
          doc.text(`$${formatCurrency(subtotal)}`, hMargin + 160, y + 5.5, { align: "right" });
          doc.setFont("helvetica", "normal");

          y += 8;
        });
      }

      y += 8;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(hMargin, y, pageWidth - (hMargin * 2), 22, 2, 2, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`TOTAL INSUMOS: ${totalItems} UNIDADES`, pageWidth / 2, y + 8, { align: "center" });
      doc.setFontSize(14);
      doc.setTextColor(216, 176, 129);
      doc.text(`VALOR TOTAL: $ ${formatCurrency(totalNum)}`, pageWidth / 2, y + 17, { align: "center" });

      y = Math.max(275, y + 28);
      doc.setDrawColor(216, 176, 129);
      doc.line(hMargin, y, pageWidth - hMargin, y);

      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Documento generado automáticamente el ${new Date().toLocaleString('es-CO')}`, pageWidth / 2, y, { align: "center" });
      doc.text("MANITO BARBERSHOP - Sistema de Gestión de Insumos", pageWidth / 2, y + 4, { align: "center" });
      const filename = `Reporte_Compra_${(compra as any).numeroCompra || compra.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      created("PDF generado exitosamente", "El reporte de compra fue descargado correctamente.");
    } catch {
      showErrorAlert("Error al generar PDF", "No se pudo generar el reporte de compra.");
    }
  };

  const generatePurchaseReport = async (compra: Compra) => {
    let productosDetalle = compra.detalles || [];

    if (productosDetalle.length === 0) {
      try {
        const toastId = toast.loading("Obteniendo detalles para el reporte...");
        productosDetalle = await compraService.getDetallesPorCompra(compra.id);
        toast.dismiss(toastId);
      } catch (error) {
        console.error(error);
        showErrorAlert("Error al cargar reporte", "No se pudieron cargar los productos para el reporte.");
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Compra - ${compra.numeroCompra}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #d8b081; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { color: #d8b081; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .report-title { font-size: 18px; color: #666; }
          .info-section { margin: 20px 0; }
          .section-title { background-color: #f5f5f5; padding: 10px; font-weight: bold; margin-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .info-item { border-bottom: 1px solid #eee; padding: 8px 0; }
          .info-label { font-weight: bold; color: #666; }
          .info-value { color: #333; margin-top: 5px; }
          .products-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .products-table th, .products-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .products-table th { background-color: #f8f9fa; font-weight: bold; }
          .totals-section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total-final { font-size: 18px; font-weight: bold; color: #d8b081; border-top: 2px solid #d8b081; padding-top: 10px; margin-top: 15px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">MANITO BARBERSHOP</div>
          <div class="report-title">Reporte de Compra</div>
          <div>Fecha de generación: ${formatDate(new Date())}</div>
        </div>

        <div class="info-section">
          <div class="section-title">Información General</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">ID de Compra:</div>
              <div class="info-value">${(compra.numeroCompra || '').replace(/^(FC|CPR)-?/i, '')}</div>
            </div>
             <div class="info-item">
              <div class="info-label">N factura:</div>
              <div class="info-value">${(compra.numeroFactura || 'N/A').replace(/^(FC|CPR)-?/i, '')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado:</div>
              <div class="info-value">${compra.estado}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Proveedor:</div>
              <div class="info-value">${compra.proveedorNombre}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Responsable:</div>
              <div class="info-value">${compra.responsableNombre}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha de Registro:</div>
              <div class="info-value">${formatDate(compra.fecha)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha de Factura:</div>
              <div class="info-value">${compra.fechaFactura ? formatDate(compra.fechaFactura) : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Método de Pago:</div>
              <div class="info-value">${compra.metodoPago}</div>
            </div>
          </div>
        </div>

        ${productosDetalle.length > 0 ? `
        <div class="info-section">
          <div class="section-title">Productos</div>
          <table class="products-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productosDetalle.map((producto) => `
                <tr>
                  <td>${producto.productoNombre}</td>
                  <td>
                    ${producto.cantidad}
                    <br>
                    <small style="color: #666;">(🛒: ${producto.cantidadVentas} | 📦: ${producto.cantidadInsumos})</small>
                  </td>
                  <td>${formatCurrency(producto.precioUnitario)}</td>
                  <td>${formatCurrency(producto.subtotal || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="totals-section">
          <div class="section-title">Resumen Financiero</div>
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(compra.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>IVA:</span>
            <span>${formatCurrency(compra.iva)}</span>
          </div>
          <div class="total-row">
            <span>Descuento:</span>
            <span>-${formatCurrency(compra.descuento)}</span>
          </div>
          <div class="total-row total-final">
            <span>TOTAL:</span>
            <span>${formatCurrency(compra.total)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Este es un documento generado automáticamente por el sistema de gestión de barbería.</p>
          <p>Reporte generado el ${formatDate(new Date())} a las ${new Date().toLocaleTimeString('es-CO')}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Compra_${compra.numeroCompra || compra.id}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    success("Reporte HTML generado", "El reporte se ha generado y descargado correctamente.");
  };

  return (
    <>
      <main className="flex-1 overflow-auto bg-black-primary">
        <div style={{ display: 'none' }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Stats removed/hidden */}
        </div>

        <div className="elegante-card">
          <TableHeaderSection
            leftContent={(
              <>
              <button
                className="elegante-button-primary gap-2 flex items-center"
                onClick={() => onNavigate?.("RegistrarCompra")}
              >
                <Plus className="w-4 h-4" />
                Nueva Compra
              </button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <span style={{ display: 'none' }}></span>
                <DialogContent
                  className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto"
                  onInteractOutside={(e: any) => {
                    const target = e.target as HTMLElement | null;
                    // Si el clic se originó dentro de una alerta interna, NO cerrar el modal
                    if (target?.closest('[data-alert-container="true"]')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-white-primary flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-orange-primary" />
                      Registrar Nueva Compra
                    </DialogTitle>
                    <DialogDescription className="text-gray-lightest">
                      Completa la información de la compra al proveedor
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <Hash className="w-4 h-4 text-orange-primary" />
                          Número de Compra (Automático)
                        </Label>
                        <Input
                          value={numeroCompras.toString().padStart(3, "0")}
                          disabled
                          className="elegante-input bg-gray-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-primary" />
                          Fecha de Registro
                        </Label>
                        <Input
                          value={formatDate(nuevaCompra.fechaRegistro || new Date())}
                          disabled
                          readOnly
                          className="elegante-input bg-gray-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-primary" />
                          Fecha de Factura *
                        </Label>
                        <Input
                          type="date"
                          value={nuevaCompra.fechaFactura}
                          min={(() => {
                            const now = new Date();
                            const prev = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                            const y = prev.getFullYear();
                            const m = String(prev.getMonth() + 1).padStart(2, '0');
                            const d = String(prev.getDate()).padStart(2, '0');
                            return `${y}-${m}-${d}`;
                          })()}
                          max={(() => {
                            const now = new Date();
                            const y = now.getFullYear();
                            const m = String(now.getMonth() + 1).padStart(2, '0');
                            const d = String(now.getDate()).padStart(2, '0');
                            return `${y}-${m}-${d}`;
                          })()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const now = new Date();
                            const y = now.getFullYear();
                            const m = String(now.getMonth() + 1).padStart(2, '0');
                            const d = String(now.getDate()).padStart(2, '0');
                            const max = `${y}-${m}-${d}`;
                            const prev = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                            const min = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
                            if (!val) {
                              setNuevaCompra({ ...nuevaCompra, fechaFactura: '' });
                              return;
                            }
                            const clamped = val < min ? min : (val > max ? max : val);
                            setNuevaCompra({ ...nuevaCompra, fechaFactura: clamped });
                          }}
                          className={`elegante-input ${showCompraFormErrors && !nuevaCompra.fechaFactura ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                        />
                        {showCompraFormErrors && !nuevaCompra.fechaFactura && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-orange-primary" />
                          Metodo de Pago *
                        </Label>
                        <select
                          value={nuevaCompra.metodoPago}
                          onChange={(e) => setNuevaCompra({ ...nuevaCompra, metodoPago: e.target.value })}
                          className={`elegante-input w-full ${showCompraFormErrors && !nuevaCompra.metodoPago ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                        >
                          <option value="">Seleccionar metodo...</option>
                          <option value="Efectivo">Efectivo</option>
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Transferencia">Transferencia</option>
                        </select>
                        {showCompraFormErrors && !nuevaCompra.metodoPago && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 relative">
                        <Label className="text-white-primary flex items-center gap-2">
                          <Building className="w-4 h-4 text-orange-primary" />
                          Proveedor *
                        </Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                          <Input
                            placeholder="Escribe para buscar un proveedor..."
                            value={proveedorSearchTerm}
                            onChange={(e) => {
                              setProveedorSearchTerm(e.target.value);
                              setShowProveedorResults(true);
                            }}
                            onFocus={() => {
                              setProveedorSearchFocused(true);
                              setShowProveedorResults(true);
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setProveedorSearchFocused(false);
                                setShowProveedorResults(false);
                              }, 120);
                            }}
                            className={`elegante-input pl-11 w-full ${showCompraFormErrors && !nuevaCompra.proveedorId ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                          />
                          {proveedorSearchTerm && (
                            <button
                              type="button"
                              onClick={() => {
                                setProveedorSearchTerm('');
                                setShowProveedorResults(false);
                                setNuevaCompra({ ...nuevaCompra, proveedorId: 0 });
                              }}
                              title="Limpiar búsqueda"
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          {(proveedorSearchFocused && showProveedorResults && proveedorSearchTerm.trim() !== "") && (
                            <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
                              {(() => {
                                const query = normalizeSearchText(proveedorSearchTerm);
                                const filteredResults = proveedores
                                  .filter(p => {
                                    const searchableText = normalizeSearchText([
                                      p.id,
                                      p.nombre,
                                      p.nit,
                                      p.correo,
                                      p.numero,
                                      p.direccion
                                    ].join(" "));
                                    return searchableText.includes(query);
                                  })
                                  .slice(0, 50);

                                if (filteredResults.length === 0) {
                                  return (
                                    <div className="p-4 text-center text-gray-lightest italic">
                                      No se encontraron proveedores que coincidan.
                                    </div>
                                  );
                                }

                                return filteredResults.map((proveedor) => (
                                  <div
                                    key={proveedor.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setNuevaCompra({
                                        ...nuevaCompra,
                                        proveedorId: Number(proveedor.id ?? 0)
                                      });
                                      setProveedorSearchTerm(
                                        `${proveedor.nombre || ""}${proveedor.nit ? ` — NIT ${proveedor.nit}` : ""}`
                                      );
                                      setShowProveedorResults(false);
                                    }}
                                    onClick={() => {
                                      setNuevaCompra({
                                        ...nuevaCompra,
                                        proveedorId: Number(proveedor.id ?? 0)
                                      });
                                      setProveedorSearchTerm(
                                        `${proveedor.nombre || ""}${proveedor.nit ? ` — NIT ${proveedor.nit}` : ""}`
                                      );
                                      setShowProveedorResults(false);
                                    }}
                                    className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer group"
                                  >
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
                                  </div>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                        {showCompraFormErrors && !nuevaCompra.proveedorId && (
                          <p className="text-xs text-red-400 mt-1">Debes seleccionar un proveedor del buscador.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-orange-primary" />
                          Porcentaje Descuento (%)
                        </Label>
                        <Input
                          type="number"
                          value={porcentajeDescuentoInput}
                          onChange={(e) => {
                            if (e.target.value.length <= 5) {
                              handlePorcentajeDescuentoInputChange(e.target.value);
                            }
                          }}
                          className="elegante-input no-spin"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <div className="flex justify-start mt-1">
                          <span className="text-xs text-gray-500 font-medium">
                            {porcentajeDescuentoInput.length}/5 caracteres
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white-primary">Agregar Productos</h3>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-2 relative">
                          <Label className="text-white-primary flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-orange-primary" />
                            Producto *
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                          <Input
                              placeholder="Escribe para buscar un producto..."
                              value={productSearchTerm}
                              onChange={(e) => {
                                setProductSearchTerm(e.target.value);
                                setShowProductResults(true);
                              }}
                            onFocus={() => {
                              setProductSearchFocused(true);
                              setShowProductResults(true);
                            }}
                            onBlur={() => {
                              // Pequeño retraso para permitir seleccionar un ítem antes de cerrar
                              setTimeout(() => {
                                setProductSearchFocused(false);
                                setShowProductResults(false);
                              }, 120);
                            }}
                              className={`elegante-input pl-11 w-full ${showProductoSelectorError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                            />
                            {productSearchTerm && (
                              <button
                                type="button"
                                onClick={() => {
                                  setProductSearchTerm('');
                                  setShowProductResults(false);
                                  setProductoSeleccionado('');
                                }}
                                title="Limpiar búsqueda"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {(productSearchFocused && showProductResults && productSearchTerm.trim() !== "") && (
                              <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
                                {(() => {
                                  const query = normalizeSearchText(productSearchTerm);
                                  const filteredResults = productos
                                    .filter(p => {
                                      const searchableText = normalizeSearchText([
                                        p.id,
                                        p.nombre,
                                      getCategoriaNombre(p),
                                        (p as any).stock,
                                        (p as any).stockVentas,
                                        (p as any).stockInsumos,
                                        p.precio
                                      ].join(" "));
                                      return searchableText.includes(query);
                                    })
                                    .slice(0, 20);

                                  if (filteredResults.length === 0) {
                                    return (
                                      <div className="p-4 text-center text-gray-lightest italic">
                                        Sin resultados.
                                      </div>
                                    );
                                  }

                                  return filteredResults.map((producto) => (
                                    <div
                                      key={producto.id}
                                      onMouseDown={(e) => {
                                        // Seleccionar antes de que el input pierda el foco
                                        e.preventDefault();
                                        setProductoSeleccionado(producto.id.toString());
                                        setProductSearchTerm(producto.nombre);
                                        setShowProductResults(false);
                                      }}
                                      onClick={() => {
                                        setProductoSeleccionado(producto.id.toString());
                                        setProductSearchTerm(producto.nombre);
                                        setShowProductResults(false);
                                        if (showAddCompraProductoErrors) setShowAddCompraProductoErrors(false);
                                      }}
                                      className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer group"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <p className="text-white-primary font-medium text-sm group-hover:text-orange-secondary transition-colors">
                                            {producto.nombre}
                                          </p>
                                          <p className="text-[10px] text-gray-lightest">${formatCurrency(getPrecioCompra(producto as any))}</p>
                                          <p className="text-[10px] text-gray-400">{getCategoriaNombre(producto) || 'Sin categoría'}</p>
                                        </div>
                                        <div className="text-right">
                                          <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] text-gray-lightest leading-none">Stock ventas</span>
                                              <span className={`text-xs font-bold ${(((producto as any).stockVentas ?? 0) > 0) ? 'text-green-400' : 'text-red-400'}`}>
                                                {Number((producto as any).stockVentas ?? 0)}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] text-gray-lightest leading-none">Stock insumos</span>
                                              <span className={`text-xs font-bold ${(((producto as any).stockInsumos ?? (producto as any).stock ?? 0) > 0) ? 'text-blue-400' : 'text-red-400'}`}>
                                                {Number((producto as any).stockInsumos ?? (producto as any).stock ?? 0)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                          {showProductoSelectorError && (
                            <p className="text-xs text-red-400">Debes seleccionar un producto del buscador.</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white-primary flex items-center gap-2">
                            <Hash className="w-4 h-4 text-orange-primary" />
                            Cantidad Total *
                          </Label>
                          <Input
                            type="number"
                            value={cantidadProductoInput}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') {
                                e.preventDefault();
                              }
                            }}
                            onPaste={(e) => {
                              const text = e.clipboardData?.getData('text') || '';
                              if (/[^\d]/.test(text) || text.length > 4) {
                                e.preventDefault();
                                const cleaned = text.replace(/\D+/g, '').slice(0, 4);
                                handleCantidadProductoInputChange(cleaned);
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D+/g, '').slice(0, 4);
                              if (val.length <= 4) {
                                handleCantidadProductoInputChange(val);
                              }
                            }}
                            className={`elegante-input no-spin ${showCantidadProductoError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                            min="1"
                          />
                          {showCantidadProductoError && (
                            <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                          )}
                        </div>
                      </div>

                      

                      <div className="p-4 bg-orange-primary/10 border border-orange-primary/30 rounded-lg space-y-4">
                        <div className="flex items-center gap-2 text-orange-primary text-sm font-medium">
                          <Boxes className="w-4 h-4" />
                              <span>Distribución de Stock (debe sumar {cantidadProducto})</span>
                              {esSoloVentaSeleccionado && (
                                <span className="ml-2 px-2 py-0.5 text-[11px] rounded bg-gray-dark text-gray-lightest border border-gray-600">
                                  Producto solo para venta
                                </span>
                              )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white-primary flex items-center gap-2">
                              <Boxes className="w-4 h-4 text-orange-primary" />
                              Stock para Ventas
                            </Label>
                            <Input
                              type="number"
                              value={stockVentasInput}
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
                                handleStockVentasInputChange(cleaned);
                              }
                            }}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D+/g, '');
                              // Clamp al máximo permitido (cantidadProducto)
                              const max = Math.max(0, Number.isFinite(cantidadProducto) ? cantidadProducto : 0);
                              const clamped = cleaned ? String(Math.min(parseInt(cleaned, 10) || 0, max)) : '';
                              handleStockVentasInputChange(clamped);
                            }}
                              className={`elegante-input no-spin ${(showStockVentasError || showDistribucionError) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                              min="0"
                              max={cantidadProducto}
                            />
                            {showStockVentasError && (
                              <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                            )}
                            {showExcesoVentas && (
                              <p className="text-xs text-red-400">Máximo permitido: {maxVentasPermitido}.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white-primary flex items-center gap-2">
                              <Boxes className="w-4 h-4 text-orange-primary" />
                              Stock para Entregas
                            </Label>
                            <Input
                              type="number"
                              value={stockInsumosInput}
                                  disabled={esSoloVentaSeleccionado}
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
                                handleStockInsumosInputChange(cleaned);
                              }
                            }}
                            onChange={(e) => {
                                    if (esSoloVentaSeleccionado) return;
                              const cleaned = e.target.value.replace(/\D+/g, '');
                              const max = Math.max(0, Number.isFinite(cantidadProducto) ? cantidadProducto : 0);
                              const clamped = cleaned ? String(Math.min(parseInt(cleaned, 10) || 0, max)) : '';
                              handleStockInsumosInputChange(clamped);
                            }}
                              className={`elegante-input no-spin ${(showStockInsumosError || showDistribucionError) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                              min="0"
                              max={cantidadProducto}
                            />
                            {showStockInsumosError && (
                              <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                            )}
                            {showExcesoEntregas && (
                              <p className="text-xs text-red-400">Máximo permitido: {maxEntregasPermitido}.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white-primary">ㅤ</Label>
                            <button
                              onClick={agregarProducto}
                              className="elegante-button-primary w-full"
                            >
                              Agregar Producto
                            </button>
                          </div>
                        </div>
                        {showDistribucionExceso && (
                          <p className="text-red-400 text-sm">
                            ⚠️ Estás sobrepasando la cantidad total ({cantidadProducto}).
                          </p>
                        )}
                        {showDistribucionFalta && (
                          <p className="text-red-400 text-sm">
                            ⚠️ Faltan {cantidadProducto - (stockVentas + stockInsumos)} unidades por asignar (Ventas + Entregas debe sumar {cantidadProducto}).
                          </p>
                        )}
                      </div>
                      {(showCompraFormErrors || showAddCompraProductoErrors) && noProductosAgregados && (
                        <p className="text-xs text-red-400">Debes agregar al menos un producto.</p>
                      )}

                      {nuevaCompra.productos && nuevaCompra.productos.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-medium text-white-primary">Productos Agregados:</h4>


                          </div>
                          <div className="space-y-2 max-h-52 overflow-y-auto">
                            {nuevaCompra.productos.map((producto, index) => (
                              <div key={index} className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20">
                                <div className="flex items-center gap-4 flex-nowrap min-w-0">
                                  {/* Espacio a la izquierda para desplazar la imagen a la derecha */}
                                  <div className="shrink-0 w-6" aria-hidden />
                                  {/* Imagen del producto */}
                                  <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                    <ImageRenderer
                                      url={producto.imagen}
                                      alt={producto.nombre}
                                      className="w-full h-full border-0 bg-transparent"
                                    />
                                  </div>
                                  {/* Nombre y categoría del producto — centrado en la tarjeta */}
                                  <div className="min-w-0 flex-1 shrink flex flex-col items-center justify-center">
                                    <span
                                      className="text-white-primary font-semibold text-base truncate block text-center w-full"
                                      title={producto.nombre}
                                    >
                                      {producto.nombre}
                                    </span>
                                    {('categoria' in producto) && (
                                      <span className="text-[11px] text-gray-400 truncate block text-center w-full">
                                        {(producto as any).categoria || 'Sin categoría'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Total — label arriba, input abajo */}
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <label className="text-[11px] text-gray-400 font-normal">Total</label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={getTarjetaInput(producto, 'cantidad')}
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
                                          actualizarTarjetaInput(producto.id, 'cantidad', cleaned);
                                        }
                                      }}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/\D+/g, '');
                                        actualizarTarjetaInput(producto.id, 'cantidad', cleaned);
                                      }}
                                      className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5"
                                    />
                                  </div>

                                  {/* Ventas — label arriba, input abajo */}
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <label className="text-[11px] text-gray-400 font-normal">Ventas</label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={getTarjetaInput(producto, 'stockVentas')}
                                      onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === 'e' || e.key === '+') {
                                          e.preventDefault();
                                        }
                                      }}
                                      onPaste={(e) => {
                                        const text = e.clipboardData?.getData('text') || '';
                                        if (/[^\d]/.test(text)) {
                                          e.preventDefault();
                                          const cleaned = text.replace(/\D+/g, '');
                                          actualizarTarjetaInput(producto.id, 'stockVentas', cleaned);
                                        }
                                      }}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/-/g, '');
                                        actualizarTarjetaInput(producto.id, 'stockVentas', cleaned);
                                      }}
                                      className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 border-green-500/20"
                                    />
                                  </div>

                                  {/* Insumos — label arriba, input abajo */}
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <label className="text-[11px] text-gray-400 font-normal">Insumos</label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={getTarjetaInput(producto, 'stockInsumos')}
                                      disabled={isSaleOnly(producto as any)}
                                      onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === 'e' || e.key === '+') {
                                          e.preventDefault();
                                        }
                                      }}
                                      onPaste={(e) => {
                                        if (isSaleOnly(producto as any)) {
                                          e.preventDefault();
                                          return;
                                        }
                                        const text = e.clipboardData?.getData('text') || '';
                                        if (/[^\d]/.test(text)) {
                                          e.preventDefault();
                                          const cleaned = text.replace(/\D+/g, '');
                                          actualizarTarjetaInput(producto.id, 'stockInsumos', cleaned);
                                        }
                                      }}
                                      onChange={(e) => {
                                        if (isSaleOnly(producto as any)) return;
                                        const cleaned = e.target.value.replace(/-/g, '');
                                        actualizarTarjetaInput(producto.id, 'stockInsumos', cleaned);
                                      }}
                                      className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 border-blue-500/20"
                                    />
                                  </div>

                                  {/* Precio compra — label arriba, input abajo */}
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <label className="text-[11px] text-gray-400 font-normal">Precio compra</label>
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={getTarjetaInput(producto, 'precio')}
                                      onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.') {
                                          e.preventDefault();
                                        }
                                      }}
                                      onPaste={(e) => {
                                        const text = e.clipboardData?.getData('text') || '';
                                        const cleaned = text.replace(/\D+/g, '').slice(0, 6);
                                        e.preventDefault();
                                        actualizarTarjetaInput(producto.id, 'precio', cleaned);
                                      }}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/\D+/g, '').slice(0, 6);
                                        actualizarTarjetaInput(producto.id, 'precio', cleaned);
                                      }}
                                      className="w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5"
                                    />
                                  </div>

                                  {/* Precio venta — label arriba, input abajo */}
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <label className="text-[11px] text-gray-400 font-normal">Precio venta</label>
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={getTarjetaInput(producto as any, 'precioVenta')}
                                      onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.') {
                                          e.preventDefault();
                                        }
                                      }}
                                      onPaste={(e) => {
                                        const text = e.clipboardData?.getData('text') || '';
                                        const cleaned = text.replace(/\D+/g, '').slice(0, 6);
                                        e.preventDefault();
                                        actualizarTarjetaInput(producto.id, 'precioVenta', cleaned);
                                      }}
                                      onChange={(e) => {
                                        const cleaned = e.target.value.replace(/\D+/g, '').slice(0, 6);
                                        actualizarTarjetaInput(producto.id, 'precioVenta', cleaned);
                                      }}
                                      className="w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5"
                                    />
                                  </div>

                                  {/* Subtotal — label arriba, valor abajo */}
                                  <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                                    <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                                    <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7">
                                      ${formatCurrency(producto.precio * producto.cantidad)}
                                    </span>
                                  </div>

                                  {producto.stockVentas + producto.stockInsumos !== producto.cantidad && (
                                    <span className="shrink-0 text-red-400 text-xs" title="Ventas + Insumos = Total">⚠️</span>
                                  )}

                                  <button
                                    onClick={() => eliminarProducto(producto.id)}
                                    className="shrink-0 p-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                                    title="Eliminar producto"
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

                      {nuevaCompra.productos && nuevaCompra.productos.length > 0 && (
                        <div className="bg-gray-darker p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-gray-lightest">
                            <span>Subtotal:</span>
                            <span>${formatCurrency(calcularSubtotal())}</span>
                          </div>
                          {nuevaCompra.porcentajeDescuento > 0 && (
                            <div className="flex justify-between text-gray-lightest">
                              <span>Descuento ({nuevaCompra.porcentajeDescuento}%):</span>
                              <span>-${formatCurrency(calcularDescuento(calcularSubtotal()))}</span>
                            </div>
                          )}
                          <hr className="border-gray-medium" />
                          <div className="flex justify-between text-white-primary font-bold text-lg">
                            <span>Total:</span>
                            <span className="text-orange-primary">${formatCurrency(calcularTotal())}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
                      <button
                        onClick={() => {
                          setShowCompraFormErrors(false);
                          setShowAddCompraProductoErrors(false);
                          setIsDialogOpen(false);
                          setNuevaCompra(inicialNuevaCompra);
                          setTarjetaInputs({});
                          setCantidadProducto(0);
                          setCantidadProductoInput('');
                          setPrecioUnitario(0);
                          setPrecioUnitarioInput('');
                          setStockVentas(0);
                          setStockInsumos(0);
                          setStockVentasInput('');
                          setStockInsumosInput('');
                          setPorcentajeDescuentoInput('');
                        }}
                        className="elegante-button-secondary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreateCompra}
                        className="elegante-button-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={creatingPurchase}
                      >
                        {creatingPurchase ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black-primary"></div>
                            Registrando...
                          </>
                        ) : (
                          'Crear Compra'
                        )}
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar por cualquier campo de la tabla..."
            statusFilter={{
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value as "all" | "completada" | "anulada");
                setCurrentPage(1);
              },
              options: [
                { value: "all", label: "Todos" },
                { value: "completada", label: "Completadas" },
                { value: "anulada", label: "Anuladas" },
              ],
            }}
            recordsText={`Mostrando ${displayedCompras.length} de ${filteredCompras.length} compras`}
            recordsPlacement="left"
          />

          <div className="overflow-x-auto">
            <table className="w-full">
                  <thead className={loading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                    <tr className="border-b border-gray-dark">
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Número</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Documento/NIT Prov.</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Proveedor</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Total</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Fecha</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableLoadingStateRow
                        colSpan={7}
                        title="Cargando compras..."
                      />
                    ) : displayedCompras.length > 0 ? displayedCompras.map((compra) => (
                      <CompraRow
                        key={compra.id}
                        compra={compra as any}
                        onAnular={handleAnularCompra}
                        onViewDetails={handleViewDetails}
                        onGenerateReport={generatePurchasePDF}
                        getEstadoColor={getEstadoColor}
                      />
                    )) : (
                      <TableEmptyStateRow
                        colSpan={7}
                        title="No se encontraron compras"
                        description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                        onReload={() => loadCompras(false)}
                      />
                    )}
                  </tbody>
                </table>

                {/* Paginación */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-dark">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-lightest">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-lightest">Filas por página:</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={() => {
                          setItemsPerPage(5);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[110px] h-8 bg-gray-darker border-gray-dark text-gray-lightest">
                          <SelectValue placeholder={itemsPerPage.toString()} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-darkest border-gray-dark text-gray-lightest">
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <EllipsisPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                    className="mx-0 w-auto justify-end"
                  />
                </div>
          </div>
        </div>

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto text-white-primary">
            {selectedCompra && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-white-primary flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-orange-primary" />
                    Detalle de Compra
                  </DialogTitle>
                  <DialogDescription className="text-gray-lightest">
                    Información registrada de la compra (solo lectura)
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-primary" />
                        Número de Compra
                      </Label>
                      <Input
                        value={(selectedCompra.numeroCompra || String(selectedCompra.id)).replace(/^(FC|CPR)-?/i, '')}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-primary" />
                        Fecha de Registro
                      </Label>
                      <Input
                        value={formatDate(selectedCompra.fecha)}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-primary" />
                        Fecha de Factura
                      </Label>
                      <Input
                        type="date"
                        value={selectedCompra.fechaFactura || ''}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-orange-primary" />
                        Método de Pago
                      </Label>
                      <Input
                        value={selectedCompra.metodoPago || 'N/A'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Building className="w-4 h-4 text-orange-primary" />
                        Proveedor
                      </Label>
                      <Input
                        value={selectedCompra.proveedorNombre || 'N/A'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-orange-primary" />
                        Porcentaje Descuento (%)
                      </Label>
                      <Input
                        type="number"
                        value={selectedCompra.subtotal > 0 ? ((selectedCompra.descuento / selectedCompra.subtotal) * 100).toFixed(2) : '0'}
                        disabled
                        className="elegante-input no-spin bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-3">
                      <Label className="text-white-primary flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-primary" />
                        Responsable
                      </Label>
                      <Input
                        value={getCompraResponsableDisplay(selectedCompra)}
                        disabled
                        className="elegante-input bg-gray-medium w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        Estado
                      </Label>
                      <div className="h-10 flex items-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(selectedCompra.estado)}`}>
                          {selectedCompra.estado === 'Anulada' ? 'Anulada' : 'Completada'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedCompra.detalles && selectedCompra.detalles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-medium text-white-primary">Productos Agregados:</h4>
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {selectedCompra.detalles.map((detalle, idx) => {
                          const stockVentasDetalle = detalle.cantidadVentas ?? 0;
                          const stockInsumosDetalle = detalle.cantidadInsumos ?? 0;
                          // Usar la imagen que viene directamente en el detalle para mayor confiabilidad
                          const imgUrl = detalle.productoImagen;

                          return (
                            <div key={idx} className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20">
                              <div className="flex items-center gap-4 flex-nowrap min-w-0">
                                <div className="shrink-0 w-6" aria-hidden />
                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                  <ImageRenderer
                                    url={imgUrl}
                                    alt={detalle.productoNombre || 'Producto'}
                                    className="w-full h-full border-0 bg-transparent"
                                  />
                                </div>
                                <div className="min-w-0 flex-1 shrink flex items-center justify-center">
                                  <span className="text-white-primary font-semibold text-base truncate block text-center w-full" title={detalle.productoNombre || 'Producto'}>
                                    {detalle.productoNombre || 'Producto'}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <label className="text-[11px] text-gray-400 font-normal">Total</label>
                                  <Input type="number" value={detalle.cantidad} disabled className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-medium" />
                                </div>

                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <label className="text-[11px] text-gray-400 font-normal">Ventas</label>
                                  <Input type="number" value={stockVentasDetalle} disabled className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 border-green-500/20 bg-gray-medium" />
                                </div>

                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <label className="text-[11px] text-gray-400 font-normal">Insumos</label>
                                  <Input type="number" value={stockInsumosDetalle} disabled className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 border-blue-500/20 bg-gray-medium" />
                                </div>

                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <label className="text-[11px] text-gray-400 font-normal">Precio unit.</label>
                                  <Input type="number" value={detalle.precioUnitario} disabled className="w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-medium" />
                                </div>

                                <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                                  <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                                  <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7">
                                    ${formatCurrency((detalle.cantidad || 0) * (detalle.precioUnitario || 0))}
                                  </span>
                                </div>

                                {(stockVentasDetalle + stockInsumosDetalle) !== detalle.cantidad && (
                                  <span className="shrink-0 text-red-400 text-xs" title="Ventas + Insumos = Total"></span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-darker p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-gray-lightest">
                      <span>Subtotal:</span>
                      <span>${formatCurrency(selectedCompra.subtotal)}</span>
                    </div>
                    {selectedCompra.descuento > 0 && (
                      <div className="flex justify-between text-gray-lightest">
                        <span>
                          Descuento ({selectedCompra.subtotal > 0 ? ((selectedCompra.descuento / selectedCompra.subtotal) * 100).toFixed(2) : '0'}%):
                        </span>
                        <span>-${formatCurrency(selectedCompra.descuento)}</span>
                      </div>
                    )}
                    <hr className="border-gray-medium" />
                    <div className="flex justify-between text-white-primary font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-orange-primary">${formatCurrency(selectedCompra.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark mt-4">
                  <button
                    onClick={() => setIsDetailDialogOpen(false)}
                    className="elegante-button-secondary"
                  >
                    Cerrar
                  </button>
                  {selectedCompra && (
                    <button
                      onClick={() => handleAnularCompra(Number(selectedCompra.id))}
                      className={`elegante-button-primary ${String(selectedCompra.estado || '').toLowerCase().includes('anulad') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={String(selectedCompra.estado || '').toLowerCase().includes('anulad')}
                    >
                      {String(selectedCompra.estado || '').toLowerCase().includes('anulad') ? 'Compra Anulada' : 'Anular Compra'}
                    </button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <DoubleConfirmationContainer />
      <AlertContainer />
    </>
  );
}
