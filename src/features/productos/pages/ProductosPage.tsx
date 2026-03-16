import { useState, useRef, useEffect, useMemo } from "react";
import { Textarea } from "../../../shared/components/ui/textarea";
import { Input } from "../../../shared/components/ui/input";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  ToggleLeft,
  ToggleRight,
  Boxes,
  FileText,
  Image as ImageIcon,
  Camera,
  Tags,
  Loader2,
  Info,
  AlertCircle,
  Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { Label } from "../../../shared/components/ui/label";
import { Switch } from "../../../shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { productoService, ApiProducto } from "../services/productos";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { apiService } from "../../../shared/services/api";
import { isSaleOnly } from "../../../shared/utils/usagePolicy";
import { getStoredUsage, saveStoredUsage, removeStoredUsage } from "../utils/usagePersistence";

const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString('es-CO');
};

export function ProductosPage() {
  const { error, created, edited, deleted, AlertContainer } = useCustomAlert();
  const [productos, setProductos] = useState<ApiProducto[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<any>(null);
  const [editingStockTotal, setEditingStockTotal] = useState<number | null>(null);
  const [selectedProducto, setSelectedProducto] = useState<any>(null);
  const [productoToDelete, setProductoToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    // categoriaId removed
    precioBase: 0,
    precioVenta: 0,
    precioCompra: 0,
    stockVentas: 0,
    stockInsumos: 0,
    minCantidad: 0,
    marca: '',
    imagenProduc: '',
    activo: true,
    usoProducto: 'venta_e_insumo'
  });
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showProductoFormErrors, setShowProductoFormErrors] = useState(false);
  const [productoValidationAttempt, setProductoValidationAttempt] = useState(0);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showCategoryResults, setShowCategoryResults] = useState(false);

  const shakeClass = productoValidationAttempt > 0 ? 'animate-shake' : '';
  const esProductoSoloVenta = (producto: any): boolean => {
    const uso = (producto as any)?.usoProducto;
    if (uso === 'solo_venta') return true;
    if (uso === 'venta_e_insumo') return false;
    return isSaleOnly(producto as any);
  };
  const getUsoProductoActual = (producto: any): 'solo_venta' | 'venta_e_insumo' => {
    const uso = (producto as any)?.usoProducto;
    if (uso === 'solo_venta' || uso === 'venta_e_insumo') return uso;
    const stored = getStoredUsage(Number(producto.id));
    if (stored) return stored;
    return isSaleOnly(producto as any) ? 'solo_venta' : 'venta_e_insumo';
  };
  const normalizarProductosParaUI = (productosRaw: any[], categoriasBase: any[]) => {
    const categoriaById = new Map<string | number, any>();
    categoriasBase.forEach((c: any) => {
      if (c && (c.id !== undefined || c.Id !== undefined)) {
        const id = c.id ?? c.Id;
        categoriaById.set(id, c);
      }
    });
    return productosRaw.map((p: any) => {
      const usoProducto = getUsoProductoActual(p);
      const stockVentas = Number(p.stockVentas ?? 0);
      const stockInsumos = Number(p.stockInsumos ?? 0);
      const cat = p?.categoria;
      if (cat && !cat.nombre && cat.id) {
        const found = categoriaById.get(cat.id);
        if (found?.nombre) {
          return {
            ...p,
            categoria: { id: cat.id, nombre: found.nombre },
            usoProducto,
            stockVentas,
            stockInsumos
          };
        }
      }
      return {
        ...p,
        usoProducto,
        stockVentas,
        stockInsumos
      };
    });
  };

  const isNombreDuplicado = useMemo(() => {
    const nombreLower = String(nuevoProducto.nombre || '').trim().toLowerCase();
    if (!nombreLower) return false;
    return productos.some(
      (p) =>
        String(p.nombre || '').trim().toLowerCase() === nombreLower &&
        (!editingProducto || p.id !== editingProducto.id)
    );
  }, [nuevoProducto.nombre, productos, editingProducto]);

  const esSoloVentaProductoSeleccionado = useMemo(() => {
    if (!selectedProducto) return false;
    return esProductoSoloVenta(selectedProducto as any);
  }, [selectedProducto]);

  const esSoloVentaNuevoProducto = useMemo(() => {
    const uso = (nuevoProducto as any).usoProducto;
    if (uso === 'solo_venta') return true;
    if (uso === 'venta_e_insumo') return false;
    return isSaleOnly(nuevoProducto as any);
  }, [nuevoProducto]);
  const usoProductoValue =
    (nuevoProducto as any).usoProducto ?? (esSoloVentaNuevoProducto ? 'solo_venta' : 'venta_e_insumo');

  useEffect(() => {
    if (esSoloVentaNuevoProducto) {
      setNuevoProducto(prev => {
        const stockTotalActual = Number(prev.stockVentas || 0) + Number(prev.stockInsumos || 0);
        const stockVentasActual = Number(prev.stockVentas || 0);
        const stockInsumosActual = Number(prev.stockInsumos || 0);
        if (stockInsumosActual === 0 && stockVentasActual === stockTotalActual) {
          return prev;
        }
        return {
          ...prev,
          stockVentas: stockTotalActual,
          stockInsumos: 0
        };
      });
    }
  }, [esSoloVentaNuevoProducto, editingProducto, editingStockTotal]);

  // Load products and categories from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productosData, categoriasData] = await Promise.all([
          productoService.getProductos().catch(err => {
            console.error('❌ Error cargando productos:', err);
            return []; // Fallback a lista vacía
          }),
          productoService.getCategorias().catch(err => {
            console.error('❌ Error cargando categorías:', err);
            return []; // Fallback a lista vacía
          })
        ]);

        console.log('🔍 Datos cargados - Productos:', productosData.length, 'Categorías:', categoriasData.length);
        setProductos(normalizarProductosParaUI(productosData, categoriasData));
        setCategorias(categoriasData);
      } catch (err: any) {
        console.error('Error loading data:', err);
        error('Error de carga', 'No se pudieron cargar los productos y categorías desde el servidor.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredProductos = productos.filter(producto => {
    const term = searchTerm.trim().toLowerCase();
    const categoriaNombre = typeof producto.categoria === 'string'
      ? producto.categoria
      : producto.categoria?.nombre ?? '';
    const stockVentas = Number(producto.stockVentas ?? 0);
    const stockInsumos = Number(producto.stockInsumos ?? 0);
    const stockTotal = stockVentas + stockInsumos;
    const precioVenta = Number((producto as any).precioVenta ?? producto.precioBase ?? 0);
    const precioCompra = Number((producto as any).precioCompra ?? 0);
    const usoLabel = esProductoSoloVenta(producto as any) ? 'solo venta' : 'venta e insumo';
    const estadoLabel = producto.activo ? 'activo' : 'inactivo';
    const searchableFields = [
      String(producto.nombre ?? ''),
      String(precioVenta),
      String(precioCompra),
      String(stockTotal),
      String(stockInsumos),
      String(stockVentas),
      usoLabel,
      estadoLabel,
      String(categoriaNombre)
    ].map(v => v.toLowerCase());
    const matchesSearch = term === '' || searchableFields.some(value => value.includes(term));
    const matchesCategoria = filterCategoria === "all" || producto.categoria?.nombre === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProductos.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedProductos = filteredProductos.slice(startIndex, startIndex + itemsPerPage);



  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoriaChange = (value: string) => {
    if (value === "all") {
      setFilterCategoria("all");
    } else {
      setFilterCategoria(value);
    }
    setCurrentPage(1);
  };



  const getStockTotal = (producto: any) =>
    (producto.stockVentas ?? 0) + (producto.stockInsumos ?? 0);

  /*
  const productosCantidadBaja = productos.filter(
    (p) => getStockTotal(p) <= p.minCantidad
  );
  const accesorios = productos.filter((p) => (typeof p.categoria === 'string' ? p.categoria : p.categoria?.nombre) === "Accesorios");
  const productosActivos = productos.filter((p) => p.activo);
  */



  /*
  // Total de ventas potenciales (solo stock destinado a ventas)
  const totalVentasPotenciales = productos.reduce((acum, producto) => {
    const stockVentas = producto.stockVentas ?? 0;
    return acum + stockVentas * (producto.precioBase || 0);
  }, 0);
  */

  const handleCreateProducto = () => {
    if (!nuevoProducto.nombre || !nuevoProducto.categoria) {
      error("Campos obligatorios faltantes", "Por favor completa todos los campos obligatorios: nombre y categoría.");
      return;
    }
    const nombreLower = String(nuevoProducto.nombre || '').trim().toLowerCase();
    const existeNombre = productos.some(p => String(p.nombre || '').trim().toLowerCase() === nombreLower);
    if (existeNombre) {
      setShowProductoFormErrors(true);
      setProductoValidationAttempt(prev => prev + 1);
      error("Nombre duplicado", `El nombre "${nuevoProducto.nombre.trim()}" ya existe. Por favor elige otro nombre.`);
      return;
    }
    setShowProductoFormErrors(false);
    setProductoValidationAttempt(0);
    // Asegurar que precioBase y minCantidad estén en 0 si no se han establecido
    const productoConDefaults = {
      ...nuevoProducto,
      precioBase: nuevoProducto.precioBase || 0,
      minCantidad: nuevoProducto.minCantidad || 0,
      stockVentas: nuevoProducto.stockVentas || 0,
      stockInsumos: nuevoProducto.stockInsumos || 0
    };
    setNuevoProducto(productoConDefaults);
    setIsCreateDialogOpen(true);
  };

  const handleCreateProductoSubmit = () => {
    const isNombreValid = nuevoProducto.nombre.trim() !== '';
    const isCategoriaValid = nuevoProducto.categoria !== '';
    if (!isNombreValid || !isCategoriaValid) {
      setShowProductoFormErrors(true);
      setProductoValidationAttempt(prev => prev + 1);
      error("Campos obligatorios", "Por favor completa el nombre y la categoría correctamente.");
      return;
    }
    const nombreLower = String(nuevoProducto.nombre || '').trim().toLowerCase();
    const existeNombre = productos.some(p => String(p.nombre || '').trim().toLowerCase() === nombreLower);
    if (existeNombre) {
      setShowProductoFormErrors(true);
      setProductoValidationAttempt(prev => prev + 1);
      error("Nombre duplicado", `El nombre "${nuevoProducto.nombre.trim()}" ya existe. Por favor elige otro nombre.`);
      return;
    }
    setIsCreateDialogOpen(true);
  };

  const confirmCreateProducto = async () => {
    try {
      const nombreLower = String(nuevoProducto.nombre || '').trim().toLowerCase();
      const existeNombre = productos.some(p => String(p.nombre || '').trim().toLowerCase() === nombreLower);
      if (existeNombre) {
        error("Nombre duplicado", `El nombre "${nuevoProducto.nombre.trim()}" ya existe. Por favor elige otro nombre.`);
        setIsCreateDialogOpen(false);
        return;
      }
      const precioFinal = nuevoProducto.precioBase || 0;

      const stockVentas = nuevoProducto.stockVentas || 0;
      const stockInsumos = nuevoProducto.stockInsumos || 0;

      const selectedCat = categorias.find(c => c.nombre === nuevoProducto.categoria);

      const productoData = {
        nombre: nuevoProducto.nombre,
        descripcion: nuevoProducto.descripcion || '',
        categoria: nuevoProducto.categoria,
        categoriaId: selectedCat?.id,
        precioBase: precioFinal,
        stockVentas,
        stockInsumos,
        minCantidad: nuevoProducto.minCantidad || 0,
        marca: nuevoProducto.marca || '',
        imagenProduc: nuevoProducto.imagenProduc || '',
        activo: (nuevoProducto as any).activo ?? true
      };

      console.log('📤 Creando producto con datos:', {
        ...productoData,
        imagenProduc: productoData.imagenProduc ? `${productoData.imagenProduc.substring(0, 80)}...` : 'vacía'
      });
      console.log('📤 Estado completo de nuevoProducto antes de crear:', nuevoProducto);

      const productoCreado = await productoService.createProducto(productoData as any);
      if (productoCreado && productoCreado.id) {
        const usoInicial = (nuevoProducto as any).usoProducto === 'solo_venta' ? 'solo_venta' : 'venta_e_insumo';
        saveStoredUsage(Number(productoCreado.id), usoInicial);
      }

      if ((nuevoProducto as any).activo === false && productoCreado && productoCreado.id) {
        try {
          await productoService.toggleProductoActivo(Number(productoCreado.id));
        } catch {}
      }

      console.log('✅ Producto creado, respuesta completa:', productoCreado);
      console.log('✅ URL de imagen en producto creado:', productoCreado.imagenProduc);

      // Refresh products list
      const productosActualizadosRaw = await productoService.getProductos();
      console.log('📦 Productos actualizados después de crear:', productosActualizadosRaw);
      const productosActualizados = normalizarProductosParaUI(productosActualizadosRaw, categorias);
      const productoRecienCreado = productosActualizados.find(p => p.id === productoCreado.id || p.nombre === productoCreado.nombre);
      if (productoRecienCreado) {
        console.log('🔍 Producto recién creado encontrado en lista:', productoRecienCreado);
        console.log('🔍 URL de imagen del producto en lista:', productoRecienCreado.imagenProduc);
      }
      setProductos(productosActualizados);

      setNuevoProducto({
        nombre: '',
        descripcion: '',
        categoria: '',
        precioBase: 0,
        precioVenta: 0,
        precioCompra: 0,
        stockVentas: 0,
        stockInsumos: 0,
        minCantidad: 0,
        marca: '',
        imagenProduc: '',
        activo: true,
        usoProducto: 'venta_e_insumo'
      });
      setCategorySearchTerm('');
      setImagenPreview(null);
      setIsDialogOpen(false);
      setIsCreateDialogOpen(false);

      created("Producto creado ✔️", `El producto "${productoCreado.nombre}" ha sido agregado exitosamente al inventario.`);
    } catch (err: any) {
      console.error('Error creating product:', err);
      error('Error al crear producto', err.message || 'No se pudo crear el producto. Inténtalo nuevamente.');
    }
  };

  const handleEditProducto = (producto: any) => {
    setEditingProducto(producto);
    const categoriaVal = typeof producto.categoria === 'string' ? producto.categoria : producto.categoria?.nombre ?? '';
    const stockVentas = producto.stockVentas ?? producto.cantidad ?? 0;
    const stockInsumos = producto.stockInsumos ?? 0;
    const stockTotalBase = Number(stockVentas || 0) + Number(stockInsumos || 0);
    setEditingStockTotal(stockTotalBase);
    setNuevoProducto({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: categoriaVal,
      precioBase: producto.precioBase,
      precioVenta: (producto as any).precioVenta ?? producto.precioBase ?? producto.precio ?? 0,
      precioCompra: (producto as any).precioCompra ?? producto.precioBase ?? producto.precio ?? 0,
      stockVentas,
      stockInsumos,
      minCantidad: producto.minCantidad,
      marca: producto.marca,
      imagenProduc: producto.imagenProduc,
      activo: producto.activo,
      usoProducto: getUsoProductoActual(producto)
    });
    setCategorySearchTerm(categoriaVal || '');
    setImagenPreview(producto.imagenProduc || null);
    setImageError(null);
    setIsDialogOpen(true);
  };

  const handleUpdateProducto = () => {
    const isNombreValid = nuevoProducto.nombre.trim() !== '';
    const isCategoriaValid = nuevoProducto.categoria !== '';
    const ventaOk = String((nuevoProducto as any).precioVenta) !== '' && Number((nuevoProducto as any).precioVenta) >= 0;
    const compraOk = String((nuevoProducto as any).precioCompra) !== '' && Number((nuevoProducto as any).precioCompra) >= 0;

    if (!isNombreValid || !isCategoriaValid || !ventaOk || !compraOk) {
      setShowProductoFormErrors(true);
      setProductoValidationAttempt(prev => prev + 1);
      error("Campos obligatorios", "Por favor completa el nombre, la categoría y los precios correctamente.");
      return;
    }
    const nombreLower = String(nuevoProducto.nombre || '').trim().toLowerCase();
    const existeNombre = productos.some(p => p.id !== (editingProducto?.id) && String(p.nombre || '').trim().toLowerCase() === nombreLower);
    if (existeNombre) {
      setShowProductoFormErrors(true);
      setProductoValidationAttempt(prev => prev + 1);
      error("Nombre duplicado", `El nombre "${nuevoProducto.nombre.trim()}" ya existe. Por favor elige otro nombre.`);
      return;
    }
    setIsEditDialogOpen(true);
  };

  const confirmUpdateProducto = async () => {
    if (!editingProducto) return;

    try {
      const nombreLower = String(nuevoProducto.nombre || '').trim().toLowerCase();
      const existeNombre = productos.some(p => p.id !== (editingProducto?.id) && String(p.nombre || '').trim().toLowerCase() === nombreLower);
      if (existeNombre) {
        error("Nombre duplicado", `El nombre "${nuevoProducto.nombre.trim()}" ya existe. Por favor elige otro nombre.`);
        setIsEditDialogOpen(false);
        return;
      }
      const precioVentaFinal = Number((nuevoProducto as any).precioVenta) || 0;
      const precioCompraFinal = Number((nuevoProducto as any).precioCompra) || 0;
      const usoProductoFinal = (nuevoProducto as any).usoProducto === 'solo_venta' ? 'solo_venta' : 'venta_e_insumo';
      const productoId = Number(editingProducto.id);
      const stockVentasBase = Number(nuevoProducto.stockVentas) || 0;
      const stockInsumosBase = Number(nuevoProducto.stockInsumos) || 0;
      const stockVentasFinal = usoProductoFinal === 'solo_venta'
        ? (editingStockTotal !== null ? Number(editingStockTotal) : (stockVentasBase + stockInsumosBase))
        : stockVentasBase;
      const stockInsumosFinal = usoProductoFinal === 'solo_venta' ? 0 : stockInsumosBase;

      const selectedCat = categorias.find(c => c.nombre === nuevoProducto.categoria);

      const productoData = {
        nombre: nuevoProducto.nombre,
        descripcion: nuevoProducto.descripcion,
        categoria: nuevoProducto.categoria,
        categoriaId: selectedCat?.id,
        precioVenta: precioVentaFinal,
        precioCompra: precioCompraFinal,
        stockVentas: stockVentasFinal,
        stockInsumos: stockInsumosFinal,
        minCantidad: nuevoProducto.minCantidad,
        marca: nuevoProducto.marca,
        imagenProduc: nuevoProducto.imagenProduc,
        activo: nuevoProducto.activo,
        usoProducto: usoProductoFinal,
        consolidarStockEnVentas: usoProductoFinal === 'solo_venta'
      };

      const productoActualizado = await productoService.updateProducto(productoId, productoData as any);
      if (usoProductoFinal === 'solo_venta') {
        saveStoredUsage(productoId, 'solo_venta');
      } else {
        removeStoredUsage(productoId);
      }

      const productosActualizadosRaw = await productoService.getProductos();
      const productosActualizados = normalizarProductosParaUI(productosActualizadosRaw, categorias);
      setProductos(productosActualizados);

      setEditingProducto(null);
      setEditingStockTotal(null);
      setNuevoProducto({
        nombre: '',
        descripcion: '',
        categoria: '',
        precioBase: 0,
        precioVenta: 0,
        precioCompra: 0,
        stockVentas: 0,
        stockInsumos: 0,
        minCantidad: 0,
        marca: '',
        imagenProduc: '',
        activo: true,
        usoProducto: 'venta_e_insumo'
      });
      setCategorySearchTerm('');
      setImagenPreview(null);
      setIsDialogOpen(false);
      setIsEditDialogOpen(false);

      edited("Producto editado ✔️", `El producto "${productoActualizado.nombre}" ha sido actualizado. Venta: ${formatCurrency(precioVentaFinal)} · Compra: ${formatCurrency(precioCompraFinal)}.`);
    } catch (err: any) {
      console.error('Error updating product:', err);
      error('Error al actualizar producto', err.message || 'No se pudo actualizar el producto. Inténtalo nuevamente.');
    }
  };

  const handleDeleteProducto = (productoId: number) => {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    setProductoToDelete(producto);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProducto = async () => {
    if (!productoToDelete) return;

    try {
      await productoService.deleteProducto(productoToDelete.id);
      removeStoredUsage(Number(productoToDelete.id));
      const productosActualizados = await productoService.getProductos();
      setProductos(normalizarProductosParaUI(productosActualizados, categorias));

      setIsDeleteDialogOpen(false);
      const stillExists = productosActualizados.find(p => p.id === productoToDelete.id);
      if (stillExists) {
        const desactivado = stillExists.activo === false;
        setProductoToDelete(null);
        error(
          'No se puede eliminar',
          desactivado
            ? `El producto "${productoToDelete.nombre}" tiene conexiones (compras/ventas/entregas/devoluciones). Se desactivó en lugar de eliminarlo.`
            : `El producto "${productoToDelete.nombre}" no pudo eliminarse porque tiene conexiones.`
        );
      } else {
        setProductoToDelete(null);
        deleted("Producto eliminado ✔️", `El producto "${productoToDelete.nombre}" ha sido eliminado exitosamente del inventario.`);
      }
    } catch (err: any) {
      console.error('Error deleting product:', err);
      const rawMsg = String(err?.message || '').toLowerCase();
      const isFkConflict =
        rawMsg.includes('foreign') ||
        rawMsg.includes('constraint') ||
        rawMsg.includes('referenc') ||
        rawMsg.includes('conflict') ||
        rawMsg.includes('no se puede eliminar') ||
        rawMsg.includes('asociado') ||
        rawMsg.includes('ya existe relación') ||
        rawMsg.includes('en uso');

      if (isFkConflict) {
        try {
          if (productoToDelete.activo) {
            await productoService.toggleProductoActivo(productoToDelete.id);
            const productosActualizados = await productoService.getProductos();
            setProductos(normalizarProductosParaUI(productosActualizados, categorias));
            setIsDeleteDialogOpen(false);
            setProductoToDelete(null);
            error(
              'No se puede eliminar',
              `El producto "${productoToDelete.nombre}" tiene conexiones (ventas/compras/entregas/devoluciones). Se desactivó en lugar de eliminarlo.`
            );
          } else {
            setIsDeleteDialogOpen(false);
            setProductoToDelete(null);
            error(
              'No se puede eliminar',
              `El producto "${productoToDelete.nombre}" tiene conexiones y ya estaba desactivado.`
            );
          }
        } catch (e: any) {
          console.error('Error al desactivar producto tras fallo de eliminación:', e);
          error('Error al desactivar producto', e.message || 'No se pudo desactivar el producto. Inténtalo nuevamente.');
        }
      } else {
        error('Error al eliminar producto', err.message || 'No se pudo eliminar el producto. Inténtalo nuevamente.');
      }
    }
  };

  const toggleProductoActivo = async (productoId: number) => {
    // Determinar el nuevo estado a partir del estado local actual
    const productoActual = productos.find(p => p.id === productoId);
    if (!productoActual) return;
    const nuevoEstado = !productoActual.activo;

    // Actualización optimista local — no dependemos de getProductos() que devuelve 500
    setProductos(prev =>
      prev.map(p => p.id === productoId ? { ...p, activo: nuevoEstado } : p)
    );

    try {
      await productoService.toggleProductoActivo(productoId);
      const accion = nuevoEstado ? 'activado' : 'desactivado';
      edited(`Producto ${accion} ✔️`, `El producto "${productoActual.nombre}" ha sido ${accion} exitosamente.`);
    } catch (err: any) {
      // Revertir el cambio optimista si la API falla
      setProductos(prev =>
        prev.map(p => p.id === productoId ? { ...p, activo: !nuevoEstado } : p)
      );
      console.error('Error toggling product active status:', err);
      error('Error al cambiar estado', err.message || 'No se pudo cambiar el estado del producto. Inténtalo nuevamente.');
    }
  };

  const getCantidadStatus = (cantidad: number, minCantidad: number) => {
    // Todos los estados de inventario ahora usan el mismo estilo gris uniforme
    if (cantidad === 0) return { color: "text-gray-lighter", bg: "bg-gray-medium", text: "Sin Cantidad" };
    if (cantidad <= minCantidad) return { color: "text-gray-lighter", bg: "bg-gray-medium", text: "Cantidad Baja" };
    return { color: "text-gray-lighter", bg: "bg-gray-medium", text: "En Inventario" };
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Response del endpoint de upload de imágenes


  // Función para subir imágenes al servidor usando el endpoint /api/upload
  // Este endpoint recibe un archivo (IFormFile) y lo guarda en wwwroot/assets/images/
  // Validaciones: Solo imágenes (jpg, jpeg, png, gif, webp) con nombre único GUID
  const uploadImage = async (file: File): Promise<string> => {
    return await apiService.uploadImage(file);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError(null);

    // Validaciones de imagen
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSizeInMB = 5;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      const msg = 'El formato no es válido. Solo se permiten imágenes JPG, JPEG, PNG, GIF o WEBP.';
      setImageError(msg);
      // Solo mostramos la alerta interna en el formulario, quitamos el toast redundante
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > maxSizeInBytes) {
      const msg = `La imagen supera el límite de ${maxSizeInMB} MB.`;
      setImageError(msg);
      // Solo mostramos la alerta interna en el formulario, quitamos el toast redundante
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setUploadingImage(true);

      // Mostrar preview local mientras se sube (solo para preview visual)
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagenPreview(result); // Solo para preview visual temporal
      };
      reader.readAsDataURL(file);

      // Subir al servidor y obtener la URL real
      const imageUrl = await uploadImage(file);
      console.log('✅ Imagen subida exitosamente, URL recibida:', imageUrl);

      // Actualizar el estado con la URL del servidor usando el patrón funcional para evitar problemas de closure
      setNuevoProducto(prev => {
        const updated = { ...prev, imagenProduc: imageUrl };
        console.log('📝 Estado actualizado con imagen:', updated.imagenProduc);
        return updated;
      });

      // Actualizar preview con la URL del servidor (no base64)
      setImagenPreview(imageUrl);
    } catch (err: any) {
      console.error('❌ Error uploading image:', err);
      error('Error al subir imagen', 'No se pudo subir la imagen al servidor. Intenta nuevamente.');
      // Limpiar preview y estado si falló
      setImagenPreview(null);
      setNuevoProducto(prev => ({ ...prev, imagenProduc: '' }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    const doClear = () => {
      setNuevoProducto(prev => ({ ...prev, imagenProduc: '' }));
      setImagenPreview(null);
      setImageError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    try {
      if (isEditDialogOpen && editingProducto?.id) {
        apiService.deleteProductoImagen(editingProducto.id).catch(() => {});
      }
    } finally {
      doClear();
    }
  };


  const formatearPrecio = (precio: number): string => {
    return `$ ${precio.toLocaleString('es-CO')} `;
  };

  const getCategoriaColor = (categoria: string) => {
    // Todas las categorías ahora usan el mismo estilo gris uniforme
    return "bg-gray-medium text-gray-lighter";
  };

  return (
    <>
      <main className="flex-1 overflow-auto p-8 bg-black-primary">
          {/* Sección Principal */}
          <div className="elegante-card">
            <TableHeaderSection
              leftContent={(
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      className="elegante-button-primary gap-2 flex items-center"
                      onClick={() => {
                        setEditingProducto(null);
                        setNuevoProducto({
                          nombre: '',
                          descripcion: '',
                          categoria: '',
                          precioBase: 0, // Se inicializa automáticamente en 0
                          precioVenta: 0,
                          precioCompra: 0,
                          stockVentas: 0,
                          stockInsumos: 0,
                          minCantidad: 0, // Se inicializa automáticamente en 0
                          marca: '',
                          imagenProduc: '',
                          activo: true,
                          usoProducto: 'venta_e_insumo'
                        });
                        setImagenPreview(null);
                        setImageError(null);
                        setShowProductoFormErrors(false);
                        setProductoValidationAttempt(0);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Producto
                    </button>
                  </DialogTrigger>
                  <DialogContent
                    className="bg-gray-darkest border-gray-dark max-w-2xl max-h-[90vh] overflow-y-auto"
                    onInteractOutside={(e: any) => {
                      const target = e.target as HTMLElement | null;
                      if (target?.closest('[data-alert-container="true"]')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle className="text-white-primary flex items-center gap-2">
                        <Package className="w-5 h-5 text-orange-primary" />
                        {editingProducto ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                      </DialogTitle>
                      <DialogDescription className="text-gray-lightest">
                        {editingProducto ? 'Modifica la información del producto' : 'Completa los datos del nuevo producto o accesorio'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-white-primary text-xs flex items-center gap-1.5 py-2">
                              <Tags className="w-3.5 h-3.5 text-orange-primary" />
                              Nombre *
                            </Label>
                            <Input
                              value={nuevoProducto.nombre}
                              onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                              placeholder="Ej: Cadena de Rodio"
                              className={`elegante-input h-9 text-sm ${isNombreDuplicado ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                            />
                            {showProductoFormErrors && !nuevoProducto.nombre.trim() && (
                              <p className="text-[10px] text-red-400 mt-1">El nombre es obligatorio</p>
                            )}
                            {isNombreDuplicado && (
                              <p className="text-[10px] text-red-400 mt-1">Nombre ya existe en el sistema.</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white-primary text-xs flex items-center gap-1.5">
                              <Tags className="w-3.5 h-3.5 text-orange-primary" />
                              Categoría *
                            </Label>
                            <div className="relative">
                              <Input
                                placeholder="Escribe para buscar categoría..."
                                value={categorySearchTerm}
                                onChange={(e) => {
                                  setCategorySearchTerm(e.target.value);
                                  setShowCategoryResults(true);
                                }}
                                onFocus={() => setShowCategoryResults(true)}
                                onBlur={() => {
                                  setTimeout(() => setShowCategoryResults(false), 120);
                                }}
                                className={`elegante-input h-9 text-sm ${showProductoFormErrors && !nuevoProducto.categoria ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                              />
                              {categorySearchTerm && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCategorySearchTerm('');
                                    setShowCategoryResults(false);
                                    setNuevoProducto({ ...nuevoProducto, categoria: '' });
                                  }}
                                  title="Limpiar búsqueda"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              {showCategoryResults && categorySearchTerm.trim() !== '' && (
                                <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                                  {(() => {
                                    const q = categorySearchTerm.trim().toLowerCase();
                                    const list = categorias
                                      .filter(c => c.estado === true)
                                      .filter(c => String(c.nombre || '').toLowerCase().includes(q))
                                      .slice(0, 20);
                                    if (list.length === 0) {
                                      return (
                                        <div className="p-3 text-center text-gray-lightest italic">
                                          Sin resultados.
                                        </div>
                                      );
                                    }
                                    return list.map((c: any) => (
                                      <div
                                        key={c.id}
                                        onClick={() => {
                                          setNuevoProducto({ ...nuevoProducto, categoria: c.nombre });
                                          setCategorySearchTerm(c.nombre);
                                          setShowCategoryResults(false);
                                        }}
                                        className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-white-primary text-sm">{c.nombre}</span>
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              )}
                            </div>
                            {showProductoFormErrors && !nuevoProducto.categoria && (
                              <p className="text-[10px] text-red-400 mt-1">Selecciona una categoría</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white-primary text-xs flex items-center gap-1.5">
                              <Tags className="w-3.5 h-3.5 text-orange-primary" />
                              Marca
                            </Label>
                            <Input
                              value={nuevoProducto.marca}
                              onChange={(e) => setNuevoProducto({ ...nuevoProducto, marca: e.target.value })}
                              placeholder="Nombre de la marca"
                              className="elegante-input h-9 text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 h-9">
                            <Label className="text-white-primary text-xs flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-orange-primary" />
                              Imagen del Producto
                            </Label>
                            <button
                              onClick={triggerFileSelect}
                              disabled={uploadingImage}
                              className="elegante-button-secondary  px-4 py-2 gap-2 flex items-center text-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                              type="button"
                            >
                              {uploadingImage ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...</>
                              ) : (
                                <><Camera className="w-4 h-4" /> {imagenPreview ? 'Cambiar' : 'Subir Imagen'}</>
                              )}
                            </button>
                          </div>
                          <div className={`w-full rounded-lg border-2 border-dashed border-gray-dark bg-gray-darker flex items-center justify-center overflow-hidden relative ${imagenPreview ? 'h-52' : 'h-[14rem]'}`}>
                            {uploadingImage ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-10 h-10 text-orange-primary animate-spin" />
                                <span className="text-xs text-gray-lighter">Subiendo...</span>
                              </div>
                            ) : (
                              <div className="relative w-full h-full group">
                                <ImageRenderer
                                  url={imagenPreview ?? undefined}
                                  alt="Vista previa"
                                  className="w-full h-full border-0 bg-transparent"
                                  fallbackVariant="product"
                                  showLabel={false}
                                />
                                {imagenPreview && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                      onClick={removeImage}
                                      className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors shadow-lg"
                                      type="button"
                                      title="Eliminar imagen"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-lightest px-1 flex items-center gap-1.5 opacity-80">
                            <Info className="w-3 h-3 text-orange-primary" />
                            Tamaño máx: 5MB. Formatos: JPG, PNG, GIF, WEBP.
                          </p>
                          {imageError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-red-400 font-medium">
                                {imageError}
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-orange-primary" />
                          Descripción
                        </Label>
                        <Textarea
                          value={nuevoProducto.descripcion}
                          onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                          placeholder="Detalles del producto, características, instrucciones de uso..."
                          className="elegante-input w-full min-h-[120px] resize-none text-sm"
                        />
                      </div>

                      {editingProducto && (
                        <div className="space-y-4 border-t border-gray-dark pt-4">
                          <Label className="text-white-primary text-xs flex items-center gap-1.5 uppercase tracking-wide opacity-80">
                            <Info className="w-3.5 h-3.5 text-orange-primary" />
                            Información de venta
                          </Label>
                          <div className="space-y-1.5">
                            <Label className="text-white-primary text-xs flex items-center gap-1.5 opacity-70 font-medium">
                              <Package className="w-3.5 h-3.5 text-orange-primary" />
                              Stock Total
                            </Label>
                            <Input
                              value={editingStockTotal ?? 0}
                              disabled
                              readOnly
                              className="elegante-input bg-gray-dark/50 h-9 text-sm border-gray-dark/30 opacity-70 cursor-not-allowed"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-white-primary text-xs flex items-center gap-1.5">
                                <Boxes className="w-3.5 h-3.5 text-orange-primary" />
                                Stock Ventas
                              </Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                min={0}
                                value={(nuevoProducto.stockVentas as number | string) === '' ? '' : (nuevoProducto.stockVentas ?? '')}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === '') {
                                    setNuevoProducto(prev => ({ ...prev, stockVentas: '' as any }));
                                    return;
                                  }
                                  const n = Number(v);
                                  if (Number.isNaN(n) || n < 0) return;

                                  if (editingStockTotal !== null) {
                                  if (esSoloVentaNuevoProducto) {
                                    setNuevoProducto(prev => ({
                                      ...prev,
                                      stockVentas: editingStockTotal,
                                      stockInsumos: 0
                                    }));
                                    return;
                                  }
                                    if (n > editingStockTotal) {
                                      error("Stock ventas inválido", "El stock destinado a ventas no puede superar el stock total del producto.");
                                      setNuevoProducto(prev => ({
                                        ...prev,
                                        stockVentas: editingStockTotal - Number(prev.stockInsumos || 0) >= 0
                                          ? editingStockTotal - Number(prev.stockInsumos || 0)
                                          : prev.stockVentas
                                      }));
                                      return;
                                    }
                                    const nuevoInsumos = editingStockTotal - n;
                                    setNuevoProducto(prev => ({
                                      ...prev,
                                      stockVentas: n,
                                      stockInsumos: nuevoInsumos
                                    }));
                                  }
                                }}
                                className="elegante-input h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-white-primary text-xs flex items-center gap-1.5">
                                <Boxes className="w-3.5 h-3.5 text-orange-primary" />
                                Stock Insumos
                              </Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                min={0}
                                value={(nuevoProducto.stockInsumos as number | string) === '' ? '' : (nuevoProducto.stockInsumos ?? '')}
                                disabled={esSoloVentaNuevoProducto}
                                onChange={(e) => {
                                  if (esSoloVentaNuevoProducto) return;
                                  const v = e.target.value;
                                  if (v === '') {
                                    setNuevoProducto(prev => ({ ...prev, stockInsumos: '' as any }));
                                    return;
                                  }
                                  const n = Number(v);
                                  if (Number.isNaN(n) || n < 0) return;

                                  if (editingStockTotal !== null) {
                                    if (n > editingStockTotal) {
                                      error("Stock insumos inválido", "El stock destinado a insumos no puede superar el stock total del producto.");
                                      setNuevoProducto(prev => ({
                                        ...prev,
                                        stockInsumos: editingStockTotal - Number(prev.stockVentas || 0) >= 0
                                          ? editingStockTotal - Number(prev.stockVentas || 0)
                                          : prev.stockInsumos
                                      }));
                                      return;
                                    }
                                    const nuevoVentas = editingStockTotal - n;
                                    setNuevoProducto(prev => ({
                                      ...prev,
                                      stockInsumos: n,
                                      stockVentas: nuevoVentas
                                    }));
                                  }
                                }}
                                className={`elegante-input h-9 text-sm ${esSoloVentaNuevoProducto ? 'opacity-60 cursor-not-allowed' : ''}`}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-white-primary text-xs flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-orange-primary" />
                                Precio compra *
                              </Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                min={0}
                                step={0.01}
                                value={(nuevoProducto as any).precioCompra === '' ? '' : (nuevoProducto.precioCompra ?? '')}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setNuevoProducto({
                                    ...nuevoProducto,
                                    precioCompra: v === '' ? ('' as any) : (isNaN(Number(v)) ? (nuevoProducto as any).precioCompra : Number(v))
                                  });
                                }}
                                className="elegante-input h-9 text-sm"
                              />
                              {showProductoFormErrors && (String(nuevoProducto.precioCompra) === '' || Number(nuevoProducto.precioCompra) < 0) && (
                                <p className="text-[10px] text-red-400 mt-1">Precio compra inválido</p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-white-primary text-xs flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-orange-primary" />
                                Precio venta *
                              </Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                min={0}
                                step={0.01}
                                value={(nuevoProducto as any).precioVenta === '' ? '' : (nuevoProducto.precioVenta ?? '')}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setNuevoProducto({
                                    ...nuevoProducto,
                                    precioVenta: v === '' ? ('' as any) : (isNaN(Number(v)) ? (nuevoProducto as any).precioVenta : Number(v))
                                  });
                                }}
                                className="elegante-input h-9 text-sm"
                              />
                              {showProductoFormErrors && (String(nuevoProducto.precioVenta) === '' || Number(nuevoProducto.precioVenta) < 0) && (
                                <p className="text-[10px] text-red-400 mt-1">Precio venta inválido</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 border-t border-gray-dark pt-4 mt-4">
                        <div className="space-y-1.5">
                          <Label className="text-white-primary text-xs flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-orange-primary" />
                            Uso del producto
                          </Label>
                          <Select
                            value={usoProductoValue}
                            onValueChange={(value) => {
                              setNuevoProducto(prev => ({
                                ...prev,
                                usoProducto: value,
                                stockVentas: value === 'solo_venta'
                                  ? Number(prev.stockVentas || 0) + Number(prev.stockInsumos || 0)
                                  : prev.stockVentas,
                                stockInsumos: value === 'solo_venta' ? 0 : prev.stockInsumos
                              }));
                            }}
                          >
                            <SelectTrigger className="elegante-input h-9 text-sm">
                              <SelectValue placeholder="Selecciona el uso" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-darkest border-gray-dark text-gray-lightest">
                              <SelectItem value="solo_venta" className="text-white-primary">Solo venta</SelectItem>
                              <SelectItem value="venta_e_insumo" className="text-white-primary">Venta e insumo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white-primary text-xs flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-orange-primary" />
                            Estado
                          </Label>
                          <div className="flex items-center space-x-3 h-9">
                            <Switch
                              checked={!!(nuevoProducto as any).activo}
                              onCheckedChange={(checked) =>
                                setNuevoProducto({ ...nuevoProducto, activo: !!checked })
                              }
                              className="data-[state=checked]:bg-orange-primary"
                            />
                            <span className={`text-sm font-medium ${nuevoProducto.activo ? 'text-orange-primary' : 'text-gray-lightest'}`}>
                              {nuevoProducto.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                      </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
                      <button onClick={() => setIsDialogOpen(false)} className="elegante-button-secondary px-6">
                        Cancelar
                      </button>
                      <button
                        onClick={editingProducto ? handleUpdateProducto : handleCreateProductoSubmit}
                        className="elegante-button-primary px-8"
                      >
                        {editingProducto ? 'Actualizar' : 'Agregar'} Producto
                      </button>
                    </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              searchValue={searchTerm}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Buscar productos y accesorios..."
              extraFilters={(
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-gray-lightest" />
                  <Select
                    value={filterCategoria}
                    onValueChange={(value) => handleCategoriaChange(value)}
                  >
                    <SelectTrigger className="w-48 elegante-input">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-darkest border-gray-dark">
                      <SelectItem value="all" className="text-white-primary">Todas las categorías</SelectItem>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.nombre} className="text-white-primary">
                          {categoria.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              recordsText={`Mostrando ${displayedProductos.length} de ${filteredProductos.length} productos`}
              recordsPlacement="left"
            />

            {/* Tabla de Productos */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={loading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                  <tr className="border-b border-gray-dark">
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Imagen</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Nombre</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Precio venta</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Precio compra</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Stock total</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Stock Ventas</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Stock Insumos</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm min-w-[8.5rem]">Uso</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>


                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingStateRow
                      colSpan={10}
                      title="Cargando productos..."
                    />
                  ) : displayedProductos.length === 0 ? (
                    <TableEmptyStateRow
                      colSpan={10}
                      title="No se encontraron productos"
                      description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                      onReload={() => window.location.reload()}
                    />
                  ) : displayedProductos.map((producto) => {
                    const stockTotal = getStockTotal(producto);
                    const stockVentas = producto.stockVentas ?? 0;
                    const stockInsumos = producto.stockInsumos ?? 0;
                    const totalVentasProducto = stockVentas * (producto.precioBase || 0);
                    const soloVenta = esProductoSoloVenta(producto as any);
                    return (
                      <tr key={producto.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                        <td className="py-4 px-8  ">
                          <ImageRenderer
                            url={producto.imagenProduc}
                            alt={producto.nombre}
                            className="w-10 h-10 object-cover rounded-lg"
                            fallbackVariant="product"
                            showLabel={false}
                          />
                        </td>

                        <td className="py-4 text-center px-4">
                          <span className="text-gray-lighter">{producto.nombre}</span>
                        </td>
                        
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-lighter">{formatearPrecio((producto as any).precioVenta ?? producto.precioBase ?? 0)}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-lighter">{formatearPrecio((producto as any).precioCompra ?? 0)}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-lighter">{stockTotal}</span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-lighter">{stockVentas}</span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-lighter" >
                            {soloVenta ? 0 : stockInsumos}
                          </span>
                        </td>
                        
                        
                        <td className="py-4 px-4 text-center min-w-[8.5rem] overflow-visible">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs border whitespace-nowrap ${soloVenta
                            ? 'bg-gray-500/10 text-gray-300 border-gray-600/50'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {soloVenta ? 'Solo venta' : 'Venta e insumo'}
                          </span>
                        </td>


                        <td className="py-4 px-4 text-center ">
                          <span className={`px-2  py-1 rounded-full text-xs ${producto.activo
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            } `}>
                            {producto.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleProductoActivo(producto.id)}
                              className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              title={producto.activo ? "Desactivar producto" : "Activar producto"}
                            >
                            {producto.activo ? (
                              <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400 transition-colors" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400 transition-colors" />
                            )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProducto(producto);
                                setIsDetailDialogOpen(true);
                              }}
                              className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                            </button>
                            <button
                              onClick={() => handleEditProducto(producto)}
                              className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteProducto(producto.id)}
                              className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {/* Paginación */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-dark">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-lightest">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-lightest">Filas por página:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-8 bg-gray-darker border-gray-dark text-gray-lightest">
                      <SelectValue placeholder={itemsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-darkest border-gray-dark text-gray-lightest">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-dark hover:bg-gray-darker disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-lightest" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded text-sm transition-colors ${currentPage === pageNum
                          ? 'bg-orange-primary text-black-primary font-medium'
                          : 'border border-gray-dark hover:bg-gray-darker text-gray-lightest'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-dark hover:bg-gray-darker disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-lightest" />
                </button>
              </div>
            </div>
          </div>

          {/* Dialog de confirmación para crear */}
          <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <AlertDialogContent className="bg-gray-darkest border-gray-dark">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white-primary">Confirmar Creación</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-lightest">
                  ¿Estás seguro de que deseas agregar este producto al inventario?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-darker border-gray-dark text-white-primary hover:bg-gray-dark">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmCreateProducto}
                  className="elegante-button-primary"
                >
                  Agregar Producto
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog de confirmación para editar */}
          <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <AlertDialogContent className="bg-gray-darkest border-gray-dark">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white-primary">Confirmar Actualización</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-lightest">
                  ¿Estás seguro de que deseas actualizar este producto?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-darker border-gray-dark text-white-primary hover:bg-gray-dark">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmUpdateProducto}
                  className="elegante-button-primary"
                >
                  Actualizar Producto
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog de confirmación para eliminar */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent className="bg-gray-darkest border-gray-dark">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white-primary">Confirmar Eliminación</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-lightest">
                  ¿Estás seguro de que deseas eliminar "{productoToDelete?.nombre}"? Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-darker border-gray-dark text-white-primary hover:bg-gray-dark">
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteProducto}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Eliminar Producto
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog de detalles del producto - Replica de crear/editar con campos extra */}
          <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
            <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white-primary flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-primary" />
                  Detalles del Producto
                </DialogTitle>
                <DialogDescription className="text-gray-lightest">
                  Información completa del producto seleccionado
                </DialogDescription>
              </DialogHeader>

              {selectedProducto && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          <Tags className="w-3.5 h-3.5 text-orange-primary" />
                          Nombre
                        </Label>
                        <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                          {selectedProducto.nombre}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          <Tags className="w-3.5 h-3.5 text-orange-primary" />
                          Categoría
                        </Label>
                        <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                          {typeof selectedProducto.categoria === 'string'
                            ? selectedProducto.categoria
                            : (selectedProducto.categoria as any)?.nombre ?? 'Sin categoría'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          <Tags className="w-3.5 h-3.5 text-orange-primary" />
                          Marca
                        </Label>
                        <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                          {selectedProducto.marca || 'Sin marca'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary text-xs flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-orange-primary" />
                        Imagen del Producto
                      </Label>
                      <div className="w-full min-h-[200px] rounded-lg border-2 border-gray-dark bg-gray-darker flex items-center justify-center overflow-hidden">
                        <ImageRenderer
                            url={selectedProducto.imagenProduc}
                            alt={selectedProducto.nombre}
                            className="w-full h-full min-h-[200px] border-0 bg-transparent"
                            fallbackVariant="product"
                            showLabel={false}
                          />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-white-primary text-xs flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-orange-primary" />
                      Descripción
                    </Label>
                    <div className="elegante-input w-full min-h-[120px] text-sm p-3 rounded-md border border-gray-dark bg-gray-darker overflow-y-auto">
                      {selectedProducto.descripcion || 'Sin descripción'}
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-gray-dark pt-4">
                    <Label className="text-white-primary text-xs flex items-center gap-1.5 uppercase tracking-wide opacity-80">
                      <Info className="w-3.5 h-3.5 text-orange-primary" />
                      Información de venta
                    </Label>
                    <div className="space-y-1.5">
                      <Label className="text-white-primary text-xs flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-orange-primary" />
                        Stock Total
                      </Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-orange-primary/20 font-bold text-orange-primary">
                        {(selectedProducto.stockVentas ?? 0) + (selectedProducto.stockInsumos ?? 0)} unidades
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-orange-primary" />
                          Stock Ventas
                        </Label>
                        <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark border-green-500/10">
                          {(selectedProducto.stockVentas ?? 0)} unidades
                        </div>
                      </div>
                      {!esSoloVentaProductoSeleccionado && (
                        <div className="space-y-1.5">
                          <Label className="text-white-primary text-xs flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-orange-primary" />
                            Stock Insumos
                          </Label>
                          <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark border-blue-500/10">
                            {(selectedProducto.stockInsumos ?? 0)} unidades
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-orange-primary" />
                          Precio compra
                        </Label>
                        <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                          {formatearPrecio((selectedProducto as any).precioCompra ?? 0)}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-orange-primary" />
                          Precio venta
                        </Label>
                        <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                          {formatearPrecio((selectedProducto as any).precioVenta ?? selectedProducto.precioBase ?? 0)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-orange-primary" />
                          Uso del producto
                        </Label>
                        <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                          {esProductoSoloVenta(selectedProducto as any) ? 'Solo venta' : 'Venta e insumo'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white-primary text-xs flex items-center gap-1.5">
                          Estado
                        </Label>
                        <div className={`elegante-input h-9 text-sm flex items-center px-3 border ${
                          selectedProducto.activo
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {selectedProducto.activo ? 'Activo' : 'Inactivo'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
                <button
                  onClick={() => setIsDetailDialogOpen(false)}
                  className="elegante-button-secondary px-6"
                >
                  Cerrar
                </button>
              </div>
            </DialogContent>
          </Dialog>

          <AlertContainer />
      </main>
    </>
  );
}
