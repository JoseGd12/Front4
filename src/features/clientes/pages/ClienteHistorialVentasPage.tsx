import { useState, useEffect, useRef, useMemo } from "react";
import { Eye, DollarSign, User, Package, Scissors, Hash, X, Loader2, Calendar, CreditCard, Tag, RotateCcw, Wallet, Receipt, FileText, MoreVertical } from "lucide-react";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/components/ui/dropdown-menu";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { StandardTable, resolveStatusVariant } from "../../../shared/components/ui/standard-table";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { ventaService, type Venta } from "../../ventas/services/ventaService";
import { clientesService } from "../services/clientesService";
import { barberosService, type Barbero } from "../../administracion/services/barberosService";
import { devolucionService, type Devolucion } from "../../ventas/services/devolucionService";
import { productoService } from "../../productos/services/productos";

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO');
};

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
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const resolveImageSrc = (rawValue: unknown): string => {
  const value = String(rawValue || '').trim();
  return value;
};

export function ClienteHistorialVentasPage() {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const imagenesMapRef = useRef(new Map<string, string>());
  const ITEMS_PER_PAGE = 10;

  const getProductoDetalleImage = (producto: any): string => {
    const prodId = Number(String(producto?.id || '').replace(/\D/g, ''));
    const fromMap = prodId > 0 ? imagenesMapRef.current.get(String(prodId)) : undefined;
    return resolveImageSrc(
      fromMap ||
      producto?.imagen ||
      producto?.imagenProduc ||
      producto?.imagenUrl ||
      ''
    );
  };

  const devolucionesVentaActual = useMemo(() => {
    if (!selectedVenta) return [];
    return devoluciones.filter(d => {
      const matchId = Number(d.ventaId) === Number(selectedVenta.id);
      const estado = (d.estado || '').toLowerCase().trim();
      const noAnulada = estado !== 'anulada' && estado !== 'anulado';
      return matchId && noAnulada;
    });
  }, [selectedVenta, devoluciones]);

  const totalMontoDevuelto = useMemo(() => {
    return devolucionesVentaActual.reduce((sum, d) => sum + (d.monto || 0), 0);
  }, [devolucionesVentaActual]);

  const detalleItemsVenta = useMemo(() => {
    if (!selectedVenta) return [];
    const devPorProductoId = new Map<number, number>();
    devolucionesVentaActual.forEach(dev => {
      const devProdId = Number(dev.productoId || 0);
      if (devProdId > 0) {
        devPorProductoId.set(devProdId, (devPorProductoId.get(devProdId) || 0) + (dev.cantidad || 0));
      }
    });
    const productosAgrupados = new Map<number, { producto: any; cantidad: number }>();
    (selectedVenta.productosDetalle || []).forEach((producto: any) => {
      const prodId = Number(producto?.id || 0);
      const cant = Number(producto?.cantidad || 1);
      const existing = productosAgrupados.get(prodId);
      if (existing) {
        existing.cantidad += cant;
      } else {
        productosAgrupados.set(prodId, { producto, cantidad: cant });
      }
    });
    const productosItems = Array.from(productosAgrupados.values()).map(({ producto, cantidad: cantidadOriginal }, index) => {
      const precio = Number(producto?.precio || 0);
      const nombre = String(producto?.nombre || 'Producto');
      const prodId = Number(producto?.id || 0);
      const cantidadDevuelta = devPorProductoId.get(prodId) ?? 0;
      const cantidadFinal = Math.max(0, cantidadOriginal - cantidadDevuelta);
      return {
        key: `producto-${prodId}-${index}`,
        nombre,
        tipo: 'Producto' as const,
        cantidadOriginal,
        cantidadDevuelta,
        cantidad: cantidadFinal,
        precio,
        subtotal: cantidadFinal * precio,
        imageSrc: getProductoDetalleImage(producto),
      };
    });
    const serviciosItems = (selectedVenta.serviciosDetalle || []).map((servicio: any, index: number) => {
      const cantidad = Number(servicio?.cantidad || 1);
      const precio = Number(servicio?.precio || 0);
      return {
        key: `servicio-${servicio?.id ?? index}-${index}`,
        nombre: String(servicio?.nombre || 'Servicio'),
        tipo: 'Servicio' as const,
        cantidadOriginal: cantidad,
        cantidadDevuelta: 0,
        cantidad,
        precio,
        subtotal: cantidad * precio,
        imageSrc: '',
      };
    });
    return [...productosItems, ...serviciosItems];
  }, [selectedVenta, devolucionesVentaActual]);

  const saldoUsadoDetalle = useMemo(() => {
    if (!selectedVenta) return 0;
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
    const shouldBe = subtotal + iva - descuento;
    const diff = shouldBe - total;
    return diff > 0.01 ? diff : 0;
  }, [selectedVenta]);

  useEffect(() => {
    const initPage = async () => {
        setIsLoading(true);
        try {
            const [currentBarberos, currentDevs] = await Promise.all([
                barberosService.getBarberos(),
                fetchDevoluciones()
            ]);
            setBarberos(currentBarberos);
            await fetchVentas(currentBarberos, currentDevs);
        } finally {
            setIsLoading(false);
        }
    };
    initPage();
  }, [user]);

  const fetchDevoluciones = async () => {
    try {
        const data = await devolucionService.getDevoluciones();
        const activeDevs = data.filter(d => d.estado !== 'Anulada');
        setDevoluciones(activeDevs);
        return activeDevs;
    } catch (err) {
        console.error("Error fetching devoluciones:", err);
        return [];
    }
  };

  const fetchBarberos = async () => {
    try {
        const data = await barberosService.getBarberos();
        setBarberos(data);
        return data;
    } catch (err) {
        console.error("Error fetching barbers:", err);
        return [];
    }
  };

  const fetchVentas = async (currentBarberos?: Barbero[], currentDevoluciones?: Devolucion[]) => {
    if (!user?.email) return;
    const barbersList = currentBarberos || barberos;
    const devsList = currentDevoluciones || devoluciones;
    try {
      // 1. Obtener perfil de cliente para tener su ID numérico
      const allClientes = await clientesService.getClientes();
      const cliente = allClientes.find(c => (c.correo || '').toLowerCase() === user.email.toLowerCase());
      
      if (cliente) {
        const [data, productos] = await Promise.all([
          ventaService.getVentasByClienteId(Number(cliente.id)),
          productoService.getProductos().catch(() => []),
        ]);

        const imagenesMap = new Map<string, string>();
        (productos || []).forEach((p: any) => {
          const id = String(p?.id || 0);
          const img = String(p?.imagenProduc || p?.imagen || p?.imagenUrl || '');
          if (id && img.trim()) imagenesMap.set(id, img);
        });
        imagenesMapRef.current = imagenesMap;

        // Enriquecer ventas con nombres de barberos e imágenes de productos
        const enrichedVentas = await Promise.all(data.map(async (v) => {
            let enriched = { ...v };
            
            // Si el nombre del barbero es genérico o falta, buscarlo en la lista de barberos
            if (!v.barbero || v.barbero === "Sin asignar") {
                const bId = v.barberoId;
                if (bId) {
                    const match = barbersList.find(b => Number(b.id) === Number(bId));
                    if (match) {
                        enriched.barbero = `${match.nombre} ${match.apellido}`.trim();
                    }
                }
            }

            // Si los servicios están vacíos o es una venta de productos, intentar obtener el detalle completo para recalculado
            if (((!v.servicios || v.servicios === "Sin servicios") || (v.productos && v.productos !== "Sin productos")) && v.id) {
                try {
                    const full = await ventaService.getVentaById(v.id);
                    if (full) {
                        enriched.servicios = full.servicios;
                        enriched.serviciosDetalle = full.serviciosDetalle;
                        enriched.productos = full.productos;
                        enriched.productosDetalle = full.productosDetalle;
                        
                        // Re-verificar barbero con el detalle completo
                        if (!enriched.barbero || enriched.barbero === "Sin asignar") {
                            if (full.barbero && full.barbero !== "Sin asignar") {
                                enriched.barbero = full.barbero;
                            } else if (full.barberoId || v.barberoId) {
                                const targetBId = full.barberoId || v.barberoId;
                                const match = barbersList.find(b => Number(b.id) === Number(targetBId));
                                if (match) {
                                    enriched.barbero = `${match.nombre} ${match.apellido}`.trim();
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`Could not fetch full details for sale #${v.numeroVenta}`);
                }
            }

            // RECALCULAR CANTIDADES EN EL STRING DE PRODUCTOS
            // Si tenemos detalles de productos y hay devoluciones para esta venta, reconstruimos el string
            const devsDeEstaVenta = devsList.filter(d => Number(d.ventaId) === Number(v.id));
            if (devsDeEstaVenta.length > 0 && enriched.productosDetalle && enriched.productosDetalle.length > 0) {
                const productosRecalculados = enriched.productosDetalle.map(p => {
                    const cantDevuelta = devsDeEstaVenta
                        .filter(d => Number(d.productoId) === Number(p.id))
                        .reduce((sum, d) => sum + d.cantidad, 0);
                    
                    const cantFinal = Math.max(0, p.cantidad - cantDevuelta);
                    if (cantDevuelta > 0) {
                        return `${p.nombre} (x${cantFinal})`;
                    }
                    return `${p.nombre} (x${p.cantidad})`;
                });
                enriched.productos = productosRecalculados.join(', ');
            }

            if (enriched.productosDetalle?.length > 0) {
              enriched.productosDetalle = enriched.productosDetalle.map((p: any) => {
                if (!p.imagen || !String(p.imagen).trim()) {
                  const img = imagenesMap.get(String(p.id));
                  if (img) return { ...p, imagen: img };
                }
                return p;
              });
            }

            return enriched;
        }));

        setVentas(enrichedVentas);
      }
    } catch (err) {
      console.error("Error fetching client sales:", err);
    }
  };

  const filteredVentas = ventas.filter(venta => {
    const matchesSearch = venta.numeroVenta.toString().includes(searchTerm) ||
      venta.servicios.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.barbero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || venta.estado.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredVentas.length / ITEMS_PER_PAGE));
  const displayedVentas = filteredVentas.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleViewDetails = async (venta: Venta) => {
    setSelectedVenta(venta);
    setIsDetailDialogOpen(true);
    setIsLoadingDetail(true);
    try {
      const fullVenta = await ventaService.getVentaById(venta.id);
      if (fullVenta) {
        if (fullVenta.productosDetalle?.length > 0 && imagenesMapRef.current.size > 0) {
          fullVenta.productosDetalle = fullVenta.productosDetalle.map((p: any) => {
            if (!p.imagen || !String(p.imagen).trim()) {
              const img = imagenesMapRef.current.get(String(p.id));
              if (img) return { ...p, imagen: img };
            }
            return p;
          });
        }
        setSelectedVenta(fullVenta);
      }
    } catch (err) {
      console.error("Error fetching full sale details:", err);
      // Fallback: keep the partial data from the list
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    const estadoNormalizado = (estado || '').toLowerCase().trim();
    if (estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado') {
      return 'std-badge-negative';
    }
    if (estadoNormalizado === 'completada' || estadoNormalizado === 'completado' || estadoNormalizado === 'activo') {
      return 'std-badge-positive';
    }
    return 'std-badge-neutral';
  };

  const getMetodoPagoColor = (metodo: string) => {
    switch (metodo) {
      case "Efectivo": return "text-green-400";
      case "Tarjeta": return "text-blue-400";
      case "Transferencia": return "text-purple-400";
      default: return "text-gray-lightest";
    }
  };

  // Calcular total invertido real (Ventas - Devoluciones)
  const totalGastado = ventas
    .filter(v => v.estado !== 'Anulada')
    .reduce((sum, v) => {
        const montoDev = devoluciones
            .filter(d => Number(d.ventaId) === Number(v.id))
            .reduce((acc, d) => acc + d.monto, 0);
        return sum + Math.max(0, (v.total || 0) - montoDev);
    }, 0);

  const visitasCompletadas = ventas.filter(v => v.estado === "Completada").length;

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white-primary">Mi Historial de Compras</h1>
            <p className="text-sm text-gray-lightest mt-1">Revisa todas tus visitas y servicios anteriores</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-gray-darker px-4 py-2 rounded-lg border border-gray-dark">
                <p className="text-[10px] text-gray-lightest uppercase font-bold tracking-wider">Total Real Invertido</p>
                <p className="text-orange-primary font-bold text-lg">${formatCurrency(totalGastado)}</p>
            </div>
            <div className="bg-gray-darker px-4 py-2 rounded-lg border border-gray-dark">
                <p className="text-[10px] text-gray-lightest uppercase font-bold tracking-wider">Visitas</p>
                <p className="text-white-primary font-bold text-lg">{visitasCompletadas}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        {/* Search and Table */}
        <div className="std-card">
          <TableHeaderSection
            variant="dark"
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
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
            recordsText={`Mostrando ${displayedVentas.length} de ${filteredVentas.length} compras`}
            recordsPlacement="right"
          />

          {/* Mobile Cards */}
          <div className="block sm:hidden">
            {isLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-orange-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : displayedVentas.length > 0 ? (
              <div className="std-mobile-cards">
                {displayedVentas.map((venta) => {
                  const montoDev = devoluciones
                    .filter(d => Number(d.ventaId) === Number(venta.id))
                    .reduce((acc, d) => acc + d.monto, 0);
                  const totalReal = Math.max(0, (venta.total || 0) - montoDev);
                  return (
                    <div key={venta.id} className="std-mobile-card">
                      <div className="std-mobile-card-info">
                        <div className="std-mobile-card-row">
                          <span className="std-mobile-card-title">#{String(venta.numeroVenta)}</span>
                          <span className={`std-badge ${getEstadoColor(venta.estado)}`}>{venta.estado}</span>
                        </div>
                        <p className="std-mobile-card-sub">{venta.barbero || "Sin asignar"}</p>
                        <div className="std-mobile-card-row">
                          <span className="std-mobile-card-meta">{new Date(venta.fecha).toLocaleDateString()}</span>
                          <span className="std-mobile-card-meta">{venta.metodoPago}</span>
                        </div>
                        <div className="std-mobile-card-row">
                          <div className="flex items-center gap-2">
                            {(venta.serviciosDetalle?.length > 0 || (venta.servicios && venta.servicios !== "Sin servicios")) && (
                              <div className="flex items-center gap-1">
                                <Scissors className="w-3 h-3 text-purple-400" />
                                <span className="text-gray-lighter text-xs">
                                  {venta.serviciosDetalle?.length > 0
                                    ? venta.serviciosDetalle.length
                                    : venta.servicios.split(',').filter((s: string) => s.trim()).length}
                                </span>
                              </div>
                            )}
                            {(venta.productosDetalle?.length > 0 || (venta.productos && venta.productos !== "Sin productos")) && (
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3 text-orange-400" />
                                <span className="text-gray-lighter text-xs">
                                  {venta.productosDetalle?.length > 0
                                    ? venta.productosDetalle.length
                                    : venta.productos.split(',').filter((s: string) => s.trim()).length}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-gray-lighter font-bold text-sm">${formatCurrency(totalReal)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-gray-darker transition-colors"><MoreVertical className="w-4 h-4 text-gray-lightest" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-gray-darkest border-gray-dark min-w-[140px]" align="end">
                            <DropdownMenuItem className="text-gray-lightest cursor-pointer" onSelect={() => handleViewDetails(venta)}>
                              Ver detalles
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-lightest text-sm font-medium mb-1">No se encontraron compras</p>
                <p className="text-gray-lighter text-xs">Ajusta los filtros o recarga la tabla para actualizar los resultados.</p>
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block">
            <div className="std-table-wrapper">
              <table className="std-table">
                <thead className={isLoading ? "std-thead [&_th]:!text-transparent [&_th]:select-none" : "std-thead"}>
                  <tr className="border-b border-gray-dark">
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Número</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Fecha</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Contenido</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Barbero</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Total</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Pago</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="std-tbody">
                  {isLoading ? (
                    <TableLoadingStateRow
                      colSpan={8}
                      title="Cargando tu historial..."
                    />
                  ) : displayedVentas.length > 0 ? displayedVentas.map((venta) => (
                    <tr key={venta.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Hash className="w-4 h-4 text-orange-primary" />
                          <span className="text-gray-lighter">{String(venta.numeroVenta)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{new Date(venta.fecha).toLocaleDateString()}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col gap-1.5 items-center">
                          {(venta.serviciosDetalle?.length > 0 || (venta.servicios && venta.servicios !== "Sin servicios")) && (
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 bg-purple-500/10 rounded shrink-0">
                                <Scissors className="w-3 h-3 text-purple-400" />
                              </span>
                              <span className="text-gray-lighter text-sm font-medium whitespace-nowrap">
                                Servicios ({venta.serviciosDetalle?.length > 0
                                  ? venta.serviciosDetalle.length
                                  : venta.servicios.split(',').filter(s => s.trim()).length})
                              </span>
                            </div>
                          )}
                          {(venta.productosDetalle?.length > 0 || (venta.productos && venta.productos !== "Sin productos")) && (
                            <div className="flex items-center gap-1.5">
                              <span className="p-1 bg-orange-500/10 rounded shrink-0">
                                <Package className="w-3 h-3 text-orange-400" />
                              </span>
                              <span className="text-gray-lighter text-sm font-medium whitespace-nowrap">
                                Productos ({venta.productosDetalle?.length > 0
                                  ? venta.productosDetalle.length
                                  : venta.productos.split(',').filter(s => s.trim()).length})
                              </span>
                            </div>
                          )}
                          {(!venta.servicios || venta.servicios === "Sin servicios") &&
                           (!venta.productos || venta.productos === "Sin productos") && (
                            <span className="text-gray-lighter text-xs italic opacity-60">Sin items</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <div className="text-gray-lighter">
                            {venta.barbero || "Sin asignar"}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter font-bold">
                          ${(() => {
                              const montoDev = devoluciones
                                  .filter(d => Number(d.ventaId) === Number(venta.id))
                                  .reduce((acc, d) => acc + d.monto, 0);
                              return formatCurrency(Math.max(0, (venta.total || 0) - montoDev));
                          })()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{venta.metodoPago}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`std-badge ${getEstadoColor(venta.estado)}`}>
                          {venta.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(venta)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <TableEmptyStateRow
                      colSpan={8}
                      title="No se encontraron compras"
                      description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                      onReload={() => { setIsLoading(true); fetchVentas().finally(() => setIsLoading(false)); }}
                    />
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          <div className="std-pagination">
            <div className="std-pag-info">
              Página {currentPage} de {totalPages}
            </div>
            <EllipsisPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>

        {/* Modal de Detalles */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto text-gray-lightest">
            {isLoadingDetail ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-gray-lightest flex items-center gap-2">
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
                  <DialogTitle className="text-gray-lightest flex items-center gap-2">
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
                      <Label className="text-gray-lightest flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-primary" />
                        Número de Venta
                      </Label>
                      <Input
                        value={String(selectedVenta.numeroVenta || selectedVenta.id).padStart(3, "0")}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-lightest flex items-center gap-2">
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
                      <Label className="text-gray-lightest flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-primary" />
                        Barbero
                      </Label>
                      <Input
                        value={selectedVenta.barbero || 'Sin asignar'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-lightest flex items-center gap-2">
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
                      <Label className="text-gray-lightest flex items-center gap-2">
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

                  <div className="flex items-center gap-3">
                    <Label className="text-gray-lightest">Estado:</Label>
                    <StandardTable.StatusBadge
                      variant={resolveStatusVariant(selectedVenta.estado)}
                      label={(selectedVenta.estado || '').toLowerCase().trim() === 'anulada' || (selectedVenta.estado || '').toLowerCase().trim() === 'anulado' ? 'Anulada' : 'Completada'}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-normal text-gray-lightest">
                        Productos y Servicios {devolucionesVentaActual.length > 0 ? '(Ajustado por Devoluciones)' : 'Agregados'}:
                      </h4>
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {detalleItemsVenta.length > 0 ? (
                        detalleItemsVenta.map((detalle) => (
                          <div key={detalle.key} className={`bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 ${detalle.cantidadDevuelta > 0 ? 'border-yellow-500/40' : 'border-orange-primary/20'}`}>
                            <div className="flex items-center gap-4 flex-nowrap min-w-0">
                              <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                {detalle.tipo === 'Servicio' ? (
                                  <Scissors className="w-5 h-5 text-orange-primary" />
                                ) : (
                                  <ImageRenderer
                                    url={detalle.imageSrc}
                                    alt={detalle.nombre}
                                    className="w-full h-full border-0 bg-transparent"
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1 shrink flex items-center justify-center">
                                <span className="text-gray-lightest font-normal text-base truncate block text-center w-full" title={detalle.nombre}>
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
                                <span className="text-orange-primary font-normal text-xs tabular-nums leading-7">
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
                        <h4 className="text-md font-normal text-gray-lightest">Devoluciones Asociadas:</h4>
                        <span className="text-[11px] text-gray-lightest">
                          Total Devuelto: <span className="text-orange-primary font-semibold">${formatCurrency(totalMontoDevuelto)}</span>
                        </span>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {devolucionesVentaActual.map((dev) => (
                          <div key={`dev-${dev.id}`} className="bg-gray-darker rounded-lg px-3 py-2.5 border border-gray-dark">
                            <div className="flex items-center gap-4 flex-nowrap min-w-0">
                              <div className="min-w-0 flex-1 shrink">
                                <span className="text-gray-lightest font-normal text-sm truncate block" title={dev.productoNombre}>
                                  {dev.productoNombre || 'Producto'}
                                </span>
                                <div className="text-[11px] text-gray-lightest">
                                  {dev.fecha}
                                  {(dev as any).motivoDetalle ? ` • ${(dev as any).motivoDetalle}` : dev.motivo ? ` • ${dev.motivo}` : ''}
                                </div>
                              </div>
                              <div className="flex flex-col gap-0.5 shrink-0 text-right">
                                <span className="text-[11px] text-gray-400">Cantidad</span>
                                <span className="text-xs text-gray-lightest tabular-nums">{dev.cantidad}</span>
                              </div>
                              <div className="flex flex-col gap-0.5 shrink-0 text-right">
                                <span className="text-[11px] text-gray-400">Monto</span>
                                <span className="text-xs text-orange-primary font-normal tabular-nums">
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
                    <div className="flex justify-between text-gray-lightest font-normal">
                      <span>Subtotal:</span>
                      <span>${formatCurrency(selectedVenta.subtotal || 0)}</span>
                    </div>

                    <div className="flex justify-between text-gray-lightest font-normal">
                      <span>Descuento:</span>
                      <span>-${formatCurrency(selectedVenta.descuento || 0)}</span>
                    </div>

                    {saldoUsadoDetalle > 0 && (
                      <div className="flex justify-between text-green-500 font-medium">
                        <span>Saldo a Favor Usado:</span>
                        <span className="font-bold">-${formatCurrency(saldoUsadoDetalle)}</span>
                      </div>
                    )}

                    {totalMontoDevuelto > 0 && (
                      <div className="flex justify-between text-yellow-400 font-medium">
                        <span>Devoluciones:</span>
                        <span className="font-bold">-${formatCurrency(totalMontoDevuelto)}</span>
                      </div>
                    )}

                    <hr className="border-gray-medium my-2" />

                    <div className="flex justify-between items-end">
                      <span className="text-white-primary font-bold text-xl">Total:</span>
                      <span className="text-orange-primary font-bold text-xl">
                        ${formatCurrency(Math.max(0, (selectedVenta.total || (selectedVenta.subtotal || 0) - (selectedVenta.descuento || 0)) - saldoUsadoDetalle - totalMontoDevuelto))}
                      </span>
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
      </main>
    </>
  );
}
