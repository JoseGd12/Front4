import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../../shared/components/ui/badge";
import { Calendar, DollarSign, Users, Scissors, Package, Clock, Download, ChevronDown, ChevronUp, RotateCcw, FileDown, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line, LegendType, PieChart, Pie, AreaChart, Area } from "recharts";
import { useThemeColors } from "../../../shared/utils/themeColors";
import { Skeleton } from "../../../shared/components/ui/skeleton";
import { DatePicker } from "../../../shared/components/ui/DatePicker";
import { Label } from "../../../shared/components/ui/label";
import { auth } from "../../../shared/services/firebase";
import * as XLSX from "xlsx";
import { barberosService, Barbero as BarberoEntity } from "../../administracion/services/barberosService";
import { apiService } from "../../../shared/services/api";

type PeriodoClave = "semanal" | "mensual" | "anual";

type VentaDetalle = {
  nombre: string;
  cantidad: number;
  precio: number;
};

type VentaServicioPaqueteDetalle = {
  nombre: string;
  cantidad: number;
  precio: number;
  tipo: "Servicio" | "Paquete";
};

type Venta = {
  id: number;
  fecha: string;
  estado: string;
  total: number;
  clienteId?: number | null;
  cliente?: string | null;
  productosDetalle: VentaDetalle[];
  serviciosDetalle: VentaDetalle[];
  serviciosPaquetesDetalle?: VentaServicioPaqueteDetalle[];
  totalProductos?: number;
  totalServicios?: number;
  barbero?: string | null;
  barberoId?: number | null;
};

type Agendamiento = {

  id: number;
  clienteNombre: string;
  servicioNombre?: string | null;
  paqueteNombre?: string | null;
  precio?: number | null;
  hora?: string | null;
  barberoNombre: string;
  estado: string;
  fecha: string;
};

type Insumo = {
  nombre: string;
  stock?: number;
  minimo?: number;
  categoria?: string | null;
};

type AgendamientoStat = {
  fechaHora: string;
  estado: string;
  clienteId?: number | null;
  cliente?: string | null;
  barbero?: string | null;
};

type CompraDetalleStat = {
  productoNombre: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

type CompraStat = {
  fechaRegistro: string;
  total: number;
  proveedor: string | null;
  estado: string | null;
  detalles: CompraDetalleStat[];
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let token = localStorage.getItem("authToken");
  if (auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  }
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
};

const fetchDashboardData = async (): Promise<{ ventas: Venta[], agendamientos: Agendamiento[], insumos: Insumo[], agendamientosStats: AgendamientoStat[], comprasStats: CompraStat[] }> => {
  const dashRes = await fetchWithAuth("/api/Dashboard").catch(() => null);
  if (dashRes && dashRes.ok) {
    const jd = await dashRes.json();

    // Combinar ventas recientes con históricas para tener el set completo para gráficas
    const listaRecientes = Array.isArray(jd?.ventas) ? jd.ventas : [];
    const listaHistoricas = Array.isArray(jd?.ventasHistoricas) ? jd.ventasHistoricas : [];

    const mappedRecientes: Venta[] = listaRecientes.map((v: any) => {
      const productos = Array.isArray(v.productosDetalle) ? v.productosDetalle : [];
      const servicios = Array.isArray(v.serviciosDetalle) ? v.serviciosDetalle : [];
      const productosDetalle = productos.map((d: any) => ({
        nombre: d.nombre ?? d.Nombre ?? "Producto",
        cantidad: Number((d.cantidad ?? d.Cantidad) ?? 1),
        precio: Number((d.precio ?? d.Precio ?? d.precioUnitario ?? d.PrecioUnitario) ?? 0),
      }));
      const serviciosDetalle = servicios.map((d: any) => ({
        nombre: d.nombre ?? d.Nombre ?? "Servicio",
        cantidad: Number((d.cantidad ?? d.Cantidad) ?? 1),
        precio: Number((d.precio ?? d.Precio ?? d.precioUnitario ?? d.PrecioUnitario) ?? 0),
      }));
      const serviciosPaquetesDetalle = servicios.map((d: any) => {
        const tipo = (d.tipo ?? d.Tipo) === "Paquete" ? "Paquete" : "Servicio";
        return {
          nombre: d.nombre ?? d.Nombre ?? "",
          cantidad: Number((d.cantidad ?? d.Cantidad) ?? 1),
          precio: Number((d.precio ?? d.Precio ?? d.precioUnitario ?? d.PrecioUnitario) ?? 0),
          tipo
        };
      });
      return {
        id: v.id ?? v.Id,
        fecha: v.fecha ?? v.Fecha,
        estado: v.estado ?? v.Estado,
        total: Number((v.total ?? v.Total) ?? 0),
        clienteId: (v.clienteId ?? v.ClienteId) ?? null,
        cliente: v.cliente ?? null,
        barbero: v.barbero ?? v.Barbero ?? v.barberoNombre ?? v.BarberoNombre ?? v.nombreBarbero ?? null,
        barberoId: (v.barberoId ?? v.BarberoId) ?? null,
        productosDetalle,
        serviciosDetalle,
        serviciosPaquetesDetalle,
      } as Venta;
    });

    const mappedHistoricas: Venta[] = listaHistoricas.map((v: any) => ({
      id: 0,
      fecha: v.fecha ?? v.Fecha,
      estado: v.estado ?? v.Estado,
      total: Number((v.total ?? v.Total) ?? 0),
      totalProductos: Number(v.totalProductos ?? 0),
      totalServicios: Number(v.totalServicios ?? 0),
      barbero: v.barbero ?? v.Barbero ?? v.barberoNombre ?? v.BarberoNombre ?? v.nombreBarbero ?? null,
      barberoId: (v.barberoId ?? v.BarberoId) ?? null,
      productosDetalle: [],
      serviciosDetalle: [],
      serviciosPaquetesDetalle: [],
    }));

    const todasLasVentas = [...mappedRecientes, ...mappedHistoricas];

    const agendamientos = (Array.isArray(jd?.agendamientos) ? jd.agendamientos : []).map((a: any) => {
      const fechaHoraRaw = a.fechaHora ?? a.FechaHora;
      const dt = fechaHoraRaw ? new Date(fechaHoraRaw) : null;
      const fecha = dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}` : "";
      const hora = dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "";
      return {
        id: a.id ?? a.Id,
        clienteNombre: a.clienteNombre ?? a.ClienteNombre ?? "",
        servicioNombre: a.servicioNombre ?? a.ServicioNombre ?? null,
        paqueteNombre: a.paqueteNombre ?? a.PaqueteNombre ?? null,
        precio: (a.precio ?? a.Precio) ?? null,
        hora,
        barberoNombre: a.barberoNombre ?? a.BarberoNombre ?? "",
        estado: String((a.estado ?? a.Estado) ?? "").toLowerCase(),
        fecha
      } as Agendamiento;
    });

    const insumos = (Array.isArray(jd?.inventarioBajo) ? jd.inventarioBajo : []).map((p: any) => ({
      nombre: p.nombre ?? p.Nombre,
      stock: Number(p.stock ?? p.Stock ?? p.cantidad ?? p.Cantidad ?? 0),
      minimo: Number(p.minimo ?? 50),
      categoria: (p.categoriaNombre ?? p.CategoriaNombre) ?? (p.categoria ?? null)
    }));

    const agendamientosStats: AgendamientoStat[] = (Array.isArray(jd?.agendamientosStats) ? jd.agendamientosStats : []).map((a: any) => ({
      fechaHora: a.fechaHora ?? a.FechaHora ?? "",
      estado: String((a.estado ?? a.Estado) ?? "").toLowerCase(),
      clienteId: (a.clienteId ?? a.ClienteId) ?? null,
      cliente: a.cliente ?? a.Cliente ?? null,
      barbero: a.barbero ?? a.Barbero ?? null,
    }));

    const comprasStats: CompraStat[] = (Array.isArray(jd?.comprasStats) ? jd.comprasStats : []).map((c: any) => ({
      fechaRegistro: c.fechaRegistro ?? c.FechaRegistro ?? "",
      total: Number(c.total ?? c.Total ?? 0),
      proveedor: c.proveedor ?? c.Proveedor ?? null,
      estado: c.estado ?? c.Estado ?? null,
      detalles: (Array.isArray(c.detalles) ? c.detalles : []).map((d: any) => ({
        productoNombre: d.productoNombre ?? d.ProductoNombre ?? null,
        cantidad: Number(d.cantidad ?? d.Cantidad ?? 0),
        precioUnitario: Number(d.precioUnitario ?? d.PrecioUnitario ?? 0),
        subtotal: Number(d.subtotal ?? d.Subtotal ?? 0),
      })),
    }));

    return { ventas: todasLasVentas, agendamientos, insumos, agendamientosStats, comprasStats };
  }

  // Fallback si falla el dashboard
  return { ventas: [], agendamientos: [], insumos: [], agendamientosStats: [], comprasStats: [] };
};

const formatCurrencyValue = (amount: number) =>
  amount.toLocaleString("es-CO", { minimumFractionDigits: 0 });

const formatAxisValue = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".0", "")} M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)} mil`;
  }
  return value.toLocaleString("es-CO");
};

const formatDateYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const periodoLabels: Record<PeriodoClave, string> = {
  semanal: "Semana",
  mensual: "Mes",
  anual: "Año",
};

export function DashboardPage({ onNavigate }: { onNavigate?: (page: string, data?: { producto?: string }) => void } = {}) {
  const colors = useThemeColors();
  const [periodoIngresos, setPeriodoIngresos] = useState<PeriodoClave>("mensual");
  const [showResumenPeriodos, setShowResumenPeriodos] = useState(true);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [agendamientos, setAgendamientos] = useState<Agendamiento[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [agendamientosStats, setAgendamientosStats] = useState<AgendamientoStat[]>([]);
  const [comprasStats, setComprasStats] = useState<CompraStat[]>([]);
  const [barberosSistema, setBarberosSistema] = useState<BarberoEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportStart, setReportStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatDateYMD(d);
  });
  const [reportEnd, setReportEnd] = useState<string>(() => formatDateYMD(new Date()));
  const reportButtonRef = useRef<HTMLButtonElement | null>(null);
  const [reportWidth, setReportWidth] = useState<number>(0);

  const [periodoHorasPico, setPeriodoHorasPico] = useState<"dia" | "semana" | "mes">("dia");
  const [periodoRankingBarberos, setPeriodoRankingBarberos] = useState<"dia" | "semana" | "mes">("mes");
  const [periodoTasaCitas, setPeriodoTasaCitas] = useState<"dia" | "semana" | "mes">("mes");
  const [anioHorasPico, setAnioHorasPico] = useState<number>(new Date().getFullYear());
  const [mesSeleccionadoDrilldown, setMesSeleccionadoDrilldown] = useState<number | null>(null);

  const [filtroBarberosPeriodo, setFiltroBarberosPeriodo] = useState<"hoy" | "semanal" | "mensual" | "anual">("hoy");
  const [selectedBarberoGanancia, setSelectedBarberoGanancia] = useState<string>("Todos");
  const [barberoSearchOpen, setBarberoSearchOpen] = useState(false);
  const [barberoSearch, setBarberoSearch] = useState("");
  const barberoSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (barberoSelectRef.current && !barberoSelectRef.current.contains(e.target as Node)) {
        setBarberoSearchOpen(false);
        setBarberoSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (showReport && reportButtonRef.current) {
      setReportWidth(reportButtonRef.current.offsetWidth);
    }
  }, [showReport]);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const [data, usuariosData] = await Promise.all([
          fetchDashboardData(),
          apiService.getUsuarios().catch(() => [])
        ]);
        if (!isMounted) return;
        setVentas(data.ventas);
        setAgendamientos(data.agendamientos);
        setInsumos(data.insumos);
        setAgendamientosStats(data.agendamientosStats);
        setComprasStats(data.comprasStats);

        const soloBarberos = usuariosData.filter((u: any) => {
          const rolNombre = (u.rol?.nombre || "").toLowerCase();
          return u.rolId === 2 || rolNombre === "barbero";
        });
        
        const mappedBarberos: BarberoEntity[] = soloBarberos.map((u: any) => ({
             id: u.id,
             nombre: u.nombre || "",
             apellido: u.apellido || "",
             status: (u.estado ?? true) ? "active" : "inactive",
             estado: !!(u.estado ?? true),
             tipoDocumento: u.tipoDocumento || "CC",
             documento: u.documento || "",
             correo: u.correo || "",
             telefono: u.telefono || "",
             direccion: u.direccion || "",
             barrio: u.barrio || "",
             fechaNacimiento: u.fechaNacimiento || "",
             rol: "Barbero",
             fotoPerfil: u.fotoPerfil || ""
        }));
        
        setBarberosSistema(mappedBarberos);
      } catch {
        if (!isMounted) return;
        setErrorMsg("No se pudo cargar la información del backend");
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, []);

  const today = new Date();
  const isSameDay = (d: Date, b: Date) =>
    d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
  const startOfWeek = (() => {
    const d = new Date(today);
    const day = d.getDay();
    const mondayOffset = (day + 6) % 7;
    d.setDate(d.getDate() - mondayOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const endOfWeek = (() => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  })();
  const todayYMD = formatDateYMD(today);

  const isVentaActiva = (estado: string) => {
    const st = String(estado || "").toLowerCase();
    return st !== "anulada" && st !== "cancelada";
  };

  const isCitaCompletada = (estado: string) => {
    const st = String(estado || "").toLowerCase();
    return st === "completada" || st === "en-curso";
  };

  const ventasHoy = useMemo(() => {
    return ventas.filter(v => {
      if (!v.fecha) return false;
      return v.fecha.startsWith(todayYMD) && isVentaActiva(v.estado);
    });
  }, [ventas, todayYMD]);

  const citasHoy = useMemo(() => {
    const hoy = today;
    return agendamientos
      .filter(c => {
        if (!c.fecha) return false;
        // Excluir canceladas del conteo y la vista del día
        const st = String(c.estado || "").toLowerCase();
        if (st === "cancelada" || st === "cancelado" || st === "anulada") return false;

        const [y, m, d] = c.fecha.split('-').map(Number);
        if (!y || !m || !d) return false;
        const dt = new Date(y, (m - 1), d);
        return isSameDay(dt, hoy);
      })
      .map(c => ({
        id: c.id,
        cliente: c.clienteNombre,
        servicio: c.servicioNombre || (c.paqueteNombre || "Servicio"),
        precio: Number(c.precio || 0),
        hora: c.hora || "",
        barbero: c.barberoNombre,
        estado: (c.estado || "").toString().toLowerCase()
      }));
  }, [agendamientos]);

  const inventarioBajo = useMemo(() => {
    return insumos
      .map(p => ({
        producto: p.nombre,
        stockTotal: Number(p.stock || 0),
        minimo: p.minimo,
        categoria: p.categoria
      }))
      .filter(item => typeof item.stockTotal === "number" && item.stockTotal >= 0 && item.stockTotal < 50)
      .sort((a, b) => a.stockTotal - b.stockTotal)
      .slice(0, 5);
  }, [insumos]);

  const totalVentasHoy = useMemo(() => ventasHoy.reduce((acc, v) => acc + (Number(v.total) || 0), 0), [ventasHoy]);
  
  const listaBarberosUnicos = useMemo(() => {
    const list = new Set<string>();
    ventas.forEach(v => {
      if (v.barbero && v.barbero !== "Sin asignar" && v.barbero.trim() !== "") {
        list.add(v.barbero.trim());
      }
    });
    agendamientos.forEach(a => {
      if (a.barberoNombre && a.barberoNombre !== "Sin asignar" && a.barberoNombre.trim() !== "") {
        list.add(a.barberoNombre.trim());
      }
    });
    
    barberosSistema.filter(b => b.status === "active" || b.estado === true).forEach(b => {
      list.add(`${b.nombre} ${b.apellido}`.trim());
    });

    const inactiveProfiles = barberosSistema.filter(b => b.status === "inactive" || b.estado === false);
    const activeList = Array.from(list).filter(name => {
      const isInactive = inactiveProfiles.some(b => {
         const fullName = `${b.nombre} ${b.apellido}`.trim().toLowerCase();
         const onlyName = b.nombre.trim().toLowerCase();
         const target = name.trim().toLowerCase();
         return target === fullName || target === onlyName;
      });
      return !isInactive;
    });

    return activeList.sort();
  }, [ventas, agendamientos, barberosSistema]);


  const [gananciasDashboard, setGananciasDashboard] = useState({
    totalServicios: 0,
    gananciasBarberos: 0,
    gananciasBarberia: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchGanancias = async () => {
      try {
        const url = `/api/Dashboard/ganancias?periodo=${filtroBarberosPeriodo}&barbero=${encodeURIComponent(selectedBarberoGanancia)}`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setGananciasDashboard({
              totalServicios: data.totalServicios || 0,
              gananciasBarberos: data.gananciasBarberos || 0,
              gananciasBarberia: data.gananciasBarberia || 0,
            });
          }
        }
      } catch (error) {
        console.error("Error al cargar ganancias dinámicas", error);
      }
    };
    fetchGanancias();
    return () => { isMounted = false; };
  }, [filtroBarberosPeriodo, selectedBarberoGanancia]);

  const gananciasBarberosDinámica = gananciasDashboard.gananciasBarberos;
  const gananciasBarberiaDinámica = gananciasDashboard.gananciasBarberia;

  const metrics = useMemo(() => {
    return [
      {
        id: "ventas-hoy",
        title: "Ventas Hoy",
        value: `$${formatCurrencyValue(totalVentasHoy)}`,
        change: "",
        icon: DollarSign,
        iconColor: "text-primary-gold",
        isPositive: true
      },
      {
        id: "citas",
        title: "Citas Agendadas",
        value: `${citasHoy.length}`,
        change: "",
        icon: Calendar,
        iconColor: "text-secondary-gold",
        isPositive: true
      },
      {
        id: "ganancia-barberia",
        title: "Ganancia Barbería (40%)",
        value: `$${formatCurrencyValue(gananciasBarberiaDinámica)}`,
        change: "Solo en servicios",
        icon: DollarSign,
        iconColor: "text-primary-gold",
        isPositive: true
      },
      {
        id: "ganancias-barberos",
        title: "Ganancias Barberos (60%)",
        value: `$${formatCurrencyValue(gananciasBarberosDinámica)}`,
        change: selectedBarberoGanancia === "Todos" ? "Todos los barberos" : selectedBarberoGanancia,
        icon: Scissors,
        iconColor: "text-gray-lightest",
        isPositive: true
      }
    ];
  }, [totalVentasHoy, citasHoy.length, gananciasBarberiaDinámica, gananciasBarberosDinámica, selectedBarberoGanancia]);

  const ventasComparativasPorPeriodo = useMemo(() => {
    const withinDays = (v: Venta, days: number) => {
      const dt = new Date(v.fecha);
      const start = new Date(today);
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return dt >= start && dt <= end;
    };
    const aggregate = (subset: Venta[]) => {
      const prod = new Map<string, { nombre: string; monto: number; cantidad: number }>();
      const serv = new Map<string, { nombre: string; monto: number; cantidad: number }>();
      subset.forEach(v => {
        const pd = Array.isArray(v.productosDetalle) ? v.productosDetalle : [];
        const sd = Array.isArray(v.serviciosDetalle) ? v.serviciosDetalle : [];
        pd.forEach(d => {
          const n = d.nombre || "Producto";
          const m = Number(d.precio || 0) * Number(d.cantidad || 1);
          const e = prod.get(n) || { nombre: n, monto: 0, cantidad: 0 };
          e.monto += m;
          e.cantidad += Number(d.cantidad || 1);
          prod.set(n, e);
        });
        sd.forEach(d => {
          const n = d.nombre || "Servicio";
          const m = Number(d.precio || 0) * Number(d.cantidad || 1);
          const e = serv.get(n) || { nombre: n, monto: 0, cantidad: 0 };
          e.monto += m;
          e.cantidad += Number(d.cantidad || 1);
          serv.set(n, e);
        });
      });
      const topN = (arr: { nombre: string; monto: number; cantidad: number }[]) =>
        arr.sort((a, b) => b.monto - a.monto).slice(0, 4);
      return {
        productos: topN(Array.from(prod.values())),
        servicios: topN(Array.from(serv.values()))
      };
    };
    const semanal = aggregate(ventas.filter(v => withinDays(v, 7)));
    const mensual = aggregate(ventas.filter(v => withinDays(v, 30)));
    const anual = aggregate(ventas.filter(v => withinDays(v, 365)));
    return { semanal, mensual, anual } as const;
  }, [ventas]);

  const ingresosHistoricosPorPeriodo = useMemo(() => {
    const dayNames: string[] = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const sumBuckets = (buckets: { key: string; ventas: Venta[] }[]) => {
      return buckets.map(b => {
        let productos = 0;
        let servicios = 0;
        b.ventas.forEach(v => {
          if (v.totalProductos !== undefined && v.totalServicios !== undefined && (v.totalProductos > 0 || v.totalServicios > 0)) {
            productos += v.totalProductos;
            servicios += v.totalServicios;
          } else {
            const pd = Array.isArray(v.productosDetalle) ? v.productosDetalle : [];
            const sd = Array.isArray(v.serviciosDetalle) ? v.serviciosDetalle : [];
            const pSum = pd.reduce((s, d) => s + (Number(d.precio || 0) * Number(d.cantidad || 1)), 0);
            const sSum = sd.reduce((s, d) => s + (Number(d.precio || 0) * Number(d.cantidad || 1)), 0);
            if (pSum === 0 && sSum === 0 && pd.length === 0 && sd.length === 0) {
              servicios += Number(v.total || 0);
            } else {
              productos += pSum;
              servicios += sSum;
            }
          }
        });
        return { label: b.key, ingresos: productos + servicios, productos, servicios };
      });
    };
    const semanalBuckets: { key: string; ventas: Venta[] }[] = (() => {
      const arr: { key: string; ventas: Venta[] }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const label: string = dayNames[d.getDay()] ?? "";
        arr.push({
          key: label,
          ventas: ventas.filter(v => isSameDay(new Date(v.fecha), d))
        });
      }
      return arr;
    })();
    const mensualBuckets: { key: string; ventas: Venta[] }[] = (() => {
      const arr: { key: string; ventas: Venta[] }[] = [];
      for (let i = 3; i >= 0; i--) {
        const start = new Date(today);
        start.setDate(start.getDate() - (i + 1) * 7);
        const end = new Date(today);
        end.setDate(end.getDate() - i * 7);
        const label = `Semana ${4 - i}`;
        arr.push({
          key: label,
          ventas: ventas.filter(v => {
            const dt = new Date(v.fecha);
            return dt >= start && dt <= end;
          })
        });
      }
      return arr;
    })();
    const monthNames: string[] = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const anualBuckets: { key: string; ventas: Venta[] }[] = (() => {
      const arr: { key: string; ventas: Venta[] }[] = [];
      for (let i = 5; i >= 0; i--) {
        const ref = new Date(today.getFullYear(), today.getMonth(), 1);
        ref.setMonth(ref.getMonth() - i);
        const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
        const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
        const label: string = monthNames[ref.getMonth()] ?? "";
        arr.push({
          key: label,
          ventas: ventas.filter(v => {
            const dt = new Date(v.fecha);
            return dt >= start && dt <= end;
          })
        });
      }
      return arr;
    })();
    return {
      semanal: sumBuckets(semanalBuckets),
      mensual: sumBuckets(mensualBuckets),
      anual: sumBuckets(anualBuckets)
    } as Record<PeriodoClave, Array<{ label: string; ingresos: number; productos: number; servicios: number }>>;
  }, [ventas]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "confirmada": return "bg-primary text-black-primary";
      case "en-curso": return "bg-green-600 text-white";
      case "pendiente": return "bg-grey-medium text-white";
      default: return "bg-gray-medium text-white";
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case "confirmada": return "Confirmada";
      case "en-curso": return "En Curso";
      case "pendiente": return "Pendiente";
      default: return estado;
    }
  };

  const generateDailyReportPDF = () => {
    const ventasRecientesData = (() => {
      const rows: { producto: string; cliente: string; cantidad: number; precioUnit: number }[] = [];
      const ordenadas = [...ventas].filter(v => isVentaActiva(v.estado)).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 20);
      ordenadas.forEach(v => {
        const cliente = v.cliente;
        const det = Array.isArray(v.productosDetalle) ? v.productosDetalle : [];
        det.forEach(d => {
          rows.push({
            producto: d.nombre || "Producto",
            cliente: typeof cliente === "string" ? cliente : "",
            cantidad: Number(d.cantidad || 1),
            precioUnit: Number(d.precio || 0)
          });
        });
      });
      return rows;
    })();
    // Crear el contenido HTML del reporte
    const reportContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte Diario - Elite Barbershop</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'DM Sans', sans-serif;
            background: #ffffff;
            color: #000000;
            line-height: 1.6;
            padding: 20px;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 8px;
          }
          
          .subtitle {
            font-size: 16px;
            color: #000000;
            margin-bottom: 10px;
          }
          
          .date {
            font-size: 14px;
            font-weight: bold;
            color: #000000;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 20px;
          }
          
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 40px;
          }
          
          .metric-card {
            background: #ffffff;
            border: 1px solid #000000;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          
          .metric-title {
            font-size: 14px;
            color: #000000;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .metric-value {
            font-size: 28px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 5px;
          }
          
          .metric-change {
            font-size: 12px;
            color: #000000;
          }
          
          .section {
            margin-bottom: 40px;
          }
          
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #000000;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #000000;
            text-align: center;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            background: #ffffff;
            margin-bottom: 30px;
          }
          
          .table th {
            background: #ffffff;
            color: #000000;
            padding: 12px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000000;
            border-bottom: 2px solid #000000;
          }
          
          .table td {
            padding: 12px;
            border-bottom: 1px solid #000000;
            font-size: 13px;
            text-align: center;
            color: #000000;
          }
          
          .inventory-alert {
            background: #ffffff;
            border: 1px solid #000000;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            text-align: center;
          }
          
          .inventory-alert h4 {
            color: #000000;
            margin-bottom: 8px;
            font-size: 16px;
            font-weight: bold;
          }
          
          .inventory-details {
            font-size: 14px;
            color: #000000;
          }
          
          .footer {
            text-align: center;
            padding: 20px;
            margin-top: 40px;
            font-size: 12px;
            color: #000000;
            border-top: 1px solid #000000;
          }
          
          .highlight {
            font-weight: bold;
          }
          
          .two-column {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          
          @media print {
            body {
              background: #ffffff;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">✂️ MANITO BARBERSHOP</div>
          <div class="subtitle">Reporte Diario de Operaciones</div>
          <div class="date">${new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</div>
        </div>
        
        <div class="container">
          <!-- Métricas Principales -->
          <div class="section">
            <h2 class="section-title">📊 Métricas Principales</h2>
            <div class="metrics-grid">
              ${metrics.map(metric => `
                <div class="metric-card">
                  <div class="metric-title">${metric.title}</div>
                  <div class="metric-value">${metric.value}</div>
                  <div class="metric-change">${metric.change}</div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="two-column">
            <!-- Citas del Día -->
            <div class="section">
              <h2 class="section-title">📅 Citas del Día</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Hora</th>
                    <th>Barbero</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${citasHoy.map(cita => `
                    <tr>
                      <td>${cita.cliente}</td>
                      <td>${cita.servicio}</td>
                      <td>${cita.hora}</td>
                      <td>${cita.barbero}</td>
                        <span>
                          ${getEstadoTexto(cita.estado)}
                        </span>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <!-- Inventario Bajo -->
            <div class="section">
              <h2 class="section-title">⚠️ Inventario Bajo</h2>
              ${inventarioBajo.map(item => `
                <div class="inventory-alert">
                  <h4>${item.producto}</h4>
                  <div class="inventory-details">
                    <strong>Stock Total:</strong> ${item.stockTotal} unidades<br>
                    <strong>min:</strong> ${item.minimo}<br>
                    <strong>Categoría:</strong> ${item.categoria}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Ventas Recientes -->
          <div class="section">
            <h2 class="section-title">💰 Ventas de Productos</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cliente</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${ventasRecientesData.map(venta => `
                  <tr>
                    <td>${venta.producto}</td>
                    <td>${venta.cliente}</td>
                    <td>${venta.cantidad}</td>
                    <td class="highlight">$${formatCurrencyValue(venta.cantidad * venta.precioUnit)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <!-- Resumen del Día -->
          <div class="section">
            <h2 class="section-title">📋 Resumen del Día</h2>
            <div style="background: #ffffff; padding: 20px; border: 1px solid #000000; border-radius: 8px; text-align: center;">
              <p style="margin-bottom: 8px;"><strong>Total de Citas:</strong> ${citasHoy.length} citas programadas</p>
              <p style="margin-bottom: 8px;"><strong>Citas Completadas:</strong> ${citasHoy.filter(c => c.estado === 'en-curso' || c.estado === 'completada').length} finalizadas</p>
              <p style="margin-bottom: 8px;"><strong>Citas Pendientes:</strong> ${citasHoy.filter(c => c.estado === 'pendiente').length} por atender</p>
              <p style="margin-bottom: 8px;"><strong>Productos con Stock Bajo:</strong> ${inventarioBajo.length} requieren restock</p>
              <p><strong>Ventas de Productos:</strong> ${ventasRecientesData.length} transacciones realizadas</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Reporte generado automáticamente el ${new Date().toLocaleString('es-ES')}</p>
          <p><strong class="highlight">MANITO BARBERSHOP</strong> - Sistema de Gestión</p>
        </div>
      </body>
      </html>
    `;

    // Crear un blob con el contenido HTML
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Crear un enlace temporal para descargar
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Diario_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // También abrir en nueva ventana para imprimir como PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();

      // Esperar a que se cargue y luego mostrar el diálogo de impresión
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    }
  };

  const datosPeriodoSeleccionado = ventasComparativasPorPeriodo[periodoIngresos];

  const normalizarRango = (a: string, b: string) => {
    const max = formatDateYMD(new Date());
    let start = a <= b ? a : b;
    let end = a <= b ? b : a;
    if (end > max) end = max;
    if (start > max) start = max;
    return { start, end };
  };

  const exportReportExcel = () => {
    const { start, end } = normalizarRango(reportStart, reportEnd);
    const ventasRango = ventas.filter(v => v.fecha && v.fecha >= start && v.fecha <= end && isVentaActiva(v.estado));
    const rows: Array<Record<string, any>> = [];
    ventasRango.forEach(v => {
      const cliente = v.cliente ?? "";
      const fecha = v.fecha;
      const pd = Array.isArray(v.productosDetalle) ? v.productosDetalle : [];
      const sd = Array.isArray(v.serviciosDetalle) ? v.serviciosDetalle : [];
      pd.forEach(d => {
        const total = Number(d.precio || 0) * Number(d.cantidad || 1);
        rows.push({
          Fecha: fecha,
          Cliente: cliente,
          Tipo: "Producto",
          Nombre: d.nombre || "Producto",
          Cantidad: Number(d.cantidad || 1),
          PrecioUnitario: Number(d.precio || 0),
          Total: total
        });
      });
      sd.forEach(d => {
        const total = Number(d.precio || 0) * Number(d.cantidad || 1);
        rows.push({
          Fecha: fecha,
          Cliente: cliente,
          Tipo: "Servicio",
          Nombre: d.nombre || "Servicio",
          Cantidad: Number(d.cantidad || 1),
          PrecioUnitario: Number(d.precio || 0),
          Total: total
        });
      });
    });
    const wb = XLSX.utils.book_new();
    const wsDetalle = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");

    const totalProductos = rows.filter(r => r.Tipo === "Producto").reduce((s, r) => s + Number(r.Total || 0), 0);
    const totalServicios = rows.filter(r => r.Tipo === "Servicio").reduce((s, r) => s + Number(r.Total || 0), 0);
    const resumen = [
      { Concepto: "Total Productos", Monto: totalProductos },
      { Concepto: "Total Servicios", Monto: totalServicios },
      { Concepto: "Total General", Monto: totalProductos + totalServicios },
      { Concepto: "Ventas en rango", Monto: ventasRango.length }
    ];

    const wsResumen = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    XLSX.writeFile(wb, `Reporte_${start}_a_${end}.xlsx`);
  };

  const generateReportByDatePDF = () => {
    const { start, end } = normalizarRango(reportStart, reportEnd);
    const ventasRango = ventas.filter(v => v.fecha && v.fecha >= start && v.fecha <= end && isVentaActiva(v.estado));
    const serviciosRealizados = agendamientos.filter(a => a.fecha && a.fecha >= start && a.fecha <= end && isCitaCompletada(a.estado)).length;
    const filas = (() => {
      const arr: { fecha: string; cliente: string; tipo: string; nombre: string; cantidad: number; total: number }[] = [];
      ventasRango.forEach(v => {
        const cliente = v.cliente ?? "";
        const fecha = v.fecha;
        const pd = Array.isArray(v.productosDetalle) ? v.productosDetalle : [];
        const sd = Array.isArray(v.serviciosDetalle) ? v.serviciosDetalle : [];
        pd.forEach(d => arr.push({ fecha, cliente, tipo: "Producto", nombre: d.nombre || "Producto", cantidad: Number(d.cantidad || 1), total: Number(d.precio || 0) * Number(d.cantidad || 1) }));
        sd.forEach(d => arr.push({ fecha, cliente, tipo: "Servicio", nombre: d.nombre || "Servicio", cantidad: Number(d.cantidad || 1), total: Number(d.precio || 0) * Number(d.cantidad || 1) }));
      });
      return arr;
    })();
    const totalGeneral = filas.reduce((s, f) => s + f.total, 0);
    const totalProductos = filas.filter(f => f.tipo === "Producto").reduce((s, f) => s + f.total, 0);
    const totalServicios = filas.filter(f => f.tipo === "Servicio").reduce((s, f) => s + f.total, 0);
    const rowsHtml = filas.slice(0, 50).map(f => `
      <tr>
        <td>${f.fecha}</td>
        <td>${f.cliente}</td>
        <td>${f.tipo}</td>
        <td>${f.nombre}</td>
        <td>${f.cantidad}</td>
        <td class="mono">$${formatCurrencyValue(f.total)}</td>
      </tr>
    `).join("");
    const reportContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte por Fecha</title>
        <style>
          body { font-family: 'DM Sans', Arial, sans-serif; color: #000000; margin: 0; padding: 24px; background: #ffffff; }
          .header { background: #ffffff; color: #000000; padding: 20px; border-bottom: 2px solid #000000; margin-bottom: 30px; text-align: center; }
          .range { color: #000000; margin-top: 6px; font-size: 14px; font-weight: bold; }
          .grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 15px; margin-bottom: 30px; }
          .card { border: 1px solid #000000; border-radius: 8px; padding: 15px; background: #ffffff; text-align: center; }
          .title { font-size: 14px; color: #000000; font-weight: bold; }
          .value { font-size: 24px; font-weight: 700; color: #000000; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; background: #ffffff; margin-bottom: 30px; }
          th { background: #ffffff; color: #000000; text-align: center; padding: 12px; font-size: 14px; border-top: 2px solid #000000; border-bottom: 2px solid #000000; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #000000; font-size: 13px; text-align: center; color: #000000; }
          .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
          .note { color: #000000; font-size: 12px; margin-top: 20px; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
          h3 { text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 22px; font-weight: 800;">MANITO BARBERSHOP</div>
          <div style="font-size: 16px;">Reporte por Fecha</div>
          <div class="range">Desde ${start} hasta ${end}</div>
        </div>
        <div class="grid">
          <div class="card"><div class="title">Ventas en rango</div><div class="value">${ventasRango.length}</div></div>
          <div class="card"><div class="title">Servicios realizados</div><div class="value">${serviciosRealizados}</div></div>
          <div class="card"><div class="title">Total ingresos</div><div class="value">$${formatCurrencyValue(totalGeneral)}</div></div>
          <div class="card"><div class="title">Productos</div><div class="value">$${formatCurrencyValue(totalProductos)}</div></div>
          <div class="card"><div class="title">Servicios</div><div class="value">$${formatCurrencyValue(totalServicios)}</div></div>
        </div>
        <h3 style="margin:12px 0;">Detalle (máx. 50 filas)</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Nombre</th>
              <th>Cant.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="note">Generado el ${new Date().toLocaleString('es-ES')}</div>
      </body>
      </html>
    `;
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_${start}_a_${end}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(reportContent);
      win.document.close();
      setTimeout(() => win.print(), 600);
    }
  };

  type ItemComparativa = {
    grupo: "Productos" | "Servicios";
    groupLabel: string;
    nombre: string;
    monto: number;
    cantidad: number;
    esSeparador?: false;
  } | {
    grupo: "Separador";
    groupLabel: "";
    nombre: " ";
    monto: 0;
    cantidad: 0;
    esSeparador: true;
  };

  const comparativaIngresos: ItemComparativa[] = useMemo(() => {
    const productos = datosPeriodoSeleccionado.productos.map((item, idx) => ({
      grupo: "Productos" as const,
      groupLabel: idx === 0 ? "Productos" : "",
      nombre: item.nombre,
      monto: item.monto,
      cantidad: item.cantidad,
    }));
    const servicios = datosPeriodoSeleccionado.servicios.map((item, idx) => ({
      grupo: "Servicios" as const,
      groupLabel: idx === 0 ? "Servicios" : "",
      nombre: item.nombre,
      monto: item.monto,
      cantidad: item.cantidad,
    }));
    return [
      ...productos,
      { grupo: "Separador", groupLabel: "", nombre: " ", monto: 0, cantidad: 0, esSeparador: true } as const,
      ...servicios,
    ];
  }, [datosPeriodoSeleccionado]);

  const totalProductos = datosPeriodoSeleccionado.productos.reduce((acc, item) => acc + item.monto, 0);
  const totalServicios = datosPeriodoSeleccionado.servicios.reduce((acc, item) => acc + item.monto, 0);
  const totalGeneralIngresos = totalProductos + totalServicios;
  const participacionProductos = totalGeneralIngresos ? (totalProductos / totalGeneralIngresos) * 100 : 0;
  const participacionServicios = totalGeneralIngresos ? (totalServicios / totalGeneralIngresos) * 100 : 0;



  // removed unused totalIngresosRecientes
  const renderIngresosTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload;
    if (!item || item.esSeparador) return null;
    return (
      <div
        className="rounded-2xl border px-4 py-3 min-w-[220px]"
        style={{
          borderColor: item.grupo === "Productos" ? colors.gold : "#3b6473",
          backgroundColor: item.grupo === "Productos" ? "#241c13" : "#121528",
        }}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-gray-lightest mb-1">{item.grupo}</p>
        <p className="text-base font-semibold text-white-primary">{item.nombre}</p>
        <div className="mt-3 text-sm text-gray-lightest space-y-1">
          <div className="flex justify-between">
            <span>Unidades:</span>
            <span className="text-white-primary font-semibold">{item.cantidad}</span>
          </div>
          <div className="flex justify-between">
            <span>Ingresos:</span>
            <span
              className={`font-semibold ${item.grupo === "Productos" ? "text-orange-primary" : "text-blue-300"
                }`}
            >
              ${formatCurrencyValue(item.monto)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const ingresosTotalesPorPeriodo = useMemo(() => {
    const periodos: { periodo: PeriodoClave; days: number }[] = [
      { periodo: "semanal", days: 7 },
      { periodo: "mensual", days: 30 },
      { periodo: "anual", days: 365 },
    ];
    const withinDaysLocal = (fechaStr: string, days: number) => {
      if (!fechaStr) return false;
      const dateOnly = fechaStr.split('T')[0];
      const start = new Date(today);
      start.setDate(start.getDate() - (days - 1));
      const startStr = formatDateYMD(start);
      return dateOnly >= startStr && dateOnly <= todayYMD;
    };
    return periodos.map(({ periodo, days }) => {
      const subset = ventas.filter(v => withinDaysLocal(v.fecha, days));
      let productos = 0;
      let servicios = 0;
      subset.forEach(v => {
        if (v.totalProductos !== undefined && v.totalServicios !== undefined && (v.totalProductos > 0 || v.totalServicios > 0)) {
          productos += v.totalProductos;
          servicios += v.totalServicios;
        } else {
          const pd = Array.isArray(v.productosDetalle) ? v.productosDetalle : [];
          const sd = Array.isArray(v.serviciosDetalle) ? v.serviciosDetalle : [];
          const pSum = pd.reduce((s, d) => s + (Number(d.precio || 0) * Number(d.cantidad || 1)), 0);
          const sSum = sd.reduce((s, d) => s + (Number(d.precio || 0) * Number(d.cantidad || 1)), 0);
          if (pSum === 0 && sSum === 0 && pd.length === 0 && sd.length === 0) {
            servicios += Number(v.total || 0);
          } else {
            productos += pSum;
            servicios += sSum;
          }
        }
      });
      return {
        periodo,
        label: periodoLabels[periodo],
        ingresos: productos + servicios,
        productos,
        servicios,
      };
    });
  }, [ventas]);

  const renderIngresosTotalesTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const punto = payload[0]?.payload;
    if (!punto) return null;
    return (
      <div className="rounded-2xl border border-gray-dark bg-black/90 px-4 py-3 min-w-[220px] space-y-1">
        <p className="text-sm text-white-primary font-semibold">{punto.label}</p>
        <p className="text-xs text-gray-lightest">Ingresos totales del periodo</p>
        <p className="text-xl text-orange-primary font-bold">${formatCurrencyValue(punto.ingresos)}</p>
        <div className="text-xs text-gray-lightest">
          <p>Productos: ${formatCurrencyValue(punto.productos)}</p>
          <p>Servicios: ${formatCurrencyValue(punto.servicios)}</p>
        </div>
      </div>
    );
  };

  const legendPayload = useMemo(
    () => [
      {
        value: "Ingresos totales",
        type: "line" as LegendType,
        color: "#d8b081",
      },
    ],
    []
  );
  // ===== Análisis de compras (últimos 90 días) =====

  // Gasto total por semana/mes para ver tendencia
  const comprasHistoricas = useMemo(() => {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const buckets: { key: string; total: number; proveedorTop: string; proveedorTopTotal: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = monthNames[ref.getMonth()] ?? "";
      const mesCompras = comprasStats.filter(
        (c) => c.fechaRegistro && new Date(c.fechaRegistro) >= start && new Date(c.fechaRegistro) <= end
      );
      const total = mesCompras.reduce((s, c) => s + c.total, 0);
      const provMap = new Map<string, number>();
      mesCompras.forEach((c) => {
        const prov = c.proveedor || "Sin proveedor";
        provMap.set(prov, (provMap.get(prov) || 0) + c.total);
      });
      const topEntry = Array.from(provMap.entries()).sort((a, b) => b[1] - a[1])[0];
      buckets.push({
        key: label,
        total,
        proveedorTop: topEntry ? topEntry[0] : "—",
        proveedorTopTotal: topEntry ? topEntry[1] : 0,
      });
    }
    return buckets;
  }, [comprasStats]);


  // Resumen numérico de compras
  const resumenCompras = useMemo(() => {
    const totalGastado = comprasStats.reduce((s, c) => s + c.total, 0);
    const numCompras = comprasStats.length;
    const promedioPorCompra = numCompras > 0 ? totalGastado / numCompras : 0;
    const proveedoresUnicos = new Set(comprasStats.map((c) => c.proveedor || "")).size;
    return { totalGastado, numCompras, promedioPorCompra, proveedoresUnicos };
  }, [comprasStats]);

  // ===== Resumen semanal rápido =====
  const esCitaCancelada = (estado: string) => {
    const st = String(estado || "").toLowerCase();
    return st === "cancelada" || st === "cancelado" || st === "anulada";
  };

  const resumenSemanal = useMemo(() => {
    const citasSemana = agendamientosStats.filter((a) => {
      if (!a.fechaHora) return false;
      const dt = new Date(a.fechaHora);
      return dt >= startOfWeek && dt <= endOfWeek;
    });
    const canceladas = citasSemana.filter((a) => esCitaCancelada(a.estado)).length;
    const confirmadas = citasSemana.filter((a) => !esCitaCancelada(a.estado)).length;

    const ventasSemana = ventas.filter((v) => {
      const dt = new Date(v.fecha);
      return dt >= startOfWeek && dt <= endOfWeek && isVentaActiva(v.estado);
    });
    const ingresos = ventasSemana.reduce((s, v) => s + Number(v.total || 0), 0);
    const serviciosVendidos = ventasSemana.reduce((s, v) => {
      const sd = Array.isArray(v.serviciosDetalle) ? v.serviciosDetalle : [];
      return s + sd.reduce((ss, d) => ss + Number(d.cantidad || 1), 0);
    }, 0);

    return { confirmadas, canceladas, ingresos, serviciosVendidos };
  }, [agendamientosStats, ventas, startOfWeek, endOfWeek]);

  // ===== Análisis de operación, equipo y clientes (últimos 90 días) =====
  // 1. Tasa de éxito de citas (completadas vs canceladas, filtrable por periodo)
  const tasaExitoCitas = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (periodoTasaCitas === "dia") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (periodoTasaCitas === "semana") {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    let completadas = 0;
    let canceladas = 0;
    agendamientosStats.forEach((a) => {
      if (!a.fechaHora || new Date(a.fechaHora) < start) return;
      const st = String(a.estado || "").toLowerCase();
      if (st === "completada" || st === "en-curso") completadas++;
      else if (esCitaCancelada(st)) canceladas++;
    });
    const total = completadas + canceladas;
    const tasaExito = total > 0 ? (completadas / total) * 100 : 0;
    const data = [
      { name: "Completadas", value: completadas, fill: "#22c55e" },
      { name: "Canceladas", value: canceladas, fill: "#b07070" },
    ].filter((d) => d.value > 0);
    return { completadas, canceladas, total, tasaExito, data };
  }, [agendamientosStats, periodoTasaCitas]);

  // 2. Horas pico (demanda por hora del día, citas no canceladas)
  const horasPico = useMemo(() => {
    const conteo = new Map<number, number>();
    agendamientosStats.forEach((a) => {
      if (esCitaCancelada(a.estado) || !a.fechaHora) return;
      const h = new Date(a.fechaHora).getHours();
      if (Number.isNaN(h)) return;
      conteo.set(h, (conteo.get(h) || 0) + 1);
    });
    const arr: { hora: string; citas: number }[] = [];
    for (let h = 9; h <= 23; h++) {
      const label = h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
      arr.push({ hora: label, citas: conteo.get(h) || 0 });
    }
    return arr;
  }, [agendamientosStats]);

  // Vista semana: ingresos por día de la semana en el año seleccionado
  const dataSemanaHorasPico = useMemo(() => {
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const totales = new Array(7).fill(0);
    ventas.filter(v => new Date(v.fecha).getFullYear() === anioHorasPico && isVentaActiva(v.estado)).forEach(v => {
      const d = new Date(v.fecha).getDay();
      totales[d] += Number(v.total || 0);
    });
    // Ordenar Lun-Dom (índice 1-6, luego 0)
    return [1, 2, 3, 4, 5, 6, 0].map(i => ({ label: dias[i], ingresos: totales[i] }));
  }, [ventas, anioHorasPico]);

  // Vista mes: ingresos por mes en el año seleccionado
  const dataMesHorasPico = useMemo(() => {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const totales = new Array(12).fill(0);
    ventas.filter(v => new Date(v.fecha).getFullYear() === anioHorasPico && isVentaActiva(v.estado)).forEach(v => {
      const m = new Date(v.fecha).getMonth();
      totales[m] += Number(v.total || 0);
    });
    return meses.map((label, i) => ({ label, ingresos: totales[i], mesIndex: i }));
  }, [ventas, anioHorasPico]);

  // Drilldown: ingresos por día del mes seleccionado
  const dataDiasMes = useMemo(() => {
    if (mesSeleccionadoDrilldown === null) return [];
    const diasEnMes = new Date(anioHorasPico, mesSeleccionadoDrilldown + 1, 0).getDate();
    const totales = new Array(diasEnMes).fill(0);
    ventas
      .filter(v => {
        const d = new Date(v.fecha);
        return d.getFullYear() === anioHorasPico && d.getMonth() === mesSeleccionadoDrilldown && isVentaActiva(v.estado);
      })
      .forEach(v => {
        totales[new Date(v.fecha).getDate() - 1] += Number(v.total || 0);
      });
    return totales.map((ingresos, i) => ({ label: String(i + 1), ingresos }));
  }, [ventas, anioHorasPico, mesSeleccionadoDrilldown]);

  // 3. Ranking de barberos por ingresos generados (filtrable por día/semana/mes)
  const rankingBarberos = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (periodoRankingBarberos === "dia") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (periodoRankingBarberos === "semana") {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    const map = new Map<string, { barbero: string; ingresos: number }>();
    ventas.forEach((v) => {
      const name = (v.barbero || "").trim();
      if (!name || name === "Sin asignar" || !isVentaActiva(v.estado)) return;
      if (!v.fecha || new Date(v.fecha) < start) return;
      const e = map.get(name) || { barbero: name, ingresos: 0 };
      e.ingresos += Number(v.total || 0);
      map.set(name, e);
    });
    return Array.from(map.values())
      .filter((x) => x.ingresos > 0)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5);
  }, [ventas, periodoRankingBarberos]);

  // 4. Clientes: recurrentes vs ocasionales + top por frecuencia
  const clientesAnalisis = useMemo(() => {
    const map = new Map<string, { nombre: string; visitas: number }>();
    const add = (id: number | null | undefined, nombre: string | null | undefined) => {
      const key = id != null ? `id:${id}` : nombre ? `n:${nombre.toLowerCase().trim()}` : null;
      if (!key) return;
      const e = map.get(key) || { nombre: nombre || "Cliente", visitas: 0 };
      e.visitas++;
      if (nombre) e.nombre = nombre;
      map.set(key, e);
    };
    agendamientosStats.forEach((a) => {
      if (esCitaCancelada(a.estado)) return;
      add(a.clienteId, a.cliente);
    });
    ventas.forEach((v) => {
      if (!isVentaActiva(v.estado)) return;
      add(v.clienteId, v.cliente);
    });
    const arr = Array.from(map.values());
    const recurrentes = arr.filter((c) => c.visitas >= 2).length;
    const ocasionales = arr.filter((c) => c.visitas === 1).length;
    const top = [...arr].sort((a, b) => b.visitas - a.visitas).slice(0, 5);
    const data = [
      { name: "Recurrentes", value: recurrentes, fill: colors.gold },
      { name: "Ocasionales", value: ocasionales, fill: "#3b6473" },
    ].filter((d) => d.value > 0);
    return { recurrentes, ocasionales, total: arr.length, top, data };
  }, [agendamientosStats, ventas, colors.gold]);

  const [periodoPrincipal, setPeriodoPrincipal] = useState<PeriodoClave>("mensual");
  const dataGraficaPrincipal = ingresosHistoricosPorPeriodo[periodoPrincipal];

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Dashboard</h1>
            <p className="text-sm text-gray-lightest mt-1">Vista general del sistema</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="elegante-tag-gold">
              Hoy: {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <button
              onClick={generateDailyReportPDF}
              className="elegante-button-primary gap-2 flex items-center hover:scale-105 transition-transform"
              title="Generar y descargar reporte diario en PDF"
            >
              <Download className="w-4 h-4" />
              Reporte Diario
            </button>
            <button
              onClick={() => {
                setIsLoading(true);
                setErrorMsg("");
                fetchDashboardData().then((data) => {
                  setVentas(data.ventas);
                  setAgendamientos(data.agendamientos);
                  setInsumos(data.insumos);
                  setAgendamientosStats(data.agendamientosStats);
                  setComprasStats(data.comprasStats);
                }).catch(() => {
                  setErrorMsg("No se pudo cargar la información del backend");
                }).finally(() => {
                  setIsLoading(false);
                });
              }}
              className="elegante-button-primary gap-2 flex items-center hover:scale-105 transition-transform"
              title="Actualizar datos del panel"
            >
              <RotateCcw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        {/* Indicadores resumidos */}
        <section className="mt-5 mb-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white-primary mb-2">Indicadores del Día</h3>
              <p className="text-gray-lightest font-medium">
                Estado rápido de ventas, citas, clientes y servicios.
              </p>
            </div>
            <div className="relative">
              <button
                ref={reportButtonRef}
                onClick={() => setShowReport(!showReport)}
                className="elegante-button-primary gap-2 flex items-center hover:scale-105 transition-transform"
                title="Reporte por fecha"
              >
                <span>Reporte por fecha</span>
                {showReport ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showReport && (
                <div
                  className="absolute right-0 mt-2 p-4 rounded-xl border border-gray-dark bg-gray-darkest z-50 shadow-xl"
                  style={{ width: reportWidth || undefined }}
                >
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-primary" />
                        Desde
                      </Label>
                      <DatePicker
                        value={reportStart}
                        max={todayYMD}
                        onChange={(v) => {
                          const capped = v > todayYMD ? todayYMD : v;
                          setReportStart(capped);
                          if (reportEnd < capped) setReportEnd(capped);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-primary" />
                        Hasta
                      </Label>
                      <DatePicker
                        value={reportEnd}
                        max={todayYMD}
                        onChange={(v) => {
                          const capped = v > todayYMD ? todayYMD : v;
                          setReportEnd(capped);
                          if (capped < reportStart) setReportStart(capped);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={generateReportByDatePDF}
                        className="elegante-button-primary gap-2 flex items-center w-full justify-center"
                        title="Exportar reporte en PDF"
                      >
                        <FileDown className="w-4 h-4" />
                        PDF
                      </button>
                      <button
                        onClick={exportReportExcel}
                        className="elegante-button-primary gap-2 flex items-center w-full justify-center"
                        title="Exportar reporte en Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {errorMsg && (
            <div className="rounded-lg border border-red-600/40 bg-red-900/30 text-red-300 px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setIsLoading(true);
                  fetchDashboardData().then((data) => {
                    setVentas(data.ventas);
                    setAgendamientos(data.agendamientos);
                    setInsumos(data.insumos);
                    setAgendamientosStats(data.agendamientosStats);
                    setComprasStats(data.comprasStats);
                  }).catch(() => {
                    setErrorMsg("No se pudo cargar la información del backend");
                  }).finally(() => setIsLoading(false));
                }}
                className="elegante-button-primary text-sm py-1.5 px-3 gap-1.5 flex items-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reintentar
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            {isLoading
              ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={`metric-skeleton-${idx}`} className="rounded-xl bg-gray-darkest p-5 flex items-center justify-center min-h-[112px]">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-dark border-t-orange-primary animate-spin" />
                </div>
              ))
              : metrics.map(metric => {
                const Icon = metric.icon;
                const isGanancia = metric.id === "ganancia-barberia" || metric.id === "ganancias-barberos";

                if (metric.id === "ganancias-barberos") {
                  return (
                    <div key={metric.title} className="rounded-xl bg-gray-darkest p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-gray-lightest uppercase tracking-[0.2em] leading-tight">{metric.title}</p>
                          <div className="w-7 h-7 rounded-lg bg-orange-primary/10 border border-orange-primary/30 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-orange-primary" />
                          </div>
                        </div>
                        <p className="text-3xl font-bold text-white-primary leading-none">{metric.value}</p>

                        {/* Filtro de periodo — pills */}
                        <div className="flex items-center rounded-lg border border-gray-dark overflow-hidden">
                          {(["hoy", "semanal", "mensual", "anual"] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => setFiltroBarberosPeriodo(p)}
                              className={`flex-1 py-1 text-[11px] font-semibold transition-colors ${filtroBarberosPeriodo === p ? "bg-orange-primary text-black-primary" : "text-gray-lightest hover:bg-white/5"}`}
                            >
                              {p === "hoy" ? "Hoy" : p === "semanal" ? "Sem" : p === "mensual" ? "Mes" : "Año"}
                            </button>
                          ))}
                        </div>

                        {/* Filtro de barbero — buscador personalizado */}
                        <div className="relative" ref={barberoSelectRef}>
                          <button
                            type="button"
                            onClick={() => { setBarberoSearchOpen(!barberoSearchOpen); setBarberoSearch(""); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-darker border border-gray-dark hover:border-orange-primary/50 transition-colors text-xs"
                          >
                            <span className={selectedBarberoGanancia === "Todos" ? "text-gray-lightest" : "text-orange-primary font-semibold truncate"}>
                              {selectedBarberoGanancia === "Todos" ? "Todos los barberos" : selectedBarberoGanancia}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-lightest shrink-0 transition-transform ${barberoSearchOpen ? "rotate-180" : ""}`} />
                          </button>

                          {barberoSearchOpen && (
                            <div className="absolute bottom-full mb-1 left-0 right-0 rounded-xl shadow-2xl z-[300] overflow-hidden" style={{ backgroundColor: "#1a1919", border: "1px solid rgba(216,176,129,0.3)" }}>
                              {/* Input de búsqueda */}
                              <div className="p-2" style={{ borderBottom: "1px solid #3a3a3a" }}>
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Buscar barbero..."
                                  value={barberoSearch}
                                  onChange={(e) => setBarberoSearch(e.target.value)}
                                  className="w-full text-white-primary text-xs px-3 py-2 rounded-lg outline-none placeholder:text-gray-light transition-colors"
                                  style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}
                                />
                              </div>
                              {/* Lista filtrada — máx. 5 items visibles con scroll */}
                              <div className="overflow-y-auto py-1" style={{ maxHeight: "160px", backgroundColor: "#1a1919" }}>
                                {["Todos", ...listaBarberosUnicos]
                                  .filter(b => b === "Todos" || b.toLowerCase().includes(barberoSearch.toLowerCase()))
                                  .map(b => (
                                    <button
                                      key={b}
                                      type="button"
                                      onClick={() => { setSelectedBarberoGanancia(b); setBarberoSearchOpen(false); setBarberoSearch(""); }}
                                      style={{ backgroundColor: selectedBarberoGanancia === b ? "rgba(216,176,129,0.15)" : "transparent" }}
                                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                                        selectedBarberoGanancia === b
                                          ? "text-orange-primary font-semibold"
                                          : "text-gray-lightest hover:bg-gray-dark"
                                      }`}
                                    >
                                      {selectedBarberoGanancia === b && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-primary shrink-0" />
                                      )}
                                      {b === "Todos" ? "Todos los barberos" : b}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                    </div>
                  );
                }

                if (metric.id === "ganancia-barberia") {
                  return (
                    <div key={metric.title} className="rounded-xl bg-gray-darkest p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <p className="text-xs text-gray-lightest uppercase tracking-[0.2em] leading-tight">{metric.title}</p>
                          <div className="w-8 h-8 rounded-xl bg-gray-darker border border-gray-dark flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-orange-primary" />
                          </div>
                        </div>
                        <p className="text-3xl font-bold text-white-primary mb-1">{metric.value}</p>
                        <p className="text-xs text-gray-lightest mt-1">{metric.change}</p>
                    </div>
                  );
                }

                return (
                  <div key={metric.title} className="rounded-xl bg-gray-darkest p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-lightest uppercase tracking-[0.2em]">{metric.title}</p>
                      <p className="text-3xl font-bold text-white-primary mt-2">{metric.value}</p>
                      <span className="text-sm font-semibold text-gray-lightest">{metric.change}</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-darker border border-gray-dark flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${metric.iconColor}`} />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
        {/* Rendimiento por periodo — ancho completo */}
        <section className="mb-12">
          <div className="rounded-xl p-6 mb-6 bg-gray-darkest">
            <div className="pb-4 border-b border-gray-dark flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {periodoHorasPico === "mes" && mesSeleccionadoDrilldown !== null && (
                  <button
                    onClick={() => setMesSeleccionadoDrilldown(null)}
                    className="flex items-center gap-1 text-sm text-orange-primary hover:opacity-75 transition-opacity"
                  >
                    ← Volver
                  </button>
                )}
                <div>
                  <h4 className="text-lg font-bold text-white-primary mb-1">
                    {periodoHorasPico === "dia"
                      ? "Horas pico"
                      : periodoHorasPico === "semana"
                      ? "Días con más ingresos"
                      : mesSeleccionadoDrilldown !== null
                      ? `Días de ${["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][mesSeleccionadoDrilldown]} ${anioHorasPico}`
                      : "Meses con más ingresos"}
                  </h4>
                  <p className="text-sm text-gray-lightest">
                    {periodoHorasPico === "dia"
                      ? "Cantidad de citas por hora del día (últimos 90 días)"
                      : periodoHorasPico === "semana"
                      ? `Ingresos totales por día de la semana — ${anioHorasPico}`
                      : mesSeleccionadoDrilldown !== null
                      ? "Ingresos por día del mes"
                      : `Ingresos totales por mes — ${anioHorasPico} • Haz clic en un mes para ver sus días`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Selector de año con controles (solo para semana y mes) */}
                {periodoHorasPico !== "dia" && (
                  <div className="flex items-center rounded-lg border border-gray-dark overflow-hidden">
                    <button
                      onClick={() => { if (anioHorasPico > 2025) { setAnioHorasPico(anioHorasPico - 1); setMesSeleccionadoDrilldown(null); } }}
                      disabled={anioHorasPico <= 2025}
                      className="px-3 py-1.5 text-sm text-gray-lightest hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ‹
                    </button>
                    <span className="px-3 py-1.5 text-sm font-semibold text-white-primary border-x border-gray-dark select-none min-w-[52px] text-center">
                      {anioHorasPico}
                    </span>
                    <button
                      onClick={() => { if (anioHorasPico < new Date().getFullYear()) { setAnioHorasPico(anioHorasPico + 1); setMesSeleccionadoDrilldown(null); } }}
                      disabled={anioHorasPico >= new Date().getFullYear()}
                      className="px-3 py-1.5 text-sm text-gray-lightest hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ›
                    </button>
                  </div>
                )}
                {/* Selector de modo */}
                <div className="flex items-center rounded-lg border border-gray-dark overflow-hidden">
                  {(["dia", "semana", "mes"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => { setPeriodoHorasPico(p); setMesSeleccionadoDrilldown(null); }}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${periodoHorasPico === p ? "bg-orange-primary text-black-primary" : "text-gray-lightest hover:bg-white/5"}`}
                    >
                      {p === "dia" ? "Día" : p === "semana" ? "Semana" : "Mes"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-6" style={{ height: "360px" }}>
              {isLoading ? (
                <div className="h-full w-full rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-full border-2 border-gray-dark border-t-orange-primary animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {periodoHorasPico === "dia" ? (
                    <BarChart data={horasPico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="hora" stroke="#888" tick={{ fill: "#ccc", fontSize: 13 }} interval={0} />
                      <YAxis stroke="#888" allowDecimals={false} tick={{ fill: "#ccc", fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: "#ffffff10" }}
                        contentStyle={{ backgroundColor: "#1a1919", border: `1px solid ${colors.primary}`, borderRadius: 12 }}
                        itemStyle={{ color: "#d0d0d0" }}
                        labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                        formatter={(value: any) => [`${value} citas`, "Citas"]}
                      />
                      <Bar dataKey="citas" radius={[8, 8, 0, 0]} fill={colors.gold} />
                    </BarChart>
                  ) : periodoHorasPico === "semana" ? (
                    <BarChart data={dataSemanaHorasPico} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="label" stroke="#888" tick={{ fill: "#ccc", fontSize: 13 }} />
                      <YAxis stroke="#888" tickFormatter={v => `$${formatAxisValue(v as number)}`} tick={{ fill: "#ccc", fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: "#ffffff10" }}
                        contentStyle={{ backgroundColor: "#1a1919", border: `1px solid ${colors.primary}`, borderRadius: 12 }}
                        itemStyle={{ color: "#d0d0d0" }}
                        labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                        formatter={(value: any) => [`$${formatCurrencyValue(value as number)}`, "Ingresos"]}
                      />
                      <Bar dataKey="ingresos" radius={[8, 8, 0, 0]} fill={colors.gold}>
                        {dataSemanaHorasPico.map((e, i) => {
                          const max = Math.max(...dataSemanaHorasPico.map(x => x.ingresos));
                          return <Cell key={`s-${i}`} fill={e.ingresos === max && max > 0 ? "#22c55e" : colors.gold} />;
                        })}
                      </Bar>
                    </BarChart>
                  ) : mesSeleccionadoDrilldown === null ? (
                    <BarChart
                      data={dataMesHorasPico}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      onClick={(data: any) => {
                        const idx = data?.activePayload?.[0]?.payload?.mesIndex;
                        if (idx !== undefined) setMesSeleccionadoDrilldown(idx);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="label" stroke="#888" tick={{ fill: "#ccc", fontSize: 13 }} />
                      <YAxis stroke="#888" tickFormatter={v => `$${formatAxisValue(v as number)}`} tick={{ fill: "#ccc", fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: "#ffffff18" }}
                        contentStyle={{ backgroundColor: "#1a1919", border: `1px solid ${colors.primary}`, borderRadius: 12 }}
                        itemStyle={{ color: "#d0d0d0" }}
                        labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                        formatter={(value: any) => [`$${formatCurrencyValue(value as number)}`, "Ingresos"]}
                      />
                      <Bar dataKey="ingresos" radius={[8, 8, 0, 0]} fill={colors.gold} cursor="pointer">
                        {dataMesHorasPico.map((e, i) => {
                          const max = Math.max(...dataMesHorasPico.map(x => x.ingresos));
                          return <Cell key={`m-${i}`} fill={e.ingresos === max && max > 0 ? "#22c55e" : colors.gold} />;
                        })}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart data={dataDiasMes} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="label" stroke="#888" tick={{ fill: "#ccc", fontSize: 11 }} label={{ value: "Día", position: "insideBottom", offset: -2, fill: "#888", fontSize: 12 }} />
                      <YAxis stroke="#888" tickFormatter={v => `$${formatAxisValue(v as number)}`} tick={{ fill: "#ccc", fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: "#ffffff10" }}
                        contentStyle={{ backgroundColor: "#1a1919", border: `1px solid ${colors.primary}`, borderRadius: 12 }}
                        itemStyle={{ color: "#d0d0d0" }}
                        labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                        formatter={(value: any) => [`$${formatCurrencyValue(value as number)}`, "Ingresos"]}
                        labelFormatter={(label: any) => `Día ${label}`}
                      />
                      <Bar dataKey="ingresos" radius={[6, 6, 0, 0]} fill={colors.gold}>
                        {dataDiasMes.map((e, i) => {
                          const max = Math.max(...dataDiasMes.map(x => x.ingresos));
                          return <Cell key={`d-${i}`} fill={e.ingresos === max && max > 0 ? "#22c55e" : colors.gold} />;
                        })}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>





        {/* Operación, Equipo y Clientes (últimos 90 días) */}
        <section className="mb-10" style={{ marginTop: "40px" }}>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white-primary mb-2">Operación, Equipo y Clientes</h3>
            <p className="text-gray-lightest font-medium">
              Indicadores de citas, rendimiento de barberos y fidelidad de clientes (últimos 90 días).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Tasa de éxito de citas */}
            <div className="rounded-xl p-6 mb-6 bg-gray-darkest">
              <div className="pb-4 border-b border-gray-dark flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-bold text-white-primary mb-1">Completitud de citas</h4>
                  <p className="text-sm text-gray-lightest">{tasaExitoCitas.total} citas · completadas vs canceladas</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-1">
                    {(["dia", "semana", "mes"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriodoTasaCitas(p)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          periodoTasaCitas === p
                            ? "bg-orange-primary text-white"
                            : "bg-gray-darker text-gray-lightest hover:bg-gray-dark"
                        }`}
                      >
                        {p === "dia" ? "Hoy" : p === "semana" ? "Semana" : "Mes"}
                      </button>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-lightest uppercase tracking-[0.2em]">Tasa de éxito</p>
                    <p className={`text-2xl font-bold ${tasaExitoCitas.tasaExito >= 70 ? "text-green-400" : tasaExitoCitas.tasaExito >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                      {tasaExitoCitas.tasaExito.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4" style={{ height: "300px" }}>
                {isLoading ? (
                  <div className="h-full w-full rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-full border-2 border-gray-dark border-t-orange-primary animate-spin" />
                </div>
                ) : tasaExitoCitas.total === 0 ? (
                  <div className="flex h-full items-center justify-center text-gray-lightest text-sm">Sin citas completadas o canceladas en este periodo.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tasaExitoCitas.data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {tasaExitoCitas.data.map((e, i) => (
                          <Cell key={`tasa-${i}`} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1919", border: `1px solid ${colors.primary}`, borderRadius: 12 }}
                        itemStyle={{ color: "#d0d0d0" }}
                        labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                        formatter={(value: any, name: any) => [`${value} citas`, name]}
                      />
                      <Legend formatter={(value) => <span className="text-sm text-gray-lightest">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Inventario Bajo */}
            <div className="rounded-xl p-6 mb-6 bg-gray-darkest">
              <div className="pb-4 border-b border-gray-dark">
                <h4 className="text-lg font-bold text-white-primary mb-1">Inventario Bajo</h4>
                <p className="text-sm text-gray-lightest">Productos que necesitan restock</p>
              </div>
              <div className="pt-4 space-y-3">
                {isLoading ? (
                  <div className="h-40 w-full rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-8 h-8 rounded-full border-2 border-gray-dark border-t-orange-primary animate-spin" />
                  </div>
                ) : inventarioBajo.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-gray-lightest text-sm">Sin productos con stock bajo.</div>
                ) : (
                  inventarioBajo.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-4 py-3 px-2 rounded-lg hover:bg-gray-darker transition-colors cursor-default"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Package className="w-4 h-4 text-gray-lightest shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-white-primary truncate">{item.producto}</span>
                          <span className="text-xs text-gray-lightest">{item.categoria}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-sm">
                        <span className="text-red-400 font-bold">Stock: {item.stockTotal}</span>
                        <button
                          onClick={() => onNavigate?.("RegistrarCompra", { producto: item.producto })}
                          className="w-6 h-6 rounded-md bg-gray-dark hover:bg-gray-medium text-white-primary font-bold text-sm flex items-center justify-center transition-colors shrink-0"
                          title={`Comprar ${item.producto}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Ranking de barberos por ingresos */}
          <div className="rounded-xl p-6 mb-6 bg-gray-darkest">
            <div className="pb-4 border-b border-gray-dark flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-white-primary mb-1">Rendimiento por barbero</h4>
                <p className="text-sm text-gray-lightest">Top 5 barberos por ingresos generados al negocio</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {(["dia", "semana", "mes"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodoRankingBarberos(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      periodoRankingBarberos === p
                        ? "bg-orange-primary text-white"
                        : "bg-gray-darker text-gray-lightest hover:bg-gray-dark"
                    }`}
                  >
                    {p === "dia" ? "Hoy" : p === "semana" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-4" style={{ height: "300px" }}>
              {isLoading ? (
                <div className="h-full w-full rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-full border-2 border-gray-dark border-t-orange-primary animate-spin" />
                </div>
              ) : rankingBarberos.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-lightest text-sm">Sin ingresos registrados para este periodo.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingBarberos} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                    <XAxis type="number" stroke="#888" tickFormatter={(v) => formatAxisValue(v as number)} tick={{ fill: "#ccc", fontSize: 12 }} />
                    <YAxis type="category" dataKey="barbero" stroke="#888" width={120} tick={{ fill: "#ccc", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "#ffffff10" }}
                      contentStyle={{ backgroundColor: "#1a1919", border: `1px solid ${colors.primary}`, borderRadius: 12 }}
                      itemStyle={{ color: "#d0d0d0" }}
                      labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                      formatter={(value: any) => [`$${formatCurrencyValue(value as number)}`, "Ingresos"]}
                    />
                    <Bar dataKey="ingresos" name="Ingresos" fill={colors.gold} radius={[0, 8, 8, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>


        {/* Compras (últimos 90 días) */}
        <section className="mb-10" style={{ marginTop: "40px" }}>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white-primary mb-2">Compras</h3>
            <p className="text-gray-lightest font-medium">
              Gasto en inventario, proveedores y productos más adquiridos (últimos 90 días).
            </p>
          </div>

          {/* KPIs de compras */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Gasto total", value: `$${formatCurrencyValue(resumenCompras.totalGastado)}`, sub: "90 días" },
              { label: "Órdenes de compra", value: String(resumenCompras.numCompras), sub: "registradas" },
              { label: "Promedio por compra", value: `$${formatCurrencyValue(resumenCompras.promedioPorCompra)}`, sub: "por orden" },
              { label: "Proveedores", value: String(resumenCompras.proveedoresUnicos), sub: "activos en el periodo" },
            ].map((k) =>
              isLoading ? (
                <div key={k.label} className="rounded-xl bg-gray-darkest p-5 flex items-center justify-center min-h-[112px]">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-dark border-t-orange-primary animate-spin" />
                </div>
              ) : (
                <div key={k.label} className="rounded-xl bg-gray-darkest p-5">
                  <p className="text-xs text-gray-lightest uppercase tracking-[0.2em] mb-1">{k.label}</p>
                  <p className="text-3xl font-bold text-white-primary">{k.value}</p>
                  <p className="text-xs text-gray-lightest mt-1">{k.sub}</p>
                </div>
              )
            )}
          </div>

          <div className="mb-6">
            {/* Tendencia de gasto mensual */}
            <div className="rounded-xl p-6 mb-6 bg-gray-darkest">
              <div className="pb-4 border-b border-gray-dark">
                <h4 className="text-lg font-bold text-white-primary mb-1">Gasto mensual en compras</h4>
                <p className="text-sm text-gray-lightest">Evolución del gasto en los últimos 3 meses · pasa el cursor sobre cada mes para ver el proveedor líder</p>
              </div>
              <div className="pt-4" style={{ height: "280px" }}>
                {isLoading ? (
                  <div className="h-full w-full rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-full border-2 border-gray-dark border-t-orange-primary animate-spin" />
                </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comprasHistoricas} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="key" stroke="#888" tick={{ fill: "#ccc", fontSize: 13 }} />
                      <YAxis stroke="#888" tickFormatter={(v) => formatAxisValue(v as number)} tick={{ fill: "#ccc", fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: "#ffffff10" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { key: string; total: number; proveedorTop: string; proveedorTopTotal: number };
                          return (
                            <div style={{ backgroundColor: "#1a1919", border: `1px solid ${colors.primary}`, borderRadius: 12, padding: "10px 14px", minWidth: 180 }}>
                              <p style={{ color: "#ffffff", fontWeight: 600, marginBottom: 6 }}>{d.key}</p>
                              <p style={{ color: "#d0d0d0", fontSize: 13, marginBottom: 4 }}>
                                Gasto total: <span style={{ color: "#ffffff", fontWeight: 600 }}>${formatCurrencyValue(d.total)}</span>
                              </p>
                              <div style={{ borderTop: "1px solid #333", marginTop: 6, paddingTop: 6 }}>
                                <p style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Proveedor líder</p>
                                <p style={{ color: "#ffffff", fontWeight: 600, fontSize: 13 }}>{d.proveedorTop}</p>
                                {d.proveedorTopTotal > 0 && (
                                  <p style={{ color: colors.gold, fontSize: 12, fontWeight: 600 }}>${formatCurrencyValue(d.proveedorTopTotal)}</p>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="total" name="Gasto" radius={[10, 10, 0, 0]} maxBarSize={56} fill="#3b6473" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

        </section>

        {/* Ingresos totales del negocio */}
        <div className="mb-10" style={{ marginTop: '40px' }}>
          <div className="rounded-xl p-6 mb-6 bg-gray-darkest">
            <div className="pb-6 border-b border-gray-dark">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white-primary mb-1">Ingresos totales del negocio</h3>
                  <p className="text-gray-lightest text-sm">
                    Evolución por periodo seleccionado combinando productos y servicios.
                  </p>
                </div>
                <div className="flex items-center rounded-full border border-gray-dark overflow-hidden">
                  {(["semanal", "mensual", "anual"] as PeriodoClave[]).map(
                    (periodo) => (
                      <button
                        key={periodo}
                        onClick={() => setPeriodoPrincipal(periodo)}
                        className={`px-4 py-1.5 text-sm font-medium transition-colors ${periodoPrincipal === periodo
                          ? "bg-orange-primary text-black-primary"
                          : "text-gray-lightest hover:bg-white/5"
                          }`}
                      >
                        {periodoLabels[periodo]}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
            <div className="pt-6" style={{ height: "340px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dataGraficaPrincipal}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="ingresosGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d8b081" stopOpacity={0.35} />
                      <stop offset="75%" stopColor="#d8b081" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#d8b081" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292929" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#888"
                    tick={{ fill: "#ccc", fontSize: 13 }}
                    axisLine={{ stroke: "#333" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#888"
                    tickFormatter={(value) => formatAxisValue(value as number)}
                    tick={{ fill: "#ccc", fontSize: 12 }}
                    axisLine={{ stroke: "#333" }}
                    tickLine={false}
                  />
                  <Tooltip content={renderIngresosTotalesTooltip} cursor={{ stroke: "#d8b08140", strokeWidth: 1 }} />
                  <Legend
                    wrapperStyle={{ marginTop: 0, marginBottom: 0 }}
                    payload={legendPayload}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#d8b081"
                    strokeWidth={2.5}
                    fill="url(#ingresosGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#d8b081", stroke: "#d8b08180", strokeWidth: 6 }}
                    name="Ingresos totales"
                    isAnimationActive
                    animationDuration={600}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowResumenPeriodos(!showResumenPeriodos)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-dark bg-gray-darker/40 hover:bg-gray-darker transition-colors mb-3"
              >
                <span className="text-sm font-semibold text-white-primary">Resumen por Periodos</span>
                {showResumenPeriodos ? (
                  <ChevronUp className="w-4 h-4 text-gray-lightest" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-lightest" />
                )}
              </button>
              {showResumenPeriodos && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ingresosTotalesPorPeriodo.map((item) => (
                    <div key={`${item.periodo}-summary`} className="rounded-xl bg-gray-darker/60 p-3">
                      <p className="text-xs text-gray-lightest uppercase tracking-[0.3em]">{item.label}</p>
                      <p className="text-xl font-bold text-white-primary mt-1">${formatCurrencyValue(item.ingresos)}</p>
                      <p className="text-xs text-gray-lightest mt-1">
                        Productos: <span className="font-semibold text-orange-primary">${formatCurrencyValue(item.productos)}</span>
                      </p>
                      <p className="text-xs text-gray-lightest">
                        Servicios: <span className="font-semibold text-blue-300">${formatCurrencyValue(item.servicios)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
