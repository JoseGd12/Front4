import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import {
  DollarSign,
  Plus,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  ShoppingCart,
  Calendar,
  Package,
  X,
  ShoppingBag,
  CreditCard,
  Receipt,
  Hash,
  Ban,
  FileDown,
  Calculator,
  Scissors,
  AlertCircle,
  FileText,
  ShieldCheck,
  Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Checkbox } from "../../../shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { Label } from "../../../shared/components/ui/label";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { ventaService, Venta } from "../services/ventaService";
import { servicioService, Servicio } from "../../servicios/services/servicioService";
import { productoService, ApiProducto } from "../../productos/services/productos";
import { apiService, ApiUser, Paquete } from "../../../shared/services/api";
import { clientesService, ClienteAPI } from "../../clientes/services/clientesService";
import { devolucionService, Devolucion as ApiDevolucion } from "../services/devolucionService";
import { AppRole } from "../../auth/services/authSyncService";
import { useAuth } from "../../../shared/contexts/AuthContext";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import manitoLogo from "../../../assets/Manito.jpeg";

// Función para formatear moneda colombiana con puntos para separar miles
const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString('es-CO');
};

// Formato estándar DD/MM/AAAA (igual a Compras)
const formatDate = (date: string | Date): string => {
  let dateObj: Date;
  if (typeof date === 'string') {
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

  if (Number.isNaN(dateObj.getTime())) return String(date || '');

  return dateObj.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const normalizeSearchText = (value: unknown): string => {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

// Función auxiliar para normalizar cliente a cadena
const normalizeCliente = (cliente: any): string => {
  if (typeof cliente === 'string') {
    return cliente;
  }
  if (cliente && typeof cliente === 'object') {
    const nombre = cliente.nombre || cliente.Nombre || '';
    const apellido = cliente.apellido || cliente.Apellido || '';
    return `${nombre} ${apellido}`.trim() || 'Cliente';
  }
  return 'Cliente';
};

// Función auxiliar para normalizar barbero a cadena
const normalizeBarbero = (barbero: any): string => {
  if (typeof barbero === 'string') {
    return barbero;
  }
  if (barbero && typeof barbero === 'object') {
    const nombre = barbero.nombre || barbero.Nombre || '';
    const apellido = barbero.apellido || barbero.Apellido || '';
    return `${nombre} ${apellido}`.trim() || 'Sin asignar';
  }
  return 'Sin asignar';
};

// Función para calcular días restantes de garantía
const getRemainingWarrantyDays = (fechaISO: string, garantiaMeses: number): number | null => {
  if (!fechaISO) return null;
  try {
    const fechaVenta = new Date(fechaISO);
    if (isNaN(fechaVenta.getTime())) return null;

    const fechaExp = new Date(fechaVenta);
    if (garantiaMeses && garantiaMeses > 0) {
      fechaExp.setMonth(fechaExp.getMonth() + garantiaMeses);
    } else {
      // Garantía fija de 15 días cuando meses = 0
      fechaExp.setDate(fechaExp.getDate() + 15);
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const expCopy = new Date(fechaExp);
    expCopy.setHours(0, 0, 0, 0);

    const diffTime = expCopy.getTime() - hoy.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
};

const resolveImageSrc = (rawValue: unknown): string => {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  // Si ya es un formato conocido, lo devolvemos tal cual. 
  // Si es un nombre de archivo solo (legacy), lo devolvemos tal cual para que ImageRenderer le ponga el path de assets.
  return value;
};

interface DevolucionAsociada {
  id: number;
  ventaId: number;
  productoId: number;
  producto: string;
  productoImagen?: string;
  cantidad: number;
  monto: number;
  precioUnitario: number;
  estado: string;
  fecha: string;
  hora: string;
  motivoDetalle: string;
  observaciones?: string;
}




interface VentasPageProps {
  onNavigate?: (page: string) => void;
}

export function VentasPage({ onNavigate }: VentasPageProps) {
  const { user } = useAuth();
  const { created, edited, deleted, error: showErrorAlert, AlertContainer } = useCustomAlert();
  const { confirmEditAction, DoubleConfirmationContainer } = useDoubleConfirmation();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevolucionAsociada[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [productosAPI, setProductosAPI] = useState<ApiProducto[]>([]);
  const [clientesAPI, setClientesAPI] = useState<ClienteAPI[]>([]);
  const [clientesCatalogo, setClientesCatalogo] = useState<ClienteAPI[]>([]);
  const [barberosAPI, setBarberosAPI] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Valor especial para representar "todos los barberos" en el filtro
  const VALOR_TODOS_BARBEROS = "todos";
  // Valor especial para representar "sin barbero" en el formulario de nueva venta
  const VALOR_SIN_BARBERO = "sin-barbero";
  const [barberoSeleccionado, setBarberoSeleccionado] = useState<string>(VALOR_TODOS_BARBEROS);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Versión optimizada que recibe los Map ya construidos
  const enriquecerVentaConClienteOptimizado = (
    venta: Venta,
    clientesById: Map<number, any>,
    clientesByDocumento: Map<string, any>
  ): Venta => {
    if (!venta) return venta;

    const clienteId = Number(venta.clienteId);
    const documentoActual = String(venta.clienteDocumento || '').trim();
    const nombreActual = String(venta.cliente || '').trim();

    const clienteMatch =
      (!Number.isNaN(clienteId) && clienteId > 0 ? clientesById.get(clienteId) : undefined) ||
      (documentoActual ? clientesByDocumento.get(documentoActual) : undefined);

    if (!clienteMatch) return venta;

    const nombreCatalogo = `${clienteMatch?.nombre || clienteMatch?.Nombre || ''} ${clienteMatch?.apellido || clienteMatch?.Apellido || ''}`.trim();
    const documentoCatalogo = String(clienteMatch?.documento || clienteMatch?.Documento || '').trim();

    const nombreNormalizado = nombreActual.toLowerCase();
    const nombreEsGenerico =
      !nombreActual ||
      ['cliente', 'n/a', 'na', 'sin cliente', 'null', 'undefined'].includes(nombreNormalizado) ||
      /^\d+$/.test(nombreActual) ||
      /^\[object object\]$/i.test(nombreActual) ||
      /^cliente\s*\d*$/i.test(nombreActual);
    const documentoFaltante =
      !documentoActual ||
      ['n/a', 'na', '-'].includes(documentoActual.toLowerCase());

    return {
      ...venta,
      cliente: (nombreEsGenerico && nombreCatalogo) ? nombreCatalogo : venta.cliente,
      clienteDocumento: documentoFaltante ? (documentoCatalogo || venta.clienteDocumento) : venta.clienteDocumento
    };
  };

  // Cargar ventas desde la API al montar el componente
  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar todos los datos necesarios en paralelo
      const [ventasData, serviciosData, productosData, usuariosData, paquetesData, clientesData, devolucionesData] = await Promise.all([
        ventaService.getVentas().catch(() => []),
        servicioService.getServicios().catch(() => []),
        productoService.getProductos().catch(() => []),
        apiService.getUsuarios().catch(() => []),
        apiService.getPaquetes().catch(() => []),
        clientesService.getClientes().catch(() => []),
        devolucionService.getDevoluciones().catch(() => [])
      ]);

      console.log('🔍 Ventas cargadas:', ventasData.length);
      console.log('🔍 Servicios cargados:', serviciosData?.length || 0);
      console.log('🔍 Paquetes cargados:', paquetesData?.length || 0);
      console.log('🔍 Productos cargados:', productosData?.length || 0);
      console.log('🔍 Usuarios cargados:', usuariosData?.length || 0);
      console.log('🔍 Clientes cargados (tabla clientes):', clientesData?.length || 0);
      console.log('🔍 Devoluciones cargadas:', devolucionesData?.length || 0);

      const saldoPorCliente = new Map<number, number>();
      (devolucionesData as ApiDevolucion[] || []).forEach((d: any) => {
        const estado = String(d?.estado || '').trim();
        if (estado === 'Activo' || estado === 'Completada' || estado === 'Procesado') {
          const cId = Number(d?.clienteId || 0);
          if (cId > 0) {
            const prev = saldoPorCliente.get(cId) || 0;
            saldoPorCliente.set(cId, prev + (Number(d?.saldoAFavor) || 0));
          }
        }
      });
      const clientesConSaldo = (clientesData || []).map((cliente: any) => ({
        ...cliente,
        saldoAFavor: saldoPorCliente.get(Number(cliente.id)) || 0
      }));

      // Optimización: Crear mapas de clientes una sola vez fuera del bucle de ventas
      const clientesById = new Map<number, any>();
      const clientesByDocumento = new Map<string, any>();

      clientesConSaldo.forEach((c: any) => {
        const idNum = Number(c?.id ?? c?.Id);
        if (!Number.isNaN(idNum) && idNum > 0) {
          clientesById.set(idNum, c);
        }
        const doc = String(c?.documento ?? c?.Documento ?? '').trim();
        if (doc) {
          clientesByDocumento.set(doc, c);
        }
      });

      setClientesCatalogo(clientesConSaldo);
      const ventasEnriquecidas = (ventasData || []).map((venta: Venta) =>
        enriquecerVentaConClienteOptimizado(venta, clientesById, clientesByDocumento)
      );
      setVentas(ventasEnriquecidas);
      setServicios((serviciosData || []).filter(s => s.estado === true));
      setPaquetes((paquetesData || []).filter(p => p.activo === true));
      setProductosAPI((productosData || []).filter(p => p.activo === true));

      const devolucionesNormalizadas: DevolucionAsociada[] = (devolucionesData as ApiDevolucion[]).map((d: any) => {
        // ... (rest of the normalization logic)
        const cantidad = Number(d?.cantidad || 0);
        const monto = Number(d?.monto || 0);
        const fechaRaw = String(d?.fecha || '');
        const fechaObj = fechaRaw ? new Date(fechaRaw) : null;
        const productoId = Number(d?.productoId || 0);
        const productoEnCatalogo = (productosData || []).find((p: any) => Number(p?.id || 0) === productoId) as any;
        const imagenCatalogo = String(
          productoEnCatalogo?.imagen ||
          productoEnCatalogo?.imagenProduc ||
          productoEnCatalogo?.imagenUrl ||
          ''
        );

        return {
          id: Number(d?.id || 0),
          ventaId: Number(d?.ventaId || 0),
          productoId: Number(d?.productoId || 0),
          producto: String(d?.productoNombre || 'Producto'),
          productoImagen: String((d as any)?.productoImagen || (d as any)?.imagenProducto || imagenCatalogo || ''),
          cantidad,
          monto,
          precioUnitario: cantidad > 0 ? monto / cantidad : 0,
          estado: String(d?.estado || 'Completada'),
          fecha: fechaObj && !Number.isNaN(fechaObj.getTime()) ? fechaObj.toLocaleDateString('es-CO') : '',
          hora: fechaObj && !Number.isNaN(fechaObj.getTime())
            ? fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            : '',
          motivoDetalle: String((d as any)?.motivoDetalle || d?.motivo || ''),
          observaciones: String(d?.observaciones || '')
        };
      });
      setDevoluciones(devolucionesNormalizadas);

      // Clientes para ventas: usar SIEMPRE la tabla de clientes (IDs válidos para FK ClienteId)
      const clientesActivos = clientesConSaldo.filter((c: any) => c.estado === true);
      setClientesAPI(clientesActivos);
      console.log('🔍 Clientes activos (con saldo calculado):', clientesActivos.length);

      // Filtrar barberos: Usuarios activos que NO son Clientes ni Administradores
      const barberos = usuariosData.filter((u: any) =>
        u.rolId !== AppRole.CLIENTE &&
        u.rolId !== AppRole.ADMIN &&
        u.estado === true
      );

      // Si la lista de barberos está vacía, incluimos a los admins activos para que el sistema sea funcional
      if (barberos.length === 0) {
        setBarberosAPI(usuariosData.filter((u: any) => (u.rolId === AppRole.ADMIN || u.rolId === 1) && u.estado === true));
      } else {
        setBarberosAPI(barberos);
      }
      console.log('🔍 Barberos filtrados:', barberos.length);

      // Verificar servicios disponibles después de cargar
      setTimeout(() => {
        console.log('🔍 serviciosDisponibles después de cargar:', serviciosDisponibles);
      }, 100);

    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar los datos');
      showErrorAlert("Error al cargar datos", "No se pudieron cargar los datos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const generateCurrentDate = () => {
    return new Date().toISOString().split('T')[0] || "";
  };

  const inicialNuevaVenta = {
    clienteId: null as number | null,
    clienteDocumento: "",
    fechaCreacion: "",
    tipoVenta: "Venta directa",
    metodoPago: "",
    barberoId: null as number | null,
    barberoNombre: "",
    porcentajeDescuento: 0,
    usarSaldoAFavor: false,
    montoSaldoUsado: 0,
    garantiaMeses: 0,
    productos: [] as { id: string; nombre: string; cantidad: number; precio: number; imagen?: string }[],
  };

  // Usar servicios y paquetes cargados desde la API
  const serviciosDisponibles = useMemo(() => {
    const serviciosNombres = servicios.map(s => s.nombre).filter(Boolean);
    const paquetesNombres = paquetes.map(p => `[PAQUETE] ${p.nombre}`).filter(Boolean);

    const combinado = [...serviciosNombres, ...paquetesNombres].sort();

    // Si no hay nada, usar fallback
    if (combinado.length === 0) {
      return [
        "Corte Clásico",
        "Barba Completa",
        "Corte + Barba",
        "Tinte Cabello",
        "Tratamiento Capilar"
      ];
    }

    return combinado;
  }, [servicios, paquetes]);

  // Barberos disponibles para el filtro y la creación
  const barberosDisponibles = useMemo(() => {
    return barberosAPI.map(b => `${b.nombre} ${b.apellido || ''}`.trim()).sort();
  }, [barberosAPI]);

  // Clientes disponibles para asignar a una venta
  const clientesDisponibles = useMemo(() => {
    return clientesAPI.map(c => ({
      nombre: `${c.nombre || ''} ${c.apellido || ''}`.trim(),
      documento: c.documento || '',
      id: Number(c.id),
      saldoAFavor: Number((c as any).saldoAFavor || 0)
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [clientesAPI]);

  const [nuevaVenta, setNuevaVenta] = useState(inicialNuevaVenta);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState(0);
  const [cantidadProductoInput, setCantidadProductoInput] = useState('');
  const [porcentajeDescuentoInput, setPorcentajeDescuentoInput] = useState('');
  const [isServicioDialogOpen, setIsServicioDialogOpen] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState('');
  const [serviciosAgregados, setServiciosAgregados] = useState<Array<{ id: string; nombre: string; precio: number; cantidad: number; imagen?: string }>>([]);
  const [tarjetaProductoInputs, setTarjetaProductoInputs] = useState<Record<string, { cantidad?: string; precio?: string }>>({});
  const [tarjetaServicioInputs, setTarjetaServicioInputs] = useState<Record<string, { cantidad?: string; precio?: string }>>({});
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [showProductResults, setShowProductResults] = useState(false);
  const [barberoSearchTerm, setBarberoSearchTerm] = useState("");
  const [showBarberoResults, setShowBarberoResults] = useState(false);
  const [barberoSearchFocused, setBarberoSearchFocused] = useState(false);
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [showServiceResults, setShowServiceResults] = useState(false);
  const [showVentaFormErrors, setShowVentaFormErrors] = useState(false);
  const [showAddProductoErrors, setShowAddProductoErrors] = useState(false);
  const [showAddServicioErrors, setShowAddServicioErrors] = useState(false);
  const [ventaValidationAttempt, setVentaValidationAttempt] = useState(0);

  const numeroVenta = useMemo(() => {
    const maxId = (ventas || []).reduce((max, venta) => {
      const idFromEntity = Number((venta as any)?.id ?? 0);
      const idFromNumero = Number((venta as any)?.numeroVenta ?? 0);
      const candidate = Math.max(
        Number.isFinite(idFromEntity) ? idFromEntity : 0,
        Number.isFinite(idFromNumero) ? idFromNumero : 0
      );
      return candidate > max ? candidate : max;
    }, 0);
    return maxId + 1;
  }, [ventas]);
  const shakeClass = ventaValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';
  const noItemsAgregados = (nuevaVenta.productos?.length || 0) === 0 && serviciosAgregados.length === 0;
  const mustChooseProducto = showVentaFormErrors && noItemsAgregados && !servicioSeleccionado;
  const mustChooseServicio = showVentaFormErrors && noItemsAgregados && !productoSeleccionado;
  const mustSetCantidadProducto = mustChooseProducto && !!productoSeleccionado && cantidadProducto <= 0;
  const showProductoSelectorError = (mustChooseProducto && !productoSeleccionado) || (showAddProductoErrors && !productoSeleccionado);
  const showCantidadProductoError = mustSetCantidadProducto || (showAddProductoErrors && cantidadProducto <= 0);
  const showServicioSelectorError = (mustChooseServicio && !servicioSeleccionado) || (showAddServicioErrors && !servicioSeleccionado);

  const canUseSaldoPago = (): boolean => {
    const cliente = clientesDisponibles.find(c => c.id === Number(nuevaVenta.clienteId));
    const saldoDisponible = cliente?.saldoAFavor || 0;
    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento(subtotal);
    const totalSinSaldo = subtotal + calcularIva(subtotal) - descuento;
    return saldoDisponible > 0 && saldoDisponible >= totalSinSaldo;
  };

  const handleMetodoPagoChange = (value: string) => {
    if (value === 'Saldo') {
      if (!nuevaVenta.clienteId) {
        showErrorAlert("Cliente requerido", "Selecciona un cliente para usar Saldo.");
        return;
      }
      if (!canUseSaldoPago()) {
        showErrorAlert("Saldo insuficiente", "El saldo no cubre el total de la venta.");
        return;
      }
      setNuevaVenta({ ...nuevaVenta, metodoPago: 'Saldo', usarSaldoAFavor: true });
      return;
    }
    setNuevaVenta({ ...nuevaVenta, metodoPago: value, usarSaldoAFavor: false });
  };

  const isStockExceeded = useMemo(() => {
    if (!productoSeleccionado || cantidadProducto <= 0) return false;
    const producto = productosAPI.find(p => p.id.toString() === productoSeleccionado);
    if (!producto) return false;
    const yaAgregado = (nuevaVenta.productos || []).find(p => p.id === productoSeleccionado);
    const cantYaAgregada = yaAgregado ? yaAgregado.cantidad : 0;
    return (cantidadProducto + cantYaAgregada) > producto.stockVentas;
  }, [productoSeleccionado, cantidadProducto, nuevaVenta.productos, productosAPI]);

  const filteredVentas = useMemo(() => {
    const query = normalizeSearchText(searchTerm);
    return ventas.filter((venta) => {
      const clienteStr = normalizeCliente(venta.cliente);
      const barberoStr = normalizeBarbero(venta.barbero);
      const searchableText = normalizeSearchText([
        venta.id,
        venta.numeroVenta,
        venta.clienteDocumento,
        clienteStr,
        formatCurrency(venta.total),
        venta.total,
        formatDate(venta.fecha),
        venta.estado,
        venta.metodoPago,
        barberoStr,
        venta.clienteId
      ].join(' '));
      const matchesSearch = query.length === 0 || searchableText.includes(query);
      const matchesBarbero =
        barberoSeleccionado === VALOR_TODOS_BARBEROS ||
        barberoStr === barberoSeleccionado;
      const estadoNormalizado = String(venta.estado || '').toLowerCase().trim();
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completada' && (estadoNormalizado === 'completada' || estadoNormalizado === 'completado' || estadoNormalizado === 'activo')) ||
        (statusFilter === 'anulada' && (estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado'));
      return matchesSearch && matchesBarbero && matchesStatus;
    });
  }, [ventas, searchTerm, barberoSeleccionado, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVentas.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedVentas = filteredVentas.slice(startIndex, startIndex + itemsPerPage);

  // Reset página al filtrar
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(10);
    setCurrentPage(1);
  };

  // Cálculo de totales SOLO sobre servicios de las ventas filtradas del barbero
  const {
    totalServiciosFiltrados,
    totalBarbero,
    totalBarberia,
  } = useMemo(() => {
    // Solo ventas completadas para comisiones
    const ventasParaComision = filteredVentas.filter(
      (venta) =>
        venta.estado === "Completada" &&
        venta.serviciosDetalle &&
        venta.serviciosDetalle.length > 0
    );

    const totalServicios = ventasParaComision.reduce((acum, venta) => {
      const totalServiciosVenta = venta.serviciosDetalle.reduce(
        (suma: number, servicio: any) => suma + (servicio.precio || 0),
        0
      );
      return acum + totalServiciosVenta;
    }, 0);

    const totalBarberoCalc = totalServicios * 0.6;
    const totalBarberiaCalc = totalServicios * 0.4;

    return {
      totalServiciosFiltrados: totalServicios,
      totalBarbero: totalBarberoCalc,
      totalBarberia: totalBarberiaCalc,
    };
  }, [filteredVentas]);

  const getEstadoColor = (estado: string) => {
    const estadoNormalizado = (estado || '').toLowerCase().trim();
    if (estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado') {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    if (estadoNormalizado === 'completada' || estadoNormalizado === 'completado' || estadoNormalizado === 'activo') {
      return 'bg-green-500/10 text-green-400 border border-green-500/20';
    }
    if (estadoNormalizado === 'pendiente') {
      return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    }
    if (estadoNormalizado === 'procesado') {
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
    return 'bg-gray-medium text-gray-lighter';
  };

  const getProductoDetalleImage = (producto: any): string => {
    const nombreProducto = String(producto?.nombre || '').trim().toLowerCase();
    const productoId = Number(String(producto?.id || '').replace(/\D/g, ''));

    const productoCatalogo = productosAPI.find((p: any) => {
      const sameId = !Number.isNaN(productoId) && productoId > 0 && Number(p.id) === productoId;
      const sameName = !!nombreProducto && String(p.nombre || '').trim().toLowerCase() === nombreProducto;
      return sameId || sameName;
    });

    return resolveImageSrc(
      producto?.imagen ||
      producto?.imagenProduc ||
      producto?.imagenUrl ||
      producto?.Imagen ||
      producto?.ImagenProduc ||
      producto?.ImagenUrl ||
      productoCatalogo?.imagenProduc ||
      (productoCatalogo as any)?.imagen ||
      (productoCatalogo as any)?.imagenUrl ||
      ''
    );
  };

  const getServicioDetalleImage = (servicio: any): string => {
    const servicioIdRaw = String(servicio?.id || '');
    const nombreServicio = String(servicio?.nombre || '').trim().toLowerCase();
    const paqueteId = servicioIdRaw.startsWith('PAQ-') ? Number(servicioIdRaw.replace('PAQ-', '')) : Number.NaN;
    const servicioId = servicioIdRaw.startsWith('SERV-')
      ? Number(servicioIdRaw.replace('SERV-', ''))
      : Number(servicioIdRaw);

    const paqueteMatch = ((!Number.isNaN(paqueteId) && paqueteId > 0)
      ? paquetes.find((p: any) => Number(p.id) === paqueteId)
      : undefined) || paquetes.find((p: any) => {
        const nombrePaquete = String(p?.nombre || '').trim().toLowerCase();
        return !!nombreServicio && nombrePaquete === nombreServicio;
      });

    const servicioMatch = ((!Number.isNaN(servicioId) && servicioId > 0)
      ? servicios.find((s: any) => Number(s.id) === servicioId)
      : undefined) || servicios.find((s: any) => {
        const nombre = String(s?.nombre || '').trim().toLowerCase();
        return !!nombreServicio && nombre === nombreServicio;
      });

    return resolveImageSrc(
      servicio?.imagen ||
      servicio?.imagenServicio ||
      servicio?.imagenUrl ||
      servicio?.Imagen ||
      servicio?.ImagenServicio ||
      servicio?.ImagenUrl ||
      (paqueteMatch as any)?.imagen ||
      (paqueteMatch as any)?.imagenUrl ||
      (servicioMatch as any)?.imagen ||
      (servicioMatch as any)?.imagenServicio ||
      (servicioMatch as any)?.imagenUrl ||
      ''
    );
  };

  const devolucionesVentaActual = useMemo(() => {
    if (!selectedVenta) return [];
    const ventaIdCandidates = [
      Number(selectedVenta.id),
      Number(String((selectedVenta as any).numeroVenta || '').replace(/\D/g, ''))
    ].filter(v => Number.isFinite(v) && v > 0);
    return devoluciones.filter(d => {
      const devVentaRaw = (d as any).ventaId ?? (d as any).VentaId ?? (d as any).numeroVenta ?? (d as any).NumeroVenta ?? d.ventaId;
      const devVentaNum = Number(String(devVentaRaw || '').replace(/\D/g, ''));
      const matchId = ventaIdCandidates.some(v => v === devVentaNum);
      const estado = (d.estado || '').toLowerCase().trim();
      const noAnulada = estado !== 'anulada' && estado !== 'anulado';
      const motivoDet = String((d as any).motivoDetalle || '').toLowerCase();
      const motivoCat = String((d as any).motivo || (d as any).motivoCategoria || '').toLowerCase();
      const esConsumoSaldo = (motivoDet.includes('consumo') && motivoDet.includes('saldo')) || (motivoCat.includes('consumo') && motivoCat.includes('saldo'));
      return matchId && noAnulada && !esConsumoSaldo;
    });
  }, [selectedVenta, devoluciones]);

  const totalMontoDevuelto = useMemo(() => {
    return devolucionesVentaActual.reduce((sum, d) => sum + (d.monto || 0), 0);
  }, [devolucionesVentaActual]);

  const detalleItemsVenta = useMemo(() => {
    if (!selectedVenta) return [];

    const devolucionPorProductoId = new Map<number, number>();
    const devolucionPorNombre = new Map<string, number>();
    devolucionesVentaActual.forEach(dev => {
      const devProdId = Number((dev as any).productoId || 0);
      if (devProdId > 0) {
        devolucionPorProductoId.set(devProdId, (devolucionPorProductoId.get(devProdId) || 0) + (dev.cantidad || 0));
      }
      const nombre = (dev.producto || '').toLowerCase().trim();
      if (nombre) {
        devolucionPorNombre.set(nombre, (devolucionPorNombre.get(nombre) || 0) + (dev.cantidad || 0));
      }
    });

    const productosItems = (selectedVenta.productosDetalle || []).map((producto: any, index: number) => {
      const cantidadOriginal = Number(producto?.cantidad || 1);
      const precio = Number(producto?.precio || 0);
      const nombre = String(producto?.nombre || 'Producto');
      const prodId = Number(producto?.id || producto?.productoId || producto?.ProductoId || 0);

      const cantidadDevuelta = (prodId > 0 ? devolucionPorProductoId.get(prodId) : undefined)
        ?? devolucionPorNombre.get(nombre.toLowerCase().trim())
        ?? 0;
      const cantidadFinal = Math.max(0, cantidadOriginal - cantidadDevuelta);
      return {
        key: `producto-${producto?.id ?? index}-${index}`,
        nombre,
        tipo: 'Producto',
        cantidadOriginal,
        cantidadDevuelta,
        cantidad: cantidadFinal,
        precio,
        subtotal: cantidadFinal * precio,
        imageSrc: getProductoDetalleImage(producto),
        fallbackIcon: 'producto' as const
      };
    });

    const serviciosItems = (selectedVenta.serviciosDetalle || []).map((servicio: any, index: number) => {
      const cantidad = Number(servicio?.cantidad || 1);
      const precio = Number(servicio?.precio || 0);
      return {
        key: `servicio-${servicio?.id ?? index}-${index}`,
        nombre: String(servicio?.nombre || 'Servicio'),
        tipo: 'Servicio',
        cantidadOriginal: cantidad,
        cantidadDevuelta: 0,
        cantidad,
        precio,
        subtotal: cantidad * precio,
        imageSrc: getServicioDetalleImage(servicio),
        fallbackIcon: 'servicio' as const
      };
    });

    return [...productosItems, ...serviciosItems];
  }, [selectedVenta, productosAPI, servicios, paquetes, devolucionesVentaActual]);

  const subtotalAjustado = useMemo(() => {
    return detalleItemsVenta.reduce((sum, item) => sum + item.subtotal, 0);
  }, [detalleItemsVenta]);

  const totalItemsDevueltos = useMemo(() => {
    return detalleItemsVenta.reduce((sum, item) => sum + item.cantidadDevuelta, 0);
  }, [detalleItemsVenta]);

  // Saldo a favor usado: tomar del campo si viene de la API;
  // si no, derivarlo de la aritmética de la venta.
  const saldoUsadoDetalle = useMemo(() => {
    if (!selectedVenta) return 0;
    // Prioridad: usar exactamente 'SaldoAFavorUsado' (PascalCase) si viene del backend
    const explicit = Number(
      (selectedVenta as any).SaldoAFavorUsado ??
      (selectedVenta as any).saldoAFavorUsado ??
      (selectedVenta as any).SaldoAFavor ??
      (selectedVenta as any).saldoAFavor ??
      0
    );
    if (explicit > 0) return explicit;

    const subtotal = Number(selectedVenta.subtotal || 0);
    const iva = Number((selectedVenta as any).iva || 0);
    const descuento = Number(selectedVenta.descuento || 0);
    const total = Number(selectedVenta.total || 0);

    // El saldo usado es la diferencia entre lo que debería costar (Subtotal + IVA - Descuento) y lo que se cobró (Total)
    const shouldBe = subtotal + iva - descuento;
    const diff = shouldBe - total;

    // Retornar la diferencia si es positiva (tolerancia por decimales)
    return diff > 0.01 ? diff : 0;
  }, [selectedVenta]);


  const calcularSubtotal = () => {
    let subtotal = 0;

    // Calcular subtotal de productos
    if (nuevaVenta.productos && Array.isArray(nuevaVenta.productos)) {
      subtotal += nuevaVenta.productos.reduce((total, producto) =>
        total + (producto.precio * producto.cantidad), 0
      );
    }

    // Calcular subtotal de servicios y paquetes
    serviciosAgregados.forEach(servicioAgregado => {
      // Usar siempre el precio almacenado (puede haber sido modificado por el usuario)
      subtotal += (servicioAgregado.precio * servicioAgregado.cantidad);
    });

    console.log(`🔍 Subtotal calculado: ${subtotal}`);
    return subtotal;
  };

  const calcularDescuento = (subtotal: number) => {
    return subtotal * (nuevaVenta.porcentajeDescuento / 100);
  };

  const handleCantidadProductoInputChange = (valor: string) => {
    if (valor.trim() === '') {
      setCantidadProductoInput('');
      setCantidadProducto(0);
      return;
    }

    const numero = Number(valor);
    if (Number.isNaN(numero)) return;

    const cantEntera = Math.max(0, Math.floor(numero));

    setCantidadProductoInput(valor);
    if (showAddProductoErrors) {
      setShowAddProductoErrors(false);
    }
    setCantidadProducto(cantEntera);
  };

  const handlePorcentajeDescuentoInputChange = (valor: string) => {
    setPorcentajeDescuentoInput(valor);
    if (valor.trim() === '') {
      setNuevaVenta({ ...nuevaVenta, porcentajeDescuento: 0 });
      return;
    }
    const numero = Number(valor);
    if (!Number.isNaN(numero)) {
      const normalizado = Math.max(0, Math.min(100, numero));
      setNuevaVenta({ ...nuevaVenta, porcentajeDescuento: normalizado });
    }
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const iva = calcularIva(subtotal);
    const descuento = calcularDescuento(subtotal);
    return Math.max(0, subtotal + iva - descuento);
  };

  const calcularSaldoAFavorUsado = () => {
    if (!nuevaVenta.usarSaldoAFavor || !nuevaVenta.clienteId) return 0;
    const subtotal = calcularSubtotal();
    const iva = calcularIva(subtotal);
    const descuento = calcularDescuento(subtotal);
    const totalSinSaldo = subtotal + iva - descuento;
    const saldoDisponible = clientesDisponibles.find(c => c.id === Number(nuevaVenta.clienteId))?.saldoAFavor || 0;
    return Math.min(totalSinSaldo, saldoDisponible);
  };

  const calcularIva = (subtotal: number) => {
    return 0;
  };

  useEffect(() => {
    if (nuevaVenta.metodoPago === 'Saldo') {
      if (!canUseSaldoPago()) {
        setNuevaVenta(prev => ({ ...prev, metodoPago: '', usarSaldoAFavor: false }));
      }
    }
  }, [nuevaVenta.clienteId, nuevaVenta.productos, serviciosAgregados, nuevaVenta.porcentajeDescuento]);

  const agregarProducto = () => {
    if (!productoSeleccionado || cantidadProducto <= 0) {
      setShowAddProductoErrors(true);
      setVentaValidationAttempt((prev) => prev + 1);
      return;
    }

    // Buscar en productos cargados de la API
    const producto = productosAPI.find(p => p.id.toString() === productoSeleccionado);
    if (!producto) {
      setShowAddProductoErrors(true);
      setVentaValidationAttempt((prev) => prev + 1);
      return;
    }

    const productosActuales = nuevaVenta.productos || [];

    // VALIDACIÓN DE STOCK DEFINITIVA
    if (isStockExceeded) {
      setVentaValidationAttempt((prev) => prev + 1);
      return; // No permitimos agregar si excede stock
    }

    const existeProducto = productosActuales.find(p => p.id === producto.id.toString());

    if (existeProducto) {
      const cantidadActualizada = existeProducto.cantidad + cantidadProducto;

      setNuevaVenta({
        ...nuevaVenta,
        productos: productosActuales.map(p =>
          p.id === producto.id.toString()
            ? { ...p, cantidad: cantidadActualizada }
            : p
        )
      });
      setTarjetaProductoInputs((prev) => ({
        ...prev,
        [producto.id.toString()]: {
          ...prev[producto.id.toString()],
          cantidad: String(cantidadActualizada)
        }
      }));
    } else {

      setNuevaVenta({
        ...nuevaVenta,
        productos: [...productosActuales, {
          id: producto.id.toString(),
          nombre: producto.nombre,
          cantidad: cantidadProducto,
          precio: producto.precio || producto.precioBase,
          imagen: (producto as ApiProducto).imagenProduc || ''
        }]
      });
      setTarjetaProductoInputs((prev) => ({
        ...prev,
        [producto.id.toString()]: {
          cantidad: String(cantidadProducto),
          precio: String(producto.precio || producto.precioBase)
        }
      }));
    }

    setProductoSeleccionado('');
    setCantidadProducto(0);
    setCantidadProductoInput('');
    setShowAddProductoErrors(false);
    setShowVentaFormErrors(false);
  };

  const eliminarProducto = (productId: string) => {
    const productosActuales = nuevaVenta.productos || [];
    setNuevaVenta({
      ...nuevaVenta,
      productos: productosActuales.filter(p => p.id !== productId)
    });
    setTarjetaProductoInputs((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const actualizarCantidadProducto = (productId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;

    // VALIDACIÓN DE STOCK
    const productoInfo = productosAPI.find(p => p.id.toString() === productId);
    if (productoInfo && nuevaCantidad > productoInfo.stockVentas) {
      showErrorAlert("Stock insuficiente", `No se puede añadir una cantidad superior al stock disponible (${productoInfo.stockVentas}).`);

      // Si excedió el stock, revertimos el input visual a la cantidad anterior
      const cantAnterior = nuevaVenta.productos?.find(p => p.id === productId)?.cantidad || 1;
      setTarjetaProductoInputs((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          cantidad: String(cantAnterior)
        }
      }));
      return;
    }

    const productosActuales = nuevaVenta.productos || [];
    setNuevaVenta({
      ...nuevaVenta,
      productos: productosActuales.map(p =>
        p.id === productId ? { ...p, cantidad: nuevaCantidad } : p
      )
    });
    setTarjetaProductoInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        cantidad: String(nuevaCantidad)
      }
    }));
  };

  const actualizarPrecioProducto = (productId: string, nuevoPrecio: number) => {
    if (nuevoPrecio < 0) return;
    const productosActuales = nuevaVenta.productos || [];
    setNuevaVenta({
      ...nuevaVenta,
      productos: productosActuales.map(p =>
        p.id === productId ? { ...p, precio: nuevoPrecio } : p
      )
    });
    setTarjetaProductoInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        precio: String(nuevoPrecio)
      }
    }));
  };

  const agregarServicio = () => {
    if (!servicioSeleccionado) {
      setShowAddServicioErrors(true);
      setVentaValidationAttempt((prev) => prev + 1);
      return;
    }

    let precioServicio = 0;
    let servicioId = '';
    let imagenServicio = '';

    // Verificar si es un paquete
    if (servicioSeleccionado.startsWith('[PAQUETE] ')) {
      const nombreReal = servicioSeleccionado.replace('[PAQUETE] ', '');
      const paquete = paquetes.find(p => p.nombre === nombreReal);
      if (paquete && paquete.precio) {
        precioServicio = paquete.precio;
        servicioId = `PAQ-${paquete.id}`;
        imagenServicio = String((paquete as any)?.imagen || (paquete as any)?.imagenUrl || '');
      }
    } else {
      // Es un servicio normal
      const servicio = servicios.find(s => s.nombre === servicioSeleccionado);
      if (servicio && servicio.precio) {
        precioServicio = servicio.precio;
        servicioId = `SERV-${servicio.id}`;
        imagenServicio = String((servicio as any)?.imagen || (servicio as any)?.imagenServicio || (servicio as any)?.imagenUrl || '');
      } else {
        // Fallback para servicios sin precio
        const preciosFallback: { [key: string]: number } = {
          "Corte Clásico": 25000,
          "Barba Completa": 20000,
          "Corte + Barba": 40000,
          "Tinte Cabello": 80000,
          "Tratamiento Capilar": 35000
        };
        precioServicio = preciosFallback[servicioSeleccionado] || 0;
        servicioId = `SERVPERS-${Date.now()}`;
      }
    }

    const existente = serviciosAgregados.find(s => s.nombre === servicioSeleccionado);
    if (existente) {
      const cantidadActualizada = existente.cantidad + 1;
      setServiciosAgregados(serviciosAgregados.map(s =>
        s.nombre === servicioSeleccionado ? { ...s, cantidad: cantidadActualizada } : s
      ));
      setTarjetaServicioInputs((prev) => ({
        ...prev,
        [existente.id]: {
          ...prev[existente.id],
          cantidad: String(cantidadActualizada)
        }
      }));
    } else {
      const nuevoId = servicioId || `SERVPERS-${Date.now()}`;
      setServiciosAgregados([
        ...serviciosAgregados,
        {
          id: nuevoId,
          nombre: servicioSeleccionado,
          precio: precioServicio,
          cantidad: 1,
          imagen: imagenServicio
        }
      ]);
      setTarjetaServicioInputs((prev) => ({
        ...prev,
        [nuevoId]: {
          cantidad: '1',
          precio: String(precioServicio)
        }
      }));
    }

    setServicioSeleccionado('');
    setShowAddServicioErrors(false);
    setShowVentaFormErrors(false);
  };

  const eliminarServicio = (servicioId: string) => {
    setServiciosAgregados(serviciosAgregados.filter(s => s.id !== servicioId));
    setTarjetaServicioInputs((prev) => {
      const next = { ...prev };
      delete next[servicioId];
      return next;
    });
  };

  const actualizarPrecioServicio = (servicioId: string, nuevoPrecio: number) => {
    setServiciosAgregados(serviciosAgregados.map(s =>
      s.id === servicioId ? { ...s, precio: Math.max(0, nuevoPrecio) } : s
    ));
    setTarjetaServicioInputs((prev) => ({
      ...prev,
      [servicioId]: {
        ...prev[servicioId],
        precio: String(Math.max(0, nuevoPrecio))
      }
    }));
  };

  const actualizarCantidadServicio = (servicioId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    setServiciosAgregados(serviciosAgregados.map(s =>
      s.id === servicioId ? { ...s, cantidad: nuevaCantidad } : s
    ));
    setTarjetaServicioInputs((prev) => ({
      ...prev,
      [servicioId]: {
        ...prev[servicioId],
        cantidad: String(nuevaCantidad)
      }
    }));
  };

  const getTarjetaProductoInput = (productId: string, campo: 'cantidad' | 'precio', fallback: number) => {
    const visual = tarjetaProductoInputs[productId]?.[campo];
    if (visual !== undefined) return visual;
    return fallback > 0 ? String(fallback) : '';
  };

  const onTarjetaProductoInputChange = (productId: string, campo: 'cantidad' | 'precio', valor: string) => {
    setTarjetaProductoInputs((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [campo]: valor
      }
    }));
    if (valor.trim() === '') return;
    const n = Number(valor);
    if (Number.isNaN(n)) return;
    if (campo === 'cantidad') actualizarCantidadProducto(productId, Math.max(1, Math.floor(n)));
    if (campo === 'precio') actualizarPrecioProducto(productId, Math.max(0, n));
  };

  const getTarjetaServicioInput = (servicioId: string, campo: 'cantidad' | 'precio', fallback: number) => {
    const visual = tarjetaServicioInputs[servicioId]?.[campo];
    if (visual !== undefined) return visual;
    return fallback > 0 ? String(fallback) : '';
  };

  const onTarjetaServicioInputChange = (servicioId: string, campo: 'cantidad' | 'precio', valor: string) => {
    setTarjetaServicioInputs((prev) => ({
      ...prev,
      [servicioId]: {
        ...prev[servicioId],
        [campo]: valor
      }
    }));
    if (valor.trim() === '') return;
    const n = Number(valor);
    if (Number.isNaN(n)) return;
    if (campo === 'cantidad') actualizarCantidadServicio(servicioId, Math.max(1, Math.floor(n)));
    if (campo === 'precio') actualizarPrecioServicio(servicioId, Math.max(0, n));
  };

  // Función para abrir el diálogo de detalles
  const handleViewDetails = async (venta: Venta) => {
    try {
      setLoadingDetails(true);
      setIsDetailDialogOpen(true);
      setSelectedVenta(venta); // Mostrar datos básicos mientras carga

      // Cargar detalles completos de la venta
      const ventaConDetalles = await ventaService.getVentaById(venta.id);
      if (ventaConDetalles) {
        // Optimización: Crear mapas de clientes una sola vez
        const clientesById = new Map<number, any>();
        const clientesByDocumento = new Map<string, any>();
        clientesCatalogo.forEach((c: any) => {
          const idNum = Number(c?.id ?? c?.Id);
          if (!Number.isNaN(idNum) && idNum > 0) clientesById.set(idNum, c);
          const doc = String(c?.documento ?? c?.Documento ?? '').trim();
          if (doc) clientesByDocumento.set(doc, c);
        });

        const ventaEnriquecida = enriquecerVentaConClienteOptimizado(ventaConDetalles, clientesById, clientesByDocumento);
        const barberoIdNum = Number((ventaEnriquecida as any).barberoId ?? (venta as any).barberoId ?? 0);
        let barberoNombreFinal = normalizeBarbero(ventaEnriquecida.barbero);
        if ((!barberoNombreFinal || barberoNombreFinal === 'Sin asignar') && barberoIdNum > 0) {
          const b = barberosAPI.find((u: any) => Number(u.id) === barberoIdNum);
          if (b) {
            barberoNombreFinal = `${b.nombre} ${b.apellido || ''}`.trim();
          }
        }
        setSelectedVenta({
          ...ventaEnriquecida,
          barbero: barberoNombreFinal,
          // Fallback: si el endpoint de detalle no trae productos/servicios, conservar los ya cargados en la tabla.
          productosDetalle: (ventaEnriquecida.productosDetalle && ventaEnriquecida.productosDetalle.length > 0)
            ? ventaEnriquecida.productosDetalle
            : (venta.productosDetalle || []),
          serviciosDetalle: (ventaEnriquecida.serviciosDetalle && ventaEnriquecida.serviciosDetalle.length > 0)
            ? ventaEnriquecida.serviciosDetalle
            : (venta.serviciosDetalle || [])
        });
      } else {
        showErrorAlert("Error al cargar detalles", "No se pudieron cargar los detalles de la venta.");
      }
    } catch (error: any) {
      console.error('Error cargando detalles de venta:', error);
      showErrorAlert("Error al cargar detalles", "Error al cargar los detalles de la venta.");
      // Si falla, mantener los datos básicos que tenemos
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateVenta = async () => {
    setShowVentaFormErrors(true);
    setVentaValidationAttempt((prev) => prev + 1);

    if (!user || !user.id) {
      showErrorAlert("Error de sesión", "No se ha identificado el usuario responsable. Por favor inicie sesión nuevamente.");
      return;
    }

    const productosActuales = nuevaVenta.productos || [];
    const tieneServicios = serviciosAgregados.length > 0;

    if (nuevaVenta.clienteId === null || !nuevaVenta.metodoPago) {
      showErrorAlert("Datos incompletos", "Por favor completa el cliente y el método de pago.");
      return;
    }

    if (productosActuales.length === 0 && !tieneServicios) {
      showErrorAlert("Venta vacía", "Debes agregar al menos un producto o un servicio a la venta.");
      return;
    }

    // Validar Barbero estrictamente si hay servicios
    if (tieneServicios) {
      if (!nuevaVenta.barberoId || Number(nuevaVenta.barberoId) <= 0) {
        showErrorAlert("Barbero requerido", "El barbero es obligatorio cuando se agregan servicios. Por favor selecciona un barbero válido.");
        return;
      }
    }

    // Validar que los productos tengan IDs válidos
    const productosInvalidos = productosActuales.filter(p => !p.id || isNaN(Number(p.id)));
    if (productosInvalidos.length > 0) {
      console.error('❌ Productos con IDs inválidos:', productosInvalidos);
      showErrorAlert("Productos inválidos", `${productosInvalidos.length} producto(s) tienen IDs inválidos.`);
      return;
    }

    // Validar que haya al menos un detalle válido después del filtrado
    const serviciosValidos = tieneServicios
      ? serviciosAgregados.filter((servicioAgregado) => {
        return (
          typeof servicioAgregado.id === 'string' &&
          (servicioAgregado.id.startsWith('SERV-') || servicioAgregado.id.startsWith('PAQ-'))
        );
      })
      : [];

    if (productosActuales.length === 0 && serviciosValidos.length === 0) {
      showErrorAlert("Venta inválida", "Debes agregar al menos un producto o servicio válido a la venta.");
      return;
    }

    try {
      // Use the already calculated numeroVenta from component level
      const subtotal = calcularSubtotal();
      const iva = calcularIva(subtotal);
      const descuento = calcularDescuento(subtotal);

      // Calcular el monto usado de saldo a favor si aplica
      let montoSaldoUsado = 0;
      if (nuevaVenta.usarSaldoAFavor && nuevaVenta.clienteId) {
        const clienteSel = clientesDisponibles.find(c => c.id === Number(nuevaVenta.clienteId));
        const saldoDisponible = clienteSel?.saldoAFavor || 0;
        const totalSinSaldo = subtotal + iva - descuento;
        montoSaldoUsado = Math.min(totalSinSaldo, saldoDisponible);
      }

      // El total a pagar debe disminuir si se usa saldo a favor
      const total = calcularTotal() - montoSaldoUsado;

      const productosTexto = productosActuales.length > 0
        ? productosActuales.map(p => `${p.nombre} (x${p.cantidad})`).join(', ')
        : 'Ninguno';

      const serviciosTexto = tieneServicios
        ? serviciosAgregados.map(s => `${s.nombre} (x${s.cantidad})`).join(', ')
        : 'Ninguno';

      const clienteSeleccionado = clientesDisponibles.find(c => c.id === Number(nuevaVenta.clienteId));
      const barberoSeleccionadoData = nuevaVenta.barberoId
        ? barberosAPI.find(b => b.id === Number(nuevaVenta.barberoId))
        : null;

      const metodoPagoFinal = (nuevaVenta.metodoPago === 'Saldo')
        ? 'Saldo'
        : (nuevaVenta.usarSaldoAFavor ? `${nuevaVenta.metodoPago} (Saldo aplicado)` : nuevaVenta.metodoPago);
      // Convertir explícitamente el barberoId a número antes de enviarlo
      const barberoIdFinal = nuevaVenta.barberoId ? Number(nuevaVenta.barberoId) : null;

      const ventaData = {
        numeroVenta,
        tipoVenta: nuevaVenta.tipoVenta,
        clienteId: nuevaVenta.clienteId,
        usuarioId: Number(user.id),
        clienteDocumento: nuevaVenta.clienteDocumento || '',
        fecha: nuevaVenta.fechaCreacion,
        servicios: serviciosTexto,
        productos: productosTexto,
        subtotal: subtotal,
        iva: 0,
        descuento: descuento,
        total: total,
        saldoAFavorUsado: montoSaldoUsado,
        barberoId: barberoIdFinal, // Usar el valor convertido
        barberoNombre: nuevaVenta.barberoNombre || 'Sin asignar',
        estado: 'Completada',
        metodoPago: metodoPagoFinal,
        garantiaMeses: nuevaVenta.garantiaMeses,
        productosDetalle: productosActuales,
        serviciosDetalle: tieneServicios
          ? serviciosAgregados.map((servicioAgregado) => ({
            id: servicioAgregado.id,
            nombre: servicioAgregado.nombre.startsWith('[PAQUETE] ')
              ? servicioAgregado.nombre.replace('[PAQUETE] ', '')
              : servicioAgregado.nombre,
            precio: servicioAgregado.precio,
            cantidad: servicioAgregado.cantidad
          }))
          : []
      };

      console.log('🔍 VentasPage - ventaData before service call:', ventaData);

      const nuevaVentaCreada = await ventaService.createVenta(ventaData);

      // Restar stock de los productos vendidos
      for (const p of productosActuales) {
        await productoService.adjustStock(Number(p.id), p.cantidad, 'decrement', 'ventas');
      }

      // Ajustar saldo a favor localmente si se usó
      if (nuevaVenta.usarSaldoAFavor && nuevaVenta.clienteId) {
        const clienteSel = clientesDisponibles.find(c => c.id === Number(nuevaVenta.clienteId));
        const saldoDisponible = clienteSel?.saldoAFavor || 0;
        const totalSinSaldo = subtotal + 0 - descuento;
        const montoUsado = Math.min(totalSinSaldo, saldoDisponible);
        if (montoUsado > 0) {
          let persistOk = true;
          // Crear un registro de "consumo de saldo" como devolución negativa para persistir el ajuste
          try {
            await devolucionService.createDevolucion({
              ventaId: Number(nuevaVentaCreada.id || nuevaVentaCreada.numeroVenta || numeroVenta),
              productoId: (productosActuales[0]?.id ? Number(productosActuales[0].id) : 0),
              servicioId: undefined,
              clienteId: Number(nuevaVenta.clienteId),
              cantidad: 0,
              motivoCategoria: 'ConsumoSaldo',
              motivoDetalle: `Consumo de saldo por venta ${nuevaVentaCreada.numeroVenta || numeroVenta}`,
              montoDevuelto: 0,
              saldoAFavor: -Math.abs(montoUsado),
              usuarioId: Number(user.id),
              observaciones: 'Ajuste automático al usar saldo a favor en venta'
            });
          } catch (e) {
            console.warn('No se pudo registrar consumo de saldo a favor en devoluciones:', e);
            persistOk = false;
          }
          setClientesAPI(prev => prev.map((c: any) => {
            if (Number(c.id) === Number(nuevaVenta.clienteId)) {
              const nuevoSaldo = Math.max(0, Number((c as any).saldoAFavor || 0) - montoUsado);
              return { ...c, saldoAFavor: nuevoSaldo };
            }
            return c;
          }));
          // Recargar datos; si la persistencia falló, re-aplicar el ajuste local después de recargar
          await cargarVentas();
          if (!persistOk) {
            setClientesAPI(prev => prev.map((c: any) => {
              if (Number(c.id) === Number(nuevaVenta.clienteId)) {
                const nuevoSaldo = Math.max(0, Number((c as any).saldoAFavor || 0) - montoUsado);
                return { ...c, saldoAFavor: nuevoSaldo };
              }
              return c;
            }));
          }
        }
      }
      // Recargar datos generales si no se recargó arriba
      if (!(nuevaVenta.usarSaldoAFavor && nuevaVenta.clienteId)) {
        await cargarVentas();
      }

      // Si la API no expande relaciones al crear, preservar datos visibles del formulario
      const ventaConFallback = {
        ...nuevaVentaCreada,
        cliente:
          normalizeCliente(nuevaVentaCreada.cliente) === 'Cliente'
            ? (clienteSeleccionado?.nombre || normalizeCliente(nuevaVentaCreada.cliente))
            : nuevaVentaCreada.cliente,
        clienteDocumento:
          (nuevaVentaCreada.clienteDocumento && String(nuevaVentaCreada.clienteDocumento).trim() !== '')
            ? nuevaVentaCreada.clienteDocumento
            : (clienteSeleccionado?.documento || ''),
        barbero:
          (nuevaVenta.barberoId === null || nuevaVenta.barberoId === undefined)
            ? 'Sin asignar'
            : (
              normalizeBarbero(nuevaVentaCreada.barbero) === 'Sin asignar'
                ? (barberoSeleccionadoData ? `${barberoSeleccionadoData.nombre} ${barberoSeleccionadoData.apellido || ''}`.trim() : 'Sin asignar')
                : nuevaVentaCreada.barbero
            )
      };

      // Actualizar el estado local con la nueva venta
      setVentas([ventaConFallback, ...ventas]);

      // Resetear formulario
      setNuevaVenta({
        ...inicialNuevaVenta,
        fechaCreacion: generateCurrentDate(),
      });
      setCantidadProducto(0);
      setCantidadProductoInput('');
      setPorcentajeDescuentoInput('');
      setTarjetaProductoInputs({});
      setTarjetaServicioInputs({});
      setServiciosAgregados([]);
      setBarberoSearchTerm('');
      setShowBarberoResults(false);
      setBarberoSearchFocused(false);
      setIsDialogOpen(false);

      const ventaIdCreada = Number((nuevaVentaCreada as any)?.id ?? (nuevaVentaCreada as any)?.numeroVenta ?? 0);
      created("Venta creada ✔️", `La venta #${ventaIdCreada > 0 ? ventaIdCreada : numeroVenta} ha sido registrada exitosamente por ${formatCurrency(total)}.`);
    } catch (error: any) {
      console.error('Error creando venta:', error);
      const errorMessage = error?.message || 'Error desconocido al crear la venta';
      showErrorAlert("Error al crear la venta", errorMessage);
    }
  };

  const handleAnularVenta = (ventaId: number) => {
    setVentas(ventas.map(venta =>
      venta.id === ventaId
        ? { ...venta, estado: "Anulada" }
        : venta
    ));
    deleted("Venta anulada ✔️", `La venta ${ventaId} ha sido anulada exitosamente. El estado se ha actualizado en el sistema.`);
  };

  const handleToggleEstado = async (venta: Venta) => {
    // Solo permitir cambios entre "Completada" y "Anulada"
    // Si la venta está anulada, no se puede cambiar a completada
    if (venta.estado === 'Anulada') {
      showErrorAlert("No se puede reactivar", "No es posible activar una venta anulada. Una vez anulada, una venta no puede ser reactivada por políticas de seguridad.");
      return;
    }

    // Solo permitir cambiar de "Completada" a "Anulada"
    const nuevoEstado = 'Anulada';
    const accion = 'anular';

    const clienteStr = normalizeCliente(venta.cliente);
    confirmEditAction(
      `${venta.numeroVenta} - ${clienteStr}`,
      async () => {
        try {
          await ventaService.anularVenta(venta.id);

          // Revertir el stock de los productos vendidos
          if (venta.productosDetalle && Array.isArray(venta.productosDetalle)) {
            for (const p of venta.productosDetalle) {
              const pId = Number((p as any).id || (p as any).productoId || (p as any).ProductoId);
              if (!isNaN(pId)) {
                await productoService.adjustStock(pId, p.cantidad, 'increment', 'ventas');
              }
            }
          }

          // Restaurar saldo a favor si esta venta había consumido saldo (anular devoluciones negativas ligadas a la venta)
          try {
            const devs = await devolucionService.getDevoluciones();
            const consumoDevs = (devs || []).filter((d: any) => {
              const estado = String(d.estado || '').toLowerCase();
              const esEstadoValido = estado === 'completada' || estado === 'activo' || estado === 'procesado';
              return Number(d.ventaId) === Number(venta.id) && Number(d.saldoAFavor) < 0 && esEstadoValido;
            });
            let montoRestaurado = 0;
            for (const d of consumoDevs) {
              await devolucionService.updateDevolucionStatus(Number(d.id), 'Anulado');
              montoRestaurado += Math.abs(Number(d.saldoAFavor) || 0);
            }
            if (montoRestaurado > 0 && venta.clienteId) {
              setClientesAPI(prev => prev.map((c: any) => {
                if (Number(c.id) === Number(venta.clienteId)) {
                  const nuevoSaldo = Number((c as any).saldoAFavor || 0) + montoRestaurado;
                  return { ...c, saldoAFavor: nuevoSaldo };
                }
                return c;
              }));
            }
          } catch (e) {
            console.warn('No se pudo restaurar saldo a favor asociado a la venta anulada:', e);
          }

          // Actualizar estado local
          setVentas(prev => prev.map(v =>
            v.id === venta.id
              ? { ...v, estado: nuevoEstado }
              : v
          ));
          // Recargar datos para recalcular saldos
          cargarVentas();

          edited("Venta anulada ✔️", `La venta ${venta.numeroVenta} ha sido anulada exitosamente.`);
        } catch (error: any) {
          console.error('Error anulando venta:', error);
          showErrorAlert("Error al anular", "No se pudo anular la venta. Intenta nuevamente.");
        }
      },
      {
        confirmTitle: `Confirmar ${accion.charAt(0).toUpperCase() + accion.slice(1)} Venta`,
        confirmMessage: `¿Estás seguro de que deseas ${accion} la venta "${venta.numeroVenta}" del cliente "${clienteStr}"?`,
        successTitle: `¡Venta ${nuevoEstado.toLowerCase()}a exitosamente!`,
        successMessage: `La venta ha sido ${nuevoEstado.toLowerCase()}ada correctamente en el sistema.`,
        requireInput: false
      }
    );
  };

  const generateVentaPDF = async (venta: any) => {
    let ventaData = venta;
    try {
      const noTieneDetalles =
        !(Array.isArray(venta?.productosDetalle) && venta.productosDetalle.length > 0) &&
        !(Array.isArray(venta?.serviciosDetalle) && venta.serviciosDetalle.length > 0);
      if (noTieneDetalles && Number(venta?.id) > 0) {
        const ventaDetallada = await ventaService.getVentaById(Number(venta.id));
        if (ventaDetallada) {
          ventaData = {
            ...venta,
            ...ventaDetallada,
            productosDetalle:
              (ventaDetallada.productosDetalle && ventaDetallada.productosDetalle.length > 0)
                ? ventaDetallada.productosDetalle
                : (venta.productosDetalle || []),
            serviciosDetalle:
              (ventaDetallada.serviciosDetalle && ventaDetallada.serviciosDetalle.length > 0)
                ? ventaDetallada.serviciosDetalle
                : (venta.serviciosDetalle || []),
          };
        }
      }
    } catch (e) {
      console.warn('No se pudieron cargar los detalles completos de la venta para el PDF:', e);
    }
    try {
      const jsPDF = (await import("jspdf")).default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const hMargin = 20;

      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 65, "F");

      try {
        doc.addImage(manitoLogo, "JPEG", pageWidth / 2 - 12.5, 5, 25, 25);
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
      doc.text("Comprobante de Venta", pageWidth / 2, 48, { align: "center" });

      doc.setFillColor(216, 176, 129);
      doc.roundedRect(pageWidth / 2 - 25, 52, 50, 7, 3.5, 3.5, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const ventaId = String((ventaData as any).numeroVenta || ventaData.id || "N/A");
      doc.text(`VENTA #${ventaId}`, pageWidth / 2, 56.5, { align: "center" });

      let y = 80;
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMACIÓN GENERAL", hMargin, y);

      doc.setDrawColor(216, 176, 129);
      doc.setLineWidth(0.5);
      doc.line(hMargin, y + 2, 85, y + 2);

      const fechaRegistro = formatDate((ventaData as any).fecha || "");
      const responsableVenta = normalizeBarbero((ventaData as any).barbero);
      const clienteIdVenta = Number((ventaData as any).clienteId || 0);
      const clienteDocumentoVenta = String((ventaData as any).clienteDocumento || "").trim();
      const clienteNombreVenta = normalizeCliente((ventaData as any).cliente);
      const clientesFuente = (clientesCatalogo?.length ? clientesCatalogo : clientesAPI) || [];
      const clienteMatch = clientesFuente.find((c: any) => {
        const idMatch = !Number.isNaN(clienteIdVenta) && clienteIdVenta > 0 && Number(c?.id) === clienteIdVenta;
        if (idMatch) return true;
        if (!clienteDocumentoVenta) return false;
        const docCatalogo = String(c?.documento || "").trim();
        return docCatalogo !== "" && (docCatalogo === clienteDocumentoVenta || docCatalogo.endsWith(clienteDocumentoVenta) || clienteDocumentoVenta.endsWith(docCatalogo));
      });
      const clienteNombreCatalogo = `${String(clienteMatch?.nombre || "").trim()} ${String(clienteMatch?.apellido || "").trim()}`.trim();
      const clienteDocumentoCatalogo = String(clienteMatch?.documento || "").trim();
      const clienteTipoDocumentoCatalogo = String((clienteMatch as any)?.tipoDocumento || "").trim();
      const clienteNombreEsGenerico =
        !clienteNombreVenta ||
        ["cliente", "n/a", "na", "sin cliente", "null", "undefined"].includes(clienteNombreVenta.toLowerCase()) ||
        /^cliente\s*\d*$/i.test(clienteNombreVenta);
      const clienteNombreFinal = (clienteNombreEsGenerico ? clienteNombreCatalogo : clienteNombreVenta) || clienteNombreCatalogo || "Cliente";
      const parseDocumento = (docRaw: string) => {
        const value = String(docRaw || "").trim().replace(/\s+/g, " ");
        if (!value) return { tipo: "", numero: "" };
        const match = value.match(/^([A-Za-z\.]+)\s+(.+)$/);
        if (match) {
          return { tipo: String(match[1] || "").trim(), numero: String(match[2] || "").trim() };
        }
        return { tipo: "", numero: value };
      };
      const normalizeTipoDocumento = (tipoRaw: string) => {
        const tipo = String(tipoRaw || "").toUpperCase().replace(/\./g, "").trim();
        const map: Record<string, string> = {
          CC: "C.C.",
          CE: "C.E.",
          TI: "T.I.",
          NIT: "N.I.T.",
          RC: "R.C.",
          PP: "P.P."
        };
        return map[tipo] || "";
      };
      const docFuente = clienteDocumentoVenta || clienteDocumentoCatalogo;
      const docParsed = parseDocumento(docFuente);
      const tipoFromParsed = normalizeTipoDocumento(docParsed.tipo);
      const tipoFromCatalog = normalizeTipoDocumento(clienteTipoDocumentoCatalogo);
      const tipoDocumentoFinal = tipoFromParsed || tipoFromCatalog;
      const numeroDocumentoFinal = docParsed.numero || "N/A";
      const documentoFormateado = tipoDocumentoFinal ? `${tipoDocumentoFinal} ${numeroDocumentoFinal}` : numeroDocumentoFinal;
      const clienteDisplay = `${clienteNombreFinal} - ${documentoFormateado}`;

      y += 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("N. de venta:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String((ventaData as any).id ?? "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Cliente:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(clienteDisplay, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Fecha y Hora:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(fechaRegistro, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Estado:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String((ventaData as any).estado || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Responsable:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(responsableVenta || "N/A", hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Método Pago:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String((ventaData as any).metodoPago || "N/A"), hMargin + 40, y);

      const productosDetalle = Array.isArray((ventaData as any).productosDetalle) ? (ventaData as any).productosDetalle : [];
      const serviciosDetalle = Array.isArray((ventaData as any).serviciosDetalle) ? (ventaData as any).serviciosDetalle : [];
      const detalles = [
        ...productosDetalle.map((item: any) => ({
          nombre: String(item?.nombre || "Producto"),
          tipo: "Producto",
          cantidad: Number(item?.cantidad || 1),
          precioUnitario: Number(item?.precio || 0)
        })),
        ...serviciosDetalle.map((item: any) => ({
          nombre: String(item?.nombre || "Servicio"),
          tipo: "Servicio",
          cantidad: Number(item?.cantidad || 1),
          precioUnitario: Number(item?.precio || 0)
        }))
      ];

      const totalItems = detalles.reduce((sum, d) => sum + Number(d.cantidad || 0), 0);
      const subtotalNum = Number((ventaData as any).subtotal || 0);
      const ivaNum = Number((ventaData as any).iva || 0);
      const descuentoNum = Number((ventaData as any).descuento || 0);
      const totalNum = Number((ventaData as any).total || subtotalNum + ivaNum - descuentoNum);

      y += 15;
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE ÍTEMS", hMargin, y);
      doc.line(hMargin, y + 2, 80, y + 2);

      y += 12;
      doc.setFillColor(26, 26, 26);
      doc.rect(hMargin, y, pageWidth - (hMargin * 2), 10, "F");
      doc.setTextColor(216, 176, 129);
      doc.setFontSize(9);
      doc.text("ITEM", hMargin + 2, y + 6.5);
      doc.text("TIPO", hMargin + 75, y + 6.5);
      doc.text("CANT.", hMargin + 105, y + 6.5, { align: "right" });
      doc.text("PREC. UNIT", hMargin + 133, y + 6.5, { align: "right" });
      doc.text("SUBTOTAL", hMargin + 160, y + 6.5, { align: "right" });

      y += 10;
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");

      if (detalles.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.text("No hay detalles disponibles para esta venta.", pageWidth / 2, y + 10, { align: "center" });
      } else {
        detalles.forEach((item, index) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }

          if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(hMargin, y, pageWidth - (hMargin * 2), 8, "F");
          }

          const nombreTruncado = item.nombre.length > 42 ? `${item.nombre.substring(0, 39)}...` : item.nombre;
          const subtotal = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);

          doc.setFontSize(8);
          doc.text(nombreTruncado, hMargin + 2, y + 5.5);
          doc.text(item.tipo, hMargin + 75, y + 5.5);
          doc.setFont("helvetica", "bold");
          doc.text(String(item.cantidad), hMargin + 105, y + 5.5, { align: "right" });
          doc.setFont("helvetica", "normal");
          doc.text(`$${formatCurrency(item.precioUnitario)}`, hMargin + 133, y + 5.5, { align: "right" });
          doc.setFont("helvetica", "bold");
          doc.text(`$${formatCurrency(subtotal)}`, hMargin + 160, y + 5.5, { align: "right" });
          doc.setFont("helvetica", "normal");

          y += 8;
        });
      }

      y += 8;
      if (y > 258) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(hMargin, y, pageWidth - (hMargin * 2), 24, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`TOTAL ÍTEMS: ${totalItems}`, pageWidth / 2, y + 7, { align: "center" });
      doc.text(`DESCUENTO: $ ${formatCurrency(descuentoNum)}`, pageWidth / 2, y + 13, { align: "center" });
      doc.setFontSize(14);
      doc.setTextColor(216, 176, 129);
      doc.text(`TOTAL: $ ${formatCurrency(totalNum)}`, pageWidth / 2, y + 20, { align: "center" });

      y = Math.max(275, y + 30);
      doc.setDrawColor(216, 176, 129);
      doc.line(hMargin, y, pageWidth - hMargin, y);

      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Documento generado automáticamente el ${new Date().toLocaleString("es-CO")}`, pageWidth / 2, y, { align: "center" });
      doc.text("MANITO BARBERSHOP - Sistema de Gestión de Ventas", pageWidth / 2, y + 4, { align: "center" });

      const fileName = `Reporte_Venta_${(ventaData as any).numeroVenta || ventaData.id}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      created("PDF generado ✔️", `La factura de la venta ${ventaData.id} fue descargada correctamente.`);
    } catch (error) {
      console.error("Error generando PDF de venta:", error);
      showErrorAlert("Error al generar PDF", "No se pudo generar el PDF de la venta.");
    }
  };

  const totalVentas = ventas.reduce((sum, venta) => sum + venta.total, 0);
  const ventasCompletadas = ventas.filter(v => v.estado === "Completada").length;
  const ventasHoy = ventas.filter(v => formatDate(v.fecha) === formatDate(new Date())).length;

  return (
    <>
      <main className="flex-1 overflow-auto bg-black-primary">
        {/* Estado de error */}
        {error && !loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-400 mb-4">
                <Ban className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-white-primary mb-2">Error al cargar las ventas</h3>
              <p className="text-sm text-gray-lightest mb-4">{error}</p>
              <button
                onClick={cargarVentas}
                className="elegante-button-primary"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        {!error && (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'none' }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="elegante-card text-center">
                <DollarSign className="w-8 h-8 text-orange-primary mx-auto mb-2" />
                <h4 className="text-2xl font-bold text-white-primary mb-1">${formatCurrency(totalVentas)}</h4>
                <p className="text-gray-lightest text-sm">Total Ventas</p>
              </div>
              <div className="elegante-card text-center">
                <ShoppingCart className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h4 className="text-2xl font-bold text-white-primary mb-1">{ventasCompletadas}</h4>
                <p className="text-gray-lightest text-sm">Completadas</p>
              </div>
              <div className="elegante-card text-center">
                <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h4 className="text-2xl font-bold text-white-primary mb-1">{ventasHoy}</h4>
                <p className="text-gray-lightest text-sm">Ventas Hoy</p>
              </div>
              <div className="elegante-card text-center">
                <Package className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h4 className="text-2xl font-bold text-white-primary mb-1">
                  ${formatCurrency(Math.round(totalVentas / ventas.length))}
                </h4>
                <p className="text-gray-lightest text-sm">Promedio</p>
              </div>
            </div>

            {/* Sección Principal */}
            <div className="elegante-card">
              <TableHeaderSection
                leftContent={(
                  <button
                    className="elegante-button-primary gap-2 flex items-center"
                    onClick={() => onNavigate?.("RegistrarVenta")}
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Venta
                  </button>
                )}
                searchValue={searchTerm}
                onSearchChange={handleSearchChange}
                searchPlaceholder="Buscar por cualquier campo de la tabla..."
                statusFilter={{
                  value: statusFilter,
                  onChange: (value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  },
                  options: [
                    { value: "all", label: "Todos" },
                    { value: "completada", label: "Completadas" },
                    { value: "anulada", label: "Anuladas" },
                  ],
                }}
                rightContent={(
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {barberoSeleccionado !== VALOR_TODOS_BARBEROS && (
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="px-3 py-1 rounded-full bg-gray-darker border border-gray-dark text-gray-lightest">
                          Total servicios:{" "}
                          <span className="text-orange-primary font-semibold">
                            ${formatCurrency(totalServiciosFiltrados)}
                          </span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-gray-darker border border-gray-dark text-gray-lightest">
                          60% Barbero:{" "}
                          <span className="text-green-400 font-semibold">
                            ${formatCurrency(totalBarbero)}
                          </span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-gray-darker border border-gray-dark text-gray-lightest">
                          40% Barbería:{" "}
                          <span className="text-blue-300 font-semibold">
                            ${formatCurrency(totalBarberia)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
                recordsText={`Mostrando ${displayedVentas.length} de ${filteredVentas.length} ventas`}
                recordsPlacement="left"
              />

              {/* Tabla de Ventas */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={loading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                    <tr className="border-b border-gray-dark">
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Número</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Documento Cliente</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Nombre Cliente</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Total</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Fecha de Registro</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableLoadingStateRow
                        colSpan={7}
                        title="Cargando ventas..."
                      />
                    ) : displayedVentas.length > 0 ? displayedVentas.map((venta) => (
                      <tr key={venta.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Hash className="w-4 h-4 text-orange-primary" />
                            <span className="text-gray-lighter">{String((venta as any).numeroVenta ?? venta.id)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="text-center">
                            <span className="text-gray-lighter">
                              {venta.clienteDocumento || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="text-center">
                            <span className="text-gray-lighter">
                              {normalizeCliente(venta.cliente)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-lighter font-bold">
                            ${(() => {
                              const sumDev = devoluciones
                                .filter((d) => {
                                  const motivoDet = String((d as any).motivoDetalle || '').toLowerCase();
                                  const motivoCat = String((d as any).motivo || (d as any).motivoCategoria || '').toLowerCase();
                                  const esConsumoSaldo = (motivoDet.includes('consumo') && motivoDet.includes('saldo')) || (motivoCat.includes('consumo') && motivoCat.includes('saldo'));
                                  const estado = String((d as any).estado || '').toLowerCase().trim();
                                  const noAnulada = estado !== 'anulada' && estado !== 'anulado';
                                  return Number((d as any).ventaId) === Number(venta.id) && noAnulada && !esConsumoSaldo;
                                })
                                .reduce((acc, d) => acc + (Number((d as any).monto) || 0), 0);
                              // Mostrar el mismo cálculo que "Subtotal Ajustado" del detalle:
                              // Subtotal - SaldoUsado - Monto Devuelto
                              const expSaldo = Number((venta as any).SaldoAFavorUsado ?? (venta as any).saldoAFavorUsado ?? (venta as any).SaldoAFavor ?? (venta as any).saldoAfavor ?? 0);
                              const saldoUsado = expSaldo > 0
                                ? expSaldo
                                : (() => {
                                  const should = (Number(venta.subtotal) || 0) + (Number((venta as any).iva) || 0) - (Number(venta.descuento) || 0);
                                  const diff = should - (Number(venta.total) || 0);
                                  return diff > 0.01 ? diff : 0;
                                })();
                              const listadoTotalAjustado = Math.max(0, (Number(venta.subtotal) || 0) - saldoUsado - sumDev);
                              return formatCurrency(listadoTotalAjustado);
                            })()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-lighter">{formatDate(venta.fecha)}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs ${getEstadoColor(venta.estado)}`}>
                            {venta.estado}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {venta.estado === 'Completada' && (
                              <button
                                onClick={() => handleToggleEstado(venta)}
                                className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                                title="Anular venta"
                              >
                                <Ban className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                              </button>
                            )}
                            {venta.estado === 'Anulada' && (
                              <button
                                onClick={() => handleToggleEstado(venta)}
                                className="p-2 hover:bg-gray-darker rounded-lg transition-colors group opacity-50 cursor-not-allowed"
                                title="No se puede reactivar una venta anulada"
                              >
                                <Ban className="w-4 h-4 text-gray-lightest" />
                              </button>
                            )}
                            <button
                              onClick={() => handleViewDetails(venta)}
                              className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                            </button>
                            <button
                              onClick={() => generateVentaPDF(venta)}
                              className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              title="Descargar PDF"
                            >
                              <FileDown className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <TableEmptyStateRow
                        colSpan={7}
                        title="No se encontraron ventas"
                        description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                        onReload={cargarVentas}
                      />
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación Funcional */}
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
          </>
        )}

        {/* Diálogo de Detalles de Venta */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto text-white-primary">
            {loadingDetails ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-white-primary flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-orange-primary" />
                    Cargando...
                  </DialogTitle>
                  <DialogDescription className="text-gray-lightest">
                    Por favor espera mientras cargamos los detalles.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-primary mx-auto mb-3"></div>
                    <p className="text-gray-lightest text-sm">Cargando detalles...</p>
                  </div>
                </div>
              </>
            ) : selectedVenta ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-white-primary flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-orange-primary" />
                    Detalle de Venta
                  </DialogTitle>
                  <DialogDescription className="text-gray-lightest">
                    Información registrada de la venta (solo lectura)
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-primary" />
                        Número de Venta
                      </Label>
                      <Input
                        value={String(selectedVenta.numeroVenta || selectedVenta.id).replace(/^(FV|VTA)-?/i, '')}
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
                        value={formatDate(selectedVenta.fecha)}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-primary" />
                        Cliente
                      </Label>
                      <Input
                        value={`${normalizeCliente(selectedVenta.cliente)}${selectedVenta.clienteDocumento ? ` (${selectedVenta.clienteDocumento})` : ''}`}
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
                        value={selectedVenta.metodoPago || 'N/A'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-primary" />
                        Tipo de Venta
                      </Label>
                      <Input
                        value={(selectedVenta as any).tipoVenta || (selectedVenta as any).TipoVenta || 'Venta directa'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-orange-primary" />
                        Barbero
                      </Label>
                      <Input
                        value={normalizeBarbero(selectedVenta.barbero)}
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
                        value={selectedVenta.subtotal > 0 ? ((selectedVenta.descuento / selectedVenta.subtotal) * 100).toFixed(2) : '0'}
                        disabled
                        className="elegante-input no-spin bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-primary" />
                        Responsable
                      </Label>
                      <Input
                        value={selectedVenta.responsable || 'N/A'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-orange-primary" />
                          Garantía
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(() => {
                          const diffDays = getRemainingWarrantyDays(selectedVenta.fecha, selectedVenta.garantiaMeses);
                          return (diffDays !== null && diffDays < 0)
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-green-500/10 text-green-500 border border-green-500/20';
                        })()
                          }`}>
                          {(() => {
                            const diffDays = getRemainingWarrantyDays(selectedVenta.fecha, selectedVenta.garantiaMeses);
                            if (diffDays === null) return '';
                            return diffDays < 0 ? `EXPIRADA (${Math.abs(diffDays)}d)` : `ACTIVA (${diffDays}d)`;
                          })()}
                        </span>
                      </Label>
                      <Input
                        value={
                          (selectedVenta.garantiaMeses ?? 0) <= 0
                            ? '15 días'
                            : selectedVenta.garantiaMeses === 1
                              ? '1 Mes'
                              : selectedVenta.garantiaMeses >= 12
                                ? `${selectedVenta.garantiaMeses / 12} Año(s)`
                                : `${selectedVenta.garantiaMeses} Meses`
                        }
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        Estado
                      </Label>
                      <div className="h-10 flex items-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(selectedVenta.estado)}`}>
                          {(selectedVenta.estado || '').toLowerCase().trim() === 'anulada' || (selectedVenta.estado || '').toLowerCase().trim() === 'anulado'
                            ? 'Anulada'
                            : 'Completada'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-white-primary">Productos y Servicios {devolucionesVentaActual.length > 0 ? '(Ajustado por Devoluciones)' : 'Agregados'}:</h4>
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {detalleItemsVenta.length > 0 ? (
                        detalleItemsVenta.map((detalle) => (
                          <div key={detalle.key} className={`bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 ${detalle.cantidadDevuelta > 0 ? 'border-yellow-500/40' : 'border-orange-primary/20'}`}>
                            <div className="flex items-center gap-4 flex-nowrap min-w-0">
                              <div className="shrink-0 w-6" aria-hidden />
                              <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                <ImageRenderer
                                  url={detalle.imageSrc}
                                  alt={detalle.nombre}
                                  className="w-full h-full border-0 bg-transparent"
                                />
                              </div>
                              <div className="min-w-0 flex-1 shrink flex items-center justify-center">
                                <span className="text-white-primary font-semibold text-base truncate block text-center w-full" title={detalle.nombre}>
                                  {detalle.nombre}
                                  <span className="ml-2 text-[11px] text-gray-lightest font-normal">({detalle.tipo})</span>
                                </span>
                              </div>

                              <div className="flex flex-col gap-0.5 shrink-0">
                                <label className="text-[11px] text-gray-400 font-normal">Cantidad</label>
                                <div className="flex items-center gap-1">
                                  <Input type="number" value={detalle.cantidad} disabled className="w-14 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-medium" />
                                  {detalle.cantidadDevuelta > 0 && (
                                    <span className="text-[10px] text-yellow-400" title={`Original: ${detalle.cantidadOriginal}, Devueltos: ${detalle.cantidadDevuelta}`}>
                                      (-{detalle.cantidadDevuelta})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-0.5 shrink-0">
                                <label className="text-[11px] text-gray-400 font-normal">Precio unit.</label>
                                <Input type="number" value={detalle.precio} disabled className="w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-medium" />
                              </div>

                              <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                                <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                                <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7">
                                  ${formatCurrency(detalle.subtotal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-gray-darker p-3 rounded-lg border border-gray-dark text-center">
                          <span className="text-gray-lightest">No hay detalles registrados para esta venta.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {devolucionesVentaActual.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-medium text-white-primary">Devoluciones Asociadas:</h4>
                        <span className="text-[11px] text-gray-lightest">
                          Total Devuelto: <span className="text-orange-primary font-semibold">${formatCurrency(totalMontoDevuelto)}</span>
                        </span>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {devolucionesVentaActual.map((dev) => (
                          <div key={`dev-${dev.id}`} className="bg-gray-darker rounded-lg px-3 py-2.5 border border-gray-dark">
                            <div className="flex items-center gap-4 flex-nowrap min-w-0">
                              <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                <ImageRenderer
                                  url={dev.productoImagen}
                                  alt={dev.producto}
                                  className="w-full h-full border-0 bg-transparent"
                                />
                              </div>
                              <div className="min-w-0 flex-1 shrink">
                                <span className="text-white-primary font-semibold text-sm truncate block" title={dev.producto}>
                                  {dev.producto}
                                </span>
                                <div className="text-[11px] text-gray-lightest">
                                  {dev.fecha} {dev.hora ? `• ${dev.hora}` : ''}
                                  {dev.motivoDetalle ? ` • ${dev.motivoDetalle}` : ''}
                                </div>
                              </div>
                              <div className="flex flex-col gap-0.5 shrink-0 text-right">
                                <span className="text-[11px] text-gray-400">Cantidad</span>
                                <span className="text-xs text-white-primary tabular-nums">{dev.cantidad}</span>
                              </div>
                              <div className="flex flex-col gap-0.5 shrink-0 text-right">
                                <span className="text-[11px] text-gray-400">Monto</span>
                                <span className="text-xs text-orange-primary font-semibold tabular-nums">
                                  ${formatCurrency(dev.monto)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}



                  <div className="bg-gray-darker p-4 rounded-xl border border-gray-dark space-y-3">
                    {/* Subtotal Original */}
                    <div className="flex justify-between text-gray-lightest">
                    </div>

                    {/* Saldo a Favor Usado - Estilo Verde */}
                    {saldoUsadoDetalle > 0 && (
                      <div className="flex justify-between text-green-500 font-medium">
                        <span>Saldo a Favor Usado:</span>
                        <span className="font-bold">-${formatCurrency(saldoUsadoDetalle)}</span>
                      </div>
                    )}

                    {/* Subtotal Ajustado */}
                    <div className="flex justify-between text-white-primary font-semibold">
                      <span>Subtotal Ajustado:</span>
                      <span>
                        ${formatCurrency(
                          Math.max(0, (selectedVenta.subtotal || 0) - (saldoUsadoDetalle || 0) - (totalMontoDevuelto || 0))
                        )}
                      </span>
                    </div>

                    <hr className="border-gray-medium my-2" />

                    {/* Total Ajustado - Grande y Naranja */}
                    <div className="flex justify-between items-end">
                      <span className="text-white-primary font-bold text-xl">Total Ajustado:</span>
                      <span className="text-orange-primary font-bold  text-xl">
                        ${formatCurrency(
                          Math.max(0, (selectedVenta.subtotal || 0) - (saldoUsadoDetalle || 0) - (totalMontoDevuelto || 0))
                        )}
                      </span>
                    </div>

                    {/* Total Original - Pequeño y Gris como en la imagen */}
                    <div className="flex justify-between text-gray-500 text-[11px] mt-1">
                      <span>Total Original:</span>
                      <span>${formatCurrency((selectedVenta.subtotal || 0) - (selectedVenta.descuento || 0))}</span>
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
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <AlertContainer />
        <DoubleConfirmationContainer />
      </main>
    </>
  );
}
