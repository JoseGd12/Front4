import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { User, Mail, Shield, UserCircle, Briefcase, Phone, MapPin, Calendar, Edit, Camera, Save, X, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../../shared/components/ui/dialog";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { toast } from "sonner";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { firebaseAuthService } from "../../../shared/services/firebase";
import { apiService } from "../../../shared/services/api";

export function ClientePerfilPage() {
  const { user, updateUser, resendEmailVerification, logout } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para el formulario
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    fotoPerfil: ""
  });

  // Cargar datos del usuario cuando abre el diálogo
  useEffect(() => {
    if (user) {
      const nameParts = (user.name || "").split(" ");
      setFormData({
        nombre: nameParts[0] || "",
        apellido: nameParts.slice(1).join(" ") || "",
        email: user.email || "",
        telefono: user.telefono || "",
        fotoPerfil: user.fotoPerfil || ""
      });
    }
  }, [user, isEditDialogOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato no válido", {
        description: "Solo se permiten imágenes (JPG, PNG, GIF, WebP)"
      });
      return;
    }

    try {
      setIsUploadingImage(true);
      const imageUrl = await apiService.uploadImage(file);
      setFormData(prev => ({ ...prev, fotoPerfil: imageUrl }));
      toast.success("Imagen subida correctamente");
    } catch (err: any) {
      console.error("Error uploading image:", err);
      toast.error("Error al subir imagen");
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
            toast.info("Cambio de correo iniciado", {
              description: "Revisa tu bandeja de entrada para verificar el nuevo correo. La sesión se cerrará en segundos por seguridad."
            });
            
            // Cerrar sesión después de un breve retraso para que vean el mensaje
            setTimeout(() => {
              logout();
            }, 3000);
            return; // Detenemos la ejecución del resto de la función
          } catch (firebaseErr: any) {
             if (firebaseErr.code === 'auth/requires-recent-login') {
               toast.error("Sesión expirada", {
                 description: "Por seguridad, debes cerrar sesión y volver a entrar para cambiar tu correo."
               });
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
        fotoPerfil: formData.fotoPerfil
      });

      if (result.success) {
        toast.success("Perfil actualizado", {
          description: "Tus cambios se han guardado correctamente."
        });
        setIsEditDialogOpen(false);
      } else {
        toast.error("Error al actualizar", {
          description: result.error || "No se pudo actualizar el perfil."
        });
      }
    } catch (err: any) {
      console.error("Error en handleUpdateProfile:", err);
      toast.error("Error crítico", {
        description: err.message || "Ocurrió un error inesperado al guardar."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black-primary">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header de Perfil */}
        <div className="relative overflow-hidden rounded-3xl bg-gray-darkest border border-gray-dark p-8">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <UserCircle className="w-64 h-64 text-orange-primary" />
          </div>
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 bg-gray-darker rounded-full flex items-center justify-center shadow-2xl shadow-orange-primary/20 overflow-hidden border-4 border-gray-darkest">
                  {user?.fotoPerfil ? (
                    <ImageRenderer 
                      url={user.fotoPerfil} 
                      className="w-full h-full object-cover"
                      showLabel={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-primary">
                      <User className="w-16 h-16 text-black-primary" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setIsEditDialogOpen(true)}
                  className="absolute bottom-1 right-1 p-2 bg-gray-darker hover:bg-orange-primary rounded-full border border-gray-dark transition-all group-hover:scale-110"
                >
                  <Camera className="w-4 h-4 text-white-primary group-hover:text-black-primary" />
                </button>
              </div>
              
              <div className="text-center md:text-left space-y-2">
                <h1 className="text-4xl font-black text-white-primary tracking-tight">
                  {user?.name || "Cliente"}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-primary/10 text-orange-primary border border-orange-primary/20 text-xs font-bold uppercase tracking-widest">
                    <Shield className="w-3.5 h-3.5" />
                    Cliente Verificado
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsEditDialogOpen(true)}
              className="elegante-button-primary flex items-center gap-2 py-3 px-6 shadow-lg shadow-orange-primary/10"
            >
              <Edit className="w-4 h-4" />
              Editar Perfil
            </button>
          </div>
        </div>

        {/* Información Detallada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="elegante-card space-y-6">
            <h2 className="text-lg font-bold text-white-primary flex items-center gap-3">
              <UserCircle className="w-5 h-5 text-orange-primary" />
              Datos Personales
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/20 border border-gray-dark hover:border-orange-primary/30 transition-colors group">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Nombre Completo</p>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-orange-primary/70" />
                  <p className="text-white-primary font-medium">{user?.name || "No disponible"}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/20 border border-gray-dark hover:border-orange-primary/30 transition-colors group">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Correo Electrónico</p>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-orange-primary/70" />
                  <p className="text-white-primary font-medium">{user?.email || "No disponible"}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/20 border border-gray-dark hover:border-orange-primary/30 transition-colors group">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Número de Teléfono</p>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-orange-primary/70" />
                  <p className="text-white-primary font-medium">{user?.telefono || "No especificado"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="elegante-card space-y-6">
            <h2 className="text-lg font-bold text-white-primary flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-primary" />
              Seguridad y Cuenta
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/20 border border-gray-dark hover:border-orange-primary/30 transition-colors group">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Rol en el Sistema</p>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-orange-primary/70" />
                  <p className="text-white-primary font-medium">Cliente</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/20 border border-gray-dark hover:border-orange-primary/30 transition-colors group">
                <p className="text-[10px] font-black text-gray-lighter uppercase tracking-widest mb-1.5 opacity-50">Estado de la Cuenta</p>
                <div className="flex items-center gap-3 text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="font-bold">Activa</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Dialog para Editar Perfil */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark text-white-primary max-w-2xl overflow-y-auto max-h-[90vh]">
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
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Nombre</Label>
                <Input 
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="elegante-input" 
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Apellido</Label>
                <Input 
                  value={formData.apellido}
                  onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                  className="elegante-input" 
                  placeholder="Tu apellido"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Teléfono</Label>
                <Input 
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="elegante-input" 
                  placeholder="Tu número celular"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-gray-lighter ml-1">Correo Electrónico</Label>
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
                         <ImageRenderer url={formData.fotoPerfil} className="w-full h-full object-cover" showLabel={false} />
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
          </div>

          <DialogFooter className="gap-3 mt-4">
            <button 
              onClick={() => setIsEditDialogOpen(false)}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
