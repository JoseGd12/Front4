import React, { useRef, useState, useEffect } from "react";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
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

export function BarberosPage() {
  const { success: successAlert, error: errorAlert, AlertContainer } = useCustomAlert();
  const { resetPassword } = useAuth();
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
  const [isCreateConfirmOpen, setIsCreateConfirmOpen] = useState(false);
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
    const existeEnBarberos = barberos.some(b => String(b.documento || '').trim() === docVal);
    const existeEnUsuarios = usuariosAll.some((u: any) => String(u.documento || '').trim() === docVal);
    const existeEnClientes = clientesAll.some((c: any) => String((c as any).documento || (c as any).numeroDocumento || '').trim() === docVal);
    return existeEnBarberos || existeEnUsuarios || existeEnClientes;
  }, [newBarbero.documento, barberos, usuariosAll, clientesAll]);
  const isEmailDuplicateNewBarbero = React.useMemo(() => {
    const emailVal = String(newBarbero.correo || '').trim().toLowerCase();
    if (!emailVal) return false;
    const existeEnBarberos = barberos.some(b => String(b.correo || '').trim().toLowerCase() === emailVal);
    const existeEnUsuarios = usuariosAll.some((u: any) => String(u.correo || '').trim().toLowerCase() === emailVal);
    const existeEnClientes = clientesAll.some((c: any) => String((c?.correo || c?.Correo || c?.email || '')).trim().toLowerCase() === emailVal);
    return existeEnBarberos || existeEnUsuarios || existeEnClientes;
  }, [newBarbero.correo, barberos, usuariosAll, clientesAll]);

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
      (barbero.documento || '').includes(searchTerm);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
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
      setLoading(false);
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

  const handleCreateClick = () => {
    setShowBarberoFormErrors(true);
    if (!validateBarberoForm()) return;
    setIsCreateConfirmOpen(true);
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
      setIsCreateConfirmOpen(false);
      successAlert("¡Barbero creado exitosamente!", `El barbero "${mappedBarbero.nombre} ${mappedBarbero.apellido}" ha sido registrado en el sistema.`);

    } catch (err: unknown) {
      console.error('Error creando barbero:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      errorAlert("Error", `No se pudo crear el barbero: ${errorMessage}`);
    }
  };

  const handleEditBarbero = (barbero: Barbero) => {
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
    const docVal = String(newBarbero.documento || '').trim();
    if (newBarbero.documento !== editingBarbero.documento) {
      const existeEnBarberos = barberos.some(b => b.id !== editingBarbero.id && String(b.documento || '').trim() === docVal);
      const existeEnUsuarios = usuariosAll.some((u: any) => String(u.documento || '').trim() === docVal);
      const existeEnClientes = clientesAll.some((c: any) => String((c as any).documento || (c as any).numeroDocumento || '').trim() === docVal);
      if (existeEnBarberos || existeEnUsuarios || existeEnClientes) {
        return;
      }
    }

    try {
      // Mapear datos del componente a la API
      const apiData = barberosService.mapComponentToApi({
        ...newBarbero,
        id: editingBarbero.id
      });

      const updatedBarbero = await barberosService.updateBarbero(editingBarbero.id, apiData);
      const mappedBarbero = barberosService.mapApiToComponent(updatedBarbero);

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
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Gestión de Barberos</h1>
            <p className="text-sm text-gray-lightest mt-1">Administra el personal de la barbería</p>
          </div>

        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        <div className="elegante-card">
          <TableHeaderSection
            leftContent={(
              <button
                onClick={() => {
                  setEditingBarbero(null);
                  resetForm();
                  generatePassword();
                  setIsDialogOpen(true);
                }}
                className="elegante-button-primary gap-2 flex items-center"
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
            recordsPlacement="left"
          />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={loading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                <tr className="text-left border-b border-gray-dark">
                  <th className="py-4 px-4 text-white-primary font-bold">Documento</th>
                  <th className="py-4 px-4 text-white-primary font-bold">Barbero</th>
                  <th className="py-4 px-4 text-white-primary font-bold">Contacto</th>
                  <th className="py-4 px-4 text-white-primary font-bold">Especialidad</th>
                  <th className="py-4 px-4 text-white-primary font-bold">Estado</th>
                  <th className="py-4 px-4 text-white-primary font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
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
                      <td className="py-4 px-4 text-gray-lighter">
                        {barbero.tipoDocumento} {barbero.documento}
                      </td>
                      <td className="py-4 px-4">
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
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-gray-lighter text-sm">{barbero.correo}</span>
                          <span className="text-gray-lightest text-xs">{barbero.telefono}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-dark text-orange-primary border border-orange-primary/20">
                          {barbero.especialidad || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${barbero.status === 'active'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                          {barbero.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleBarberoStatus(barbero.id)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title={barbero.status === 'active' ? 'Desactivar' : 'Activar'}
                          >
                            {barbero.status === 'active' ? (
                              <ToggleRight className="w-4 h-4 text-green-400" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-red-400" />
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
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleSendPasswordSetup(barbero.correo)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Enviar enlace de contraseña"
                          >
                            <KeyRound className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                          <button
                            onClick={() => handleDeleteBarbero(barbero.id)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Eliminar"
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
                    className="elegante-button-secondary text-xs px-3 py-1.5 gap-1.5 flex items-center"
                    type="button"
                  >
                    <Camera className="w-3 h-3" />
                    {previewUrl ? 'Cambiar' : 'Subir'}
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
                <select
                  value={newBarbero.tipoDocumento}
                  onChange={(e) => setNewBarbero({ ...newBarbero, tipoDocumento: e.target.value })}
                  className={`elegante-input w-full ${showBarberoFormErrors && !newBarbero.tipoDocumento ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  disabled={!!editingBarbero}
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_DOCUMENTO.map(td => (
                    <option key={td.value} value={td.value}>{td.label}</option>
                  ))}
                </select>
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
                  disabled={!!editingBarbero}
                />
                {showBarberoFormErrors && !newBarbero.documento.trim() && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              {isDocDuplicateNewBarbero && !editingBarbero && <p className="text-xs text-red-400">Documento ya existe en el sistema.</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-primary" />
                  Nombres *
                </Label>
              <Input
                value={newBarbero.nombre}
                onChange={(e) => setNewBarbero({ ...newBarbero, nombre: e.target.value })}
                maxLength={BARBERO_LIMITS.nombre}
                className={`elegante-input w-full ${showBarberoFormErrors && !newBarbero.nombre.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                placeholder="Ingresa los nombres"
              />
              {showBarberoFormErrors && !newBarbero.nombre.trim() && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
            </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-orange-primary" />
                  Apellidos *
                </Label>
              <Input
                value={newBarbero.apellido}
                onChange={(e) => setNewBarbero({ ...newBarbero, apellido: e.target.value })}
                maxLength={BARBERO_LIMITS.apellido}
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
                <Input
                  type="date"
                  value={newBarbero.fechaNacimiento}
                  onChange={(e) => setNewBarbero({ ...newBarbero, fechaNacimiento: e.target.value })}
                  min={minBirthDate}
                  max={maxBirthDateEight}
                  className={`elegante-input w-full ${showBarberoFormErrors && !newBarbero.fechaNacimiento ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                />
                {showBarberoFormErrors && !newBarbero.fechaNacimiento && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
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
                 ((showBarberoFormErrors && (!newBarbero.correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBarbero.correo))) || (isEmailDuplicateNewBarbero && !editingBarbero))
                   ? 'border-red-500 ring-1 ring-red-500'
                   : ''
               }`}
                placeholder="correo@ejemplo.com"
              />
              {showBarberoFormErrors && !newBarbero.correo.trim() && <p className="text-xs text-red-400">Este campo es obligatorio.</p>}
              {showBarberoFormErrors && newBarbero.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newBarbero.correo) && <p className="text-xs text-red-400">Formato de correo inválido.</p>}
            {isEmailDuplicateNewBarbero && !editingBarbero && <p className="text-xs text-red-400">Correo ya existe en el sistema.</p>}
            </div>
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-primary" />
                  Número de Celular
                </Label>
              <Input
                value={newBarbero.telefono}
                onChange={(e) => setNewBarbero({ ...newBarbero, telefono: e.target.value })}
                maxLength={BARBERO_LIMITS.telefono}
                className={`elegante-input w-full ${showBarberoFormErrors && !newBarbero.telefono.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                placeholder="+57 300 123 4567"
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
                maxLength={BARBERO_LIMITS.especialidad}
                className="elegante-input w-full"
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

      <AlertDialog open={isCreateConfirmOpen} onOpenChange={setIsCreateConfirmOpen}>
        <AlertDialogContent className="bg-gray-darkest border-gray-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary">Confirmar Creación</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest">
              ¿Deseas crear este barbero con la información ingresada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsCreateConfirmOpen(false)}
              className="bg-transparent border-gray-dark text-white-primary hover:bg-gray-darker"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateBarbero}
              className="elegante-button-primary"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogo de Detalles */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl text-white-primary">
          <DialogHeader>
            <DialogTitle>Detalles del Barbero</DialogTitle>
          </DialogHeader>
          {selectedBarbero && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-6 p-4 bg-gray-darker rounded-lg border border-gray-dark">
                <ImageRenderer url={selectedBarbero.fotoPerfil} className="h-24 w-24 rounded-full border-2 border-orange-primary" fallbackVariant="person" showLabel={false} />
                <div>
                  <h3 className="text-2xl font-bold text-white-primary">{selectedBarbero.nombre} {selectedBarbero.apellido}</h3>
                  <p className="text-orange-primary font-medium">{selectedBarbero.especialidad || 'General'}</p>
                  <p className="text-gray-lightest text-sm mt-1">ID Sistema: {selectedBarbero.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-2">
                <div>
                  <Label className="text-gray-lightest text-xs uppercase tracking-wider">Documento</Label>
                  <p className="text-white-primary py-1 border-b border-gray-dark">{selectedBarbero.tipoDocumento} {selectedBarbero.documento}</p>
                </div>
                <div>
                  <Label className="text-gray-lightest text-xs uppercase tracking-wider">Estado</Label>
                  <p className={`py-1 border-b border-gray-dark ${selectedBarbero.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedBarbero.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-lightest text-xs uppercase tracking-wider">Correo</Label>
                  <p className="text-white-primary py-1 border-b border-gray-dark">{selectedBarbero.correo}</p>
                </div>
                <div>
                  <Label className="text-gray-lightest text-xs uppercase tracking-wider">Teléfono</Label>
                  <p className="text-white-primary py-1 border-b border-gray-dark">{selectedBarbero.telefono}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-lightest text-xs uppercase tracking-wider">Dirección</Label>
                  <p className="text-white-primary py-1 border-b border-gray-dark">{selectedBarbero.direccion || 'No especificada'} {selectedBarbero.barrio ? ` - ${selectedBarbero.barrio}` : ''}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end mt-6">
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
