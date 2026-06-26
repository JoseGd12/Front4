import { useState, useEffect, useRef } from "react";
import { clientesService, Cliente, CreateClienteData } from "../services/clientesService";
import { devolucionService } from "../../ventas/services/devolucionService";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import {
  Users,
  User as UserIcon,
  Phone,
  Mail,
  Edit,
  Search,
  Eye,
  Calendar,
  UserCheck,
  UserPlus,
  MapPin,
  Wallet,
  TrendingUp,
  Camera,
  X,
  ToggleLeft,
  ToggleRight,
  UserX,
  Trash2,
  FileText,
  Hash,
  Filter,
  MoreVertical,
  KeyRound
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Input } from "../../../shared/components/ui/input";
import { NameInput } from "../../../shared/components/ui/NameInput";
import { PhoneInput } from "../../../shared/components/ui/PhoneInput";
import { Label } from "../../../shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { DatePicker } from "../../../shared/components/ui/DatePicker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { DiscardChangesDialog } from "../../../shared/components/ui/discard-changes-dialog";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { StandardTable, resolveStatusVariant, ColumnDef } from "../../../shared/components/ui/standard-table";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { notifyEntityCreated } from "../../../shared/services/notificationService";
import { firebaseAuthService } from "../../../shared/services/firebase";
import { apiService } from "../../../shared/services/api";
import { barberosService } from "../../administracion/services/barberosService";

// Tipos de documento
const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CE', label: 'Cédula de Extranjería' },
];

/** Normaliza cualquier forma almacenada al valor canónico del Select */
const normalizarTipoDoc = (tipo: string | undefined): string => {
  if (!tipo) return 'CC';
  const t = tipo.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (t === 'cc' || t === 'cedula' || t.includes('ciudadan')) return 'CC';
  if (t === 'ti' || t.includes('tarjeta') || t.includes('identidad')) return 'TI';
  if (t === 'ce' || t.includes('extranjeria')) return 'CE';
  return 'CC';
};

const CLIENTE_LIMITS = {
  numeroDocumento: 10,
  nombre: 100,
  apellido: 100,
  email: 100,
  telefono: 20,
  direccion: 150,
  barrio: 100
};

// Interface para devoluciones (simulada desde el módulo de devoluciones)

// Interface para devoluciones (simulada desde el módulo de devoluciones)
interface Devolucion {
  id: string;
  cliente: string;
  clienteId: string;
  producto: string;
  tipo: 'Producto' | 'Servicio';
  motivoCategoria: string;
  motivoDetalle: string;
  observaciones?: string;
  fecha: string;
  hora: string;
  monto: number;
  estado: 'Activo' | 'Inactivo';
  responsable: string;
  numeroVenta: string;
  saldoAFavor: number;
}


export function ClientesPage() {
  const { success, error, created, edited, deleted, AlertContainer } = useCustomAlert();
  const { confirmDeleteAction, DoubleConfirmationContainer } = useDoubleConfirmation();
  const { isAdmin, resetPassword } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [formError, setFormError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Estados para acciones de cliente
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    tipoDocumento: 'CC',
    numeroDocumento: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    barrio: '',
    fechaNacimiento: '',
    fotoPerfil: ''
  });
  const [editSelectedProfileImage, setEditSelectedProfileImage] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [createForm, setCreateForm] = useState({
    tipoDocumento: 'CC',
    numeroDocumento: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    direccion: '',
    barrio: '',
    fechaNacimiento: '',
    fotoPerfil: ''
  });

  // Estados para manejo de foto de perfil
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateValidation, setShowCreateValidation] = useState(false);
  const [showEditValidation, setShowEditValidation] = useState(false);
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const [isConfirmDiscardCreateOpen, setIsConfirmDiscardCreateOpen] = useState(false);
  const [isConfirmDiscardEditOpen, setIsConfirmDiscardEditOpen] = useState(false);

  const isCreateFormDirty = () => {
    return (
      createForm.nombre !== '' ||
      createForm.apellido !== '' ||
      createForm.numeroDocumento !== '' ||
      createForm.email !== '' ||
      createForm.telefono !== '' ||
      createForm.direccion !== '' ||
      createForm.barrio !== '' ||
      createForm.fechaNacimiento !== '' ||
      previewUrl !== null
    );
  };

  const isEditFormDirty = () => {
    if (!selectedCliente) return false;
    return (
      editForm.nombre !== (selectedCliente.nombre || '') ||
      editForm.apellido !== (selectedCliente.apellido || '') ||
      editForm.tipoDocumento !== (selectedCliente.tipoDocumento || 'CC') ||
      editForm.numeroDocumento !== (selectedCliente.numeroDocumento || '') ||
      editForm.email !== (selectedCliente.email || '') ||
      editForm.telefono !== (selectedCliente.telefono || '') ||
      editForm.direccion !== (selectedCliente.direccion || '') ||
      editForm.barrio !== (selectedCliente.barrio || '') ||
      editForm.fechaNacimiento !== (selectedCliente.fechaNacimiento ? selectedCliente.fechaNacimiento.split('T')[0] : '') ||
      editPreviewUrl !== (selectedCliente.fotoPerfil || null)
    );
  };

  const handleCreateDialogCloseAttempt = (open: boolean) => {
    if (!open) {
      if (isCreateFormDirty()) {
        setIsConfirmDiscardCreateOpen(true);
      } else {
        setShowCreateValidation(false);
        setIsCreateDialogOpen(false);
      }
    } else {
      setIsCreateDialogOpen(true);
    }
  };

  const handleEditDialogCloseAttempt = (open: boolean) => {
    if (!open) {
      if (isEditFormDirty()) {
        setIsConfirmDiscardEditOpen(true);
      } else {
        setShowEditValidation(false);
        setIsEditDialogOpen(false);
      }
    } else {
      setIsEditDialogOpen(true);
    }
  };
  const [clienteGeneratedPassword, setClienteGeneratedPassword] = useState('');
  const [createInFirebase, setCreateInFirebase] = useState(true);
  const [usuariosAll, setUsuariosAll] = useState<any[]>([]);
  const [barberosAll, setBarberosAll] = useState<any[]>([]);
  const formatDateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayLocal = new Date();
  const maxBirthDateEight = formatDateLocal(new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate()));
  const minBirthDate = formatDateLocal(new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate()));
  const edadCreateCliente = (() => {
    if (!createForm.fechaNacimiento) return null;
    const d = new Date(createForm.fechaNacimiento);
    if (isNaN(d.getTime())) return null;
    const today = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
    return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  })();
  const isTooYoungCreateCliente = (edadCreateCliente ?? 1000) < 8;
  const isDocDuplicateCreateCliente = (() => {
    const docVal = String(createForm.numeroDocumento || '').trim();
    if (!docVal) return false;
    const existeCliente = clientes.some(c => String(c.numeroDocumento || '').trim() === docVal);
    const existeUsuario = usuariosAll.some((u: any) => String(u.documento || '').trim() === docVal);
    const existeBarbero = barberosAll.some((b: any) => String(b.documento || '').trim() === docVal);
    return existeCliente || existeUsuario || existeBarbero;
  })();
  const isEmailDuplicateCreateCliente = (() => {
    const emailVal = String(createForm.email || '').trim().toLowerCase();
    if (!emailVal) return false;
    const existeCliente = clientes.some(c => String(((c as any).email || (c as any).correo || (c as any).Correo) || '').trim().toLowerCase() === emailVal);
    const existeUsuario = usuariosAll.some((u: any) => String(u.correo || '').trim().toLowerCase() === emailVal);
    const existeBarbero = barberosAll.some((b: any) => String(b.correo || '').trim().toLowerCase() === emailVal);
    return existeCliente || existeUsuario || existeBarbero;
  })();

  const generateClientePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setClienteGeneratedPassword(password);
  };

  // Cargar clientes desde la API al montar el componente
  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const [data, devsData, usuariosData, barberosData] = await Promise.all([
        clientesService.getClientes(),
        devolucionService.getDevoluciones().catch(() => []),
        apiService.getUsuarios().catch(() => []),
        barberosService.getBarberos().catch(() => [])
      ]);

      // Guardar devoluciones para otros usos (historial en modal)
      const formattedDevs: Devolucion[] = (devsData || []).map((d: any) => ({
        id: String(d.id),
        cliente: d.clienteNombre || 'Cliente',
        clienteId: String(d.clienteId || ''),
        producto: d.productoNombre || 'Producto',
        tipo: 'Producto',
        motivoCategoria: d.motivo,
        motivoDetalle: d.motivo, // Usar el mismo motivo como detalle por simplicidad
        fecha: d.fecha ? new Date(d.fecha).toLocaleDateString('es-CO') : '',
        hora: d.fecha ? new Date(d.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '',
        monto: Number(d.monto) || 0,
        estado: d.estado === 'Completada' ? 'Activo' : 'Inactivo', // Mapear a los estados locales
        responsable: d.responsableNombre || 'Responsable',
        numeroVenta: String(d.ventaId || ''),
        saldoAFavor: Number(d.saldoAFavor) || 0
      }));
      setDevoluciones(formattedDevs);

      const baseClientes = data.map(cliente => clientesService.mapApiToComponent(cliente));
      // Saldo real (devoluciones - saldoUsado) directo desde el endpoint del backend
      const saldoMap = await clientesService.getSaldosDisponibles(
        baseClientes.map(c => Number(c.id)).filter(n => n > 0)
      );
      const mappedData = baseClientes.map(c => ({
        ...c,
        saldoAFavor: saldoMap.get(Number(c.id)) ?? 0
      }));
      setClientes(mappedData);
      setUsuariosAll(usuariosData || []);
      setBarberosAll((barberosData || []).map((b: any) => barberosService.mapApiToComponent(b)));
    } catch (err: unknown) {
      console.error('Error cargando clientes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error', `No se pudieron cargar los clientes: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };


  const filteredClientes = clientes.filter(cliente => {
    const term = searchTerm.trim().toLowerCase();
    const estadoLabel = cliente.activo ? 'activo' : 'inactivo';
    const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.toLowerCase();
    const searchMatch = term === '' ||
      nombreCompleto.includes(term) ||
      (cliente.numeroDocumento || '').toLowerCase().includes(term) ||
      (cliente.email || '').toLowerCase().includes(term) ||
      (cliente.telefono || '').toLowerCase().includes(term) ||
      (cliente.direccion || '').toLowerCase().includes(term) ||
      estadoLabel.includes(term);

    const statusMatch = statusFilter === 'all' ||
      (statusFilter === 'active' && cliente.activo) ||
      (statusFilter === 'inactive' && !cliente.activo);

    return searchMatch && statusMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredClientes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedClientes = filteredClientes.slice(startIndex, startIndex + itemsPerPage);

  // Funciones para manejo de imagen de perfil
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        error('Archivo inválido', 'Por favor selecciona una imagen válida (JPG, PNG, etc.)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        error('Archivo muy grande', 'La imagen debe pesar menos de 5MB');
        return;
      }

      setSelectedProfileImage(file);

      // Crear URL de vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = () => {
    setSelectedProfileImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCreateClick = () => {
    setCreateForm({
      tipoDocumento: 'CC',
      numeroDocumento: '',
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      direccion: '',
      barrio: '',
      fechaNacimiento: '',
      fotoPerfil: ''
    });
    setSelectedProfileImage(null);
    setPreviewUrl(null);
    setFormError('');
    setShowCreateValidation(false);
    generateClientePassword();
    setIsCreateDialogOpen(true);
  };

  const validateForm = (form: any) => {
    if (!form.tipoDocumento || !form.numeroDocumento || !form.nombre || !form.apellido || !form.email || !form.fechaNacimiento || !form.telefono) {
      return false;
    }

    // Validar email (el error se muestra inline en el campo)
    if (!isValidEmail(form.email)) {
      return false;
    }

    const docVal = String(form.numeroDocumento || '').trim();
    const documentoExisteCliente = clientes.some(c => String(c.numeroDocumento || '').trim() === docVal);
    const documentoExisteUsuario = usuariosAll.some((u: any) => String(u.documento || '').trim() === docVal);
    const documentoExisteBarbero = barberosAll.some((b: any) => String(b.documento || '').trim() === docVal);

    if (documentoExisteCliente || documentoExisteUsuario || documentoExisteBarbero) {
      error('Documento duplicado', 'Ya existe un registro con este número de documento (Usuario/Cliente/Barbero).');
      return false;
    }

    // Verificar si el email ya existe globalmente
    const emailVal = String(form.email || '').trim().toLowerCase();
    if (emailVal) {
      const existeCliente = clientes.some(c => String(((c as any).email || (c as any).correo || (c as any).Correo) || '').trim().toLowerCase() === emailVal);
      const existeUsuario = usuariosAll.some((u: any) => String(u.correo || '').trim().toLowerCase() === emailVal);
      const existeBarbero = barberosAll.some((b: any) => String(b.correo || '').trim().toLowerCase() === emailVal);
      if (existeCliente || existeUsuario || existeBarbero) {
        return false;
      }
    }

    if (form.fechaNacimiento) {
      const birth = new Date(form.fechaNacimiento);
      const cutoff = new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate());
      const min = new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate());
      const edad = Math.floor((cutoff.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + 8;
      if (isNaN(birth.getTime())) {
        error('Fecha de nacimiento inválida', 'Ingresa una fecha válida en formato AAAA-MM-DD.');
        return false;
      }
      if (birth > cutoff) {
        error('Edad mínima no válida', 'Debe tener al menos 8 años de edad.');
        return false;
      }
      if (birth < min) {
        error('Fecha de nacimiento inválida', 'No se admiten edades mayores a 70 años.');
        return false;
      }
      if (edad < 8) {
        error('Edad mínima no válida', 'Debe tener al menos 8 años de edad.');
        return false;
      }
    }

    return true;
  };

  const handleCreateCliente = async () => {
    setShowCreateValidation(true);
    if (!validateForm(createForm)) {
      return;
    }
    
    // Ejecutar creación directamente
    await confirmCreateCliente();
  };

  const confirmCreateCliente = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      let fotoPerfilUrl = '';
      if (selectedProfileImage) {
        try {
          fotoPerfilUrl = await apiService.uploadImage(selectedProfileImage);
        } catch (e: any) {
          error('Error al subir imagen', 'No se pudo subir la imagen del cliente. Intenta nuevamente o continúa sin imagen.');
          fotoPerfilUrl = '';
        }
      }

      // Preparar datos para la API
      const createData: CreateClienteData = {
        nombre: createForm.nombre,
        apellido: createForm.apellido,
        documento: createForm.numeroDocumento,
        correo: createForm.email,
        telefono: createForm.telefono,
        fechaNacimiento: createForm.fechaNacimiento ? formatDateForAPI(createForm.fechaNacimiento) : '',
        direccion: createForm.direccion,
        barrio: createForm.barrio,
        fotoPerfil: fotoPerfilUrl
      };

      // Crear cliente en la API
      const createdClienteAPI = await clientesService.createCliente({ ...createData, contrasena: clienteGeneratedPassword } as any);
      const mappedCliente = clientesService.mapApiToComponent(createdClienteAPI);

      await notifyEntityCreated('cliente', {
        id: mappedCliente.id,
        nombre: mappedCliente.nombre,
        apellido: mappedCliente.apellido,
        correo: mappedCliente.email,
        telefono: mappedCliente.telefono
      });
      setClientes([mappedCliente, ...clientes]);
      setShowCreateValidation(false);
      setIsCreateDialogOpen(false);
      setCreateForm({
        tipoDocumento: 'CC',
        numeroDocumento: '',
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        direccion: '',
        barrio: '',
        fechaNacimiento: '',
        fotoPerfil: ''
      });
      setSelectedProfileImage(null);
      setPreviewUrl(null);
      setFormError('');

      created('Cliente creado exitosamente ✔️', `El cliente ${mappedCliente.nombre} ${mappedCliente.apellido} ha sido registrado en el sistema.`);

      if (createInFirebase) {
        try {
          const tempPass = (clienteGeneratedPassword && clienteGeneratedPassword.length >= 6)
            ? clienteGeneratedPassword
            : Math.random().toString(36).slice(-8) + "A1";
          await firebaseAuthService.createUserWithoutAffectingSession(
            mappedCliente.email,
            tempPass,
            { sendVerification: true, sendPasswordReset: false }
          );
          created('Correo de verificación enviado', `Se envió un email de verificación a ${mappedCliente.email}. Al verificarlo, el cliente deberá usar "Olvidé mi contraseña" para acceder.`);
        } catch (fbErr: any) {
          const msg = String(fbErr?.message || '').toLowerCase();
          if (msg.includes('already')) {
            created('Cuenta ya registrada', `El correo ${mappedCliente.email} ya tiene cuenta en Firebase. El cliente puede iniciar sesión directamente.`);
          } else {
            error('No se pudo crear cuenta en Firebase', 'Verifica el correo del cliente e intenta nuevamente.');
          }
        }
      }
    } catch (err: unknown) {
      console.error('Error creando cliente:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error', `No se pudo crear el cliente: ${errorMessage}`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Función para formatear moneda colombiana
  const formatCurrency = (amount: number | undefined | null): string => {
    return (amount ?? 0).toLocaleString('es-CO');
  };

  // Función para obtener el estado texto
  const getEstadoTexto = (ultimaVisita?: string) => {
    if (!ultimaVisita) return "Nuevo";

    const fechaVisita = new Date(ultimaVisita.split('-').reverse().join('-'));
    const ahora = new Date();
    const diasSinVisitar = Math.floor((ahora.getTime() - fechaVisita.getTime()) / (1000 * 60 * 60 * 24));

    if (diasSinVisitar <= 30) return "Activo";
    if (diasSinVisitar <= 60) return "Regular";
    return "Inactivo";
  };

  // Función para obtener las devoluciones de un cliente
  const getDevolucionesCliente = (clienteId: string) => {
    return devoluciones
      .filter(d => d.clienteId === clienteId)
      .sort((a, b) => new Date(b.fecha.split('-').reverse().join('-')).getTime() - new Date(a.fecha.split('-').reverse().join('-')).getTime());
  };

  // Funciones de paginación
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(10);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Resetear página cuando se filtra
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Funciones para acciones de cliente
  const handleViewCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsViewDialogOpen(true);
  };

  const handleEditCliente = (cliente: Cliente) => {
    if (!cliente.activo) {
      error('Registro inactivo', 'Este cliente está inactivo y se maneja solo como historial.');
      return;
    }
    setSelectedCliente(cliente);
    setEditForm({
      tipoDocumento: normalizarTipoDoc(cliente.tipoDocumento),
      numeroDocumento: cliente.numeroDocumento,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      barrio: cliente.barrio,
      fechaNacimiento: cliente.fechaNacimiento
        ? cliente.fechaNacimiento.split("T")[0]
        : "",
      fotoPerfil: cliente.fotoPerfil || ''
    });

    // Si tiene foto de perfil, mostrarla en la edición
    if (cliente.fotoPerfil) {
      setEditPreviewUrl(cliente.fotoPerfil);
    } else {
      setEditPreviewUrl(null);
    }
    setEditSelectedProfileImage(null);
    setShowEditValidation(false);

    setIsEditDialogOpen(true);
  };

  const handleEditImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        error('Archivo inválido', 'Por favor selecciona una imagen válida (JPG, PNG, etc.)');
        return;
      }

      // Validar tamaño de archivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        error('Archivo muy grande', 'La imagen debe pesar menos de 5MB');
        return;
      }

      setEditSelectedProfileImage(file);

      // Crear URL de vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEditProfileImage = () => {
    setEditSelectedProfileImage(null);
    setEditPreviewUrl(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
    setEditForm({ ...editForm, fotoPerfil: '' });
  };

  const triggerEditFileSelect = () => {
    editFileInputRef.current?.click();
  };

  const validateEditForm = (form: any) => {
    if (!form.tipoDocumento || !form.numeroDocumento || !form.nombre || !form.apellido || !form.email || !form.fechaNacimiento || !form.telefono) {
      return false;
    }

    // Validar email (el error se muestra inline en el campo)
    if (!isValidEmail(form.email)) {
      return false;
    }

    if (form.numeroDocumento !== selectedCliente?.numeroDocumento) {
      const docVal = String(form.numeroDocumento || '').trim();
      const documentoExisteCliente = clientes.some(c =>
        c.id !== selectedCliente?.id &&
        String(c.numeroDocumento || '').trim() === docVal
      );
      const documentoExisteUsuario = usuariosAll.some((u: any) => String(u.documento || '').trim() === docVal);
      const documentoExisteBarbero = barberosAll.some((b: any) => String(b.documento || '').trim() === docVal);
      if (documentoExisteCliente || documentoExisteUsuario || documentoExisteBarbero) {
        return false;
      }
    }

    // Verificar si el email ya existe (excepto el cliente actual)
    const emailExiste = clientes.some(c => c.id !== selectedCliente?.id && c.email === form.email);

    if (emailExiste) {
      error('Email duplicado', 'Ya existe otro cliente registrado con este email.');
      return false;
    }

    if (form.fechaNacimiento) {
      const birth = new Date(form.fechaNacimiento);
      const cutoff = new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate());
      const min = new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate());
      const edad = Math.floor((cutoff.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + 8;
      if (isNaN(birth.getTime())) {
        error('Fecha de nacimiento inválida', 'Ingresa una fecha válida en formato AAAA-MM-DD.');
        return false;
      }
      if (birth > cutoff) {
        error('Edad mínima no válida', 'Debe tener al menos 8 años de edad.');
        return false;
      }
      if (birth < min) {
        error('Fecha de nacimiento inválida', 'No se admiten edades mayores a 70 años.');
        return false;
      }
      if (edad < 8) {
        error('Edad mínima no válida', 'Debe tener al menos 8 años de edad.');
        return false;
      }
    }

    return true;
  };

  const handleSendPasswordSetup = async (email: string) => {
    try {
      const res = await resetPassword(email);
      if (res.success) {
        success('Enlace enviado', 'Se envió un enlace para configurar la contraseña.');
      } else {
        error('No se pudo enviar', res.error || 'Intenta nuevamente.');
      }
    } catch (e: any) {
      error('No se pudo enviar', e?.message || 'Intenta nuevamente.');
    }
  };

  const handleSaveEditCliente = () => {
    if (!validateEditForm(editForm)) {
      setShowEditValidation(true);
      return;
    }
    setIsEditConfirmOpen(true);
  };

  // Función para formatear fecha para la API
  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const year = date.getFullYear();

    // Validar que el año sea razonable (entre 1900 y año actual + 100)
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 100) {
      console.warn('Año inválido:', year);
      return '';
    }

    return date.toISOString().split('T')[0];
  };

  const confirmEditCliente = async () => {
    if (!selectedCliente || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      let fotoPerfilFinal = selectedCliente.fotoPerfil || '';
      if (editSelectedProfileImage) {
        try {
          fotoPerfilFinal = await apiService.uploadImage(editSelectedProfileImage);
        } catch (e: any) {
          error('Error al subir imagen', 'No se pudo subir la nueva imagen del cliente. Intenta nuevamente o continúa sin cambios en la imagen.');
          fotoPerfilFinal = selectedCliente.fotoPerfil || '';
        }
      } else if (editPreviewUrl) {
        fotoPerfilFinal = editPreviewUrl;
      }

      // Preparar datos para la API
      const updateData: any = {
        id: parseInt(selectedCliente.id),
        usuarioId: selectedCliente.usuarioId,
        nombre: editForm.nombre,
        apellido: editForm.apellido,
        documento: editForm.numeroDocumento,
        correo: editForm.email,
        telefono: editForm.telefono,
        fechaNacimiento: editForm.fechaNacimiento ? formatDateForAPI(editForm.fechaNacimiento) : '',
        direccion: editForm.direccion,
        barrio: editForm.barrio,
        fotoPerfil: fotoPerfilFinal,
        estado: selectedCliente.activo // Pasar el estado actual del cliente
      };

      // Actualizar cliente en la API
      await clientesService.updateCliente(parseInt(selectedCliente.id), updateData);

      // Si el correo cambió, enviar enlace de restablecimiento de contraseña automáticamente
      if (editForm.email !== selectedCliente.email) {
        try {
          const res = await resetPassword(editForm.email);
          if (res.success) {
            success('Enlace enviado', 'Se envió un enlace al nuevo correo para configurar la contraseña.');
          } else {
            error('No se pudo enviar el enlace', res.error || 'No se pudo enviar el correo de restablecimiento.');
          }
        } catch (e: any) {
          error('Error', e?.message || 'No se pudo enviar el correo de restablecimiento.');
        }
      }

      setShowEditValidation(false);
      setIsEditDialogOpen(false);
      setIsEditConfirmOpen(false);
      setSelectedCliente(null);
      setEditForm({});
      setEditSelectedProfileImage(null);
      setEditPreviewUrl(null);

      await loadClientes();

      edited('Cliente actualizado exitosamente', `Los datos de han sido actualizados.`);
    } catch (err: unknown) {
      console.error('Error actualizando cliente:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error', `No se pudo actualizar el cliente: ${errorMessage}`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Función para eliminar cliente
  const handleDeleteCliente = (cliente: Cliente) => {
    if (!cliente.activo) {
      error('Registro inactivo', 'Este cliente está inactivo y no permite acciones.');
      return;
    }
    // Validar permisos: solo administrador o superior
    if (!isAdmin()) {
      error('Acceso denegado', 'Solo los administradores pueden eliminar clientes del sistema.');
      return;
    }

    // Verificar si el cliente está relacionado con un Super Administrador o Gerente
    const docCliente = String(cliente.numeroDocumento || '').trim();
    const emailCliente = String(cliente.email || '').trim().toLowerCase();

    const isRelatedToSuperAdmin = usuariosAll.some((u: any) => {
      const docUsuario = String(u.documento || '').trim();
      const emailUsuario = String(u.correo || '').trim().toLowerCase();

      const matchDoc = docCliente !== '' && docUsuario === docCliente;
      const matchEmail = emailCliente !== '' && emailUsuario === emailCliente;

      const rolName = String(u.rol?.nombre || u.rol || '').toLowerCase();
      const isSuperAdminOrGerente =
        u.rolId === 1 ||
        u.rolId === 5 ||
        ['super administrador', 'gerente', 'super_admin'].includes(rolName);

      return (matchDoc || matchEmail) && isSuperAdminOrGerente;
    });

    if (isRelatedToSuperAdmin) {
      error('Acción denegada', 'Este cliente está vinculado a una cuenta de Super Administrador o Gerente y no puede ser eliminado.');
      return;
    }

    confirmDeleteAction(
      "confirmar",
      async () => {
        try {
          const idNum = parseInt(cliente.id);
          await clientesService.deleteCliente(idNum, {
            correo: cliente.email,
            documento: cliente.numeroDocumento,
            tipoDocumento: cliente.tipoDocumento
          });
          let stillExists = false;
          try {
            const check = await clientesService.getClienteById(idNum);
            if (check && (check.id || (check as any).Id)) {
              stillExists = true;
            }
          } catch {
            stillExists = false;
          }
          if (stillExists) {
            try {
              await clientesService.toggleClienteEstado(idNum, false);
              setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, activo: false } : c));
              success('Cliente desactivado', 'Este cliente tiene registros asociados. Se desactivó para conservar el historial.');
            } catch {
              error('No se puede eliminar', 'Este cliente tiene registros asociados (ventas, compras, agendamientos o entregas de insumos). Solo se puede desactivar para conservar el historial.');
            }
            // Evitar que el flujo muestre éxito de eliminación
            throw new Error('DEACTIVATED_INSTEAD');
          }
          setClientes(prev => prev.filter(c => c.id !== cliente.id));
          setSelectedItems(prev => prev.filter(id => id !== cliente.id));
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? (err.message || '') : String(err || '');
          const msg = errorMessage.toLowerCase();
          const related =
            msg.includes('409') ||
            msg.includes('foreign') ||
            msg.includes('constraint') ||
            msg.includes('referenc') ||
            msg.includes('venta') ||
            msg.includes('compra') ||
            msg.includes('agend') ||
            msg.includes('cita') ||
            msg.includes('insumo') ||
            msg.includes('entrega');
          if (related) {
            try {
              await clientesService.toggleClienteEstado(parseInt(cliente.id), false);
              setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, activo: false } : c));
              success('Cliente desactivado', 'Este cliente tiene registros asociados. Se desactivó para conservar el historial.');
            } catch {
              error('No se puede eliminar', 'Este cliente tiene registros asociados (ventas, compras, agendamientos o entregas de insumos). Solo se puede desactivar para conservar el historial.');
            }
          } else {
            // suprimir alerta grande genérica
          }
          // Lanzar para evitar que se dispare la alerta de éxito de confirmación
          throw new Error(errorMessage || 'DELETE_FAILED');
        }
      },
      {
        confirmTitle: "Confirmar Eliminación de Cliente",
        confirmMessage: `¿Estás seguro de que deseas eliminar permanentemente al cliente "${cliente.nombre} ${cliente.apellido}" con documento "${cliente.tipoDocumento} ${cliente.numeroDocumento}"?`,
        successTitle: "¡Cliente eliminado exitosamente!",
        successMessage: `El cliente ha sido eliminado permanentemente del sistema.`,
        requireInput: true
      }
    );
  };

  // Función para cambiar el estado del cliente (activo/inactivo)
  const toggleClienteStatus = async (clienteId: string) => {
    try {
      const cliente = clientes.find(c => c.id === clienteId);
      if (!cliente) {
        console.error('Cliente no encontrado con ID:', clienteId);
        return;
      }

      const nuevoEstado = !cliente.activo;

      // Cambiar estado en la API
      await clientesService.toggleClienteEstado(parseInt(clienteId), nuevoEstado);

      // Actualizar localmente
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, activo: nuevoEstado } : c));

      const updatedCliente = clientes.find(c => c.id === clienteId);

      success(
        `Cliente ${nuevoEstado ? 'activado' : 'desactivado'}`,
        `El cliente ${updatedCliente?.nombre} ${updatedCliente?.apellido} ha sido ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente.`
      );
    } catch (err: unknown) {
      console.error('Error cambiando estado del cliente:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error', `No se pudo cambiar el estado del cliente: ${errorMessage}`);
    }
  };

  // Estadísticas de saldos
  const totalClientesConSaldo = clientes.filter(c => ((c.saldoAFavor || 0) || 0) > 0).length;
  const totalSaldosAFavor = clientes.reduce((total, c) => total + ((c.saldoAFavor || 0) || 0), 0);

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Gestión de Clientes</h1>
            <p className="text-sm text-gray-lightest mt-1">Administra los clientes registrados con fotos de perfil</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-black-primary">
        {/* Stats Cards */}
        <div style={{ display: 'none' }} className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="elegante-card text-center">
            <Users className="w-8 h-8 text-orange-primary mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">{clientes.length}</h4>
            <p className="text-gray-lightest text-sm">Total Clientes</p>
          </div>
          <div className="elegante-card text-center">
            <UserCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">
              {clientes.filter(c => c.activo).length}
            </h4>
            <p className="text-gray-lightest text-sm">Clientes Activos</p>
          </div>
          <div className="elegante-card text-center">
            <UserX className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">
              {clientes.filter(c => !c.activo).length}
            </h4>
            <p className="text-gray-lightest text-sm">Clientes Inactivos</p>
          </div>
          <div className="elegante-card text-center">
            <Wallet className="w-8 h-8 text-orange-secondary mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">{totalClientesConSaldo}</h4>
            <p className="text-gray-lightest text-sm">Con Saldo</p>
          </div>
          <div className="elegante-card text-center">
            <TrendingUp className="w-8 h-8 text-orange-primary mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">${formatCurrency(totalSaldosAFavor)}</h4>
            <p className="text-gray-lightest text-sm">Total Saldos</p>
          </div>
        </div>

        {/* Sección Principal */}
        <div className="std-card">
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <button
                onClick={handleCreateClick}
                className="btn-std-primary"
              >
                <UserPlus className="w-4 h-4" />
                Añadir Cliente
              </button>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar por documento, nombre, email o teléfono"
            statusFilter={{
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value as "all" | "active" | "inactive");
                setCurrentPage(1);
              },
              options: [
                { value: "all", label: "Todos" },
                { value: "active", label: "Activos" },
                { value: "inactive", label: "Inactivos" },
              ],
            }}
            recordsText={`Mostrando ${displayedClientes.length} de ${filteredClientes.length} clientes`}
            recordsPlacement="right"
          />

          {/* Tabla de Clientes */}
          {(() => {
            const clienteColumns: ColumnDef<Cliente>[] = [
              {
                key: "numeroDocumento",
                header: "Documento",
                primary: true,
                render: (_v, row) => (
                  <span>{(row as any).tipoDocumento ? `${normalizarTipoDoc((row as any).tipoDocumento)} ${row.numeroDocumento}` : row.numeroDocumento}</span>
                ),
              },
              {
                key: "nombre",
                header: "Cliente",
                align: "left",
                render: (_v, row) => (
                  <div className="flex items-center space-x-3">
                    <ImageRenderer
                      url={row.fotoPerfil}
                      alt={`Foto de ${row.nombre}`}
                      className="w-10 h-10 rounded-full border-2 border-orange-primary"
                      fallbackVariant="person"
                      showLabel={false}
                    />
                    <span>{row.nombre} {row.apellido}</span>
                  </div>
                ),
              },
              {
                key: "email",
                header: "Contacto",
                render: (_v, row) => (
                  <div className="flex flex-col">
                    <span className="text-sm">{row.email || '-'}</span>
                    <span className="text-xs opacity-70">{row.telefono || '-'}</span>
                  </div>
                ),
              },
              {
                key: "saldoAFavor",
                header: "Saldo",
                render: (_v, row) => <span>${formatCurrency(row.saldoAFavor ?? 0)}</span>,
              },
              {
                key: "activo",
                header: "Estado",
                render: (_v, row) => (
                  <StandardTable.StatusBadge
                    variant={resolveStatusVariant(row.activo ? 'Activo' : 'Inactivo')}
                    label={row.activo ? 'Activo' : 'Inactivo'}
                  />
                ),
              },
              {
                key: "id",
                header: "Acciones",
                render: (_v, row) => (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => toggleClienteStatus(row.id)}
                      className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                      title={row.activo ? "Desactivar cliente" : "Activar cliente"}
                    >
                      {row.activo ? (
                        <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleViewCliente(row)}
                      className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditCliente(row); }}
                      disabled={!row.activo}
                      className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title={row.activo ? "Editar cliente" : "Cliente inactivo (solo historial)"}
                    >
                      <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSendPasswordSetup(row.email); }}
                      disabled={!row.activo}
                      className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title={row.activo ? "Enviar enlace de contraseña" : "Cliente inactivo (solo historial)"}
                    >
                      <KeyRound className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                    </button>
                    <button
                      onClick={() => handleDeleteCliente(row)}
                      disabled={!row.activo}
                      className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title={row.activo ? "Eliminar cliente" : "Cliente inactivo (solo historial)"}
                    >
                      <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                    </button>
                  </div>
                ),
              },
            ];

            return (
              <StandardTable
                columns={clienteColumns as any}
                data={displayedClientes as any}
                loading={loading}
                emptyTitle="No se encontraron clientes"
                emptyMessage="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                onReload={loadClientes}
                rowKey="id"
                renderMobileCard={(row) => {
                  const cliente = row as unknown as Cliente;
                  return (
                    <div className="std-mobile-card">
                      <div className="std-mobile-card-avatar">
                        <ImageRenderer
                          url={cliente.fotoPerfil}
                          alt={`Foto de ${cliente.nombre}`}
                          className="w-full h-full object-cover"
                          fallbackVariant="person"
                          showLabel={false}
                        />
                      </div>
                      <div className="std-mobile-card-info">
                        <div className="std-mobile-card-row">
                          <span className="std-mobile-card-title">{cliente.nombre} {cliente.apellido}</span>
                          <span className={`std-badge ${cliente.activo ? 'std-badge-positive' : 'std-badge-negative'}`}>
                            {cliente.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <span className="std-mobile-card-sub">{cliente.email || '-'}</span>
                        <span className="std-mobile-card-meta">
                          {(cliente as any).tipoDocumento ? `${normalizarTipoDoc((cliente as any).tipoDocumento)} ${cliente.numeroDocumento}` : cliente.numeroDocumento}
                          {(cliente.saldoAFavor ?? 0) > 0 ? ` · $${formatCurrency(cliente.saldoAFavor)}` : ''}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                          onClick={() => toggleClienteStatus(cliente.id)}
                          className="p-1"
                          title={cliente.activo ? "Desactivar cliente" : "Activar cliente"}
                        >
                          {cliente.activo ? <ToggleRight className="w-6 h-6 text-orange-primary" /> : <ToggleLeft className="w-6 h-6 text-gray-light" />}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-gray-darker transition-colors"><MoreVertical className="w-4 h-4 text-gray-lightest" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-gray-darkest border-gray-dark min-w-[140px]" align="end">
                            <DropdownMenuItem className="text-gray-lightest cursor-pointer" onSelect={() => handleViewCliente(cliente)}>Detalles</DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-lightest cursor-pointer" disabled={!cliente.activo} onSelect={() => handleEditCliente(cliente)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-lightest cursor-pointer" disabled={!cliente.activo} onSelect={() => handleSendPasswordSetup(cliente.email)}>Enviar contraseña</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500 cursor-pointer" disabled={!cliente.activo} onSelect={() => handleDeleteCliente(cliente)}>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                }}
              />
            );
          })()}

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

      {/* Diálogo para Ver Detalles del Cliente */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto text-white-primary">
          <DialogHeader>
            <DialogTitle className="text-white-primary">Detalle del Cliente</DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Información detallada del cliente seleccionado.
            </DialogDescription>
          </DialogHeader>

          {selectedCliente && (
            <div className="space-y-6 pt-4">
              {/* Foto de Perfil y Tipo de Documento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Camera className="w-4 h-4 text-orange-primary" />
                    Foto de Perfil
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-orange-primary flex items-center justify-center bg-gray-dark">
                      <ImageRenderer
                        url={selectedCliente.fotoPerfil ?? undefined}
                        alt="Foto de perfil"
                        className="w-full h-full rounded-full"
                        fallbackVariant="person"
                        showLabel={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-primary" />
                    Tipo de Documento
                  </Label>
                  <Input
                    value={TIPOS_DOCUMENTO.find(td => td.value === selectedCliente.tipoDocumento)?.label || selectedCliente.tipoDocumento}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
              </div>

              {/* Información Personal y Documento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Hash className="w-4 h-4 text-orange-primary" />
                    Número de Documento
                  </Label>
                  <Input
                    value={selectedCliente.numeroDocumento}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-orange-primary" />
                    Nombres
                  </Label>
                  <Input
                    value={selectedCliente.nombre}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-orange-primary" />
                    Apellidos
                  </Label>
                  <Input
                    value={selectedCliente.apellido}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-primary" />
                    Fecha de Nacimiento
                  </Label>
                  <DatePicker
                    value={selectedCliente.fechaNacimiento}
                    readOnly
                  />
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-primary" />
                    Correo Electrónico
                  </Label>
                  <Input
                    type="email"
                    value={selectedCliente.email}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Phone className="w-4 h-4 text-orange-primary" />
                    Número de Celular
                  </Label>
                  <Input
                    value={selectedCliente.telefono || '—'}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-primary" />
                    Dirección
                  </Label>
                  <Input
                    value={selectedCliente.direccion || '—'}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-primary" />
                    Barrio
                  </Label>
                  <Input
                    value={selectedCliente.barrio || '—'}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
              </div>

              {/* Estado y Saldo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <ToggleRight className="w-4 h-4 text-orange-primary" />
                    Estado
                  </Label>
                  <Input
                    value={selectedCliente.activo ? 'Activo' : 'Inactivo'}
                    readOnly
                    className={`elegante-input w-full cursor-default ${selectedCliente.activo ? 'text-green-400' : 'text-red-400'}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-orange-primary" />
                    Saldo a Favor
                  </Label>
                  <div className={`elegante-input w-full flex items-center gap-2 px-3 py-2 rounded-md border font-semibold ${
                    (selectedCliente.saldoAFavor ?? 0) <= 0
                      ? 'border-gray-500/40 text-gray-lightest bg-gray-900/10'
                      : (selectedCliente.saldoAFavor ?? 0) < 50000
                      ? 'border-yellow-500/40 text-yellow-400 bg-yellow-900/10'
                      : 'border-green-500/40 text-green-400 bg-green-900/10'
                  }`}>
                    ${formatCurrency(selectedCliente.saldoAFavor ?? 0)}
                    <span className="ml-2 text-xs font-normal opacity-70">
                      {(selectedCliente.saldoAFavor ?? 0) <= 0
                        ? '— Sin saldo'
                        : (selectedCliente.saldoAFavor ?? 0) < 50000
                        ? '— Saldo bajo'
                        : '— Saldo disponible'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 mt-6 border-t border-gray-dark">
            <button onClick={() => setIsViewDialogOpen(false)} className="elegante-button-primary px-8">
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Editar Cliente */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogCloseAttempt}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white-primary">Editar Cliente</DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Modifica la información del cliente. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Foto de Perfil y Tipo de Documento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-primary" />
                  Foto de Perfil
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-orange-primary flex items-center justify-center bg-gray-dark">
                      <ImageRenderer
                        url={editPreviewUrl ?? undefined}
                        alt="Vista previa"
                        className="w-full h-full rounded-full"
                        fallbackVariant="person"
                        showLabel={false}
                      />
                      {editPreviewUrl && (
                        <button
                          onClick={removeEditProfileImage}
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                          type="button"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={triggerEditFileSelect}
                    className="elegante-button-secondary text-xs px-3 py-1.5 gap-1.5 flex items-center"
                    type="button"
                  >
                    <Camera className="w-3 h-3" />
                    {editPreviewUrl ? 'Cambiar' : 'Subir'}
                  </button>
                </div>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageUpload}
                  className="hidden"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-primary" />
                  Tipo de Documento *
                </Label>
                <Select value={editForm.tipoDocumento || undefined} onValueChange={(val) => setEditForm({ ...editForm, tipoDocumento: val })}>
                  <SelectTrigger className={`elegante-input w-full ${showEditValidation && !editForm.tipoDocumento ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark">
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value} className="text-white-primary">
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showEditValidation && !editForm.tipoDocumento && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
            </div>

            {/* Información Personal y Documento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Hash className="w-4 h-4 text-orange-primary" />
                  Número de Documento *
                </Label>
                <Input
                  value={editForm.numeroDocumento}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/\D/g, '');
                    setEditForm({ ...editForm, numeroDocumento: numeric });
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={CLIENTE_LIMITS.numeroDocumento}
                  className={`elegante-input w-full ${showEditValidation && !editForm.numeroDocumento ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Número de documento (solo números)"
                  disabled={false}
                />
                {showEditValidation && !editForm.numeroDocumento && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
              <div className="space-y-2 pb-5">
                <Label className="text-white-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-primary" />
                  Nombres *
                </Label>
                <NameInput
                  value={editForm.nombre}
                  onChange={(val) => setEditForm({ ...editForm, nombre: val })}
                  className={`elegante-input w-full ${showEditValidation && !editForm.nombre ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Ingresa los nombres"
                />
                {showEditValidation && !editForm.nombre && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
              <div className="space-y-2 pb-5">
                <Label className="text-white-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-primary" />
                  Apellidos *
                </Label>
                <NameInput
                  value={editForm.apellido}
                  onChange={(val) => setEditForm({ ...editForm, apellido: val })}
                  className={`elegante-input w-full ${showEditValidation && !editForm.apellido ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Ingresa los apellidos"
                />
                {showEditValidation && !editForm.apellido && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-primary" />
                  Fecha de Nacimiento *
                </Label>
                <DatePicker
                  value={editForm.fechaNacimiento}
                  onChange={(val) => setEditForm({ ...editForm, fechaNacimiento: val })}
                  min={minBirthDate}
                  max={maxBirthDateEight}
                  error={showEditValidation && !editForm.fechaNacimiento}
                  requiredMessage="Este campo es obligatorio."
                />
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-primary" />
                  Correo Electrónico *
                </Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  maxLength={CLIENTE_LIMITS.email}
                  className={`elegante-input w-full ${(showEditValidation && !editForm.email) || (showEditValidation && editForm.email && !isValidEmail(editForm.email)) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="correo@ejemplo.com"
                />
                {showEditValidation && !editForm.email && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                {showEditValidation && editForm.email && !isValidEmail(editForm.email) && <p className="text-xs text-red-400">Formato de correo inválido.</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-primary" />
                  Número de Celular *
                </Label>
                <PhoneInput
                  value={editForm.telefono}
                  onChange={(value) => setEditForm({ ...editForm, telefono: value })}
                  className={`w-full ${showEditValidation && !editForm.telefono ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="3001234567"
                />
                {showEditValidation && !editForm.telefono && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
            </div>

            {/* Dirección */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-primary" />
                  Dirección
                </Label>
                <Input
                  value={editForm.direccion}
                  onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                  maxLength={CLIENTE_LIMITS.direccion}
                  className="elegante-input w-full"
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-primary" />
                  Barrio
                </Label>
                <Input
                  value={editForm.barrio}
                  onChange={(e) => setEditForm({ ...editForm, barrio: e.target.value })}
                  maxLength={CLIENTE_LIMITS.barrio}
                  className="elegante-input w-full"
                  placeholder="Nombre del barrio"
                />
              </div>
            </div>


            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
              <button
                onClick={() => {
                  setShowEditValidation(false);
                  handleEditDialogCloseAttempt(false);
                }}
                className="elegante-button-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditCliente}
                disabled={isSubmitting}
                className="elegante-button-primary"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Crear Cliente */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogCloseAttempt}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white-primary">Añadir Nuevo Cliente</DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Completa la información del nuevo cliente. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Foto de Perfil y Tipo de Documento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-primary" />
                  Foto de Perfil
                </Label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-orange-primary flex items-center justify-center bg-gray-dark">
                      <ImageRenderer
                        url={previewUrl ?? undefined}
                        alt="Vista previa"
                        className="w-full h-full rounded-full"
                        fallbackVariant="person"
                        showLabel={false}
                      />
                      {previewUrl && (
                        <button
                          onClick={removeProfileImage}
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                          type="button"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={triggerFileSelect}
                    className="elegante-button-secondary text-xs px-3 py-1.5 gap-1.5 flex items-center"
                    type="button"
                  >
                    <Camera className="w-3 h-3" />
                    {previewUrl ? 'Cambiar' : 'Subir'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-primary" />
                  Tipo de Documento *
                </Label>
                <Select value={createForm.tipoDocumento || undefined} onValueChange={(val) => setCreateForm({ ...createForm, tipoDocumento: val })}>
                  <SelectTrigger className={`elegante-input w-full ${showCreateValidation && !createForm.tipoDocumento ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark">
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value} className="text-white-primary">
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showCreateValidation && !createForm.tipoDocumento && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
            </div>

            {/* Información Personal y Documento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Hash className="w-4 h-4 text-orange-primary" />
                  Número de Documento *
                </Label>
                <Input
                  value={createForm.numeroDocumento}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/\D/g, '');
                    setCreateForm({ ...createForm, numeroDocumento: numeric });
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={CLIENTE_LIMITS.numeroDocumento}
                  className={`elegante-input w-full ${showCreateValidation && !createForm.numeroDocumento ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Número de documento (solo números)"
                />
                {showCreateValidation && !createForm.numeroDocumento && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                {isDocDuplicateCreateCliente && <p className="text-xs text-red-400">Documento ya existe en el sistema.</p>}
              </div>
              <div className="space-y-2 pb-5">
                <Label className="text-white-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-primary" />
                  Nombres *
                </Label>
                <NameInput
                  value={createForm.nombre}
                  onChange={(val) => setCreateForm({ ...createForm, nombre: val })}
                  className={`elegante-input w-full ${showCreateValidation && !createForm.nombre ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Ingresa los nombres"
                />
                {showCreateValidation && !createForm.nombre && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
              <div className="space-y-2 pb-5">
                <Label className="text-white-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-primary" />
                  Apellidos *
                </Label>
                <NameInput
                  value={createForm.apellido}
                  onChange={(val) => setCreateForm({ ...createForm, apellido: val })}
                  className={`elegante-input w-full ${showCreateValidation && !createForm.apellido ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Ingresa los apellidos"
                />
                {showCreateValidation && !createForm.apellido && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-primary" />
                  Fecha de Nacimiento *
                </Label>
                <DatePicker
                  value={createForm.fechaNacimiento}
                  onChange={(val) => setCreateForm({ ...createForm, fechaNacimiento: val })}
                  min={minBirthDate}
                  max={maxBirthDateEight}
                  error={showCreateValidation && !createForm.fechaNacimiento}
                  requiredMessage="Este campo es obligatorio."
                />
                {!!edadCreateCliente && <p className={`text-xs ${isTooYoungCreateCliente ? 'text-red-400' : 'text-gray-lightest'}`}>Edad: {edadCreateCliente} años{isTooYoungCreateCliente ? ' (mínimo 8)' : ''}</p>}
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-primary" />
                  Correo Electrónico *
                </Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  maxLength={CLIENTE_LIMITS.email}
                  className={`elegante-input w-full ${(showCreateValidation && !createForm.email) || (showCreateValidation && createForm.email && !isValidEmail(createForm.email)) || isEmailDuplicateCreateCliente ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="correo@ejemplo.com"
                />
                {showCreateValidation && !createForm.email && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                {showCreateValidation && createForm.email && !isValidEmail(createForm.email) && <p className="text-xs text-red-400">Formato de correo inválido.</p>}
                {isEmailDuplicateCreateCliente && <p className="text-xs text-red-400">Correo ya existe en el sistema.</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-primary" />
                  Número de Celular *
                </Label>
                <PhoneInput
                  value={createForm.telefono}
                  onChange={(value) => setCreateForm({ ...createForm, telefono: value })}
                  className={`w-full ${showCreateValidation && !createForm.telefono ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="3001234567"
                />
                {showCreateValidation && !createForm.telefono && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              </div>
            </div>

            {/* Dirección */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-primary" />
                  Dirección
                </Label>
                <Input
                  value={createForm.direccion}
                  onChange={(e) => setCreateForm({ ...createForm, direccion: e.target.value })}
                  maxLength={CLIENTE_LIMITS.direccion}
                  className="elegante-input w-full"
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-primary" />
                  Barrio
                </Label>
                <Input
                  value={createForm.barrio}
                  onChange={(e) => setCreateForm({ ...createForm, barrio: e.target.value })}
                  maxLength={CLIENTE_LIMITS.barrio}
                  className="elegante-input w-full"
                  placeholder="Nombre del barrio"
                />
              </div>
            </div>




            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
              <button
                onClick={() => {
                  setShowCreateValidation(false);
                  handleCreateDialogCloseAttempt(false);
                }}
                className="elegante-button-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCliente}
                disabled={isSubmitting}
                className="elegante-button-primary"
                aria-disabled={isSubmitting || !createForm.tipoDocumento || !createForm.numeroDocumento || !createForm.nombre || !createForm.apellido || !createForm.email || !createForm.fechaNacimiento || isDocDuplicateCreateCliente || isEmailDuplicateCreateCliente || isTooYoungCreateCliente}
              >
                {isSubmitting ? 'Creando...' : 'Crear Cliente'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación editar */}
      <AlertDialog open={isEditConfirmOpen} onOpenChange={setIsEditConfirmOpen}>
        <AlertDialogContent className="bg-gray-darkest border border-gray-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary">Confirmar Cambios</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest">
              ¿Estás seguro de que deseas guardar los cambios realizados en este cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsEditConfirmOpen(false)}
              className="elegante-button-secondary"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEditCliente}
              disabled={isSubmitting}
              className="elegante-button-primary"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contenedor de alertas */}
      {AlertContainer}

      {/* Contenedor de confirmaciones de eliminación */}
      {DoubleConfirmationContainer}

      <DiscardChangesDialog
        open={isConfirmDiscardCreateOpen}
        onKeepEditing={() => setIsConfirmDiscardCreateOpen(false)}
        onDiscard={() => {
          setIsConfirmDiscardCreateOpen(false);
          setShowCreateValidation(false);
          setIsCreateDialogOpen(false);
          setCreateForm({
            tipoDocumento: 'CC',
            numeroDocumento: '',
            nombre: '',
            apellido: '',
            email: '',
            telefono: '',
            direccion: '',
            barrio: '',
            fechaNacimiento: '',
            fotoPerfil: ''
          });
          setSelectedProfileImage(null);
          setPreviewUrl(null);
          setFormError('');
        }}
      />
      <DiscardChangesDialog
        open={isConfirmDiscardEditOpen}
        onKeepEditing={() => setIsConfirmDiscardEditOpen(false)}
        onDiscard={() => {
          setIsConfirmDiscardEditOpen(false);
          setShowEditValidation(false);
          setIsEditDialogOpen(false);
          setSelectedCliente(null);
          setEditForm({});
          setEditSelectedProfileImage(null);
          setEditPreviewUrl(null);
        }}
      />
    </>
  );
}
