import { useState, useEffect } from "react";
import { Search, Eye, Calendar, DollarSign, RotateCcw, Package, Loader2 } from "lucide-react";
import { Input } from "../../../shared/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/components/ui/dialog";
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
  const [selectedDevolucion, setSelectedDevolucion] = useState<Devolucion | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

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

  const filteredDevoluciones = devoluciones.filter(devolucion =>
    devolucion.id.toString().includes(searchTerm) ||
    devolucion.ventaId.toString().includes(searchTerm) ||
    devolucion.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (devolucion.productoNombre || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (devolucion: Devolucion) => {
    setSelectedDevolucion(devolucion);
    setIsDetailDialogOpen(true);
  };

  const getEstadoColor = (estado: string) => {
    const estadoNormalizado = (estado || '').toLowerCase().trim();
    if (estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado' || estadoNormalizado === 'rechazada') {
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
    if (estadoNormalizado === 'completada' || estadoNormalizado === 'completado' || estadoNormalizado === 'procesada' || estadoNormalizado === 'activo') {
      return 'bg-green-500/10 text-green-400 border border-green-500/20';
    }
    return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
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
        <div className="elegante-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white-primary">Mis Solicitudes</h2>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-lightest w-4 h-4" />
              <Input
                placeholder="Buscar por número, venta o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="elegante-input pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 text-orange-primary animate-spin mb-4" />
                    <p className="text-gray-lightest">Cargando devoluciones...</p>
                </div>
            ) : (
                <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-dark">
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">ID</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Venta Ref.</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Fecha</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Producto/Motivo</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Monto</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Saldo Generado</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredDevoluciones.map((dev) => (
                    <tr key={dev.id} className="border-b border-gray-dark hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-mono text-xs text-orange-primary text-center">#{dev.id}</td>
                        <td className="py-4 px-4 font-mono text-xs text-gray-lightest text-center">#{dev.ventaId}</td>
                        <td className="py-4 px-4 text-sm text-white-primary text-center">
                            {new Date(dev.fecha).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-center">
                            <div className="max-w-xs">
                                <p className="text-sm font-medium text-white-primary truncate">{dev.productoNombre || 'Múltiples items'}</p>
                                <p className="text-[10px] text-gray-lightest truncate italic">{dev.motivo}</p>
                            </div>
                        </td>
                        <td className="py-4 px-4 text-sm font-bold text-white-primary text-center">
                             ${formatCurrency(dev.monto)}
                        </td>
                        <td className="py-4 px-4 text-sm font-bold text-green-500 text-center">
                             ${formatCurrency(dev.saldoAFavor)}
                        </td>
                        <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[13px] font-medium ${getEstadoColor(dev.estado)}`}>
                                {dev.estado}
                            </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                            <button
                                onClick={() => handleViewDetails(dev)}
                                className="text-orange-primary hover:text-orange-secondary p-2 rounded-lg hover:bg-gray-darker transition-colors"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
          </div>

          {!isLoading && filteredDevoluciones.length === 0 && (
            <div className="text-center py-20 bg-gray-darker/30 rounded-xl mt-4 border border-dashed border-gray-dark">
                <RotateCcw className="w-16 h-16 mx-auto mb-4 text-gray-dark" />
                <h3 className="text-white-primary font-bold">Sin devoluciones</h3>
                <p className="text-gray-lightest text-sm mt-1">No tienes solicitudes de devolución registradas.</p>
            </div>
          )}
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
                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-medium ${getEstadoColor(selectedDevolucion.estado)}`}>
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
    <AlertContainer />
    </>
  );
}
