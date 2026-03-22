import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "../../../shared/components/ui/input";
import {
  Plus,
  Search,
  Eye,
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
  const [isPdfPopoverOpen, setIsPdfPopoverOpen] = useState(false);
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
      const clientesMapa = new Map<number, { documento: string; tipoDocumento?: string; nombreCompleto?: string }>();
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
            nombreCompleto
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
          entregaFecha: (d as any).entregaFecha
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
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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

  const totalPages = Math.max(1, Math.ceil(filteredDevoluciones.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedDevoluciones = filteredDevoluciones.slice(startIndex, startIndex + itemsPerPage);

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
  const generateExcelReport = async (_periodo: 'custom', startDate?: string, endDate?: string) => {
    try {
      // Validar que las fechas estén presentes
      if (!startDate || !endDate) {
        showErrorAlert("Fechas requeridas", "Por favor selecciona ambas fechas para generar el reporte.");
        return;
      }

      setIsGeneratingReport(true);

      const XLSX = await import('xlsx');
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validar que la fecha de inicio sea anterior a la de fin
      if (start > end) {
        showErrorAlert("Fechas inválidas", "La fecha de inicio debe ser anterior a la fecha de fin.");
        setIsGeneratingReport(false);
        return;
      }

      // Filtrar devoluciones por rango de fechas
      const filteredData = devoluciones.filter(d => {
        const devDate = new Date(d.fecha.split('-').reverse().join('-'));
        return devDate >= start && devDate <= end;
      });

      // Si no hay datos en el rango, mostrar mensaje
      if (filteredData.length === 0) {
        showWarningAlert("Sin resultados", "No se encontraron devoluciones en el rango de fechas seleccionado.");
        setIsGeneratingReport(false);
        return;
      }

      const periodoTexto = `${startDate}_a_${endDate}`;

      const totalRegistros = filteredData.length;
      const totalMonto = filteredData.reduce((sum, d) => sum + d.monto, 0);
      const totalSaldos = filteredData.filter(d => d.estado === 'Completada').reduce((sum, d) => sum + d.saldoAFavor, 0);

      // Preparar datos para Excel
      const excelData = filteredData.map(dev => ({
        'ID Devolución': dev.id,
        'Cliente': dev.cliente,
        'Producto': dev.producto,
        'Cantidad': dev.cantidad,
        'Precio Unitario': `${formatCurrency(dev.precioUnitario)}`,
        'Monto Total': `${formatCurrency(dev.monto)}`,
        'Motivo': dev.motivoDetalle,
        'Estado': dev.estado,
        'Fecha': dev.fecha,
        'Hora': dev.hora,
        'Responsable': dev.responsable,
        'No. Venta': dev.numeroVenta,
        'Saldo a Favor': `${formatCurrency(dev.saldoAFavor)}`,
        'Observaciones': dev.observaciones || 'N/A'
      }));

      // Agregar resumen al final
      excelData.push({
        'ID Devolución': '',
        'Cliente': '',
        'Producto': '',
        'Cantidad': 0,
        'Precio Unitario': '',
        'Monto Total': '',
        'Motivo': '',
        'Estado': 'Completada',
        'Fecha': '',
        'Hora': '',
        'Responsable': '',
        'No. Venta': '',
        'Saldo a Favor': '',
        'Observaciones': ''
      } as any);
      excelData.push({
        'ID Devolución': 'RESUMEN',
        'Cliente': '',
        'Producto': '',
        'Cantidad': 0,
        'Precio Unitario': '',
        'Monto Total': '',
        'Motivo': '',
        'Estado': 'Completada',
        'Fecha': '',
        'Hora': '',
        'Responsable': '',
        'No. Venta': '',
        'Saldo a Favor': '',
        'Observaciones': ''
      } as any);
      excelData.push({
        'ID Devolución': 'Total Registros:',
        'Cliente': totalRegistros.toString(),
        'Producto': '',
        'Cantidad': 0,
        'Precio Unitario': '',
        'Monto Total': '',
        'Motivo': '',
        'Estado': 'Completada',
        'Fecha': '',
        'Hora': '',
        'Responsable': '',
        'No. Venta': '',
        'Saldo a Favor': '',
        'Observaciones': ''
      } as any);
      excelData.push({
        'ID Devolución': 'Total Monto:',
        'Cliente': `${formatCurrency(totalMonto)}`,
        'Producto': '',
        'Cantidad': 0,
        'Precio Unitario': '',
        'Monto Total': '',
        'Motivo': '',
        'Estado': 'Completada',
        'Fecha': '',
        'Hora': '',
        'Responsable': '',
        'No. Venta': '',
        'Saldo a Favor': '',
        'Observaciones': ''
      } as any);
      excelData.push({
        'ID Devolución': 'Total Saldos:',
        'Cliente': `${formatCurrency(totalSaldos)}`,
        'Producto': '',
        'Cantidad': 0,
        'Precio Unitario': '',
        'Monto Total': '',
        'Motivo': '',
        'Estado': 'Completada',
        'Fecha': '',
        'Hora': '',
        'Responsable': '',
        'No. Venta': '',
        'Saldo a Favor': '',
        'Observaciones': ''
      } as any);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 15 }, // ID Devolución
        { wch: 20 }, // Cliente
        { wch: 25 }, // Producto
        { wch: 10 }, // Cantidad
        { wch: 15 }, // Precio Unitario
        { wch: 15 }, // Monto Total
        { wch: 25 }, // Motivo
        { wch: 10 }, // Estado
        { wch: 12 }, // Fecha
        { wch: 8 },  // Hora
        { wch: 20 }, // Responsable
        { wch: 12 }, // No. Venta
        { wch: 15 }, // Saldo a Favor
        { wch: 30 }  // Observaciones
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones');

      // Generar nombre de archivo con fecha actual
      const fechaActual = new Date().toISOString().split('T')[0];
      const fileName = `Devoluciones_${periodoTexto}_${fechaActual}.xlsx`;
      XLSX.writeFile(wb, fileName);

      created("Reporte Excel generado exitosamente", `El archivo se descargó correctamente (${totalRegistros} devoluciones exportadas).`);

      setIsPdfPopoverOpen(false);
      setIsGeneratingReport(false);
    } catch (error) {
      showErrorAlert("Error al generar el reporte Excel", "No se pudo generar el reporte. Intenta nuevamente.");
      setIsGeneratingReport(false);
    }
  };

  // Función para generar PDF individual de devolución real
  const generateIndividualPdf = async (devolucion: Devolucion) => {
    try {
      const jsPDF = (await import('jspdf')).default;
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
      doc.text("Comprobante de Devolución", pageWidth / 2, 48, { align: "center" });

      doc.setFillColor(216, 176, 129);
      doc.roundedRect(pageWidth / 2 - 25, 52, 50, 7, 3.5, 3.5, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const devolucionId = String(devolucion.id || "N/A");
      doc.text(`DEVOLUCIÓN #${devolucionId}`, pageWidth / 2, 56.5, { align: "center" });

      let y = 80;
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMACIÓN GENERAL", hMargin, y);

      doc.setDrawColor(216, 176, 129);
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
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE DEVOLUCIÓN", hMargin, y);
      doc.line(hMargin, y + 2, 88, y + 2);

      y += 12;
      doc.setFillColor(26, 26, 26);
      doc.rect(hMargin, y, pageWidth - (hMargin * 2), 10, 'F');
      doc.setTextColor(216, 176, 129);
      doc.setFontSize(9);
      const col1 = 44, col2 = 83, col3 = 108, col4 = 133, col5 = 169;
      doc.text("ITEM", col1, y + 6.5, { align: "center" });
      doc.text("CATEGORÍA", col2, y + 6.5, { align: "center" });
      doc.text("CANT.", col3, y + 6.5, { align: "center" });
      doc.text("PREC. UNIT", col4, y + 6.5, { align: "center" });
      doc.text("SUBTOTAL", col5, y + 6.5, { align: "center" });

      y += 10;
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");

      const nombreItem = String(devolucion.producto || "Producto");
      const categoria = String(devolucion.categoria || "N/A");
      const cantidad = Number(devolucion.cantidad || 0);
      const precioUnitario = Number(devolucion.precioUnitario || 0);
      const subtotal = Number(devolucion.monto || cantidad * precioUnitario);

      doc.setFillColor(248, 249, 250);
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
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(hMargin, y, pageWidth - (hMargin * 2), 22, 2, 2, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`TOTAL DEVUELTO: $ ${formatCurrency(subtotal)}`, pageWidth / 2, y + 8, { align: "center" });
      doc.setFontSize(14);
      doc.setTextColor(216, 176, 129);
      doc.text(`SALDO A FAVOR: $ ${formatCurrency(Number(devolucion.saldoAFavor || 0))}`, pageWidth / 2, y + 17, { align: "center" });

      y = Math.max(275, y + 28);
      doc.setDrawColor(216, 176, 129);
      doc.line(hMargin, y, pageWidth - hMargin, y);

      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
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
      <main className="flex-1 overflow-auto bg-black-primary">
        {/* Stats Cards */}
        <div style={{ display: 'none' }} className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="elegante-card text-center">
            <RotateCcw className="w-8 h-8 text-orange-primary mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">{devolucionesHoy}</h4>
            <p className="text-gray-lightest text-sm">Devoluciones Hoy</p>
          </div>
          <div className="elegante-card text-center">
            <TrendingDown className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">${formatCurrency(totalMontoDevoluciones)}</h4>
            <p className="text-gray-lightest text-sm">Monto Total</p>
          </div>
          <div className="elegante-card text-center">
            <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">{devolucionesActivas}</h4>
            <p className="text-gray-lightest text-sm">Devoluciones Activas</p>
          </div>
          <div className="elegante-card text-center">
            <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">{devolucionesAnuladas}</h4>
            <p className="text-gray-lightest text-sm">Devoluciones Anuladas</p>
          </div>
          <div className="elegante-card text-center">
            <Wallet className="w-8 h-8 text-orange-secondary mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">${formatCurrency(totalSaldosAFavor)}</h4>
            <p className="text-gray-lightest text-sm">Saldos a Favor</p>
          </div>
        </div>

        {/* Sección Principal */}
        <div className="elegante-card">
          <TableHeaderSection
            leftContent={(
              <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (onNavigate) {
                    onNavigate("RegistrarDevolucion");
                  } else {
                    setShowDevolucionFormErrors(false);
                    setIsDialogOpen(true);
                  }
                }}
                className="elegante-button-primary gap-2 flex items-center"
              >
                <Plus className="w-4 h-4" />
                Nueva Devolución
              </button>
              <Popover open={isPdfPopoverOpen} onOpenChange={setIsPdfPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="elegante-button-secondary gap-2 flex items-center"
                    title="Generar reporte de devoluciones en Excel"
                  >
                    <Download className="w-4 h-4" />
                    Reporte Excel
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-gray-darkest border-gray-dark">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-white-primary mb-2">Generar Reporte de Devoluciones</h4>
                      <p className="text-sm text-gray-lightest">Selecciona el rango de fechas para el reporte en Excel</p>
                      <p className="text-xs text-orange-primary mt-1">Sin límite de rango de fechas</p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-white-primary text-sm mb-2 block">Fecha Inicio</Label>
                        <DatePicker
                          value={customStartDate}
                          onChange={(val) => setCustomStartDate(val)}
                        />
                      </div>
                      <div>
                        <Label className="text-white-primary text-sm mb-2 block">Fecha Fin</Label>
                        <DatePicker
                          value={customEndDate}
                          onChange={(val) => setCustomEndDate(val)}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (customStartDate && customEndDate) {
                            generateExcelReport('custom', customStartDate, customEndDate);
                          } else {
                            showErrorAlert("Fechas requeridas", "Por favor selecciona ambas fechas.");
                          }
                        }}
                        disabled={isGeneratingReport}
                        className="elegante-button-primary w-full p-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className={`w-4 h-4 ${isGeneratingReport ? 'animate-bounce' : ''}`} />
                        {isGeneratingReport ? 'Generando...' : 'Generar Reporte'}
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              </div>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar por cualquier campo de la tabla..."
            statusFilter={{
              value: filtroEstado,
              onChange: (value) => {
                setFiltroEstado(value);
                setCurrentPage(1);
              },
              options: [
                { value: "Todos", label: "Todos" },
                { value: "Completada", label: "Completadas" },
                { value: "Anulada", label: "Anuladas" },
              ],
            }}
            recordsText={`Mostrando ${displayedDevoluciones.length} de ${filteredDevoluciones.length} devoluciones`}
            recordsPlacement="left"
          />

          {/* Tabla de Devoluciones - MODIFICADA PARA ELIMINAR COLUMNAS */}
          <div className="overflow-x-auto">
            <table className="w-full">
                <thead className={isLoading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                  <tr className="border-b border-gray-dark">
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Número</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Documento</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Usuario</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Tipo</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Monto Devolución</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Saldo a Favor</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Fecha de Registro</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <TableLoadingStateRow
                      colSpan={9}
                      title="Cargando devoluciones..."
                    />
                  ) : displayedDevoluciones.length > 0 ? (
                  displayedDevoluciones.map((devolucion) => (
                    <tr key={devolucion.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Hash className="w-4 h-4 text-orange-primary" />
                          <span className="text-gray-lighter">{String(devolucion.id)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">
                          {devolucion.ventaId
                            ? (devolucion.clienteDocumento || devolucion.clienteId || '—')
                            : (() => {
                              const b = barberosDisponibles.find((x: any) => Number(x.id) === Number(devolucion.barberoId));
                              return b ? `${b.tipoDocumento} ${b.documento}` : (devolucion.clienteDocumento || devolucion.clienteId || '—');
                            })()
                          }
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <div className="text-gray-lighter">
                            {(devolucion.ventaId ? (devolucion.cliente || '') : (devolucion.barbero || devolucion.cliente || '')) || 'Usuario'}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{devolucion.ventaId ? 'Venta' : (devolucion.entregaId ? 'Insumos' : '—')}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter font-bold">${formatCurrency(devolucion.monto)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">${formatCurrency(devolucion.saldoAFavor)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-gray-lighter">{devolucion.fecha}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs ${getEstadoColor(devolucion.estado)}`}>
                          {devolucion.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => devolucion.estado === 'Completada' && handleToggleEstado(devolucion)}
                            disabled={devolucion.estado !== 'Completada'}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                            title={devolucion.estado === 'Completada' ? 'Anular devolución' : 'No se puede reactivar una devolución anulada'}
                          >
                            <Ban className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDevolucion(devolucion);
                              setIsDetailDialogOpen(true);
                            }}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                          <button
                            onClick={() => generateIndividualPdf(devolucion)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Descargar PDF"
                          >
                            <FileDown className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <TableEmptyStateRow
                    colSpan={9}
                    title="No se encontraron devoluciones"
                    description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                    onReload={loadData}
                    extraAction={(
                      <button
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate("RegistrarDevolucion");
                          } else {
                            setShowDevolucionFormErrors(false);
                            setIsDialogOpen(true);
                          }
                        }}
                        className="elegante-button-primary gap-2 flex items-center"
                      >
                        <Plus className="w-4 h-4" />
                        Nueva devolución
                      </button>
                    )}
                  />
                  )}
                </tbody>
              </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-dark">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-lightest">
                Página {currentPage} de {totalPages}
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
      </main>

      {/* Modal de Ver Detalle - MODIFICADO PARA AGREGAR CANTIDAD */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white-primary">Detalle de Devolución </DialogTitle>

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
                  <Label className="text-white-primary flex items-center gap-2">
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
                  <Label className="text-white-primary flex items-center gap-2">
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
                  <Label className="text-white-primary flex items-center gap-2">

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
                    <p className="font-semibold text-white-primary">
                      {selectedDevolucion.cliente}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-light">Responsable</p>
                    <p className="font-semibold text-white-primary">
                      {selectedDevolucion.responsable}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-light">Fecha y Hora</p>
                    <p className="font-semibold text-white-primary">
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
                        <span className="text-white-primary font-semibold text-base truncate block w-full">
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
                        <span className="text-white-primary font-semibold text-xs tabular-nums leading-7">
                          ${formatCurrency(selectedDevolucion.precioUnitario)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                        <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                        <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7">
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
                  <Label className="text-white-primary flex items-center gap-2">
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
                  <Label className="text-white-primary flex items-center gap-2">
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
                <Label className="text-white-primary flex items-center gap-2">
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
                    <h4 className="text-md font-medium text-white-primary flex items-center gap-2">
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
                              <span className="text-white-primary font-semibold text-base truncate block text-center w-full" title={p.nombre}>
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
                  <span className="text-green-400 font-bold text-md">${formatCurrency(selectedDevolucion.saldoAFavor)}</span>
                </div>
                <p className="text-sm text-gray-lightest pt-2 border-t border-gray-dark mt-2">
                  Saldo Total Acumulado del Cliente: <span className="text-green-400 font-bold">${formatCurrency(getSaldoTotalCliente(selectedDevolucion.clienteId))}</span>
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
            <DialogTitle className="text-white-primary">Nueva Devolución</DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Registra una nueva devolución de producto para generar saldo a favor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Buscador Principal de Ventas */}
            <div className="space-y-2 relative">
              <Label className="text-white-primary flex items-center gap-2">
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
                                    <p className="text-white-primary font-medium text-xs group-hover:text-orange-secondary transition-colors">
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
                    <p className="text-green-400 font-bold text-lg">${formatCurrency(saldo.saldoTotal)}</p>
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
                          <span className="text-green-400">${formatCurrency(dev.saldoAFavor)}</span>
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
