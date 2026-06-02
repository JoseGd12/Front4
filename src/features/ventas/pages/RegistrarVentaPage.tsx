import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import {
  DollarSign,
  Search,
  Users,
  Calendar,
  Package,
  X,
  CreditCard,
  Receipt,
  Hash,
  Calculator,
  FileText,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { Checkbox } from "../../../shared/components/ui/checkbox";
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
import { servicioService, Servicio } from "../../servicios/services/servicioService";
import { productoService, ApiProducto } from "../../productos/services/productos";
import { apiService, ApiUser, Paquete } from "../../../shared/services/api";
import { clientesService, ClienteAPI } from "../../clientes/services/clientesService";
import { AppRole } from "../../auth/services/authSyncService";
import { useAuth } from "../../../shared/contexts/AuthContext";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { FormSection } from "../../../shared/components/ui/FormSection";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { DetailPanel } from "../components/DetailPanel";
import { barberosService, Barbero as ApiBarbero } from "../../administracion/services/barberosService";
import { creditoBarberoService } from "../../credito-barberos/services/creditoBarberoService";


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

interface PersonaBuscador {
  tipo: 'cliente' | 'barbero';
  id: number;
  nombre: string;
  documento: string;
  saldoAFavor?: number;
  rol?: string;
}

interface RegistrarVentaPageProps {
  onBack: () => void;
}

export function RegistrarVentaPage({ onBack }: RegistrarVentaPageProps) {
  const { user } = useAuth();
  const {
    created,
    error: showErrorAlert,
    AlertContainer,
  } = useCustomAlert();

  // Data loading state
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [productosAPI, setProductosAPI] = useState<ApiProducto[]>([]);
  const [clientesAPI, setClientesAPI] = useState<ClienteAPI[]>([]);
  const [barberosAPI, setBarberosAPI] = useState<ApiBarbero[]>([]);
  const [ventasCount, setVentasCount] = useState(0);

  const inicialNuevaVenta = {
    clienteId: null as number | null,
    clienteDocumento: "",
    clienteNombreInvitado: "",
    fechaCreacion: "",
    tipoVenta: "Venta Invitado",
    metodoPago: "",
    barberoId: null as number | null,
    barberoNombre: "",
    porcentajeDescuento: 0,
    usarSaldoAFavor: false,
    montoSaldoUsado: 0,
    garantiaMeses: 0,
    productos: [] as {
      id: string;
      nombre: string;
      cantidad: number;
      precio: number;
      imagen?: string;
      categoria?: string;
    }[],
  };

  // Form state
  const [nuevaVenta, setNuevaVenta] = useState(inicialNuevaVenta);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidadProducto] = useState(1); // fixed default — field removed from UI
  const [porcentajeDescuentoInput, setPorcentajeDescuentoInput] = useState("");
  const [showDiscountWarning, setShowDiscountWarning] = useState(false);
  const [showNegativeDiscountWarning, setShowNegativeDiscountWarning] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState("");
  const [serviciosAgregados, setServiciosAgregados] = useState<
    Array<{
      id: string;
      nombre: string;
      precio: number;
      cantidad: number;
      imagen?: string;
    }>
  >([]);
  const [tarjetaProductoInputs, setTarjetaProductoInputs] = useState<
    Record<string, { cantidad?: string; precio?: string }>
  >({});
  const [tarjetaServicioInputs, setTarjetaServicioInputs] = useState<
    Record<string, { cantidad?: string; precio?: string }>
  >({});

  // Search state
  const [seleccionadoEsBarbero, setSeleccionadoEsBarbero] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [barberoSearchTerm, setBarberoSearchTerm] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");

  // Plazo crédito barbero: solo aplica en la primera venta de un ciclo nuevo
  const [plazoDias, setPlazoDias] = useState<7 | 14>(7);
  const [tieneCicloActivo, setTieneCicloActivo] = useState(false);
  const [checkingCiclo, setCheckingCiclo] = useState(false);
  const [barberoEsBloqueado, setBarberoEsBloqueado] = useState(false);
  const [estadoCredito, setEstadoCredito] = useState<string | null>(null);

  // Validation
  const [showVentaFormErrors, setShowVentaFormErrors] = useState(false);
  const [showAddProductoErrors, setShowAddProductoErrors] = useState(false);
  const [showAddServicioErrors, setShowAddServicioErrors] = useState(false);
  const [ventaValidationAttempt, setVentaValidationAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const clearValidationErrors = () => {
    if (showVentaFormErrors) setShowVentaFormErrors(false);
    if (showAddProductoErrors) setShowAddProductoErrors(false);
    if (showAddServicioErrors) setShowAddServicioErrors(false);
  };

  // Verificar ciclo de crédito del barbero: bloqueo y estado del ciclo
  useEffect(() => {
    const barberoId = seleccionadoEsBarbero ? Number(nuevaVenta.clienteId) : null;

    if (!barberoId) {
      setTieneCicloActivo(false);
      setBarberoEsBloqueado(false);
      setEstadoCredito(null);
      return;
    }

    setCheckingCiclo(true);
    creditoBarberoService.getByBarbero(barberoId)
      .then(credito => {
        const estado = (credito.estado || "").toLowerCase();
        const bloqueado = estado.startsWith("bloqueado");
        const cicloActivo = estado === "activo" || bloqueado;
        setTieneCicloActivo(cicloActivo && nuevaVenta.metodoPago === "Crédito");
        setBarberoEsBloqueado(bloqueado);
        setEstadoCredito(credito.estado || null);
      })
      .catch(() => {
        setTieneCicloActivo(false);
        setBarberoEsBloqueado(false);
        setEstadoCredito(null);
      })
      .finally(() => setCheckingCiclo(false));
  }, [nuevaVenta.clienteId, seleccionadoEsBarbero]);

  const generateCurrentDate = () => {
    return new Date().toISOString().split("T")[0] || "";
  };

  // Load data on mount
  useEffect(() => {
    loadData();
    setNuevaVenta((prev) => ({
      ...prev,
      fechaCreacion: generateCurrentDate(),
    }));
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        ventasData,
        serviciosData,
        productosData,
        usuariosData,
        paquetesData,
        clientesData,
      ] = await Promise.all([
        ventaService.getVentas().catch(() => []),
        servicioService.getServicios().catch(() => []),
        productoService.getProductos().catch(() => []),
        apiService.getUsuarios().catch(() => []),
        apiService.getPaquetes().catch(() => []),
        clientesService.getClientes().catch(() => []),
      ]);

      const maxNumVenta = Array.isArray(ventasData) && ventasData.length > 0
        ? Math.max(...ventasData.map((v: any) => Number(v.numeroVenta || v.id) || 0))
        : 0;
      setVentasCount(maxNumVenta);

      // Saldo real (devoluciones - saldoUsado en ventas) directo desde la API
      const clientesActivosRaw = (clientesData || []).filter(
        (c: any) => c.estado === true
      );
      const saldoMap = await clientesService.getSaldosDisponibles(
        clientesActivosRaw.map((c: any) => Number(c.id)).filter((n: number) => n > 0)
      );
      const clientesActivos = clientesActivosRaw.map((cliente: any) => ({
        ...cliente,
        saldoAFavor: saldoMap.get(Number(cliente.id)) || 0,
      }));
      setClientesAPI(clientesActivos);
      setServicios((serviciosData || []).filter((s) => s.estado === true));
      setPaquetes((paquetesData || []).filter((p) => p.activo === true));
      setProductosAPI((productosData || []).filter((p) => p.activo === true));

      // Barberos - Usar barberosService para obtener el BarberoId real
      const barberosResponse = await barberosService.getBarberos().catch(() => []);
      const barberos = Array.isArray(barberosResponse)
        ? barberosResponse.map(b => barberosService.mapApiToComponent(b))
        : [];

      setBarberosAPI(barberos);
    } catch (err: any) {
      console.error("Error cargando datos:", err);
      showErrorAlert(
        "Error al cargar datos",
        "No se pudieron cargar los datos. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  // Computed values
  const numeroVenta = useMemo(() => {
    return ventasCount + 1;
  }, [ventasCount]);

  const shakeClass =
    ventaValidationAttempt % 2 === 0
      ? "input-required-shake-a"
      : "input-required-shake-b";

  const noItemsAgregados =
    (nuevaVenta.productos?.length || 0) === 0 &&
    serviciosAgregados.length === 0;

  const serviciosDisponibles = useMemo(() => {
    const serviciosNombres = servicios
      .map((s) => s.nombre)
      .filter(Boolean);
    const paquetesNombres = paquetes
      .map((p) => `[PAQUETE] ${p.nombre}`)
      .filter(Boolean);
    const combinado = [...serviciosNombres, ...paquetesNombres].sort();
    const nombresAgregados = new Set(
      serviciosAgregados.map((s) => s.nombre)
    );
    const filtrado = combinado.filter((n) => !nombresAgregados.has(n));
    if (filtrado.length === 0 && combinado.length === 0) {
      return [
        "Corte Clásico",
        "Barba Completa",
        "Corte + Barba",
        "Tinte Cabello",
        "Tratamiento Capilar",
      ].filter((n) => !nombresAgregados.has(n));
    }
    return filtrado;
  }, [servicios, paquetes, serviciosAgregados]);

  const clientesDisponibles = useMemo(() => {
    return clientesAPI
      .map((c) => ({
        nombre: `${c.nombre || ""} ${c.apellido || ""}`.trim(),
        documento: c.documento || "",
        id: Number(c.id),
        saldoAFavor: Number((c as any).saldoAFavor || 0),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [clientesAPI]);

  const personasDisponibles = useMemo((): PersonaBuscador[] => {
    const clientes: PersonaBuscador[] = clientesDisponibles.map((c) => ({
      tipo: 'cliente',
      id: c.id,
      nombre: c.nombre,
      documento: c.documento,
      saldoAFavor: c.saldoAFavor,
    }));
    const barberos: PersonaBuscador[] = barberosAPI.map((b: any) => ({
      tipo: 'barbero',
      id: Number(b.id),
      nombre: `${b.nombre} ${b.apellido || ""}`.trim(),
      documento: b.documento || "",
      rol: b.rol || "Barbero",
    }));
    return [...clientes, ...barberos].sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [clientesDisponibles, barberosAPI]);

  const isStockExceeded = useMemo(() => {
    if (!productoSeleccionado || cantidadProducto <= 0) return false;
    const producto = productosAPI.find(
      (p) => p.id.toString() === productoSeleccionado
    );
    if (!producto) return false;
    const yaAgregado = (nuevaVenta.productos || []).find(
      (p) => p.id === productoSeleccionado
    );
    const cantYaAgregada = yaAgregado ? yaAgregado.cantidad : 0;
    return cantidadProducto + cantYaAgregada > (producto.stock ?? producto.cantidad ?? 0);
  }, [productoSeleccionado, cantidadProducto, nuevaVenta.productos, productosAPI]);

  // Calculations
  const calcularSubtotal = () => {
    let subtotal = 0;
    if (nuevaVenta.productos && Array.isArray(nuevaVenta.productos)) {
      subtotal += nuevaVenta.productos.reduce(
        (total, producto) => total + producto.precio * producto.cantidad,
        0
      );
    }
    serviciosAgregados.forEach((s) => {
      subtotal += s.precio * s.cantidad;
    });
    return subtotal;
  };

  const calcularDescuento = (subtotal: number) => {
    return subtotal * (nuevaVenta.porcentajeDescuento / 100);
  };

  const calcularIva = (_subtotal: number) => {
    return 0;
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
    const saldoDisponible =
      clientesDisponibles.find((c) => c.id === Number(nuevaVenta.clienteId))
        ?.saldoAFavor || 0;
    return Math.min(totalSinSaldo, saldoDisponible);
  };

  const subtotalProductos = useMemo(() => {
    return (nuevaVenta.productos || []).reduce(
      (sum, p) => sum + p.precio * p.cantidad,
      0
    );
  }, [nuevaVenta.productos]);

  const subtotalServicios = useMemo(() => {
    return serviciosAgregados.reduce(
      (sum, s) => sum + s.precio * s.cantidad,
      0
    );
  }, [serviciosAgregados]);

  const canUseSaldoPago = (): boolean => {
    const cliente = clientesDisponibles.find(
      (c) => c.id === Number(nuevaVenta.clienteId)
    );
    const saldoDisponible = cliente?.saldoAFavor || 0;
    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento(subtotal);
    const totalSinSaldo = subtotal + calcularIva(subtotal) - descuento;
    return saldoDisponible > 0 && saldoDisponible >= totalSinSaldo;
  };

  const LIMITE_CREDITO = 200000;

  // Handlers
  const handleMetodoPagoChange = (value: string) => {
    if (value === "Saldo") {
      if (!nuevaVenta.clienteId) {
        showErrorAlert(
          "Cliente requerido",
          "Selecciona un cliente para usar Saldo."
        );
        return;
      }
      if (!canUseSaldoPago()) {
        showErrorAlert(
          "Saldo insuficiente",
          "El saldo no cubre el total de la venta."
        );
        return;
      }
      setNuevaVenta({
        ...nuevaVenta,
        metodoPago: "Saldo",
        usarSaldoAFavor: true,
      });
      return;
    }
    if (value === "Crédito") {
      // Limpiar servicios agregados: crédito barbero es solo para productos/insumos
      if (seleccionadoEsBarbero && serviciosAgregados.length > 0) {
        setServiciosAgregados([]);
        setServiceSearchTerm("");
        setServicioSeleccionado("");
      }
      const totalSinServicios = (nuevaVenta.productos || []).reduce(
        (sum, p) => sum + p.precio * p.cantidad, 0
      );
      if (totalSinServicios > LIMITE_CREDITO) {
        showErrorAlert(
          "Límite de crédito excedido",
          `El total de la venta ($${formatCurrency(totalSinServicios)}) supera el límite máximo de crédito de $${formatCurrency(LIMITE_CREDITO)}. Reduce el monto o elige otro método de pago.`
        );
        return;
      }
    }
    setNuevaVenta({ ...nuevaVenta, metodoPago: value, usarSaldoAFavor: false });
  };

  const handlePorcentajeDescuentoInputChange = (valor: string) => {
    // Bloquear el signo negativo directamente
    if (valor.includes('-')) {
      setShowNegativeDiscountWarning(true);
      return;
    }
    setShowNegativeDiscountWarning(false);
    if (valor.trim() === "") {
      setPorcentajeDescuentoInput("");
      setNuevaVenta({ ...nuevaVenta, porcentajeDescuento: 0 });
      setShowDiscountWarning(false);
      return;
    }
    const numero = Number(valor);
    if (!Number.isNaN(numero)) {
      if (numero < 0) {
        setShowNegativeDiscountWarning(true);
        return;
      } else if (numero > 100) {
        setPorcentajeDescuentoInput("100");
        setNuevaVenta({ ...nuevaVenta, porcentajeDescuento: 100 });
        setShowDiscountWarning(true);
      } else {
        setPorcentajeDescuentoInput(valor);
        setNuevaVenta({ ...nuevaVenta, porcentajeDescuento: numero });
        setShowDiscountWarning(false);
      }
    } else {
      setPorcentajeDescuentoInput(valor);
      setShowDiscountWarning(false);
    }
  };

  useEffect(() => {
    if (nuevaVenta.metodoPago === "Saldo") {
      if (!canUseSaldoPago()) {
        setNuevaVenta((prev) => ({
          ...prev,
          metodoPago: "",
          usarSaldoAFavor: false,
        }));
      }
    }
  }, [
    nuevaVenta.clienteId,
    nuevaVenta.productos,
    serviciosAgregados,
    nuevaVenta.porcentajeDescuento,
  ]);

  // Recalcular precios de productos ya agregados cuando cambia el tipo de persona
  // y limpiar método de pago "Crédito" si se cambia a cliente
  useEffect(() => {
    setNuevaVenta((prev) => {
      const metodoPagoLimpiado =
        !seleccionadoEsBarbero && prev.metodoPago === "Crédito"
          ? ""
          : prev.metodoPago;
      if (!prev.productos || prev.productos.length === 0)
        return { ...prev, metodoPago: metodoPagoLimpiado };
      const productosActualizados = prev.productos.map((p) => {
        const info = productosAPI.find((api) => api.id.toString() === p.id);
        if (!info) return p;
        const nuevoPrecio = seleccionadoEsBarbero
          ? (info.precioCompra || info.precioBase)
          : (info.precio || info.precioBase);
        return { ...p, precio: nuevoPrecio };
      });
      return { ...prev, productos: productosActualizados, metodoPago: metodoPagoLimpiado };
    });
    setTarjetaProductoInputs((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((productId) => {
        const info = productosAPI.find((api) => api.id.toString() === productId);
        if (!info) return;
        const nuevoPrecio = seleccionadoEsBarbero
          ? (info.precioCompra || info.precioBase)
          : (info.precio || info.precioBase);
        next[productId] = { ...next[productId], precio: String(nuevoPrecio) };
      });
      return next;
    });
  }, [seleccionadoEsBarbero, productosAPI]);

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      setShowAddProductoErrors(true);
      setVentaValidationAttempt((prev) => prev + 1);
      return;
    }
    const producto = productosAPI.find(
      (p) => p.id.toString() === productoSeleccionado
    );
    if (!producto) {
      setShowAddProductoErrors(true);
      setVentaValidationAttempt((prev) => prev + 1);
      return;
    }
    if (isStockExceeded) {
      setVentaValidationAttempt((prev) => prev + 1);
      return;
    }

    const productosActuales = nuevaVenta.productos || [];
    const existeProducto = productosActuales.find(
      (p) => p.id === producto.id.toString()
    );

    if (existeProducto) {
      const cantidadActualizada = existeProducto.cantidad + cantidadProducto;
      setNuevaVenta({
        ...nuevaVenta,
        productos: productosActuales.map((p) =>
          p.id === producto.id.toString()
            ? { ...p, cantidad: cantidadActualizada }
            : p
        ),
      });
      setTarjetaProductoInputs((prev) => ({
        ...prev,
        [producto.id.toString()]: {
          ...prev[producto.id.toString()],
          cantidad: String(cantidadActualizada),
        },
      }));
    } else {
      const precioFinal = seleccionadoEsBarbero
        ? (producto.precioCompra || producto.precioBase)
        : (producto.precio || producto.precioBase);
      setNuevaVenta({
        ...nuevaVenta,
        productos: [
          ...productosActuales,
          {
            id: producto.id.toString(),
            nombre: producto.nombre,
            cantidad: cantidadProducto,
            precio: precioFinal,
            imagen:
              (producto as ApiProducto).imagenProduc || "",
          },
        ],
      });
      setTarjetaProductoInputs((prev) => ({
        ...prev,
        [producto.id.toString()]: {
          cantidad: String(cantidadProducto),
          precio: String(precioFinal),
        },
      }));
    }

    setProductoSeleccionado("");
    setProductSearchTerm("");
    setShowAddProductoErrors(false);
    setShowVentaFormErrors(false);
  };

  const eliminarProducto = (productId: string) => {
    const productosActuales = nuevaVenta.productos || [];
    setNuevaVenta({
      ...nuevaVenta,
      productos: productosActuales.filter((p) => p.id !== productId),
    });
    setTarjetaProductoInputs((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const actualizarCantidadProducto = (
    productId: string,
    nuevaCantidad: number
  ) => {
    if (nuevaCantidad < 1) return;
    const productoInfo = productosAPI.find(
      (p) => p.id.toString() === productId
    );
    if (productoInfo && nuevaCantidad > (productoInfo.stock ?? productoInfo.cantidad ?? 0)) {
      showErrorAlert(
        "Stock insuficiente",
        `No se puede añadir una cantidad superior al stock disponible (${productoInfo.stock ?? productoInfo.cantidad ?? 0}).`
      );
      const cantAnterior =
        nuevaVenta.productos?.find((p) => p.id === productId)?.cantidad || 1;
      setTarjetaProductoInputs((prev) => ({
        ...prev,
        [productId]: { ...prev[productId], cantidad: String(cantAnterior) },
      }));
      return;
    }
    setNuevaVenta({
      ...nuevaVenta,
      productos: (nuevaVenta.productos || []).map((p) =>
        p.id === productId ? { ...p, cantidad: nuevaCantidad } : p
      ),
    });
    setTarjetaProductoInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], cantidad: String(nuevaCantidad) },
    }));
  };

  const actualizarPrecioProducto = (
    productId: string,
    nuevoPrecio: number
  ) => {
    if (nuevoPrecio < 0) return;
    setNuevaVenta({
      ...nuevaVenta,
      productos: (nuevaVenta.productos || []).map((p) =>
        p.id === productId ? { ...p, precio: nuevoPrecio } : p
      ),
    });
    setTarjetaProductoInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], precio: String(nuevoPrecio) },
    }));
  };

  const agregarServicio = () => {
    if (!servicioSeleccionado) {
      setShowAddServicioErrors(true);
      setVentaValidationAttempt((prev) => prev + 1);
      return;
    }

    let precioServicio = 0;
    let servicioId = "";
    let imagenServicio = "";

    if (servicioSeleccionado.startsWith("[PAQUETE] ")) {
      const nombreReal = servicioSeleccionado.replace("[PAQUETE] ", "");
      const paquete = paquetes.find((p) => p.nombre === nombreReal);
      if (paquete && paquete.precio) {
        precioServicio = paquete.precio;
        servicioId = `PAQ-${paquete.id}`;
        imagenServicio = String(
          (paquete as any)?.imagen || (paquete as any)?.imagenUrl || ""
        );
      }
    } else {
      const servicio = servicios.find(
        (s) => s.nombre === servicioSeleccionado
      );
      if (servicio && servicio.precio) {
        precioServicio = servicio.precio;
        servicioId = `SERV-${servicio.id}`;
        imagenServicio = String(
          (servicio as any)?.imagen ||
          (servicio as any)?.imagenServicio ||
          (servicio as any)?.imagenUrl ||
          ""
        );
      } else {
        const preciosFallback: { [key: string]: number } = {
          "Corte Clásico": 25000,
          "Barba Completa": 20000,
          "Corte + Barba": 40000,
          "Tinte Cabello": 80000,
          "Tratamiento Capilar": 35000,
        };
        precioServicio = preciosFallback[servicioSeleccionado] || 0;
        servicioId = `SERVPERS-${Date.now()}`;
      }
    }

    const existente = serviciosAgregados.find(
      (s) => s.nombre === servicioSeleccionado
    );
    if (existente) {
      const cantidadActualizada = existente.cantidad + 1;
      setServiciosAgregados(
        serviciosAgregados.map((s) =>
          s.nombre === servicioSeleccionado
            ? { ...s, cantidad: cantidadActualizada }
            : s
        )
      );
      setTarjetaServicioInputs((prev) => ({
        ...prev,
        [existente.id]: {
          ...prev[existente.id],
          cantidad: String(cantidadActualizada),
        },
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
          imagen: imagenServicio,
        },
      ]);
      setTarjetaServicioInputs((prev) => ({
        ...prev,
        [nuevoId]: { cantidad: "1", precio: String(precioServicio) },
      }));
    }

    setServicioSeleccionado("");
    setServiceSearchTerm("");
    setShowAddServicioErrors(false);
    setShowVentaFormErrors(false);
  };

  const eliminarServicio = (servicioId: string) => {
    setServiciosAgregados(
      serviciosAgregados.filter((s) => s.id !== servicioId)
    );
    setTarjetaServicioInputs((prev) => {
      const next = { ...prev };
      delete next[servicioId];
      return next;
    });
  };

  const actualizarPrecioServicio = (
    servicioId: string,
    nuevoPrecio: number
  ) => {
    setServiciosAgregados(
      serviciosAgregados.map((s) =>
        s.id === servicioId ? { ...s, precio: Math.max(0, nuevoPrecio) } : s
      )
    );
    setTarjetaServicioInputs((prev) => ({
      ...prev,
      [servicioId]: {
        ...prev[servicioId],
        precio: String(Math.max(0, nuevoPrecio)),
      },
    }));
  };

  const actualizarCantidadServicio = (
    servicioId: string,
    nuevaCantidad: number
  ) => {
    if (nuevaCantidad < 1) return;
    setServiciosAgregados(
      serviciosAgregados.map((s) =>
        s.id === servicioId ? { ...s, cantidad: nuevaCantidad } : s
      )
    );
    setTarjetaServicioInputs((prev) => ({
      ...prev,
      [servicioId]: {
        ...prev[servicioId],
        cantidad: String(nuevaCantidad),
      },
    }));
  };

  const getTarjetaProductoInput = (
    productId: string,
    campo: "cantidad" | "precio",
    fallback: number
  ) => {
    const visual = tarjetaProductoInputs[productId]?.[campo];
    if (visual !== undefined) return visual;
    return fallback > 0 ? String(fallback) : "";
  };

  const onTarjetaProductoInputChange = (
    productId: string,
    campo: "cantidad" | "precio",
    valor: string
  ) => {
    setTarjetaProductoInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [campo]: valor },
    }));
    if (valor.trim() === "") return;
    const n = Number(valor);
    if (Number.isNaN(n)) return;
    if (campo === "cantidad")
      actualizarCantidadProducto(productId, Math.max(1, Math.floor(n)));
    if (campo === "precio")
      actualizarPrecioProducto(productId, Math.max(0, n));
  };

  const getTarjetaServicioInput = (
    servicioId: string,
    campo: "cantidad" | "precio",
    fallback: number
  ) => {
    const visual = tarjetaServicioInputs[servicioId]?.[campo];
    if (visual !== undefined) return visual;
    return fallback > 0 ? String(fallback) : "";
  };

  const onTarjetaServicioInputChange = (
    servicioId: string,
    campo: "cantidad" | "precio",
    valor: string
  ) => {
    setTarjetaServicioInputs((prev) => ({
      ...prev,
      [servicioId]: { ...prev[servicioId], [campo]: valor },
    }));
    if (valor.trim() === "") return;
    const n = Number(valor);
    if (Number.isNaN(n)) return;
    if (campo === "cantidad")
      actualizarCantidadServicio(servicioId, Math.max(1, Math.floor(n)));
    if (campo === "precio")
      actualizarPrecioServicio(servicioId, Math.max(0, n));
  };

  const handleCreateVenta = async () => {
    if (isSubmittingRef.current) return;
    setShowVentaFormErrors(true);
    setVentaValidationAttempt((prev) => prev + 1);

    if (!user || !user.id) {
      showErrorAlert(
        "Error de sesión",
        "No se ha identificado el usuario responsable. Por favor inicie sesión nuevamente."
      );
      return;
    }

    const productosActuales = nuevaVenta.productos || [];
    const tieneServicios = serviciosAgregados.length > 0;

    if (seleccionadoEsBarbero && barberoEsBloqueado) {
      showErrorAlert(
        "Barbero bloqueado",
        `Este barbero tiene el crédito bloqueado (${estadoCredito || "Bloqueado"}). No se puede registrar ninguna venta hasta que realice un abono.`
      );
      return;
    }

    const tieneCliente = nuevaVenta.clienteId || (!seleccionadoEsBarbero && nuevaVenta.clienteNombreInvitado.trim());
    if (!tieneCliente || !nuevaVenta.metodoPago) {
      showErrorAlert(
        "Datos incompletos",
        !tieneCliente
          ? seleccionadoEsBarbero
            ? "Por favor selecciona un barbero de la lista."
            : "Por favor selecciona un cliente o escribe el nombre del invitado."
          : "Por favor selecciona el método de pago."
      );
      return;
    }

    if (productosActuales.length === 0 && !tieneServicios) {
      showErrorAlert(
        "Venta vacía",
        "Debes agregar al menos un producto o un servicio a la venta."
      );
      return;
    }

    if (nuevaVenta.metodoPago === "Crédito" && calcularTotal() > LIMITE_CREDITO) {
      showErrorAlert(
        "Límite de crédito excedido",
        `El total ($${formatCurrency(calcularTotal())}) supera el límite máximo de crédito de $${formatCurrency(LIMITE_CREDITO)}. Reduce el monto o cambia el método de pago.`
      );
      return;
    }

    if (tieneServicios) {
      if (!nuevaVenta.barberoId || Number(nuevaVenta.barberoId) <= 0) {
        showErrorAlert(
          "Barbero requerido",
          "El barbero es obligatorio cuando se agregan servicios. Por favor selecciona un barbero válido."
        );
        return;
      }
    }

    const productosInvalidos = productosActuales.filter(
      (p) => !p.id || isNaN(Number(p.id))
    );
    if (productosInvalidos.length > 0) {
      showErrorAlert(
        "Productos inválidos",
        `${productosInvalidos.length} producto(s) tienen IDs inválidos.`
      );
      return;
    }

    const serviciosValidos = tieneServicios
      ? serviciosAgregados.filter(
        (s) =>
          typeof s.id === "string" &&
          (s.id.startsWith("SERV-") || s.id.startsWith("PAQ-"))
      )
      : [];

    if (productosActuales.length === 0 && serviciosValidos.length === 0) {
      showErrorAlert(
        "Venta inválida",
        "Debes agregar al menos un producto o servicio válido a la venta."
      );
      return;
    }

    isSubmittingRef.current = true;
    try {
      setIsSubmitting(true);
      const subtotal = calcularSubtotal();
      const iva = calcularIva(subtotal);
      const descuento = calcularDescuento(subtotal);

      let montoSaldoUsado = 0;
      if (nuevaVenta.usarSaldoAFavor && nuevaVenta.clienteId) {
        const clienteSel = clientesDisponibles.find(
          (c) => c.id === Number(nuevaVenta.clienteId)
        );
        const saldoDisponible = clienteSel?.saldoAFavor || 0;
        const totalSinSaldo = subtotal + iva - descuento;
        montoSaldoUsado = Math.min(totalSinSaldo, saldoDisponible);
      }

      const total = calcularTotal() - montoSaldoUsado;

      const productosTexto =
        productosActuales.length > 0
          ? productosActuales
            .map((p) => `${p.nombre} (x${p.cantidad})`)
            .join(", ")
          : "Ninguno";

      const serviciosTexto = tieneServicios
        ? serviciosAgregados
          .map((s) => `${s.nombre} (x${s.cantidad})`)
          .join(", ")
        : "Ninguno";

      // Cuando el comprador es un barbero:
      //   - clienteId debe ser null (evita FK violation contra tabla Clientes)
      //   - barberoId recibe el BarberoId del comprador (para crédito y registro)
      //   - barberoPrestadorId recibe el BarberoId del que realiza el servicio
      //   - MetodoPago "Crédito" → "CreditoBarbero" (nombre que espera el backend)
      const barberoIdFinal = seleccionadoEsBarbero
        ? Number(nuevaVenta.clienteId)           // barbero comprador
        : (nuevaVenta.barberoId ? Number(nuevaVenta.barberoId) : null);

      // Barbero que realiza el servicio (solo aplica cuando el comprador es barbero)
      const barberoPrestadorIdFinal = seleccionadoEsBarbero && nuevaVenta.barberoId
        ? Number(nuevaVenta.barberoId)
        : null;

      const clienteIdFinal = seleccionadoEsBarbero
        ? null
        : (nuevaVenta.clienteId || null);

      const metodoPagoFinal =
        nuevaVenta.metodoPago === "Crédito"
          ? "CreditoBarbero"
          : nuevaVenta.metodoPago === "Saldo"
            ? "Saldo"
            : nuevaVenta.usarSaldoAFavor
              ? `${nuevaVenta.metodoPago} (Saldo aplicado)`
              : nuevaVenta.metodoPago;

      const ventaData = {
        numeroVenta,
        tipoVenta: nuevaVenta.tipoVenta,
        clienteId: clienteIdFinal,
        clienteNombre: seleccionadoEsBarbero
          ? undefined
          : (nuevaVenta.clienteNombreInvitado.trim() || clienteSeleccionadoNombre || undefined),
        usuarioId: Number(user.id),
        clienteDocumento: seleccionadoEsBarbero ? "" : (nuevaVenta.clienteDocumento || ""),
        fecha: nuevaVenta.fechaCreacion,
        servicios: serviciosTexto,
        productos: productosTexto,
        subtotal,
        iva: 0,
        descuento,
        total,
        saldoAFavorUsado: montoSaldoUsado,
        barberoId: barberoIdFinal,
        barberoPrestadorId: barberoPrestadorIdFinal,
        barberoNombre: nuevaVenta.barberoNombre || "Sin asignar",
        estado: "Completada",
        metodoPago: metodoPagoFinal,
        plazoDias: (metodoPagoFinal === "CreditoBarbero" && !tieneCicloActivo) ? plazoDias : null,
        garantiaMeses: nuevaVenta.garantiaMeses,
        productosDetalle: productosActuales,
        serviciosDetalle: tieneServicios
          ? serviciosAgregados.map((s) => ({
            id: s.id,
            nombre: s.nombre.startsWith("[PAQUETE] ")
              ? s.nombre.replace("[PAQUETE] ", "")
              : s.nombre,
            precio: s.precio,
            cantidad: s.cantidad,
          }))
          : [],
      };

      const nuevaVentaCreada = await ventaService.createVenta(ventaData);

      // El backend descuenta el saldo a favor automáticamente al persistir
      // Venta.SaldoAFavorUsado, así que no hace falta crear una devolución compensatoria.

      const ventaIdCreada = Number(
        (nuevaVentaCreada as any)?.id ??
        (nuevaVentaCreada as any)?.numeroVenta ??
        0
      );
      created(
        "Venta creada",
        `La venta #${ventaIdCreada > 0 ? ventaIdCreada : numeroVenta
        } ha sido registrada exitosamente por $${formatCurrency(total)}.`
      );

      // Go back after successful creation
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error creando venta:", error);
      showErrorAlert(
        "Error al crear la venta",
        error?.message || "Error desconocido al crear la venta"
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Validation helpers
  const mustChooseProducto =
    showVentaFormErrors && noItemsAgregados && !servicioSeleccionado;
  const showProductoSelectorError =
    (mustChooseProducto && !productoSeleccionado) ||
    (showAddProductoErrors && !productoSeleccionado);
  const mustChooseServicio =
    showVentaFormErrors && noItemsAgregados && !productoSeleccionado;
  const showServicioSelectorError =
    (mustChooseServicio && !servicioSeleccionado) ||
    (showAddServicioErrors && !servicioSeleccionado);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-orange-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-lightest">Cargando datos...</p>
        </div>
      </div>
    );
  }

  const clienteSeleccionadoNombre =
    clientesDisponibles.find((c) => c.id === Number(nuevaVenta.clienteId))
      ?.nombre || nuevaVenta.clienteNombreInvitado.trim() || "";

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
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-5">
              {/* Section 1: Basic Info */}
              <FormSection
                title="Información Básica"
                icon={<Receipt className="w-4 h-4" />}
                headerRight={
                  <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-lightest font-normal text-xs sm:text-sm">
                        Nº Venta:
                      </span>
                      <span className="text-gray-lightest font-medium tabular-nums text-xs sm:text-sm">
                        {numeroVenta.toString().padStart(3, "0")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-gray-lightest font-normal text-xs sm:text-sm">
                        Fecha:
                      </span>
                      <span className="text-gray-lightest font-medium text-xs sm:text-sm">
                        {formatDate(nuevaVenta.fechaCreacion)}
                      </span>
                    </div>
                  </div>
                }
              />

              {/* Section 2: Client / Barbero */}
              <FormSection
                title="Cliente / Barbero"
                icon={<Users className="w-4 h-4" />}
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <SearchField
                      placeholder="Busca un cliente o barbero..."
                      value={clientSearchTerm}
                      onChange={(val) => {
                        setClientSearchTerm(val);
                        setSeleccionadoEsBarbero(false);
                        setNuevaVenta((prev) => ({
                          ...prev,
                          clienteId: null,
                          clienteDocumento: "",
                          clienteNombreInvitado: val,
                          tipoVenta: "Venta Invitado",
                        }));
                      }}
                      onClear={() => {
                        setClientSearchTerm("");
                        setSeleccionadoEsBarbero(false);
                        setNuevaVenta((prev) => ({
                          ...prev,
                          clienteId: null,
                          clienteDocumento: "",
                          clienteNombreInvitado: "",
                          tipoVenta: "Venta Invitado",
                        }));
                      }}
                      items={personasDisponibles}
                      filterFn={(item, query) => {
                        const q = normalizeSearchText(query);
                        const searchable = normalizeSearchText(
                          [item.id, item.nombre, item.documento].join(" ")
                        );
                        return searchable.includes(q);
                      }}
                      renderItem={(item) => (
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-lightest font-normal text-sm group-hover:text-orange-secondary transition-colors">
                                {item.nombre}
                              </p>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                                  item.tipo === 'barbero'
                                    ? 'bg-orange-primary/20 text-orange-primary'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {item.tipo === 'barbero' ? 'Barbero' : 'Cliente'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-lightest">
                              {item.documento || "Sin documento"}
                            </p>
                          </div>
                          <div className="text-right">
                            {item.tipo === 'cliente' ? (
                              <>
                                <p className="text-[9px] text-gray-lightest uppercase tracking-widest leading-none mb-1">
                                  Saldo
                                </p>
                                <p className={`text-xs ${(item.saldoAFavor || 0) > 0 ? 'text-green-400' : 'text-gray-lightest'}`}>
                                  ${formatCurrency(item.saldoAFavor || 0)}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-[9px] text-gray-lightest uppercase tracking-widest leading-none mb-1">
                                  Rol
                                </p>
                                <p className="text-xs text-orange-primary">
                                  {item.rol || 'Barbero'}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      onSelect={(item) => {
                        if (item.tipo === 'barbero') {
                          setSeleccionadoEsBarbero(true);
                          setNuevaVenta({
                            ...nuevaVenta,
                            clienteId: item.id,
                            clienteDocumento: item.documento,
                            clienteNombreInvitado: "",
                            tipoVenta: "Venta Barbero",
                          });
                          setClientSearchTerm(
                            `${item.nombre}${item.documento ? ` — CC ${item.documento}` : ""}`
                          );
                        } else {
                          const esInvitado = item.documento?.startsWith("PASO-");
                          setSeleccionadoEsBarbero(false);
                          setNuevaVenta({
                            ...nuevaVenta,
                            clienteId: item.id,
                            clienteDocumento: item.documento,
                            clienteNombreInvitado: "",
                            tipoVenta: esInvitado ? "Venta Invitado" : "Venta Cliente",
                          });
                          setClientSearchTerm(
                            `${item.nombre}${item.documento ? ` — ${item.documento}` : ""}`
                          );
                        }
                      }}
                      error={
                        showVentaFormErrors && !nuevaVenta.clienteId && !clientSearchTerm.trim()
                          ? "Selecciona un cliente o barbero, o escribe el nombre del invitado."
                          : undefined
                      }
                      shakeClass={shakeClass}
                      onFocus={clearValidationErrors}
                    />
                    {!seleccionadoEsBarbero && !nuevaVenta.clienteId && clientSearchTerm.trim() && (
                      <div className="mt-2">
                        <p className="text-[10px] text-orange-primary flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-primary" />
                          Se creará la venta a nombre de "{clientSearchTerm.trim()}" como invitado
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Saldo a Favor */}
                  {nuevaVenta.clienteId && !seleccionadoEsBarbero && (
                    <div className="bg-gray-darker p-3 rounded-lg border border-gray-dark flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${clientesDisponibles.find(
                            (c) => c.id === Number(nuevaVenta.clienteId)
                          )?.saldoAFavor
                            ? "bg-orange-primary/10"
                            : "bg-gray-dark"
                            }`}
                        >
                          <DollarSign
                            className={`w-5 h-5 ${clientesDisponibles.find(
                              (c) => c.id === Number(nuevaVenta.clienteId)
                            )?.saldoAFavor
                              ? "text-orange-primary"
                              : "text-gray-lightest"
                              }`}
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-lightest">
                            Saldo a Favor del Cliente
                          </p>
                          <p className="text-xs text-gray-lightest">
                            Disponible:{" "}
                            <span className="text-orange-primary">
                              $
                              {formatCurrency(
                                clientesDisponibles.find(
                                  (c) =>
                                    c.id === Number(nuevaVenta.clienteId)
                                )?.saldoAFavor || 0
                              )}
                            </span>
                          </p>
                        </div>
                      </div>

                      {(clientesDisponibles.find(
                        (c) => c.id === Number(nuevaVenta.clienteId)
                      )?.saldoAFavor || 0) > 0 && (
                          <div
                            className={`flex items-center space-x-3 px-4 py-2 rounded-lg border transition-all cursor-pointer ${nuevaVenta.usarSaldoAFavor
                              ? "bg-blue-500/10 border-blue-500/30"
                              : "bg-gray-dark border-gray-medium/30 hover:bg-gray-dark/80"
                              }`}
                            onClick={() =>
                              setNuevaVenta({
                                ...nuevaVenta,
                                usarSaldoAFavor: !nuevaVenta.usarSaldoAFavor,
                              })
                            }
                          >
                            <Checkbox
                              id="usar-saldo"
                              checked={nuevaVenta.usarSaldoAFavor}
                              onCheckedChange={(checked) => {
                                setNuevaVenta({
                                  ...nuevaVenta,
                                  usarSaldoAFavor: checked === true,
                                });
                              }}
                              className={`border-2 ${nuevaVenta.usarSaldoAFavor
                                ? "border-blue-400 bg-blue-500 text-white"
                                : "border-gray-400"
                                }`}
                              checkClassName="stroke-[3.5] w-3 h-3"
                            />
                            <label
                              htmlFor="usar-saldo"
                              className={`text-sm leading-none cursor-pointer select-none ${nuevaVenta.usarSaldoAFavor
                                ? "text-blue-400"
                                : "text-gray-light"
                                }`}
                            >
                              Usar saldo en esta venta
                            </label>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </FormSection>

              {/* Banner bloqueo barbero */}
              {seleccionadoEsBarbero && barberoEsBloqueado && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
                  <span className="mt-0.5 shrink-0 text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-red-400">Barbero bloqueado — {estadoCredito}</p>
                    <p className="text-xs text-red-400/80 mt-0.5">No se puede registrar ninguna venta con ningún método de pago hasta que realice un abono.</p>
                  </div>
                </div>
              )}

              {/* Section 3: Sale Config */}
              <section>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Tipo de Venta</Label>
                    <div className={`elegante-input bg-gray-medium flex items-center gap-2 px-3 rounded-md text-sm ${
                      nuevaVenta.tipoVenta === "Venta Cliente" || nuevaVenta.tipoVenta === "Venta Barbero"
                        ? "text-green-400"
                        : "text-orange-primary"
                    }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        nuevaVenta.tipoVenta === "Venta Cliente" || nuevaVenta.tipoVenta === "Venta Barbero"
                          ? "bg-green-400"
                          : "bg-orange-primary"
                      }`} />
                      {nuevaVenta.tipoVenta}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Método de Pago *</Label>
                    <Select
                      value={nuevaVenta.metodoPago}
                      onValueChange={(val) => { handleMetodoPagoChange(val); clearValidationErrors(); }}
                      onOpenChange={() => clearValidationErrors()}
                      disabled={seleccionadoEsBarbero && barberoEsBloqueado}
                    >
                      <SelectTrigger
                        className={`elegante-input ${seleccionadoEsBarbero && barberoEsBloqueado
                          ? "opacity-50 cursor-not-allowed border-red-500/40"
                          : showVentaFormErrors && !nuevaVenta.metodoPago
                            ? `border-red-500 ring-1 ring-red-500 ${shakeClass}`
                            : ""
                          }`}
                      >
                        <SelectValue placeholder="Selecciona el método" />
                      </SelectTrigger>
                      <SelectContent className="elegante-card">
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="Transferencia">
                          Transferencia
                        </SelectItem>
                        {seleccionadoEsBarbero && (
                          <SelectItem value="Crédito">Crédito</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {showVentaFormErrors && !nuevaVenta.metodoPago && (
                      <p className="text-xs text-red-400">
                        Este campo es obligatorio.
                      </p>
                    )}
                    {nuevaVenta.metodoPago === "Crédito" && (
                      <p className={`text-xs mt-1 ${calcularTotal() > LIMITE_CREDITO ? "text-red-400 font-medium animate-pulse" : "text-orange-primary"}`}>
                        {calcularTotal() > LIMITE_CREDITO
                          ? `Límite excedido: $${formatCurrency(calcularTotal())} / $${formatCurrency(LIMITE_CREDITO)}`
                          : `Crédito: $${formatCurrency(calcularTotal())} de $${formatCurrency(LIMITE_CREDITO)} máx.`}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Descuento (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={porcentajeDescuentoInput}
                      onChange={(e) => {
                        if (e.target.value.length <= 5) {
                          handlePorcentajeDescuentoInputChange(e.target.value);
                        }
                      }}
                      className={`elegante-input no-spin ${showDiscountWarning ? "border-red-500 ring-1 ring-red-500" : ""}`}
                    />
                    {showDiscountWarning && (
                      <p className="text-xs text-red-400 mt-1">el descuento no puede ser superior a 100</p>
                    )}
                    {showNegativeDiscountWarning && (
                      <p className="text-xs text-red-400 mt-1">el descuento no puede ser negativo</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Garantía</Label>
                    <Input
                      value="15 días (fijo)"
                      disabled
                      className="elegante-input bg-gray-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Plazo del ciclo — solo si es crédito, verificación completa y no tiene ciclo activo */}
                {seleccionadoEsBarbero && nuevaVenta.metodoPago === "Crédito" && !checkingCiclo && !tieneCicloActivo && (
                  <div className="space-y-1 mt-4 max-w-xs">
                    <Label className="text-gray-lightest text-xs">Plazo del ciclo de crédito</Label>
                    <Select
                      value={String(plazoDias)}
                      onValueChange={(val) => setPlazoDias(Number(val) as 7 | 14)}
                    >
                      <SelectTrigger className="elegante-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="elegante-card">
                        <SelectItem value="7">1 semana (7 días)</SelectItem>
                        <SelectItem value="14">2 semanas (14 días)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-dark mt-0.5">
                      Solo aplica al primer crédito del ciclo. Una vez iniciado no se puede cambiar (salvo extensión manual).
                    </p>
                  </div>
                )}
              </section>

              {/* Section 4: Products */}
              <div className="space-y-3 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">Producto *</Label>
                    <SearchField
                      placeholder="Escribe el nombre..."
                      value={productSearchTerm}
                      onChange={(val) => setProductSearchTerm(val)}
                      onClear={() => {
                        setProductSearchTerm("");
                        setProductoSeleccionado("");
                      }}
                      items={productosAPI.filter((p) => {
                        const stock = Number((p as any).stock ?? (p as any).cantidad ?? 0);
                        const precioNum = seleccionadoEsBarbero
                          ? Number((p as any).precioCompra ?? (p as any).precioBase ?? 0)
                          : Number((p as any).precio ?? (p as any).precioBase ?? 0);
                        return stock > 0 && precioNum > 0;
                      })}
                      filterFn={(p, query) =>
                        normalizeSearchText(p.nombre).includes(
                          normalizeSearchText(query)
                        )
                      }
                      renderItem={(producto) => (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-gray-lightest text-sm group-hover:text-orange-secondary transition-colors">
                              {producto.nombre}
                            </p>
                            <p className="text-[10px] text-gray-lightest">
                              $
                              {formatCurrency(
                                seleccionadoEsBarbero
                                  ? (producto.precioCompra || producto.precioBase)
                                  : (producto.precio || producto.precioBase)
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-gray-lightest uppercase tracking-widest leading-none mb-1">
                              Stock
                            </p>
                            <p
                              className={`text-xs ${(producto.stock ?? 0) > 0
                                ? "text-green-400"
                                : "text-red-400"
                                }`}
                            >
                              {producto.stock ?? 0}
                            </p>
                          </div>
                        </div>
                      )}
                      onSelect={(producto) => {
                        setProductoSeleccionado(producto.id.toString());
                        setProductSearchTerm(producto.nombre);
                        if (showAddProductoErrors)
                          setShowAddProductoErrors(false);
                      }}
                      error={showProductoSelectorError
                        ? "Selecciona un producto del buscador o agrega un servicio."
                        : undefined}
                      shakeClass={shakeClass}
                      maxResults={20}
                      onFocus={clearValidationErrors}
                      dropUp
                    />
                  </div>
                  <div className="space-y-1">
                    {isStockExceeded && (
                      <p className="text-xs text-red-500 font-bold animate-pulse mt-1">
                        Se ha excedido la cantidad de productos en el stock.
                      </p>
                    )}
                    <Label className="text-gray-lightest text-xs">ㅤ</Label>
                    <button
                      onClick={agregarProducto}
                      className="elegante-button-primary w-full flex items-center justify-center gap-2"
                      style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                {showVentaFormErrors && noItemsAgregados && (
                  <p className="text-xs text-red-400 mt-2">
                    Debes agregar al menos un producto o servicio.
                  </p>
                )}
              </div>

              {/* Section 5: Barbero y Servicios — oculto en venta barbero a crédito */}
              {!(seleccionadoEsBarbero && nuevaVenta.metodoPago === "Crédito") && <div className="space-y-3 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-gray-lightest text-xs">
                      Barbero{" "}
                      {serviciosAgregados.length > 0 ? "*" : "(opcional)"}
                    </Label>
                    <SearchField
                      placeholder={
                        serviciosAgregados.length > 0
                          ? "Escribe para buscar un barbero..."
                          : "Escribe para asignar barbero (opcional)..."
                      }
                      value={barberoSearchTerm}
                      onChange={(val) => {
                        setBarberoSearchTerm(val);
                        if (nuevaVenta.barberoId) {
                          setNuevaVenta({
                            ...nuevaVenta,
                            barberoId: null,
                            barberoNombre: "Sin asignar",
                          });
                        }
                      }}
                      onClear={() => {
                        setBarberoSearchTerm("");
                        setNuevaVenta({
                          ...nuevaVenta,
                          barberoId: null,
                          barberoNombre: "Sin asignar",
                        });
                      }}
                      items={barberosAPI}
                      filterFn={(b: any, query) => {
                        const searchable = normalizeSearchText(
                          [b.id, b.nombre, b.apellido, b.documento].join(
                            " "
                          )
                        );
                        return searchable.includes(
                          normalizeSearchText(query)
                        );
                      }}
                      renderItem={(barbero: any) => {
                        const nombreCompleto = `${barbero.nombre} ${barbero.apellido || ""
                          }`.trim();
                        return (
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-gray-lightest font-normal text-sm group-hover:text-orange-secondary transition-colors">
                                {nombreCompleto}
                              </p>
                              <p className="text-[10px] text-gray-lightest">
                                {barbero.documento || "Sin documento"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-gray-lightest uppercase tracking-widest leading-none mb-1">
                                Rol
                              </p>
                              <p className="text-[10px] text-gray-lightest font-normal">
                                {barbero.rol || "Barbero"}
                              </p>
                            </div>
                          </div>
                        );
                      }}
                onSelect={(barbero: any) => {
                  const nombreCompleto = `${barbero.nombre} ${barbero.apellido || ""
                    }`.trim();
                  setNuevaVenta({
                    ...nuevaVenta,
                    barberoId: Number(barbero.id),
                    barberoNombre: nombreCompleto,
                  });
                  setBarberoSearchTerm(
                    `${nombreCompleto}${barbero.documento
                      ? ` — CC ${barbero.documento}`
                      : ""
                    }`
                  );
                }}
                error={serviciosAgregados.length > 0 && !nuevaVenta.barberoId
                  ? "El barbero es requerido cuando hay servicios."
                  : undefined}
                shakeClass={shakeClass}
                onFocus={clearValidationErrors}
                dropUp
                    />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-lightest text-xs">Servicio</Label>
              <SearchField
                placeholder="Escribe el nombre..."
                value={serviceSearchTerm}
                onChange={(val) => setServiceSearchTerm(val)}
                onClear={() => {
                  setServiceSearchTerm("");
                  setServicioSeleccionado("");
                }}
                items={serviciosDisponibles}
                filterFn={(s, query) =>
                  normalizeSearchText(s).includes(
                    normalizeSearchText(query)
                  )
                }
                renderItem={(servicioNom) => (
                  <p className="text-gray-lightest font-normal text-sm group-hover:text-orange-secondary transition-colors text-center">
                    {servicioNom}
                  </p>
                )}
                onSelect={(servicioNom) => {
                  setServicioSeleccionado(servicioNom);
                  setServiceSearchTerm(servicioNom);
                  if (showAddServicioErrors)
                    setShowAddServicioErrors(false);
                }}
                error={showServicioSelectorError
                  ? "Selecciona un servicio del buscador o agrega un producto."
                  : undefined}
                shakeClass={shakeClass}
                maxResults={20}
                onFocus={clearValidationErrors}
                dropUp
              />
            </div>

            <div className="space-y-1">
              <Label className="text-gray-lightest text-xs">ㅤ</Label>
              <button
                onClick={agregarServicio}
                className="elegante-button-primary w-full flex items-center justify-center gap-2"
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem' }}
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>

        </div>}
      </div>
      {/* Action Buttons */}
      <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90 flex justify-end space-x-3">
        <button onClick={onBack} className="elegante-button-secondary">
          Cancelar
        </button>
        <button
          onClick={handleCreateVenta}
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
              Registrar Venta
            </>
          )}
        </button>
      </div>
    </div>
        </aside >

    {/* RIGHT: Detail Panel */ }
    < section className = "lg:min-h-0 lg:min-w-0 lg:pr-2" >
      <DetailPanel
        productos={nuevaVenta.productos || []}
        servicios={serviciosAgregados}
        subtotalProductos={subtotalProductos}
        subtotalServicios={subtotalServicios}
        descuentoPorcentaje={nuevaVenta.porcentajeDescuento}
        descuentoMonto={calcularDescuento(calcularSubtotal())}
        saldoUsado={
          nuevaVenta.usarSaldoAFavor ? calcularSaldoAFavorUsado() : 0
        }
        total={Math.max(
          0,
          calcularTotal() -
          (nuevaVenta.usarSaldoAFavor
            ? calcularSaldoAFavorUsado()
            : 0)
        )}
        onRemoveProducto={eliminarProducto}
        onRemoveServicio={eliminarServicio}
        getTarjetaProductoInput={getTarjetaProductoInput}
        onTarjetaProductoInputChange={onTarjetaProductoInputChange}
      />
        </section >
      </div >
    </div >
  );
}
