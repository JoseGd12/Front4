import React, { useRef, useState, useEffect } from "react";
import { Input } from "../../../shared/components/ui/input";
import { NameInput } from "../../../shared/components/ui/NameInput";
import { PhoneInput } from "../../../shared/components/ui/PhoneInput";
import { DatePicker } from "../../../shared/components/ui/DatePicker";
import { Label } from "../../../shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import {
  Users, Plus, Edit, Trash2, Mail, Phone, Calendar,
  Search, UserCheck, UserX, Eye, User as UserIcon, ChevronLeft,
  ChevronRight, MapPin, CreditCard, Home, Camera,
  ToggleRight, ToggleLeft, X, Loader2, IdCard, KeyRound,
  Users2, MoreVertical
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/components/ui/dropdown-menu";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { DiscardChangesDialog } from "../../../shared/components/ui/discard-changes-dialog";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { apiService, ApiUser } from "../../../shared/services/api";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { clientesService } from "../../clientes/services/clientesService";
import { barberosService } from "../services/barberosService";
import { rolesApiService, RoleWithModules } from "../services/rolesApiService";
import { notifyEntityCreated } from "../../../shared/services/notificationService";

import { useAuth } from "../../../shared/contexts/AuthContext";
import { firebaseAuthService } from "../../../shared/services/firebase";
// ... imports ...

// DTOs para la comunicación con la API
// Estos objetos definen la estructura de datos que se envía y recibe del backend
interface UsuarioInput {
  nombre: string;           // Nombre del usuario
  apellido: string;          // Apellido del usuario
  correo: string;            // Correo electrónico (único)
  contrasena?: string;       // Contraseña (opcional para actualizaciones)
  rolId: number;            // ID del rol (1:Admin, 2:Barbero, 3:Cliente, 4:Recepcionista, 5:Gerente, 6:Cajero)
  tipoDocumento?: string;   // Tipo de documento (Cédula, Pasaporte, etc.)
  documento?: string;       // Número de documento
  telefono?: string;         // Teléfono del usuario
  direccion?: string;       // Dirección completa
  barrio?: string;           // Barrio o localidad
  fechaNacimiento?: string; // Fecha de nacimiento (YYYY-MM-DD)
  fotoPerfil?: string;       // URL de la imagen de perfil (subida via /api/upload)
  estado: boolean;          // Estado del usuario (true: activo, false: inactivo)
}

// Response del endpoint de upload de imágenes
interface UploadResponse {
  url: string;     // URL relativa del archivo guardado
  message: string; // Mensaje de confirmación
}


const tiposDocumento = [
  { value: "CC", label: "CC — Cédula de Ciudadanía" },
  { value: "CE", label: "CE — Cédula de Extranjería" },
  { value: "TI", label: "TI — Tarjeta de Identidad" },
];

/** Normaliza cualquier forma almacenada a la abreviación canónica */
const abreviarTipoDoc = (tipo: string | undefined): string => {
  if (!tipo) return '';
  const t = tipo.trim().toLowerCase().normalize('NFD').replace(/̀-ͯ/g, '').replace(/[^a-z\s]/g, '').trim();
  if (t === 'cc' || t === 'cedula' || t.includes('ciudadan')) return 'CC';
  if (t === 'ce' || t.includes('extranjeria')) return 'CE';
  if (t === 'ti' || t.includes('tarjeta') || t.includes('identidad')) return 'TI';
  return 'CC';
};

export function UsersPage() {
  const { user: currentUser, resetPassword } = useAuth();
  const { success: showSuccess, error: showError, AlertContainer } = useCustomAlert();
  const [users, setUsers] = useState<any[]>([]); // Estado principal - única fuente de verdad
  const [availableRoles, setAvailableRoles] = useState<RoleWithModules[]>([]);
  const [loading, setLoading] = useState(true);

  // Mapear datos de la API al formato del componente (dentro del componente para usar availableRoles si es necesario)
  const mapApiUserToComponent = (apiUser: ApiUser): any => {
    return {
      id: apiUser.id,
      nombres: apiUser.nombre,
      apellidos: apiUser.apellido,
      tipoDocumento: abreviarTipoDoc(apiUser.tipoDocumento) || "CC",
      documento: apiUser.documento || "",
      correo: apiUser.correo,
      celular: apiUser.telefono || "",
      direccion: apiUser.direccion || "",
      barrio: apiUser.barrio || "",
      fechaNacimiento: apiUser.fechaNacimiento ? apiUser.fechaNacimiento.split('T')[0] : "",
      password: apiUser.contrasena || "",
      status: apiUser.estado,
      fechaCreacion: new Date().toLocaleDateString('es-ES'),
      avatar: `${apiUser.nombre?.split(' ')[0]?.[0] || ''}${apiUser.apellido?.split(' ')[0]?.[0] || ''}`.toUpperCase(),
      imagenUrl: apiUser.fotoPerfil || "",
      rol: apiUser.rol?.nombre || (availableRoles.find(r => Number(r.id) === apiUser.rolId)?.nombre) || "Cliente"
    };
  };

  // Mapear datos del componente al formato de la API (DTO)
  const mapComponentToApiUser = (componentUser: any): UsuarioInput => {
    // Buscar el ID del rol basado en el nombre seleccionado
    const foundRole = availableRoles.find(r => r.nombre === componentUser.rol);
    const rolId = foundRole ? Number(foundRole.id) : 3; // Default: Cliente

    const apiUser: any = {
      nombre: componentUser.nombres,
      apellido: componentUser.apellidos,
      tipoDocumento: componentUser.tipoDocumento,
      documento: componentUser.documento,
      correo: componentUser.correo,
      telefono: componentUser.celular,
      direccion: componentUser.direccion,
      barrio: componentUser.barrio,
      contrasena: componentUser.password,
      estado: componentUser.status === 'active' || componentUser.status === true,
      fotoPerfil: componentUser.imagenUrl,
      rolId: rolId
    };

    // Solo incluir fechaNacimiento si tiene un valor válido
    if (componentUser.fechaNacimiento && componentUser.fechaNacimiento.trim() !== '') {
      apiUser.fechaNacimiento = componentUser.fechaNacimiento;
    }

    return apiUser;
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("true");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [newUser, setNewUser] = useState({
    nombres: '',
    apellidos: '',
    tipoDocumento: '',
    documento: '',
    correo: '',
    celular: '',
    direccion: '',
    barrio: '',
    fechaNacimiento: '',
    password: '',
    rol: '',
    status: 'active',
    imagenUrl: ''
  });
  const userFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userPreviewUrl, setUserPreviewUrl] = useState<string>('');
  const [createInFirebase, setCreateInFirebase] = useState(true);
  const [showUserFormErrors, setShowUserFormErrors] = useState(false);
  const [clientesCatalogo, setClientesCatalogo] = useState<any[]>([]);
  const [barberosCatalogo, setBarberosCatalogo] = useState<any[]>([]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);

  const isUserFormDirty = () => {
    if (editingUser) {
      return (
        newUser.nombres !== (editingUser.nombres || '') ||
        newUser.apellidos !== (editingUser.apellidos || '') ||
        newUser.tipoDocumento !== (editingUser.tipoDocumento || 'CC') ||
        newUser.documento !== (editingUser.documento || '') ||
        newUser.correo !== (editingUser.correo || '') ||
        newUser.celular !== (editingUser.celular || '') ||
        newUser.direccion !== (editingUser.direccion || '') ||
        newUser.barrio !== (editingUser.barrio || '') ||
        newUser.fechaNacimiento !== (editingUser.fechaNacimiento || '') ||
        newUser.imagenUrl !== (editingUser.imagenUrl || '') ||
        newUser.rol !== (editingUser.rol || '')
      );
    } else {
      return (
        newUser.nombres !== '' ||
        newUser.apellidos !== '' ||
        newUser.documento !== '' ||
        newUser.correo !== '' ||
        newUser.celular !== '' ||
        newUser.direccion !== '' ||
        newUser.barrio !== '' ||
        newUser.fechaNacimiento !== '' ||
        newUser.imagenUrl !== '' ||
        newUser.rol !== ''
      );
    }
  };

  const handleUserDialogCloseAttempt = (open: boolean) => {
    if (!open) {
      if (isUserFormDirty()) {
        setIsConfirmDiscardOpen(true);
      } else {
        setShowUserFormErrors(false);
        setIsDialogOpen(false);
      }
    } else {
      setIsDialogOpen(true);
    }
  };
  const formatDateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayLocal = new Date();
  const maxBirthDateEight = formatDateLocal(new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate()));
  const minBirthDate = formatDateLocal(new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate()));
  const isValidBirthDate = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const maxAllowed = new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate());
    const min = new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate());
    return d >= min && d <= maxAllowed;
  };
  const edadNewUser = React.useMemo(() => {
    if (!newUser.fechaNacimiento) return null;
    const d = new Date(newUser.fechaNacimiento);
    if (isNaN(d.getTime())) return null;
    const today = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
    return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }, [newUser.fechaNacimiento]);
  const isTooYoungNewUser = (edadNewUser ?? 1000) < 8;
  const isDocDuplicateCreateUser = React.useMemo(() => {
    const docVal = String(newUser.documento || '').trim();
    if (!docVal) return false;
    
    // Si estamos editando y el documento es el original del usuario, no es duplicado
    if (editingUser && String(editingUser.documento || '').trim() === docVal) return false;

    const existeEnUsuarios = users.some((u: any) => (editingUser && Number(u.id) === Number(editingUser.id)) ? false : String(u.documento || '').trim() === docVal);
    const existeEnClientes = clientesCatalogo.some((c: any) => String((c as any).documento || (c as any).numeroDocumento || '').trim() === docVal);
    const existeEnBarberos = barberosCatalogo.some((b: any) => String((b as any).documento || '').trim() === docVal);
    return existeEnUsuarios || existeEnClientes || existeEnBarberos;
  }, [newUser.documento, users, clientesCatalogo, barberosCatalogo, editingUser?.id, editingUser?.documento]);
  const isEmailDuplicateCreateUser = React.useMemo(() => {
    const emailVal = String(newUser.correo || '').trim().toLowerCase();
    if (!emailVal) return false;
    // Al editar, excluir al propio usuario del check de correo duplicado
    const existeEnUsuarios = users.some((u: any) => {
      if (editingUser && Number(u.id) === Number(editingUser.id)) return false;
      return String(u.correo || '').trim().toLowerCase() === emailVal;
    });
    const existeEnClientes = clientesCatalogo.some((c: any) => String((c?.correo || c?.Correo || c?.email || '')).trim().toLowerCase() === emailVal);
    const existeEnBarberos = barberosCatalogo.some((b: any) => String(b.correo || '').trim().toLowerCase() === emailVal);
    return existeEnUsuarios || existeEnClientes || existeEnBarberos;
  }, [newUser.correo, users, clientesCatalogo, barberosCatalogo, editingUser?.id]);

  // Cargar usuarios y roles desde la API
  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Cargar roles primero para que mapApiUserToComponent los tenga disponibles
      const roles = await rolesApiService.getRolesWithModules();
      setAvailableRoles(roles);

      const [apiUsers, clientesList, barberosList] = await Promise.all([
        apiService.getUsuarios(),
        clientesService.getClientes().catch(() => []),
        barberosService.getBarberos().catch(() => [])
      ]);

      // Mapear usuarios usando la función interna que conoce los roles
      const mappedUsers = apiUsers.map((apiUser) => ({
        id: apiUser.id,
        nombres: apiUser.nombre,
        apellidos: apiUser.apellido,
        tipoDocumento: abreviarTipoDoc(apiUser.tipoDocumento) || "CC",
        documento: apiUser.documento || "",
        correo: apiUser.correo,
        celular: apiUser.telefono || "",
        direccion: apiUser.direccion || "",
        barrio: apiUser.barrio || "",
        fechaNacimiento: apiUser.fechaNacimiento ? apiUser.fechaNacimiento.split('T')[0] : "",
        password: apiUser.contrasena || "",
        status: apiUser.estado,
        fechaCreacion: new Date().toLocaleDateString('es-ES'),
        avatar: `${apiUser.nombre?.split(' ')[0]?.[0] || ''}${apiUser.apellido?.split(' ')[0]?.[0] || ''}`.toUpperCase(),
        imagenUrl: apiUser.fotoPerfil || "",
        rol: apiUser.rol?.nombre || (roles.find(r => Number(r.id) === apiUser.rolId)?.nombre) || "Cliente"
      }));

      setUsers(mappedUsers);
      setClientesCatalogo(clientesList || []);
      setBarberosCatalogo((barberosList || []).map((b: any) => barberosService.mapApiToComponent(b)));
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      showError('Error al cargar datos', 'No se pudieron cargar los datos del sistema.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filtros de usuario
  const filteredUsers = users.filter((user: any) => {
    // Cuentas ocultas (Sistema o Internas) que no deben gestionarse manualmente
    const isSystemAccount = 
      (user.nombres || '').toLowerCase() === 'sistema' || 
      (user.correo || '').toLowerCase().includes('sistema');
    
    if (isSystemAccount) return false;

    const term = searchTerm.trim().toLowerCase();
    const nombreCompleto = `${user.nombres || ''} ${user.apellidos || ''}`.toLowerCase();
    const searchMatch =
      nombreCompleto.includes(term) ||
      (user.documento || '').toLowerCase().includes(term) ||
      (user.correo || '').toLowerCase().includes(term) ||
      (user.celular || '').toLowerCase().includes(term) ||
      (user.rol || '').toLowerCase().includes(term);

    const statusMatch =
      filterStatus === "all" ||
      user.status === (filterStatus === "true");

    return searchMatch && statusMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const resetForm = () => {
    setNewUser({
      nombres: '', apellidos: '', tipoDocumento: '', documento: '', correo: '', celular: '',
      direccion: '', barrio: '', fechaNacimiento: '', password: '', rol: '', status: 'active', imagenUrl: ''
    });
    setUserPreviewUrl('');
    if (userFileInputRef.current) {
      userFileInputRef.current.value = '';
    }
  };

  const triggerUserFileSelect = () => {
    userFileInputRef.current?.click();
  };

  // Función para subir imágenes al servidor usando el endpoint /api/upload
  // Este endpoint recibe un archivo (IFormFile) y lo guarda en wwwroot/assets/images/
  // Validaciones: Solo imágenes (jpg, jpeg, png, gif, webp) con nombre único GUID


  const handleUserImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showError('Formato no válido', 'Solo se permiten imágenes en formato JPG, PNG, GIF o WebP');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Archivo muy grande', 'La imagen no puede superar los 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Mostrar preview mientras se sube
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUserPreviewUrl(result);
      };
      reader.readAsDataURL(file);

      // Subir al servidor
      const imageUrl = await apiService.uploadImage(file);
      setNewUser((prev) => ({ ...prev, imagenUrl: imageUrl }));

      showSuccess('Imagen subida', 'La imagen se ha subido correctamente.');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError('Error al subir imagen', 'No se pudo subir la imagen al servidor. Intenta nuevamente.');
      // Limpiar preview si falló
      setUserPreviewUrl('');
      if (userFileInputRef.current) {
        userFileInputRef.current.value = '';
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const removeUserProfileImage = () => {
    const doClear = () => {
      setNewUser((prev) => ({ ...prev, imagenUrl: '' }));
      setUserPreviewUrl('');
      if (userFileInputRef.current) {
        userFileInputRef.current.value = '';
      }
    };
    try {
      if (editingUser?.id) {
        apiService.deleteUsuarioFoto(editingUser.id).catch(() => { });
      }
    } finally {
      doClear();
    }
  };

  const handleSendPasswordSetup = async (email: string) => {
    try {
      const res = await resetPassword(email);
      if (res.success) {
        showSuccess("Enlace enviado", "Se envió un enlace para configurar la contraseña.");
      } else {
        showError("No se pudo enviar", res.error || "Intenta nuevamente.");
      }
    } catch (e: any) {
      showError("No se pudo enviar", e?.message || "Intenta nuevamente.");
    }
  };

  const handleCreateUser = async () => {
    setShowUserFormErrors(true);
    if (!newUser.tipoDocumento || !newUser.nombres || !newUser.apellidos || !newUser.documento || !newUser.correo || !newUser.celular || !newUser.rol || !newUser.fechaNacimiento) {
      return;
    }
    if (!isValidEmail(newUser.correo)) {
      return;
    }
    if (isEmailDuplicateCreateUser) {
      showError('Correo duplicado', 'Ya existe un registro con este correo (Usuario/Cliente/Barbero).');
      return;
    }
    if (newUser.fechaNacimiento) {
      const birth = new Date(newUser.fechaNacimiento);
      const cutoff = new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate());
      const min = new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate());
      const edad = Math.floor((cutoff.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + 8;
      if (birth > cutoff) {
        showError('Edad mínima no válida', 'Debe tener al menos 8 años de edad.');
        return;
      }
      if (birth < min) {
        showError('Fecha de nacimiento inválida', 'No se admiten edades mayores a 70 años.');
        return;
      }
      if (edad < 8) {
        showError('Edad mínima no válida', 'Debe tener al menos 8 años de edad.');
        return;
      }
    }
    const docVal = String(newUser.documento || '').trim();
    if (docVal.length < 4) {
      showError('Documento inválido', 'El número de documento debe tener al menos 4 dígitos.');
      return;
    }
    const existeEnUsuarios = users.some((u: any) => String(u.documento || '').trim() === docVal);
    const existeEnClientes = clientesCatalogo.some((c: any) => String((c as any).documento || (c as any).numeroDocumento || '').trim() === docVal);
    const existeEnBarberos = barberosCatalogo.some((b: any) => String((b as any).documento || '').trim() === docVal);
    if (existeEnUsuarios || existeEnClientes || existeEnBarberos) {
      showError('Documento duplicado', 'Ya existe un registro con este número de documento (Usuario/Cliente/Barbero).');
      return;
    }

    try {
      const tempPassword = Math.random().toString(36).slice(-8) + "A1";
      const apiUserData: any = mapComponentToApiUser(newUser);
      apiUserData.contrasena = tempPassword;

      // 1. Crear el Usuario base
      const createdUser = await apiService.createUsuario(apiUserData);
      const mappedUser = mapApiUserToComponent(createdUser);

      // 2. Crear perfil asociado según el Rol (Cliente o Barbero)
      const roleId = apiUserData.rolId;
      console.log(`👤 Usuario creado con ID: ${createdUser.id}, Rol ID: ${roleId}`);

      try {
        // Lógica para Clientes (Rol 3 = AppRole.CLIENTE) y Cajeros (Rol 6 = AppRole.CAJERO)
        // Ambos roles necesitan un perfil en la tabla Clientes para poder realizar transacciones
        if (roleId === 3 || roleId === 6) {
          console.log(`🔄 Creando perfil de Cliente asociado para rol ${roleId}...`);
          await clientesService.createCliente({
            usuarioId: createdUser.id,
            nombre: createdUser.nombre,
            apellido: createdUser.apellido,
            documento: createdUser.documento || newUser.documento, // Fallback al input
            correo: createdUser.correo,
            telefono: createdUser.telefono || newUser.celular,
            fechaNacimiento: createdUser.fechaNacimiento || undefined,
            direccion: createdUser.direccion || newUser.direccion,
            barrio: createdUser.barrio || newUser.barrio,
            fotoPerfil: createdUser.fotoPerfil || undefined
          });
        }
        // Lógica para Barberos (Rol 2 = AppRole.BARBERO)
        else if (roleId === 2) {
          console.log('🔄 Creando perfil de Barbero asociado...');
          await barberosService.createBarbero({
            usuarioId: createdUser.id,
            nombre: createdUser.nombre,
            apellido: createdUser.apellido,
            documento: createdUser.documento || newUser.documento,
            correo: createdUser.correo,
            telefono: createdUser.telefono || newUser.celular,
            especialidad: "General", // Valor por defecto
            fotoPerfil: createdUser.fotoPerfil || '',
            estado: true,
            direccion: createdUser.direccion || newUser.direccion,
            barrio: createdUser.barrio || newUser.barrio,
            fechaNacimiento: createdUser.fechaNacimiento || newUser.fechaNacimiento,
            tipoDocumento: abreviarTipoDoc(createdUser.tipoDocumento || newUser.tipoDocumento) || 'CC',
            rol: 'Barbero',
            status: 'active'
          });
        }
        // Otros roles (Admin, Recepcionista, Gerente) no requieren perfil adicional
        else {
          console.log(`ℹ️ Rol ${roleId} no requiere perfil adicional (Admin/Recepcionista/Gerente)`);
        }
      } catch (profileError) {
        console.error("❌ Error creando perfil asociado:", profileError);
      }

      await notifyEntityCreated('usuario', {
        id: createdUser.id,
        nombre: createdUser.nombre,
        apellido: createdUser.apellido,
        correo: createdUser.correo,
        rolId: roleId
      });
      setUsers([mappedUser, ...users]);
      setShowUserFormErrors(false);
      setIsDialogOpen(false);
      showSuccess("¡Usuario creado exitosamente!", `El usuario "${mappedUser.nombres} ${mappedUser.apellidos}" ha sido registrado en el sistema.`);

      if (createInFirebase) {
        try {
          await firebaseAuthService.createUserWithoutAffectingSession(
            createdUser.correo,
            tempPassword,
            { sendVerification: true, sendPasswordReset: false }
          );
          showSuccess('Correo de verificación enviado', `Se envió un email de verificación a ${createdUser.correo}. Al verificarlo, el usuario deberá usar "Olvidé mi contraseña" para acceder.`);
        } catch (firebaseErr: any) {
          const msg = String(firebaseErr?.message || '').toLowerCase();
          if (msg.includes('ya está en uso') || msg.includes('already')) {
            showSuccess('Cuenta ya registrada', `El correo ${createdUser.correo} ya tiene cuenta en Firebase. El usuario puede iniciar sesión directamente.`);
          }
        }
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      showError('Error al crear usuario', 'No se pudo crear el usuario. Por favor, verifica los datos e intenta nuevamente.');
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setShowUserFormErrors(false); // Resetear errores al abrir en modo edición
    setNewUser({
      nombres: user.nombres,
      apellidos: user.apellidos,
      tipoDocumento: abreviarTipoDoc(user.tipoDocumento) || 'CC',
      documento: user.documento,
      correo: user.correo,
      celular: user.celular,
      direccion: user.direccion || '',
      barrio: user.barrio || '',
      fechaNacimiento: user.fechaNacimiento || '',
      password: user.password,
      rol: user.rol,
      status: user.status,
      imagenUrl: user.imagenUrl || ''
    });
    setUserPreviewUrl(user.imagenUrl || '');
    if (userFileInputRef.current) {
      userFileInputRef.current.value = '';
    }
    setIsDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    setShowUserFormErrors(true);
    if (!newUser.tipoDocumento || !newUser.nombres || !newUser.apellidos || !newUser.documento || !newUser.correo || !newUser.celular || !newUser.rol || !newUser.fechaNacimiento) {
      return;
    }
    if (!isValidEmail(newUser.correo)) {
      return;
    }
    if (newUser.fechaNacimiento) {
      const birth = new Date(newUser.fechaNacimiento);
      const today = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
      const min = new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate());
      const edad = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (birth > today) {
        showError('Fecha de nacimiento inválida', 'No puedes seleccionar una fecha futura.');
        return;
      }
      if (birth < min) {
        showError('Fecha de nacimiento inválida', 'No se admiten edades mayores a 70 años.');
        return;
      }
      if (edad < 8) {
        showError('Edad mínima no válida', 'Debe tener al menos 8 años de edad.');
        return;
      }
    }
    const docVal = String(newUser.documento || '').trim();
    if (docVal.length < 4) {
      showError('Documento inválido', 'El número de documento debe tener al menos 4 dígitos.');
      return;
    }
    if (newUser.documento !== editingUser.documento) {
      const existeEnUsuarios = users.some((u: any) => u.id !== editingUser.id && String(u.documento || '').trim() === docVal);
      const existeEnClientes = clientesCatalogo.some((c: any) => String((c as any).documento || (c as any).numeroDocumento || '').trim() === docVal);
      const existeEnBarberos = barberosCatalogo.some((b: any) => String((b as any).documento || '').trim() === docVal);
      if (existeEnUsuarios || existeEnClientes || existeEnBarberos) {
        return;
      }
    }

    try {
      const apiUserData = mapComponentToApiUser(newUser);
      await apiService.updateUsuario(editingUser.id, apiUserData);

      // Si el correo cambió, enviar el enlace de restablecimiento de contraseña automáticamente
      if (newUser.correo !== editingUser.correo) {
        await handleSendPasswordSetup(newUser.correo);
      }

      const updatedUser = {
        ...editingUser,
        ...newUser,
        avatar: newUser.nombres.split(' ').map(n => n[0]).join('').toUpperCase() +
          newUser.apellidos.split(' ').map(n => n[0]).join('').toUpperCase()
      };

      setUsers(users.map((u: any) => u.id === editingUser.id ? updatedUser : u));
      showSuccess("Usuario actualizado", `Los datos de ${newUser.nombres} ${newUser.apellidos} han sido actualizados exitosamente.`);
      setShowUserFormErrors(false); // Resetear errores al cerrar exitosamente
      setIsDialogOpen(false);
      setEditingUser(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating user:', error);
      showError('Error al actualizar usuario', 'No se pudo actualizar el usuario. Por favor, verifica los datos e intenta nuevamente.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (currentUser?.id === userId.toString()) {
      showError(
        "Acción no permitida",
        "Este es el usuario en uso. No puedes eliminar tu propia cuenta mientras estás en una sesión activa."
      );
      return;
    }

    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const result = await apiService.deleteUsuario(userToDelete.id);
      const anonimizado = (result as any)?.anonimizado === true;

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);

      if (anonimizado) {
        showSuccess(
          'Usuario eliminado',
          `Los datos de "${userToDelete.nombres} ${userToDelete.apellidos}" fueron eliminados. El historial de registros asociados se conservó y el correo/documento quedan disponibles para un nuevo usuario.`
        );
      } else {
        showSuccess(
          'Usuario eliminado',
          `El usuario "${userToDelete.nombres} ${userToDelete.apellidos}" ha sido eliminado del sistema.`
        );
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showError('Error al eliminar usuario', 'No se pudo eliminar el usuario. Por favor, intenta nuevamente.');
    }
  };

  const toggleUserStatus = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Prevenir que el administrador actual se desactive a sí mismo
    if (currentUser?.id === userId.toString() && user.status === true) {
      showError(
        "Acción no permitida",
        "No puedes desactivar tu propia cuenta mientras estás en una sesión activa. Pide a otro administrador que lo haga por ti."
      );
      return;
    }

    const newStatus = !user.status;

    // Actualización optimista — sin alerta de carga
    setUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, status: newStatus } : u)
    );

    try {
      await apiService.updateUsuarioStatus(userId, newStatus);
      showSuccess(
        newStatus ? "Usuario activado" : "Usuario desactivado",
        `${user.nombres} ahora está ${newStatus ? "activo" : "inactivo"}`
      );
    } catch (err) {
      // Revertir si falla
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, status: !newStatus } : u)
      );
      showError("Error", "No se pudo cambiar el estado");
    }
  };


  return (
    <>
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-lightest mt-1">Administra usuarios del sistema</p>
          </div>

        </div>
      </header>

      <main className="flex-1 overflow-auto bg-black-primary">
        <div style={{ display: 'none' }} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="elegante-card text-center">
            <Users className="w-8 h-8 text-orange-primary mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">{filteredUsers.length}</h4>
            <p className="text-gray-lightest text-sm">Usuarios Totales</p>
          </div>
          <div className="elegante-card text-center">
            <UserCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">
              {filteredUsers.filter(u => u.status === true).length}
            </h4>
            <p className="text-gray-lightest text-sm">Usuarios Activos</p>
          </div>
          <div className="elegante-card text-center">
            <UserX className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">
              {filteredUsers.filter(u => u.status === false).length}
            </h4>
            <p className="text-gray-lightest text-sm">Usuarios Inactivos</p>
          </div>
          <div className="elegante-card text-center">
            <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h4 className="text-2xl font-bold text-white-primary mb-1">
              {users.length}
            </h4>
            <p className="text-gray-lightest text-sm">Total Sistema</p>
          </div>
        </div>

        {/* Sección Principal */}
        <div className="std-card">
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <Dialog open={isDialogOpen} onOpenChange={handleUserDialogCloseAttempt}>
                <DialogTrigger asChild>
                  <button
                    className="btn-std-primary"
                    onClick={() => {
                      setEditingUser(null);
                      setShowUserFormErrors(false); // Resetear errores al abrir en modo creación
                      resetForm();
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Usuario
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white-primary">
                      {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-lightest">
                      {editingUser ? 'Modifica los datos del usuario seleccionado' : 'Completa la información del nuevo usuario para agregarlo al sistema'}
                    </DialogDescription>
                  </DialogHeader>
                  {/* Foto de Perfil y Contraseña */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Camera className="w-4 h-4 text-orange-primary" />
                        Foto de Perfil
                      </Label>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <ImageRenderer url={userPreviewUrl} className="w-16 h-16 rounded-full" fallbackVariant="person" showLabel={false} />
                          {userPreviewUrl && (
                            <button
                              onClick={removeUserProfileImage}
                              onMouseDown={(e) => e.preventDefault()}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                              type="button"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={triggerUserFileSelect}
                          disabled={uploadingImage}
                          className="elegante-button-secondary text-xs px-3 py-1.5 gap-1.5 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          type="button"
                        >
                          {uploadingImage ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Camera className="w-3 h-3" />
                              {userPreviewUrl ? 'Cambiar' : 'Subir'}
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        ref={userFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUserImageUpload}
                        className="hidden"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <IdCard className="w-4 h-4 text-orange-primary" />
                          Tipo de Documento *
                        </Label>
                        <Select value={newUser.tipoDocumento} onValueChange={(val) => setNewUser({ ...newUser, tipoDocumento: val })}>
                          <SelectTrigger className={`elegante-input w-full ${showUserFormErrors && !newUser.tipoDocumento ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                            <SelectValue placeholder="Selecciona tipo de documento" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-darkest border-gray-dark">
                            {tiposDocumento.map(tipo => (
                              <SelectItem key={tipo.value} value={tipo.value} className="text-white-primary">{tipo.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {showUserFormErrors && !newUser.tipoDocumento && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 pt-4">
                    {/* Información Personal */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <IdCard className="w-4 h-4 text-orange-primary" />
                          Número de Documento *
                        </Label>
                        <Input
                          value={newUser.documento}
                          onChange={(e) => {
                            const numeric = e.target.value.replace(/\D/g, '');
                            setNewUser({ ...newUser, documento: numeric });
                          }}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          className={`elegante-input w-full ${showUserFormErrors && !newUser.documento ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                          placeholder="Número de documento (solo números)"
                        />
                        {showUserFormErrors && !newUser.documento && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                        {isDocDuplicateCreateUser && <p className="text-xs text-red-400">Documento ya existe en el sistema.</p>}
                      </div>
                      <div className="space-y-2 pb-5">
                        <Label className="text-white-primary flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-orange-primary" />
                          Nombres *
                        </Label>
                        <NameInput
                          value={newUser.nombres}
                          onChange={(val) => setNewUser({ ...newUser, nombres: val })}
                          className={`elegante-input w-full ${showUserFormErrors && !newUser.nombres ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                          placeholder="Ingresa los nombres"
                        />
                        {showUserFormErrors && !newUser.nombres && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                      </div>
                      <div className="space-y-2 pb-5">
                        <Label className="text-white-primary flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-orange-primary" />
                          Apellidos *
                        </Label>
                        <NameInput
                          value={newUser.apellidos}
                          onChange={(val) => setNewUser({ ...newUser, apellidos: val })}
                          className={`elegante-input w-full ${showUserFormErrors && !newUser.apellidos ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                          placeholder="Ingresa los apellidos"
                        />
                        {showUserFormErrors && !newUser.apellidos && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-primary" />
                          Fecha de Nacimiento *
                        </Label>
                        <DatePicker
                          value={newUser.fechaNacimiento}
                          onChange={(val) => setNewUser({ ...newUser, fechaNacimiento: val })}
                          min={minBirthDate}
                          max={maxBirthDateEight}
                          error={showUserFormErrors && !newUser.fechaNacimiento}
                          requiredMessage="Este campo es obligatorio."
                        />
                        {!!edadNewUser && <p className={`text-xs ${isTooYoungNewUser ? 'text-red-400' : 'text-gray-lightest'}`}>Edad: {edadNewUser} años{isTooYoungNewUser ? ' (mínimo 8)' : ''}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-orange-primary" />
                          Rol *
                        </Label>
                        <Select value={newUser.rol} onValueChange={(val) => setNewUser({ ...newUser, rol: val })}>
                          <SelectTrigger className={`elegante-input w-full ${showUserFormErrors && !newUser.rol ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-darkest border-gray-dark">
                            {availableRoles
                              .filter(r => r.estado)
                              .filter(r => {
                                if (currentUser?.role !== 'super_admin' && r.nombre?.toLowerCase() === 'super administrador') {
                                  return false;
                                }
                                return true;
                              })
                              .map(rol => (
                                <SelectItem key={rol.id} value={rol.nombre} className="text-white-primary">{rol.nombre}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {showUserFormErrors && !newUser.rol && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <Mail className="w-4 h-4 text-orange-primary" />
                          Correo Electrónico *
                        </Label>
                        <Input
                          type="email"
                          value={newUser.correo}
                          onChange={(e) => setNewUser({ ...newUser, correo: e.target.value })}
                          className={`elegante-input w-full ${((showUserFormErrors && (!newUser.correo || !isValidEmail(newUser.correo))) || (isEmailDuplicateCreateUser && !editingUser)) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                          placeholder="correo@ejemplo.com"
                        />
                        {showUserFormErrors && !newUser.correo && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                        {showUserFormErrors && newUser.correo && !isValidEmail(newUser.correo) && <p className="text-xs text-red-400">Formato de correo inválido.</p>}
                        {isEmailDuplicateCreateUser && !editingUser && <p className="text-xs text-red-400">Correo ya existe en el sistema.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <Phone className="w-4 h-4 text-orange-primary" />
                          Número de Celular *
                        </Label>
                        <PhoneInput
                          value={newUser.celular}
                          onChange={(value) => setNewUser({ ...newUser, celular: value })}
                          className={`w-full ${showUserFormErrors && !newUser.celular ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                          placeholder="3001234567"
                        />
                        {showUserFormErrors && !newUser.celular && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white-primary flex items-center gap-2">
                          <Home className="w-4 h-4 text-orange-primary" />
                          Dirección
                        </Label>
                        <Input
                          value={newUser.direccion}
                          onChange={(e) => setNewUser({ ...newUser, direccion: e.target.value })}
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
                          value={newUser.barrio}
                          onChange={(e) => setNewUser({ ...newUser, barrio: e.target.value })}
                          className="elegante-input w-full"
                          placeholder="Nombre del barrio"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
                      <button
                        onClick={() => {
                          setShowUserFormErrors(false); // Resetear errores al cancelar
                          handleUserDialogCloseAttempt(false);
                        }}
                        className="elegante-button-secondary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={editingUser ? handleUpdateUser : handleCreateUser}
                        className="elegante-button-primary"
                        aria-disabled={!newUser.tipoDocumento || !newUser.nombres || !newUser.apellidos || !newUser.documento || !newUser.correo || !newUser.celular || !newUser.rol || !newUser.fechaNacimiento || isDocDuplicateCreateUser || (isEmailDuplicateCreateUser && !editingUser) || isTooYoungNewUser}
                      >
                        {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                      </button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar usuarios..."
            statusFilter={{
              value: filterStatus,
              onChange: (value) => {
                setFilterStatus(value);
                setCurrentPage(1);
              },
              options: [
                { value: "all", label: "Todos" },
                { value: "true", label: "Activos" },
                { value: "false", label: "Inactivos" },
              ],
            }}
            recordsText={`Mostrando ${displayedUsers.length} de ${filteredUsers.length} usuarios`}
          />

          {/* Mobile Cards */}
          <div className="block sm:hidden">
            {loading ? (
              <div className="std-mobile-cards">
                <div className="py-12 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-orange-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-lightest text-sm">Cargando usuarios...</p>
                </div>
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="std-mobile-cards">
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-lightest mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white-primary mb-2">No se encontraron usuarios</h3>
                  <p className="text-gray-lightest mb-4">Ajusta los filtros o recarga la tabla para actualizar los resultados.</p>
                  <button onClick={loadInitialData} className="elegante-button-primary text-sm">Recargar tabla</button>
                </div>
              </div>
            ) : (
              <div className="std-mobile-cards">
                {displayedUsers.map(user => {
                  const isSelfUser = currentUser?.id === user.id.toString();
                  const isPrivilegedTargetRole = ['super administrador', 'administrador', 'admin', 'gerente', 'super_admin'].includes(user.rol?.toLowerCase() || '');
                  const canManageByRole = currentUser?.role === 'super_admin' || (currentUser?.role === 'admin' && !isPrivilegedTargetRole);
                  const canEditUser = canManageByRole || isSelfUser;
                  const showStatusAction = canManageByRole || isSelfUser;
                  const showDeleteAction = canManageByRole || isSelfUser;
                  const isDeleteBlockedByRole = currentUser?.role !== 'super_admin' && (user.rol?.toLowerCase() === 'super administrador' || ['administrador', 'admin'].includes(user.rol?.toLowerCase() || ''));

                  return (
                    <div key={user.id} className="std-mobile-card">
                      <div className="std-mobile-card-avatar">
                        <ImageRenderer
                          url={user.imagenUrl}
                          alt={`Foto de ${user.nombres}`}
                          className="w-full h-full object-cover"
                          fallbackVariant="person"
                          showLabel={false}
                        />
                      </div>
                      <div className="std-mobile-card-info">
                        <div className="std-mobile-card-row">
                          <span className="std-mobile-card-title">{user.nombres}</span>
                          <span className={`std-badge ${user.status ? 'std-badge-positive' : 'std-badge-negative'}`}>
                            {user.status ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <span className="std-mobile-card-sub">{user.correo || '-'}</span>
                        <span className="std-mobile-card-meta">
                          {(user as any).tipoDocumento ? `${abreviarTipoDoc((user as any).tipoDocumento)} ${user.documento || ""}`.trim() : (user.documento || "—")}
                          {user.rol ? ` · ${user.rol}` : ''}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {showStatusAction && (
                          <button
                            onClick={() => { if (!isSelfUser) toggleUserStatus(user.id); }}
                            className="p-1"
                            title={isSelfUser ? "No puedes cambiar tu propio estado" : (user.status ? "Desactivar usuario" : "Activar usuario")}
                            disabled={isSelfUser}
                          >
                            {user.status ? <ToggleRight className="w-6 h-6 text-orange-primary" /> : <ToggleLeft className="w-6 h-6 text-gray-light" />}
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-gray-darker transition-colors"><MoreVertical className="w-4 h-4 text-gray-lightest" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-gray-darkest border-gray-dark min-w-[160px]" align="end">
                            <DropdownMenuItem className="text-gray-lightest cursor-pointer" onSelect={() => { setSelectedUser(user); setIsDetailDialogOpen(true); }}>Detalles</DropdownMenuItem>
                            {canEditUser && (
                              <DropdownMenuItem className="text-gray-lightest cursor-pointer" disabled={!user.status} onSelect={() => handleEditUser(user)}>Editar</DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-gray-lightest cursor-pointer" disabled={!user.status} onSelect={() => handleSendPasswordSetup(user.correo)}>Enviar contraseña</DropdownMenuItem>
                            {showDeleteAction && (
                              <DropdownMenuItem className="text-red-500 cursor-pointer" disabled={!user.status || isSelfUser || isDeleteBlockedByRole} onSelect={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}>Eliminar</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block">
          <div className="std-table-wrapper">
            <table className="std-table">
                <thead className={loading ? "std-thead [&_th]:!text-transparent [&_th]:select-none" : "std-thead"}>
                  <tr className="border-b border-gray-dark">
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Documento</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Usuario</th>

                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Contacto</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Rol</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Dirección</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Estado</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="std-tbody">
                  {loading ? (
                    <TableLoadingStateRow
                      colSpan={7}
                      title="Cargando usuarios..."
                    />
                  ) : displayedUsers.length === 0 ? (
                    <TableEmptyStateRow
                      colSpan={7}
                      title="No se encontraron usuarios"
                      description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                      onReload={loadInitialData}
                    />
                  ) : (
                    displayedUsers.map(user => {
                      const isSelfUser = currentUser?.id === user.id.toString();
                      const isPrivilegedTargetRole = ['super administrador', 'administrador', 'admin', 'gerente', 'super_admin'].includes(user.rol?.toLowerCase() || '');
                      const canManageByRole = currentUser?.role === 'super_admin' || (currentUser?.role === 'admin' && !isPrivilegedTargetRole);
                      const canEditUser = canManageByRole || isSelfUser;
                      const showStatusAction = canManageByRole || isSelfUser;
                      const showDeleteAction = canManageByRole || isSelfUser;
                      const isDeleteBlockedByRole = currentUser?.role !== 'super_admin' && (user.rol?.toLowerCase() === 'super administrador' || ['administrador', 'admin'].includes(user.rol?.toLowerCase() || ''));

                      return (
                      <tr key={user.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                        <td className="text-center py-4 px-4">
                          <span className="text-gray-lighter">{(user as any).tipoDocumento ? `${abreviarTipoDoc((user as any).tipoDocumento)} ${user.documento || ""}`.trim() : (user.documento || "—")}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex items-center justify-left gap-3">
                            <ImageRenderer
                              url={user.imagenUrl}
                              alt={`Foto de ${user.nombres}`}
                              className="w-10 h-10 rounded-full border-2 border-orange-primary shadow-sm"
                              fallbackVariant="person"
                              showLabel={false}
                            />
                            <span className="text-gray-lighter">{user.nombres}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-gray-lighter text-sm">{user.correo || '—'}</span>
                            <span className="text-gray-lightest text-xs">{user.celular || '—'}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-gray-lighter">
                            {user.rol}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-gray-lighter">{user.direccion || "—"}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className={`std-badge ${user.status ? 'std-badge-positive' : 'std-badge-negative'}`}>
                            {user.status ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="text-right py-4 px-4 text-center">
                          <div className="flex justify-end gap-1">
                            {showStatusAction && (
                              <button
                                onClick={() => {
                                  if (isSelfUser) return;
                                  toggleUserStatus(user.id);
                                }}
                                className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-30 disabled:cursor-not-allowed"
                                title={isSelfUser ? "No puedes cambiar tu propio estado" : (user.status ? "Desactivar usuario" : "Activar usuario")}
                                disabled={isSelfUser}
                              >
                                {user.status ? (
                                  <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDetailDialogOpen(true);
                              }}
                              className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                            </button>
                            {canEditUser && (
                              <button
                                onClick={() => handleEditUser(user)}
                                disabled={!user.status}
                                className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={user.status ? "Editar usuario" : "Usuario inactivo (solo historial)"}
                              >
                                <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSendPasswordSetup(user.correo); }}
                              disabled={!user.status}
                              className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              title={user.status ? "Enviar enlace de contraseña" : "Usuario inactivo (solo historial)"}
                            >
                              <KeyRound className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                            </button>
                             {showDeleteAction && (
                               <button
                                 onClick={() => {
                                   if (isSelfUser) return;
                                   setUserToDelete(user);
                                   setIsDeleteDialogOpen(true);
                                 }}
                                 className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                 title={!user.status ? "Usuario inactivo (solo historial)" : isSelfUser ? "No puedes eliminar tu propio usuario" : "Eliminar usuario"}
                                 disabled={!user.status || isSelfUser || isDeleteBlockedByRole}
                               >
                                 <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                               </button>
                             )}
                          </div>
                        </td>
                      </tr>
                    )})
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

        {/* Dialog de confirmación para eliminar usuario */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-gray-darkest border-gray-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white-primary">Confirmar Eliminación</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-lightest">
                ¿Estás seguro de que deseas eliminar al usuario "{userToDelete?.nombres} {userToDelete?.apellidos}"?
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-darker border-gray-dark text-white-primary hover:bg-gray-dark">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Eliminar Usuario
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de detalles del usuario */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white-primary">Detalles del Usuario</DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Información completa del usuario seleccionado
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <>
                {/* Foto de Perfil y Tipo de Documento */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-white-primary flex items-center gap-2">
                      <Camera className="w-4 h-4 text-orange-primary" />
                      Foto de Perfil
                    </Label>
                    <div className="flex items-center gap-3">
                      <ImageRenderer url={selectedUser.imagenUrl} className="w-16 h-16 rounded-full" fallbackVariant="person" showLabel={false} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-orange-primary" />
                        Tipo de Documento
                      </Label>
                      <Input
                        value={abreviarTipoDoc(selectedUser.tipoDocumento)}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  {/* Información Personal */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <IdCard className="w-4 h-4 text-orange-primary" />
                        Número de Documento
                      </Label>
                      <Input
                        value={selectedUser.documento}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-orange-primary" />
                        Nombres
                      </Label>
                      <Input
                        value={selectedUser.nombres}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-orange-primary" />
                        Apellidos
                      </Label>
                      <Input
                        value={selectedUser.apellidos}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-primary" />
                        Fecha de Nacimiento
                      </Label>
                      <DatePicker
                        value={selectedUser.fechaNacimiento}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-orange-primary" />
                        Rol
                      </Label>
                      <Input
                        value={selectedUser.rol}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Mail className="w-4 h-4 text-orange-primary" />
                        Correo Electrónico
                      </Label>
                      <Input
                        type="email"
                        value={selectedUser.correo}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Phone className="w-4 h-4 text-orange-primary" />
                        Número de Celular
                      </Label>
                      <Input
                        value={selectedUser.celular}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Home className="w-4 h-4 text-orange-primary" />
                        Dirección
                      </Label>
                      <Input
                        value={selectedUser.direccion}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-primary" />
                        Barrio
                      </Label>
                      <Input
                        value={selectedUser.barrio}
                        readOnly
                        className="elegante-input w-full bg-gray-dark cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-orange-primary" />
                        Estado
                      </Label>
                      <div className="flex items-center h-10 px-3 py-1 rounded-md bg-gray-dark border border-gray-medium cursor-not-allowed">
                        <span className={`std-badge ${selectedUser.status ? 'std-badge-positive' : 'std-badge-negative'}`}>
                          {selectedUser.status ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-gray-dark">
                    <button
                      onClick={() => setIsDetailDialogOpen(false)}
                      className="elegante-button-secondary"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {AlertContainer}
      </main>

      <DiscardChangesDialog
        open={isConfirmDiscardOpen}
        onKeepEditing={() => setIsConfirmDiscardOpen(false)}
        onDiscard={() => {
          setIsConfirmDiscardOpen(false);
          setShowUserFormErrors(false);
          resetForm();
          setIsDialogOpen(false);
          setEditingUser(null);
        }}
      />
    </>
  );
}
