import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Star, Clock, DollarSign, Scissors, Check, Calendar, Sparkles, Award, Loader2, Package, X, ChevronDown } from "lucide-react";
import { Input } from "../../../shared/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/components/ui/dialog";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { apiService, Servicio, Paquete } from "../../../shared/services/api";
import { formatDuracion } from "../../../shared/utils/dateUtils";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";

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
  const { success, error: showErrorAlert, AlertContainer } = useCustomAlert();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("Todos");
  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_LOAD = 8;
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
        showErrorAlert("Error al cargar", "No se pudieron cargar los servicios y paquetes.");
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

    const matchesCategoria =
      selectedCategoria === "Todos" ||
      (selectedCategoria === "Paquetes" && item.type === 'paquete') ||
      (selectedCategoria === "Individuales" && item.type === 'servicio');

    return matchesSearch && matchesCategoria;
  });

  // Reset al cambiar filtros
  useEffect(() => { setVisibleCount(12); }, [searchTerm, selectedCategoria]);

  const displayedItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + ITEMS_PER_LOAD);
  }, []);

  // Scroll infinito: carga automática al llegar al sentinel
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) handleLoadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, handleLoadMore]);

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
      success(`${item.type === 'paquete' ? 'Paquete' : 'Servicio'} seleccionado`, `"${item.nombre}" — Puedes agendar en la sección "Mis Citas".`);
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
      {/* Filtros */}
      <div className="rounded-xl p-6 mb-6 bg-gray-darkest">
        <div className="flex flex-wrap items-center gap-3">
          {/* Búsqueda */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-lightest w-4 h-4" />
            <Input
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              className="elegante-input pl-10 pr-8"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros de tipo */}
          {[
            { label: "Todos", value: "Todos" },
            { label: "Individuales", value: "Individuales" },
            { label: "Paquetes", value: "Paquetes" },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setSelectedCategoria(value); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategoria === value
                  ? "bg-orange-primary text-black-primary"
                  : "bg-gray-darker text-gray-lightest border border-gray-dark hover:bg-gray-dark"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-orange-primary animate-spin mb-4" />
              <p className="text-gray-lightest animate-pulse">Cargando catálogo de servicios...</p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-gray-darkest rounded-xl border border-transparent p-0 overflow-hidden group flex flex-col transition-all duration-300 hover:border-orange-primary/60 hover:shadow-[0_0_18px_2px_rgba(216,176,129,0.35)] cursor-pointer"
                  onClick={() => handleViewDetails(item)}
                >
                  {/* Imagen */}
                  <div className="w-full aspect-square bg-gray-darker relative overflow-hidden flex items-center justify-center">
                    {(item as any).imagen ? (
                      <img
                        src={(item as any).imagen}
                        alt={item.nombre}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : item.type === 'paquete' ? (
                      <img
                        src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=90"
                        alt={item.nombre}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center pointer-events-none">
                        <Scissors className="w-10 h-10 text-gray-medium opacity-20" />
                      </div>
                    )}
                    {item.type === 'paquete' && (item as Paquete).descuento > 0 && (
                      <div className="absolute top-2 right-2 bg-orange-primary text-black-primary px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-widest shadow-lg">
                        -{Math.round((item as Paquete).descuento)}% OFF
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <h3 className="text-base font-extrabold text-white-primary group-hover:text-orange-primary transition-colors leading-tight line-clamp-2">
                      {item.nombre}
                    </h3>

                    <div className="flex items-center justify-between">
                      {item.type === 'paquete' && (item as Paquete).descuento > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-medium line-through text-xs">${formatCurrency(item.precio)}</span>
                          <span className="text-orange-primary font-extrabold text-lg">
                            ${formatCurrency(item.precio - (item.precio * (item as Paquete).descuento / 100))}
                          </span>
                        </div>
                      ) : (
                        <span className="text-orange-primary font-extrabold text-lg">
                          ${formatCurrency(item.precio)}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-gray-lighter text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuracion(item.duracion)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${item.type === 'paquete' ? 'text-blue-400' : 'text-orange-primary'}`}>
                        {item.type === 'paquete' ? 'Paquete' : getCategoria(item.nombre)}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(item); }}
                        className="flex-1 py-1.5 rounded-lg border border-gray-dark text-gray-lightest text-[10px] font-bold uppercase tracking-wider hover:border-orange-primary hover:text-orange-primary transition-colors"
                      >
                        Ver Detalles
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReservarItem(item); }}
                        className="flex-1 py-1.5 rounded-lg bg-orange-primary text-black-primary text-[10px] font-bold uppercase tracking-wider hover:bg-orange-primary/90 transition-colors"
                      >
                        Reservar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ver más / scroll infinito */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex flex-col items-center gap-3 pt-4 pb-2">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-orange-primary/40 text-orange-primary text-sm font-semibold hover:bg-orange-primary/10 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Ver más servicios ({filteredItems.length - visibleCount} restantes)
                </button>
              </div>
            )}

            {!hasMore && filteredItems.length > 0 && (
              <p className="text-center text-xs text-gray-lightest/50 pb-2">
                Mostrando {filteredItems.length} de {filteredItems.length} servicios
              </p>
            )}
            </>
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
                          url={(selectedItem as any).imagen || (selectedItem.type === 'paquete' ? 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600' : undefined)}
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
                        <div className="bg-gray-darker p-5 rounded-xl flex flex-col justify-center h-full">
                          <div className="flex items-center justify-between mb-4 border-b border-gray-dark pb-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-lighter font-bold uppercase tracking-widest mb-1">Precio</span>
                                <div className="flex items-center gap-3">
                                  {selectedItem.type === 'paquete' && (selectedItem as Paquete).descuento > 0 ? (
                                    <>
                                      <span className="text-gray-lighter line-through text-sm">
                                        ${formatCurrency(selectedItem.precio)}
                                      </span>
                                      <span className="text-orange-primary font-extrabold text-3xl">
                                        ${formatCurrency(selectedItem.precio - (selectedItem.precio * (selectedItem as Paquete).descuento / 100))}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-orange-primary font-extrabold text-3xl">
                                      ${formatCurrency(selectedItem.precio)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-gray-lighter font-bold uppercase tracking-widest mb-1">Duración</span>
                              <div className="flex items-center gap-2 text-white-primary">
                                <Clock className="w-5 h-5 text-orange-primary" />
                                <span className="font-bold text-2xl">{formatDuracion(selectedItem.duracion)}</span>
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
                        <div className="bg-gray-darker/50 p-4 rounded-xl space-y-3">
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
    <AlertContainer />
    </>
  );
}
