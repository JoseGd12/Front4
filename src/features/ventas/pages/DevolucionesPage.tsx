import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { Input } from "../../../shared/components/ui/input";
import {
  Plus,
  Search,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileText,
  FileDown,
  Download,
  User as UserIcon,
  IdCard as IdCard,
  Filter,
  Check,
  History,
  AlertCircle,
  Wallet,
  Ban,
  Receipt,
  ShoppingBag,
  DollarSign,
  TrendingDown,
  Calendar,
  X,
  ShieldCheck,
  Hash
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../../shared/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { DatePicker } from "../../../shared/components/ui/DatePicker";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";

import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { devolucionService } from "../services/devolucionService";
import { ventaService } from "../services/ventaService";
import { clientesService } from "../../clientes/services/clientesService";
import { productoService } from "../../productos/services/productos";
import { categoriaService } from "../../inventario/services/categoriaService";
import { barberosService } from "../../administracion/services/barberosService";
import { entregaInsumosService } from "../../inventario/services/entregaInsumosService";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { useAuth } from "../../../shared/contexts/AuthContext"; // Added
import manitoLogo from "../../../assets/Manito.jpeg";

// Función para formatear moneda colombiana
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO');
};

const normalizeSearchText = (value: unknown): string => {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const resolveImageSrc = (rawValue: unknown): string => {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  return value;
};

// Motivos estandarizados - Solo para productos
const MOTIVOS_DEVOLUCION = [
  { value: 'producto_defectuoso', label: 'Producto Defectuoso' },
  { value: 'error_compra', label: 'Error en la Compra' },
  { value: 'producto_vencido', label: 'Producto Vencido' },
  { value: 'reaccion_alergica', label: 'Reacción Alérgica' },
  { value: 'no_conforme', label: 'No Conforme con Expectativas' },
  { value: 'cambio_opinion', label: 'Cambio de Opinión' },
  { value: 'otros', label: 'Otros' }
];

// Función para calcular días restantes de garantía (fija 15 días)
const getRemainingWarrantyDays = (fechaISO: string, _garantiaMeses: number): number | null => {
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

// ─── Design Tokens (Front4 palette) ──────────────────────────────────────────
const T = {
  orangePrimary: "#d8b081",
  orangeDarker: "#c4a06d",
  blackPrimary: "#212020",
  blackSecondary: "#111111",
  grayDarkest: "#1a1919",
  grayDarker: "#2a2a2a",
  grayDark: "#3a3a3a",
  grayMedium: "#333131",
  grayLightest: "#d0d0d0",
  whitePrimary: "#ffffff",
  whiteSecondary: "#f5f5f5",
  green: "#7aab8a",
  red: "#b07070",
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  .dev-root {
    min-height: 100vh;
    background: ${T.blackPrimary};
    color: ${T.whitePrimary};
    padding: 0px;
  }

  /* ── Card ── */
  .dev-card {
    background: ${T.grayDarkest};
    border: 1px solid ${T.grayDarker};
    border-radius: 14px;
    overflow: hidden;
  }

  /* ── Toolbar ── */
  .dev-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid ${T.grayDarker};
    flex-wrap: wrap;
  }

  /* ── Search ── */
  .dev-search-wrap {
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 380px;
  }
  .dev-search-icon {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: ${T.grayDark};
    pointer-events: none;
    display: flex;
  }
  .dev-search {
    width: 100%;
    padding: 9px 14px 9px 36px;
    background: ${T.blackSecondary};
    border: 1px solid ${T.grayDarker};
    border-radius: 8px;
    color: ${T.whitePrimary};
    font-size: 13px;
    outline: none;
    font-family: inherit;
    transition: border-color .15s;
  }
  .dev-search::placeholder { color: ${T.grayDark}; }
  .dev-search:focus { border-color: ${T.orangePrimary}; }

  /* ── Select ── */
  .dev-select {
    background: ${T.blackSecondary};
    border: 1px solid ${T.grayDarker};
    border-radius: 8px;
    padding: 9px 14px;
    color: ${T.whitePrimary};
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition: border-color .15s;
  }
  .dev-select:focus { border-color: ${T.orangePrimary}; }

  .dev-count {
    margin-left: auto;
    font-size: 13px;
    color: ${T.grayLightest};
    white-space: nowrap;
  }

  /* ── Table ── */
  .dev-table { width: 100%; border-collapse: collapse; }

  .dev-thead th {
    padding: 13px 16px;
    font-size: 11px;
    font-weight: 700;
    color: ${T.grayLightest};
    text-align: center;
    letter-spacing: .06em;
    text-transform: uppercase;
    border-bottom: 1px solid ${T.grayDarker};
    white-space: nowrap;
    background: ${T.grayDarkest};
  }
  .dev-thead th:first-child { text-align: left; padding-left: 20px; }

  /* ── Group row ── */
  .dev-group-row {
    background: ${T.grayDarkest};
    border-bottom: 1px solid ${T.grayDarker};
    cursor: pointer;
    transition: background .15s;
  }
  .dev-group-row:hover { background: ${T.grayDark}; }

  .dev-group-cell { padding: 14px 16px; }
  .dev-group-cell:first-child { padding-left: 20px; }

  .dev-group-inner { display: flex; align-items: center; gap: 12px; }

  .dev-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: ${T.blackPrimary};
    flex-shrink: 0;
    background: ${T.orangePrimary};
  }

  .dev-client-name {
    font-size: 14px;
    font-weight: 400;
    color: ${T.grayLightest};
    line-height: 1.3;
  }
  .dev-client-doc {
    font-size: 12px;
    color: ${T.grayLightest};
    margin-top: 1px;
  }

  /* ── Expand button ── */
  .dev-expand-btn {
    background: rgba(216,176,129,0.08);
    border: 1px solid rgba(216,176,129,0.2);
    border-radius: 7px;
    padding: 6px 13px;
    color: ${T.grayLightest};
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    font-family: inherit;
    transition: background .15s, border-color .15s, color .15s;
  }
  .dev-expand-btn:hover {
    background: rgba(216,176,129,0.15);
    border-color: ${T.orangePrimary};
    color: ${T.orangePrimary};
  }

  /* ── Item rows ── */
  .dev-item-row {
    border-bottom: 1px solid rgba(42,42,42,0.8);
    background: ${T.blackSecondary};
    transition: background .12s;
  }
  .dev-item-row:hover { background: ${T.grayDarkest}; }

  .dev-td {
    padding: 12px 16px;
    font-size: 13px;
    color: ${T.grayLightest};
    text-align: center;
    vertical-align: middle;
  }

  /* ── Number accent ── */
  .dev-num {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    color: ${T.orangePrimary};
  }

  /* ── Estado badges ── */
  .badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .badge-completada {
    background: rgba(122,171,138,0.1);
    color: ${T.green};
    border: 1px solid rgba(122,171,138,0.2);
  }
  .badge-anulada {
    background: rgba(176,112,112,0.1);
    color: #b07070;
    border: 1px solid rgba(176,112,112,0.2);
  }
  .badge-pendiente {
    background: rgba(168,144,96,0.1);
    color: #a89060;
    border: 1px solid rgba(168,144,96,0.2);
  }

  /* ── Icon action buttons ── */
  .dev-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: ${T.grayLightest};
    padding: 6px;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    transition: background .12s, color .12s;
  }
  .dev-icon-btn:hover         { background: ${T.grayDarker}; }
  .dev-icon-btn:disabled      { opacity: .3; cursor: not-allowed; }
  .dev-icon-btn.ban:hover     { color: #b07070; }
  .dev-icon-btn.eye:hover     { color: ${T.orangePrimary}; }
  .dev-icon-btn.pdf:hover     { color: #60a5fa; }

  /* ── Sub-table ── */
  .dev-sub-label {
    padding: 10px 20px 8px 20px;
    font-size: 12px;
    color: ${T.grayLightest};
    border-bottom: 1px solid ${T.grayDarker};
    background: rgba(26,25,25,0.6);
  }

  .dev-sub-header th {
    padding: 9px 16px;
    font-size: 10px;
    font-weight: 700;
    color: ${T.grayDark};
    text-align: center;
    text-transform: uppercase;
    letter-spacing: .06em;
    background: rgba(17,17,17,0.5);
    border-bottom: 1px solid ${T.grayDarker};
    white-space: nowrap;
  }
  .dev-sub-header th:first-child { text-align: left; padding-left: 52px; }

  /* ── Empty / chevron ── */
  .dev-empty {
    padding: 48px;
    text-align: center;
    color: ${T.grayDark};
    font-size: 14px;
  }
  .chev-custom { display: inline-flex; transition: transform .2s; }
  .chev-custom.open { transform: rotate(180deg); }

  /* ── Expanded border accent ── */
  .dev-exp-cell {
    padding: 0;
    background: ${T.blackSecondary};
  }
  .dev-exp-cell:has(.dev-accordion-wrap.open) {
    border-bottom: 2px solid rgba(216,176,129,0.18);
    border-left: 3px solid ${T.orangePrimary};
  }

  /* ── Accordion animation ── */
  .dev-accordion-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.32s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  .dev-accordion-wrap.open {
    grid-template-rows: 1fr;
  }
  .dev-accordion-inner {
    overflow: hidden;
  }
`;

// Tipos de datos actualizados
interface Devolucion {
  id: string;
  cliente: string;
  clienteId: string;
  clienteDocumento?: string;
  producto: string;
  categoria?: string;
  productoImagen?: string;
  cantidad: number;
  precioUnitario: number;
  motivoCategoria: string;
  motivoDetalle: string;
  observaciones?: string;
  fecha: string;
  hora: string;
  monto: number;
  estado: 'Completada' | 'Anulada';
  responsable: string;
  barbero?: string;
  barberoId?: number;
  numeroVenta: string;
  saldoAFavor: number;
  apiId?: number;
  ventaId?: number;
  productoId?: number;
  entregaId?: number;
  entregaEstado?: string;
  entregaFecha?: string;
  userImagen?: string;
}

// Interface para manejar saldos de clientes
interface SaldoCliente {
  clienteId: string;
  cliente: string;
  saldoTotal: number;
}

// DevolucionesPage component


interface DevolucionesPageProps {
  onNavigate?: (page: string) => void;
}

export function DevolucionesPage({ onNavigate }: DevolucionesPageProps = {}) {
  const { user } = useAuth();
  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { created, success, error: showErrorAlert, info: showInfoAlert, warning: showWarningAlert, AlertContainer } = useCustomAlert();
  const { confirmCreateAction, confirmEditAction, DoubleConfirmationContainer } = useDoubleConfirmation();
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [ventasDisponibles, setVentasDisponibles] = useState<any[]>([]);
  const [barberosDisponibles, setBarberosDisponibles] = useState<any[]>([]);
  const [tipoDevolucion, setTipoDevolucion] = useState<'venta' | 'insumos'>('venta');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isHistorialDialogOpen, setIsHistorialDialogOpen] = useState(false);
  const [selectedDevolucion, setSelectedDevolucion] = useState<Devolucion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showDevolucionFormErrors, setShowDevolucionFormErrors] = useState(false);
  const [devolucionValidationAttempt, setDevolucionValidationAttempt] = useState(0);

  // Estados para búsqueda de ventas en el formulario de nueva devolución
  const [ventaSearchTerm, setVentaSearchTerm] = useState("");
  const [showVentaResults, setShowVentaResults] = useState(false);
  const [selectedBarbero, setSelectedBarbero] = useState<any>(null);
  const [resumenEntregas, setResumenEntregas] = useState<any[]>([]);
  const [entregasBarbero, setEntregasBarbero] = useState<any[]>([]);
  const [selectedEntrega, setSelectedEntrega] = useState<any>(null);
  const [productosInsumosSeleccionados, setProductosInsumosSeleccionados] = useState<Record<number, boolean>>({});
  const [cantidadesInsumos, setCantidadesInsumos] = useState<Record<number, string>>({});

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [devs, sales, clientes, productos, barberos, categorias] = await Promise.all([
        devolucionService.getDevoluciones(),
        ventaService.getVentas(),
        clientesService.getClientes(),
        productoService.getProductos().catch(() => []),
        barberosService.getBarberos().catch(() => []),
        categoriaService.getCategorias().catch(() => [])
      ]);

      const categoriasById = new Map<number, string>();
      (categorias || []).forEach((c: any) => {
        const id = Number(c?.id ?? 0);
        if (id && c?.nombre) categoriasById.set(id, String(c.nombre));
      });

      const imagenesProductoMap = new Map<number, string>();
      const categoriasProductoMap = new Map<number, string>();
      (productos || []).forEach((producto: any) => {
        const id = Number(producto?.id || 0);
        const imagen = String(producto?.imagen || producto?.imagenProduc || producto?.imagenUrl || '');
        const categoriaRaw = producto?.categoria;
        let categoria = typeof categoriaRaw === 'string'
          ? categoriaRaw
          : String(categoriaRaw?.nombre || categoriaRaw?.descripcion || '');
        if (!categoria.trim() && categoriaRaw && typeof categoriaRaw === 'object' && categoriaRaw.id && categoriasById.has(categoriaRaw.id)) {
          categoria = categoriasById.get(categoriaRaw.id) || '';
        }
        if (id > 0 && imagen.trim()) {
          imagenesProductoMap.set(id, imagen);
        }
        if (id > 0 && categoria.trim()) {
          categoriasProductoMap.set(id, categoria.trim());
        }
      });
      setImagenesProductosCatalogo(Object.fromEntries(imagenesProductoMap.entries()));
      setBarberosDisponibles(barberos || []);

      // Crear mapa de clienteId -> info de cliente para búsqueda rápida
      const clientesMapa = new Map<number, { documento: string; tipoDocumento?: string; nombreCompleto?: string; imagen?: string }>();
      clientes.forEach(cliente => {
        if (cliente.id) {
          const documentoStr = cliente.documento || '';
          const partesDocumento = documentoStr.split(' ');
          const tipoDocumento = partesDocumento.length > 1 ? partesDocumento[0] : 'CC';
          const numeroDocumento = partesDocumento.length > 1 ? partesDocumento.slice(1).join(' ') : documentoStr;
          const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();

          clientesMapa.set(cliente.id, {
            documento: numeroDocumento,
            tipoDocumento: tipoDocumento,
            nombreCompleto,
            imagen: String(cliente.fotoPerfil || cliente.FotoPerfil || cliente.imagen || cliente.foto || '')
          });
        }
      });

      const barberosMapa = new Map<number, { nombreCompleto: string; imagen: string }>();
      (barberos || []).forEach((barbero: any) => {
        if (barbero.id) {
          barberosMapa.set(Number(barbero.id), {
            nombreCompleto: `${barbero.nombre || ''} ${barbero.apellido || ''}`.trim(),
            imagen: String(barbero.fotoPerfil || barbero.FotoPerfil || barbero.imagen || barbero.foto || '')
          });
        }
      });

      // Formatear devoluciones de la API al formato de la interfaz local si es necesario
      // Pero por ahora miremos si coinciden lo suficiente
      const formattedDevs: Devolucion[] = devs.map(d => {
        const monto = Number(d.monto) || 0;
        const cantidad = Number(d.cantidad) || 1;
        const estadoRawStr = (d.estado || 'Completada').toString().toLowerCase().trim();
        const estadoRaw = estadoRawStr === 'activo' || estadoRawStr === 'completada' || estadoRawStr === 'completado'
          ? 'Completada'
          : estadoRawStr === 'anulada' || estadoRawStr === 'anulado'
            ? 'Anulada'
            : estadoRawStr === 'pendiente'
              ? 'Pendiente'
              : estadoRawStr === 'procesado'
                ? 'Procesado'
                : 'Completada';

        // Obtener documento del cliente desde el mapa o desde la respuesta de la API
        const clienteIdNum = d.clienteId ? Number(d.clienteId) : null;
        let clienteDocumento = d.clienteDocumento || '';
        let tipoDocumento = 'CC';
        let clienteNombreCompleto = (d.clienteNombre || '').trim();

        if (!clienteDocumento && clienteIdNum && clientesMapa.has(clienteIdNum)) {
          const clienteInfo = clientesMapa.get(clienteIdNum)!;
          clienteDocumento = clienteInfo.documento;
          tipoDocumento = clienteInfo.tipoDocumento || 'CC';
          if (clienteInfo.nombreCompleto) {
            clienteNombreCompleto = clienteInfo.nombreCompleto;
          }
        } else if (clienteDocumento) {
          // Si viene de la API, puede venir como "CC 123456789" o solo "123456789"
          const partes = clienteDocumento.split(' ');
          if (partes.length > 1 && partes[0] && partes[0].trim()) {
            tipoDocumento = partes[0].trim();
            clienteDocumento = partes.slice(1).join(' ');
          }
          if (clienteIdNum && clientesMapa.has(clienteIdNum)) {
            const clienteInfo = clientesMapa.get(clienteIdNum)!;
            if (!clienteNombreCompleto || clienteNombreCompleto.toLowerCase() === 'cliente') {
              clienteNombreCompleto = clienteInfo.nombreCompleto || clienteNombreCompleto;
            }
          }
        } else if (clienteIdNum && clientesMapa.has(clienteIdNum)) {
          const clienteInfo = clientesMapa.get(clienteIdNum)!;
          tipoDocumento = clienteInfo.tipoDocumento || 'CC';
          clienteDocumento = clienteInfo.documento || '';
          if (!clienteNombreCompleto || clienteNombreCompleto.toLowerCase() === 'cliente') {
            clienteNombreCompleto = clienteInfo.nombreCompleto || clienteNombreCompleto;
          }
        }

        return {
          id: String(d.id),
          cliente: clienteNombreCompleto || d.clienteNombre || 'Cliente',
          clienteId: String(d.clienteId || ''),
          clienteDocumento: clienteDocumento ? `${tipoDocumento} ${clienteDocumento}` : '',
          barbero: (d as any).barberoNombre || '',
          barberoId: Number((d as any).barberoId || 0),
          producto: d.productoNombre || 'Producto',
          categoria: categoriasProductoMap.get(Number(d.productoId || 0)) || String((d as any).categoria || 'N/A'),
          productoImagen: String(
            (d as any).productoImagen ||
            (d as any).imagenProducto ||
            imagenesProductoMap.get(Number(d.productoId || 0)) ||
            ''
          ),
          cantidad: cantidad,
          precioUnitario: monto / (cantidad || 1),
          motivoCategoria: d.motivo,
          motivoDetalle: getMotivoLabel(d.motivo),
          observaciones: d.observaciones,
          fecha: d.fecha ? new Date(d.fecha).toLocaleDateString('es-CO') : '',
          hora: d.fecha ? new Date(d.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '',
          monto: monto,
          estado: estadoRaw as any,
          responsable: d.responsableNombre || 'Responsable',
          numeroVenta: String(d.ventaId),
          saldoAFavor: d.saldoAFavor || 0,
          apiId: d.id,
          ventaId: d.ventaId,
          productoId: d.productoId,
          entregaId: (d as any).entregaId,
          entregaEstado: (d as any).entregaEstado,
          entregaFecha: (d as any).entregaFecha,
          userImagen: clienteIdNum && clientesMapa.has(clienteIdNum)
            ? clientesMapa.get(clienteIdNum)!.imagen
            : (d as any).barberoId && barberosMapa.has(Number((d as any).barberoId))
              ? barberosMapa.get(Number((d as any).barberoId))!.imagen
              : ''
        };
      });

      setDevoluciones(formattedDevs);

      // Formatear ventas para el selector
      const formattedSales = sales.map(s => {
        const clienteIdNum = Number(s.clienteId || 0);
        const clienteInfo = clienteIdNum > 0 ? clientesMapa.get(clienteIdNum) : undefined;

        // Asegurar que cliente sea siempre una cadena y enriquecer históricos
        let clienteNombre = '';
        if (typeof s.cliente === 'string') {
          clienteNombre = s.cliente;
        } else if (s.cliente && typeof s.cliente === 'object') {
          // Si cliente es un objeto, extraer el nombre
          const clienteObj = s.cliente as any;
          clienteNombre = clienteObj.nombre || clienteObj.Nombre || '';
          if (clienteObj.apellido || clienteObj.Apellido) {
            clienteNombre = `${clienteNombre} ${clienteObj.apellido || clienteObj.Apellido || ''}`.trim();
          }
          if (!clienteNombre) {
            clienteNombre = 'Cliente';
          }
        } else {
          clienteNombre = 'Cliente';
        }

        const nombreNormalizado = String(clienteNombre || '').trim().toLowerCase();
        const nombreGenerico = !nombreNormalizado || nombreNormalizado === 'cliente' || /^\d+$/.test(nombreNormalizado);
        if (nombreGenerico && clienteInfo?.nombreCompleto) {
          clienteNombre = clienteInfo.nombreCompleto;
        }

        const clienteDocumento = String(
          s.clienteDocumento ||
          (clienteInfo?.documento ? `${clienteInfo?.tipoDocumento || 'CC'} ${clienteInfo.documento}` : '')
        );

        const venta = {
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
            imagen: String(
              p.imagen ||
              p.imagenProduc ||
              p.imagenUrl ||
              p.Imagen ||
              p.ImagenProduc ||
              p.ImagenUrl ||
              p.producto?.imagen ||
              p.producto?.imagenProduc ||
              p.producto?.imagenUrl ||
              imagenesProductoMap.get(Number(p.id || p.productoId || p.ProductoId || 0)) ||
              ''
            )
          }))
        };
        return venta;
      });

      // Evitar excluir ventas históricas por diferencias de texto en estado.
      // Solo se excluyen ventas anuladas/canceladas.
      const ventasParaDevolucion = formattedSales.filter(v => {
        const estado = normalizeEstadoVenta(v.estado);
        return estado !== 'anulada' && estado !== 'anulado' && estado !== 'cancelada' && estado !== 'cancelado';
      });
      setVentasDisponibles(ventasParaDevolucion);
    } catch (error) {
      showErrorAlert("Error al cargar datos", "No se pudieron cargar los datos. Intenta nuevamente.");
      console.error(error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Estados para rango de fechas en reporte Excel


  // Estado para nueva devolución
  const [nuevaDevolucion, setNuevaDevolucion] = useState({
    numeroVenta: '',
    ventaId: 0,
    clienteId: null as number | null,
    cliente: '',
    clienteDocumento: '',
    productoId: 0,
    producto: '',
    cantidad: 1,
    precioUnitario: 0,
    motivoCategoria: '',
    observaciones: '',
    monto: 0
  });

  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState<Record<number, boolean>>({});
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<number, string>>({});
  const [imagenesProductosCatalogo, setImagenesProductosCatalogo] = useState<Record<number, string>>({});
  const shakeClass = devolucionValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';
  const isSubmittingRef = useRef(false);
  const showVentaError = showDevolucionFormErrors && !nuevaDevolucion.ventaId && tipoDevolucion === 'venta';
  const showProductoError = showDevolucionFormErrors && Object.values(productosSeleccionados).filter(Boolean).length === 0;
  const showMotivoError = showDevolucionFormErrors && !nuevaDevolucion.motivoCategoria && !selectedBarbero;
  const showCantidadError = false;

  const inits = (s: string) => s.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  // Filtros y paginación - Actualizado para eliminar búsqueda por producto
  const filteredDevoluciones = useMemo(() => devoluciones.filter(devolucion => {
    const motivoDet = String((devolucion as any).motivoDetalle || '').toLowerCase();
    const motivoCat = String((devolucion as any).motivo || '').toLowerCase();
    const esConsumoSaldo = (motivoDet.includes('consumo') && motivoDet.includes('saldo')) || (motivoCat.includes('consumo') && motivoCat.includes('saldo')) || (Number((devolucion as any).saldoAFavor || 0) < 0 && Number((devolucion as any).monto || 0) === 0);
    if (esConsumoSaldo) return false;
    const query = normalizeSearchText(searchTerm);
    const searchableText = normalizeSearchText([
      devolucion.id,
      devolucion.clienteDocumento,
      devolucion.cliente,
      formatCurrency(devolucion.monto),
      devolucion.monto,
      formatCurrency(devolucion.saldoAFavor),
      devolucion.saldoAFavor,
      devolucion.fecha,
      devolucion.estado,
      devolucion.numeroVenta,
      devolucion.producto,
      devolucion.motivoDetalle,
      devolucion.responsable,
      devolucion.clienteId
    ].join(' '));
    const matchesSearch = query.length === 0 || searchableText.includes(query);
    const matchesEstado = filtroEstado === "Todos" || devolucion.estado === filtroEstado;
    return matchesSearch && matchesEstado;
  }), [devoluciones, searchTerm, filtroEstado]);

  const groupedDevoluciones = useMemo(() => {
    const map = new Map<string, {
      cliente: string;
      tipo: 'Cliente' | 'Barbero';
      rol: string;
      documento: string;
      tipoDocumento: string;
      saldoTotal: number;
      totalDevoluciones: number;
      ultimaDevolucion: string;
      imagen: string;
      items: Devolucion[]
    }>();

    filteredDevoluciones.forEach((devolucion) => {
      // Determinar si es devolución de cliente o de barbero
      const esBarbero = !!(devolucion.barberoId && devolucion.barberoId > 0) && !devolucion.clienteId;
      const groupKey = esBarbero
        ? `barbero-${devolucion.barberoId}`
        : `cliente-${devolucion.clienteId || devolucion.cliente || 'sin-cliente'}`;

      const existing = map.get(groupKey);
      const saldo = Number(devolucion.saldoAFavor || 0);

      if (existing) {
        existing.items.push(devolucion);
        if (String(devolucion.estado).toLowerCase() === 'completada') {
          existing.saldoTotal += saldo;
        }
        existing.totalDevoluciones += 1;
        return;
      }

      const docRaw = devolucion.clienteDocumento || '';
      const docParts = docRaw.split(' ');
      const tipoDoc = docParts.length > 1 ? docParts[0] : 'CC';
      const numDoc = docParts.length > 1 ? docParts.slice(1).join(' ') : docRaw;

      map.set(groupKey, {
        cliente: esBarbero
          ? (devolucion.barbero || 'Barbero')
          : (devolucion.cliente || 'Cliente'),
        tipo: esBarbero ? 'Barbero' : 'Cliente',
        rol: esBarbero ? 'Barbero' : 'Cliente',
        documento: numDoc || '—',
        tipoDocumento: tipoDoc,
        saldoTotal: String(devolucion.estado).toLowerCase() === 'completada' ? saldo : 0,
        totalDevoluciones: 1,
        ultimaDevolucion: devolucion.fecha,
        imagen: devolucion.userImagen || '',
        items: [devolucion]
      });
    });

    return Array.from(map.entries()).map(([key, value]) => {
      const sortedItems = value.items.sort((a, b) => {
        const idA = Number(a.apiId || a.id);
        const idB = Number(b.apiId || b.id);
        return idB - idA;
      });

      return {
        key,
        ...value,
        items: sortedItems,
        ultimaDevolucion: sortedItems[0]?.fecha || '—'
      };
    }).sort((a, b) => b.saldoTotal - a.saldoTotal);
  }, [filteredDevoluciones]);

  const totalPages = Math.max(1, Math.ceil(groupedDevoluciones.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedGrupos = groupedDevoluciones.slice(startIndex, startIndex + itemsPerPage);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Funciones auxiliares
  const getEstadoColor = (estado: string) => {
    const e = (estado || '').toLowerCase().trim();
    if (e === 'completada' || e === 'completado' || e === 'activo') return "bg-green-500/10 text-green-400 border border-green-500/20";
    if (e === 'anulada' || e === 'anulado') return "bg-red-500/10 text-red-400 border border-red-500/20";
    if (e === 'pendiente') return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
    if (e === 'procesado') return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    return "bg-gray-medium text-gray-lighter";
  };

  const getMotivoLabel = (motivoCategoria: string) => {
    const motivo = MOTIVOS_DEVOLUCION.find(m => m.value === motivoCategoria);
    return motivo ? motivo.label : motivoCategoria;
  };

  const badgeClass = (estado: string) => {
    const e = (estado || '').toLowerCase().trim();
    if (e === "completada" || e === "completado" || e === "activo") return "badge badge-completada";
    if (e === "anulada" || e === "anulado") return "badge badge-anulada";
    return "badge badge-pendiente";
  };

  const normalizeEstadoVenta = (estado: string) => {
    return String(estado || '').toLowerCase().trim();
  };

  const getHistorialCliente = (clienteId: string) => {
    return devoluciones.filter(d => d.clienteId === clienteId).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  };

  // Función para calcular el saldo total acumulativo de un cliente
  const getSaldoTotalCliente = (clienteId: string): number => {
    return devoluciones
      .filter(d => d.clienteId === clienteId && d.estado === 'Completada')
      .reduce((total, d) => total + d.saldoAFavor, 0);
  };

  // Función para obtener todos los saldos por cliente
  const getSaldosClientes = (): SaldoCliente[] => {
    const clientesUnicos = [...new Set(devoluciones.map(d => d.clienteId))];
    return clientesUnicos.map(clienteId => {
      const cliente = devoluciones.find(d => d.clienteId === clienteId);
      return {
        clienteId,
        cliente: cliente?.cliente || '',
        saldoTotal: getSaldoTotalCliente(clienteId)
      };
    }).filter(s => s.saldoTotal > 0);
  };

  const handleVentaChange = async (ventaIdStr: string) => {
    const ventaId = Number(ventaIdStr);
    if (showDevolucionFormErrors) setShowDevolucionFormErrors(false);
    let venta = ventasDisponibles.find(v => v.id === ventaId);

    if (venta) {
      // Si la venta no tiene productos o servicios cargados, intentar obtener los detalles completos
      if (!venta.productos || venta.productos.length === 0) {
        try {
          const ventaCompleta = await ventaService.getVentaById(ventaId);
          if (ventaCompleta) {
            const devsVenta = (devoluciones || []).filter(d => Number(d.ventaId) === ventaId && String(d.estado).toLowerCase() !== 'anulada');
            const yaDevueltosPorProducto: Record<number, number> = {};
            devsVenta.forEach(d => {
              const pid = Number(d.productoId || 0);
              const cant = Number(d.cantidad || 0);
              if (pid > 0 && cant > 0) {
                yaDevueltosPorProducto[pid] = (yaDevueltosPorProducto[pid] || 0) + cant;
              }
            });

            const productosActualizados = (ventaCompleta.productosDetalle || []).map((p: any) => {
              const productoId = Number(p.id || p.productoId || p.ProductoId || 0);
              const productoPrevio = (venta?.productos || []).find((item: any) => {
                const prevId = Number(item?.id || 0);
                if (productoId > 0 && prevId === productoId) return true;
                return String(item?.nombre || '').trim().toLowerCase() === String(p?.nombre || '').trim().toLowerCase();
              });
              const vendidosOriginal = Number(p.cantidad || 0);
              const yaDev = yaDevueltosPorProducto[productoId] || 0;
              const disponible = Math.max(0, vendidosOriginal - yaDev);

              return {
                id: productoId,
                nombre: p.nombre,
                precio: Number(p.precio || 0),
                cantidad: disponible,
                imagen: String(
                  p.imagen ||
                  p.imagenProduc ||
                  p.imagenUrl ||
                  p.Imagen ||
                  p.ImagenProduc ||
                  p.ImagenUrl ||
                  p.producto?.imagen ||
                  p.producto?.imagenProduc ||
                  p.producto?.imagenUrl ||
                  imagenesProductosCatalogo[productoId] ||
                  productoPrevio?.imagen ||
                  ''
                )
              };
            });

            // Asegurar que cliente sea siempre una cadena
            const clienteNombreRaw = typeof ventaCompleta.cliente === 'string'
              ? ventaCompleta.cliente
              : '';
            const clienteNombre = clienteNombreRaw.trim() && clienteNombreRaw.trim().toLowerCase() !== 'cliente'
              ? clienteNombreRaw
              : (venta?.cliente || 'Cliente');
            const clienteDocumento = String(ventaCompleta.clienteDocumento || venta?.clienteDocumento || '');

            // Actualizar el objeto localmente
            venta = { ...venta, productos: productosActualizados, cliente: clienteNombre, clienteDocumento };

            // Actualizar en el estado global de la página para no repetir la carga
            setVentasDisponibles(prev => prev.map(v =>
              v.id === ventaId ? { ...v, productos: productosActualizados, cliente: clienteNombre, clienteDocumento } : v
            ));
          }
        } catch (error) {
          console.error("Error al cargar detalles completos de la venta:", error);
        }
      }

      setVentaSeleccionada(venta);
      const cantidadesIniciales: Record<number, string> = {};
      (venta?.productos || []).forEach((p: any) => {
        const id = Number(p.id);
        if (!Number.isNaN(id) && id > 0) {
          cantidadesIniciales[id] = Number(p.cantidad || 0) > 0 ? '1' : '0';
        }
      });
      setCantidadesDevolucion(cantidadesIniciales);
      setProductosSeleccionados({});
      setNuevaDevolucion(prev => ({
        ...prev,
        numeroVenta: venta!.numeroVenta,
        ventaId: venta!.id,
        clienteId: venta!.clienteId,
        cliente: venta!.cliente,
        clienteDocumento: venta!.clienteDocumento || '',
        cantidad: 1,
        precioUnitario: 0,
        monto: 0
      }));
    } else {
      setVentaSeleccionada(null);
      setProductosSeleccionados({});
      setCantidadesDevolucion({});
      setNuevaDevolucion(prev => ({
        ...prev,
        numeroVenta: '',
        ventaId: 0,
        clienteId: null,
        cliente: '',
        clienteDocumento: '',
        cantidad: 1,
        precioUnitario: 0,
        monto: 0
      }));
    }
  };

  const handleBarberoChange = async (barbero: any) => {
    setSelectedBarbero(barbero);
    try {
      const todas = await entregaInsumosService.getEntregas();
      const entregasList = (todas || [])
        .filter((e: any) => Number(e.barberoId ?? e.BarberoId ?? 0) === Number(barbero.id));
      const sortByFechaDesc = (a: any, b: any) => {
        const ta = new Date(a.fecha ?? a.Fecha ?? Date.now()).getTime();
        const tb = new Date(b.fecha ?? b.Fecha ?? Date.now()).getTime();
        return tb - ta;
      };
      entregasList.sort(sortByFechaDesc);
      setEntregasBarbero(entregasList);
      setSelectedEntrega(entregasList[0] || null);
      if (entregasList.length > 0) {
        await handleSelectEntrega(entregasList[0]);
      } else {
        setResumenEntregas([]);
        setCantidadesInsumos({});
        setProductosInsumosSeleccionados({});
      }
    } catch (e) {
      showErrorAlert("Error al cargar entregas", "No se pudieron cargar las entregas del barbero.");
    }
  };

  const handleSelectEntrega = async (entrega: any) => {
    setSelectedEntrega(entrega);
    try {
      // Intentar usar el resumen del backend para asegurar productoId correcto
      const resumen = await devolucionService.getEntregasDevolucionesResumen({
        barberoId: Number(selectedBarbero?.id || 0),
        entregaId: Number((entrega as any).id || 0)
      });
      let normalized: Array<{ productoId: number; nombre: string; entregado: number; devuelto: number; disponible: number; precio: number }> = [];
      if (Array.isArray(resumen) && resumen.length > 0) {
        normalized = resumen.map((it: any, idx: number) => {
          const productoObj = it.producto || it.Producto || {};
          const productoId = Number(it.productoId || it.ProductoId || productoObj.id || productoObj.Id || idx);
          const nombre = String(productoObj.nombre || productoObj.Nombre || it.nombre || it.Nombre || `Producto ${idx + 1}`);
          const entregado = Number(it.entregado || it.totalEntregado || it.Entregado || it.TotalEntregado || 0);
          const devuelto = Number(it.devuelto || it.totalDevuelto || it.Devuelto || it.TotalDevuelto || 0);
          const disponible = Math.max(0, Number(it.disponible || it.Disponible || (entregado - devuelto)));
          const precio = Number(it.precioHistorico || it.PrecioHistorico || it.precioVenta || it.PrecioVenta || 0);
          return { productoId, nombre, entregado, devuelto, disponible, precio };
        });
      } else {
        // Fallback: construir desde los detalles de la entrega
        let detallesRaw =
          (entrega as any).insumosDetalle ||
          (entrega as any).detalleEntregasInsumos ||
          (entrega as any).detalles ||
          [];
        if (!Array.isArray(detallesRaw) || detallesRaw.length === 0) {
          const entregaCompleta = await entregaInsumosService.getEntregaById(String((entrega as any).id || ''));
          if (entregaCompleta) {
            detallesRaw =
              (entregaCompleta as any).insumosDetalle ||
              (entregaCompleta as any).detalleEntregasInsumos ||
              (entregaCompleta as any).detalles ||
              (entregaCompleta as any).insumos ||
              [];
          }
        }
        const devols = await devolucionService.getEntregasDevoluciones({
          barberoId: Number(selectedBarbero?.id || 0),
          entregaId: Number((entrega as any).id || 0)
        });
        const devueltoMap = new Map<number, number>();
        (devols || []).forEach((d: any) => {
          const pId = Number(d.productoId || d.ProductoId || 0);
          const cant = Number(d.cantidad || d.Cantidad || 0);
          if (!pId || !cant) return;
          devueltoMap.set(pId, (devueltoMap.get(pId) || 0) + cant);
        });
        normalized = (Array.isArray(detallesRaw) ? detallesRaw : []).map((det: any, idx: number) => {
          const prod = det.producto || det || {};
          // Intentar usar productoId presente en detalle si existe
          const productoId = Number(det.productoId || det.ProductoId || prod.id || prod.Id || idx);
          const nombre = String(prod.nombre || prod.Nombre || det.nombre || det.Nombre || `Producto ${idx + 1}`);
          const entregado = Number(det.cantidad || det.Cantidad || prod.cantidad || 0);
          const devuelto = devueltoMap.get(productoId) || 0;
          const disponible = Math.max(0, entregado - devuelto);
          const precio = Number(det.precio || det.Precio || det.precioHistorico || det.PrecioHistorico || prod.precioVenta || 0);
          return { productoId, nombre, entregado, devuelto, disponible, precio };
        });
      }
      setResumenEntregas(normalized);
      const initCant: Record<number, string> = {};
      normalized.forEach((row: any) => {
        initCant[row.productoId] = row.disponible > 0 ? '1' : '0';
      });
      setCantidadesInsumos(initCant);
      setProductosInsumosSeleccionados({});
    } catch {
      showErrorAlert("Error al cargar resumen", "No se pudo cargar el resumen de la entrega.");
    }
  };

  const handleToggleInsumoSeleccion = (row: any, checked: boolean) => {
    const pid = Number(row.productoId || 0);
    if (!pid) return;
    const maxDisp = Number(row.disponible ?? 0);
    if (checked && maxDisp <= 0) {
      showErrorAlert("Sin unidades disponibles", "Este producto no tiene unidades disponibles para devolución.");
      return;
    }
    setProductosInsumosSeleccionados(prev => ({ ...prev, [pid]: checked }));
    if (checked) {
      const raw = cantidadesInsumos[pid] ?? '1';
      const parsed = Math.min(Math.max(1, Number(raw) || 1), maxDisp);
      setCantidadesInsumos(prev => ({ ...prev, [pid]: String(parsed) }));
    }
  };

  const handleCantidadInsumoChange = (row: any, valor: string) => {
    const pid = Number(row.productoId || 0);
    if (!pid) return;
    const max = Number(row.disponible ?? 0);
    const cleaned = valor.replace(/\D/g, '');
    if (cleaned === '') {
      setCantidadesInsumos(prev => ({ ...prev, [pid]: '' }));
      return;
    }
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed)) {
      const valid = Math.min(Math.max(1, Math.floor(parsed)), max);
      setCantidadesInsumos(prev => ({ ...prev, [pid]: String(valid) }));
    }
  };

  const handleCantidadInsumoBlur = (row: any) => {
    const pid = Number(row.productoId || 0);
    if (!pid) return;
    const max = Number(row.disponible ?? 0);
    const raw = String(cantidadesInsumos[pid] ?? '').trim();
    if (raw === '') {
      setCantidadesInsumos(prev => ({ ...prev, [pid]: '1' }));
      return;
    }
    const parsed = Number(raw);
    const valid = Math.min(Math.max(1, Math.floor(parsed)), max);
    setCantidadesInsumos(prev => ({ ...prev, [pid]: String(valid) }));
  };

  const handleCreateDevolucionInsumos = async () => {
    setShowDevolucionFormErrors(true);
    if (!selectedBarbero || !selectedBarbero.id) {
      showErrorAlert("Barbero requerido", "Selecciona un barbero.");
      return;
    }
    const idsSel = Object.entries(productosInsumosSeleccionados).filter(([_, v]) => v).map(([k]) => Number(k));
    if (idsSel.length === 0) {
      showErrorAlert("Productos requeridos", "Selecciona al menos un producto a devolver.");
      return;
    }
    const detalles = idsSel.map(pid => {
      const row = resumenEntregas.find(r => Number(r.productoId) === pid) || {};
      const cant = Number(cantidadesInsumos[pid] ?? 0);
      const max = Number((row as any).disponible ?? 0);
      if (cant <= 0 || cant > max) {
        throw new Error(`Cantidad inválida para producto ${pid}`);
      }
      return { productoId: pid, cantidad: cant, precioHistorico: Number((row as any).precio || 0) || undefined };
    });
    try {
      const currentUserId = Number(user?.id || 0);
      if (!currentUserId) {
        showErrorAlert("Sesión inválida", "Inicia sesión nuevamente.");
        return;
      }
      await devolucionService.createDevolucionInsumosBarbero({
        barberoId: Number(selectedBarbero.id),
        usuarioId: currentUserId,
        motivoCategoria: nuevaDevolucion.motivoCategoria || '',
        motivoDetalle: nuevaDevolucion.motivoCategoria || '',
        observaciones: nuevaDevolucion.observaciones || '',
        detalles
      });
      created("Devolución de insumos registrada", "La devolución ha sido registrada correctamente.");
      setIsDialogOpen(false);
      loadData(true);
      resetFormularios();
    } catch (e: any) {
      showErrorAlert("Error al registrar", "No se pudo registrar la devolución de insumos.");
    }
  };

  const handleRegistrarDevolucion = async () => {
    if (selectedBarbero && resumenEntregas.length > 0) {
      await handleCreateDevolucionInsumos();
    } else {
      handleCreateDevolucion();
    }
  };
  const handleToggleProductoSeleccion = (producto: any, checked: boolean) => {
    if (showDevolucionFormErrors) setShowDevolucionFormErrors(false);
    const productoId = Number(producto?.id || 0);
    if (!productoId || Number.isNaN(productoId)) return;

    setProductosSeleccionados(prev => ({ ...prev, [productoId]: checked }));

    if (!checked) {
      return;
    }

    const maxCantidad = Math.max(0, Number(producto?.cantidad || 0));
    if (maxCantidad <= 0) {
      showInfoAlert("Sin cantidad disponible", "No hay cantidad disponible para devolver de este producto en esta venta.");
      setProductosSeleccionados(prev => ({ ...prev, [productoId]: false }));
      setCantidadesDevolucion(prev => ({ ...prev, [productoId]: '0' }));
      return;
    }
    const rawCantidad = cantidadesDevolucion[productoId] ?? '1';
    const parsedCantidad = Number(rawCantidad);
    const cantidadValida = !Number.isNaN(parsedCantidad) && parsedCantidad > 0
      ? Math.min(maxCantidad, Math.floor(parsedCantidad))
      : 1;

    setCantidadesDevolucion(prev => ({
      ...prev,
      [productoId]: String(cantidadValida)
    }));
  };

  const handleCantidadProductoSeleccionChange = (producto: any, valor: string) => {
    const productoId = Number(producto?.id || 0);
    if (!productoId || Number.isNaN(productoId)) return;
    if (showDevolucionFormErrors) setShowDevolucionFormErrors(false);

    setCantidadesDevolucion(prev => ({
      ...prev,
      [productoId]: valor
    }));

    const maxCantidad = Math.max(0, Number(producto?.cantidad || 0));
    if (valor.trim() === '') {
      return;
    }

    const parsedCantidad = Number(valor);
    if (Number.isNaN(parsedCantidad)) return;

    const cantidadValida = maxCantidad === 0
      ? 0
      : Math.min(maxCantidad, Math.max(1, Math.floor(parsedCantidad)));
    setCantidadesDevolucion(prev => ({
      ...prev,
      [productoId]: String(cantidadValida)
    }));
  };

  const handleCreateDevolucion = () => {
    setShowDevolucionFormErrors(true);


    setDevolucionValidationAttempt((prev) => prev + 1);

    // Validación de Garantía
    if (ventaSeleccionada) {
      const fechaVenta = new Date(ventaSeleccionada.fechaISO);
      const mesesGarantia = Number(ventaSeleccionada.garantiaMeses || 0);

      // Política: garantía fija de 15 días
      const fechaExpiracion = new Date(fechaVenta);
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 15);
      const hoy = new Date();
      if (hoy > fechaExpiracion) {
        const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
        showErrorAlert("Garantía expirada", `La garantía de esta venta expiró el ${fechaExpiracion.toLocaleDateString('es-CO', opciones)}. No es posible realizar devoluciones fuera de este periodo.`);
        return;
      }
    }

    // ---------------------------------------------------------
    // VALIDACIÓN FUERTE (SOLUCIÓN PROFESIONAL)
    // ---------------------------------------------------------
    if (!nuevaDevolucion.ventaId || Number(nuevaDevolucion.ventaId) <= 0) {
      showErrorAlert("Venta inválida", "El ID de la venta debe ser mayor a 0.");
      return;
    }

    if (!nuevaDevolucion.clienteId || Number(nuevaDevolucion.clienteId) <= 0) {
      showErrorAlert("Cliente inválido", "El ID del cliente debe ser mayor a 0.");
      return;
    }

    const idsSeleccionados = Object.entries(productosSeleccionados).filter(([_, v]) => v).map(([k]) => Number(k));
    if (idsSeleccionados.length === 0) {
      showErrorAlert("Productos requeridos", "Selecciona al menos un producto para la devolución.");
      return;
    }

    // Validar cantidades por cada producto seleccionado
    for (const pid of idsSeleccionados) {
      const prod = ventaSeleccionada?.productos?.find((p: any) => Number(p.id) === Number(pid));
      const maxCant = Number(prod?.cantidad || 0);
      const raw = (cantidadesDevolucion[pid] ?? '').trim();
      const cant = Number(raw);
      if (raw === '' || Number.isNaN(cant) || cant <= 0 || (maxCant > 0 && cant > maxCant)) {
        showErrorAlert("Cantidad inválida", `Cantidad inválida para el producto seleccionado (ID ${pid}).`);
        return;
      }
    }

    if (!nuevaDevolucion.motivoCategoria) {
      showErrorAlert("Motivo requerido", "Por favor selecciona un motivo.");
      return;
    }
    // ---------------------------------------------------------

    if (isSubmittingRef.current) return;
    (async () => {
      try {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        const stringUserId = user?.id ? String(user.id) : null;
        const currentUserId = stringUserId ? parseInt(stringUserId) : 0;
        if (!currentUserId || isNaN(currentUserId) || currentUserId <= 0) {
          showErrorAlert("Error de sesión", "No se ha identificado el usuario responsable. Por favor inicie sesión nuevamente.");
          return;
        }
        const idsSel = Object.entries(productosSeleccionados).filter(([_, v]) => v).map(([k]) => Number(k));
        const items = idsSel.map(pid => {
          const prod = ventaSeleccionada?.productos?.find((p: any) => Number(p.id) === Number(pid));
          const precio = Number(prod?.precio || 0);
          const cant = Number(cantidadesDevolucion[pid] || 1);
          const monto = precio * cant;
          return { productoId: pid, cantidad: cant, montoDevuelto: monto };
        });
        const batchPayload = {
          ventaId: Number(nuevaDevolucion.ventaId),
          clienteId: Number(nuevaDevolucion.clienteId),
          usuarioId: currentUserId,
          motivoCategoria: nuevaDevolucion.motivoCategoria,
          observaciones: nuevaDevolucion.observaciones || '',
          items
        };
        const hasInvalid = [
          batchPayload.ventaId,
          batchPayload.clienteId,
          batchPayload.usuarioId
        ].some(v => isNaN(Number(v)) || Number(v) <= 0);
        if (hasInvalid || items.length === 0) {
          showErrorAlert("Datos inválidos", "No se pudo registrar la devolución. Revisa los datos.");
          return;
        }
        await devolucionService.createDevolucionBatch(batchPayload);
        success("Devolución registrada", "La devolución se ha registrado exitosamente.");
        setIsDialogOpen(false);
        loadData(true);
        resetFormularios();
      } catch (error) {
        showErrorAlert("Error al registrar", "No se pudo registrar la devolución.");
        console.error(error);
      } finally {
        isSubmittingRef.current = false;
      }
    })();
  };

  const resetFormularios = () => {
    setNuevaDevolucion({
      numeroVenta: '',
      ventaId: 0,
      clienteId: null,
      cliente: '',
      clienteDocumento: '',
      productoId: 0,
      producto: '',
      cantidad: 1,
      precioUnitario: 0,
      motivoCategoria: '',
      observaciones: '',
      monto: 0
    });

    setVentaSeleccionada(null);
    setProductosSeleccionados({});
    setCantidadesDevolucion({});
    setVentaSearchTerm("");
    setShowVentaResults(false);
  };

  const handleToggleEstado = (devolucion: Devolucion) => {
    if (devolucion.estado !== 'Completada') {
      showInfoAlert("No se puede reactivar", "La devolución anulada no puede reactivarse.");
      return;
    }

    // Aseguramos que tenemos un ID válido antes de proceder
    const idParaActualizar = devolucion.apiId || Number(devolucion.id);

    if (!idParaActualizar || isNaN(idParaActualizar)) {
      showErrorAlert("ID inválido", "No se pudo identificar el ID de la devolución para actualizar.");
      console.error("❌ Error: ID de devolución inválido:", { apiId: devolucion.apiId, id: devolucion.id });
      return;
    }

    const nuevoEstado = 'Anulado';
    const accion = 'anular';

    confirmEditAction(
      `${devolucion.producto} - ${devolucion.cliente}`,
      async () => {
        try {
          console.log(`🚀 Intentando ${accion} devolución con ID: ${idParaActualizar}, Nuevo estado: ${nuevoEstado}`);
          await devolucionService.updateDevolucionStatus(idParaActualizar, nuevoEstado);

          // Revertir el stock si tenemos el ID del producto
          if (devolucion.productoId) {
            console.log(`📦 Revirtiendo stock por anulación de devolución: Producto ${devolucion.productoId}, Cantidad ${devolucion.cantidad}`);
            const motivo = String(devolucion.motivoCategoria || '').toLowerCase();
            const esErrorCompra = motivo === 'error_compra' || motivo === 'error en la compra';
            if (esErrorCompra) {
              await productoService.adjustStock(
                devolucion.productoId,
                devolucion.cantidad,
                'decrement',
                'ventas'
              );
            }
          }

          // La alerta de éxito la maneja confirmEditAction en sus opciones
          loadData(true);

        } catch (error: any) {
          console.error(`❌ Error al ${accion} devolución:`, error);
          showErrorAlert("Error al actualizar", error.message || "No se pudo actualizar el estado.");
        }
      },
      {
        confirmTitle: `Confirmar Anulación de Devolución`,
        confirmMessage: `¿Estás seguro de que deseas anular la devolución del producto "${devolucion.producto}" para el cliente "${devolucion.cliente}"?`,
        successTitle: `¡Devolución anulada exitosamente!`,
        successMessage: `El estado ha sido actualizado a Anulada y el stock ha sido ajustado según corresponda.`,
        requireInput: false
      }
    );
  };



  // Función para generar reporte Excel real por rango de fechas


  // Función para generar PDF individual de devolución real
  const generateIndividualPdf = async (devolucion: Devolucion) => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const hMargin = 20;



      try {
        doc.addImage(manitoLogo, 'JPEG', pageWidth / 2 - 12.5, 5, 25, 25);
      } catch { }

      const negocioNombre = "Manito BarberShop";
      const negocioEmail = "Edwainsolano007@gmail.com";
      const negocioDireccion = "Calle 79 #52 12 Aranjuez, Medellín";
      const negocioTelefono = "301 4836189";
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(negocioNombre, pageWidth - hMargin, 12, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(negocioEmail, pageWidth - hMargin, 18, { align: "right" });
      doc.text(negocioDireccion, pageWidth - hMargin, 24, { align: "right" });
      doc.text(negocioTelefono, pageWidth - hMargin, 30, { align: "right" });

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("MANITO BARBERSHOP", pageWidth / 2, 40, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Comprobante de Devolución", pageWidth / 2, 48, { align: "center" });

      doc.setDrawColor(0, 0, 0); doc.roundedRect(pageWidth / 2 - 25, 52, 50, 7, 3.5, 3.5, "S");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const devolucionId = String(devolucion.id || "N/A");
      doc.text(`DEVOLUCIÓN #${devolucionId}`, pageWidth / 2, 56.5, { align: "center" });

      let y = 80;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMACIÓN GENERAL", hMargin, y);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(hMargin, y + 2, 85, y + 2);

      y += 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("N. de devolución:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(devolucion.id ?? "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Usuario:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(devolucion.cliente || devolucion.barbero || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Fecha y Hora:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${devolucion.fecha || "N/A"}${devolucion.hora ? ` ${devolucion.hora}` : ""}`, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Estado:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(devolucion.estado || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Responsable:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(devolucion.responsable || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Tipo:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(devolucion.ventaId ? "Venta" : "Insumos", hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Motivo de devolución:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(devolucion.motivoDetalle || getMotivoLabel(devolucion.motivoCategoria) || "N/A"), hMargin + 40, y);

      y += 15;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE DEVOLUCIÓN", hMargin, y);
      doc.line(hMargin, y + 2, 88, y + 2);

      y += 12;
      doc.setDrawColor(0, 0, 0); doc.rect(hMargin, y, pageWidth - (hMargin * 2), 10, "S");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const col1 = 44, col2 = 83, col3 = 108, col4 = 133, col5 = 169;
      doc.text("ITEM", col1, y + 6.5, { align: "center" });
      doc.text("CATEGORÍA", col2, y + 6.5, { align: "center" });
      doc.text("CANT.", col3, y + 6.5, { align: "center" });
      doc.text("PREC. UNIT", col4, y + 6.5, { align: "center" });
      doc.text("SUBTOTAL", col5, y + 6.5, { align: "center" });

      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      const nombreItem = String(devolucion.producto || "Producto");
      const categoria = String(devolucion.categoria || "N/A");
      const cantidad = Number(devolucion.cantidad || 0);
      const precioUnitario = Number(devolucion.precioUnitario || 0);
      const subtotal = Number(devolucion.monto || cantidad * precioUnitario);

      doc.setFillColor(255, 255, 255);
      doc.rect(hMargin, y, pageWidth - (hMargin * 2), 8, 'F');
      doc.setFontSize(8);
      const nombreTrunc = nombreItem.length > 42 ? `${nombreItem.substring(0, 39)}...` : nombreItem;
      const catTrunc = categoria.length > 20 ? `${categoria.substring(0, 17)}...` : categoria;
      doc.text(nombreTrunc, col1, y + 5.5, { align: "center" });
      doc.text(catTrunc, col2, y + 5.5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(String(cantidad), col3, y + 5.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(`$${formatCurrency(precioUnitario)}`, col4, y + 5.5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(`$${formatCurrency(subtotal)}`, col5, y + 5.5, { align: "center" });
      doc.setFont("helvetica", "normal");

      y += 12;

      if (devolucion.observaciones) {
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.text("Observaciones:", hMargin, y);
        doc.setFont("helvetica", "normal");
        const observacionesLines = doc.splitTextToSize(String(devolucion.observaciones), pageWidth - (hMargin * 2));
        doc.text(observacionesLines, hMargin, y + 6);
        y += 6 + (observacionesLines.length * 5);
      }

      y += 6;
      if (y > 258) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(hMargin, y, pageWidth - (hMargin * 2), 22, 2, 2, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`TOTAL DEVUELTO: $ ${formatCurrency(subtotal)}`, pageWidth / 2, y + 8, { align: "center" });
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`SALDO A FAVOR: $ ${formatCurrency(Number(devolucion.saldoAFavor || 0))}`, pageWidth / 2, y + 17, { align: "center" });

      y = Math.max(275, y + 28);
      doc.setDrawColor(0, 0, 0);
      doc.line(hMargin, y, pageWidth - hMargin, y);

      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(`Documento generado automáticamente el ${new Date().toLocaleString('es-CO')}`, pageWidth / 2, y, { align: "center" });
      doc.text("MANITO BARBERSHOP - Sistema de Gestión de Devoluciones", pageWidth / 2, y + 4, { align: "center" });

      const fileName = `Reporte_Devolucion_${devolucion.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      created("PDF generado exitosamente", "El reporte de devolución fue descargado correctamente.");
    } catch (error) {
      console.error("Error al generar PDF de devolución:", error);
      showErrorAlert("Error al generar PDF", "No se pudo generar el reporte de la devolución.");
    }
  };

  // Estadísticas
  const devolucionesHoy = devoluciones.filter(d => d.fecha === new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })).length;
  const totalMontoDevoluciones = devoluciones.reduce((sum, d) => sum + d.monto, 0);
  const devolucionesActivas = devoluciones.filter(d => d.estado === "Completada").length;
  const devolucionesAnuladas = devoluciones.filter(d => d.estado === "Anulada").length;
  const totalSaldosAFavor = devoluciones.filter(d => d.estado === "Completada").reduce((sum, d) => sum + d.saldoAFavor, 0);
  const clientesConSaldo = getSaldosClientes().length;

  return (
    <>
      <style>{css}</style>

      <main className="dev-root">
        <div className="dev-card">

          {/* ── Toolbar ── */}
          <div className="dev-toolbar">
            <button
              className="btn-std-primary"
              onClick={() => {
                if (onNavigate) {
                  onNavigate("RegistrarDevolucion");
                } else {
                  setShowDevolucionFormErrors(false);
                  setIsDialogOpen(true);
                }
              }}
            >
              <Plus className="w-4 h-4" />
              Nueva Devolución
            </button>

            <div className="dev-search-wrap">
              <span className="dev-search-icon"><Search className="w-4 h-4" /></span>
              <input
                className="dev-search"
                placeholder="Buscar por cliente o documento..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <select
              className="dev-select"
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="Todos">Todos</option>
              <option value="Completada">Completadas</option>
              <option value="Anulada">Anuladas</option>
            </select>

            <span className="dev-count">
              Mostrando {displayedGrupos.length} de {groupedDevoluciones.length} clientes
            </span>
          </div>

          {/* ── Table ── */}
          <div style={{ overflowX: "auto" }}>
            <table className="dev-table">
              <thead className="dev-thead">
                <tr>
                  <th style={{ textAlign: "left", paddingLeft: "20px" }}>Documento</th>
                  <th>Usuario</th>
                  <th>Total Devoluciones</th>
                  <th>Saldo a Favor Total</th>
                  <th>Última Devolución</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="dev-empty">
                      Cargando devoluciones...
                    </td>
                  </tr>
                ) : displayedGrupos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="dev-empty">
                      No se encontraron clientes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  displayedGrupos.map((grupo) => {
                    const open = expandedId === grupo.key;
                    const devsFiltradas = grupo.items;

                    return (
                      <Fragment key={`frag-${grupo.key}`}>
                        {/* ── Group header row ── */}
                        <tr
                          className="dev-group-row"
                          onClick={() => toggleExpand(grupo.key)}
                        >
                          {/* Documento */}
                          <td className="dev-group-cell">
                            <div className="flex items-center gap-2">
                              <span style={{ fontWeight: 400, color: T.grayLightest }}>
                                {grupo.tipoDocumento} {grupo.documento}
                              </span>
                            </div>
                          </td>

                          {/* Usuario + Rol debajo */}
                          <td className="dev-td" style={{ textAlign: 'left' }}>
                            <div className="dev-group-inner">
                              <div
                                className="dev-avatar"
                                style={{
                                  overflow: 'hidden',
                                  background: (grupo.imagen && grupo.imagen.trim() !== '' && grupo.imagen !== 'No especificada') ? 'transparent' : T.orangePrimary,
                                  color: T.blackPrimary,
                                  border: 'none'
                                }}
                              >
                                {(grupo.imagen && grupo.imagen.trim() !== '' && grupo.imagen !== 'No especificada') ? (
                                  <ImageRenderer
                                    url={grupo.imagen}
                                    alt={grupo.cliente}
                                    className="w-full h-full object-cover border-0 bg-transparent rounded-full"
                                    showLabel={false}
                                    fallbackVariant="person"
                                  />
                                ) : (
                                  <UserIcon className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="dev-client-name">{grupo.cliente}</div>
                                <div className="dev-client-doc">
                                  {grupo.rol}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Total devoluciones */}
                          <td className="dev-td" style={{ fontWeight: 400, color: T.grayLightest }}>
                            {grupo.totalDevoluciones}
                          </td>

                          {/* Saldo a favor total */}
                          <td className="dev-td">
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "14px",
                                color: grupo.saldoTotal > 0 ? (isAdminOrSuperAdmin ? T.red : T.green) : T.grayDark,
                              }}
                            >
                              ${formatCurrency(grupo.saldoTotal)}
                            </span>
                          </td>

                          {/* Última devolución */}
                          <td className="dev-td">{grupo.ultimaDevolucion}</td>

                          {/* Acciones */}
                          <td className="dev-td">
                            <button
                              className="dev-expand-btn"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(grupo.key); }}
                            >
                              <Eye className="w-4 h-4" />
                              Ver devoluciones
                              <span className={`chev-custom${open ? " open" : ""}`}>
                                <ChevronDown className="w-4 h-4" />
                              </span>
                            </button>
                          </td>
                        </tr>

                        {/* ── Expanded sub-table ── */}
                        <tr key={`exp-${grupo.key}`}>
                          <td colSpan={6} className="dev-exp-cell">
                            <div className={`dev-accordion-wrap${open ? " open" : ""}`}>
                              <div className="dev-accordion-inner">

                                {/* Sub-label */}
                                <div className="dev-sub-label">
                                  Todas las devoluciones de{" "}
                                  <span style={{ color: T.orangePrimary, fontWeight: 600 }}>
                                    {grupo.cliente}
                                  </span>
                                </div>

                                {/* Inner table */}
                                <table className="dev-table" style={{ borderTop: 'none' }}>
                                  <colgroup>
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "10%" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "15%" }} />
                                    <col style={{ width: "15%" }} />
                                  </colgroup>
                                  <thead>
                                    <tr className="dev-sub-header">
                                      <th>Número</th>
                                      <th>Tipo</th>
                                      <th>Monto Devolución</th>
                                      <th>Saldo a Favor</th>
                                      <th>Fecha de Registro</th>
                                      <th>Estado</th>
                                      <th>Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {devsFiltradas.length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan={7}
                                          style={{
                                            padding: "20px",
                                            textAlign: "center",
                                            color: T.grayDark,
                                            fontSize: "13px",
                                          }}
                                        >
                                          Sin devoluciones para este filtro.
                                        </td>
                                      </tr>
                                    ) : (
                                      devsFiltradas.map((dev) => (
                                        <tr key={dev.id} className="dev-item-row">

                                          {/* Número */}
                                          <td
                                            className="dev-td"
                                            style={{ paddingLeft: "52px", textAlign: "left" }}
                                          >
                                            <span className="dev-num">
                                              <Hash className="w-3 h-3" />
                                              {dev.id}
                                            </span>
                                          </td>

                                          {/* Tipo */}
                                          <td className="dev-td">
                                            {dev.ventaId ? 'Venta' : (dev.entregaId ? 'Insumos' : '—')}
                                          </td>

                                          {/* Monto */}
                                          <td
                                            className="dev-td"
                                            style={{ fontWeight: 400, color: T.grayLightest }}
                                          >
                                            ${formatCurrency(dev.monto)}
                                          </td>

                                          {/* Saldo a Favor */}
                                          <td className="dev-td">
                                            <span
                                              style={{
                                                color: dev.saldoAFavor > 0 ? (isAdminOrSuperAdmin ? T.red : T.green) : T.grayDark,
                                                fontWeight: 400,
                                              }}
                                            >
                                              ${formatCurrency(dev.saldoAFavor)}
                                            </span>
                                          </td>

                                          {/* Fecha */}
                                          <td className="dev-td">{dev.fecha}</td>

                                          {/* Estado */}
                                          <td className="dev-td">
                                            <span className={badgeClass(dev.estado)}>
                                              {dev.estado}
                                            </span>
                                          </td>

                                          {/* Acciones */}
                                          <td className="dev-td">
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "4px",
                                              }}
                                            >
                                              <button
                                                className="dev-icon-btn ban"
                                                title="Anular devolución"
                                                disabled={dev.estado !== "Completada"}
                                                onClick={() => handleToggleEstado(dev)}
                                              >
                                                <Ban className="w-4 h-4" />
                                              </button>
                                              <button
                                                className="dev-icon-btn eye"
                                                title="Ver detalle"
                                                onClick={() => {
                                                  setSelectedDevolucion(dev);
                                                  setIsDetailDialogOpen(true);
                                                }}
                                              >
                                                <Eye className="w-4 h-4" />
                                              </button>
                                              <button
                                                className="dev-icon-btn pdf"
                                                title="Descargar PDF"
                                                onClick={() => generateIndividualPdf(dev)}
                                              >
                                                <FileDown className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>

                              </div>
                            </div>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="std-pagination">
            <span className="std-pag-info">
              Página {currentPage} de {totalPages}
            </span>

            <EllipsisPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

        </div>
      </main>

      {/* Modal de Ver Detalle - MODIFICADO PARA AGREGAR CANTIDAD */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-lightest">Detalle de Devolución </DialogTitle>

            <DialogDescription className="text-gray-lightest">
              Información completa de la devolución {selectedDevolucion?.id}

            </DialogDescription>

          </DialogHeader>

          {selectedDevolucion && (
            <div className="space-y-6 pt-4">
              <div className="flex justify-end">

              </div>


              {/* Selección de Venta (Lectura) */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-primary" />
                    Número de Venta
                  </Label>
                  <Input
                    value={selectedDevolucion.numeroVenta}
                    disabled
                    className="elegante-input bg-gray-dark cursor-not-allowed w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-orange-primary" />
                    Documento Cliente
                  </Label>
                  <Input
                    value={selectedDevolucion.clienteDocumento}
                    disabled
                    className="elegante-input bg-gray-dark cursor-not-allowed w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">

                    Estado
                  </Label>

                  <span className={`px-3 py-1 rounded-full items-center justify-center text-xs ${getEstadoColor(selectedDevolucion.estado)}`}>
                    {selectedDevolucion.estado}
                  </span>
                </div>
              </div>



              {/* Información del Cliente y Venta */}
              <div className="bg-gray-darker p-4 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-light">
                      <UserIcon className="w-4 h-4 text-orange-primary" />
                      Cliente
                    </Label>
                    <p className="font-normal text-gray-lightest">
                      {selectedDevolucion.cliente}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-light">Responsable</p>
                    <p className="font-normal text-gray-lightest">
                      {selectedDevolucion.responsable}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-light">Fecha y Hora</p>
                    <p className="font-normal text-gray-lightest">
                      {selectedDevolucion.fecha} - {selectedDevolucion.hora}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-light">Producto Devuelto</p>
                  <div className="bg-gray-darkest rounded-lg px-3 py-2.5 border-l-2 border-[#D9C3A4]/70">
                    <div className="flex items-center gap-4 flex-nowrap min-w-0">
                      <div className="shrink-0 w-7 h-7 rounded-md border flex items-center justify-center transition-colors border-[#D9C3A4] bg-[#D9C3A4]/20">
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          className="h-4 w-4 accent-[#D9C3A4] shrink-0 cursor-not-allowed"
                        />
                      </div>

                      <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                        <ImageRenderer
                          url={selectedDevolucion.productoImagen}
                          alt={selectedDevolucion.producto}
                          className="w-full h-full border-0 bg-transparent"
                        />
                      </div>

                      <div className="min-w-0 flex-1 shrink flex items-center justify-start">
                        <span className="text-gray-lightest font-normal text-base truncate block w-full">
                          {selectedDevolucion.producto}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0">
                        <label className="text-[11px] text-gray-400 font-normal">Cantidad</label>
                        <Input
                          type="number"
                          value={selectedDevolucion.cantidad}
                          disabled
                          className="w-16 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-dark cursor-not-allowed"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0">
                        <label className="text-[11px] text-gray-400 font-normal">Precio Unit.</label>
                        <span className="text-gray-lightest font-normal text-xs tabular-nums leading-7">
                          ${formatCurrency(selectedDevolucion.precioUnitario)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                        <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                        <span className="text-orange-primary font-normal text-xs tabular-nums leading-7">
                          ${formatCurrency(selectedDevolucion.monto)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Motivo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-primary" />
                    Motivo de la Devolución
                  </Label>
                  <Input
                    value={selectedDevolucion.motivoDetalle}
                    disabled
                    className="elegante-input bg-gray-dark cursor-not-allowed w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-primary" />
                    Resumen Seleccionado
                  </Label>
                  <Input
                    type="text"
                    value={`${selectedDevolucion.producto} x${selectedDevolucion.cantidad}`}
                    disabled
                    className="elegante-input bg-gray-dark cursor-not-allowed w-full"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label className="text-gray-lightest flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-primary" />
                  Observaciones
                </Label>
                <textarea
                  value={selectedDevolucion.observaciones || 'Sin observaciones adicionales.'}
                  disabled
                  rows={3}
                  className="elegante-input w-full resize-none bg-gray-dark cursor-not-allowed"
                />
                <div className="flex justify-start mt-1">
                  <span className="text-xs text-gray-500 font-medium">
                    {(selectedDevolucion.observaciones || 'Sin observaciones adicionales.').length}/300 caracteres
                  </span>
                </div>
              </div>

              {/* Resumen de la Venta Asociada - Productos post-devolución */}
              {(() => {
                const ventaAsociada = ventasDisponibles.find(v => Number(v.id) === Number(selectedDevolucion.ventaId || selectedDevolucion.numeroVenta));
                if (!ventaAsociada || !ventaAsociada.productos || ventaAsociada.productos.length === 0) return null;

                const devolucionesDeEstaVenta = devoluciones.filter(d => {
                  const dVentaId = Number(d.ventaId || d.numeroVenta);
                  const estado = (d.estado || '').toLowerCase().trim();
                  return dVentaId === Number(ventaAsociada.id) && estado !== 'anulada' && estado !== 'anulado';
                });

                const devPorProductoId = new Map<number, number>();
                const devPorNombre = new Map<string, number>();
                devolucionesDeEstaVenta.forEach(dev => {
                  const pid = Number(dev.productoId || 0);
                  if (pid > 0) devPorProductoId.set(pid, (devPorProductoId.get(pid) || 0) + dev.cantidad);
                  const nom = (dev.producto || '').toLowerCase().trim();
                  if (nom) devPorNombre.set(nom, (devPorNombre.get(nom) || 0) + dev.cantidad);
                });

                const productosAjustados = ventaAsociada.productos.map((p: any) => {
                  const cantOrig = Number(p.cantidad || 1);
                  const precio = Number(p.precio || 0);
                  const pid = Number(p.id || 0);
                  const cantDev = (pid > 0 ? devPorProductoId.get(pid) : undefined)
                    ?? devPorNombre.get((p.nombre || '').toLowerCase().trim())
                    ?? 0;
                  const cantFinal = Math.max(0, cantOrig - cantDev);
                  return { ...p, cantidadOriginal: cantOrig, cantidadDevuelta: cantDev, cantidad: cantFinal, precio, subtotal: cantFinal * precio };
                });

                const subtotalAjustado = productosAjustados.reduce((s: number, p: any) => s + p.subtotal, 0);
                const subtotalOriginal = ventaAsociada.productos.reduce((s: number, p: any) => s + (Number(p.precio || 0) * Number(p.cantidad || 1)), 0);

                return (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-md font-normal text-gray-lightest flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-orange-primary" />
                      Venta Asociada — Productos después de la devolución
                    </h4>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                      {productosAjustados.map((p: any, idx: number) => (
                        <div key={`vp-${p.id || idx}`} className={`bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 ${p.cantidadDevuelta > 0 ? 'border-yellow-500/40' : 'border-orange-primary/20'}`}>
                          <div className="flex items-center gap-4 flex-nowrap min-w-0">
                            <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                              <ImageRenderer
                                url={p.imagen}
                                alt={p.nombre}
                                className="w-full h-full border-0 bg-transparent"
                              />
                            </div>
                            <div className="min-w-0 flex-1 shrink flex items-center justify-center">
                              <span className="text-gray-lightest font-normal text-base truncate block text-center w-full" title={p.nombre}>
                                {p.nombre}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <label className="text-[11px] text-gray-400 font-normal">Cantidad</label>
                              <div className="flex items-center gap-1">
                                <Input type="number" value={p.cantidad} disabled className="w-14 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-medium" />
                                {p.cantidadDevuelta > 0 && (
                                  <span className="text-[10px] text-yellow-400" title={`Original: ${p.cantidadOriginal}, Devueltos: ${p.cantidadDevuelta}`}>
                                    (-{p.cantidadDevuelta})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <label className="text-[11px] text-gray-400 font-normal">Precio unit.</label>
                              <Input type="number" value={p.precio} disabled className="w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-medium" />
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                              <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                              <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7">
                                ${formatCurrency(p.subtotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-darker p-3 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between text-gray-lightest">
                        <span>Subtotal Original Venta:</span>
                        <span>${formatCurrency(subtotalOriginal)}</span>
                      </div>
                      <div className="flex justify-between text-yellow-400">
                        <span>Subtotal Ajustado:</span>
                        <span>${formatCurrency(subtotalAjustado)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Resumen del Monto */}
              <div className="bg-gray-darker p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-gray-lightest">
                  <span>Monto Total Devuelto:</span>
                  <span className="text-orange-primary font-bold text-lg">${formatCurrency(selectedDevolucion.monto)}</span>
                </div>
                <div className="flex justify-between text-gray-lightest">
                  <span>Saldo a Favor Actual:</span>
                  <span className={`${isAdminOrSuperAdmin ? 'text-red-400' : 'text-green-400'} font-bold text-md`}>${formatCurrency(selectedDevolucion.saldoAFavor)}</span>
                </div>
                <p className="text-sm text-gray-lightest pt-2 border-t border-gray-dark mt-2">
                  Saldo Total Acumulado del Cliente: <span className={`${isAdminOrSuperAdmin ? 'text-red-400' : 'text-green-400'} font-bold`}>${formatCurrency(getSaldoTotalCliente(selectedDevolucion.clienteId))}</span>
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-dark">
                <button
                  onClick={() => setIsDetailDialogOpen(false)}
                  className="elegante-button-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Nueva Devolución */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-lightest">Nueva Devolución</DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Registra una nueva devolución de producto para generar saldo a favor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Buscador Principal de Ventas */}
            <div className="space-y-2 relative">
              <Label className="text-gray-lightest flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-primary" />
                Buscar Venta o Barbero *
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                <Input
                  placeholder="Escribe para buscar venta o barbero..."
                  value={ventaSearchTerm}
                  onChange={(e) => {
                    setVentaSearchTerm(e.target.value);
                    setShowVentaResults(true);
                  }}
                  onFocus={() => setShowVentaResults(true)}
                  onBlur={() => {
                    setTimeout(() => setShowVentaResults(false), 120);
                  }}
                  className={`elegante-input pl-11 w-full ${showVentaError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                {ventaSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setVentaSearchTerm('');
                      setShowVentaResults(false);
                      setSelectedBarbero(null);
                      setSelectedEntrega(null);
                      setEntregasBarbero([]);
                      setResumenEntregas([]);
                      setProductosInsumosSeleccionados({});
                      setTipoDevolucion('venta');
                    }}
                    title="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {showVentaResults && ventaSearchTerm.trim() !== "" && (
                  <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
                    {(() => {
                      const query = normalizeSearchText(ventaSearchTerm);
                      const filteredVentas = ventasDisponibles.filter(v => {
                        const searchableText = normalizeSearchText([
                          v.id,
                          v.numeroVenta,
                          v.cliente,
                          v.clienteDocumento,
                          v.fecha,
                          v.total
                        ].join(' '));
                        return searchableText.includes(query);
                      }).slice(0, 50);
                      const filteredBarberos = barberosDisponibles.filter(b => {
                        const searchableText = normalizeSearchText([
                          b.id,
                          b.nombre,
                          b.apellido,
                          b.tipoDocumento,
                          b.documento,
                          b.correo,
                          b.telefono
                        ].join(' '));
                        return searchableText.includes(query);
                      }).slice(0, 50);
                      if (filteredVentas.length === 0 && filteredBarberos.length === 0) {
                        return (
                          <div className="p-4 text-center text-gray-lightest italic">
                            No se encontraron resultados que coincidan.
                          </div>
                        );
                      }
                      return (
                        <>
                          {filteredVentas.length > 0 && (
                            <div className="px-3 py-2 text-[10px] text-gray-lighter uppercase tracking-widest">
                              Ventas
                            </div>
                          )}
                          {filteredVentas.map((venta) => {
                            const clienteNombre = typeof venta.cliente === 'string' ? venta.cliente : String(venta.cliente || 'Cliente');
                            const saldoFavor = getSaldoTotalCliente(String(venta.clienteId));
                            return (
                              <div
                                key={`venta-${venta.id}`}
                                onClick={() => {
                                  setTipoDevolucion('venta');
                                  handleVentaChange(venta.id.toString());
                                  setVentaSearchTerm(`${venta.numeroVenta} - ${clienteNombre}`);
                                  setShowVentaResults(false);
                                }}
                                className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer group"
                              >
                                <div className="flex justify-between items-start mb-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-orange-primary font-bold text-sm">#{venta.numeroVenta}</span>
                                    <span className="text-[11px] text-gray-lightest bg-gray-dark px-1.5 py-0.5 rounded border border-gray-darker font-medium">
                                      Total: ${formatCurrency(venta.total || 0)}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-lightest/60">{venta.fecha}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                  <div>
                                    <p className="text-sm text-gray-lightest font-normal">
                                      {clienteNombre}
                                    </p>
                                    <p className="text-[10px] text-gray-lightest">{venta.clienteDocumento || 'Sin documento'}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[9px] text-gray-lightest uppercase tracking-widest leading-none mb-1">Saldo Cliente</p>
                                    <p className={`text-xs font-bold ${saldoFavor > 0 ? 'text-green-400' : 'text-gray-lightest'}`}>
                                      ${formatCurrency(saldoFavor)}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between border-t border-gray-dark/50 pt-2">
                                  {(() => {
                                    const diffDays = getRemainingWarrantyDays(venta.fechaISO, venta.garantiaMeses);
                                    if (diffDays === null) {
                                      return (
                                        <div className="flex items-center gap-1.5">
                                          <ShieldCheck className="w-3 h-3 text-gray-500" />
                                          <span className="text-[10px] text-gray-lighter">Sin garantía</span>
                                        </div>
                                      );
                                    }
                                    const isExpired = diffDays < 0;
                                    return (
                                      <>
                                        <div className="flex items-center gap-1.5">
                                          <ShieldCheck className={`w-3 h-3 ${isExpired ? 'text-red-400' : 'text-green-400'}`} />
                                          <span className="text-[10px] text-gray-lighter">Garantía: 15 días</span>
                                        </div>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isExpired
                                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                          : 'bg-green-500/10 text-green-500 border border-green-500/20'
                                          }`}>
                                          {isExpired ? `EXPIRADA (${Math.abs(diffDays)}d)` : `ACTIVA (${diffDays}d)`}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                          {filteredBarberos.length > 0 && (
                            <div className="px-3 py-2 text-[10px] text-gray-lighter uppercase tracking-widest">
                              Barberos
                            </div>
                          )}
                          {filteredBarberos.map((b) => (
                            <div
                              key={`barbero-${b.id}`}
                              onClick={() => {
                                setTipoDevolucion('insumos');
                                setVentaSearchTerm(`${b.nombre} ${b.apellido} — ${b.tipoDocumento} ${b.documento}`);
                                setShowVentaResults(false);
                                handleBarberoChange(b);
                              }}
                              className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer group"
                            >
                              <div className="flex justify-between items-start mb-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-white-primary font-medium text-sm">{b.nombre} {b.apellido}</span>
                                  <span className="text-[11px] text-gray-lightest bg-gray-dark px-1.5 py-0.5 rounded border border-gray-darker font-medium">
                                    {b.tipoDocumento} {b.documento}
                                  </span>
                                </div>
                                <span className={`text-[10px] ${b.estado ? 'text-green-400' : 'text-red-400'}`}>
                                  {b.status === 'active' ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="text-[10px] text-gray-lightest">{b.correo}</div>
                                <div className="text-[10px] text-gray-lightest">{b.telefono}</div>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              {showVentaError && (
                <p className="text-xs text-red-400 mt-1">Debes seleccionar una venta del buscador.</p>
              )}
            </div>

            {/* Información del Cliente y productos de la venta */}
            {ventaSeleccionada && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* Tarjeta de Información de la Venta */}
                <div className="bg-gray-darker p-5 rounded-2xl border border-gray-dark/50 shadow-lg group hover:border-orange-primary/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4 border-b border-gray-dark pb-3">
                    <div className="p-2 bg-orange-primary/10 rounded-lg">
                      <UserIcon className="w-5 h-5 text-orange-primary" />
                    </div>
                    <div>
                      <h3 className="text-white-primary font-bold text-lg">Información de la Venta</h3>
                      <p className="text-xs text-gray-lightest">Detalles del cliente y registro de transacción</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-lightest uppercase tracking-widest font-bold">Cliente</p>
                      <p className="text-white-primary font-semibold flex items-center gap-2">
                        {typeof ventaSeleccionada.cliente === 'string' ? ventaSeleccionada.cliente : String(ventaSeleccionada.cliente || 'Cliente')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-lightest uppercase tracking-widest font-bold">Documento</p>
                      <p className="text-white-primary font-semibold flex items-center gap-2">
                        {ventaSeleccionada.clienteDocumento || nuevaDevolucion.clienteDocumento || 'No registrado'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-lightest uppercase tracking-widest font-bold">Fecha de Venta</p>
                      <p className="text-white-primary font-semibold flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-orange-primary/70" />
                        {ventaSeleccionada.fecha}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-lightest uppercase tracking-widest font-bold">Garantía</p>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const diffDays = getRemainingWarrantyDays(ventaSeleccionada.fechaISO, ventaSeleccionada.garantiaMeses);
                          if (diffDays === null) {
                            return (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20 flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3" />
                                SIN GARANTÍA
                              </span>
                            );
                          }

                          const isExpired = diffDays < 0;
                          return (
                            <>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${isExpired
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : 'bg-green-500/10 text-green-500 border border-green-500/20'
                                }`}>
                                <ShieldCheck className="w-3 h-3" />
                                {isExpired ? `EXPIRADA (${Math.abs(diffDays)}d)` : `ACTIVA (${diffDays}d)`}
                              </span>
                              <span className="text-[10px] text-gray-lightest">(15 días)</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm font-bold text-white-primary flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-orange-primary" />
                      Productos de la venta
                    </p>
                    <span className="text-xs text-gray-lightest px-2 py-0.5 bg-gray-darker rounded-full border border-gray-dark">
                      Selecciona los productos a devolver
                    </span>
                  </div>
                  {ventaSeleccionada?.productos && Array.isArray(ventaSeleccionada.productos) && ventaSeleccionada.productos.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {ventaSeleccionada.productos.map((producto: any, index: number) => {
                        const productoId = Number(producto?.id || 0);
                        const isChecked = !!productosSeleccionados[productoId];
                        const cantidadInput = cantidadesDevolucion[productoId] ?? '';
                        const maxCantidad = Number(producto?.cantidad || 0);
                        const imagenProducto = String(
                          producto?.imagen ||
                          producto?.imagenProduc ||
                          producto?.imagenUrl ||
                          producto?.Imagen ||
                          producto?.ImagenProduc ||
                          producto?.ImagenUrl ||
                          producto?.producto?.imagen ||
                          producto?.producto?.imagenProduc ||
                          producto?.producto?.imagenUrl ||
                          ''
                        );

                        return (
                          <div key={`${productoId}-${index}`} className="bg-gray-darkest rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20">
                            <div className="flex items-center gap-4 flex-nowrap min-w-0">
                              <div
                                className={`shrink-0 w-7 h-7 rounded-md border flex items-center justify-center transition-colors ${showProductoError && !isChecked
                                  ? `border-red-500 ring-1 ring-red-500 ${shakeClass}`
                                  : isChecked
                                    ? 'border-[#D9C3A4] bg-[#D9C3A4]/20'
                                    : 'border-[#D9C3A4]/70 bg-[#D9C3A4]/10'
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleToggleProductoSeleccion(producto, e.target.checked)}
                                  className="h-4 w-4 accent-[#D9C3A4] shrink-0 cursor-pointer"
                                />
                              </div>

                              <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark flex items-center justify-center border border-gray-dark">
                                {resolveImageSrc(imagenProducto) ? (
                                  <ImageRenderer
                                    url={imagenProducto}
                                    alt={producto?.nombre || 'Producto'}
                                    className="w-full h-full border-0 bg-transparent"
                                  />
                                ) : (
                                  <ShoppingBag className="w-5 h-5 text-gray-500" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <span className="text-white-primary font-semibold text-sm truncate block">
                                  {producto?.nombre || 'Producto'}
                                </span>
                                <span className="text-[11px] text-gray-lightest">
                                  Vendidos: {maxCantidad} | Precio: ${formatCurrency(Number(producto?.precio || 0))}
                                </span>
                              </div>

                              <div className="flex flex-col gap-0.5 shrink-0">
                                <label className="text-[11px] text-gray-400 font-normal">Cantidad</label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={Math.max(0, maxCantidad)}
                                  value={cantidadInput}
                                  onChange={(e) => handleCantidadProductoSeleccionChange(producto, e.target.value)}
                                  disabled={!isChecked || maxCantidad <= 0}
                                  className={`w-16 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5`}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-lightest">Esta venta no tiene productos disponibles para devolución.</p>
                  )}
                  {showProductoError && (
                    <p className="text-xs text-red-400">Selecciona un producto para la devolución.</p>
                  )}
                  {showCantidadError && (
                    <p className="text-xs text-red-400">Ingresa una cantidad válida para el producto seleccionado.</p>
                  )}
                </div>
              </div>
            )}

            {selectedBarbero && resumenEntregas.length > 0 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="bg-gray-darker p-5 rounded-2xl border border-gray-dark/50 shadow-lg">
                  <div className="flex items-center gap-3 mb-4 border-b border-gray-dark pb-3">
                    <div className="p-2 bg-orange-primary/10 rounded-lg">
                      <UserIcon className="w-5 h-5 text-orange-primary" />
                    </div>
                    <div>
                      <h3 className="text-white-primary font-bold text-lg">Barbero</h3>
                      <p className="text-xs text-gray-lightest">{selectedBarbero.nombre} {selectedBarbero.apellido} — {selectedBarbero.tipoDocumento} {selectedBarbero.documento}</p>
                    </div>
                  </div>
                  {entregasBarbero.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[11px] text-gray-400 mb-1">Entregas de Insumos</div>
                      <div className="flex flex-wrap gap-2">
                        {entregasBarbero.map((ent: any) => (
                          <button
                            key={`ent-${ent.id}`}
                            onClick={() => handleSelectEntrega(ent)}
                            className={`px-2.5 py-1 rounded-lg text-xs border ${selectedEntrega?.id === ent.id
                              ? 'bg-orange-primary text-black-primary border-orange-primary'
                              : 'bg-gray-dark text-gray-lightest border-gray-dark hover:border-orange-primary/40'}`}
                            title={`Entrega #${ent.id} • ${(String(ent.estado || ent.Estado || '').toLowerCase().includes('anul') ? 'Anulada' : 'Completada')} • ${ent.fecha ? new Date(ent.fecha).toLocaleDateString('es-CO') : ''}`}
                          >
                            #{ent.id} • {(String(ent.estado || ent.Estado || '').toLowerCase().includes('anul') ? 'Anulada' : 'Completada')} • {ent.fecha ? new Date(ent.fecha).toLocaleDateString('es-CO') : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {resumenEntregas.map((row: any) => {
                      const pid = Number(row.productoId || 0);
                      const checked = !!productosInsumosSeleccionados[pid];
                      const val = cantidadesInsumos[pid] ?? '1';
                      const subtotal = Number(row.precio || 0) * Number(val || 0);
                      return (
                        <div key={`ins-${pid}`} className="bg-gray-darkest rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20">
                          <div className="flex items-center gap-4 flex-nowrap min-w-0">
                            <div className="shrink-0 w-7 h-7 rounded-md border flex items-center justify-center transition-colors border-[#D9C3A4] bg-[#D9C3A4]/20">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => handleToggleInsumoSeleccion(row, e.target.checked)}
                                className="h-4 w-4 accent-[#D9C3A4] shrink-0"
                              />
                            </div>
                            <div className="min-w-0 flex-1 shrink flex items-center justify-start">
                              <span className="text-white-primary font-semibold text-base truncate block w-full">
                                {row.nombre}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <label className="text-[11px] text-gray-400 font-normal">Disponible</label>
                              <span className="text-white-primary font-semibold text-xs tabular-nums leading-7">{row.disponible}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <label className="text-[11px] text-gray-400 font-normal">Cantidad</label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={val}
                                onChange={(e) => handleCantidadInsumoChange(row, e.target.value)}
                                onBlur={() => handleCantidadInsumoBlur(row)}
                                disabled={!checked}
                                className="w-16 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5"
                              />
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                              <label className="text-[11px] text-gray-400 font-normal">Subtotal</label>
                              <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7">
                                ${formatCurrency(subtotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-3"></div>
              </div>
            )}

            {/* Motivo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-primary" />
                  Motivo de la Devolución *
                </Label>
                <Select value={nuevaDevolucion.motivoCategoria} onValueChange={(val) => {
                  if (showDevolucionFormErrors) setShowDevolucionFormErrors(false);
                  setNuevaDevolucion(prev => ({ ...prev, motivoCategoria: val }));
                }}>
                  <SelectTrigger className={`elegante-input w-full ${showMotivoError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}>
                    <SelectValue placeholder="Seleccionar motivo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark">
                    {MOTIVOS_DEVOLUCION.map((motivo) => (
                      <SelectItem key={motivo.value} value={motivo.value} className="text-white-primary">
                        {motivo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showMotivoError && (
                  <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-primary" />
                  Resumen Seleccionado
                </Label>
                <Input
                  type="text"
                  value={nuevaDevolucion.producto ? `${nuevaDevolucion.producto} x${nuevaDevolucion.cantidad}` : 'Selecciona un producto'}
                  disabled
                  className="elegante-input bg-gray-medium"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label className="text-white-primary flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-primary" />
                Observaciones (Opcional)
              </Label>
              <textarea
                value={nuevaDevolucion.observaciones}
                onChange={(e) => setNuevaDevolucion(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Describe detalles adicionales sobre la devolución..."
                maxLength={300}
                rows={3}
                className="elegante-input w-full resize-none"
              />
              <div className="flex justify-start mt-1">
                <span className="text-xs text-gray-500 font-medium">
                  {(nuevaDevolucion.observaciones || '').length}/300 caracteres
                </span>
              </div>
            </div>

            {/* Resumen del Monto */}
            {nuevaDevolucion.monto > 0 && (
              <div className="bg-gray-darker p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-gray-lightest">
                  <span>Monto Total a Devolver:</span>
                  <span className="text-orange-primary font-bold text-lg">${formatCurrency(nuevaDevolucion.monto)}</span>
                </div>
                <p className="text-sm text-gray-lightest">
                  Este monto se agregará como saldo a favor del cliente
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
              <button
                onClick={() => {
                  setShowDevolucionFormErrors(false);
                  setIsDialogOpen(false);
                  resetFormularios();
                }}
                className="elegante-button-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarDevolucion}
                className="elegante-button-primary"
              >
                Registrar Devolución
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Modal de Saldos a Favor */}
      <Dialog open={isHistorialDialogOpen} onOpenChange={setIsHistorialDialogOpen}>
        <DialogContent className="max-w-4xl bg-gray-darkest border-gray-dark">
          <DialogHeader>
            <DialogTitle className="text-white-primary">Saldos a Favor por Cliente</DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Clientes con saldo acumulativo disponible para futuras compras
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {getSaldosClientes().map((saldo) => (
              <div key={saldo.clienteId} className="bg-gray-darker p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-dark border-2 border-gray-medium flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-gray-lightest" />
                    </div>
                    <div>
                      <h4 className="text-white-primary font-medium">{saldo.cliente}</h4>
                      <p className="text-gray-lightest text-sm">{saldo.clienteId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isAdminOrSuperAdmin ? 'text-red-400' : 'text-green-400'}`}>${formatCurrency(saldo.saldoTotal)}</p>
                    <p className="text-gray-lightest text-sm">Saldo disponible</p>
                  </div>
                </div>

                {/* Historial resumido */}
                <div className="mt-4 pt-4 border-t border-gray-dark">
                  <h5 className="text-white-primary text-sm font-medium mb-2">Devoluciones Activas:</h5>
                  <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                    {getHistorialCliente(saldo.clienteId)
                      .filter(d => d.estado === 'Completada')
                      .slice(0, 3)
                      .map((dev) => (
                        <div key={dev.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-lightest">{dev.id} - {dev.producto}</span>
                          <span className={isAdminOrSuperAdmin ? 'text-red-400' : 'text-green-400'}>${formatCurrency(dev.saldoAFavor)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}

            {getSaldosClientes().length === 0 && (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-medium mx-auto mb-4" />
                <p className="text-gray-lightest">No hay clientes con saldo a favor actualmente</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DoubleConfirmationContainer />
      <AlertContainer />
    </>
  );
}
