import { useState, useEffect } from "react";
import { Eye, DollarSign, User, Package, Scissors, Hash, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/components/ui/dialog";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { ventaService, type Venta } from "../../ventas/services/ventaService";
import { clientesService } from "../services/clientesService";
import { barberosService, type Barbero } from "../../administracion/services/barberosService";
import { devolucionService, type Devolucion } from "../../ventas/services/devolucionService";

// Función para formatear moneda colombiana
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO');
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
  const ITEMS_PER_PAGE = 10;

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
        const data = await ventaService.getVentasByClienteId(Number(cliente.id));
        
        // Enriquecer ventas con nombres de barberos si faltan
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

          <div className="std-table-wrapper">
            <table className="std-table">
              <thead className={isLoading ? "std-thead [&_th]:!text-transparent [&_th]:select-none" : "std-thead"}>
                <tr className="border-b border-gray-dark">
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Número</th>
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Fecha</th>
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Servicios</th>
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
                      <div className="flex flex-col gap-1.5">
                        {venta.servicios && venta.servicios !== "Sin servicios" ? (
                          <div className="flex items-start gap-2">
                            <span className="p-1 bg-purple-500/10 rounded mt-0.5">
                              <Scissors className="w-3 h-3 text-purple-400" />
                            </span>
                            <span className="text-gray-lighter text-sm font-medium line-clamp-1">
                              {venta.servicios}
                            </span>
                          </div>
                        ) : null}
                        {(venta.productos && venta.productos !== "Sin productos") ? (
                          <div className="flex items-start gap-2">
                            <span className="p-1 bg-orange-500/10 rounded mt-0.5">
                              <Package className="w-3 h-3 text-orange-400" />
                            </span>
                            <span className="text-gray-lighter text-xs line-clamp-1 italic">
                              {venta.productos}
                            </span>
                          </div>
                        ) : (
                          (!venta.servicios || venta.servicios === "Sin servicios") && (
                            <span className="text-gray-lighter text-xs italic opacity-60">Venta de productos</span>
                          )
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
          <DialogContent className="max-w-2xl bg-gray-darkest border-gray-dark text-white-primary">
            {selectedVenta && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <span className="p-2 bg-orange-primary/10 rounded-lg">
                        <DollarSign className="w-6 h-6 text-orange-primary" />
                    </span>
                    Ticket de Venta #{selectedVenta.numeroVenta}
                  </DialogTitle>
                  <DialogDescription className="text-gray-lightest">
                    Generado el {new Date(selectedVenta.fecha).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>

                {isLoadingDetail ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-orange-primary animate-spin mb-4" />
                        <p className="text-sm text-gray-lightest">Obteniendo detalles del ticket...</p>
                    </div>
                ) : (
                <div className="space-y-6 py-4">
                  {/* Resumen Superior */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-darker p-3 rounded-xl border border-gray-dark">
                        <p className="text-[10px] text-gray-lightest uppercase font-bold mb-1">Barbero que atendió</p>
                        <p className="text-sm font-medium flex items-center gap-2 text-white-primary">
                            <User className="w-3.5 h-3.5 text-orange-primary" />
                            {selectedVenta.barbero}
                        </p>
                    </div>
                    <div className="bg-gray-darker p-3 rounded-xl border border-gray-dark">
                        <p className="text-[10px] text-gray-lightest uppercase font-bold mb-1">Método de Pago</p>
                        <p className="text-sm font-medium flex items-center gap-2 text-white-primary">
                            <DollarSign className="w-3.5 h-3.5 text-orange-primary" />
                            {selectedVenta.metodoPago}
                        </p>
                    </div>
                  </div>

                  {/* Detalle de Servicios */}
                  {selectedVenta.serviciosDetalle.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-orange-primary uppercase tracking-widest flex items-center gap-2">
                            <Scissors className="w-3 h-3" />
                            Servicios Realizados
                        </h4>
                        <div className="space-y-2">
                            {selectedVenta.serviciosDetalle.map((s: any) => (
                            <div key={s.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-sm font-medium text-white-primary">{s.nombre}</span>
                                <span className="text-sm font-bold text-white-primary">${formatCurrency(s.precio)}</span>
                            </div>
                            ))}
                        </div>
                    </div>
                  )}

                  {/* Si no hay serviciosDetalle pero hay el string servicios, mostrar un fallback informativo */}
                  {selectedVenta.serviciosDetalle.length === 0 && selectedVenta.servicios && selectedVenta.servicios !== "Sin servicios" && (
                     <div className="space-y-3">
                        <h4 className="text-xs font-bold text-orange-primary uppercase tracking-widest flex items-center gap-2">
                            <Scissors className="w-3 h-3" />
                            Servicios Realizados
                        </h4>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <p className="text-sm text-white-primary">{selectedVenta.servicios}</p>
                        </div>
                     </div>
                  )}

                  {/* Detalle de Productos (con resta de devoluciones) */}
                  {selectedVenta.productosDetalle.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-orange-primary uppercase tracking-widest flex items-center gap-2">
                            <Package className="w-3 h-3" />
                            Productos Adquiridos
                        </h4>
                        <div className="space-y-2">
                            {selectedVenta.productosDetalle.map((p: any) => {
                                // Buscar devoluciones para este producto en esta venta
                                const devsDelProducto = devoluciones.filter(d => 
                                    Number(d.ventaId) === Number(selectedVenta.id) && 
                                    Number(d.productoId) === Number(p.id)
                                );
                                
                                const cantDevuelta = devsDelProducto.reduce((sum, d) => sum + d.cantidad, 0);
                                const montoDevuelto = devsDelProducto.reduce((sum, d) => sum + d.monto, 0);
                                
                                const cantFinal = Math.max(0, p.cantidad - cantDevuelta);
                                const precioFinal = p.cantidad > 0 ? (p.precio * p.cantidad - montoDevuelto) / Math.max(1, p.cantidad) : p.precio;
                                const subtotalFinal = Math.max(0, (p.precio * p.cantidad) - montoDevuelto);

                                return (
                                    <div key={p.id} className="flex flex-col p-3 bg-white/5 rounded-lg border border-white/5 gap-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-white-primary">{p.nombre}</span>
                                            <span className="text-sm font-bold text-white-primary">${formatCurrency(subtotalFinal)}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-[10px]">
                                            <div className="flex flex-col">
                                                <span className="text-gray-lightest uppercase font-bold tracking-tighter">Cant. Original</span>
                                                <span className="text-white-primary">{p.cantidad}</span>
                                            </div>
                                            
                                            {cantDevuelta > 0 && (
                                                <div className="flex flex-col">
                                                    <span className="text-red-400 uppercase font-bold tracking-tighter">Devuelta</span>
                                                    <span className="text-red-400">-{cantDevuelta}</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col">
                                                <span className="text-green-400 uppercase font-bold tracking-tighter">Cant. Final</span>
                                                <span className="text-green-400 font-bold">{cantFinal}</span>
                                            </div>

                                            <div className="flex flex-col ml-auto text-right">
                                                <span className="text-gray-lightest uppercase font-bold tracking-tighter">Unitario</span>
                                                <span className="text-white-primary">${formatCurrency(p.precio)}</span>
                                            </div>
                                        </div>
                                        
                                        {montoDevuelto > 0 && (
                                            <div className="text-[9px] text-red-400 flex items-center gap-1 mt-1 italic">
                                                <X className="w-3 h-3" />
                                                Se restaron ${formatCurrency(montoDevuelto)} por concepto de devolución
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                  )}

                  {/* Si no hay productosDetalle pero hay el string productos, mostrar fallback */}
                  {selectedVenta.productosDetalle.length === 0 && selectedVenta.productos && selectedVenta.productos !== "Sin productos" && (
                     <div className="space-y-3">
                        <h4 className="text-xs font-bold text-orange-primary uppercase tracking-widest flex items-center gap-2">
                            <Package className="w-3 h-3" />
                            Productos Adquiridos
                        </h4>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                            <p className="text-sm text-white-primary">{selectedVenta.productos}</p>
                        </div>
                     </div>
                  )}

                  {/* Footer Totales (Recalculados con Devoluciones) */}
                  <div className="mt-8 pt-6 border-t border-gray-dark">
                    <div className="space-y-2 max-w-xs ml-auto">
                        {(() => {
                            const montoDevueltoTotal = devoluciones
                                .filter(d => Number(d.ventaId) === Number(selectedVenta.id))
                                .reduce((acc, d) => acc + d.monto, 0);
                            
                            const subtotalAjustado = Math.max(0, (selectedVenta.subtotal || 0) - (montoDevueltoTotal / 1.19));
                            const ivaAjustado = Math.max(0, (selectedVenta.iva || 0) - (montoDevueltoTotal - (montoDevueltoTotal / 1.19)));
                            const totalAjustado = Math.max(0, (selectedVenta.total || 0) - montoDevueltoTotal);

                            return (
                                <>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-lightest font-medium">Subtotal</span>
                                        <span className="text-white-primary font-bold">
                                            ${formatCurrency(montoDevueltoTotal > 0 ? subtotalAjustado : selectedVenta.subtotal)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-lightest font-medium">IVA (19%)</span>
                                        <span className="text-white-primary font-bold">
                                            ${formatCurrency(montoDevueltoTotal > 0 ? ivaAjustado : selectedVenta.iva)}
                                        </span>
                                    </div>
                                    {selectedVenta.descuento > 0 && (
                                        <div className="flex justify-between text-sm text-red-500 font-bold">
                                            <span>Descuento</span>
                                            <span>-${formatCurrency(selectedVenta.descuento)}</span>
                                        </div>
                                    )}
                                    {montoDevueltoTotal > 0 && (
                                        <div className="flex justify-between text-xs text-red-400 font-medium italic border-b border-gray-dark/50 pb-2 mb-2">
                                            <span>Total Devoluciones</span>
                                            <span>-${formatCurrency(montoDevueltoTotal)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-dark">
                                        <span className="text-lg font-bold text-white-primary">Total Final</span>
                                        <span className="text-2xl font-black text-orange-primary">${formatCurrency(totalAjustado)}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                  </div>
                </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
