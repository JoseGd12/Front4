import React, { useState, useEffect, useMemo } from "react";
import { Input } from "../../../shared/components/ui/input";
import { DatePicker } from "../../../shared/components/ui/DatePicker";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import {
  Plus,
  Search,
  Eye,
  User,
  Calendar,
  CreditCard,
  Receipt,
  Hash,
  Building,
  FileText,
  Ban,
  Calculator,
  FileDown,
  MoreVertical
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { compraService, Compra } from "../services/compraService";
import { productoService } from "../../productos/services/productos";
import { apiService, ApiUser } from "../../../shared/services/api";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import jsPDF from "jspdf";
import manitoLogo from "../../../assets/Manito.jpeg";

// Función para formatear moneda colombiana con puntos para separar miles
const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return amount.toLocaleString('es-CO');
};

const normalizeSearchText = (value: unknown): string => {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const sortComprasByRecency = <T extends { id?: number; fecha?: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const timeA = a?.fecha ? new Date(a.fecha).getTime() : 0;
    const timeB = b?.fecha ? new Date(b.fecha).getTime() : 0;
    if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
      return timeB - timeA;
    }
    return Number(b?.id || 0) - Number(a?.id || 0);
  });
};

import { useAuth } from "../../../shared/contexts/AuthContext";

// Lazy load components incorrectly was causing a crash. 
// Standardizing imports at the top and only using lazy if strictly necessary.
// For now, using the static imports already present for stability.

// Memoized row component defined outside to avoid recreation
const CompraRow = React.memo(({
  compra,
  onViewDetails,
  onGenerateReport,
  onAnular,
  getEstadoColor
}: {
  compra: Compra & { totalFormatted: string; fechaFormatted: string, proveedorDocumento?: string },
  onViewDetails: (c: Compra) => void,
  onGenerateReport: (c: Compra) => void,
  onAnular: (id: number) => void,
  getEstadoColor: (e: string) => string
}) => (
  <tr className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
    <td className="py-4 px-4 text-center">
      <div className="flex items-center gap-2 justify-center">
        <Hash className="w-4 h-4 text-orange-primary" />
        <span className="text-gray-lighter">{String(compra.id)}</span>
      </div>
    </td>
    <td className="py-4 px-4 text-center">
      <span className="text-gray-lighter">{compra.proveedorDocumento || 'N/A'}</span>
    </td>
    <td className="py-4 px-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Building className="w-4 h-4 text-orange-primary" />
        <span className="text-gray-lighter">{compra.proveedorNombre}</span>
      </div>
    </td>
    <td className="py-4 px-4 text-center">
      <span className="text-gray-lighter font-bold">${compra.totalFormatted}</span>
    </td>
    <td className="py-4 px-4 text-center">
      <span className="text-sm text-gray-lighter">{compra.fechaFormatted}</span>
    </td>
    <td className="py-4 px-4 text-center">
      <span className={`std-badge ${getEstadoColor(compra.estado)}`}>
        {compra.estado}
      </span>
    </td>
    <td className="py-4 px-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <button
            onClick={() => compra.estado?.toLowerCase() !== "anulada" && compra.estado?.toLowerCase() !== "anulado" && onAnular(compra.id)}
            disabled={compra.estado?.toLowerCase() === "anulada" || compra.estado?.toLowerCase() === "anulado"}
            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            title={compra.estado?.toLowerCase() === "anulada" || compra.estado?.toLowerCase() === "anulado" ? "Compra anulada" : "Anular"}
          >
            <Ban className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
          </button>
        <button
          onClick={() => onViewDetails(compra)}
          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
          title="Ver detalles"
        >
          <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
        </button>
        <button
          onClick={() => onGenerateReport(compra)}
          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
          title="Descargar PDF"
        >
          <FileDown className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
        </button>
      </div>
    </td>
  </tr>
));

interface ComprasPageProps {
  onNavigate?: (page: string) => void;
}

const resolveImageSrc = (rawValue: unknown): string => {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  return value;
};

const getProductoDetalleImage = (producto: any, productosAPI: any[]): string => {
  const nombreProducto = String(producto?.productoNombre || producto?.nombre || '').trim().toLowerCase();
  const productoId = Number(String(producto?.productoId || producto?.id || '').replace(/\D/g, ''));

  const productoCatalogo = productosAPI.find((p: any) => {
    const sameId = !Number.isNaN(productoId) && productoId > 0 && Number(p.id) === productoId;
    const sameName = !!nombreProducto && String(p.nombre || '').trim().toLowerCase() === nombreProducto;
    return sameId || sameName;
  });

  return resolveImageSrc(
    producto?.productoImagen ||
    producto?.imagen ||
    producto?.imagenProduc ||
    producto?.imagenUrl ||
    producto?.Imagen ||
    producto?.ImagenProduc ||
    producto?.ImagenUrl ||
    productoCatalogo?.imagenProduc ||
    (productoCatalogo as any)?.imagen ||
    (productoCatalogo as any)?.imagenUrl ||
    ''
  );
};

export function ComprasPage({ onNavigate }: ComprasPageProps) {
  const { user } = useAuth();
  const { confirmDeleteAction, DoubleConfirmationContainer } = useDoubleConfirmation();
  const { created, success, error: showErrorAlert, info: showInfoAlert, AlertContainer } = useCustomAlert();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [productosAPI, setProductosAPI] = useState<any[]>([]);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completada" | "anulada">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [loading, setLoading] = useState(!sessionStorage.getItem('compras_cache'));

  // Función para generar fecha automática (solo visualización o defaults)
  const generateCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para formatear fecha en formato estándar DD/MM/YYYY
  const formatDate = (date: string | Date) => {
    let dateObj: Date;
    if (typeof date === 'string') {
      const plainDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (plainDateMatch) {
        const [, year, month, day] = plainDateMatch;
        // Importante: crear fecha en zona local para evitar desfase de -1 día
        dateObj = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    return dateObj.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCompraResponsableDisplay = (compra: any) => {
    if (!compra) return 'N/A';
    const c = compra as any;
    let doc =
      c.responsableDocumento ??
      c.ResponsableDocumento ??
      c.usuarioDocumento ??
      c.UsuarioDocumento ??
      c.userDocumento ??
      c.UserDocumento ??
      '';

    // Priorizar información almacenada directamente en la compra (nombre + apellido)
    const uNombre = c.usuarioNombre ?? c.UsuarioNombre;
    const uApellido = c.usuarioApellido ?? c.UsuarioApellido;
    if (uNombre || uApellido) {
      const fullNameFromStored = `${uNombre ?? ''} ${uApellido ?? ''}`.trim();
      if (fullNameFromStored) {
        return `${fullNameFromStored}${doc ? ` — CC ${doc}` : ''}`;
      }
    }

    const nombreDirecto =
      c.responsableNombre ?? c.ResponsableNombre ?? c.responsable ?? c.usuario;
    if (nombreDirecto) return `${String(nombreDirecto)}${doc ? ` — CC ${doc}` : ''}`;

    const respObj = c.responsable ?? c.Responsable ?? c.usuario ?? c.Usuario;
    if (respObj) {
      if (typeof respObj === 'string') return `${respObj}${doc ? ` — CC ${doc}` : ''}`;
      const nombre = respObj.nombre ?? respObj.Nombre ?? respObj.name ?? respObj.Name;
      const apellido = respObj.apellido ?? respObj.Apellido ?? respObj.lastName ?? respObj.LastName;
      if (!doc) doc = respObj.documento ?? respObj.Documento ?? '';
      const fullName = [nombre, apellido].filter(Boolean).join(' ').trim();
      if (fullName) return `${fullName}${doc ? ` — CC ${doc}` : ''}`;
    }
    if (doc) return `CC ${doc}`;
    return 'N/A';
  };

  const loadCompras = async (useCache = false) => {
    if (useCache) {
      const cached = sessionStorage.getItem('compras_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setCompras(sortComprasByRecency(parsed));
          // Si tenemos cache, ya no necesitamos mostrar el spinner principal
          // aunque sigamos cargando datos frescos en background
          setLoading(false);
        } catch (e) {
          console.error("Error parsing cache", e);
        }
      }
    }

    try {
      const comprasData = await compraService.getCompras();
      const ordered = sortComprasByRecency(comprasData);
      setCompras(ordered);
      sessionStorage.setItem('compras_cache', JSON.stringify(ordered));
    } catch (error) {
      showErrorAlert("Error al cargar compras", "No se pudieron obtener las compras.");
      console.error(error);
    }
  };


  // Cargar datos iniciales (compras, proveedores, productos)
  const initData = async () => {
    const hasCache = !!sessionStorage.getItem('compras_cache');

    // Solo mostrar loading si NO hay cache
    if (!hasCache) {
      setLoading(true);
    }

    try {
      // Iniciamos todas las cargas
      const comprasPromise = loadCompras(true);
      const usuariosPromise = apiService.getUsuarios().then(setUsers).catch(() => setUsers([]));
      const productosPromise = productoService.getProductos().then(setProductosAPI).catch(() => setProductosAPI([]));
      await comprasPromise;
      Promise.all([usuariosPromise, productosPromise]).catch(err => console.error("Error background data:", err));
    } catch (error) {
      console.error("Error en la carga inicial:", error);
    } finally {
      // Si la carga de compras fue exitosa o falló, quitamos el loading.
      // Si hubo cache, loadCompras ya habrá quitado el loading antes.
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // Debounce search term to avoid recomputing on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);


  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Memoized filtered compras based on debounced term
  const filteredCompras = useMemo(() => {
    const query = normalizeSearchText(debouncedSearch);
    return compras.filter(compra => {
      const estadoTxt = String((compra as any).estado || '');
      const estadoNormalizado = estadoTxt.toLowerCase().trim();
      const isAnulada = estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado';
      const isCompletada = estadoNormalizado === 'completada' || estadoNormalizado === 'completado';
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "anulada" && isAnulada) ||
        (statusFilter === "completada" && isCompletada);
      if (!matchesStatus) return false;
      if (!query) return true;
      // Solo campos visibles en la tabla: Número, Documento/NIT, Proveedor, Total, Fecha, Estado
      const numero = String((compra as any).numeroCompra || (compra as any).numeroFactura || (compra as any).id || '');
      const documento = String((compra as any).proveedorDocumento || '');
      const proveedor = String((compra as any).proveedorNombre || '');
      const totalTxt = String((compra as any).total ?? '');
      const fechaTxt = formatDate((compra as any).fecha || '');
      const visible = normalizeSearchText([numero, documento, proveedor, totalTxt, fechaTxt, estadoTxt].join(' '));
      return visible.includes(query);
    });
  }, [compras, debouncedSearch, statusFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredCompras.length / itemsPerPage)), [filteredCompras, itemsPerPage]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  // Pre‑compute formatted fields for displayed rows
  const displayedCompras = useMemo(() => {
    return filteredCompras.slice(startIndex, startIndex + itemsPerPage).map(compra => ({
      ...compra,
      totalFormatted: formatCurrency(compra.total),
      fechaFormatted: formatDate(compra.fecha)
    }));
  }, [filteredCompras, startIndex, itemsPerPage]);


  // Ajustar página actual si el total de páginas cambia
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const getEstadoColor = (estado: string) => {
    const estadoNormalizado = (estado || '').toLowerCase().trim();
    if (estadoNormalizado === 'anulada' || estadoNormalizado === 'anulado') {
      return 'std-badge-negative';
    }
    if (estadoNormalizado === 'completada' || estadoNormalizado === 'completado') {
      return 'std-badge-positive';
    }
    return 'std-badge-neutral';
  };
  const handleAnularCompra = (compraId: number) => {
    const compra = compras.find(c => c.id === compraId);
    if (!compra) return;

    confirmDeleteAction(
      String(compraId),
      async () => {
        try {
          // 1. Anular la compra en el backend (esto revierte stock automáticamente)
          await compraService.anularCompra(compraId);

          // Actualizar estado localmente de inmediato
          setCompras(prev => prev.map(c => c.id === compraId ? { ...c, estado: 'Anulada' } : c));

          await loadCompras().catch(() => { });
        } catch (error: any) {
          const errorMsg = error.message || "";
          if (errorMsg.includes("ya está anulada") || errorMsg.includes("ya esta anulada")) {
            showInfoAlert("Información", "Esta compra ya figuraba como anulada en el sistema.");
            setCompras(prev => prev.map(c => c.id === compraId ? { ...c, estado: 'Anulada' } : c));
            loadCompras().catch(() => { });
            return;
          }
          showErrorAlert("Error al anular", "No se pudo anular la compra.");
          console.error("Error al anular compra:", error);
        }
      },
      {
        confirmTitle: "Confirmar Anulación",
        confirmMessage: `¿Estás seguro de que deseas anular la compra?`,
        successTitle: "Compra anulada ✔️",
        successMessage: `La compra ha sido anulada exitosamente.`,
        requireInput: false,
        confirmButtonText: "Anular"
      }
    );
  };

  const generatePurchasePDF = async (compra: Compra) => {
    try {
      let detalles = (compra as any).detalles || [];
      if (!detalles || detalles.length === 0) {
        try {
          detalles = await compraService.getDetallesPorCompra(compra.id);
        } catch {
          showErrorAlert("No se pudieron cargar los detalles de la compra.");
          return;
        }
      }
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const hMargin = 20;

      

      try {
        doc.addImage(manitoLogo, 'JPEG', pageWidth / 2 - 12.5, 5, 25, 25);
      } catch {}

      const negocioNombre = "Manito BarberShop";
      const negocioEmail = "Edwainsolano007@gmail.com";
      const negocioDireccion = "Calle 79 #52 12 Aranjuez, Medellín";
      const negocioTelefono = "301 4836189";
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(negocioNombre, pageWidth - hMargin, 12, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(negocioEmail, pageWidth - hMargin, 18, { align: "right" });
      doc.text(negocioDireccion, pageWidth - hMargin, 24, { align: "right" });
      doc.text(negocioTelefono, pageWidth - hMargin, 30, { align: "right" });

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("MANITO BARBERSHOP", pageWidth / 2, 40, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Comprobante de Compra", pageWidth / 2, 48, { align: "center" });

      doc.setDrawColor(0, 0, 0); doc.roundedRect(pageWidth / 2 - 25, 52, 50, 7, 3.5, 3.5, "S");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const compraId = String((compra as any).numeroCompra || compra.id || "N/A");
      doc.text(`COMPRA #${compraId}`, pageWidth / 2, 56.5, { align: "center" });

      let y = 80;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMACIÓN GENERAL", hMargin, y);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(hMargin, y + 2, 85, y + 2);

      const responsableCompra = getCompraResponsableDisplay(compra as any);
      const fechaRegistro = formatDate((compra as any).fecha || '');
      const fechaFactura = (compra as any).fechaFactura ? formatDate((compra as any).fechaFactura) : 'N/A';
      const numeroCompraRegistro = String((compra as any).id ?? 'N/A');

      y += 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("N. de compra:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(numeroCompraRegistro, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Proveedor:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String((compra as any).proveedorNombre || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("NIT/Doc. Prov.:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String((compra as any).proveedorDocumento || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Fecha y Hora:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(fechaRegistro, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Estado:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(compra.estado || "N/A"), hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Responsable:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(responsableCompra, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Fecha Factura:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(fechaFactura, hMargin + 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Método Pago:", hMargin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String((compra as any).metodoPago || "N/A"), hMargin + 40, y);

      const totalItems = Array.isArray(detalles) ? detalles.reduce((sum, d) => sum + Number((d as any).cantidad || 0), 0) : 0;
      const subtotalNum = Number((compra as any).subtotal || 0);
      const ivaNum = Number((compra as any).iva || 0);
      const descuentoNum = Number((compra as any).descuento || 0);
      const totalNum = Number((compra as any).total || subtotalNum + ivaNum - descuentoNum);
      y += 15;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE PRODUCTOS", hMargin, y);
      doc.line(hMargin, y + 2, 87, y + 2);

      y += 12;
      doc.setDrawColor(0, 0, 0); doc.rect(hMargin, y, pageWidth - (hMargin * 2), 10, "S");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.text("PRODUCTO", hMargin + 30, y + 6.5, { align: "center" });
      doc.text("CATEGORÍA", hMargin + 75, y + 6.5, { align: "center" });
      doc.text("CANT.", hMargin + 105, y + 6.5, { align: "center" });
      doc.text("PREC. UNIT", hMargin + 130, y + 6.5, { align: "center" });
      doc.text("SUBTOTAL", hMargin + 155, y + 6.5, { align: "center" });

      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      if (!Array.isArray(detalles) || detalles.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.text("No hay detalles disponibles para esta compra.", pageWidth / 2, y + 10, { align: "center" });
      } else {
        detalles.forEach((item: any, index: number) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }

          if (index % 2 === 0) {
            doc.setFillColor(255, 255, 255);
            doc.rect(hMargin, y, pageWidth - (hMargin * 2), 8, 'F');
          }

          const nombre = String(item?.productoNombre || item?.nombre || 'Producto');
          const prodId = Number(item?.productoId || item?.id || 0);
          const categoriaDesdeDetalle = typeof item?.categoria === 'string' ? item.categoria : '';
          const categoriaRaw = categoriaDesdeDetalle || (item as any)?.categoria || (item as any)?.categoriaNombre || 'N/A';
          const categoria = typeof categoriaRaw === 'string' ? categoriaRaw : String(categoriaRaw?.nombre || categoriaRaw || 'N/A');
          const cantidad = Number(item?.cantidad || 0);
          const precioUnitario = Number(item?.precioUnitario || item?.precio || 0);
          const subtotal = Number(item?.subtotal || (cantidad * precioUnitario) || 0);

          const nombreTruncado = nombre.length > 35 ? `${nombre.substring(0, 32)}...` : nombre;
          const catTruncada = categoria.length > 20 ? `${categoria.substring(0, 17)}...` : categoria;

          doc.setFontSize(8);
          doc.text(nombreTruncado, hMargin + 30, y + 5.5, { align: "center" });
          doc.text(catTruncada || 'N/A', hMargin + 75, y + 5.5, { align: "center" });

          doc.setFont("helvetica", "bold");
          doc.text(String(cantidad), hMargin + 105, y + 5.5, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.text(`$${formatCurrency(precioUnitario)}`, hMargin + 130, y + 5.5, { align: "center" });
          doc.setFont("helvetica", "bold");
          doc.text(`$${formatCurrency(subtotal)}`, hMargin + 155, y + 5.5, { align: "center" });
          doc.setFont("helvetica", "normal");

          y += 8;
        });
      }

      y += 8;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(hMargin, y, pageWidth - (hMargin * 2), 22, 2, 2, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`TOTAL INSUMOS: ${totalItems} UNIDADES`, pageWidth / 2, y + 8, { align: "center" });
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`VALOR TOTAL: $ ${formatCurrency(totalNum)}`, pageWidth / 2, y + 17, { align: "center" });

      y = Math.max(275, y + 28);
      doc.setDrawColor(0, 0, 0);
      doc.line(hMargin, y, pageWidth - hMargin, y);

      y += 8;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(`Documento generado automáticamente el ${new Date().toLocaleString('es-CO')}`, pageWidth / 2, y, { align: "center" });
      doc.text("MANITO BARBERSHOP - Sistema de Gestión de Insumos", pageWidth / 2, y + 4, { align: "center" });
      const filename = `Reporte_Compra_${(compra as any).numeroCompra || compra.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      created("PDF generado exitosamente", "El reporte de compra fue descargado correctamente.");
    } catch {
      showErrorAlert("Error al generar PDF", "No se pudo generar el reporte de compra.");
    }
  };

  const generatePurchaseReport = async (compra: Compra) => {
    let productosDetalle = compra.detalles || [];

    if (productosDetalle.length === 0) {
      try {
        productosDetalle = await compraService.getDetallesPorCompra(compra.id);
      } catch (error) {
        console.error(error);
        showErrorAlert("Error al cargar reporte", "No se pudieron cargar los productos para el reporte.");
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Compra - ${compra.numeroCompra}</title>
        <style>
          body { font-family: 'DM Sans', Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #d8b081; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { color: #d8b081; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .report-title { font-size: 18px; color: #666; }
          .info-section { margin: 20px 0; }
          .section-title { background-color: #f5f5f5; padding: 10px; font-weight: bold; margin-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .info-item { border-bottom: 1px solid #eee; padding: 8px 0; }
          .info-label { font-weight: bold; color: #666; }
          .info-value { color: #333; margin-top: 5px; }
          .products-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .products-table th, .products-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .products-table th { background-color: #f8f9fa; font-weight: bold; }
          .totals-section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total-final { font-size: 18px; font-weight: bold; color: #d8b081; border-top: 2px solid #d8b081; padding-top: 10px; margin-top: 15px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">MANITO BARBERSHOP</div>
          <div class="report-title">Reporte de Compra</div>
          <div>Fecha de generación: ${formatDate(new Date())}</div>
        </div>

        <div class="info-section">
          <div class="section-title">Información General</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">ID de Compra:</div>
              <div class="info-value">${(compra.numeroCompra || '').replace(/^(FC|CPR)-?/i, '')}</div>
            </div>
             <div class="info-item">
              <div class="info-label">N factura:</div>
              <div class="info-value">${(compra.numeroFactura || 'N/A').replace(/^(FC|CPR)-?/i, '')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado:</div>
              <div class="info-value">${compra.estado}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Proveedor:</div>
              <div class="info-value">${compra.proveedorNombre}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Responsable:</div>
              <div class="info-value">${compra.responsableNombre}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha de Registro:</div>
              <div class="info-value">${formatDate(compra.fecha)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha de Factura:</div>
              <div class="info-value">${compra.fechaFactura ? formatDate(compra.fechaFactura) : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Método de Pago:</div>
              <div class="info-value">${compra.metodoPago}</div>
            </div>
          </div>
        </div>

        ${productosDetalle.length > 0 ? `
        <div class="info-section">
          <div class="section-title">Productos</div>
          <table class="products-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productosDetalle.map((producto) => `
                <tr>
                  <td>${producto.productoNombre}</td>
                  <td>
                    ${producto.cantidad}
                  </td>
                  <td>${formatCurrency(producto.precioUnitario)}</td>
                  <td>${formatCurrency(producto.subtotal || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="totals-section">
          <div class="section-title">Resumen Financiero</div>
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(compra.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>IVA:</span>
            <span>${formatCurrency(compra.iva)}</span>
          </div>
          <div class="total-row">
            <span>Descuento:</span>
            <span>-${formatCurrency(compra.descuento)}</span>
          </div>
          <div class="total-row total-final">
            <span>TOTAL:</span>
            <span>${formatCurrency(compra.total)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Este es un documento generado automáticamente por el sistema de gestión de barbería.</p>
          <p>Reporte generado el ${formatDate(new Date())} a las ${new Date().toLocaleTimeString('es-CO')}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Compra_${compra.numeroCompra || compra.id}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    success("Reporte HTML generado", "El reporte se ha generado y descargado correctamente.");
  };

  const handleViewDetails = async (compra: Compra) => {
    try {
      const detalles = await compraService.getDetallesPorCompra(compra.id);
      setSelectedCompra({ ...compra, detalles });
    } catch {
      setSelectedCompra(compra);
    }
    setIsDetailDialogOpen(true);
  };

  return (
    <>
      <main className="flex-1 overflow-auto bg-black-primary">
        <div style={{ display: 'none' }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Stats removed/hidden */}
        </div>

        <div className="std-card">
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <>
              <button
                className="btn-std-primary"
                onClick={() => onNavigate?.("RegistrarCompra")}
              >
                <Plus className="w-4 h-4" />
                Nueva Compra
              </button>
              </>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar por cualquier campo de la tabla..."
            statusFilter={{
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value as "all" | "completada" | "anulada");
                setCurrentPage(1);
              },
              options: [
                { value: "all", label: "Todos" },
                { value: "completada", label: "Completadas" },
                { value: "anulada", label: "Anuladas" },
              ],
            }}
            recordsText={`Mostrando ${displayedCompras.length} de ${filteredCompras.length} compras`}
            recordsPlacement="right"
          />

          {/* Mobile Cards */}
          <div className="block sm:hidden">
            {loading ? (
              <div className="std-mobile-cards">
                <div className="py-12 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-orange-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-lightest text-sm">Cargando compras...</p>
                </div>
              </div>
            ) : displayedCompras.length === 0 ? (
              <div className="std-mobile-cards">
                <div className="py-12 text-center">
                  <Receipt className="w-12 h-12 text-gray-lightest mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white-primary mb-2">No se encontraron compras</h3>
                  <p className="text-gray-lightest mb-4">Ajusta los filtros o recarga la tabla para actualizar los resultados.</p>
                  <button onClick={() => loadCompras(false)} className="elegante-button-primary text-sm">Recargar tabla</button>
                </div>
              </div>
            ) : (
              <div className="std-mobile-cards">
                {displayedCompras.map((compra) => (
                  <div key={compra.id} className="std-mobile-card">
                    <div className="std-mobile-card-info">
                      <div className="std-mobile-card-row">
                        <span className="std-mobile-card-title">{compra.proveedorNombre}</span>
                        <span className={`std-badge ${getEstadoColor(compra.estado)}`}>
                          {compra.estado}
                        </span>
                      </div>
                      <span className="std-mobile-card-sub">Compra #{String(compra.id)} · NIT: {compra.proveedorDocumento || 'N/A'}</span>
                      <span className="std-mobile-card-meta">${compra.totalFormatted} · {compra.fechaFormatted}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-gray-darker transition-colors"><MoreVertical className="w-4 h-4 text-gray-lightest" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-darkest border-gray-dark min-w-[140px]" align="end">
                          <DropdownMenuItem className="text-gray-lightest cursor-pointer" onSelect={() => handleViewDetails(compra)}>Detalles</DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-lightest cursor-pointer" onSelect={() => generatePurchasePDF(compra)}>PDF</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500 cursor-pointer" disabled={compra.estado?.toLowerCase() === "anulada" || compra.estado?.toLowerCase() === "anulado"} onSelect={() => handleAnularCompra(compra.id)}>Anular</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden sm:block">
          <div className="std-table-wrapper">
            <table className="std-table">
                  <thead className={loading ? "std-thead [&_th]:!text-transparent [&_th]:select-none" : "std-thead"}>
                    <tr className="border-b border-gray-dark">
                      <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Número</th>
                      <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Documento/NIT Prov.</th>
                      <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Proveedor</th>
                      <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Total</th>
                      <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Fecha</th>
                      <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Estado</th>
                      <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="std-tbody">
                    {loading ? (
                      <TableLoadingStateRow
                        colSpan={7}
                        title="Cargando compras..."
                      />
                    ) : displayedCompras.length > 0 ? displayedCompras.map((compra) => (
                      <CompraRow
                        key={compra.id}
                        compra={compra as any}
                        onAnular={handleAnularCompra}
                        onViewDetails={handleViewDetails}
                        onGenerateReport={generatePurchasePDF}
                        getEstadoColor={getEstadoColor}
                      />
                    )) : (
                      <TableEmptyStateRow
                        colSpan={7}
                        title="No se encontraron compras"
                        description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                        onReload={() => loadCompras(false)}
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

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto text-white-primary">
            {selectedCompra && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-white-primary flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-orange-primary" />
                    Detalle de Compra
                  </DialogTitle>
                  <DialogDescription className="text-gray-lightest">
                    Información registrada de la compra (solo lectura)
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-primary" />
                        Número de Compra
                      </Label>
                      <Input
                        value={(selectedCompra.numeroCompra || String(selectedCompra.id)).replace(/^(FC|CPR)-?/i, '')}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-orange-primary" />
                        Número de Recibo
                      </Label>
                      <Input
                        value={(selectedCompra as any).numeroRecibo || 'N/A'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-primary" />
                        Fecha de Registro
                      </Label>
                      <Input
                        value={formatDate(selectedCompra.fecha)}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-primary" />
                        Fecha de Factura
                      </Label>
                      <DatePicker
                        value={selectedCompra.fechaFactura || ''}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-orange-primary" />
                        Método de Pago
                      </Label>
                      <Input
                        value={selectedCompra.metodoPago || 'N/A'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Building className="w-4 h-4 text-orange-primary" />
                        Proveedor
                      </Label>
                      <Input
                        value={selectedCompra.proveedorNombre || 'N/A'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-primary" />
                        Documento/NIT Prov.
                      </Label>
                      <Input
                        value={(selectedCompra as any).proveedorDocumento || 'N/A'}
                        disabled
                        className="elegante-input bg-gray-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-3">
                      <Label className="text-white-primary flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-primary" />
                        Responsable
                      </Label>
                      <Input
                        value={getCompraResponsableDisplay(selectedCompra)}
                        disabled
                        className="elegante-input bg-gray-medium w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        Estado
                      </Label>
                      <div className="h-10 flex items-center">
                        <span className={`std-badge ${getEstadoColor(selectedCompra.estado)}`}>
                          {selectedCompra.estado === 'Anulada' ? 'Anulada' : 'Completada'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-orange-primary" />
                        Descuento (%)
                      </Label>
                      <Input
                        type="number"
                        value={selectedCompra.subtotal > 0 ? ((selectedCompra.descuento / selectedCompra.subtotal) * 100).toFixed(2) : '0'}
                        disabled
                        className="elegante-input no-spin bg-gray-medium"
                      />
                    </div>
                  </div>

                  {selectedCompra.detalles && selectedCompra.detalles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-md font-medium text-white-primary">Productos Agregados:</h4>
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {selectedCompra.detalles.map((detalle, idx) => {
                          const imgUrl = getProductoDetalleImage(detalle, productosAPI);

                          return (
                            <div key={idx} className="bg-gray-darker rounded-lg px-3 py-2.5 border-l-2 border-orange-primary/20">
                              <div className="flex items-center gap-4 flex-nowrap min-w-0">
                                <div className="shrink-0 w-6" aria-hidden />
                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                  <ImageRenderer
                                    url={imgUrl}
                                    alt={detalle.productoNombre || 'Producto'}
                                    className="w-full h-full border-0 bg-transparent"
                                    fallbackVariant="product"
                                    showLabel={false}
                                  />
                                </div>
                                <div className="min-w-0 flex-1 shrink flex items-center justify-center">
                                  <span className="text-white-primary font-semibold text-base truncate block text-center w-full" title={detalle.productoNombre || 'Producto'}>
                                    {detalle.productoNombre || 'Producto'}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <label className="text-[11px] text-gray-400 font-normal">Cantidad</label>
                                  <Input type="number" value={detalle.cantidad} disabled className="w-12 h-7 text-xs text-center tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-medium" />
                                </div>

                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <label className="text-[11px] text-gray-400 font-normal">Precio unit.</label>
                                  <Input type="number" value={detalle.precioUnitario} disabled className="w-20 h-7 text-xs text-right tabular-nums elegante-input no-spin py-0 px-1.5 bg-gray-medium" />
                                </div>

                                <div className="flex flex-col gap-0.5 shrink-0 justify-center">
                                  <label className="text-[11px] text-gray-400 font-normal">Subt.</label>
                                  <span className="text-orange-primary font-semibold text-xs tabular-nums leading-7">
                                    ${formatCurrency((detalle.cantidad || 0) * (detalle.precioUnitario || 0))}
                                  </span>
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-darker p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-gray-lightest">
                      <span>Subtotal:</span>
                      <span>${formatCurrency(selectedCompra.subtotal)}</span>
                    </div>
                    {selectedCompra.descuento > 0 && (
                      <div className="flex justify-between text-gray-lightest">
                        <span>
                          Descuento ({selectedCompra.subtotal > 0 ? ((selectedCompra.descuento / selectedCompra.subtotal) * 100).toFixed(2) : '0'}%):
                        </span>
                        <span>-${formatCurrency(selectedCompra.descuento)}</span>
                      </div>
                    )}
                    <hr className="border-gray-medium" />
                    <div className="flex justify-between text-white-primary font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-orange-primary">${formatCurrency(selectedCompra.total)}</span>
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
                  {selectedCompra && (
                    <button
                      onClick={() => handleAnularCompra(Number(selectedCompra.id))}
                      className={`elegante-button-primary ${String(selectedCompra.estado || '').toLowerCase().includes('anulad') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={String(selectedCompra.estado || '').toLowerCase().includes('anulad')}
                    >
                      {String(selectedCompra.estado || '').toLowerCase().includes('anulad') ? 'Compra Anulada' : 'Anular Compra'}
                    </button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
      <DoubleConfirmationContainer />
      <AlertContainer />
    </>
  );
}
