import { useState, useEffect } from "react";
import { Eye, RotateCcw, Hash, MoreVertical, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/components/ui/dialog";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { devolucionService, type Devolucion } from "../../ventas/services/devolucionService";
import { clientesService } from "../services/clientesService";

// Función para formatear moneda colombiana
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO');
};

export function ClienteHistorialDevolucionesPage() {
  const { user } = useAuth();
  const { error: showErrorAlert, AlertContainer } = useCustomAlert();
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDevolucion, setSelectedDevolucion] = useState<Devolucion | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [mobileExpandedId, setMobileExpandedId] = useState<number | null>(null);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchDevoluciones();
  }, [user]);

  const fetchDevoluciones = async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const allClientes = await clientesService.getClientes();
      const cliente = allClientes.find(c => (c.correo || '').toLowerCase() === user.email.toLowerCase());
      
      if (cliente) {
        const data = await devolucionService.getDevolucionesByClienteId(Number(cliente.id));
        setDevoluciones(data);
      }
    } catch (err) {
      console.error("Error fetching client devolutions:", err);
      showErrorAlert("Error al cargar", "No se pudo cargar tu historial de devoluciones.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDevoluciones = devoluciones.filter(devolucion => {
    const matchesSearch = devolucion.id.toString().includes(searchTerm) ||
      devolucion.ventaId.toString().includes(searchTerm) ||
      devolucion.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (devolucion.productoNombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || devolucion.estado.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevoluciones.length / ITEMS_PER_PAGE));
  const displayedDevoluciones = filteredDevoluciones.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleViewDetails = (devolucion: Devolucion) => {
    setSelectedDevolucion(devolucion);
    setIsDetailDialogOpen(true);
  };

  const getEstadoColor = (estado: string) => {
    const estadoNormalizado = (estado || '').toLowerCase().trim();
    if (estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado' || estadoNormalizado === 'rechazada') {
      return 'std-badge-negative';
    }
    if (estadoNormalizado === 'completada' || estadoNormalizado === 'completado' || estadoNormalizado === 'procesada' || estadoNormalizado === 'activo') {
      return 'std-badge-positive';
    }
    return 'std-badge-neutral';
  };

  const totalDevuelto = devoluciones
    .filter(d => d.estado === "Completada" || d.estado === "Procesada")
    .reduce((sum, d) => sum + (d.monto || 0), 0);

  const totalSaldoAFavor = devoluciones
    .filter(d => d.estado === "Completada" || d.estado === "Procesada")
    .reduce((sum, d) => sum + (d.saldoAFavor || 0), 0);

  return (
    <>
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white-primary">Mi Historial de Devoluciones</h1>
            <p className="text-sm text-gray-lightest mt-1">Revisa tus solicitudes de devolución y saldos a favor</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-gray-darker px-4 py-2 rounded-lg border border-gray-dark">
                <p className="text-[10px] text-gray-lightest uppercase font-bold tracking-wider">Saldo a Favor</p>
                <p className="text-green-500 font-bold text-lg">${formatCurrency(totalSaldoAFavor)}</p>
            </div>
            <div className="bg-gray-darker px-4 py-2 rounded-lg border border-gray-dark">
                <p className="text-[10px] text-gray-lightest uppercase font-bold tracking-wider">Total Reembolsado</p>
                <p className="text-orange-primary font-bold text-lg">${formatCurrency(totalDevuelto)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
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
            recordsText={`Mostrando ${displayedDevoluciones.length} de ${filteredDevoluciones.length} devoluciones`}
            recordsPlacement="right"
          />

          {/* Mobile Cards */}
          <div className="block sm:hidden">
            {isLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-orange-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : displayedDevoluciones.length > 0 ? (
              <div className="std-mobile-cards">
                {displayedDevoluciones.map((dev) => {
                  const isExpanded = mobileExpandedId === dev.id;
                  return (
                    <div key={dev.id}>
                      <div className="std-mobile-card">
                        <div className="std-mobile-card-info">
                          <div className="std-mobile-card-row">
                            <span className="std-mobile-card-title">#D{String(dev.id)}</span>
                            <span className={`std-badge ${getEstadoColor(dev.estado)}`}>{dev.estado}</span>
                          </div>
                          <p className="std-mobile-card-sub">{dev.productoNombre || 'Multiples items'}</p>
                          <p className="std-mobile-card-meta italic truncate">{dev.motivo}</p>
                          <div className="std-mobile-card-row">
                            <span className="std-mobile-card-meta">{new Date(dev.fecha).toLocaleDateString()}</span>
                            <span className="std-mobile-card-meta">Venta #{String(dev.ventaId)}</span>
                          </div>
                          <div className="std-mobile-card-row">
                            <div className="flex flex-col">
                              <span className="text-gray-lighter font-bold text-sm">${formatCurrency(dev.monto)}</span>
                              <span className="text-gray-lightest text-xs">Devolucion</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-gray-lighter font-bold text-sm">${formatCurrency(dev.saldoAFavor)}</span>
                              <span className="text-gray-lightest text-xs">Saldo a favor</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center pt-1">
                            <button
                              onClick={() => setMobileExpandedId(isExpanded ? null : dev.id)}
                              className="p-1 rounded-lg hover:bg-gray-darker transition-colors"
                            >
                              <ChevronDown
                                className="w-4 h-4 text-gray-lightest transition-transform duration-300"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-lg hover:bg-gray-darker transition-colors"><MoreVertical className="w-4 h-4 text-gray-lightest" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-gray-darkest border-gray-dark min-w-[140px]" align="end">
                              <DropdownMenuItem className="text-gray-lightest cursor-pointer" onSelect={() => handleViewDetails(dev)}>
                                Ver detalles
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className={`row-accordion-wrap ${isExpanded ? 'open' : ''}`}>
                        <div className="row-accordion-inner">
                          <div className="px-4 pb-4 pt-1 space-y-3 border-x border-b border-gray-dark rounded-b-xl bg-gray-darkest -mt-2">
                            <div className="space-y-1">
                              <h4 className="text-[10px] font-bold text-gray-lightest uppercase tracking-widest">Motivo de devolucion</h4>
                              <p className="text-sm text-orange-primary font-medium">{dev.motivo}</p>
                              {dev.observaciones && (
                                <p className="text-xs text-gray-lightest italic">"{dev.observaciones}"</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-[10px] font-bold text-gray-lightest uppercase tracking-widest">Detalle del producto</h4>
                              <div className="p-2.5 bg-white/5 rounded-lg border border-white/10">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-white-primary font-medium">{dev.productoNombre || 'Servicio/Combo'}</span>
                                  <span className="text-xs text-gray-lightest">x{dev.cantidad}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-xs text-gray-lightest">Monto devolucion</span>
                                  <span className="text-sm text-gray-lighter font-bold">${formatCurrency(dev.monto)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-gray-dark">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-lightest font-bold">Saldo a tu favor</span>
                                <span className="text-sm font-black text-green-500">${formatCurrency(dev.saldoAFavor)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-lightest text-sm font-medium mb-1">No se encontraron devoluciones</p>
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
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Venta Ref.</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Fecha</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Producto/Motivo</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Monto Devolución</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Saldo a Favor</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="std-tbody">
                  {isLoading ? (
                    <TableLoadingStateRow
                      colSpan={8}
                      title="Cargando devoluciones..."
                    />
                  ) : displayedDevoluciones.length > 0 ? displayedDevoluciones.map((dev) => (
                    <tr key={dev.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Hash className="w-4 h-4 text-orange-primary" />
                          <span className="text-gray-lighter">{String(dev.id)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Hash className="w-4 h-4 text-orange-primary" />
                          <span className="text-gray-lighter">{String(dev.ventaId)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{new Date(dev.fecha).toLocaleDateString()}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-lighter truncate">{dev.productoNombre || 'Múltiples items'}</p>
                          <p className="text-[10px] text-gray-lightest truncate italic">{dev.motivo}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter font-bold">${formatCurrency(dev.monto)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">${formatCurrency(dev.saldoAFavor)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`std-badge ${getEstadoColor(dev.estado)}`}>
                          {dev.estado}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(dev)}
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
                      title="No se encontraron devoluciones"
                      description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                      onReload={fetchDevoluciones}
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

        {/* Modal Detalles Devolución */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-md bg-gray-darkest border-gray-dark text-white-primary">
            {selectedDevolucion && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-red-600/10 rounded-lg">
                        <RotateCcw className="w-6 h-6 text-red-500" />
                    </div>
                    Detalle Devolución #D{selectedDevolucion.id}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                   <div className="bg-gray-darker p-4 rounded-xl border border-gray-dark space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-lightest">Venta de Referencia</span>
                            <span className="text-orange-primary font-mono">#V{selectedDevolucion.ventaId}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-lightest">Estado de Solicitud</span>
                            <span className={`std-badge inline-flex items-center justify-center ${getEstadoColor(selectedDevolucion.estado)}`}>
                                {selectedDevolucion.estado}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-lightest">Fecha Procesada</span>
                            <span className="text-white-primary">{new Date(selectedDevolucion.fecha).toLocaleString()}</span>
                        </div>
                   </div>

                   <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-gray-lightest uppercase tracking-widest">Información del Producto</h4>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-sm font-bold text-white-primary">{selectedDevolucion.productoNombre || 'Servicio/Combo'}</p>
                            <p className="text-xs text-gray-lightest mt-1">Cantidad devuelta: {selectedDevolucion.cantidad}</p>
                        </div>
                   </div>

                   <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-gray-lightest uppercase tracking-widest">Motivo de Devolución</h4>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-sm font-medium text-orange-primary">{selectedDevolucion.motivo}</p>
                            {selectedDevolucion.observaciones && (
                                <p className="text-xs text-gray-lightest mt-2 italic">"{selectedDevolucion.observaciones}"</p>
                            )}
                        </div>
                   </div>

                   <div className="pt-4 border-t border-gray-dark">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-lightest">Monto de Devolución</span>
                            <span className="text-lg font-bold text-white-primary">${formatCurrency(selectedDevolucion.monto)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-lightest font-bold">Saldo a tu Favor</span>
                            <span className="text-xl font-black text-green-500">${formatCurrency(selectedDevolucion.saldoAFavor)}</span>
                        </div>
                   </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    {AlertContainer}
    </>
  );
}
