import { useState, useEffect } from "react";
import { Package, ShoppingBag, Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../shared/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { productoService, ApiProducto, ApiCategoria } from "../../productos/services/productos";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";

const formatCurrency = (amount: number): string =>
  amount.toLocaleString("es-CO");

// Genera highlights atractivos según categoría/nombre del producto
function getProductHighlights(producto: ApiProducto): string[] {
  const nombre = (producto.nombre || "").toLowerCase();
  const cat = (producto.categoria?.nombre || "").toLowerCase();
  const desc = (producto.descripcion || "").toLowerCase();

  if (cat.includes("cera") || nombre.includes("cera") || nombre.includes("pomada") || nombre.includes("gel")) {
    return [
      "Fijación duradera todo el día sin residuos",
      "Fórmula profesional usada por nuestros barberos",
      "Ideal para definir y moldear cualquier estilo",
    ];
  }
  if (cat.includes("accesorio") || nombre.includes("cadena") || nombre.includes("collar") || nombre.includes("pulsera")) {
    return [
      "Complemento perfecto para elevar tu look",
      "Material de alta calidad con acabado premium",
      "Diseño versátil para cualquier ocasión",
    ];
  }
  if (cat.includes("cuidado") || nombre.includes("crema") || nombre.includes("loción") || nombre.includes("aceite") || nombre.includes("shampoo")) {
    return [
      "Hidratación profunda y duradera",
      "Ingredientes naturales seleccionados",
      "Resultados visibles desde la primera aplicación",
    ];
  }
  if (nombre.includes("afeitad") || nombre.includes("navaja") || nombre.includes("rasur")) {
    return [
      "Afeitado limpio y preciso como en barbería",
      "Reduce irritación y enrojecimiento",
      "Herramienta favorita de los barberos profesionales",
    ];
  }
  if (nombre.includes("perfume") || nombre.includes("colonia") || nombre.includes("fragancia")) {
    return [
      "Fragancia masculina de larga duración",
      "Aroma sofisticado para cualquier momento",
      "Proyección intensa que deja huella",
    ];
  }
  // Default atractivo
  return [
    "Producto seleccionado por nuestros expertos",
    "Calidad premium al mejor precio",
    "Disponible exclusivamente en Manito Barbershop",
  ];
}

export function ClienteProductosPage({ onSelectProduct }: { onSelectProduct?: (product: ApiProducto) => void }) {
  const [productos, setProductos] = useState<ApiProducto[]>([]);
  const [categorias, setCategorias] = useState<ApiCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("Todos");
  const [selectedProducto, setSelectedProducto] = useState<ApiProducto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prods, cats] = await Promise.all([
          productoService.getProductos(),
          productoService.getCategorias(),
        ]);
        setProductos(prods.filter((p) => p.activo && p.stockVentas > 0));
        setCategorias(cats.filter((c) => c.estado));
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const categoriasMenu = ["Todos", ...categorias.map((c) => c.nombre)];

  const filteredProductos = productos.filter((p) => {
    const matchSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.descripcion || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat =
      selectedCategoria === "Todos" || p.categoria?.nombre === selectedCategoria;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="elegante-card">
        <div className="flex flex-wrap gap-2">
          {categoriasMenu.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoria(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategoria === cat
                  ? "bg-orange-primary text-black-primary"
                  : "bg-gray-darker text-gray-lightest border border-gray-dark hover:bg-gray-dark"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-orange-primary animate-spin mb-4" />
          <p className="text-gray-lightest animate-pulse">Cargando productos...</p>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="text-center py-12 text-gray-lightest">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No se encontraron productos que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="elegante-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-2">
          {filteredProductos.map((producto) => (
            <div
              key={producto.id}
              className="bg-gray-darkest border border-gray-dark rounded-xl overflow-hidden group flex flex-col transition-all duration-300 hover:border-orange-primary/60 hover:shadow-[0_0_18px_2px_rgba(216,176,129,0.35)]"
            >
              <div className="h-28 overflow-hidden bg-gray-darker relative">
                <ImageRenderer
                  url={producto.imagenProduc}
                  alt={producto.nombre}
                  showLabel={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {!producto.imagenProduc && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Package className="w-16 h-16 text-gray-medium opacity-20" />
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-primary">
                    {producto.categoria?.nombre || "Producto"}
                  </span>
                  <div className="flex items-center gap-1 text-gray-lighter text-xs">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{producto.stockVentas} disponibles</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white-primary group-hover:text-orange-primary transition-colors leading-tight">
                  {producto.nombre}
                </h3>

                <div className="flex flex-col mt-auto">
                  <span className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold">Precio</span>
                  <div className="flex items-center justify-between">
                    <span className="text-orange-primary font-extrabold text-xl">
                      ${formatCurrency(producto.precioVenta || producto.precio || 0)}
                    </span>
                    {producto.marca && (
                      <span className="text-[10px] text-gray-lighter border border-gray-dark px-2 py-0.5 rounded">
                        {producto.marca}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedProducto(producto); setIsDetailOpen(true); }}
                  className="w-full mt-1 py-2 rounded-lg border border-gray-dark text-gray-lightest text-xs font-bold uppercase tracking-wider hover:border-orange-primary hover:text-orange-primary transition-colors"
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl bg-gray-darkest border-gray-dark max-h-[90vh] flex flex-col">
          {selectedProducto && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white-primary text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-orange-primary/10 rounded-lg">
                    <Package className="w-6 h-6 text-orange-primary" />
                  </div>
                  {selectedProducto.nombre}
                </DialogTitle>
                <DialogDescription className="text-gray-lighter text-sm">
                  {selectedProducto.categoria?.nombre
                    ? `${selectedProducto.categoria.nombre} — producto disponible en Manito Barbershop`
                    : "Información detallada sobre este producto"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4 mt-2">
                {/* Imagen + precio/stock */}
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                  <div className="w-48 h-48 rounded-xl overflow-hidden border border-gray-dark shadow-lg relative shrink-0">
                    <ImageRenderer
                      url={selectedProducto.imagenProduc}
                      alt={selectedProducto.nombre}
                      showLabel={false}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <span className="absolute bottom-3 left-3 text-[10px] font-bold text-black-primary bg-orange-primary px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg">
                      {selectedProducto.categoria?.nombre || "Producto"}
                    </span>
                  </div>

                  <div className="flex-1 space-y-4 w-full">
                    <div className="bg-gray-darker p-5 rounded-2xl border border-gray-dark flex flex-col justify-center h-full">
                      <div className="flex items-center justify-between mb-4 border-b border-gray-dark pb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-lighter font-bold uppercase tracking-widest mb-1">Precio</span>
                          <span className="text-orange-primary font-extrabold text-3xl">
                            ${formatCurrency(selectedProducto.precioVenta || selectedProducto.precio || 0)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-gray-lighter font-bold uppercase tracking-widest mb-1">Disponibles</span>
                          <div className="flex items-center gap-2 text-white-primary">
                            <ShoppingBag className="w-5 h-5 text-orange-primary" />
                            <span className="font-bold text-2xl">{selectedProducto.stockVentas}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-lightest text-sm leading-relaxed italic">
                        "{selectedProducto.descripcion || `${selectedProducto.nombre} — producto de cuidado personal de alta calidad, seleccionado por nuestros expertos.`}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Highlights + Por qué elegirlo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-white-primary font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                      <Check className="w-4 h-4 text-green-500" />
                      ¿Por qué este producto?
                    </h4>
                    <div className="bg-gray-darker/50 p-4 rounded-xl border border-gray-dark/50 space-y-3">
                      {getProductHighlights(selectedProducto).map((h, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-primary shrink-0" />
                          <span className="text-gray-lighter text-xs font-medium">{h}</span>
                        </div>
                      ))}
                      {selectedProducto.marca && (
                        <div className="flex items-start gap-3 pt-2 border-t border-gray-dark/40">
                          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-primary/50 shrink-0" />
                          <span className="text-gray-lighter text-xs font-medium">Marca: <span className="text-white-primary">{selectedProducto.marca}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-white-primary font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                      <Sparkles className="w-4 h-4 text-orange-primary" />
                      Recomendaciones
                    </h4>
                    <div className="bg-orange-primary/5 p-4 rounded-xl border border-orange-primary/20 space-y-3">
                      {[
                        "Consulta a tu barbero sobre el uso ideal para tu tipo de cabello.",
                        "Almacenar en lugar fresco y seco para mayor duración.",
                        "Complementa tu rutina con otros productos de nuestra tienda.",
                      ].map((tip, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-primary shrink-0 mt-1.5" />
                          <p className="text-gray-lightest text-xs">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex gap-4 pt-6 border-t border-gray-dark">
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="elegante-button-secondary flex-1 py-3 font-bold uppercase tracking-wider"
                  >
                    Volver
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


