import { useState } from "react";
import { Input } from "../../../shared/components/ui/input";
import { 
  Search, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  CreditCard,
  FileText,
  Download,
  DollarSign,
  User,
  MessageSquare,
  Filter,
  Link,
  Receipt,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  CalendarDays,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../../shared/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";

import { toast } from "../../../shared/components/ui/notify";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { 
  downloadCSV, 
  filterDataByDateRange, 
  getDateRanges, 
  generateFilename,
  type ExcelColumn,
  type DateRange
} from "../../../shared/utils/excelUtils";

// Función para formatear moneda colombiana
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO');
};

// Tipos de datos
interface NotaCredito {
  id: string;
  cliente: string;
  clienteId: string;
  monto: number;
  motivo: string;
  fecha: string;
  hora: string;
  estado: 'Activa' | 'Utilizada' | 'Vencida';
  asociadoA?: string;
  tipoAsociacion?: 'Devolución' | 'Factura' | 'Manual';
  responsable: string;
  vencimiento: string;
  montoUtilizado?: number;
  fechaUso?: string;
}

interface DevolucionPendiente {
  id: string;
  cliente: string;
  producto: string;
  monto: number;
  fecha: string;
  estado: string;
}

// Datos de ejemplo para devoluciones pendientes de nota de crédito
const devolucionesPendientes: DevolucionPendiente[] = [
  {
    id: "DEV003",
    cliente: "Carlos Ruiz",
    producto: "Aceite de Barba",
    monto: 28000,
    fecha: "21-08-2025",
    estado: "Procesada"
  }
];

// Datos de ejemplo para notas de crédito
const notasCreditoData: NotaCredito[] = [
  {
    id: "NC001",
    cliente: "Juan Pérez",
    clienteId: "CLI001",
    monto: 35000,
    motivo: "Devolución por producto defectuoso",
    fecha: "23-08-2025",
    hora: "14:30",
    estado: "Activa",
    asociadoA: "DEV001",
    tipoAsociacion: "Devolución",
    responsable: "Miguel Rodriguez",
    vencimiento: "23-02-2026"
  },
  {
    id: "NC002",
    cliente: "María González",
    clienteId: "CLI002",
    monto: 25000,
    motivo: "Compensación por servicio insatisfactorio",
    fecha: "22-08-2025",
    hora: "16:45",
    estado: "Utilizada",
    asociadoA: "DEV002",
    tipoAsociacion: "Devolución",
    responsable: "Sofia Martinez",
    vencimiento: "22-02-2026",
    montoUtilizado: 25000,
    fechaUso: "25-08-2025"
  },
  {
    id: "NC003",
    cliente: "Carlos Ruiz",
    clienteId: "CLI003",
    monto: 50000,
    motivo: "Crédito promocional por fidelidad",
    fecha: "21-08-2025",
    hora: "11:20",
    estado: "Activa",
    tipoAsociacion: "Manual",
    responsable: "Ana López",
    vencimiento: "21-02-2026"
  },
  {
    id: "NC004",
    cliente: "Laura Zapata",
    clienteId: "CLI004",
    monto: 45000,
    motivo: "Cancelación de tratamiento por enfermedad",
    fecha: "20-08-2025",
    hora: "09:15",
    estado: "Activa",
    asociadoA: "DEV004",
    tipoAsociacion: "Devolución",
    responsable: "Miguel Rodriguez",
    vencimiento: "20-02-2026"
  },
  {
    id: "NC005",
    cliente: "Pedro López",
    clienteId: "CLI005",
    monto: 30000,
    motivo: "Compensación por retraso en servicio",
    fecha: "19-08-2025",
    hora: "13:30",
    estado: "Vencida",
    asociadoA: "FAC0198",
    tipoAsociacion: "Factura",
    responsable: "Sofia Martinez",
    vencimiento: "19-08-2025"
  },
  {
    id: "NC006",
    cliente: "Ana Fernández",
    clienteId: "CLI006",
    monto: 60000,
    motivo: "Crédito por compra múltiple",
    fecha: "18-08-2025",
    hora: "10:45",
    estado: "Utilizada",
    tipoAsociacion: "Manual",
    responsable: "Miguel Rodriguez",
    vencimiento: "18-02-2026",
    montoUtilizado: 35000,
    fechaUso: "20-08-2025"
  },
  {
    id: "NC007",
    cliente: "Juan Pérez",
    clienteId: "CLI001",
    monto: 22000,
    motivo: "Devolución por expectativas no cumplidas",
    fecha: "15-08-2025",
    hora: "10:20",
    estado: "Activa",
    asociadoA: "DEV006",
    tipoAsociacion: "Devolución",
    responsable: "Ana López",
    vencimiento: "15-02-2026"
  },
  {
    id: "NC008",
    cliente: "Juan Pérez",
    clienteId: "CLI001",
    monto: 18000,
    motivo: "Compensación por incidente en servicio",
    fecha: "10-08-2025",
    hora: "16:45",
    estado: "Utilizada",
    asociadoA: "DEV007",
    tipoAsociacion: "Devolución",
    responsable: "Miguel Rodriguez",
    vencimiento: "10-02-2026",
    montoUtilizado: 18000,
    fechaUso: "12-08-2025"
  }
];

export function NotasCreditoPage() {
  const { success, error, AlertContainer } = useCustomAlert();
  const [notasCredito, setNotasCredito] = useState<NotaCredito[]>(notasCreditoData);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDevolucionesDialogOpen, setIsDevolucionesDialogOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<NotaCredito | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [isReportPopoverOpen, setIsReportPopoverOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(getDateRanges().monthly);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Filtros y paginación
  const filteredNotas = notasCredito.filter(nota => {
    const matchesSearch = nota.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nota.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nota.motivo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filtroEstado === "Todos" || nota.estado === filtroEstado;
    return matchesSearch && matchesEstado;
  });

  const totalPages = Math.ceil(filteredNotas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedNotas = filteredNotas.slice(startIndex, startIndex + itemsPerPage);

  // Funciones auxiliares
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "Activa": return "bg-green-600 text-white";
      case "Utilizada": return "bg-blue-600 text-white";
      case "Vencida": return "bg-red-600 text-white";
      default: return "bg-gray-medium text-white";
    }
  };

  const getTipoAsociacionIcon = (tipo?: string) => {
    switch (tipo) {
      case "Devolución": return <Receipt className="w-4 h-4 text-orange-primary" />;
      case "Factura": return <FileText className="w-4 h-4 text-blue-400" />;
      case "Manual": return <User className="w-4 h-4 text-green-400" />;
      default: return <FileText className="w-4 h-4 text-gray-lighter" />;
    }
  };

  const getDiasParaVencimiento = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento.split('-').reverse().join('-'));
    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getNotasClienteFrecuente = (clienteId: string) => {
    return notasCredito.filter(n => n.clienteId === clienteId).length;
  };

  const handleCreateNota = () => {
    // This function is no longer needed since we removed manual creation
    // Notes are now generated automatically from returns
  };

  const handleCrearDesdeDevolucion = (devolucion: DevolucionPendiente) => {
    const nuevaNotaCredito: NotaCredito = {
      id: `NC${String(notasCredito.length + 1).padStart(3, '0')}`,
      cliente: devolucion.cliente,
      clienteId: `CLI${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      monto: devolucion.monto,
      motivo: `Devolución de ${devolucion.producto}`,
      fecha: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      estado: "Activa",
      asociadoA: devolucion.id,
      tipoAsociacion: "Devolución",
      responsable: "Usuario Actual",
      vencimiento: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    setNotasCredito([nuevaNotaCredito, ...notasCredito]);
    success("¡Nota de crédito generada automáticamente!", `La nota de crédito ${nuevaNotaCredito.id} ha sido creada automáticamente desde la devolución ${devolucion.id} y está disponible para el cliente.`);
    setIsDevolucionesDialogOpen(false);
  };

  const handleMarcarComoUtilizada = (notaId: string, montoUtilizado: number) => {
    setNotasCredito(prev => prev.map(n => 
      n.id === notaId 
        ? { 
            ...n, 
            estado: "Utilizada" as const,
            montoUtilizado,
            fechaUso: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
          }
        : n
    ));
    toast.success(`Nota de crédito ${notaId} marcada como utilizada`);
  };

  // Generar reporte Excel
  const generateNotasCreditoExcelReport = (dateRange: DateRange) => {
    // Filtrar datos por rango de fechas
    const filteredData = filterDataByDateRange(notasCredito, 'fecha', dateRange);
    
    // Definir columnas para Excel
    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Cliente', key: 'cliente', width: 20 },
      { header: 'Monto', key: 'monto', width: 15, format: 'currency' },
      { header: 'Motivo', key: 'motivo', width: 40 },
      { header: 'Fecha', key: 'fecha', width: 12, format: 'date' },
      { header: 'Hora', key: 'hora', width: 10 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Asociado a', key: 'asociadoA', width: 15 },
      { header: 'Tipo Asociación', key: 'tipoAsociacion', width: 15 },
      { header: 'Responsable', key: 'responsable', width: 20 },
      { header: 'Vencimiento', key: 'vencimiento', width: 12, format: 'date' },
      { header: 'Monto Utilizado', key: 'montoUtilizado', width: 15, format: 'currency' },
      { header: 'Fecha de Uso', key: 'fechaUso', width: 12, format: 'date' }
    ];
    
    // Generar nombre de archivo
    const filename = generateFilename('Reporte_Notas_Credito', dateRange);
    
    // Descargar archivo Excel
    downloadCSV(filteredData, columns, filename);
    
    // Mostrar información del reporte
    const totalRegistros = filteredData.length;
    const totalMonto = filteredData.reduce((sum, n) => sum + n.monto, 0);
    
    toast.success(`Reporte Excel generado`, {
      description: `${totalRegistros} notas de crédito exportadas. Total: ${formatCurrency(totalMonto)}`
    });
  };

  // Manejar cambio de rango de fechas personalizado
  const handleCustomDateRange = () => {
    if (!customDateRange.startDate || !customDateRange.endDate) {
      toast.error("Por favor selecciona ambas fechas");
      return;
    }
    
    const customRange: DateRange = {
      startDate: customDateRange.startDate.split('-').reverse().join('-'),
      endDate: customDateRange.endDate.split('-').reverse().join('-'),
      type: 'daily'
    };
    
    generateNotasCreditoExcelReport(customRange);
    setIsReportPopoverOpen(false);
  };

  // Manejar selección de rango predefinido
  const handlePredefinedRange = (rangeType: 'daily' | 'weekly' | 'monthly' | 'annual') => {
    const ranges = getDateRanges();
    const selectedRange = ranges[rangeType];
    generateNotasCreditoExcelReport(selectedRange);
    setIsReportPopoverOpen(false);
  };

  // Estadísticas
  const notasHoy = notasCredito.filter(n => n.fecha === new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  const montoHoy = notasHoy.reduce((sum, n) => sum + n.monto, 0);
  const totalMontoActivas = notasCredito.filter(n => n.estado === "Activa").reduce((sum, n) => sum + n.monto, 0);
  const notasActivas = notasCredito.filter(n => n.estado === "Activa").length;
  const notasVencidas = notasCredito.filter(n => n.estado === "Vencida").length;
  const notasProximasVencer = notasCredito.filter(n => n.estado === "Activa" && getDiasParaVencimiento(n.vencimiento) <= 30).length;

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Gestión de Notas de Crédito</h1>
            <p className="text-sm text-gray-lightest mt-1">Control y emisión de notas de crédito para clientes</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="elegante-tag-orange">
              Hoy: ${formatCurrency(montoHoy)}
            </div>
            <div className="elegante-tag bg-green-600 text-white">
              Activas: ${formatCurrency(totalMontoActivas)}
            </div>
            {devolucionesPendientes.length > 0 && (
              <button
                onClick={() => setIsDevolucionesDialogOpen(true)}
                className="elegante-tag bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition-colors"
              >
                {devolucionesPendientes.length} Devoluciones Pendientes
              </button>
            )}
            <Popover open={isReportPopoverOpen} onOpenChange={setIsReportPopoverOpen}>
              <PopoverTrigger asChild>
                <button 
                  className="elegante-button-primary gap-2 flex items-center hover:scale-105 transition-transform"
                  title="Generar reporte de notas de crédito en Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Reporte Excel
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-gray-darkest border-gray-dark">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white-primary mb-2">Generar Reporte de Notas de Crédito</h4>
                    <p className="text-sm text-gray-lightest">Selecciona el período para el reporte en Excel</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white-primary">Períodos Predefinidos</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePredefinedRange('daily')}
                        className="elegante-button-secondary text-xs p-2 flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        Hoy
                      </button>
                      <button
                        onClick={() => handlePredefinedRange('weekly')}
                        className="elegante-button-secondary text-xs p-2 flex items-center gap-1"
                      >
                        <CalendarDays className="w-3 h-3" />
                        Semana
                      </button>
                      <button
                        onClick={() => handlePredefinedRange('monthly')}
                        className="elegante-button-secondary text-xs p-2 flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        Mes
                      </button>
                      <button
                        onClick={() => handlePredefinedRange('annual')}
                        className="elegante-button-secondary text-xs p-2 flex items-center gap-1"
                      >
                        <CalendarDays className="w-3 h-3" />
                        Año
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white-primary">Rango Personalizado</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-lighter">Desde</Label>
                        <Input
                          type="date"
                          value={customDateRange.startDate}
                          onChange={(e) => setCustomDateRange(prev => ({...prev, startDate: e.target.value}))}
                          className="elegante-input text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-lighter">Hasta</Label>
                        <Input
                          type="date"
                          value={customDateRange.endDate}
                          onChange={(e) => setCustomDateRange(prev => ({...prev, endDate: e.target.value}))}
                          className="elegante-input text-xs"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCustomDateRange}
                      className="elegante-button-primary w-full text-sm py-2"
                      disabled={!customDateRange.startDate || !customDateRange.endDate}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Generar Reporte
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        {/* Sección de Notas de Crédito */}
        <div className="elegante-card">
          {/* Barra de Controles */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-dark">
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-gray-darker p-4 rounded-lg border border-orange-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-primary/20 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-orange-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white-primary">Generación Automática</h3>
                    <p className="text-sm text-gray-lightest">Las notas de crédito se generan automáticamente al crear una devolución</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-gray-lighter" />
                <Select
                  value={filtroEstado}
                  onValueChange={(value) => {
                    setFiltroEstado(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-48 elegante-input">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark">
                    <SelectItem value="Todos" className="text-white-primary">Todos</SelectItem>
                    <SelectItem value="Activa" className="text-white-primary">Activas</SelectItem>
                    <SelectItem value="Utilizada" className="text-white-primary">Utilizadas</SelectItem>
                    <SelectItem value="Vencida" className="text-white-primary">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-lighter w-4 h-4" />
                <Input
                  placeholder="Buscar notas de crédito..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="elegante-input pl-11 w-80"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    title="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-sm text-gray-lightest">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredNotas.length)} de {filteredNotas.length} notas
              </div>
            </div>
          </div>

          {/* Tabla de Notas de Crédito */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-dark">
                  <th className="text-left font-semibold text-white-primary pb-4">ID</th>
                  <th className="text-left font-semibold text-white-primary pb-4">Cliente</th>
                  <th className="text-right font-semibold text-white-primary pb-4">Monto</th>
                  <th className="text-left font-semibold text-white-primary pb-4">Motivo</th>
                  <th className="text-center font-semibold text-white-primary pb-4">Fecha</th>
                  <th className="text-center font-semibold text-white-primary pb-4">Estado</th>
                  <th className="text-center font-semibold text-white-primary pb-4">Vencimiento</th>
                  <th className="text-center font-semibold text-white-primary pb-4">Asociación</th>
                  <th className="text-center font-semibold text-white-primary pb-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayedNotas.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={9}
                    title="No se encontraron notas de crédito"
                    description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                    onReload={() => window.location.reload()}
                  />
                ) : displayedNotas.map((nota) => {
                  const diasVencimiento = getDiasParaVencimiento(nota.vencimiento);
                  const clienteFrecuente = getNotasClienteFrecuente(nota.clienteId) > 2;
                  
                  return (
                    <tr key={nota.id} className="border-b border-gray-dark hover:bg-gray-darkest transition-colors">
                      <td className="py-4">
                        <span className="font-medium text-orange-primary">{nota.id}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-orange-primary flex items-center justify-center">
                            <User className="w-4 h-4 text-black-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-white-primary">{nota.cliente}</span>
                            {clienteFrecuente && (
                              <div className="flex items-center space-x-1 text-blue-400">
                                <CheckCircle className="w-3 h-3" />
                                <span className="text-xs">Cliente VIP</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div>
                          <span className="font-bold text-orange-primary">${formatCurrency(nota.monto)}</span>
                          {nota.montoUtilizado && (
                            <div className="text-xs text-gray-lighter">
                              Utilizado: ${formatCurrency(nota.montoUtilizado)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-gray-lightest text-sm">{nota.motivo}</span>
                      </td>
                      <td className="py-4 text-center">
                        <div className="text-sm text-gray-lightest">
                          <div>{nota.fecha}</div>
                          <div className="text-xs text-gray-lighter">{nota.hora}</div>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(nota.estado)}`}>
                          {nota.estado}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <div className="text-sm text-gray-lightest">
                          <div>{nota.vencimiento}</div>
                          {nota.estado === "Activa" && (
                            <div className={`text-xs ${diasVencimiento <= 30 ? 'text-red-400' : 'text-gray-lighter'}`}>
                              {diasVencimiento > 0 ? `${diasVencimiento} días` : 'Vencida'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {getTipoAsociacionIcon(nota.tipoAsociacion)}
                          <div className="text-xs text-gray-lighter">
                            <div>{nota.tipoAsociacion}</div>
                            {nota.asociadoA && (
                              <div className="flex items-center space-x-1">
                                <span>{nota.asociadoA}</span>
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedNota(nota);
                              setIsDetailDialogOpen(true);
                            }}
                            className="text-orange-primary hover:text-orange-secondary transition-colors p-1"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {nota.estado === "Activa" && (
                            <button
                              onClick={() => handleMarcarComoUtilizada(nota.id, nota.monto)}
                              className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                              title="Marcar como utilizada"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-dark">
              <div />
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md bg-gray-darker hover:bg-gray-medium border border-gray-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-orange-primary" />
                </button>
                <span className="text-sm text-gray-lightest">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md bg-gray-darker hover:bg-gray-medium border border-gray-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 text-orange-primary" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dialog de Detalles */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="elegante-card max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white-primary flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-primary" />
                Detalles de Nota de Crédito
              </DialogTitle>
              <DialogDescription className="text-gray-lightest">
                {selectedNota?.id}
              </DialogDescription>
            </DialogHeader>
            {selectedNota && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-lighter text-sm">Cliente</Label>
                    <p className="text-white-primary font-medium">{selectedNota.cliente}</p>
                    {getNotasClienteFrecuente(selectedNota.clienteId) > 2 && (
                      <div className="flex items-center space-x-1 text-blue-400 mt-1">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs">Cliente VIP - {getNotasClienteFrecuente(selectedNota.clienteId)} notas de crédito</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-lighter text-sm">Monto</Label>
                    <p className="text-orange-primary font-bold text-xl">${formatCurrency(selectedNota.monto)}</p>
                    {selectedNota.montoUtilizado && (
                      <p className="text-gray-lighter text-sm">Utilizado: ${formatCurrency(selectedNota.montoUtilizado)}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-lighter text-sm">Fecha de Emisión</Label>
                    <p className="text-white-primary font-medium">{selectedNota.fecha} - {selectedNota.hora}</p>
                  </div>
                  <div>
                    <Label className="text-gray-lighter text-sm">Fecha de Vencimiento</Label>
                    <p className="text-white-primary font-medium">{selectedNota.vencimiento}</p>
                    {selectedNota.estado === "Activa" && (
                      <p className={`text-sm ${getDiasParaVencimiento(selectedNota.vencimiento) <= 30 ? 'text-red-400' : 'text-gray-lighter'}`}>
                        {getDiasParaVencimiento(selectedNota.vencimiento) > 0 
                          ? `Vence en ${getDiasParaVencimiento(selectedNota.vencimiento)} días`
                          : 'Vencida'
                        }
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-lighter text-sm">Motivo</Label>
                  <p className="text-white-primary">{selectedNota.motivo}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-lighter text-sm">Estado</Label>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(selectedNota.estado)}`}>
                      {selectedNota.estado}
                    </span>
                    {selectedNota.fechaUso && (
                      <p className="text-gray-lighter text-sm mt-1">Utilizada el: {selectedNota.fechaUso}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-lighter text-sm">Responsable</Label>
                    <p className="text-white-primary">{selectedNota.responsable}</p>
                  </div>
                </div>
                {selectedNota.asociadoA && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-lighter text-sm">Tipo de Asociación</Label>
                      <div className="flex items-center space-x-2">
                        {getTipoAsociacionIcon(selectedNota.tipoAsociacion)}
                        <span className="text-white-primary">{selectedNota.tipoAsociacion}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-lighter text-sm">Asociada a</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-primary font-medium">{selectedNota.asociadoA}</span>
                        <ExternalLink className="w-4 h-4 text-gray-lighter" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Devoluciones Pendientes */}
        <Dialog open={isDevolucionesDialogOpen} onOpenChange={setIsDevolucionesDialogOpen}>
          <DialogContent className="elegante-card max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white-primary flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-primary" />
                Devoluciones Pendientes de Nota de Crédito
              </DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Generar notas de crédito automáticamente desde devoluciones aprobadas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-dark">
                      <th className="text-left font-semibold text-white-primary pb-4">ID Devolución</th>
                      <th className="text-left font-semibold text-white-primary pb-4">Cliente</th>
                      <th className="text-left font-semibold text-white-primary pb-4">Producto</th>
                      <th className="text-right font-semibold text-white-primary pb-4">Monto</th>
                      <th className="text-center font-semibold text-white-primary pb-4">Fecha</th>
                      <th className="text-center font-semibold text-white-primary pb-4">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devolucionesPendientes.length === 0 ? (
                      <TableEmptyStateRow
                        colSpan={6}
                        title="No se encontraron devoluciones pendientes"
                        description="Recarga la tabla para verificar si hay nuevas devoluciones aprobadas."
                        onReload={() => window.location.reload()}
                      />
                    ) : devolucionesPendientes.map((devolucion) => (
                        <tr key={devolucion.id} className="border-b border-gray-dark">
                          <td className="py-4">
                            <span className="font-medium text-orange-primary">{devolucion.id}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-white-primary">{devolucion.cliente}</span>
                          </td>
                          <td className="py-4">
                            <span className="text-white-primary">{devolucion.producto}</span>
                          </td>
                          <td className="py-4 text-right">
                            <span className="font-bold text-orange-primary">${formatCurrency(devolucion.monto)}</span>
                          </td>
                          <td className="py-4 text-center">
                            <span className="text-gray-lightest">{devolucion.fecha}</span>
                          </td>
                          <td className="py-4 text-center">
                            <button
                              onClick={() => handleCrearDesdeDevolucion(devolucion)}
                              className="elegante-button-primary text-sm py-2 px-4 gap-2 flex items-center"
                            >
                              <CreditCard className="w-4 h-4" />
                              Generar Nota de Crédito
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      
      <AlertContainer />
    </>
  );
}
