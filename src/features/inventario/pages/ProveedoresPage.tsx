import React, { useState, useEffect } from "react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/select";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Package,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  IdCard,
  X,
  AlertCircle,
  Globe,
  Calendar,
  Briefcase,
  Users,
  FileText,
  UserCheck,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { proveedorService, Proveedor } from "../services/proveedorService";
import { compraService } from "../services/compraService";

// Tipos de proveedor
const TIPOS_PROVEEDOR = [
  { value: 'Juridico', label: 'Jurídico (Empresa)' },
  { value: 'Natural', label: 'Natural (Persona)' }
];

// Tipos de identificación (proveedor y representante)
const TIPOS_IDENTIFICACION_PROVEEDOR = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'Pasaporte', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' }
];

const TIPOS_IDENTIFICACION_REPRESENTANTE = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'Pasaporte', label: 'Pasaporte' }
];

const DEPARTAMENTOS_COLOMBIA = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
];

// Datos estáticos para fallback cuando la API no está disponible
const proveedoresDataFallback: Proveedor[] = [
  {
    id: 1,
    nombre: "Suministros Barbería Pro",
    razonSocial: "Suministros Barbería Pro S.A.S",
    tipoProveedor: "Juridico",
    nit: "900123456-7",
    correo: "ventas@barberiapro.com",
    numero: "+57 301 234 5678",
    direccion: "Calle 72 #10-34, Oficina 501, Bogotá",
    representanteLegal: "María Elena García",
    documentoRepresentante: "52123456",
    telefonoRepresentante: "+57 301 111 2222",
    correoRepresentante: "maria.garcia@barberiapro.com",
    sectorEconomico: "Comercio al por mayor de productos de belleza",
    anosOperacion: 12,
    paginaWeb: "www.barberiapro.com",
    fechaCreacion: "15-03-2025",
    activo: true
  },
  {
    id: 2,
    nombre: "Perfumería Andina Ltda",
    razonSocial: "Perfumería Andina Ltda",
    tipoProveedor: "Juridico",
    nit: "800987654-3",
    correo: "contacto@perfumeriaandina.co",
    numero: "+57 302 345 6789",
    direccion: "Carrera 15 #93-47, Local 102, Bogotá",
    representanteLegal: "Carlos Andrés Rodríguez",
    documentoRepresentante: "71987654",
    telefonoRepresentante: "+57 302 333 4444",
    correoRepresentante: "carlos.rodriguez@perfumeriaandina.co",
    sectorEconomico: "Comercio de perfumes y fragancias",
    anosOperacion: 8,
    paginaWeb: "www.perfumeriaandina.co",
    fechaCreacion: "22-06-2025",
    activo: true
  },
  {
    id: 3,
    nombre: "Accesorios & Más Ltda",
    razonSocial: "Accesorios & Más Ltda",
    tipoProveedor: "Juridico",
    nit: "900555666-9",
    correo: "info@accesoriosymas.com",
    numero: "+57 303 456 7890",
    direccion: "Centro Comercial Santafé, Local 245, Bogotá",
    representanteLegal: "Ana María Pérez",
    documentoRepresentante: "41555666",
    telefonoRepresentante: "+57 303 555 6666",
    correoRepresentante: "ana.perez@accesoriosymas.com",
    sectorEconomico: "Comercio de accesorios y joyería",
    anosOperacion: 5,
    paginaWeb: "www.accesoriosymas.com",
    fechaCreacion: "08-04-2025",
    activo: false
  },
  {
    id: 4,
    nombre: "Carlos Andrés Martínez",
    tipoProveedor: "Natural",
    nit: "12345678-9",
    correo: "carlos.martinez@email.com",
    numero: "+57 305 678 9012",
    direccion: "Barrio La Candelaria, Calle 11 #6-42, Bogotá",
    fechaCreacion: "12-07-2025",
    activo: true
  }
];

export function ProveedoresPage() {
  const { error, created, edited, deleted, AlertContainer } = useCustomAlert();
  const { confirmDeleteAction, confirmEditAction, DoubleConfirmationContainer } = useDoubleConfirmation();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [formData, setFormData] = useState({
    // 1
    tipoProveedor: "Juridico" as 'Juridico' | 'Natural',
    // 2
    nombre: "",
    // 3
    tipoIdentificacionProveedor: "NIT",
    // 4
    identificacion: "",
    // 5
    correo: "",
    // 6
    telefono: "",
    // 7
    direccion: "",
    // 8
    ciudad: "",
    // 9
    departamento: "",
    // 10
    representanteLegal: "",
    // 11
    tipoIdentificacionRepresentante: "CC",
    // 12
    identificacionRepresentante: "",
    // 13
    correoRepresentante: "",
    // 14
    telefonoRepresentante: ""
  });
  const [showProveedorFormErrors, setShowProveedorFormErrors] = useState(false);
  const [proveedorValidationAttempt, setProveedorValidationAttempt] = useState(0);
  const shakeClass = proveedorValidationAttempt % 2 === 0 ? "input-required-shake-a" : "input-required-shake-b";
  const [duplicateErrors, setDuplicateErrors] = useState<{ nombre?: string; identificacion?: string; telefono?: string; correo?: string }>({});
  const [formatErrors, setFormatErrors] = useState<{
    nombre?: string;
    identificacion?: string;
    telefono?: string;
    correo?: string;
    representanteLegal?: string;
    identificacionRepresentante?: string;
    telefonoRepresentante?: string;
    correoRepresentante?: string;
  }>({});

  // ===== Helpers de sanitización (filtrado en tiempo real) =====
  // Solo letras (incluye tildes/ñ), espacios y caracteres comunes para nombres
  const sanitizeNombre = (v: string) => v.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü .'\-&]/g, '');

  // Filtrado de identificación según tipo: CC/TI/CE solo dígitos; NIT dígitos+guion; Pasaporte alfanumérico
  const sanitizeIdentificacion = (v: string, tipo: string) => {
    switch (tipo) {
      case 'NIT':
        return v.replace(/[^0-9-]/g, '');
      case 'Pasaporte':
        return v.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
      case 'CC':
      case 'CE':
      case 'TI':
      default:
        return v.replace(/\D/g, '');
    }
  };

  // Solo dígitos, +, espacios, guiones y paréntesis
  const sanitizeTelefono = (v: string) => v.replace(/[^0-9+\-() ]/g, '');

  // ===== Helpers de validación de formato (en submit) =====
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const isValidNombre = (v: string) => /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü .'\-&]{2,150}$/.test(v.trim());
  const isValidTelefono = (v: string) => {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  };
  const isValidIdentificacion = (v: string, tipo: string) => {
    const val = v.trim();
    switch (tipo) {
      case 'NIT':
        // 9-10 dígitos + opcional guion verificador
        return /^\d{9,10}(-\d)?$/.test(val);
      case 'Pasaporte':
        return /^[A-Z0-9]{6,15}$/i.test(val);
      case 'CC':
      case 'CE':
        return /^\d{6,12}$/.test(val);
      case 'TI':
        return /^\d{8,11}$/.test(val);
      default:
        return val.length >= 6 && val.length <= 20;
    }
  };

  const validateFormatFields = (esJuridico: boolean) => {
    const errs: typeof formatErrors = {};

    if (formData.nombre.trim() && !isValidNombre(formData.nombre)) {
      errs.nombre = 'El nombre solo puede contener letras y espacios (2-150 caracteres).';
    }
    if (formData.identificacion.trim() && !isValidIdentificacion(formData.identificacion, formData.tipoIdentificacionProveedor)) {
      errs.identificacion = `Formato inválido para ${formData.tipoIdentificacionProveedor}.`;
    }
    if (formData.telefono.trim() && !isValidTelefono(formData.telefono)) {
      errs.telefono = 'El teléfono debe tener entre 7 y 15 dígitos.';
    }
    if (formData.correo.trim() && !isValidEmail(formData.correo)) {
      errs.correo = 'El correo no tiene un formato válido.';
    }

    if (esJuridico) {
      if (formData.representanteLegal.trim() && !isValidNombre(formData.representanteLegal)) {
        errs.representanteLegal = 'El nombre solo puede contener letras y espacios (2-150 caracteres).';
      }
      if (formData.identificacionRepresentante.trim() && !isValidIdentificacion(formData.identificacionRepresentante, formData.tipoIdentificacionRepresentante)) {
        errs.identificacionRepresentante = `Formato inválido para ${formData.tipoIdentificacionRepresentante}.`;
      }
      if (formData.telefonoRepresentante.trim() && !isValidTelefono(formData.telefonoRepresentante)) {
        errs.telefonoRepresentante = 'El teléfono debe tener entre 7 y 15 dígitos.';
      }
      if (formData.correoRepresentante.trim() && !isValidEmail(formData.correoRepresentante)) {
        errs.correoRepresentante = 'El correo no tiene un formato válido.';
      }
    }

    setFormatErrors(errs);
    return { hasError: Object.keys(errs).length > 0, errs };
  };

  const normalizeText = (v: unknown) =>
    String(v ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const normalizeNit = (v: unknown) => String(v ?? '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
  const normalizePhone = (v: unknown) => String(v ?? '').replace(/\D/g, '');
  const normalizeEmail = (v: unknown) => String(v ?? '').toLowerCase().trim();

  const validateDuplicateFields = (payload: { nombre: string; identificacion: string; telefono: string; correo: string }, ignoreId?: number) => {
    const nombreNorm = normalizeText(payload.nombre);
    const identNorm = normalizeNit(payload.identificacion);
    const telefonoNorm = normalizePhone(payload.telefono);
    const correoNorm = normalizeEmail(payload.correo);

    const errs: { nombre?: string; identificacion?: string; telefono?: string; correo?: string } = {};

    for (const p of proveedores) {
      if (ignoreId && p.id === ignoreId) continue;
      const pNombre = normalizeText(p.nombre);
      const pIdent = normalizeNit(p.identificacion || p.nit || '');
      const pTelefono = normalizePhone((p as any).telefono || (p as any).numero || '');
      const pCorreo = normalizeEmail(p.correo || '');

      if (!errs.nombre && nombreNorm && pNombre && pNombre === nombreNorm) {
        errs.nombre = 'Ya existe un proveedor con este nombre.';
      }
      if (!errs.identificacion && identNorm && pIdent && pIdent === identNorm) {
        errs.identificacion = 'Ya existe un proveedor con esta identificación.';
      }
      if (!errs.telefono && telefonoNorm && pTelefono && pTelefono === telefonoNorm) {
        errs.telefono = 'Ya existe un proveedor con este teléfono.';
      }
      if (!errs.correo && correoNorm && pCorreo && pCorreo === correoNorm) {
        errs.correo = 'Ya existe un proveedor con este correo.';
      }
      if (errs.nombre || errs.identificacion || errs.telefono || errs.correo) break;
    }

    setDuplicateErrors(errs);
    return { hasError: !!(errs.nombre || errs.identificacion || errs.telefono || errs.correo), errs };
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const ignoreId = isEditDialogOpen && selectedProveedor ? Number((selectedProveedor as any).id) : undefined;
      validateDuplicateFields(
        { nombre: formData.nombre, identificacion: formData.identificacion, telefono: formData.telefono, correo: formData.correo },
        ignoreId
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.nombre, formData.identificacion, formData.telefono, formData.correo, isEditDialogOpen, selectedProveedor]);

  // Cargar proveedores desde la API
  const cargarProveedores = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setPageError(null);
      console.log('📥 Loading providers...');
      const data = await proveedorService.obtenerProveedores();
      console.log('✅ Providers loaded:', data);

      // Asegurarse de que los datos sean un array válido
      if (Array.isArray(data) && data.length > 0) {
        setProveedores(data);
      } else if (Array.isArray(data)) {
        // Si el array está vacío, mantenerlo vacío pero no mostrar error
        console.log('📭 No providers found, using empty array');
        setProveedores([]);
      } else {
        // Si los datos no son un array, usar fallback
        console.warn('⚠️ Invalid data format, using fallback');
        setProveedores(proveedoresDataFallback);
      }
    } catch (error) {
      console.error('❌ Error cargando proveedores:', error);
      setPageError('No se pudieron cargar los proveedores desde el servidor. Mostrando datos locales.');
      // Usar datos de fallback en caso de error
      setProveedores(proveedoresDataFallback);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarProveedores();
  }, []);

  const resetForm = () => {
    setFormData({
      tipoProveedor: "Juridico",
      nombre: "",
      tipoIdentificacionProveedor: "NIT",
      identificacion: "",
      correo: "",
      telefono: "",
      direccion: "",
      ciudad: "",
      departamento: "",
      representanteLegal: "",
      tipoIdentificacionRepresentante: "CC",
      identificacionRepresentante: "",
      correoRepresentante: "",
      telefonoRepresentante: ""
    });
    setShowProveedorFormErrors(false);
    setProveedorValidationAttempt(0);
    setFormatErrors({});
    setDuplicateErrors({});
    setIsEditDialogOpen(false);
    setSelectedProveedor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const esJuridico = formData.tipoProveedor === 'Juridico';
    const missingRequired = esJuridico
      ? (
          !formData.nombre.trim() ||
          !formData.identificacion.trim() ||
          !formData.telefono.trim() ||
          !formData.correo.trim() ||
          !formData.direccion.trim() ||
          !formData.ciudad.trim() ||
          !formData.departamento.trim() ||
          !formData.representanteLegal.trim() ||
          !formData.identificacionRepresentante.trim() ||
          !formData.correoRepresentante.trim() ||
          !formData.telefonoRepresentante.trim()
        )
      : (
          !formData.nombre.trim() ||
          !formData.identificacion.trim() ||
          !formData.telefono.trim() ||
          !formData.correo.trim()
        );

    if (missingRequired) {
      setShowProveedorFormErrors(true);
      setProveedorValidationAttempt(prev => prev + 1);
      error('Campos obligatorios', esJuridico ? 'Completa todos los campos obligatorios del formulario.' : 'Completa nombre, identificación, teléfono y correo.');
      return;
    }

    // Validación de formato
    const formatCheck = validateFormatFields(esJuridico);
    if (formatCheck.hasError) {
      setShowProveedorFormErrors(true);
      setProveedorValidationAttempt(prev => prev + 1);
      error('Formato inválido', 'Revisa los campos marcados en rojo.');
      return;
    }

    const dupCheck = validateDuplicateFields(
      {
        nombre: formData.nombre,
        identificacion: formData.identificacion,
        telefono: formData.telefono,
        correo: formData.correo
      }
    );
    if (dupCheck.hasError) {
      setProveedorValidationAttempt(prev => prev + 1);
      return;
    }

    try {
      // Para Natural: copiar datos del proveedor a los campos de representante
      const dataParaEnviar = !esJuridico ? {
        ...formData,
        representanteLegal: formData.nombre,
        tipoIdentificacionRepresentante: formData.tipoIdentificacionProveedor,
        identificacionRepresentante: formData.identificacion,
        correoRepresentante: formData.correo,
        telefonoRepresentante: formData.telefono
      } : formData;

      const payload = {
        ...dataParaEnviar,
        fechaCreacion: new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        activo: true
      };

      const nuevoProveedor = await proveedorService.crearProveedor(payload as any);

      created("Proveedor creado", `El proveedor "${formData.nombre}" ha sido agregado exitosamente al sistema.`);

      // Actualizar la lista local sin refrescar toda la tabla
      setProveedores(prev => {
        // Evitar duplicados por Id si la API lo devuelve
        const exists = prev.some(p => p.id === nuevoProveedor.id);
        return exists ? prev.map(p => (p.id === nuevoProveedor.id ? nuevoProveedor : p)) : [nuevoProveedor, ...prev];
      });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creando proveedor:', error);
      setPageError('No se pudo crear el proveedor en el servidor. Verifique los datos y su conexión.');
      setProveedorValidationAttempt(prev => prev + 1);
      // Mantener el diálogo abierto para que el usuario corrija
    }
  };

  const handleEdit = async (proveedorPartial: Proveedor) => {
    try {
      let proveedor = proveedorPartial;
      if (proveedorPartial.id) {
        const freshData = await proveedorService.obtenerProveedorPorId(proveedorPartial.id);
        if (freshData) {
          console.log('✨ Datos frescos cargados para edición:', freshData);
          proveedor = freshData;
        }
      }

      setSelectedProveedor(proveedor);
      setShowProveedorFormErrors(false);
      setProveedorValidationAttempt(0);

      const tipo = (proveedor.tipoProveedor === 'Natural' || proveedor.tipoProveedor === 'Juridico')
        ? proveedor.tipoProveedor
        : 'Juridico';

      setFormData({
        tipoProveedor: tipo,
        nombre: proveedor.nombre || "",
        tipoIdentificacionProveedor: proveedor.tipoIdentificacionProveedor || (tipo === 'Natural' ? 'CC' : 'NIT'),
        identificacion: proveedor.identificacion || proveedor.nit || "",
        correo: proveedor.correo || "",
        telefono: (proveedor.telefono as string) || proveedor.numero || "",
        direccion: proveedor.direccion || "",
        ciudad: proveedor.ciudad || "",
        departamento: proveedor.departamento || "",
        representanteLegal: proveedor.representanteLegal || "",
        tipoIdentificacionRepresentante: proveedor.tipoIdentificacionRepresentante || proveedor.tipoIdentificacion || "CC",
        identificacionRepresentante: proveedor.identificacionRepresentante || proveedor.numeroIdentificacion || "",
        correoRepresentante: proveedor.correoRepresentante || "",
        telefonoRepresentante: proveedor.telefonoRepresentante || ""
      });

      setIsEditDialogOpen(true);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error preparando edición:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProveedor) return;

    const esJuridico = formData.tipoProveedor === 'Juridico';
    const missingRequired = esJuridico
      ? (
          !formData.nombre.trim() ||
          !formData.identificacion.trim() ||
          !formData.telefono.trim() ||
          !formData.correo.trim() ||
          !formData.direccion.trim() ||
          !formData.ciudad.trim() ||
          !formData.departamento.trim() ||
          !formData.representanteLegal.trim() ||
          !formData.identificacionRepresentante.trim() ||
          !formData.correoRepresentante.trim() ||
          !formData.telefonoRepresentante.trim()
        )
      : (
          !formData.nombre.trim() ||
          !formData.identificacion.trim() ||
          !formData.telefono.trim() ||
          !formData.correo.trim()
        );

    if (missingRequired) {
      setShowProveedorFormErrors(true);
      setProveedorValidationAttempt(prev => prev + 1);
      error('Campos obligatorios', esJuridico ? 'Completa todos los campos obligatorios del formulario.' : 'Completa nombre, identificación, teléfono y correo.');
      return;
    }

    // Validación de formato
    const formatCheck = validateFormatFields(esJuridico);
    if (formatCheck.hasError) {
      setShowProveedorFormErrors(true);
      setProveedorValidationAttempt(prev => prev + 1);
      error('Formato inválido', 'Revisa los campos marcados en rojo.');
      return;
    }

    const dupCheck = validateDuplicateFields(
      {
        nombre: formData.nombre,
        identificacion: formData.identificacion,
        telefono: formData.telefono,
        correo: formData.correo
      },
      selectedProveedor.id
    );
    if (dupCheck.hasError) {
      setProveedorValidationAttempt(prev => prev + 1);
      return;
    }

    try {
      // Para Natural: copiar datos del proveedor a los campos de representante
      const tempFormData = !esJuridico ? {
        ...formData,
        representanteLegal: formData.nombre,
        tipoIdentificacionRepresentante: formData.tipoIdentificacionProveedor,
        identificacionRepresentante: formData.identificacion,
        correoRepresentante: formData.correo,
        telefonoRepresentante: formData.telefono
      } : { ...formData };
      const tempSelectedProveedor = { ...selectedProveedor };
      setIsEditDialogOpen(false);
      if (tempSelectedProveedor.id) {
        await proveedorService.actualizarProveedor(tempSelectedProveedor.id, tempFormData);
        await cargarProveedores(true);
      }
      edited('Proveedor actualizado ✔️', `La información del proveedor "${formData.nombre}" ha sido actualizada exitosamente.`);
      setSelectedProveedor(null);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      const fallbackData = !esJuridico ? {
        ...formData,
        representanteLegal: formData.nombre,
        tipoIdentificacionRepresentante: formData.tipoIdentificacionProveedor,
        identificacionRepresentante: formData.identificacion,
        correoRepresentante: formData.correo,
        telefonoRepresentante: formData.telefono
      } : formData;
      const proveedorActualizado: Proveedor = {
        ...selectedProveedor,
        ...fallbackData
      };
      setProveedores(proveedores.map(p =>
        p.id === selectedProveedor.id ? proveedorActualizado : p
      ));
      edited('Proveedor actualizado ✔️', `La información del proveedor "${formData.nombre}" ha sido actualizada exitosamente.`);
      setSelectedProveedor(null);
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleDeleteClick = (proveedor: Proveedor) => {
    confirmDeleteAction(
      proveedor.nombre,
      async () => {
        try {
          // Pre‑check: compras asociadas a este proveedor
          let comprasAsociadas = 0;
          try {
            const compras = await compraService.getCompras();
            const normalize = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
            comprasAsociadas = (compras || []).filter(c =>
              Number(c.proveedorId) === Number(proveedor.id) ||
              (normalize(c.proveedorNombre) && normalize(c.proveedorNombre) === normalize(proveedor.nombre))
            ).length;
          } catch {}

          if (comprasAsociadas > 0) {
            error(
              "No se puede eliminar",
              `El proveedor "${proveedor.nombre}" no se puede eliminar porque tiene ${comprasAsociadas} compra(s) registradas a su nombre.`
            );
            throw new Error('Proveedor asociado a compras');
          }

          if (proveedor.id) {
            await proveedorService.eliminarProveedor(proveedor.id);
          }
          await cargarProveedores(true);
        } catch (err: any) {
          console.error('Error eliminando proveedor:', err);
          error('Error al eliminar proveedor', err?.message || 'No se pudo eliminar el proveedor.');
        }
      },
      {
        confirmTitle: 'Eliminar Proveedor',
        confirmMessage: `¿Estás seguro de que deseas eliminar el proveedor "${proveedor.nombre}" y toda su información asociada? Esta acción no se puede deshacer.`,
        requireInput: false,
        successTitle: 'Proveedor eliminado ✔️',
        successMessage: `El proveedor "${proveedor.nombre}" ha sido eliminado exitosamente del sistema.`
      }
    );
  };

  const handleViewDetails = async (proveedorPartial: Proveedor) => {
    try {
      let proveedor = proveedorPartial;
      if (proveedorPartial.id) {
        const freshData = await proveedorService.obtenerProveedorPorId(proveedorPartial.id);
        if (freshData) {
          console.log('✨ Datos frescos cargados para detalle:', freshData);
          proveedor = freshData;
        }
      }
      setSelectedProveedor(proveedor);
      setIsDetailDialogOpen(true);
    } catch (error) {
      console.error('Error cargando detalles:', error);
      setSelectedProveedor(proveedorPartial);
      setIsDetailDialogOpen(true);
    }
  };

  const handleToggleStatus = async (proveedor: Proveedor) => {
    if (!proveedor.id) return;
    
    const nuevoEstado = !proveedor.activo;
    
    try {
      // Actualización optimista local
      setProveedores(prev => 
        prev.map(p => p.id === proveedor.id ? { ...p, activo: nuevoEstado, estado: nuevoEstado } : p)
      );
      
      await proveedorService.cambiarEstadoProveedor(proveedor.id, nuevoEstado);
      
      const accion = nuevoEstado ? 'activado' : 'desactivado';
      edited(
        `Proveedor ${accion} ✔️`, 
        `El proveedor "${proveedor.nombre}" ha sido ${accion} exitosamente.`
      );
    } catch (err: any) {
      // Revertir cambio optimista si falla
      setProveedores(prev => 
        prev.map(p => p.id === proveedor.id ? { ...p, activo: !nuevoEstado, estado: !nuevoEstado } : p)
      );
      error(
        "Error al cambiar estado", 
        err?.message || "No se pudo actualizar el estado del proveedor."
      );
    }
  };

  const getTipoProveedorLabel = (tipo: string) => {
    const tipoProveedor = TIPOS_PROVEEDOR.find(t => t.value === tipo);
    return tipoProveedor ? tipoProveedor.label : tipo;
  };

  // Filtrado y paginación
  const norm = (v: unknown) => String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const term = norm(searchTerm);
  const filteredProveedores = proveedores.filter(p => {
    if (!term) return true;
    const nombre = norm(p.nombre);
    const ident = norm(p.identificacion || p.nit);
    const correo = norm(p.correo);
    const telefono = norm((p as any).telefono || (p as any).numero);
    const fecha = norm(p.fechaCreacion);
    const repLegal = norm(p.representanteLegal);
    const direccion = norm(p.direccion);
    const estadoStr = p.activo ? 'activo' : 'inactivo';
    return nombre.includes(term) || ident.includes(term) || correo.includes(term) || telefono.includes(term) || fecha.includes(term) || repLegal.includes(term) || direccion.includes(term) || estadoStr.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredProveedores.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProveedores = filteredProveedores.slice(startIndex, endIndex);

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-lightest">Gestión de Proveedores</h1>
            <p className="text-sm text-gray-lightest mt-1">Administra la red de proveedores</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-black-primary">
        {/* Sección Principal */}
        <div className="std-card">
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="btn-std-primary"
                    onClick={() => {
                      resetForm();
                      setIsEditDialogOpen(false);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Proveedor
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-gray-lightest flex items-center gap-2">
                      <Truck className="w-5 h-5 text-orange-primary" />
                      {isEditDialogOpen ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-lightest">
                      {isEditDialogOpen ? 'Modifique los datos del proveedor seleccionado' : 'Complete los datos del nuevo proveedor en el sistema'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={isEditDialogOpen ? handleEditSubmit : handleSubmit} className="space-y-6 pt-4">
                    <h4 className="text-sm font-normal text-gray-lightest mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-primary" />
                      Información General
                    </h4>
                    {/* Sección 1: Información Básica e Identificación */}
                    <div className="space-y-4">
                      {/* 1. Tipo de Proveedor */}
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <Building className="w-4 h-4 text-orange-primary" />
                          Tipo de Proveedor
                        </Label>
                        <div className="flex gap-2 p-1 bg-gray-darker rounded-xl border border-gray-dark">
                          {TIPOS_PROVEEDOR.map((tipo) => (
                            <button
                              key={tipo.value}
                              type="button"
                              disabled={isEditDialogOpen}
                              onClick={() => {
                                const val = tipo.value as 'Juridico' | 'Natural';
                                setFormData({
                                  ...formData,
                                  tipoProveedor: val,
                                  tipoIdentificacionProveedor: val === 'Juridico' ? 'NIT' : 'CC'
                                });
                              }}
                              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                                formData.tipoProveedor === tipo.value
                                  ? 'bg-orange-primary text-black shadow-[0_0_15px_rgba(216,176,129,0.3)]'
                                  : 'text-gray-lightest hover:bg-gray-dark hover:text-orange-secondary'
                              } ${isEditDialogOpen && formData.tipoProveedor !== tipo.value ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {tipo.value === 'Juridico' ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                              {tipo.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3. Tipo identificación prov. + 4. Identificación */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <IdCard className="w-4 h-4 text-orange-primary" />
                          Tipo identificación
                        </Label>
                        <Select
                          value={formData.tipoIdentificacionProveedor}
                          onValueChange={(val) => setFormData({ ...formData, tipoIdentificacionProveedor: val })}
                        >
                          <SelectTrigger className="elegante-input w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-darkest border-gray-dark">
                            {TIPOS_IDENTIFICACION_PROVEEDOR.map((t) => (
                              <SelectItem key={t.value} value={t.value} className="text-gray-lightest">
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <IdCard className="w-4 h-4 text-orange-primary" />
                          Identificación <span className="text-gray-lightest">*</span>
                        </Label>
                        <Input
                          id="identificacion"
                          value={formData.identificacion}
                          onChange={(e) => setFormData({ ...formData, identificacion: sanitizeIdentificacion(e.target.value, formData.tipoIdentificacionProveedor) })}
                          placeholder={formData.tipoIdentificacionProveedor === 'NIT' ? 'Ej: 900123456-7' : formData.tipoIdentificacionProveedor === 'Pasaporte' ? 'Ej: AB123456' : 'Ej: 1023456789'}
                          maxLength={18}
                          inputMode={formData.tipoIdentificacionProveedor === 'Pasaporte' ? 'text' : 'numeric'}
                          className={`elegante-input ${((showProveedorFormErrors && !formData.identificacion.trim()) || !!duplicateErrors.identificacion || !!formatErrors.identificacion) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                        />
                        {showProveedorFormErrors && !formData.identificacion.trim() && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                        {!!formatErrors.identificacion && (
                          <p className="text-xs text-red-400">{formatErrors.identificacion}</p>
                        )}
                        {!!duplicateErrors.identificacion && (
                          <p className="text-xs text-red-400">{duplicateErrors.identificacion}</p>
                        )}
                      </div>
                    </div>

                    {/* 2. Nombre + 5. Correo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <User className="w-4 h-4 text-orange-primary" />
                          {formData.tipoProveedor === 'Juridico' ? 'Nombre Comercial' : 'Nombre Completo'} <span className="text-gray-lightest">*</span>
                        </Label>
                        <Input
                          id="nombre"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: sanitizeNombre(e.target.value) })}
                          placeholder={formData.tipoProveedor === 'Juridico' ? 'Ej: Suministros Barbería Pro S.A.S' : 'Ej: Carlos Andrés Martínez'}
                          maxLength={150}
                          className={`elegante-input ${((showProveedorFormErrors && !formData.nombre.trim()) || !!duplicateErrors.nombre || !!formatErrors.nombre) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                        />
                        {showProveedorFormErrors && !formData.nombre.trim() && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                        {!!formatErrors.nombre && (
                          <p className="text-xs text-red-400">{formatErrors.nombre}</p>
                        )}
                        {!!duplicateErrors.nombre && (
                          <p className="text-xs text-red-400">{duplicateErrors.nombre}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <Mail className="w-4 h-4 text-orange-primary" />
                          Correo <span className="text-gray-lightest">*</span>
                        </Label>
                        <Input
                          id="correo"
                          type="email"
                          value={formData.correo}
                          onChange={(e) => setFormData({ ...formData, correo: e.target.value.replace(/\s/g, '') })}
                          placeholder="Ej: proveedor@correo.com"
                          maxLength={150}
                          className={`elegante-input ${((showProveedorFormErrors && !formData.correo.trim()) || !!duplicateErrors.correo || !!formatErrors.correo) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                        />
                        {showProveedorFormErrors && !formData.correo.trim() && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                        {!!formatErrors.correo && (
                          <p className="text-xs text-red-400">{formatErrors.correo}</p>
                        )}
                        {!!duplicateErrors.correo && (
                          <p className="text-xs text-red-400">{duplicateErrors.correo}</p>
                        )}
                      </div>
                    </div>

                    {/* 6. Teléfono + 7. Dirección */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <Phone className="w-4 h-4 text-orange-primary" />
                          Teléfono <span className="text-gray-lightest">*</span>
                        </Label>
                        <Input
                          id="telefono"
                          value={formData.telefono}
                          onChange={(e) => setFormData({ ...formData, telefono: sanitizeTelefono(e.target.value) })}
                          placeholder="Ej: +57 301 234 5678"
                          maxLength={20}
                          inputMode="tel"
                          className={`elegante-input ${((showProveedorFormErrors && !formData.telefono.trim()) || !!duplicateErrors.telefono || !!formatErrors.telefono) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                        />
                        {showProveedorFormErrors && !formData.telefono.trim() && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                        {!!formatErrors.telefono && (
                          <p className="text-xs text-red-400">{formatErrors.telefono}</p>
                        )}
                        {!!duplicateErrors.telefono && (
                          <p className="text-xs text-red-400">{duplicateErrors.telefono}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-primary" />
                          Dirección {formData.tipoProveedor === 'Juridico' && <span className="text-gray-lightest">*</span>}
                        </Label>
                        <Input
                          id="direccion"
                          value={formData.direccion}
                          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                          className={`elegante-input ${showProveedorFormErrors && formData.tipoProveedor === 'Juridico' && !formData.direccion.trim() ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                          placeholder="Ej: Calle 72 #10-34, Oficina 501"
                        />
                        {showProveedorFormErrors && formData.tipoProveedor === 'Juridico' && !formData.direccion.trim() && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                      </div>
                    </div>

                    {/* 8. Ciudad + 9. Departamento */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-primary" />
                          Ciudad {formData.tipoProveedor === 'Juridico' && <span className="text-gray-lightest">*</span>}
                        </Label>
                        <Input
                          id="ciudad"
                          value={formData.ciudad}
                          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                          className={`elegante-input ${showProveedorFormErrors && formData.tipoProveedor === 'Juridico' && !formData.ciudad.trim() ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                          placeholder="Ej: Bogotá"
                        />
                        {showProveedorFormErrors && formData.tipoProveedor === 'Juridico' && !formData.ciudad.trim() && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-lightest flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-primary" />
                          Departamento {formData.tipoProveedor === 'Juridico' && <span className="text-gray-lightest">*</span>}
                        </Label>
                        <Input
                          id="departamento"
                          list="departamentos-colombia"
                          value={formData.departamento}
                          onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                          className={`elegante-input ${showProveedorFormErrors && formData.tipoProveedor === 'Juridico' && !formData.departamento.trim() ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                          placeholder="Ej: Cundinamarca"
                        />
                        <datalist id="departamentos-colombia">
                          {DEPARTAMENTOS_COLOMBIA.map((departamento) => (
                            <option key={departamento} value={departamento} />
                          ))}
                        </datalist>
                        {showProveedorFormErrors && formData.tipoProveedor === 'Juridico' && !formData.departamento.trim() && (
                          <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                        )}
                      </div>
                    </div>

                    {/* Sección Representante Legal: campos 10-14 (solo para Jurídico) */}
                    {formData.tipoProveedor === 'Juridico' && (
                      <div className="border-t border-gray-700 pt-4 mt-4">
                        <h4 className="text-sm font-medium text-gray-lightest mb-3 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-orange-primary" />
                          Informacion del Representante
                        </h4>

                        {/* 10. Representante legal + 11. Tipo identificación rep. */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label className="text-gray-lightest flex items-center gap-2">
                              <User className="w-4 h-4 text-orange-primary" />
                              Representante legal <span className="text-gray-lightest">*</span>
                            </Label>
                            <Input
                              id="representanteLegal"
                              value={formData.representanteLegal}
                              onChange={(e) => setFormData({ ...formData, representanteLegal: sanitizeNombre(e.target.value) })}
                              placeholder="Ej: María Elena García"
                              maxLength={150}
                              className={`elegante-input ${(showProveedorFormErrors && !formData.representanteLegal.trim()) || !!formatErrors.representanteLegal ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                            />
                            {showProveedorFormErrors && !formData.representanteLegal.trim() && (
                              <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                            )}
                            {!!formatErrors.representanteLegal && (
                              <p className="text-xs text-red-400">{formatErrors.representanteLegal}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-lightest flex items-center gap-2">
                              <IdCard className="w-4 h-4 text-orange-primary" />
                              Tipo identificación rep. <span className="text-gray-lightest">*</span>
                            </Label>
                            <Select
                              value={formData.tipoIdentificacionRepresentante}
                              onValueChange={(val) => setFormData({ ...formData, tipoIdentificacionRepresentante: val })}
                            >
                              <SelectTrigger className="elegante-input w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-darkest border-gray-dark">
                                {TIPOS_IDENTIFICACION_REPRESENTANTE.map((t) => (
                                  <SelectItem key={t.value} value={t.value} className="text-gray-lightest">
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* 12. Identificación rep. + 13. Correo representante */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label className="text-gray-lightest flex items-center gap-2">
                              <IdCard className="w-4 h-4 text-orange-primary" />
                              Identificación rep. <span className="text-gray-lightest">*</span>
                            </Label>
                            <Input
                              id="identificacionRepresentante"
                              value={formData.identificacionRepresentante}
                              onChange={(e) => setFormData({ ...formData, identificacionRepresentante: sanitizeIdentificacion(e.target.value, formData.tipoIdentificacionRepresentante) })}
                              placeholder={formData.tipoIdentificacionRepresentante === 'Pasaporte' ? 'Ej: AB123456' : 'Ej: 1023456789'}
                              maxLength={18}
                              inputMode={formData.tipoIdentificacionRepresentante === 'Pasaporte' ? 'text' : 'numeric'}
                              className={`elegante-input ${(showProveedorFormErrors && !formData.identificacionRepresentante.trim()) || !!formatErrors.identificacionRepresentante ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                            />
                            {showProveedorFormErrors && !formData.identificacionRepresentante.trim() && (
                              <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                            )}
                            {!!formatErrors.identificacionRepresentante && (
                              <p className="text-xs text-red-400">{formatErrors.identificacionRepresentante}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-gray-lightest flex items-center gap-2">
                              <Mail className="w-4 h-4 text-orange-primary" />
                              Correo representante <span className="text-gray-lightest">*</span>
                            </Label>
                            <Input
                              id="correoRepresentante"
                              type="email"
                              value={formData.correoRepresentante}
                              onChange={(e) => setFormData({ ...formData, correoRepresentante: e.target.value.replace(/\s/g, '') })}
                              placeholder="representante@correo.com"
                              maxLength={150}
                              className={`elegante-input ${(showProveedorFormErrors && !formData.correoRepresentante.trim()) || !!formatErrors.correoRepresentante ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                            />
                            {showProveedorFormErrors && !formData.correoRepresentante.trim() && (
                              <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                            )}
                            {!!formatErrors.correoRepresentante && (
                              <p className="text-xs text-red-400">{formatErrors.correoRepresentante}</p>
                            )}
                          </div>
                        </div>

                        {/* 14. Teléfono representante */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-gray-lightest flex items-center gap-2">
                              <Phone className="w-4 h-4 text-orange-primary" />
                              Teléfono representante <span className="text-gray-lightest">*</span>
                            </Label>
                            <Input
                              id="telefonoRepresentante"
                              value={formData.telefonoRepresentante}
                              onChange={(e) => setFormData({ ...formData, telefonoRepresentante: sanitizeTelefono(e.target.value) })}
                              placeholder="Ej: +57 301 111 2222"
                              maxLength={20}
                              inputMode="tel"
                              className={`elegante-input ${(showProveedorFormErrors && !formData.telefonoRepresentante.trim()) || !!formatErrors.telefonoRepresentante ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                            />
                            {showProveedorFormErrors && !formData.telefonoRepresentante.trim() && (
                              <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                            )}
                            {!!formatErrors.telefonoRepresentante && (
                              <p className="text-xs text-red-400">{formatErrors.telefonoRepresentante}</p>
                            )}
                          </div>
                          <div className="space-y-2" />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setIsEditDialogOpen(false);
                          resetForm();
                        }}
                        className="elegante-button-secondary"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="elegante-button-primary"
                      >
                        {isEditDialogOpen ? 'Actualizar Proveedor' : 'Agregar Proveedor'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar por nombre, NIT, correo o tipo..."
            recordsText={`Mostrando ${currentProveedores.length} de ${filteredProveedores.length} proveedores`}
            recordsPlacement="right"
          />

          {/* Tabla de Proveedores */}
          <div className="std-table-wrapper">
            <table className="std-table">
              <thead className={loading ? "std-thead [&_th]:!text-transparent [&_th]:select-none" : "std-thead"}>
                <tr className="border-b border-gray-dark">
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">NIT/Documento</th>
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Proveedor</th>
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Contacto</th>
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                  <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody className="std-tbody">
                {loading ? (
                  <TableLoadingStateRow
                    colSpan={5}
                    title="Cargando proveedores..."
                  />
                ) : pageError ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white-primary mb-2">Error de conexión</h3>
                      <p className="text-gray-lightest mb-4">{pageError}</p>
                      <button
                        onClick={() => cargarProveedores()}
                        className="elegante-button-primary text-sm"
                      >
                        Reintentar
                      </button>
                    </td>
                  </tr>
                ) : currentProveedores.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={5}
                    title="No se encontraron proveedores"
                    description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                    onReload={cargarProveedores}
                    reloadLabel="Recargar tabla"
                  />
                ) : (
                  currentProveedores.map((proveedor) => (
                    <tr
                      key={proveedor.id}
                      className="border-b border-gray-dark hover:bg-gray-darker transition-colors"
                    >
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-lighter">{proveedor.identificacion || proveedor.nit}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3 justify-center sm:justify-start">
                          <div className="w-8 h-8 bg-orange-primary rounded-lg flex items-center justify-center shrink-0">
                            {proveedor.tipoProveedor === 'Juridico' ? (
                              <Building className="w-4 h-4 text-black-primary" />
                            ) : (
                              <User className="w-4 h-4 text-black-primary" />
                            )}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="text-sm text-gray-lighter font-medium truncate w-full">{proveedor.nombre}</span>
                            {proveedor.tipoProveedor === 'Juridico' && (
                              <span className="text-[10px] text-gray-lightest italic truncate w-full" title="Representante Legal">
                                {proveedor.representanteLegal || '-'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-lighter">{proveedor.correo || '-'}</span>
                          <span className="text-xs text-gray-lightest">{(proveedor as any).telefono || (proveedor as any).numero || ''}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`std-badge ${proveedor.activo ? 'std-badge-positive' : 'std-badge-negative'}`}>
                          {proveedor.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(proveedor)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title={proveedor.activo ? "Desactivar proveedor" : "Activar proveedor"}
                          >
                            {proveedor.activo ? (
                              <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleViewDetails(proveedor)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                          <button
                            onClick={() => handleEdit(proveedor)}
                            disabled={!proveedor.activo}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={proveedor.activo ? "Editar" : "Proveedor inactivo (solo historial)"}
                          >
                            <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteClick(proveedor)}
                            disabled={!proveedor.activo}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={proveedor.activo ? "Eliminar" : "Proveedor inactivo (solo historial)"}
                          >
                            <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {!pageError && (
            <div className="std-full-divider flex items-center justify-between pt-6 mt-0">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-lightest">
                  Página {currentPage} de {totalPages}
                </div>
              </div>
              <EllipsisPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
                className="mx-0 w-auto justify-end"
              />
            </div>
          )}
        </div>

        {/* Lista de proveedores - OLD */}
        <div className="elegante-card" style={{ display: 'none' }}>
          {currentProveedores.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-gray-medium mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white-primary mb-2">No hay proveedores</h3>
              <p className="text-gray-lightest">
                {searchTerm ? 'No se encontraron proveedores con ese criterio de búsqueda.' : 'Comience agregando un nuevo proveedor.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Encabezados de tabla */}
              <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-dark bg-gray-darker">
                <div className="text-sm font-normal text-gray-lightest">ID</div>
                <div className="text-sm font-normal text-gray-lightest">Proveedor</div>
                <div className="text-sm font-normal text-gray-lightest">Fecha</div>
                <div className="text-sm font-normal text-gray-lightest">Total</div>
                <div className="text-sm font-normal text-gray-lightest">Estado</div>
                <div className="text-sm font-normal text-gray-lightest">Acciones</div>
              </div>

              {/* Filas de datos */}
              <div className="space-y-0">
                {currentProveedores.map((proveedor) => (
                  <div
                    key={proveedor.id}
                    className="grid grid-cols-6 gap-4 p-4 border-b border-gray-dark hover:bg-gray-darker transition-colors"
                  >
                    {/* ID */}
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-primary rounded-lg flex items-center justify-center mr-3">
                        {proveedor.tipoProveedor === 'Juridico' ? (
                          <Building className="w-4 h-4 text-black-primary" />
                        ) : (
                          <User className="w-4 h-4 text-black-primary" />
                        )}
                      </div>
                      <span className="text-sm text-gray-lightest">{proveedor.id}</span>
                    </div>

                    {/* Proveedor */}
                    <div>
                      <div className="text-sm text-gray-lightest">{proveedor.nombre}</div>
                      <div className="text-xs text-gray-lightest">{proveedor.correo}</div>
                    </div>

                    {/* Fecha */}
                    <div className="flex items-center">
                      <span className="text-sm text-gray-lightest">{proveedor.fechaCreacion}</span>
                    </div>

                    {/* Total */}
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-primary-orange">
                        ${(Math.random() * 3000000 + 500000).toLocaleString('es-CO')}
                      </span>
                      <div className="text-xs text-gray-lightest ml-1">
                        {proveedor.tipoProveedor === 'Juridico' ? 'Transferencia' : 'Efectivo'}
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center">
                      <span className={`px-2 text-sm py-1 rounded-full text-[2px]  ${proveedor.activo ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(proveedor)}
                        className="elegante-button-secondary p-2 h-8 w-8"
                        title={proveedor.activo ? "Desactivar proveedor" : "Activar proveedor"}
                      >
                        {proveedor.activo ? (
                          <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(proveedor)}
                        className="elegante-button-secondary p-2 h-8 w-8"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(proveedor)}
                        disabled={!proveedor.activo}
                        className="elegante-button-secondary p-2 h-8 w-8 disabled:opacity-50"
                        title={proveedor.activo ? "Editar" : "Proveedor inactivo (solo historial)"}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(proveedor)}
                        disabled={!proveedor.activo}
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white p-2 h-8 w-8 disabled:opacity-50"
                        title={proveedor.activo ? "Eliminar" : "Proveedor inactivo (solo historial)"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
      </main>

      {/* Modal de Detalle */}
      {selectedProveedor && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white-primary flex items-center gap-2">
                <Eye className="w-5 h-5 text-orange-primary" />
                Detalle del Proveedor
              </DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Información completa del proveedor seleccionado
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {/* 1 + 2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <Building className="w-4 h-4 text-orange-primary" />
                    Tipo de Proveedor
                  </Label>
                  <Input
                    value={getTipoProveedorLabel(selectedProveedor.tipoProveedor || 'Juridico')}
                    disabled
                    className="elegante-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-primary" />
                    Nombre proveedor
                  </Label>
                  <Input
                    value={selectedProveedor.nombre || ''}
                    disabled
                    className="elegante-input"
                  />
                </div>
              </div>

              {/* 3 + 4 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-orange-primary" />
                    Tipo identificación prov.
                  </Label>
                  <Input
                    value={selectedProveedor.tipoIdentificacionProveedor || ''}
                    disabled
                    className="elegante-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-orange-primary" />
                    Identificación
                  </Label>
                  <Input
                    value={selectedProveedor.identificacion || selectedProveedor.nit || ''}
                    disabled
                    className="elegante-input"
                  />
                </div>
              </div>

              {/* 5 + 6 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-primary" />
                    Correo
                  </Label>
                  <Input
                    value={selectedProveedor.correo || ''}
                    disabled
                    className="elegante-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <Phone className="w-4 h-4 text-orange-primary" />
                    Teléfono
                  </Label>
                  <Input
                    value={(selectedProveedor.telefono as string) || selectedProveedor.numero || ''}
                    disabled
                    className="elegante-input"
                  />
                </div>
              </div>

              {/* 7 */}
              <div className="space-y-2">
                <Label className="text-gray-lightest flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-primary" />
                  Dirección
                </Label>
                <Input
                  value={selectedProveedor.direccion || ''}
                  disabled
                  className="elegante-input"
                />
              </div>

              {/* 8 + 9 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-primary" />
                    Ciudad
                  </Label>
                  <Input
                    value={selectedProveedor.ciudad || ''}
                    disabled
                    className="elegante-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-lightest flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-primary" />
                    Departamento
                  </Label>
                  <Input
                    value={selectedProveedor.departamento || ''}
                    disabled
                    className="elegante-input"
                  />
                </div>
              </div>

              {/* Sección Representante (solo para Jurídico) */}
              {selectedProveedor.tipoProveedor === 'Juridico' && (
                <>
                  <h4 className="text-sm font-medium text-white-primary mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-orange-primary" />
                    Representante Legal
                  </h4>

                  {/* 10 */}
                  <div className="space-y-2">
                    <Label className="text-gray-lightest flex items-center gap-2">
                      <User className="w-4 h-4 text-orange-primary" />
                      Representante legal
                    </Label>
                    <Input
                      value={selectedProveedor.representanteLegal || ''}
                      disabled
                      className="elegante-input"
                    />
                  </div>

                  {/* 11 + 12 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-lightest flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-orange-primary" />
                        Tipo identificación rep.
                      </Label>
                      <Input
                        value={selectedProveedor.tipoIdentificacionRepresentante || selectedProveedor.tipoIdentificacion || ''}
                        disabled
                        className="elegante-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-lightest flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-orange-primary" />
                        Identificación rep.
                      </Label>
                      <Input
                        value={selectedProveedor.identificacionRepresentante || selectedProveedor.numeroIdentificacion || ''}
                        disabled
                        className="elegante-input"
                      />
                    </div>
                  </div>

                  {/* 13 + 14 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-lightest flex items-center gap-2">
                        <Mail className="w-4 h-4 text-orange-primary" />
                        Correo representante
                      </Label>
                      <Input
                        value={selectedProveedor.correoRepresentante || ''}
                        disabled
                        className="elegante-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-lightest flex items-center gap-2">
                        <Phone className="w-4 h-4 text-orange-primary" />
                        Teléfono representante
                      </Label>
                      <Input
                        value={selectedProveedor.telefonoRepresentante || ''}
                        disabled
                        className="elegante-input"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDetailDialogOpen(false)}
                className="elegante-button-secondary"
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertContainer />
      <DoubleConfirmationContainer />
    </>
  );
}
