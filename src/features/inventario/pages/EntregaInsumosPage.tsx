import React, { useState, useEffect, useRef } from "react";
import { Input } from "../../../shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
  X,
  ShoppingBag,
  Hash,
  User as UserIcon,
  HandHelping,
  FileText,
  FileDown,
  AlertTriangle,
  CheckCircle,
  Ban,
  XCircle,
  Edit2,
  Clock,
  Truck
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { toast } from "../../../shared/components/ui/notify";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { entregaInsumosService, EntregaInsumo, InsumoEntrega, CreateEntregaData, UpdateEntregaData } from "../services/entregaInsumosService";
import { apiService, ApiUser } from "../../../shared/services/api";
import { barberosService, Barbero } from "../../administracion/services/barberosService";
import { insumosService, Insumo } from "../services/insumosService";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { canBeUsedInService, isSaleOnly } from "../../../shared/utils/usagePolicy";

// Función para formatear moneda colombiana con puntos para separar miles
const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0';
  }
  return amount.toLocaleString('es-CO');
};

const getFullName = (nombre?: string, apellido?: string) => {
  return `${nombre || ''}${apellido ? ` ${apellido}` : ''}`.trim();
};

import { useAuth } from "../../../shared/contexts/AuthContext"; // Import newly added
import manitoLogo from "../../../assets/Manito.jpeg";

export function EntregaInsumosPage() {
  const { user } = useAuth(); // Get user from context
  const { confirmDeleteAction, confirmEditAction, DoubleConfirmationContainer } = useDoubleConfirmation();

  const generateCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (date: string | Date) => {
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
    return dateObj.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Estados para el componente
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [entregas, setEntregas] = useState<EntregaInsumo[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDelivery, setCreatingDelivery] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaInsumo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completada" | "anulada">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [insumoSearchTerm, setInsumoSearchTerm] = useState("");
  const [showInsumoResults, setShowInsumoResults] = useState(false);
  const [barberoSearchTerm, setBarberoSearchTerm] = useState("");
  const [showBarberoResults, setShowBarberoResults] = useState(false);
  const [barberoSearchFocused, setBarberoSearchFocused] = useState(false);
  const [insumoSearchFocused, setInsumoSearchFocused] = useState(false);
  const [showEntregaFormErrors, setShowEntregaFormErrors] = useState(false);
  const [entregaValidationAttempt, setEntregaValidationAttempt] = useState(0);
  const [showAddInsumoErrors, setShowAddInsumoErrors] = useState(false);
  const [cantidadInsumo, setCantidadInsumo] = useState(0);
  const [cantidadInsumoInput, setCantidadInsumoInput] = useState('');
  const [tarjetaInputsEntrega, setTarjetaInputsEntrega] = useState<Record<number, { cantidad?: string }>>({});
  const { created, error, AlertContainer } = useCustomAlert();

  const shakeClass = entregaValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';
  const barberoInputRef = useRef<HTMLInputElement | null>(null);
  const productoInputRef = useRef<HTMLInputElement | null>(null);
  const cantidadInputRef = useRef<HTMLInputElement | null>(null);
  const addProductoRowRef = useRef<HTMLDivElement | null>(null);
  const productosAgregadosRef = useRef<HTMLDivElement | null>(null);
  const numeroEntregas = (entregas || []).reduce((max, entrega) => {
    const id = Number((entrega as any)?.id ?? 0);
    return Number.isFinite(id) && id > max ? id : max;
  }, 0) + 1;
  const [isProductoDetalleOpen, setIsProductoDetalleOpen] = useState(false);
  const [productoDetalle, setProductoDetalle] = useState<any | null>(null);

  // Función para normalizar texto de búsqueda (quitar tildes, minúsculas)
  const normalizeSearchText = (value: unknown): string => {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  const getBarberoNombreById = (barberoId: number | string | undefined | null) => {
    if (barberoId === undefined || barberoId === null) return 'Sin asignar';
    const id = typeof barberoId === 'string' ? Number(barberoId) : barberoId;
    const barbero = barberos.find(b => b.id === id);
    if (!barbero) return 'Sin asignar';
    return getFullName(barbero.nombre, barbero.apellido) || 'Sin asignar';
  };

  const getBarberoDocumentoById = (barberoId: number | string | undefined | null) => {
    if (barberoId === undefined || barberoId === null) return '';
    const id = typeof barberoId === 'string' ? Number(barberoId) : barberoId;
    const barbero = barberos.find(b => b.id === id);
    return String(barbero?.documento || '');
  };

  const getBarberoDisplay = (entrega: EntregaInsumo | null | undefined) => {
    if (!entrega) return 'Sin asignar';
    const entregaAny = entrega as any;
    const barberoValue = entregaAny.barbero ?? entregaAny.Barbero;
    let documentoValue =
      entregaAny.barberoDocumento ??
      entregaAny.BarberoDocumento ??
      '';

    if (barberoValue) {
      if (typeof barberoValue === 'string') return barberoValue;
      const nombre =
        barberoValue.nombre ??
        barberoValue.Nombre ??
        barberoValue.nombres ??
        barberoValue.Nombres ??
        barberoValue.primerNombre ??
        barberoValue.PrimerNombre ??
        barberoValue.name ??
        barberoValue.Name ??
        barberoValue.nombreBarbero ??
        barberoValue.NombreBarbero;
      const apellido =
        barberoValue.apellido ??
        barberoValue.Apellido ??
        barberoValue.apellidos ??
        barberoValue.Apellidos ??
        barberoValue.primerApellido ??
        barberoValue.PrimerApellido ??
        barberoValue.lastName ??
        barberoValue.LastName ??
        barberoValue.apellidoBarbero ??
        barberoValue.ApellidoBarbero;
      const fullName = getFullName(nombre, apellido);
      if (!documentoValue) {
        documentoValue =
          barberoValue.documento ??
          barberoValue.Documento ??
          '';
      }
      if (fullName) {
        return `${fullName}${documentoValue ? ` — CC ${documentoValue}` : ''}`;
      }
    }

    const directName =
      entregaAny.barberoNombre ??
      entregaAny.nombreBarbero ??
      entregaAny.BarberoNombre ??
      entregaAny.NombreBarbero ??
      entregaAny.barberoFullName ??
      entregaAny.BarberoFullName;
    if (directName) return String(directName);

    const barberoId =
      entregaAny.barberoId ??
      entregaAny.BarberoId ??
      entregaAny.barberoSeleccionado ??
      entregaAny.BarberoSeleccionado;
    const nombreById = getBarberoNombreById(barberoId);
    if (!documentoValue) {
      documentoValue = getBarberoDocumentoById(barberoId);
    }
    if (nombreById && nombreById !== 'Sin asignar') {
      return `${nombreById}${documentoValue ? ` — CC ${documentoValue}` : ''}`;
    }

    const barberoDocumento =
      entregaAny.barberoDocumento ??
      entregaAny.BarberoDocumento ??
      entregaAny.documentoBarbero ??
      entregaAny.DocumentoBarbero;
    if (barberoDocumento) {
      const match = barberos.find(b => String(b.documento ?? '') === String(barberoDocumento));
      if (match) {
        const fullName = getFullName(match.nombre, match.apellido);
        if (fullName) return `${fullName} — CC ${String(barberoDocumento)}`;
      }
    }

    return 'Sin asignar';
  };

  const getProductoNombreById = (productoId: number | string | undefined | null) => {
    if (productoId === undefined || productoId === null) return 'Sin asignar';
    const id = typeof productoId === 'string' ? Number(productoId) : productoId;
    const producto = insumos.find(p => p.id === id);
    return producto?.nombre || 'Sin asignar';
  };

  const getUsuarioNombreById = (usuarioId: number | string | undefined | null) => {
    if (usuarioId === undefined || usuarioId === null) return 'Sin asignar';
    const id = typeof usuarioId === 'string' ? Number(usuarioId) : usuarioId;
    const usuario = users.find(u => u.id === id);
    if (!usuario) return 'Sin asignar';
    return getFullName(usuario.nombre, usuario.apellido) || 'Sin asignar';
  };

  const getUsuarioDocumentoById = (usuarioId: number | string | undefined | null) => {
    if (usuarioId === undefined || usuarioId === null) return '';
    const id = typeof usuarioId === 'string' ? Number(usuarioId) : usuarioId;
    const usuario = users.find(u => u.id === id);
    return String((usuario as any)?.documento || (usuario as any)?.Documento || '');
  };

  const getResponsableDisplay = (entrega: EntregaInsumo | null | undefined) => {
    if (!entrega) return 'N/A';
    const e: any = entrega as any;
    let doc =
      e.responsableDocumento ??
      e.ResponsableDocumento ??
      e.usuarioDocumento ??
      e.UsuarioDocumento ??
      '';

    const respObj = e.responsable ?? e.Responsable ?? e.usuario ?? e.Usuario;
    if (respObj) {
      if (typeof respObj === 'string') {
        return `${respObj}${doc ? ` — CC ${doc}` : ''}`;
      }
      const nombre =
        respObj.nombre ?? respObj.Nombre ?? respObj.primerNombre ?? respObj.PrimerNombre ?? respObj.name ?? respObj.Name;
      const apellido =
        respObj.apellido ?? respObj.Apellido ?? respObj.primerApellido ?? respObj.PrimerApellido ?? respObj.lastName ?? respObj.LastName;
      if (!doc) {
        doc = respObj.documento ?? respObj.Documento ?? '';
      }
      const fullName = getFullName(nombre, apellido);
      if (fullName) return `${fullName}${doc ? ` — CC ${doc}` : ''}`;
    }

    const nombreDirecto =
      e.responsableNombre ?? e.ResponsableNombre ?? e.usuarioNombre ?? e.UsuarioNombre ?? e.responsable ?? e.usuario;
    if (nombreDirecto) {
      return `${String(nombreDirecto)}${doc ? ` — CC ${doc}` : ''}`;
    }

    const uid =
      e.responsableId ?? e.ResponsableId ?? e.usuarioId ?? e.UsuarioId ?? e.userId ?? e.UserId;
    const nombreById = getUsuarioNombreById(uid);
    if (!doc) doc = getUsuarioDocumentoById(uid);
    if (nombreById && nombreById !== 'Sin asignar') {
      return `${nombreById}${doc ? ` — CC ${doc}` : ''}`;
    }

    const docFromEntrega =
      e.responsableDocumento ?? e.ResponsableDocumento ?? e.usuarioDocumento ?? e.UsuarioDocumento;
    if (docFromEntrega) {
      const match = users.find(u => String((u as any)?.documento || (u as any)?.Documento || '') === String(docFromEntrega));
      if (match) {
        const fullName = getFullName((match as any).nombre, (match as any).apellido);
        if (fullName) return `${fullName} — CC ${String(docFromEntrega)}`;
      }
    }
    return 'N/A';
  };

  // Cargar datos desde la API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Cargar barberos, insumos, entregas y usuarios desde la API en paralelo
        const [barberosData, insumosData, entregasData, usersData] = await Promise.all([
          barberosService.getBarberos(),
          insumosService.getInsumos(),
          entregaInsumosService.getEntregas(),
          apiService.getUsuarios()
        ]);

        console.log('🔵 Barberos desde API:', barberosData);
        console.log('🔵 Insumos desde API:', insumosData);
        console.log('🔵 Entregas desde API:', entregasData);
        console.log('🔵 Usuarios desde API:', usersData);

        setBarberos(barberosData);
        setInsumos(insumosData.filter(i => i.activo === true));
        setEntregas(entregasData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar los datos desde el servidor');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);
  // Estado para nueva entrega
  const inicialNuevaEntrega = {
    barberoSeleccionado: 0,
    fechaRegistro: generateCurrentDate(),
    horaEntrega: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    responsable: 'Admin Principal',
    insumos: [] as InsumoEntrega[]
  };

  const [nuevaEntrega, setNuevaEntrega] = useState(inicialNuevaEntrega);

  const [insumoSeleccionado, setInsumoSeleccionado] = useState(0); // Cambiar a number

  function normalizeEstado(estado: string) {
    return (estado || '').toLowerCase().trim();
  }
  function isCompletadaEstado(estado: string) {
    const e = normalizeEstado(estado);
    return e === 'entregado' || e === 'completada' || e === 'completado';
  }
  function isAnuladaEstado(estado: string) {
    const e = normalizeEstado(estado);
    return e === 'anulado' || e === 'anulada';
  }
  function getEstadoDisplay(estado: string) {
    if (isCompletadaEstado(estado)) return 'Completada';
    if (isAnuladaEstado(estado)) return 'Anulada';
    return estado || 'N/A';
  }
  function getEstadoColor(estado: string) {
    if (isAnuladaEstado(estado)) {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    if (isCompletadaEstado(estado)) {
      return 'bg-green-500/10 text-green-400 border border-green-500/20';
    }
    return 'bg-gray-medium text-gray-lighter';
  }

  // Filtros y paginación
  const filteredEntregas = entregas.filter((entrega) => {
    const estadoRaw = String(entrega.estado || '');
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completada" && isCompletadaEstado(estadoRaw)) ||
      (statusFilter === "anulada" && isAnuladaEstado(estadoRaw));
    if (!matchesStatus) return false;
    const q = normalizeSearchText(searchTerm);
    if (!q) return true;
    const numero = String(entrega.id || '');
    const documento = String((entrega as any).barberoDocumento || getBarberoDocumentoById((entrega as any).barberoId) || '');
    const nombre = getBarberoNombreById((entrega as any).barberoId);
    const totalInsumos = String(entrega.cantidadTotal ?? '');
    const fecha = formatDate(entrega.fecha || generateCurrentDate());
    const estadoDisplay = getEstadoDisplay(String(entrega.estado || ''));
    // Solo columnas visibles de la tabla: Número, Documento, Nombre, Total Insumos, Fecha, Estado
    const searchable = normalizeSearchText([numero, documento, nombre, totalInsumos, fecha, estadoDisplay].join(' '));
    return searchable.includes(q);
  });

  const totalPages = Math.ceil(filteredEntregas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedEntregas = filteredEntregas.slice(startIndex, startIndex + itemsPerPage);


  const getDetalleInsumosNormalized = (entrega: EntregaInsumo | null | undefined) => {
    if (!entrega) return [] as Array<{ id: number; nombre: string; categoria: string; cantidad: number; precio: number; imagen?: string }>;

    const raw =
      (entrega as any).insumosDetalle ||
      (entrega as any).InsumosDetalle ||
      (entrega as any).detalleEntregasInsumos ||
      (entrega as any).DetalleEntregasInsumos ||
      (entrega as any).detalles ||
      (entrega as any).Detalles ||
      (entrega as any).insumos ||
      (entrega as any).Insumos ||
      (entrega as any).productos ||
      (entrega as any).Productos ||
      [];

    const list = Array.isArray(raw) ? raw : [];
    
    if (list.length > 0) {
      console.log('🔍 Normalizando detalles de entrega:', { id: entrega.id, rawLength: list.length, firstItem: list[0] });
    }

    return list.map((detalle: any, index: number) => {
      // DEBUG: Ver estructura del primer elemento para diagnosticar problemas de mapeo
      if (index === 0) {
        console.log('🔍 Inspeccionando estructura de detalle:', detalle);
      }

      // Intentar obtener el ID del producto
      const productoId = detalle?.productoId ?? detalle?.ProductoId ?? detalle?.producto?.id ?? detalle?.Producto?.Id ?? detalle?.id ?? detalle?.Id;
      
      // Buscar información completa del producto en el catálogo global si es posible
      const productoCatalogo = insumos.find(i => Number(i.id) === Number(productoId));
      
      // Objeto producto base (prioridad: catálogo global > objeto anidado > objeto detalle)
      const producto = productoCatalogo || detalle?.producto || detalle?.Producto || detalle || {};

      const categoriaValue =
        producto?.categoria?.nombre ||
        producto?.categoria?.Nombre ||
        producto?.categoriaNombre ||
        producto?.CategoriaNombre ||
        producto?.categoria ||
        producto?.Categoria ||
        detalle?.categoria?.nombre ||
        detalle?.categoria?.Nombre ||
        detalle?.categoriaNombre ||
        detalle?.CategoriaNombre ||
        detalle?.categoria ||
        detalle?.Categoria ||
        '';

      const imagenValue =
        producto?.imagen ||
        producto?.imagenProduc ||
        producto?.ImagenProduc ||
        producto?.imagenUrl ||
        producto?.ImagenUrl ||
        detalle?.imagen ||
        detalle?.imagenProduc ||
        detalle?.ImagenProduc ||
        detalle?.imagenUrl ||
        detalle?.ImagenUrl ||
        '';

      const cantidadValue = Number(
        detalle?.cantidad ?? 
        detalle?.Cantidad ?? 
        producto?.cantidad ?? 
        producto?.Cantidad ?? 
        0
      );
      
      // El precio debe venir preferiblemente del detalle histórico, si no, del producto actual
      const precioValue = Number(
        detalle?.precio ??
        detalle?.Precio ??
        detalle?.precioUnitario ??
        detalle?.PrecioUnitario ??
        detalle?.precioHistorico ??
        detalle?.PrecioHistorico ??
        producto?.precio ??
        producto?.Precio ??
        producto?.precioVenta ??
        producto?.PrecioVenta ??
        0
      );

      return {
        id: Number(productoId ?? index),
        nombre: String(producto?.nombre ?? producto?.Nombre ?? detalle?.nombre ?? detalle?.Nombre ?? `Insumo ${index + 1}`),
        categoria: String(categoriaValue || 'Sin categoría'),
        cantidad: Number.isFinite(cantidadValue) ? cantidadValue : 0,
        precio: Number.isFinite(precioValue) ? precioValue : 0,
        imagen: imagenValue || undefined,
      };
    });
  };

  const getTarjetaInputEntrega = (insumo: { id: number; cantidad: number }) => {
    const visual = tarjetaInputsEntrega[insumo.id]?.cantidad;
    return visual ?? String(insumo.cantidad ?? 0);
  };

  const actualizarTarjetaInputEntrega = (insumoId: number, valor: string) => {
    setTarjetaInputsEntrega((prev) => ({
      ...prev,
      [insumoId]: { ...prev[insumoId], cantidad: valor }
    }));

    if (valor.trim() === '') return;

    const numero = Number(valor);
    if (Number.isNaN(numero)) return;

    const cantidad = Math.max(1, Math.floor(numero));
    const insumoBase = insumos.find(i => Number(i.id) === Number(insumoId));
    const stockDisponible = insumoBase ? (insumoBase.stockInsumos ?? insumoBase.stock) : Number.POSITIVE_INFINITY;
    const cantidadFinal = cantidad > stockDisponible ? stockDisponible : cantidad;

    if (cantidadFinal !== cantidad) {
      error('Cantidad ajustada', `Se ajustó automáticamente al stock máximo disponible: ${stockDisponible} unidades`);
      setTarjetaInputsEntrega((prev) => ({
        ...prev,
        [insumoId]: { ...prev[insumoId], cantidad: String(cantidadFinal) }
      }));
    }

    setNuevaEntrega((prev) => ({
      ...prev,
      insumos: (prev.insumos || []).map((i: any) =>
        Number(i.id) === Number(insumoId)
          ? { ...i, cantidad: cantidadFinal }
          : i
      )
    }));
  };

  const agregarInsumo = () => {
    console.log('🧪 Click Agregar insumo', {
      insumoSeleccionado,
      cantidadInsumo,
      nuevaEntregaInsumos: nuevaEntrega.insumos,
      insumosCount: insumos.length,
    });

    if (!insumoSeleccionado) {
      setShowAddInsumoErrors(true);
      setEntregaValidationAttempt(prev => prev + 1);
      error('Campos obligatorios', 'Selecciona un producto antes de agregar.');
      console.warn('🟡 No se agregó: insumoSeleccionado vacío/0');
      requestAnimationFrame(() => {
        addProductoRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        productoInputRef.current?.focus();
      });
      return;
    }

    if (!cantidadInsumoInput.trim() || !cantidadInsumo || cantidadInsumo <= 0) {
      setShowAddInsumoErrors(true);
      setEntregaValidationAttempt(prev => prev + 1);
      error('Campos obligatorios', 'Ingresa una cantidad válida.');
      console.warn('🟡 No se agregó: cantidadInsumo inválida', { cantidadInsumo });
      requestAnimationFrame(() => {
        addProductoRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cantidadInputRef.current?.focus();
      });
      return;
    }

    const selectedId = Number(insumoSeleccionado);
    const insumo = insumos.find(i => Number(i.id) === selectedId);
    console.log('🧪 Producto seleccionado encontrado:', { selectedId, insumo });
    if (!insumo) {
      error('Producto no encontrado', 'El producto seleccionado no existe o no está disponible.');
      console.error('❌ Producto no encontrado. insumoSeleccionado=', insumoSeleccionado, 'insumos=', insumos);
      return;
    }

    // Verificar política de uso: no permitir agregar productos solo venta
    if (isSaleOnly(insumo as any)) {
      error('No permitido', 'Este producto es solo para venta y no puede entregarse como insumo.');
      return;
    }

    // Verificar stock disponible (usar stock de insumos si está disponible)
    const stockDisponible = insumo.stockInsumos ?? insumo.stock;
    let cantidadAUsar = cantidadInsumo;

    if (cantidadInsumo > stockDisponible) {
      error('Cantidad ajustada', `Se ajustó automáticamente al stock máximo disponible: ${stockDisponible}`);
      cantidadAUsar = stockDisponible;
    }

    const insumosActuales = nuevaEntrega.insumos || [];
    const existeInsumo = insumosActuales.find(i => Number(i.id) === Number(insumo.id));
    console.log('🧪 Estado antes de agregar', { insumosActuales, existeInsumo });

    if (existeInsumo) {
      const nuevaCantidad = existeInsumo.cantidad + cantidadAUsar;
      const stockDisponible = insumo.stockInsumos ?? insumo.stock;
      let cantidadFinal = nuevaCantidad;
      if (nuevaCantidad > stockDisponible) {
        error('Cantidad ajustada', `Se ajustó automáticamente al stock máximo disponible: ${stockDisponible}`);
        cantidadFinal = stockDisponible;
      }

      setNuevaEntrega({
        ...nuevaEntrega,
        insumos: insumosActuales.map(i =>
          Number(i.id) === Number(insumo.id)
            ? { ...i, cantidad: cantidadFinal }
            : i
        )
      });
      setTarjetaInputsEntrega((prev) => ({
        ...prev,
        [insumo.id]: { ...prev[insumo.id], cantidad: String(cantidadFinal) }
      }));
    } else {
      setNuevaEntrega({
        ...nuevaEntrega,
        insumos: [...insumosActuales, {
          id: insumo.id,
          nombre: insumo.nombre,
          categoria: insumo.categoria,
          cantidad: cantidadAUsar,
          precio: Number(insumo.precio) || 0,
          imagen: insumo.imagen
        }]
      });
      setTarjetaInputsEntrega((prev) => ({
        ...prev,
        [insumo.id]: { ...prev[insumo.id], cantidad: String(cantidadAUsar) }
      }));
    }

    setInsumoSeleccionado(0);
    setCantidadInsumo(0);
    setCantidadInsumoInput('');
    setInsumoSearchTerm("");
    setShowInsumoResults(false);
    setShowAddInsumoErrors(false);
    if (showEntregaFormErrors) setShowEntregaFormErrors(false);

    console.log('✅ Producto agregado a la entrega:', { id: insumo.id, nombre: insumo.nombre, cantidad: cantidadInsumo });
  };

  const eliminarInsumo = (insumoId: number) => {
    const insumosActuales = nuevaEntrega.insumos || [];
    setNuevaEntrega({
      ...nuevaEntrega,
      insumos: insumosActuales.filter(i => i.id !== insumoId)
    });
    setTarjetaInputsEntrega((prev) => {
      const next = { ...prev };
      delete next[insumoId];
      return next;
    });
  };

  const calcularTotalEntrega = () => {
    if (!nuevaEntrega.insumos || !Array.isArray(nuevaEntrega.insumos)) {
      return 0;
    }

    return nuevaEntrega.insumos.reduce((total, insumo) => {
      const precio = Number((insumo as any).precio) || 0;
      const cantidad = Number((insumo as any).cantidad) || 0;
      return total + (precio * cantidad);
    }, 0);
  };

  const handleCreateEntrega = async () => {
    // Validate session
    if (!user || !user.id) {
      toast.error("Error de sesión", { description: "No se ha identificado el usuario responsable." });
      return;
    }

    console.log('🧪 Click Registrar Entrega', {
      barberoSeleccionado: nuevaEntrega.barberoSeleccionado,
      fechaRegistro: (nuevaEntrega as any).fechaRegistro,
      insumosCount: (nuevaEntrega.insumos || []).length,
      insumos: nuevaEntrega.insumos,
    });

    if (!nuevaEntrega.barberoSeleccionado || !nuevaEntrega.insumos || nuevaEntrega.insumos.length === 0) {
      setShowEntregaFormErrors(true);
      setEntregaValidationAttempt(prev => prev + 1);
      error('Campos obligatorios', 'Completa el barbero y agrega al menos un producto.');
      requestAnimationFrame(() => {
        if (!nuevaEntrega.barberoSeleccionado) {
          barberoInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          barberoInputRef.current?.focus();
          return;
        }
        (productosAgregadosRef.current ?? addProductoRowRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    try {
      setCreatingDelivery(true);

      const barbero = barberos.find(b => b.id === nuevaEntrega.barberoSeleccionado);
      if (!barbero) {
        toast.error('Barbero no encontrado');
        console.error('❌ Barbero no encontrado', { barberoSeleccionado: nuevaEntrega.barberoSeleccionado, barberos });
        return;
      }

      const total = calcularTotalEntrega();
      const insumosActuales = nuevaEntrega.insumos || [];
      const cantidadTotal = insumosActuales.length > 0
        ? insumosActuales.reduce((sum, insumo) => sum + insumo.cantidad, 0)
        : 0;

      const entregaData: CreateEntregaData = {
        barberoId: nuevaEntrega.barberoSeleccionado,
        usuarioId: Number(user?.id) || 0,
        detalles: nuevaEntrega.insumos.map(insumo => ({
          productoId: insumo.id,
          cantidad: insumo.cantidad
        }))
      };

      console.log('📤 Enviando a API:', entregaData);

      const entregaCreada = await entregaInsumosService.createEntrega(entregaData);

      // Actualizar stock de insumos (simulado localmente)
      const nuevosInsumos = insumos.map(insumo => {
        const insumoEntregado = insumosActuales.find(i => i.id === insumo.id);
        if (insumoEntregado) {
          // Descontar del stock de insumos si existe, de lo contrario del stock general
          if (insumo.stockInsumos !== undefined) {
            return {
              ...insumo,
              stockInsumos: Math.max(0, (insumo.stockInsumos || 0) - insumoEntregado.cantidad)
            };
          } else {
            return {
              ...insumo,
              stock: insumo.stock - insumoEntregado.cantidad
            };
          }
        }
        return insumo;
      });

      setInsumos(nuevosInsumos);
      // refrescar lista desde API para evitar inconsistencias
      const entregasActualizadas = await entregaInsumosService.getEntregas();
      setEntregas(entregasActualizadas);
      const insumosActualizados = await insumosService.getInsumos();
      setInsumos(insumosActualizados);
      setNuevaEntrega({ ...inicialNuevaEntrega, fechaRegistro: generateCurrentDate() });
      setBarberoSearchTerm("");
      setShowBarberoResults(false);
      setInsumoSearchTerm("");
      setShowInsumoResults(false);
      setShowEntregaFormErrors(false);
      setShowAddInsumoErrors(false);
      setCantidadInsumo(0);
      setCantidadInsumoInput('');
      setTarjetaInputsEntrega({});
      setIsDialogOpen(false);
      const numeroEntregaCreada = Number((entregaCreada as any)?.id ?? 0);
      created(
        "Entrega creada ✔️",
        `La entrega #${numeroEntregaCreada > 0 ? numeroEntregaCreada : numeroEntregas} ha sido registrada exitosamente para ${getFullName(barbero?.nombre, barbero?.apellido) || 'Sin asignar'}.`
      );
    } catch (error: any) {
      console.error('Error creando entrega:', error);
      toast.error(error?.message || 'Error al registrar la entrega');
    } finally {
      setCreatingDelivery(false);
    }
  };

  // Función para ver detalles completos de una entrega consumiendo la API
  const handleViewDetails = async (entrega: EntregaInsumo) => {
    // 1. Mostrar inmediatamente lo que tenemos para respuesta rápida
    console.log('👀 Visualizando entrega (datos locales):', entrega);
    setSelectedEntrega(entrega);
    setIsDetailDialogOpen(true);

    try {
      // 2. Intentar obtener detalles completos en segundo plano para enriquecer la data
      const entregaCompleta = await entregaInsumosService.getEntregaById(entrega.id.toString());

      if (entregaCompleta) {
        console.log('✅ Detalles completos cargados:', entregaCompleta);
        // 3. Si tenemos éxito, actualizamos con la info completa
        setSelectedEntrega(entregaCompleta);
      }
    } catch (error) {
      console.error('⚠️ No se pudieron cargar detalles adicionales (se mantienen datos locales):', error);
      // No mostramos error al usuario para no interrumpir la experiencia, 
      // ya que está viendo la información básica que ya teníamos.
    }
  };

  // Función para anular una entrega
  const handleAnularClick = async (entrega: EntregaInsumo) => {
    // Confirmación antes de anular
    confirmEditAction(
      `entrega #${entrega.id}`,
      async () => {
        try {
          console.log(`🚫 Anulando entrega ${entrega.id}...`);

          const response = await entregaInsumosService.updateEntrega(entrega.id, {
            id: entrega.id,
            estado: 'Anulado'
          });

          console.log('✅ Entrega anulada:', response);

          // Actualizar lista local
          setEntregas(entregas.map(e =>
            e.id === entrega.id ? { ...e, estado: 'Anulado' } : e
          ));

          // Devolver stock de insumos al inventario (registrar en backend)
          const detalles = (entrega as any).detalleEntregasInsumos || entrega.insumosDetalle || [];
          console.log('🔄 Registrando devolución de insumos en backend para detalles:', detalles);

          try {
            if (detalles.length > 0 && user?.id) {
              const devolucionDetalles = detalles.map((d: any) => ({
                productoId: Number(d.productoId ?? d.ProductoId ?? d.id ?? 0),
                cantidad: Number(d.cantidad ?? d.Cantidad ?? 0),
                precioHistorico: Number(d.precio ?? d.Precio ?? d.precioUnitario ?? d.PrecioUnitario ?? Number.NaN)
              })).filter((d: any) => d.productoId > 0 && d.cantidad > 0);

              if (devolucionDetalles.length > 0) {
                const barberoIdNum = Number((entrega as any).barberoId ?? (entrega as any).BarberoId ?? 0);
                const usuarioIdNum = Number(user.id);
                const { devolucionService } = await import('../../ventas/services/devolucionService');
                await devolucionService.createDevolucionInsumosBarbero({
                  barberoId: barberoIdNum,
                  usuarioId: usuarioIdNum,
                  detalles: devolucionDetalles
                });
              }
            }
          } catch (e) {
            console.warn('⚠️ No se pudo registrar la devolución de insumos en backend:', e);
          }

          const nuevosInsumos = insumos.map(insumo => {
            const detalleDevuelto = detalles.find((d: any) => d.productoId === insumo.id);
            if (detalleDevuelto) {
              console.log(`📦 Devolviendo ${detalleDevuelto.cantidad} unidades de ${insumo.nombre} al stock`);
              // Devolver al stock de insumos si existe, de lo contrario al stock general
              if (insumo.stockInsumos !== undefined) {
                return {
                  ...insumo,
                  stockInsumos: (insumo.stockInsumos || 0) + detalleDevuelto.cantidad
                };
              } else {
                return {
                  ...insumo,
                  stock: insumo.stock + detalleDevuelto.cantidad
                };
              }
            }
            return insumo;
          });
          setInsumos(nuevosInsumos);
          const insumosActualizados = await insumosService.getInsumos();
          setInsumos(insumosActualizados);

          // No need to toast success here as confirmEditAction handles success message if configured, 
          // or we can toast if we prefer custom handling. But DoubleConfirmation usually shows success dialog.
          // However, double confirmation shows a success dialog, so let's keep it clean.
        } catch (error) {
          console.error('❌ Error anulando entrega:', error);
          toast.error('Error al anular la entrega');
          throw error; // Propagate error so dialog knows it failed
        }
      },
      {
        confirmTitle: 'Confirmar Anulación',
        confirmMessage: `¿Estás seguro de anular la entrega ${entrega.id}? Esta acción devolverá los insumos al inventario.`,
        successTitle: '¡Entrega anulada!',
        successMessage: `La entrega ${entrega.id} ha sido anulada exitosamente.`,
        requireInput: false
      }
    );
  };

  // Generar reporte PDF individual por entrega
  const generateIndividualEntregaPDF = async (entrega: EntregaInsumo) => {
    try {
      // 1. Asegurarse de tener la data completa (detalles de insumos)
      let entregaFull = entrega;
      const initialDetails = getDetalleInsumosNormalized(entrega);
      
      if (initialDetails.length === 0) {
        console.log('🔍 El objeto de entrega no tiene detalles, intentando obtener de la API...');
        const fetched = await entregaInsumosService.getEntregaById(entrega.id.toString());
        if (fetched) {
          entregaFull = fetched;
        }
      }

      const detallesNormalized = getDetalleInsumosNormalized(entregaFull);
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const hMargin = 20;

      // --- ENCABEZADO ---
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, pageWidth, 65, 'F'); // Aumentado para el logo más grande

      // Agregar Logo
      try {
        // Logo más grande (25x25) y centrado
        doc.addImage(manitoLogo, 'JPEG', pageWidth / 2 - 12.5, 5, 25, 25);
      } catch (e) {
        console.warn("No se pudo cargar el logo en el PDF", e);
      }

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

      doc.setTextColor(216, 176, 129); // Dorado
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      // Texto más alejado del logo (y=40)
      doc.text("MANITO BARBERSHOP", pageWidth / 2, 40, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(170, 170, 170);
      doc.text("Comprobante de Entrega de Insumos", pageWidth / 2, 48, { align: "center" });

      // Badge ID
      doc.setFillColor(216, 176, 129);
      doc.roundedRect(pageWidth / 2 - 25, 52, 50, 7, 3.5, 3.5, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const deliveryId = String((entregaFull as any).documento || entregaFull.id || 'N/A');
      doc.text(`ENTREGA #${deliveryId}`, pageWidth / 2, 56.5, { align: "center" });

      // --- INFORMACIÓN GENERAL ---
      let y = 80; // Bajado más para compensar el header más grande y el logo
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
      doc.text("N. de entrega:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(entregaFull.id ?? 'N/A'), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Barbero:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(getBarberoDisplay(entregaFull), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Fecha y Hora:", hMargin, y);
      doc.setFont("helvetica", "normal");
      const horaText = entregaFull.hora ? ` a las ${entregaFull.hora}` : '';
      doc.text(`${formatDate(entregaFull.fecha || '')}${horaText}`, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Estado:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(getEstadoDisplay(entregaFull.estado || ''), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Responsable:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(getResponsableDisplay(entregaFull), hMargin + 40, y);

      // --- TABLA DE INSUMOS ---
      y += 15;
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE INSUMOS", hMargin, y);
      doc.line(hMargin, y + 2, 80, y + 2);

      y += 12;
      // Headers Tabla: INSUMO, CATEGORÍA, CANT., Stock insumos, Total actual
      doc.setFillColor(26, 26, 26);
      doc.rect(hMargin, y, pageWidth - (hMargin * 2), 10, 'F');
      doc.setTextColor(216, 176, 129);
      doc.setFontSize(9);
      const colInsumo = 45, colCat = 85, colCant = 108, colStockInsumos = 133, colTotal = 169;
      doc.text("INSUMO", colInsumo, y + 6.5, { align: "center" });
      doc.text("CATEGORÍA", colCat, y + 6.5, { align: "center" });
      doc.text("CANT.", colCant, y + 6.5, { align: "center" });
      doc.text("STOCK INSUMOS", colStockInsumos, y + 6.5, { align: "center" });
      doc.text("TOTAL ACTUAL", colTotal, y + 6.5, { align: "center" });

      y += 10;
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");

      if (detallesNormalized.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.text("No hay detalles disponibles para esta entrega.", pageWidth / 2, y + 10, { align: "center" });
      } else {
        detallesNormalized.forEach((insumo, index) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }

          if (index % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(hMargin, y, pageWidth - (hMargin * 2), 8, 'F');
          }

          const productoActual = insumos.find((i: any) => Number(i.id) === Number(insumo.id));
          const stockInsumos = productoActual != null
            ? Number((productoActual as any).stockInsumos ?? (productoActual as any).stock ?? 0)
            : 0;
          const stockVentas = productoActual != null
            ? Number((productoActual as any).stockVentas ?? 0)
            : 0;
          const stockTotalDirecto = productoActual != null
            ? Number((productoActual as any).stock ?? 0)
            : 0;
          const usaStockSegmentado = productoActual != null && ((productoActual as any).stockInsumos !== undefined || (productoActual as any).stockVentas !== undefined);
          const totalStockProducto = usaStockSegmentado
            ? ((Number.isFinite(stockInsumos) ? stockInsumos : 0) + (Number.isFinite(stockVentas) ? stockVentas : 0))
            : (Number.isFinite(stockTotalDirecto) ? stockTotalDirecto : 0);

          doc.setFontSize(8);
          const nombreTruncado = insumo.nombre.length > 35 ? insumo.nombre.substring(0, 32) + "..." : insumo.nombre;
          doc.text(nombreTruncado, colInsumo, y + 5.5, { align: "center" });

          const catTruncada = (insumo.categoria || 'N/A').length > 20 ? (insumo.categoria || '').substring(0, 17) + "..." : (insumo.categoria || 'N/A');
          doc.text(catTruncada, colCat, y + 5.5, { align: "center" });

          doc.setFont("helvetica", "bold");
          doc.text(String(insumo.cantidad), colCant, y + 5.5, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.text(String(stockInsumos), colStockInsumos, y + 5.5, { align: "center" });
          doc.text(String(totalStockProducto), colTotal, y + 5.5, { align: "center" });

          y += 8;
        });
      }

      y += 8;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(hMargin, y, pageWidth - (hMargin * 2), 12, 2, 2, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`TOTAL PRODUCTOS: ${entregaFull.cantidadTotal} UNIDADES`, pageWidth / 2, y + 8, { align: "center" });

      // --- PIE DE PÁGINA ---
      y = Math.max(275, y + 18);
      doc.setDrawColor(216, 176, 129);
      doc.line(hMargin, y, pageWidth - hMargin, y);
      
      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Documento generado automáticamente el ${new Date().toLocaleString('es-CO')}`, pageWidth / 2, y, { align: "center" });
      doc.text("MANITO BARBERSHOP - Sistema de Gestión de Insumos", pageWidth / 2, y + 4, { align: "center" });

      // Guardar
      const fileName = `Entrega_${deliveryId}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      created("PDF generado exitosamente", "El comprobante de entrega fue descargado correctamente.");
    } catch (err) {
      console.error("Error generando PDF:", err);
      error("Error al generar el PDF", "No se pudo generar el comprobante de entrega.");
    }
  };

  // Estadísticas
  const totalEntregas = entregas.reduce((sum: number, entrega: EntregaInsumo) => sum + entrega.valorTotal, 0);

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Entrega de Insumos a Barberos</h1>
            <p className="text-sm text-gray-lightest mt-1">Gestión y control de entregas de insumos al personal</p>
          </div>

        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        {/* Sección Principal */}
        <div className="elegante-card">
          <TableHeaderSection
            leftContent={(
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (open) {
                    setNuevaEntrega({
                      ...inicialNuevaEntrega,
                      fechaRegistro: generateCurrentDate()
                    });
                    setBarberoSearchTerm("");
                    setShowBarberoResults(false);
                    setInsumoSeleccionado(0);
                    setCantidadInsumo(0);
                    setCantidadInsumoInput('');
                    setInsumoSearchTerm("");
                    setShowInsumoResults(false);
                    setShowEntregaFormErrors(false);
                    setShowAddInsumoErrors(false);
                    setEntregaValidationAttempt(0);
                    setTarjetaInputsEntrega({});
                  }
                }}
              >
                <DialogTrigger asChild>
                  <button className="elegante-button-primary gap-2 flex items-center">
                    <Plus className="w-4 h-4" />
                    Nueva Entrega
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white-primary">Registrar Nueva Entrega</DialogTitle>
                    <DialogDescription className="text-gray-lightest">
                      Selecciona el barbero y los insumos a entregar
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white-primary flex items-center gap-2">
                            <Hash className="w-4 h-4 text-orange-primary" />
                            Número de Entrega (Automático)
                          </Label>
                          <Input
                            value={numeroEntregas.toString().padStart(3, "0")}
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
                            value={formatDate((nuevaEntrega as any).fechaRegistro || generateCurrentDate())}
                            disabled
                            readOnly
                            className="elegante-input bg-gray-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 relative">
                        <Label className="text-white-primary flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-orange-primary" />
                          Barbero *
                        </Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                          <Input
                            ref={barberoInputRef}
                            placeholder="Escribe para buscar un barbero..."
                            value={barberoSearchTerm}
                            onChange={(e) => {
                              setBarberoSearchTerm(e.target.value);
                              setShowBarberoResults(true);
                              setNuevaEntrega({ ...nuevaEntrega, barberoSeleccionado: 0 });
                            }}
                            onFocus={() => {
                              setBarberoSearchFocused(true);
                              setShowBarberoResults(true);
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setBarberoSearchFocused(false);
                                setShowBarberoResults(false);
                              }, 120);
                            }}
                            className={`elegante-input pl-11 w-full ${showEntregaFormErrors && !nuevaEntrega.barberoSeleccionado ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                          />
                          {(barberoSearchFocused && showBarberoResults && barberoSearchTerm.trim() !== "") && (
                            <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
                              {(() => {
                                const query = normalizeSearchText(barberoSearchTerm);
                                const filteredResults = barberos
                                  .filter(b => (b as any).estado === true || b.status === 'active')
                                  .filter((b) => {
                                    const searchableText = normalizeSearchText([
                                      b.id,
                                      b.nombre,
                                      b.apellido,
                                      b.tipoDocumento,
                                      b.documento,
                                      b.correo,
                                      b.telefono,
                                      b.direccion,
                                      b.barrio,
                                      b.rol,
                                      b.especialidad,
                                    ].join(" "));
                                    return searchableText.includes(query);
                                  })
                                  .slice(0, 50);

                                if (filteredResults.length === 0) {
                                  return (
                                    <div className="p-4 text-center text-gray-lightest italic">
                                      No se encontraron barberos que coincidan.
                                    </div>
                                  );
                                }

                                return filteredResults.map((barbero) => (
                                  <div
                                    key={barbero.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setNuevaEntrega({ ...nuevaEntrega, barberoSeleccionado: Number(barbero.id ?? 0) });
                                      setBarberoSearchTerm(
                                        `${getFullName(barbero.nombre, barbero.apellido) || ""}${barbero.documento ? ` — CC ${barbero.documento}` : ""}`
                                      );
                                      setShowBarberoResults(false);
                                      if (showEntregaFormErrors) setShowEntregaFormErrors(false);
                                    }}
                                    onClick={() => {
                                      setNuevaEntrega({ ...nuevaEntrega, barberoSeleccionado: Number(barbero.id ?? 0) });
                                      setBarberoSearchTerm(
                                        `${getFullName(barbero.nombre, barbero.apellido) || ""}${barbero.documento ? ` — CC ${barbero.documento}` : ""}`
                                      );
                                      setShowBarberoResults(false);
                                      if (showEntregaFormErrors) setShowEntregaFormErrors(false);
                                    }}
                                    className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer group"
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="text-white-primary font-medium text-sm group-hover:text-orange-secondary transition-colors">
                                          {getFullName(barbero.nombre, barbero.apellido) || "Sin nombre"}
                                        </p>
                                        <p className="text-[10px] text-gray-lightest">
                                          {barbero.documento || "Sin documento"} · {barbero.correo || "Sin correo"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                        {showEntregaFormErrors && !nuevaEntrega.barberoSeleccionado && (
                          <p className="text-xs text-red-400 mt-1">Debes seleccionar un barbero del buscador.</p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white-primary">Agregar Productos</h3>

                        <div ref={addProductoRowRef} className="grid grid-cols-3 gap-4">
                          <div className="space-y-2 relative">
                            <Label className="text-white-primary flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4 text-orange-primary" />
                              Producto *
                            </Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                              <Input
                                ref={productoInputRef}
                                placeholder="Escribe para buscar un producto..."
                                value={insumoSearchTerm}
                                onChange={(e) => {
                                  setInsumoSearchTerm(e.target.value);
                                  setShowInsumoResults(true);
                                  setInsumoSeleccionado(0);
                                }}
                                onFocus={() => {
                                  setInsumoSearchFocused(true);
                                  setShowInsumoResults(true);
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setInsumoSearchFocused(false);
                                    setShowInsumoResults(false);
                                  }, 120);
                                }}
                                className={`elegante-input pl-11 pr-10 w-full ${showAddInsumoErrors && !insumoSeleccionado ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                              />
                              {insumoSearchTerm && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInsumoSearchTerm("");
                                    setInsumoSeleccionado(0);
                                    setShowInsumoResults(false);
                                  }}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white-primary z-10"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}

                              {(insumoSearchFocused && showInsumoResults && insumoSearchTerm.trim() !== "") && (
                                <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
                                  {(() => {
                                    const query = normalizeSearchText(insumoSearchTerm);
                                    const filteredResults = insumos
                                      .filter(i => canBeUsedInService(i as any))
                                      .filter(i =>
                                        normalizeSearchText([
                                             i.id,
                                          i.nombre,
                                          i.categoria,
                                          i.stock,
                                          i.stockInsumos,
                                          i.stockVentas
                                        ].join(" ")).includes(query)
                                      )
                                      .slice(0, 20);

                                    if (filteredResults.length === 0) {
                                      return (
                                        <div className="p-4 text-center text-gray-lightest italic">
                                          Sin resultados.
                                        </div>
                                      );
                                    }

                                    return filteredResults.map((insumo) => (
                                      <div
                                        key={insumo.id}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          const sid = Number(insumo.id);
                                          setInsumoSeleccionado(sid);
                                          setInsumoSearchTerm(insumo.nombre);
                                          setShowInsumoResults(false);
                                          if (showAddInsumoErrors) setShowAddInsumoErrors(false);

                                          // Ajustar cantidad si ya había algo escrito
                                          const stockDispTotal = insumo.stockInsumos ?? insumo.stock;
                                          const yaAgregado = (nuevaEntrega.insumos || []).find(it => Number(it.id) === sid);
                                          const stockDisponibleReal = Math.max(0, (stockDispTotal ?? 0) - (yaAgregado?.cantidad || 0));

                                          if (cantidadInsumo > stockDisponibleReal) {
                                            error('Cantidad ajustada', `Se ajustó automáticamente al stock máximo disponible: ${stockDisponibleReal}`);
                                            setCantidadInsumo(stockDisponibleReal);
                                            setCantidadInsumoInput(String(stockDisponibleReal));
                                          }
                                        }}
                                        onClick={() => {
                                          const sid = Number(insumo.id);
                                          setInsumoSeleccionado(sid);
                                          setInsumoSearchTerm(insumo.nombre);
                                          setShowInsumoResults(false);
                                          if (showAddInsumoErrors) setShowAddInsumoErrors(false);

                                          // Ajustar cantidad si ya había algo escrito
                                          const stockDispTotal = insumo.stockInsumos ?? insumo.stock;
                                          const yaAgregado = (nuevaEntrega.insumos || []).find(it => Number(it.id) === sid);
                                          const stockDisponibleReal = Math.max(0, (stockDispTotal ?? 0) - (yaAgregado?.cantidad || 0));

                                          if (cantidadInsumo > stockDisponibleReal) {
                                            error('Cantidad ajustada', `Se ajustó automáticamente al stock máximo disponible: ${stockDisponibleReal}`);
                                            setCantidadInsumo(stockDisponibleReal);
                                            setCantidadInsumoInput(String(stockDisponibleReal));
                                          }
                                        }}
                                        className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer group"
                                      >
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <p className="text-white-primary font-medium text-sm group-hover:text-orange-secondary transition-colors">
                                              {insumo.nombre}
                                            </p>
                                            <p className="text-[10px] text-gray-lightest">
                                              {insumo.categoria || 'Sin categoría'}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[9px] text-gray-lightest leading-none mb-1">Stock insumos</p>
                                            <p className={`text-xs font-bold ${(((insumo.stockInsumos ?? insumo.stock) ?? 0) > 0) ? 'text-blue-400' : 'text-red-400'}`}>
                                              {insumo.stockInsumos !== undefined ? insumo.stockInsumos : insumo.stock}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              )}
                            </div>
                            {showAddInsumoErrors && !insumoSeleccionado && (
                              <p className="text-xs text-red-400 mt-1">Debes seleccionar un producto del buscador.</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-white-primary flex items-center gap-2">
                              <Hash className="w-4 h-4 text-orange-primary" />
                              Cantidad *
                            </Label>
                            <Input
                              ref={cantidadInputRef}
                              type="number"
                              min="1"
                              className={`elegante-input no-spin ${showAddInsumoErrors && (!cantidadInsumoInput.trim() || !cantidadInsumo || cantidadInsumo <= 0) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                              placeholder="Cantidad"
                              value={cantidadInsumoInput}
                              onKeyDown={(e) => {
                                if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') {
                                  e.preventDefault();
                                }
                              }}
                              onPaste={(e) => {
                                const text = e.clipboardData?.getData('text') || '';
                                if (/[^\d]/.test(text) || text.length > 2) {
                                  e.preventDefault();
                                  const cleaned = text.replace(/\D+/g, '').slice(0, 2);
                                  setCantidadInsumoInput(cleaned);
                                  const n = Number(cleaned || 0);
                                  setCantidadInsumo(Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n)));
                                  if (showAddInsumoErrors) setShowAddInsumoErrors(false);
                                }
                              }}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D+/g, '').slice(0, 2);
                                let n = Number(cleaned || 0);
                                let valorFinal = Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n));

                                // Aplicar ajuste automático si hay un producto seleccionado
                                if (insumoSeleccionado > 0) {
                                  const selected = insumos.find(i => Number(i.id) === Number(insumoSeleccionado));
                                  // Consideramos el stock total disponible menos lo que ya se agregó a la lista (opcional, pero mejor)
                                  const yaAgregado = (nuevaEntrega.insumos || []).find(it => Number(it.id) === Number(insumoSeleccionado));
                                  const stockDispTotal = selected ? (selected.stockInsumos ?? selected.stock) : Number.POSITIVE_INFINITY;
                                  const stockDisponibleReal = Math.max(0, stockDispTotal - (yaAgregado?.cantidad || 0));

                                  if (valorFinal > stockDisponibleReal) {
                                    error('Cantidad ajustada', `Se ajustó automáticamente al stock máximo disponible: ${stockDisponibleReal}`);
                                    valorFinal = stockDisponibleReal;
                                  }
                                }

                                setCantidadInsumoInput(String(valorFinal));
                                setCantidadInsumo(valorFinal);
                                if (showAddInsumoErrors) setShowAddInsumoErrors(false);
                              }}
                            />
                            {(() => {
                              const selected = insumos.find(i => Number(i.id) === Number(insumoSeleccionado));
                              const stockDisp = selected ? (selected.stockInsumos ?? selected.stock) : 0;
                              const qty = Number(cantidadInsumoInput || 0);
                              const existente = (() => {
                                if (!selected) return 0;
                                const yaAgregado = (nuevaEntrega.insumos || []).find(i => Number(i.id) === Number((selected as any).id));
                                return Number(yaAgregado?.cantidad || 0);
                              })();
                              const sumaDeseada = existente + (Number.isFinite(qty) ? qty : 0);
                              const showCantidadInsumoError = showAddInsumoErrors && (!cantidadInsumoInput.trim() || !cantidadInsumo || cantidadInsumo <= 0);
                              const isStockExceeded = !!selected && sumaDeseada > stockDisp;
                              const maxAdicional = Math.max(0, stockDisp - existente);
                              return (
                                <>
                                  {showCantidadInsumoError && !isStockExceeded && (
                                    <p className="text-xs text-red-400">Ingresa una cantidad válida.</p>
                                  )}
                                  {isStockExceeded && (
                                    <p className="text-xs text-red-500 font-bold animate-pulse mt-1">Stock maximo excedido ( maximo adicional: {maxAdicional} )</p>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-white-primary">ㅤ</Label>
                            <button
                              type="button"
                              className="elegante-button-primary w-full"
                              onClick={agregarInsumo}
                            >
                              Agregar producto
                            </button>
                          </div>
                        </div>

                        

                        {showEntregaFormErrors && (nuevaEntrega.insumos || []).length === 0 && (
                          <p className="text-xs text-red-400">Debes agregar al menos un producto.</p>
                        )}
                      </div>
                    </div>

                    <div
                      ref={productosAgregadosRef}
                      className={`space-y-6 ${(showEntregaFormErrors && (nuevaEntrega.insumos || []).length === 0) ? `border border-red-500/60 rounded-lg p-3 ${shakeClass}` : ''}`}
                    >
                      <div>
                        <h4 className="text-white-primary font-semibold mb-3">Productos agregados</h4>
                        <div className="space-y-2 max-h-52 overflow-y-auto">
                          {(nuevaEntrega.insumos || []).length === 0 ? (
                            <p className="text-gray-lightest text-center py-4">No hay productos agregados</p>
                          ) : (
                            (nuevaEntrega.insumos || []).map((insumo) => (
                              <div key={insumo.id} className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20">
                                <div className="flex items-center gap-4 flex-nowrap min-w-0">
                                  <div className="shrink-0 w-6" aria-hidden />
                                  <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                    <ImageRenderer
                                      url={
                                        insumo.imagen ||
                                        (insumo as any).imagenProduc ||
                                        (insumo as any).ImagenProduc ||
                                        (insumo as any).imagenUrl ||
                                        ''
                                      }
                                      alt={insumo.nombre}
                                      className="w-full h-full border-0 bg-transparent"
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1 shrink flex flex-col items-center justify-center">
                                    <span
                                      className="text-white-primary font-semibold text-base truncate block text-center w-full"
                                      title={insumo.nombre}
                                    >
                                      {insumo.nombre}
                                    </span>
                                    <span className="text-[11px] text-gray-400 truncate block text-center w-full">
                                      {(insumo as any).categoria || 'Sin categoría'}
                                    </span>
                                  </div>

                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <label className="text-[11px] text-gray-400 font-normal">Cantidad</label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={getTarjetaInputEntrega(insumo as any)}
                                      onChange={(e) => actualizarTarjetaInputEntrega(insumo.id, e.target.value)}
                                      className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5"
                                    />
                                  </div>

                                  <button
                                    onClick={() => eliminarInsumo(insumo.id)}
                                    className="shrink-0 p-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                                    title="Eliminar producto"
                                    type="button"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-white-primary font-semibold mb-4">Resumen</h4>
                        <div className="bg-gray-darker p-4 rounded-lg border border-gray-dark">
                          <div className="mt-1">
                            {(nuevaEntrega.insumos || []).length === 0 ? (
                              <p className="text-gray-lightest">No hay productos agregados</p>
                            ) : null}
                          </div>
                          <div className="pt-3 mt-3 border-t border-gray-medium flex items-center justify-between">
                            <span className="text-gray-lightest">Total productos</span>
                            <span className="text-orange-primary font-semibold text-base tracking-wide">
                              {(nuevaEntrega.insumos || []).reduce((sum, insumo) => sum + insumo.cantidad, 0)} unidades
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-dark">
                    <button
                      onClick={() => {
                        setIsDialogOpen(false);
                        setBarberoSearchTerm("");
                        setShowBarberoResults(false);
                        setInsumoSearchTerm("");
                        setShowInsumoResults(false);
                        setShowEntregaFormErrors(false);
                        setShowAddInsumoErrors(false);
                        setCantidadInsumo(0);
                        setCantidadInsumoInput('');
                        setTarjetaInputsEntrega({});
                      }}
                      className="elegante-button-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateEntrega}
                      className="elegante-button-primary flex items-center gap-2"
                      disabled={creatingDelivery}
                    >
                      {creatingDelivery ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Registrando...
                        </>
                      ) : (
                        'Registrar Entrega'
                      )}
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar por número, documento, nombre, responsable, insumos, fecha o estado..."
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
            recordsText={`Mostrando ${displayedEntregas.length} de ${filteredEntregas.length} entregas`}
            recordsPlacement="left"
          />

          {/* Tabla de entregas */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={loading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                <tr className="border-b border-gray-dark">
                  <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Número</th>
                  <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Documento</th>
                  <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Nombre</th>
                  <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Total Insumos</th>
                  <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Fecha</th>
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableLoadingStateRow
                    colSpan={7}
                    title="Cargando entregas..."
                  />
                ) : displayedEntregas.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={7}
                    title="No se encontraron entregas"
                    description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                    onReload={() => window.location.reload()}
                  />
                ) : displayedEntregas.map((entrega) => (
                  <tr key={entrega.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-primary" />
                        <span className="text-gray-lighter">
                          {String(entrega.id)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-lighter">
                          {`CC ${String((entrega as any).barberoDocumento || getBarberoDocumentoById((entrega as any).barberoId) || '')}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-dark border-2 border-gray-medium flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-lightest" />
                        </div>
                        <span className="text-gray-lighter">
                          {getBarberoNombreById((entrega as any).barberoId)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-lighter">{entrega.cantidadTotal} unidades</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-lighter">{formatDate(entrega.fecha || generateCurrentDate())}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs ${getEstadoColor(entrega.estado || '')}`}>
                        {getEstadoDisplay(entrega.estado || '')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => !isAnuladaEstado(entrega.estado || '') && handleAnularClick(entrega)}
                            disabled={isAnuladaEstado(entrega.estado || '')}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={isAnuladaEstado(entrega.estado || '') ? 'Entrega anulada' : 'Anular entrega'}
                          >
                            <Ban className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                          </button>
                        <button
                          onClick={() => handleViewDetails(entrega)}
                          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => generateIndividualEntregaPDF(entrega)}
                          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                          title="Descargar PDF"
                        >
                          <FileDown className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-8 bg-gray-darker border-gray-dark text-gray-lightest">
                      <SelectValue placeholder={itemsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-darkest border-gray-dark text-gray-lightest">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-dark hover:bg-gray-darker disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-lightest" />
                </button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded text-sm transition-colors ${currentPage === pageNum
                          ? 'bg-orange-primary text-black-primary font-medium'
                          : 'border border-gray-dark hover:bg-gray-darker text-gray-lightest'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-dark hover:bg-gray-darker disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4 text-gray-lightest" />
                </button>
              </div>
            </div>
        </div>

        {/* Modal de detalles de entrega */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white-primary">Detalles de Entrega</DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Información completa de la entrega
              </DialogDescription>
            </DialogHeader>

            {selectedEntrega && (
              <div className="space-y-6 py-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-primary" />
                        Número de Entrega (Automático)
                      </Label>
                      <Input
                        value={String((selectedEntrega as any).documento || selectedEntrega.id || '###')}
                        disabled
                        readOnly
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-primary" />
                        Fecha de Registro
                      </Label>
                      <Input
                        value={formatDate((selectedEntrega as any).fechaRegistro || selectedEntrega.fecha || generateCurrentDate())}
                        disabled
                        readOnly
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <Label className="text-white-primary flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-orange-primary" />
                      Barbero
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                      <Input
                        value={getBarberoDisplay(selectedEntrega)}
                        disabled
                        readOnly
                        className="elegante-input pl-11 w-full bg-gray-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white-primary flex items-center gap-2">
                      Responsable
                    </Label>
                    <Input
                      value={getResponsableDisplay(selectedEntrega)}
                      disabled
                      className="elegante-input bg-gray-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white-primary flex items-center gap-2">
                      Estado
                    </Label>
                    <div className="h-10 flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor((selectedEntrega as any).estado || '')}`}>
                        {getEstadoDisplay((selectedEntrega as any).estado || '')}
                      </span>
                    </div>
                  </div>
                </div>

                {(() => {
                  const detalleInsumos = getDetalleInsumosNormalized(selectedEntrega);
                  const totalCantidad = detalleInsumos.reduce((sum, i) => sum + (i.cantidad || 0), 0);

                  return (
                    <div className="space-y-6">
                      <div className="mt-8">
                        <div className="bg-gray-darker border border-gray-dark rounded-xl overflow-hidden">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-primary/10 flex items-center justify-center border border-orange-primary/20">
                                  <Package className="w-5 h-5 text-orange-primary" />
                                </div>
                                <div>
                                  <h4 className="text-white-primary font-bold text-lg">Resumen</h4>
                                  <p className="text-xs text-gray-lighter">Productos agregados a la entrega</p>
                                </div>
                              </div>
                              <div className="bg-gray-dark/50 px-3 py-1.5 rounded-full border border-gray-medium">
                                <span className="text-xs font-medium text-gray-lightest">
                                  {detalleInsumos.length} {detalleInsumos.length === 1 ? 'producto único' : 'productos únicos'}
                                </span>
                              </div>
                            </div>

                            {detalleInsumos.length === 0 ? (
                              <div className="text-center py-10 border-2 border-dashed border-gray-dark rounded-xl bg-gray-darkest/30">
                                <Package className="w-12 h-12 mx-auto mb-3 text-gray-lightest opacity-50" />
                                <p className="text-gray-lightest text-sm">No hay productos en esta entrega</p>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-gray-lighter font-semibold mb-3 ml-1"></p>
                                  <div className="flex flex-wrap gap-3">
                                    {detalleInsumos.map((item) => (
                                      <div 
                                        key={item.id}
                                        onClick={() => { setProductoDetalle(item); setIsProductoDetalleOpen(true); }}
                                        className="group relative flex items-center gap-3 bg-gray-darker/50 border border-gray-dark hover:border-orange-primary/30 rounded-xl pr-4 pl-2 py-2 transition-all duration-300 hover:bg-gray-dark/50 cursor-pointer"
                                      >
                                        <div className="relative shrink-0">
                                          <div className="w-10 h-10 rounded-lg bg-gray-dark overflow-hidden flex items-center justify-center">
                                            {item.imagen ? (
                                              <ImageRenderer
                                                url={item.imagen}
                                                alt={item.nombre}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <span className="text-[11px] font-bold text-gray-300">
                                                {String(item.nombre || 'N').trim().charAt(0).toUpperCase()}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-col max-w-[140px]">
                                          <span className="text-xs font-semibold text-white-primary truncate group-hover:text-orange-primary transition-colors">
                                            {item.nombre}
                                          </span>
                                          <span className="text-[10px] text-gray-lighter truncate">
                                            {item.categoria}
                                          </span>
                                        </div>
                                        <div className="ml-auto">
                                          <span className="px-2 py-0.5 rounded-md bg-orange-primary text-black-primary text-[11px] font-bold tabular-nums">
                                            {item.cantidad}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-dark">
                                  <div className="bg-gray-darker/40 rounded-xl p-4 border border-gray-dark flex flex-col justify-between hover:border-gray-medium transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                      <p className="text-[10px] text-gray-lighter uppercase tracking-wider font-semibold">Total Unidades</p>
                                    </div>
                                    <div className="flex items-end gap-1.5">
                                      <span className="text-3xl font-bold text-white-primary tracking-tight">{totalCantidad}</span>
                                      <span className="text-xs text-gray-lighter font-medium mb-1.5">unds</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-dark">
              <button
                onClick={() => setIsDetailDialogOpen(false)}
                className="elegante-button-secondary"
              >
                Cancelar
              </button>
              {selectedEntrega && (
                <button
                  onClick={() => handleAnularClick(selectedEntrega)}
                  className={`elegante-button-primary ${isAnuladaEstado(String((selectedEntrega as any).estado || '')) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isAnuladaEstado(String((selectedEntrega as any).estado || ''))}
                  title={isAnuladaEstado(String((selectedEntrega as any).estado || '')) ? 'Entrega anulada' : 'Anular entrega'}
                >
                  {isAnuladaEstado(String((selectedEntrega as any).estado || '')) ? 'Entrega Anulada' : 'Anular Entrega'}
                </button>
              )}
                <button
                  onClick={() => generateIndividualEntregaPDF(selectedEntrega)}
                  className="elegante-button-primary flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Descargar PDF
                </button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isProductoDetalleOpen} onOpenChange={setIsProductoDetalleOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white-primary flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-primary" />
                Detalle del Producto
              </DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Información del producto seleccionado
              </DialogDescription>
            </DialogHeader>
            {productoDetalle && (() => {
              const insumoActual = insumos.find(i => Number(i.id) === Number(productoDetalle.id));
              const stockVentasActual = Number(insumoActual?.stockVentas ?? 0);
              const stockInsumosActual = Number(insumoActual?.stockInsumos ?? insumoActual?.stock ?? 0);
              const cantidadEntrega = Number(productoDetalle.cantidad || 0);
              return (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg bg-gray-darker overflow-hidden flex items-center justify-center border border-gray-dark">
                      {productoDetalle.imagen ? (
                        <ImageRenderer url={productoDetalle.imagen} alt={productoDetalle.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-gray-300">
                          {String(productoDetalle.nombre || 'N').trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark mb-2 truncate">
                        {productoDetalle.nombre}
                      </div>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark truncate">
                        {productoDetalle.categoria || 'Sin categoría'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-white-primary text-xs">Cantidad de entrega</Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        {cantidadEntrega}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white-primary text-xs">Stock Ventas actual</Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        {stockVentasActual}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white-primary text-xs">Stock Insumos actual</Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        {stockInsumosActual}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
              <button
                onClick={() => setIsProductoDetalleOpen(false)}
                className="elegante-button-secondary px-6"
              >
                Cerrar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <DoubleConfirmationContainer />
      <AlertContainer />
    </>
  );
}
