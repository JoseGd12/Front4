import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import {
  DollarSign,
  Search,
  User,
  Package,
  X,
  CreditCard,
  Receipt,
  Plus,
  Scissors,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/select";
import { Label } from "../../../shared/components/ui/label";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { ventaService } from "../services/ventaService";
import { productoService, ApiProducto } from "../../productos/services/productos";
import { barberosService, Barbero as ApiBarbero } from "../../administracion/services/barberosService";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { FormSection } from "../../../shared/components/ui/FormSection";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { DetailPanel } from "../components/DetailPanel";

// Utilities
const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString("es-CO");
};

const formatDate = (date: string | Date): string => {
  let dateObj: Date;
  if (typeof date === "string") {
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
  if (Number.isNaN(dateObj.getTime())) return String(date || "");
  return dateObj.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const normalizeSearchText = (value: unknown): string => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

/** Calcula el precio de venta al barbero: precioCompra si > 0, sino precioBase * 0.7 */
const getPrecioBarbero = (producto: ApiProducto): number => {
  const compra = Number(producto.precioCompra ?? 0);
  if (compra > 0) return compra;
  const base = Number(producto.precioBase ?? 0);
  return base > 0 ? Math.round(base * 0.7) : 0;
};

interface ProductoEnCarrito {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  imagen?: string;
}

interface RegistrarVentaBarberoPageProps {
  onBack: () => void;
}

export function RegistrarVentaBarberoPage({ onBack }: RegistrarVentaBarberoPageProps) {
  const { user } = useAuth();
  const { created, error: showErrorAlert, AlertContainer } = useCustomAlert();

  // Data
  const [loading, setLoading] = useState(true);
  const [productosAPI, setProductosAPI] = useState<ApiProducto[]>([]);
  const [barberosAPI, setBarberosAPI] = useState<ApiBarbero[]>([]);
  const [ventasCount, setVentasCount] = useState(0);

  // Form state
  const [barberoId, setBarberoId] = useState<number | null>(null);
  const [barberoNombre, setBarberoNombre] = useState("");
  const [barberoSearchTerm, setBarberoSearchTerm] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [fecha, setFecha] = useState("");
  const [productos, setProductos] = useState<ProductoEnCarrito[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [cantidadInput, setCantidadInput] = useState("1");

  // Validation
  const [showErrors, setShowErrors] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shakeClass = validationAttempt % 2 === 0 ? "input-required-shake-a" : "input-required-shake-b";

  const generateCurrentDate = () => new Date().toISOString().split("T")[0] || "";

  useEffect(() => {
    loadData();
    setFecha(generateCurrentDate());
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ventasData, productosData, barberosData] = await Promise.all([
        ventaService.getVentas().catch(() => []),
        productoService.getProductos().catch(() => []),
        barberosService.getBarberos().catch(() => []),
      ]);

      const maxNumVenta =
        Array.isArray(ventasData) && ventasData.length > 0
          ? Math.max(...ventasData.map((v: any) => Number(v.numeroVenta || v.id) || 0))
          : 0;
      setVentasCount(maxNumVenta);

      // Solo productos activos con stockVentas > 0
      setProductosAPI(
        (productosData || []).filter((p: ApiProducto) => p.activo && p.stockVentas > 0)
      );

      // Barberos activos
      const barberos = Array.isArray(barberosData)
        ? barberosData
            .map((b: any) => barberosService.mapApiToComponent(b))
            .filter((b: ApiBarbero) => b.status === "active" || b.estado === true)
        : [];
      setBarberosAPI(barberos);
    } catch (err: any) {
      showErrorAlert("Error al cargar datos", "No se pudieron cargar los datos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const numeroVenta = useMemo(() => ventasCount + 1, [ventasCount]);

  // Producto seleccionado en el buscador
  const productoInfo = useMemo(
    () => productosAPI.find((p) => p.id.toString() === productoSeleccionado),
    [productoSeleccionado, productosAPI]
  );

  const cantidadNum = Math.max(1, Math.floor(Number(cantidadInput) || 1));

  const isStockExceeded = useMemo(() => {
    if (!productoInfo) return false;
    const yaAgregado = productos.find((p) => p.id === productoSeleccionado);
    const cantYa = yaAgregado ? yaAgregado.cantidad : 0;
    return cantidadNum + cantYa > productoInfo.stockVentas;
  }, [productoInfo, cantidadNum, productos, productoSeleccionado]);

  const agregarProducto = () => {
    if (!productoSeleccionado || !productoInfo) {
      setShowErrors(true);
      setValidationAttempt((p) => p + 1);
      return;
    }
    if (isStockExceeded) {
      setValidationAttempt((p) => p + 1);
      return;
    }

    const precio = getPrecioBarbero(productoInfo);
    const existente = productos.find((p) => p.id === productoSeleccionado);

    if (existente) {
      setProductos(
        productos.map((p) =>
          p.id === productoSeleccionado
            ? { ...p, cantidad: p.cantidad + cantidadNum }
            : p
        )
      );
    } else {
      setProductos([
        ...productos,
        {
          id: productoInfo.id.toString(),
          nombre: productoInfo.nombre,
          cantidad: cantidadNum,
          precio,
          imagen: productoInfo.imagenProduc || "",
        },
      ]);
    }

    setProductoSeleccionado("");
    setProductSearchTerm("");
    setCantidadInput("1");
    setShowErrors(false);
  };

  const eliminarProducto = (id: string) => {
    setProductos(productos.filter((p) => p.id !== id));
  };

  const actualizarCantidad = (id: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    const prod = productosAPI.find((p) => p.id.toString() === id);
    if (prod && nuevaCantidad > prod.stockVentas) {
      showErrorAlert(
        "Stock insuficiente",
        `Stock disponible: ${prod.stockVentas} unidades.`
      );
      return;
    }
    setProductos(productos.map((p) => (p.id === id ? { ...p, cantidad: nuevaCantidad } : p)));
  };

  // Totales
  const subtotal = useMemo(
    () => productos.reduce((sum, p) => sum + p.precio * p.cantidad, 0),
    [productos]
  );
  const total = subtotal;
