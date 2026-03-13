import { useState, useEffect } from "react";
import { Search, Star, Clock, DollarSign, Scissors, Check, Calendar, Sparkles, Award } from "lucide-react";
import { Input } from "../../../shared/components/ui/input";
import { Button } from "../../../shared/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/components/ui/dialog";
import { toast } from "sonner";
import { apiService, Servicio, Paquete } from "../../../shared/services/api";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { Loader2, Package } from "lucide-react";

// Función para formatear moneda colombiana
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO');
};

const categorias = ["Todos", "Cortes", "Barba", "Paquetes", "Combo", "Otros"];

const BENEFICIOS_DEFAULT = [
  "Atención personalizada",
  "Ambiente profesional y cómodo",
  "Asesoría de estilo"
];

interface ClienteServiciosPageProps {
  onSelectReservation?: (item: Servicio | Paquete | any) => void;
}

export function ClienteServiciosPage({ onSelectReservation }: ClienteServiciosPageProps) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("Todos");
  const [selectedItem, setSelectedItem] = useState<(Servicio | Paquete) & { type?: 'servicio' | 'paquete' } | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [serviciosData, paquetesData] = await Promise.all([
          apiService.getServicios(),
          apiService.getPaquetes()
        ]);

        setServicios(serviciosData.filter(s => s.estado));
        const activePaquetes = paquetesData.filter(p => p.activo);
        setPaquetes(activePaquetes);

        // Enriquecer paquetes con nombres reales de servicios
        // Se hace un fetch por cada paquete para traer su detalle completo (nombres de servicios)
        const detailedPaquetes = await Promise.all(
          activePaquetes.map(async (p) => {
            try {
              const detailed = await apiService.getPaqueteById(p.id);
              return detailed || p;
            } catch (err) {
              console.warn(`Error cargando detalles del paquete ${p.id}:`, err);
              return p;
            }
          })
        );
        setPaquetes(detailedPaquetes);
      } catch (error) {
        console.error("Error cargando catálogo:", error);
        toast.error("No se pudieron cargar los servicios y paquetes");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Determinar categoría basada en nombre (fallback)
  const getCategoria = (nombre: string) => {
    const n = nombre.toLowerCase();
    if (n.includes('corte')) return 'Cortes';
    if (n.includes('barba') || n.includes('afeitado')) return 'Barba';
    if (n.includes('+')) return 'Combo';
    return 'Otros';
  };

  // Combinar y filtrar items
  const combinedItems = [
    ...servicios.map(s => ({ ...s, type: 'servicio' as const })),
    ...paquetes.map(p => ({ ...p, type: 'paquete' as const }))
  ];

  const filteredItems = combinedItems.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Si es paquete, su categoría es 'Paquetes'
    const itemCategoria = item.type === 'paquete' ? 'Paquetes' : getCategoria(item.nombre);

    const matchesCategoria = selectedCategoria === "Todos" || itemCategoria === selectedCategoria;

    return matchesSearch && matchesCategoria;
  });

  const handleViewDetails = async (item: Servicio | Paquete | any) => {
    setSelectedItem(item);
    setIsDetailDialogOpen(true);

    // Si es un paquete, intentamos cargar sus detalles específicos para asegurar los nombres de los servicios
    if (item.type === 'paquete') {
      try {
        const fullPaquete = await apiService.getPaqueteById(item.id);
        if (fullPaquete && fullPaquete.servicios.length > 0) {
          setSelectedItem({ ...fullPaquete, type: 'paquete' });
        }
      } catch (error) {
        console.warn("No se pudieron cargar detalles extra del paquete:", error);
      }
    }
  };

  const handleReservarItem = (item: Servicio | Paquete | any) => {
    if (onSelectReservation) {
      onSelectReservation(item);
    } else {
      toast.success(`${item.type === 'paquete' ? 'Paquete' : 'Servicio'} "${item.nombre}" seleccionado`, {
        description: `Puedes agendar este ${item.type === 'paquete' ? 'paquete' : 'servicio'} en la sección de "Mis Citas".`,
        duration: 4000,
      });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? "fill-orange-primary text-orange-primary" : "text-gray-medium"
              }`}
          />
        ))}
        <span className="text-gray-lightest text-sm ml-1">({rating})</span>
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Servicios Disponibles</h1>
            <p className="text-sm text-gray-lightest mt-1">Descubre todos nuestros servicios profesionales de barbería</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8 bg-black-primary">
        <div className="max-w-7xl mx-auto">
          {/* Filtros */}
          <div className="elegante-card mb-8">
            <div className="space-y-4">
              {/* Búsqueda */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-lightest w-4 h-4" />
                <Input
                  placeholder="Buscar servicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="elegante-input pl-10"
                />
              </div>

              {/* Filtro por categoría */}
              <div className="flex flex-wrap gap-2">
                {categorias.map((categoria) => (
                  <button
                    key={categoria}
                    onClick={() => setSelectedCategoria(categoria)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategoria === categoria
                        ? "bg-orange-primary text-black-primary"
                        : "bg-gray-darker text-gray-lightest border border-gray-dark hover:bg-gray-dark"
                      }`}
                  >
                    {categoria}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-orange-primary animate-spin mb-4" />
              <p className="text-gray-lightest animate-pulse">Cargando catálogo de servicios...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
              {filteredItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="elegante-card relative flex flex-col h-full overflow-hidden group max-w-[380px] mx-auto w-full">
                  {/* Imagen del item */}
                  <div className="h-52 overflow-hidden bg-gray-darkest border-b border-gray-dark relative">
                    <ImageRenderer
                      url={(item as any).imagen}
                      alt={item.nombre}
                      showLabel={false}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {!(item as any).imagen && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {item.type === 'paquete' ? (
                          <Package className="w-16 h-16 text-orange-primary opacity-30" />
                        ) : (
                          <Scissors className="w-16 h-16 text-gray-medium opacity-20" />
                        )}
                      </div>
                    )}
                    {item.type === 'paquete' && (
                      <div className="absolute top-4 right-4 bg-orange-primary text-black-primary px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-lg">
                        Oferta Especial
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    {/* Badge de Categoría */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${item.type === 'paquete'
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'bg-orange-primary/10 text-orange-primary'
                        }`}>
                        {item.type === 'paquete' ? 'Paquete' : getCategoria(item.nombre)}
                      </span>
                      <div className="flex items-center gap-1 text-gray-lighter">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{item.duracion} min</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white-primary mb-2 group-hover:text-orange-primary transition-colors">
                      {item.nombre}
                    </h3>

                    <p className="text-gray-lightest text-sm mb-6 line-clamp-3 leading-relaxed flex-1">
                      {item.descripcion || "Sin descripción disponible."}
                    </p>

                    {/* Beneficios/Servicios incluidos */}
                    <div className="mb-6 space-y-2 p-3 bg-gray-darkers rounded-xl border border-gray-dark/30">
                      {item.type === 'paquete' ? (
                        (item as Paquete).servicios.length > 0 ? (
                          (item as Paquete).servicios.slice(0, 4).map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                              <span className="text-white-primary font-medium line-clamp-1">{s}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-gray-medium animate-pulse py-1">Obteniendo servicios...</div>
                        )
                      ) : (
                        BENEFICIOS_DEFAULT.slice(0, 3).map((beneficio, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            <span className="text-gray-lighter">{beneficio}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Precio y Botones */}
                    <div className="mt-auto space-y-4 pt-4 border-t border-gray-dark">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-gray-lighter text-[10px] uppercase tracking-widest font-bold">Precio</span>
                          <span className="text-orange-primary font-extrabold text-2xl">
                            ${formatCurrency(item.precio)}
                          </span>
                        </div>
                        {item.type === 'paquete' && (item as Paquete).descuento > 0 && (
                          <div className="bg-green-600/20 text-green-400 px-2 py-1 rounded text-[10px] font-bold">
                            -{Math.round((item as Paquete).descuento)}% OFF
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="elegante-button-secondary flex-1 text-xs py-2.5 font-bold uppercase tracking-wider"
                        >
                          Ver Detalles
                        </button>
                        <button
                          onClick={() => handleReservarItem(item)}
                          className="elegante-button-primary flex-1 text-xs py-2.5 font-bold uppercase tracking-wider shadow-lg shadow-orange-primary/10"
                        >
                          Reservar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-lightest mb-4">
                <Scissors className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron resultados que coincidan con tu búsqueda.</p>
              </div>
            </div>
          )}

          {/* Modal de Detalles */}
          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent className="max-w-3xl bg-gray-darkest border-gray-dark max-h-[90vh] flex flex-col">
              {selectedItem && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-white-primary text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-orange-primary/10 rounded-lg">
                        {selectedItem.type === 'paquete' ? (
                          <Package className="w-6 h-6 text-orange-primary" />
                        ) : (
                          <Scissors className="w-6 h-6 text-orange-primary" />
                        )}
                      </div>
                      {selectedItem.nombre}
                    </DialogTitle>
                    <DialogDescription className="text-gray-lighter text-sm">
                      {selectedItem.type === 'paquete'
                        ? 'Paquete promocional con múltiples servicios incluidos'
                        : 'Información detallada sobre este servicio profesional'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4 mt-2">
                    {/* Imagen y Categoría */}
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                      <div className="w-48 h-48 rounded-xl overflow-hidden border border-gray-dark shadow-lg relative shrink-0">
                        <ImageRenderer
                          url={(selectedItem as any).imagen}
                          alt={selectedItem.nombre}
                          showLabel={false}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20"></div>
                        <span className="absolute bottom-3 left-3 text-[10px] font-bold text-black-primary bg-orange-primary px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg">
                          {selectedItem.type === 'paquete' ? 'PAQUETE' : getCategoria(selectedItem.nombre)}
                        </span>
                      </div>

                      <div className="flex-1 space-y-4 w-full">
                        <div className="bg-gray-darker p-5 rounded-2xl border border-gray-dark flex flex-col justify-center h-full">
                          <div className="flex items-center justify-between mb-4 border-b border-gray-dark pb-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-lighter font-bold uppercase tracking-widest mb-1">Precio</span>
                              <div className="flex items-center gap-3">
                                <span className="text-orange-primary font-extrabold text-3xl">
                                  ${formatCurrency(selectedItem.precio)}
                                </span>
                                {selectedItem.type === 'paquete' && (selectedItem as Paquete).precioOriginal > selectedItem.precio && (
                                  <span className="text-gray-lighter line-through text-sm">
                                    ${formatCurrency((selectedItem as Paquete).precioOriginal)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-gray-lighter font-bold uppercase tracking-widest mb-1">Duración</span>
                              <div className="flex items-center gap-2 text-white-primary">
                                <Clock className="w-5 h-5 text-orange-primary" />
                                <span className="font-bold text-2xl">{selectedItem.duracion} <span className="text-sm font-normal text-gray-lighter">min</span></span>
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-lightest text-sm leading-relaxed italic">
                            "{selectedItem.descripcion || (selectedItem.type === 'paquete' ? 'Disfruta de una combinación exclusiva de servicios diseñados para ofrecerte la mejor experiencia.' : "Servicio profesional diseñado para resaltar tu mejor versión.")}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Beneficios detallados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="text-white-primary font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                          <Check className="w-4 h-4 text-green-500" />
                          {selectedItem.type === 'paquete' ? 'Servicios Incluidos' : '¿Qué incluye este servicio?'}
                        </h4>
                        <div className="bg-gray-darker/50 p-4 rounded-xl border border-gray-dark/50 space-y-3">
                          {selectedItem.type === 'paquete' ? (
                            (selectedItem as Paquete).servicios.length > 0 ? (
                              (selectedItem as Paquete).servicios.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-3 py-1 border-b border-gray-dark/30 last:border-0">
                                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                                  <span className="text-white-primary text-sm font-bold tracking-tight">{s}</span>
                                </div>
                              ))
                            ) : (
                              <div className="flex flex-col items-center py-4 opacity-40">
                                <Package className="w-8 h-8 mb-2" />
                                <p className="text-[10px] uppercase tracking-widest">Cargando servicios...</p>
                              </div>
                            )
                          ) : (
                            BENEFICIOS_DEFAULT.map((beneficio, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-primary shrink-0" />
                                <span className="text-gray-lighter text-xs font-medium">{beneficio}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-white-primary font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                          <Sparkles className="w-4 h-4 text-orange-primary" />
                          Recomendaciones
                        </h4>
                        <div className="bg-orange-primary/5 p-4 rounded-xl border border-orange-primary/20 space-y-3">
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-primary shrink-0 mt-1.5" />
                            <p className="text-gray-lightest text-xs">Asistir 5-10 minutos antes de la hora acordada.</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-primary shrink-0 mt-1.5" />
                            <p className="text-gray-lightest text-xs">Traer una idea o foto del estilo que deseas.</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-primary shrink-0 mt-1.5" />
                            <p className="text-gray-lightest text-xs">Pregunta por nuestros productos de mantenimiento.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Modal */}
                    <div className="flex gap-4 pt-6 border-t border-gray-dark">
                      <button
                        onClick={() => setIsDetailDialogOpen(false)}
                        className="elegante-button-secondary flex-1 py-3 font-bold uppercase tracking-wider"
                      >
                        Volver
                      </button>
                      <button
                        onClick={() => {
                          handleReservarItem(selectedItem);
                          setIsDetailDialogOpen(false);
                        }}
                        className="elegante-button-primary flex-1 py-3 font-bold uppercase tracking-wider shadow-lg shadow-orange-primary/20"
                      >
                        Reservar Cita
                      </button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </>
  );
}
