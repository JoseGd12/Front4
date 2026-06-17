import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { User, Mail, Shield, UserCircle, Briefcase, Phone, Calendar, Edit, Camera, Save, X, Loader2, Upload, LogOut, DollarSign, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../../shared/components/ui/dialog";
import { Input } from "../../../shared/components/ui/input";
import { PhoneInput } from "../../../shared/components/ui/PhoneInput";
import { Label } from "../../../shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { firebaseAuthService } from "../../../shared/services/firebase";
import { apiService } from "../../../shared/services/api";
import { clientesService } from "../services/clientesService";

interface ClientePerfilPageProps {
  autoOpenEdit?: boolean;
  onAutoOpenEditDone?: () => void;
}

export function ClientePerfilPage({ autoOpenEdit, onAutoOpenEditDone }: ClientePerfilPageProps = {}) {
  const { user, updateUser, logout } = useAuth();
  const { success, error: showErrorAlert, info: showInfoAlert, AlertContainer } = useCustomAlert();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFormDataRef = useRef<typeof formData | null>(null);
  
  // Estado para el formulario
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    fotoPerfil: "",
    tipoDocumento: "CC",
    documento: "",
    fechaNacimiento: "",
    direccion: "",
    barrio: ""
  });

  const [clienteExtraData, setClienteExtraData] = useState({
    tipoDocumento: "CC",
    documento: "",
    fechaNacimiento: "",
    direccion: "",
    barrio: ""
  });

  // Abrir edición automáticamente si viene del modal de perfil incompleto
  useEffect(() => {
    if (autoOpenEdit) {
      setIsEditDialogOpen(true);
      if (onAutoOpenEditDone) onAutoOpenEditDone();
    }
  }, [autoOpenEdit]);

  // Cargar datos del usuario cuando abre el diálogo
  useEffect(() => {
    if (user) {
      const nameParts = (user.name || "").split(" ");
      const newData = {
        nombre: nameParts[0] || "",
        apellido: nameParts.slice(1).join(" ") || "",
        email: user.email || "",
        telefono: user.telefono || "",
        fotoPerfil: user.fotoPerfil || "",
        tipoDocumento: clienteExtraData.tipoDocumento || "CC",
        documento: clienteExtraData.documento || "",
        fechaNacimiento: clienteExtraData.fechaNacimiento || "",
        direccion: clienteExtraData.direccion || "",
        barrio: clienteExtraData.barrio || ""
      };
      setFormData(newData);
      if (isEditDialogOpen) {
        initialFormDataRef.current = newData;
      }
    }
  }, [user, isEditDialogOpen, clienteExtraData]);

  const [saldoAFavor, setSaldoAFavor] = useState<number>(0);
  const [isLoadingSaldo, setIsLoadingSaldo] = useState(true);

  useEffect(() => {
    if (user?.email) {
      const fetchSaldo = async () => {
        setIsLoadingSaldo(true);
        try {
          const allClientes = await clientesService.getClientes();
          const cliente = allClientes.find(c => (c.correo || "").toLowerCase() === user.email.toLowerCase());
          if (cliente) {
            const disponible = await clientesService.getSaldoDisponible(Number(cliente.id));
            setSaldoAFavor(disponible);
            const mapped = clientesService.mapApiToComponent(cliente);
            setClienteExtraData({
              tipoDocumento: mapped.tipoDocumento || "CC",
              documento: mapped.numeroDocumento || "",
              fechaNacimiento: mapped.fechaNacimiento ? String(mapped.fechaNacimiento).split('T')[0] : "",
              direccion: mapped.direccion || "",
              barrio: mapped.barrio || ""
            });
          }
        } catch (err) {
          console.error("Error fetching saldo:", err);
        } finally {
          setIsLoadingSaldo(false);
        }
      };
      fetchSaldo();
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showErrorAlert("Formato no válido", "Solo se permiten imágenes (JPG, PNG, GIF, WebP).");
      return;
    }

    try {
      setIsUploadingImage(true);
      const imageUrl = await apiService.uploadImage(file);
      setFormData(prev => ({ ...prev, fotoPerfil: imageUrl }));
      success("Imagen subida", "La imagen se ha subido correctamente.");
    } catch (err: any) {
      console.error("Error uploading image:", err);
      showErrorAlert("Error al subir", "No se pudo subir la imagen.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      const emailChanged = formData.email.toLowerCase() !== user.email.toLowerCase();
      
      // 1. Intentar actualizar en Firebase si el correo cambió
      if (emailChanged) {
        const currentUser = firebaseAuthService.getCurrentUser();
        if (currentUser) {
          try {
            const { verifyBeforeUpdateEmail } = await import("firebase/auth");
            await verifyBeforeUpdateEmail(currentUser, formData.email);
            showInfoAlert("Cambio de correo iniciado", "Revisa tu bandeja de entrada para verificar el nuevo correo. La sesión se cerrará en segundos por seguridad.");
            
            // Cerrar sesión después de un breve retraso para que vean el mensaje
            setTimeout(() => {
              logout();
            }, 3000);
            return; // Detenemos la ejecución del resto de la función
          } catch (firebaseErr: any) {
             if (firebaseErr.code === 'auth/requires-recent-login') {
               showErrorAlert("Sesión expirada", "Por seguridad, debes cerrar sesión y volver a entrar para cambiar tu correo.");
               setIsSubmitting(false);
               return;
             }
             throw firebaseErr;
          }
        }
      }

      // 2. Actualizar en la API (y estado local a través de updateUser de AuthContext)
      const result = await updateUser(user.id, {
        name: `${formData.nombre} ${formData.apellido}`.trim(),
        email: formData.email,
        telefono: formData.telefono,
        fotoPerfil: formData.fotoPerfil,
        tipoDocumento: formData.tipoDocumento || undefined,
        documento: formData.documento || undefined,
        fechaNacimiento: formData.fechaNacimiento || undefined,
        direccion: formData.direccion || undefined,
        barrio: formData.barrio || undefined
      } as any);

      if (result.success) {
        // Actualizar el registro Clientes con documento concatenado para mantener consistencia
        if (formData.tipoDocumento && formData.documento) {
          try {
            const allClientes = await clientesService.getClientes();
            const clienteRecord = allClientes.find(c => (c.correo || '').toLowerCase() === formData.email.toLowerCase());
            if (clienteRecord) {
              const docConcatenado = `${formData.tipoDocumento} ${formData.documento}`;
              await clientesService.updateCliente(Number(clienteRecord.id), {
                nombre: formData.nombre,
                apellido: formData.apellido,
                documento: docConcatenado,
                email: formData.email,
                telefono: formData.telefono,
                fechaNacimiento: formData.fechaNacimiento || undefined,
                direccion: formData.direccion || undefined,
                barrio: formData.barrio || undefined,
                fotoPerfil: formData.fotoPerfil || undefined,
                activo: true,
              });
            }
          } catch (clienteErr) {
            console.warn('No se pudo actualizar registro de cliente:', clienteErr);
          }
        }
        success("Perfil actualizado", "Tus cambios se han guardado correctamente.");
        setClienteExtraData({
          tipoDocumento: formData.tipoDocumento || "CC",
          documento: formData.documento || "",
          fechaNacimiento: formData.fechaNacimiento || "",
          direccion: formData.direccion || "",
          barrio: formData.barrio || ""
        });
        setIsEditDialogOpen(false);
      } else {
        showErrorAlert("Error al actualizar", result.error || "No se pudo actualizar el perfil.");
      }
    } catch (err: any) {
      console.error("Error en handleUpdateProfile:", err);
      showErrorAlert("Error crítico", err.message || "Ocurrió un error inesperado al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = initialFormDataRef.current !== null &&
    JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current);

  const handleCloseAttempt = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      setIsEditDialogOpen(false);
    }
  };

  return (
    <>
    <div>

      <div className="rounded-xl p-6 mb-6 bg-gray-darkest space-y-6">

        {/* Fila superior: Foto | Datos Personales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Foto y perfil */}
          <div className="lg:col-span-1 flex flex-col items-center text-center gap-6 rounded-xl p-6 bg-black/20">
            <div className="relative group mt-2">
              <div className="w-28 h-28 bg-gray-darker rounded-full flex items-center justify-center shadow-2xl shadow-orange-primary/20 overflow-hidden border-4 border-gray-darkest">
                <ImageRenderer
                  url={user?.fotoPerfil}
                  className="w-full h-full object-cover"
                  showLabel={false}
                  fallbackVariant="person"
                />
              </div>
              <button
                onClick={() => setIsEditDialogOpen(true)}
                className="absolute bottom-1 right-1 p-2 bg-gray-darker hover:bg-orange-primary rounded-full border border-gray-dark transition-all group-hover:scale-110"
              >
                <Camera className="w-4 h-4 text-white-primary group-hover:text-black-primary" />
              </button>
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-black text-white-primary tracking-tight">
                {user?.name || "Cliente"}
              </h1>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-primary/10 text-orange-primary border border-orange-primary/20 text-xs font-bold uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5" />
                Cliente Verificado
              </span>
            </div>
            <button
              onClick={() => setIsEditDialogOpen(true)}
              className="elegante-button-primary flex items-center gap-2 py-3 px-6 shadow-lg shadow-orange-primary/10 w-full justify-center"
            >
              <Edit className="w-4 h-4" />
              Editar Perfil
            </button>
          </div>

          {/* Datos Personales */}
          <div className="lg:col-span-2 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white-primary flex items-center gap-3">
              <UserCircle className="w-5 h-5 text-orange-primary" />
              Datos Personales
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-black/20">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Nombre Completo</p>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-orange-primary/70 shrink-0" />
                  <p className="text-white-primary font-medium">{user?.name || "No disponible"}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/20">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Correo Electrónico</p>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-orange-primary/70 shrink-0" />
                  <p className="text-white-primary font-medium">{user?.email || "No disponible"}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/20">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Número de Teléfono</p>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-orange-primary/70 shrink-0" />
                  <p className="text-white-primary font-medium">{user?.telefono || "No especificado"}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/20">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Documento</p>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-orange-primary/70 shrink-0" />
                  <p className="text-white-primary font-medium">
                    {clienteExtraData.documento
                      ? `${clienteExtraData.tipoDocumento} ${clienteExtraData.documento}`
                      : "No especificado"}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/20">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Fecha de Nacimiento</p>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-orange-primary/70 shrink-0" />
                  <p className="text-white-primary font-medium">
                    {clienteExtraData.fechaNacimiento
                      ? new Date(clienteExtraData.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
                      : "No especificada"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fila inferior: Seguridad y Cuenta — ancho completo */}
        <div className="rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white-primary flex items-center gap-3">
            <Shield className="w-5 h-5 text-orange-primary" />
            Seguridad y Cuenta
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-black/20">
              <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Rol en el Sistema</p>
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-orange-primary/70" />
                <p className="text-white-primary font-medium">Cliente</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-black/20">
              <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Saldo a Favor</p>
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-green-500" />
                {isLoadingSaldo ? (
                  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                ) : (
                  <p className="font-bold text-green-500">${saldoAFavor.toLocaleString('es-CO')}</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/20">
              <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Estado de la Cuenta</p>
              <div className="flex items-center gap-3 text-green-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="font-bold">Activa</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 transition-colors flex items-center gap-3 group"
            >
              <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300" />
              <span className="text-red-400 group-hover:text-red-300 font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>

      </div>

    </div>

      {/* Dialog para Editar Perfil */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) handleCloseAttempt(); }}>
        <DialogContent className={`bg-gray-darkest border border-gray-dark text-white-primary max-w-2xl max-h-[90vh] ${showDiscardConfirm ? 'overflow-visible' : 'overflow-y-auto'}`}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-white-primary flex items-center gap-3">
               <Edit className="w-6 h-6 text-orange-primary" />
               Actualizar Perfil
            </DialogTitle>
            <DialogDescription className="text-gray-lightest italic">
              Modifica tu información personal y mantén tu cuenta al día.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-y border-gray-dark/50 my-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Nombre <span className="text-gray-lighter">*</span></Label>
                <Input 
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="elegante-input" 
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Apellido <span className="text-gray-lighter">*</span></Label>
                <Input 
                  value={formData.apellido}
                  onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                  className="elegante-input" 
                  placeholder="Tu apellido"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Teléfono <span className="text-gray-lighter">*</span></Label>
                <PhoneInput
                  value={formData.telefono}
                  onChange={(val) => setFormData({...formData, telefono: val})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Tipo de Documento</Label>
                <Select value={formData.tipoDocumento} onValueChange={(v) => setFormData({...formData, tipoDocumento: v})}>
                  <SelectTrigger className="elegante-input w-full">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark text-white-primary">
                    <SelectItem value="CC">CC — Cédula de Ciudadanía</SelectItem>
                    <SelectItem value="CE">CE — Cédula de Extranjería</SelectItem>
                    <SelectItem value="TI">TI — Tarjeta de Identidad</SelectItem>
                    <SelectItem value="NIT">NIT — Número de Identificación Tributaria</SelectItem>
                    <SelectItem value="PP">PP — Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Foto de Perfil</Label>
                <div className="flex flex-col gap-4">
                   <input 
                     type="file"
                     ref={fileInputRef}
                     onChange={handleFileChange}
                     className="hidden"
                     accept="image/*"
                   />
                   <button
                     type="button"
                     onClick={() => fileInputRef.current?.click()}
                     disabled={isUploadingImage}
                     className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-orange-primary/10 border border-dashed border-orange-primary/30 text-orange-primary hover:bg-orange-primary/20 transition-all text-xs font-black uppercase tracking-widest"
                   >
                     {isUploadingImage ? (
                       <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         Subiendo...
                       </>
                     ) : (
                       <>
                         <Upload className="w-4 h-4" />
                         Subir Nueva Foto
                       </>
                     )}
                   </button>

                   <div className="flex items-center gap-4 p-3 bg-black/30 rounded-xl border border-gray-dark">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-dark border-2 border-orange-primary/20">
                         <ImageRenderer url={formData.fotoPerfil} className="w-full h-full object-cover" showLabel={false} fallbackVariant="person" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-white-primary uppercase tracking-tight">Vista Previa</p>
                        <p className="text-[9px] text-gray-lighter italic leading-tight">Esta es la imagen que todos verán en tu perfil.</p>
                      </div>
                      {formData.fotoPerfil && (
                        <button 
                          onClick={() => setFormData({...formData, fotoPerfil: ""})}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group"
                          title="Eliminar foto"
                        >
                          <X className="w-4 h-4 text-gray-lighter group-hover:text-red-500" />
                        </button>
                      )}
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Correo Electrónico <span className="text-gray-lighter">*</span></Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="elegante-input"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                />
                <p className="text-[10px] text-orange-primary/70 italic leading-tight">
                  Nota: Cambiar el correo requerirá verificarlo nuevamente para poder iniciar sesión.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Número de Documento</Label>
                <Input
                  value={formData.documento}
                  onChange={(e) => setFormData({...formData, documento: e.target.value.replace(/[^0-9\-]/g, '')})}
                  className="elegante-input"
                  placeholder="Ej: 1234567890"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Fecha de Nacimiento</Label>
                <Input
                  value={formData.fechaNacimiento}
                  onChange={(e) => setFormData({...formData, fechaNacimiento: e.target.value})}
                  className="elegante-input"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Dirección</Label>
                <Input
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  className="elegante-input"
                  placeholder="Ej: Calle 10 # 5-20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Barrio</Label>
                <Input
                  value={formData.barrio}
                  onChange={(e) => setFormData({...formData, barrio: e.target.value})}
                  className="elegante-input"
                  placeholder="Ej: El Centro"
                />
              </div>
              
            </div>
          </div>

          <DialogFooter className="gap-3 mt-4">
            <button
              onClick={handleCloseAttempt}
              className="elegante-button-secondary py-2.5 px-6 flex items-center gap-2"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button 
              onClick={handleUpdateProfile}
              className="elegante-button-primary py-2.5 px-8 flex items-center gap-2 shadow-lg shadow-orange-primary/10 min-w-[160px] justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </DialogFooter>

          {/* Overlay de confirmacion descartar — dentro del Dialog para evitar inert */}
          {showDiscardConfirm && (
            <div
              className="z-50 flex items-center justify-center"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.80)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <div
                role="alertdialog"
                aria-modal="true"
                className="w-full max-w-md rounded-xl border border-gray-dark bg-gray-darkest p-6 shadow-xl mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-semibold text-white-primary">¿Descartar cambios?</h2>
                <p className="mt-2 text-sm text-gray-lightest">
                  Tienes cambios sin guardar en el formulario. ¿Deseas seguir editando o descartar los cambios realizados?
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="elegante-button-primary rounded-xl"
                    onClick={() => setShowDiscardConfirm(false)}
                  >
                    Seguir editando
                  </button>
                  <button
                    type="button"
                    className="bg-transparent text-gray-lightest border border-gray-dark hover:bg-gray-dark font-semibold rounded-xl px-6 py-3 transition-colors"
                    onClick={() => { setShowDiscardConfirm(false); setIsEditDialogOpen(false); }}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    <AlertContainer />
    </>
  );
}
