import React, { useRef, useState, useEffect, Suspense } from "react";

const CreditoBarberosPage = React.lazy(() =>
  import("../../credito-barberos/pages/CreditoBarberosPage").then(m => ({ default: m.CreditoBarberosPage }))
);
import { Input } from "../../../shared/components/ui/input";
import { NameInput } from "../../../shared/components/ui/NameInput";
import { PhoneInput } from "../../../shared/components/ui/PhoneInput";
import { DatePicker } from "../../../shared/components/ui/DatePicker";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import {
  Users, Plus, Edit, Trash2, Mail, Phone, Calendar, User as UserIcon,
  UserCheck, UserX, Eye, ChevronLeft, FileText, Hash,
  ChevronRight, Scissors, Star, 
  TrendingUp, TrendingDown, Target, Award, Crown, Medal,
  MapPin, Home, Camera,
  Upload, ToggleRight, ToggleLeft, X, Loader2, KeyRound
} from "lucide-react";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { barberosService, Barbero, CreateBarberoData } from "../services/barberosService";
import { notifyEntityCreated } from "../../../shared/services/notificationService";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { apiService } from "../../../shared/services/api";
import { clientesService } from "../../clientes/services/clientesService";
import { useAuth } from "../../../shared/contexts/AuthContext";

const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'RC', label: 'Registro Civil' },
  { value: 'NIT', label: 'NIT' }
];
const BARBERO_LIMITS = {
  nombre: 100,
  apellido: 100,
  documento: 18,
  correo: 100,
  telefono: 20,
  especialidad: 100
};

const ESPECIALIDADES_SUGERIDAS = [
  "Corte clásico",
  "Fade",
  "Barba",
  "Colorimetría",
  "Trenzas",
  "Diseño",
  "Afeitado tradicional",
  "General",
];

export function BarberosPage() {
  const { success: successAlert, error: errorAlert, AlertContainer } = useCustomAlert();
  const { resetPassword } = useAuth();
  const [activeView, setActiveView] = useState<'barberos' | 'creditos'>('barberos');
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBarbero, setEditingBarbero] = useState<Barbero | null>(null);
  const [selectedBarbero, setSelectedBarbero] = useState<Barbero | null>(null);
  const [barberoToDelete, setBarberoToDelete] = useState<Barbero | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [newBarbero, setNewBarbero] = useState<CreateBarberoData>({
    nombre: '',
    apellido: '',
    tipoDocumento: 'CC',
    documento: '',
    correo: '',
    telefono: '',
    direccion: '',
    barrio: '',
    fechaNacimiento: '',
    rol: 'Barbero',
    status: 'active',
    fotoPerfil: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showBarberoFormErrors, setShowBarberoFormErrors] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const formatDateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayLocal = new Date();
  const maxBirthDateEight = formatDateLocal(new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate()));
  const minBirthDate = formatDateLocal(new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate()));
  const [usuariosAll, setUsuariosAll] = useState<any[]>([]);
  const [clientesAll, setClientesAll] = useState<any[]>([]);
  const edadNewBarbero = React.useMemo(() => {
    if (!newBarbero.fechaNacimiento) return null;
    const d = new Date(newBarbero.fechaNacimiento);
    if (isNaN(d.getTime())) return null;
    const today = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
    return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }, [newBarbero.fechaNacimiento]);
  const isTooYoungNewBarbero = (edadNewBarbero ?? 1000) < 8;
  const isDocDuplicateNewBarbero = React.useMemo(() => {
    const docVal = String(newBarbero.documento || '').trim();
    if (!docVal) return false;
    if (editingBarbero && docVal === String(editingBarbero.documento || '').trim()) return false;

    const existeEnBarberos = barberos.some(b => b.id !== editingBarbero?.id && String(b.documento || '').trim() === docVal);
    const existeEnUsuarios = usuariosAll.some((u: any) => u.id !== editingBarbero?.usuarioId && String(u.documento || '').trim() === docVal);
    const existeEnClientes = clientesAll.some((c: any) => String((c as any).documento || (c as any).numeroDocumento || '').trim() === docVal);
    return existeEnBarberos || existeEnUsuarios || existeEnClientes;
  }, [newBarbero.documento, barberos, usuariosAll, clientesAll, editingBarbero]);

  const isEmailDuplicateNewBarbero = React.useMemo(() => {
    const emailVal = String(newBarbero.correo || '').trim().toLowerCase();
    if (!emailVal) return false;
    if (editingBarbero && emailVal === String(editingBarbero.correo || '').trim().toLowerCase()) return false;

    const existeEnBarberos = barberos.some(b => b.id !== editingBarbero?.id && String(b.correo || '').trim().toLowerCase() === emailVal);
    const existeEnUsuarios = usuariosAll.some((u: any) => u.id !== editingBarbero?.usuarioId && String(u.correo || '').trim().toLowerCase() === emailVal);
    const existeEnClientes = clientesAll.some((c: any) => String((c?.correo || c?.Correo || c?.email || '')).trim().toLowerCase() === emailVal);
    return existeEnBarberos || existeEnUsuarios || existeEnClientes;
  }, [newBarbero.correo, barberos, usuariosAll, clientesAll, editingBarbero]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
  };

  // Cargar barberos desde la API al montar el componente
  useEffect(() => {
    loadBarberos();
  }, []);

  const loadBarberos = async () => {
    try {
      setLoading(true);
      const [data, usuariosData, clientesData] = await Promise.all([
        barberosService.getBarberos(),
        apiService.getUsuarios().catch(() => []),
        clientesService.getClientes().catch(() => [])
      ]);
      const mappedData = data.map((barbero: any) => barberosService.mapApiToComponent(barbero));
      setBarberos(mappedData);
      setUsuariosAll(usuariosData || []);
      setClientesAll(clientesData || []);
    } catch (err: unknown) {
      console.error('Error cargando barberos:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      errorAlert("Error", `No se pudieron cargar los barberos: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtros de barbero
  const filteredBarberos = barberos.filter(barbero => {
    const searchMatch = (barbero.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (barbero.apellido || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (barbero.correo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (barbero.documento || '').includes(searchTerm) ||
      (barbero.especialidad || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (barbero.status === 'active' ? 'activo' : 'inactivo').includes(searchTerm.toLowerCase());

    const statusMatch = filterStatus === "all" ||
      (filterStatus === "active" && barbero.status === 'active') ||
      (filterStatus === "inactive" && barbero.status === 'inactive');

    return searchMatch && statusMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBarberos.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedBarberos = filteredBarberos.slice(startIndex, startIndex + itemsPerPage);

  const resetForm = () => {
    setNewBarbero({
      nombre: '', apellido: '', tipoDocumento: '', documento: '', correo: '', telefono: '',
      direccion: '', barrio: '', fechaNacimiento: '', rol: 'Barbero', status: 'active', fotoPerfil: ''
    });
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const especialidadesDatalist = Array.from(
    new Set(
      [...ESPECIALIDADES_SUGERIDAS, ...barberos.map((b) => String(b.especialidad || '').trim())]
        .map((v) => v.trim())
        .filter(Boolean)
    )
  );

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        errorAlert('Formato inválido', 'Selecciona un archivo de imagen válido.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        errorAlert('Archivo muy pesado', 'La imagen no debe superar 5MB.');
        return;
      }

      setIsUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setNewBarbero((prev) => ({ ...prev, fotoPerfil: result }));
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const imageUrl = await apiService.uploadImage(file);
      setNewBarbero((prev) => ({ ...prev, fotoPerfil: imageUrl }));
    } catch (err: any) {
      console.error('Error uploading image:', err);
      errorAlert('Error al subir imagen', 'No se pudo subir la imagen al servidor. Intenta nuevamente.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeProfileImage = () => {
    setNewBarbero((prev) => ({ ...prev, fotoPerfil: '' }));
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateBarberoForm = () => {
    if (!newBarbero.tipoDocumento || !newBarbero.documento || !newBarbero.nombre || !newBarbero.apellido || !newBarbero.correo || !newBarbero.fechaNacimiento) {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newBarbero.correo)) {
      return false;
    }

    // Validar nombre único
    const nombreCompleto = `${newBarbero.nombre || ''} ${newBarbero.apellido || ''}`.trim().toLowerCase();
    const existeNombre = barberos.some(b => `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase() === nombreCompleto);
    if (existeNombre) {
      errorAlert("Nombre duplicado", "Ya existe un barbero con este nombre y apellido.");
      return false;
    }

    // Validar correo único contra Barberos/Usuarios/Clientes
    const emailVal = String(newBarbero.correo || '').trim().toLowerCase();
    if (emailVal) {
      const existeEnBarberos = barberos.some(b => String(b.correo || '').trim().toLowerCase() === emailVal);
      const existeEnUsuarios = usuariosAll.some((u: any) => String(u.correo || '').trim().toLowerCase() === emailVal);
      const existeEnClientes = clientesAll.some((c: any) => String((c?.correo || c?.Correo || c?.email || '')).trim().toLowerCase() === emailVal);
      if (existeEnBarberos || existeEnUsuarios || existeEnClientes) {
        return false;
      }
    }
    if (newBarbero.fechaNacimiento) {
      const birth = new Date(newBarbero.fechaNacimiento);
      const cutoff = new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate());
      const min = new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate());
      const edad = Math.floor((cutoff.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + 8;
      if (isNaN(birth.getTime())) {
        errorAlert("Fecha de nacimiento inválida", "Ingresa una fecha válida en formato AAAA-MM-DD.");
        return false;
      }
      if (birth > cutoff) {
        errorAlert("Edad mínima no válida", "Debe tener al menos 8 años de edad.");
        return false;
      }
      if (birth < min) {
        errorAlert("Fecha de nacimiento inválida", "No se admiten edades mayores a 70 años.");
        return false;
      }
      if (edad < 8) {
        errorAlert("Edad mínima no válida", "Debe tener al menos 8 años de edad.");
        return false;
      }
    }
    const docVal = String(newBarbero.documento || '').trim();
    const existeEnBarberos = barberos.some(b => String(b.documento || '').trim() === docVal);
    const existeEnUsuarios = usuariosAll.some((u: any) => String(u.documento || '').trim() === docVal);
    const existeEnClientes = clientesAll.some((c: any) => String((c as any).documento || (c as any).numeroDocumento || '').trim() === docVal);
    if (existeEnBarberos || existeEnUsuarios || existeEnClientes) {
      errorAlert("Documento duplicado", "Ya existe un registro con este número de documento (Usuario/Cliente/Barbero).");
      return false;
    }
    return true;
  };

  const handleCreateClick = async () => {
    setShowBarberoFormErrors(true);
    if (!validateBarberoForm()) return;
    
    // Ejecutar creación directamente
    await handleCreateBarbero();
  };

  const handleCreateBarbero = async () => {
    setShowBarberoFormErrors(true);
    if (!validateBarberoForm()) return;
    try {
      const createdBarbero = await barberosService.createBarbero({ ...newBarbero, contrasena: generatedPassword } as any);
      const mappedBarbero = barberosService.mapApiToComponent(createdBarbero);
      await notifyEntityCreated('barbero', {
        id: mappedBarbero.id,
        nombre: mappedBarbero.nombre,
        apellido: mappedBarbero.apellido,
        correo: mappedBarbero.correo,
        telefono: mappedBarbero.telefono
      });
      setBarberos([mappedBarbero, ...barberos]);
      resetForm();
      setIsDialogOpen(false);
      successAlert("¡Barbero creado exitosamente!", `El barbero "${mappedBarbero.nombre} ${mappedBarbero.apellido}" ha sido registrado en el sistema.`);

    } catch (err: unknown) {
      console.error('Error creando barbero:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      errorAlert("Error", `No se pudo crear el barbero: ${errorMessage}`);
    }
  };

  const handleEditBarbero = (barbero: Barbero) => {
    if (barbero.status !== 'active') {
      errorAlert("Registro inactivo", "Este barbero está inactivo y se maneja solo como historial.");
      return;
    }
    setEditingBarbero(barbero);
    setNewBarbero({
      nombre: barbero.nombre || '',
      apellido: barbero.apellido || '',
      tipoDocumento: barbero.tipoDocumento || '',
      documento: barbero.documento || '',
      correo: barbero.correo || '',
      telefono: barbero.telefono || '',
      direccion: barbero.direccion || '',
      barrio: barbero.barrio || '',
      fechaNacimiento: barbero.fechaNacimiento || '',
      rol: barbero.rol || 'Barbero',
      status: barbero.status || 'active',
      fotoPerfil: barbero.fotoPerfil || ''
    });
    setPreviewUrl(barbero.fotoPerfil || '');
    setShowBarberoFormErrors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsDialogOpen(true);
  };

  const handleUpdateBarbero = async () => {
    setShowBarberoFormErrors(true);
    if (!editingBarbero || !newBarbero.nombre || !newBarbero.apellido || !newBarbero.tipoDocumento || !newBarbero.documento || !newBarbero.correo || !newBarbero.telefono) {
      return;
    }
    if (newBarbero.fechaNacimiento) {
      const birth = new Date(newBarbero.fechaNacimiento);
      const cutoff = new Date(todayLocal.getFullYear() - 8, todayLocal.getMonth(), todayLocal.getDate());
      const min = new Date(todayLocal.getFullYear() - 70, todayLocal.getMonth(), todayLocal.getDate());
      const edad = Math.floor((cutoff.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + 8;
      if (isNaN(birth.getTime())) {
        errorAlert("Fecha de nacimiento inválida", "Ingresa una fecha válida en formato AAAA-MM-DD.");
        return;
      }
      if (birth > cutoff) {
        errorAlert("Edad mínima no válida", "Debe tener al menos 8 años de edad.");
        return;
      }
      if (birth < min) {
        errorAlert("Fecha de nacimiento inválida", "No se admiten edades mayores a 70 años.");
        return;
      }
      if (edad < 8) {
        errorAlert("Edad mínima no válida", "Debe tener al menos 8 años de edad.");
        return;
      }
    }

    const nombreCompleto = `${newBarbero.nombre || ''} ${newBarbero.apellido || ''}`.trim().toLowerCase();
    if (nombreCompleto !== `${editingBarbero.nombre || ''} ${editingBarbero.apellido || ''}`.trim().toLowerCase()) {
      const existeNombre = barberos.some(b => b.id !== editingBarbero.id && `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase() === nombreCompleto);
      if (existeNombre) {
        errorAlert("Nombre duplicado", "Ya existe otro barbero con este nombre y apellido.");
        return;
      }
    }

    const docVal = String(newBarbero.documento || '').trim();
    if (newBarbero.documento !== editingBarbero.documento) {
      const existeEnBarberos = barberos.some(b => b.id !== editingBarbero.id && String(b.documento || '').trim() === docVal);
      const existeEnUsuarios = usuariosAll.some((u: any) => u.id !== editingBarbero.usuarioId && String(u.documento || '').trim() === docVal);
      const existeEnClientes = clientesAll.some((c: any) => String((c as any).documento || (c as any).numeroDocumento || '').trim() === docVal);
      if (existeEnBarberos || existeEnUsuarios || existeEnClientes) {
        errorAlert("Documento duplicado", "Ya existe un registro con este número de documento (Usuario/Cliente/Barbero).");
        return;
      }
    }

    try {
      // Mapear datos del componente a la API
      const apiData = barberosService.mapComponentToApi({
        ...newBarbero,
        id: editingBarbero.id,
        usuarioId: editingBarbero.usuarioId
      });

      const updatedBarbero = await barberosService.updateBarbero(editingBarbero.id, apiData);
      const mappedBarbero = barberosService.mapApiToComponent(updatedBarbero);
      
      mappedBarbero.id = editingBarbero.id; // Asegurar que sea el ID original para evitar duplicación visual

      setBarberos(barberos.map(b => b.id === editingBarbero.id ? mappedBarbero : b));
      resetForm();
      setIsDialogOpen(false);
      setEditingBarbero(null);
      successAlert("Barbero actualizado", `Los datos de ${mappedBarbero.nombre} han sido actualizados exitosamente.`);
    } catch (err: unknown) {
      console.error('Error actualizando barbero:', err);
      errorAlert("Error", "No se pudo actualizar el barbero. Por favor intenta nuevamente.");
    }
  };

  const handleDeleteBarbero = (id: number) => {
    const barbero = barberos.find(b => b.id === id);
    if (barbero) {
      if (barbero.status !== 'active') {
        errorAlert("Registro inactivo", "Este barbero está inactivo y no permite acciones.");
        return;
      }
      setBarberoToDelete(barbero);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteBarbero = async () => {
    if (!barberoToDelete) return;

    try {
      await barberosService.deleteBarbero(barberoToDelete.id, {
        correo: barberoToDelete.correo,
        documento: barberoToDelete.documento,
        tipoDocumento: barberoToDelete.tipoDocumento
      });
      // Verificar si realmente fue eliminado
      let exists = false;
      try {
        const all = await barberosService.getBarberos();
        exists = !!all.find(b => b.id === barberoToDelete.id);
      } catch { exists = false; }
      if (exists) {
        try {
          await barberosService.updateBarberoStatus(barberoToDelete.id, false);
          setBarberos(prev => prev.map(b => b.id === barberoToDelete.id ? { ...b, status: 'inactive', estado: false } : b));
          successAlert("Barbero desactivado", "Este barbero tiene registros asociados. Se desactivó para conservar el historial.");
        } catch {
          errorAlert("No se puede eliminar", "Este barbero tiene registros asociados (ventas, compras, agendamientos o entregas de insumos). Solo se puede desactivar para conservar el historial.");
        }
        // Evitar éxito de eliminación del confirmador
        throw new Error('DEACTIVATED_INSTEAD');
      }
      setBarberos(barberos.filter(b => b.id !== barberoToDelete.id));
      setIsDeleteDialogOpen(false);
      setBarberoToDelete(null);
      successAlert("Barbero eliminado", `El barbero ${barberoToDelete.nombre} ${barberoToDelete.apellido} ha sido eliminado del sistema.`);
    } catch (err: unknown) {
      console.error('Error eliminando barbero:', err);
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
          await barberosService.updateBarberoStatus(barberoToDelete.id, false);
          setBarberos(prev => prev.map(b => b.id === barberoToDelete.id ? { ...b, status: 'inactive', estado: false } : b));
          successAlert("Barbero desactivado", "Este barbero tiene registros asociados. Se desactivó para conservar el historial.");
        } catch {
          errorAlert("No se puede eliminar", "Este barbero tiene registros asociados (ventas, compras, agendamientos o entregas de insumos). Solo se puede desactivar para conservar el historial.");
        }
      } else {
        // suprimir alerta grande genérica
      }
    }
  };

  const toggleBarberoStatus = async (id: number) => {
    const barbero = barberos.find(b => b.id === id);
    if (!barbero) return;

    const newStatus = barbero.status === 'active' ? 'inactive' : 'active';
    const newEstado = newStatus === 'active';

    try {
      await barberosService.updateBarberoStatus(id, newEstado);
      setBarberos(prev => prev.map(b => b.id === id ? { ...b, status: newStatus, estado: newEstado } : b));
      successAlert(newStatus === 'active' ? "Barbero activado" : "Barbero desactivado",
        `${barbero.nombre} ahora está ${newStatus === 'active' ? "activo" : "inactivo"}`);
    } catch (err: unknown) {
      console.error('Error cambiando estado:', err);
      errorAlert("Error", "No se pudo cambiar el estado del barbero.");
    }
  };

  const handleSendPasswordSetup = async (email: string) => {
    try {
      const res = await resetPassword(email);
      if (res.success) {
        successAlert("Enlace enviado", "Se envió un enlace para configurar la contraseña.");
      } else {
        errorAlert("No se pudo enviar", res.error || "Intenta nuevamente.");
      }
    } catch (e: any) {
      errorAlert("No se pudo enviar", e?.message || "Intenta nuevamente.");
    }
  };

  return (
    <>
      <AlertContainer />
      <header className="bg-black-primary px-8 py-6">
        <h1 className="text-2xl font-semibold text-white-primary">Barberos</h1>
        <p className="text-sm text-gray-lightest mt-1">Administra el personal de la barbería</p>
      </header>

      {/* Switch de vista — debajo del título, encima de la tabla */}
      <div className="bg-black-primary pb-0 flex justify-center gap-16">
        <button
          type="button"
          onClick={() => setActiveView('barberos')}
          className={`px-6 py-3 text-lg font-semibold cursor-pointer border-b-2 ${
            activeView === 'barberos'
              ? 'text-orange-primary border-orange-primary'
              : 'text-gray-lighter border-transparent hover:text-gray-lightest'
          }`}
          style={{ transition: 'color 200ms ease, border-color 200ms ease' }}
        >
          Barberos
        </button>
        <button
          type="button"
          onClick={() => setActiveView('creditos')}
          className={`px-6 py-3 text-lg font-semibold cursor-pointer border-b-2 ${
            activeView === 'creditos'
              ? 'text-orange-primary border-orange-primary'
              : 'text-gray-lighter border-transparent hover:text-gray-lightest'
          }`}
          style={{ transition: 'color 200ms ease, border-color 200ms ease' }}
        >
          Deudas
        </button>
      </div>

      {activeView === 'creditos' ? (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-orange-primary animate-pulse text-sm">Cargando módulo de créditos...</div>}>
          <style>{`.cred-embed .cred-root { min-height: 0 !important; } .cred-embed > .cred-root > .p-6 { padding: 0 !important; }`}</style>
          <main className="cred-embed flex-1 overflow-auto bg-black-primary">
            <CreditoBarberosPage />
          </main>
        </Suspense>
      ) : null}

      <main className={`flex-1 overflow-auto bg-black-primary${activeView === 'creditos' ? ' hidden' : ''}`}>
        <div className="std-card">
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <button
                onClick={() => {
                  setEditingBarbero(null);
                  resetForm();
                  generatePassword();
                  setIsDialogOpen(true);
                }}
                className="btn-std-primary"
              >
                <Plus className="w-4 h-4" />
                Nuevo Barbero
              </button>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar por nombre, correo o documento..."
            statusFilter={{
              value: filterStatus,
              onChange: (value) => {
                setFilterStatus(value);
                setCurrentPage(1);
              },
              options: [
                { value: "all", label: "Todos" },
                { value: "active", label: "Activos" },
                { value: "inactive", label: "Inactivos" },
              ],
            }}
            recordsText={`Mostrando ${displayedBarberos.length} de ${filteredBarberos.length} barberos`}
            recordsPlacement="right"
          />

          <div className="std-table-wrapper">
            <table className="std-table">
              <thead className={loading ? "std-thead [&_th]:!text-transparent [&_th]:select-none" : "std-thead"}>
                <tr className="text-center border-b border-gray-dark">
                  <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Documento</th>
                  <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Barbero</th>
                  <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Contacto</th>
                  <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Saldo Crédito</th>
                  <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Estado</th>
                  <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody className="std-tbody">
                {loading ? (
                  <TableLoadingStateRow
                    colSpan={6}
                    title="Cargando barberos..."
                  />
                ) : displayedBarberos.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={6}
                    title="No se encontraron barberos"
                    description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                    onReload={loadBarberos}
                  />
                ) : (
                  displayedBarberos.map(barbero => (
                    <tr key={barbero.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                      <td className="py-4 px-4 text-gray-lighter text-center">
                        {barbero.tipoDocumento} {barbero.documento}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center gap-3">
                          <ImageRenderer
                            url={barbero.fotoPerfil}
                            alt={`Foto de ${barbero.nombre}`}
                            className="w-10 h-10 rounded-full border-2 border-orange-primary shadow-sm"
                            fallbackVariant="person"
                            showLabel={false}
                          />
                          <span className="text-gray-lighter">{barbero.nombre} {barbero.apellido}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col">
                          <span className="text-gray-lighter text-sm">{barbero.correo}</span>
                          <span className="text-gray-lightest text-xs">{barbero.telefono}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          (barbero.saldoDisponible ?? 200000) <= 0
                            ? 'bg-red-900/30 text-red-400 border-red-500/30'
                            : (barbero.saldoDisponible ?? 200000) < 50000
                            ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'
                            : 'bg-green-900/30 text-green-400 border-green-500/30'
                        }`}>
                          ${(barbero.saldoDisponible ?? 200000).toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`std-badge ${barbero.status === 'active' ? 'std-badge-positive' : 'std-badge-negative'}`}>
                          {barbero.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-center">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleBarberoStatus(barbero.id)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title={barbero.status === 'active' ? 'Desactivar' : 'Activar'}
                          >
                            {barbero.status === 'active' ? (
                              <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400 transition-colors" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400 transition-colors" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBarbero(barbero);
                              setIsDetailDialogOpen(true);
                            }}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                          <button
                            onClick={() => handleEditBarbero(barbero)}
                            disabled={barbero.status !== 'active'}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={barbero.status === 'active' ? "Editar" : "Barbero inactivo (solo historial)"}
                          >
                            <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => {
                              if (barbero.status !== 'active') {
                                errorAlert("Registro inactivo", "Este barbero está inactivo y no permite acciones.");
                                return;
                              }
                              handleSendPasswordSetup(barbero.correo);
                            }}
                            disabled={barbero.status !== 'active'}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={barbero.status === 'active' ? "Enviar enlace de contraseña" : "Barbero inactivo (solo historial)"}
                          >
                            <KeyRound className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                          <button
                            onClick={() => handleDeleteBarbero(barbero.id)}
                            disabled={barbero.status !== 'active'}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={barbero.status === 'active' ? "Eliminar" : "Barbero inactivo (solo historial)"}
                          >
                            <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-500" />
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

      {/* Dialogo de Creación/Edición */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto text-white-primary">
          <DialogHeader>
            <DialogTitle className="text-white-primary">
              {editingBarbero ? 'Editar Barbero' : 'Añadir Nuevo Barbero'}
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              {editingBarbero
                ? 'Modifica los datos del barbero seleccionado'
                : 'Completa la información del nuevo barbero. Los campos marcados con * son obligatorios.'}
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
                        className="w-full h-full rounded-full"
                        fallbackVariant="person"
                        showLabel={false}
                      />
                      {previewUrl && (
                        <button
                          onClick={removeProfileImage}
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
                    disabled={isUploadingImage}
                    className="elegante-button-secondary text-xs px-3 py-1.5 gap-1.5 flex items-center"
                    type="button"
                  >
                    {isUploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    {isUploadingImage ? 'Subiendo...' : (previewUrl ? 'Cambiar' : 'Subir')}
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-primary" />
                  Tipo de Documento *
                </Label>
                <Select value={newBarbero.tipoDocumento} onValueChange={(val) => setNewBarbero({ ...newBarbero, tipoDocumento: val })}>
                  <SelectTrigger className={`elegante-input w-full ${showBarberoFormErrors && !newBarbero.tipoDocumento ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark">
                    {TIPOS_DOCUMENTO.map(td => (
                      <SelectItem key={td.value} value={td.value} className="text-white-primary">{td.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  value={newBarbero.documento}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/\D/g, '');
                    setNewBarbero({ ...newBarbero, documento: numeric });
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={BARBERO_LIMITS.documento}
                  className={`elegante-input w-full ${showBarberoFormErrors && !newBarbero.documento.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  placeholder="Número de documento (solo números)"
                />
                {showBarberoFormErrors && !newBarbero.documento.trim() && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              {isDocDuplicateNewBarbero && <p className="text-xs text-red-400">Documento ya existe en el sistema.</p>}
              </div>
              <div className="space-y-2 pb-5">
                <Label className="text-white-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-primary" />
                  Nombres *
                </Label>
              <NameInput
                value={newBarbero.nombre}
                onChange={(val) => setNewBarbero({ ...newBarbero, nombre: val })}
                className={`elegante-input w-full ${showBarberoFormErrors && !newBarbero.nombre.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                placeholder="Ingresa los nombres"
              />
              {showBarberoFormErrors && !newBarbero.nombre.trim() && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
            </div>
              <div className="space-y-2 pb-5">
                <Label className="text-white-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-primary" />
                  Apellidos *
                </Label>
              <NameInput
                value={newBarbero.apellido}
                onChange={(val) => setNewBarbero({ ...newBarbero, apellido: val })}
                className={`elegante-input w-full ${showBarberoFormErrors && !newBarbero.apellido.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                placeholder="Ingresa los apellidos"
              />
              {showBarberoFormErrors && !newBarbero.apellido.trim() && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
            </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-primary" />
                  Fecha de Nacimiento *
                </Label>
                <DatePicker
                  value={newBarbero.fechaNacimiento}
                  onChange={(val) => setNewBarbero({ ...newBarbero, fechaNacimiento: val })}
                  min={minBirthDate}
                  max={maxBirthDateEight}
                  error={showBarberoFormErrors && !newBarbero.fechaNacimiento}
                  requiredMessage="Este campo es obligatorio."
                />
              {!!edadNewBarbero && <p className={`text-xs ${isTooYoungNewBarbero ? 'text-red-400' : 'text-gray-lightest'}`}>Edad: {edadNewBarbero} años{isTooYoungNewBarbero ? ' (mínimo 8)' : ''}</p>}
              </div>
            </div>

            {/* Información de Contacto + Especialidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-primary" />
                  Correo Electrónico *
                </Label>
              <Input
                type="email"
                value={newBarbero.correo}
                onChange={(e) => setNewBarbero({ ...newBarbero, correo: e.target.value })}
                maxLength={BARBERO_LIMITS.correo}
               className={`elegante-input w-full ${
                 ((showBarberoFormErrors && (!newBarbero.correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBarbero.correo))) || isEmailDuplicateNewBarbero)
                   ? 'border-red-500 ring-1 ring-red-500'
                   : ''
               }`}
                placeholder="correo@ejemplo.com"
              />
              {showBarberoFormErrors && !newBarbero.correo.trim() && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              {showBarberoFormErrors && newBarbero.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBarbero.correo) && <p className="text-xs text-red-400">Formato de correo inválido.</p>}
            {isEmailDuplicateNewBarbero && <p className="text-xs text-red-400">Correo ya existe en el sistema.</p>}
            </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-primary" />
                  Número de Celular
                </Label>
              <PhoneInput
                value={newBarbero.telefono}
                onChange={(value) => setNewBarbero({ ...newBarbero, telefono: value })}
                className={`w-full ${showBarberoFormErrors && !newBarbero.telefono.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                placeholder="3001234567"
              />
              {showBarberoFormErrors && !newBarbero.telefono.trim() && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
            </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-orange-primary" />
                  Especialidad
                </Label>
              <Input
                value={newBarbero.especialidad}
                onChange={(e) => setNewBarbero({ ...newBarbero, especialidad: e.target.value })}
                list="barbero-especialidades"
                maxLength={BARBERO_LIMITS.especialidad}
                className="elegante-input w-full"
                placeholder="Ej: Fade"
              />
              <datalist id="barbero-especialidades">
                {especialidadesDatalist.map((especialidad) => (
                  <option key={especialidad} value={especialidad} />
                ))}
              </datalist>
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
                  value={newBarbero.direccion}
                  onChange={(e) => setNewBarbero({ ...newBarbero, direccion: e.target.value })}
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
                  value={newBarbero.barrio}
                  onChange={(e) => setNewBarbero({ ...newBarbero, barrio: e.target.value })}
                  className="elegante-input w-full"
                  placeholder="Nombre del barrio"
                />
              </div>
            </div>

            {/* Contraseña temporal generada automáticamente al crear (no visible en el formulario) */}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => {
              setShowBarberoFormErrors(false);
              setIsDialogOpen(false);
            }} className="elegante-button-secondary">
              Cancelar
            </button>
            <button
              onClick={editingBarbero ? handleUpdateBarbero : handleCreateClick}
              className="elegante-button-primary"
            >
              {editingBarbero ? 'Actualizar' : 'Crear Barbero'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo de Detalles */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto text-white-primary">
          <DialogHeader>
            <DialogTitle className="text-white-primary">Detalles del Barbero</DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Información detallada del barbero seleccionado.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBarbero && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Camera className="w-4 h-4 text-orange-primary" />
                    Foto de Perfil
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-orange-primary flex items-center justify-center bg-gray-dark">
                      <ImageRenderer
                        url={selectedBarbero.fotoPerfil}
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
                    value={TIPOS_DOCUMENTO.find(td => td.value === selectedBarbero.tipoDocumento)?.label || selectedBarbero.tipoDocumento}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Hash className="w-4 h-4 text-orange-primary" />
                    Número de Documento
                  </Label>
                  <Input
                    value={selectedBarbero.documento}
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
                    value={selectedBarbero.nombre}
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
                    value={selectedBarbero.apellido}
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
                    value={selectedBarbero.fechaNacimiento}
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-primary" />
                    Correo Electrónico
                  </Label>
                  <Input
                    type="email"
                    value={selectedBarbero.correo}
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
                    value={selectedBarbero.telefono}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-orange-primary" />
                    Especialidad
                  </Label>
                  <Input
                    value={selectedBarbero.especialidad}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <ToggleRight className="w-4 h-4 text-orange-primary" />
                    Estado
                  </Label>
                  <Input
                    value={selectedBarbero.status === 'active' ? 'Activo' : 'Inactivo'}
                    readOnly
                    className={`elegante-input w-full cursor-default ${selectedBarbero.status === 'active' ? 'text-green-400' : 'text-red-400'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-primary" />
                    Dirección
                  </Label>
                  <Input
                    value={selectedBarbero.direccion}
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
                    value={selectedBarbero.barrio}
                    readOnly
                    className="elegante-input w-full opacity-80 cursor-default"
                  />
                </div>
              </div>

              {/* Saldo de crédito */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-primary" />
                    Saldo Crédito Disponible
                  </Label>
                  <div className={`elegante-input w-full flex items-center gap-2 px-3 py-2 rounded-md border font-semibold ${
                    (selectedBarbero.saldoDisponible ?? 200000) <= 0
                      ? 'border-red-500/40 text-red-400 bg-red-900/10'
                      : (selectedBarbero.saldoDisponible ?? 200000) < 50000
                      ? 'border-yellow-500/40 text-yellow-400 bg-yellow-900/10'
                      : 'border-green-500/40 text-green-400 bg-green-900/10'
                  }`}>
                    ${(selectedBarbero.saldoDisponible ?? 200000).toLocaleString('es-CO')}
                    <span className="ml-2 text-xs font-normal opacity-70">
                      {(selectedBarbero.saldoDisponible ?? 200000) <= 0
                        ? '— Sin cupo disponible'
                        : (selectedBarbero.saldoDisponible ?? 200000) < 50000
                        ? '— Cupo bajo'
                        : '— Cupo disponible'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 mt-6 border-t border-gray-dark">
            <button onClick={() => setIsDetailDialogOpen(false)} className="elegante-button-primary px-8">
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alerta de Eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-darkest border-gray-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary text-xl">¿Eliminar barbero?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest font-medium">
              Esta acción eliminará permanentemente al barbero <span className="text-orange-primary">"{barberoToDelete?.nombre} {barberoToDelete?.apellido}"</span> y todo su historial asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="bg-transparent border-gray-dark text-white-primary hover:bg-gray-darker">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBarbero}
              className="bg-red-600 text-white hover:bg-red-700 font-semibold"
            >
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
