import { ApiUser, apiService } from '../../../shared/services/api';
import { firebaseAuthService, UserProfile } from '../../../shared/services/firebase';

export interface SyncUser {
  id?: number;
  correo: string;
  contrasena: string;
  rolId: number;
  estado: boolean;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  tipoDocumento?: string;
  documento?: string;
  direccion?: string;
  barrio?: string;
  fechaNacimiento?: string;
  fotoPerfil?: string;
}

export interface SyncResult {
  success: boolean;
  user?: ApiUser;
  error?: string;
}

interface SyncOptions {
  allowCreateIfMissing?: boolean;
  strictProfileSync?: boolean;
}

// Mapeo de roles según la documentación y análisis de Firebase
export enum AppRole {
  SUPER_ADMIN = 1,
  BARBERO = 2,
  CLIENTE = 3,
  RECEPCIONISTA = 4,
  GERENTE = 5,
  CAJERO = 6,
  ADMIN = 18
}

export class AuthSyncService {
  // Sincronizar usuario de Firebase con la API
  async syncUsuarioConApi(
    firebaseProfile: UserProfile,
    rolId: number,
    additionalData?: Partial<SyncUser>,
    options?: SyncOptions
  ): Promise<SyncResult> {
    try {
      if (!firebaseProfile.email) {
        return { success: false, error: 'Email de Firebase no disponible' };
      }

      const correo = firebaseProfile.email;
      const allowCreateIfMissing = options?.allowCreateIfMissing ?? true;
      const strictProfileSync = options?.strictProfileSync ?? false;

      // 1. Buscar si el usuario ya existe en la API
      let usuarioExistente: ApiUser | null = null;
      let lookupFailed = false;
      try {
        const usuarios = await apiService.getUsuarios();
        usuarioExistente = usuarios.find(u => u.correo.toLowerCase() === correo.toLowerCase()) || null;
      } catch (error) {
        lookupFailed = true;
        console.error('Error buscando usuario existente:', error);
        if (allowCreateIfMissing) {
          return {
            success: false,
            error: 'No se pudo validar tu cuenta en la API. Intenta nuevamente en unos minutos.'
          };
        }
      }

      if (lookupFailed && !allowCreateIfMissing) {
        return {
          success: false,
          error: 'No se pudo validar tu cuenta en la API. Intenta nuevamente en unos minutos.'
        };
      }

      let usuarioSincronizado: ApiUser;
      // Corregimos la lógica: Si no hay datos adicionales, asumimos que es una sincronización de inicio de sesión
      // y debemos respetar el rol que ya tiene el usuario en la Base de Datos.
      const isLoginSync = !additionalData || Object.keys(additionalData).length === 0;

      if (usuarioExistente) {
        // 2. Actualizar usuario existente si es necesario
        const rolParaPersistir = isLoginSync
          ? (usuarioExistente.rolId ?? rolId)
          : rolId;

        const necesitaActualizacion =
          (!isLoginSync && usuarioExistente.rolId !== rolId) ||
          usuarioExistente.estado !== true ||
          additionalData;

        if (necesitaActualizacion) {
          const datosActualizacion: Partial<ApiUser> = {
            id: usuarioExistente.id,
            nombre: usuarioExistente.nombre || firebaseProfile.displayName?.split(' ')[0] || 'Usuario',
            apellido: usuarioExistente.apellido || firebaseProfile.displayName?.split(' ').slice(1).join(' ') || '',
            documento: usuarioExistente.documento,
            tipoDocumento: usuarioExistente.tipoDocumento,
            telefono: usuarioExistente.telefono,
            direccion: usuarioExistente.direccion,
            barrio: usuarioExistente.barrio,
            fechaNacimiento: usuarioExistente.fechaNacimiento,
            fotoPerfil: usuarioExistente.fotoPerfil,
            correo: correo,
            contrasena: 'firebase_auth', // Contraseña por defecto para usuarios de Firebase
            rolId: rolParaPersistir,
            estado: true,
            ...additionalData
          };

          try {
            usuarioSincronizado = await apiService.updateUsuario(usuarioExistente.id, datosActualizacion);
            console.log('Usuario actualizado exitosamente:', usuarioSincronizado);
          } catch (error) {
            console.error('Error actualizando usuario:', error);
            return { success: false, error: 'Error actualizando usuario en la API' };
          }
        } else {
          usuarioSincronizado = usuarioExistente;
          console.log('Usuario ya existe y está sincronizado:', usuarioSincronizado);
        }
      } else {
        if (!allowCreateIfMissing) {
          return {
            success: false,
            error: 'Tu cuenta aún no está registrada en el sistema. Debes registrarte primero.'
          };
        }

        // 3. Crear nuevo usuario con solo los datos reales disponibles
        const nuevoUsuario: SyncUser = {
          correo: correo,
          contrasena: 'firebase_auth',
          rolId: rolId,
          estado: true,
          nombre: firebaseProfile.displayName?.split(' ')[0] || '',
          apellido: firebaseProfile.displayName?.split(' ').slice(1).join(' ') || '',
          fotoPerfil: firebaseProfile.photoURL || '',
          ...additionalData
        };

        try {
          usuarioSincronizado = await apiService.createUsuario(nuevoUsuario);
          console.log('Usuario creado exitosamente:', usuarioSincronizado);
        } catch (error) {
          console.error('Error creando usuario:', error);
          return { success: false, error: 'Error creando usuario en la API' };
        }
      }

      // 4. AUTO-CREAR PERFIL ASOCIADO (Análisis Paso 5)
      // Esta es la parte crítica de la implementación de Firebase: asegurar que cada Usuario tenga su perfil
      await this.ensuresProfileExists(usuarioSincronizado, rolId, firebaseProfile, strictProfileSync);

      return { success: true, user: usuarioSincronizado };

    } catch (error) {
      console.error('Error en sincronización:', error);
      return { success: false, error: 'Error general en sincronización' };
    }
  }

  /**
   * Asegura que exista un perfil de Cliente o Barbero para el usuario sincronizado
   * Implementa el Paso 5 del diagrama de interacción
   */
  private async ensuresProfileExists(
    apiUser: ApiUser,
    rolId: number,
    profile: UserProfile,
    strictMode: boolean = false
  ): Promise<void> {
    try {
      // IMPORTANTE: Respetar siempre el rol de la base de datos (apiUser.rolId) 
      // sobre el rol sugerido (rolId) para evitar convertir Admins en Clientes.
      const actualRolId = apiUser.rolId || rolId;
      
      // Determinar si es Cliente o Barbero
      const isCliente = actualRolId === AppRole.CLIENTE || actualRolId === AppRole.CAJERO; 
      const isBarbero = actualRolId === AppRole.BARBERO;
      const isAdmin = actualRolId === AppRole.ADMIN || actualRolId === AppRole.SUPER_ADMIN || actualRolId === AppRole.GERENTE;

      if (isAdmin) {
        console.log(`ℹ️ Usuario es Administrador (${actualRolId}), saltando creación de perfil de cliente/barbero.`);
        return;
      }

      if (isCliente) {
        const { clientesService } = await import('../../clientes/services/clientesService');
        const clientes = await clientesService.getClientes();
        // Búsqueda más robusta: UsuarioId o Correo (ignoring case)
        const existeCliente = clientes.some(c => 
          c.usuarioId === apiUser.id || 
          (c.correo && apiUser.correo && c.correo.toLowerCase() === apiUser.correo.toLowerCase())
        );

        if (!existeCliente) {
          console.log('🔄 Sincronización Firebase: Creando perfil de Cliente automático...');
          await clientesService.createCliente({
            usuarioId: apiUser.id,
            nombre: apiUser.nombre || profile.displayName?.split(' ')[0] || '',
            apellido: apiUser.apellido || profile.displayName?.split(' ').slice(1).join(' ') || '',
            documento: apiUser.documento || '',
            correo: apiUser.correo,
            telefono: apiUser.telefono || undefined,
            fotoPerfil: apiUser.fotoPerfil || profile.photoURL || undefined
          });
          console.log('✅ Perfil de Cliente vinculado exitosamente');
        }
      } else if (isBarbero) {
        const { barberosService } = await import('../../administracion/services/barberosService');
        const barberos = await barberosService.getBarberos();
        const existeBarbero = barberos.some(b => b.usuarioId === apiUser.id || b.correo === apiUser.correo);

        if (!existeBarbero) {
          console.log('🔄 Sincronización Firebase: Creando perfil de Barbero automático...');
          await barberosService.createBarbero({
            usuarioId: apiUser.id,
            nombre: apiUser.nombre || profile.displayName?.split(' ')[0] || '',
            apellido: apiUser.apellido || profile.displayName?.split(' ').slice(1).join(' ') || '',
            tipoDocumento: apiUser.tipoDocumento || '',
            documento: apiUser.documento || '',
            correo: apiUser.correo,
            telefono: apiUser.telefono || '',
            direccion: apiUser.direccion || '',
            barrio: apiUser.barrio || '',
            fechaNacimiento: apiUser.fechaNacimiento || undefined,
            rol: 'Barbero',
            status: 'active',
            especialidad: "General",
            estado: true,
            fotoPerfil: apiUser.fotoPerfil || profile.photoURL || undefined
          });
          console.log('✅ Perfil de Barbero vinculado exitosamente');
        }
      }
    } catch (error) {
      console.error('⚠️ Error al asegurar perfil asociado (Cliente/Barbero):', error);
      if (strictMode) {
        throw error;
      }
      // En login no bloqueamos la sesión por fallas de sincronización de perfil.
    }
  }

  // Autenticar usuario y sincronizar con API
  async authenticateAndSync(
    email: string,
    password: string,
    rolId: number,
    additionalData?: Partial<SyncUser>
  ): Promise<SyncResult> {
    try {
      // 1. Autenticar con Firebase
      const userCredential = await firebaseAuthService.signIn(email, password);
      const firebaseProfile = firebaseAuthService.getUserProfile(userCredential.user);

      // 2. Sincronizar con API
      const syncResult = await this.syncUsuarioConApi(firebaseProfile, rolId, additionalData);

      if (syncResult.success && syncResult.user) {
        // 3. Guardar en localStorage para persistencia
        localStorage.setItem('barbershop_user', JSON.stringify({
          id: syncResult.user.id.toString(),
          email: syncResult.user.correo,
          name: `${syncResult.user.nombre || ''} ${syncResult.user.apellido || ''}`.trim() || syncResult.user.correo,
          role: this.getRoleName(syncResult.user.rolId),
          telefono: syncResult.user.telefono,
          fotoPerfil: syncResult.user.fotoPerfil,
          firebaseUid: firebaseProfile.uid,
          emailVerified: firebaseProfile.emailVerified
        }));
      }

      return syncResult;

    } catch (error: any) {
      console.error('Error en authenticateAndSync:', error);
      return { success: false, error: error.message || 'Error de autenticación' };
    }
  }

  // Registrar nuevo usuario con Firebase y sincronizar
  async registerAndSync(
    email: string,
    password: string,
    rolId: number,
    userData: Partial<SyncUser>
  ): Promise<SyncResult> {
    try {
      // 1. Registrar en Firebase
      const userCredential = await firebaseAuthService.signUp(email, password);
      const firebaseProfile = firebaseAuthService.getUserProfile(userCredential.user);

      try {
        // 2. Sincronizar con API
        const syncResult = await this.syncUsuarioConApi(firebaseProfile, rolId, userData, {
          allowCreateIfMissing: true,
          strictProfileSync: true
        });

        if (syncResult.success && syncResult.user) {
          // 3. Guardar en localStorage (sin iniciar sesión full porque requiere verificar email)
          console.log("Registro completo: Usuario y perfil guardados en BD.");
        } else {
          throw new Error(syncResult.error || "Error sincronizando con API tras registro en Firebase.");
        }

        return syncResult;
      } catch (syncError: any) {
        // Si la sincronización falla, hacemos ROLLBACK en Firebase para que el usuario no quede huérfano
        console.error('Error en sync, ejecutando rollback en Firebase...', syncError);
        await firebaseAuthService.deleteUser(userCredential.user);
        throw new Error("No se pudo completar tu registro. Se revirtió la cuenta, por favor intenta de nuevo.");
      }
    } catch (error: any) {
      console.error('Error en registerAndSync:', error);
      return { success: false, error: error.message || 'Error en el registro' };
    }
  }

  // Login con Google y sincronizar
  async googleSignInAndSync(
    rolId: number,
    additionalData?: Partial<SyncUser>
  ): Promise<SyncResult> {
    try {
      // 1. Autenticar con Google
      const userCredential = await firebaseAuthService.signInWithGoogle();
      const firebaseProfile = firebaseAuthService.getUserProfile(userCredential.user);

      if (!firebaseProfile.email) {
        return { success: false, error: 'No se pudo obtener el email de Google' };
      }

      // 2. Sincronizar con API
      const syncResult = await this.syncUsuarioConApi(firebaseProfile, rolId, {
        nombre: firebaseProfile.displayName?.split(' ')[0] || '',
        apellido: firebaseProfile.displayName?.split(' ').slice(1).join(' ') || '',
        fotoPerfil: firebaseProfile.photoURL || '',
        ...additionalData
      });

      if (syncResult.success && syncResult.user) {
        // 3. Guardar en localStorage
        localStorage.setItem('barbershop_user', JSON.stringify({
          id: syncResult.user.id.toString(),
          email: syncResult.user.correo,
          name: `${syncResult.user.nombre || ''} ${syncResult.user.apellido || ''}`.trim() || syncResult.user.correo,
          role: this.getRoleName(syncResult.user.rolId),
          telefono: syncResult.user.telefono,
          fotoPerfil: syncResult.user.fotoPerfil,
          firebaseUid: firebaseProfile.uid,
          emailVerified: firebaseProfile.emailVerified
        }));
      }

      return syncResult;

    } catch (error: any) {
      console.error('Error en googleSignInAndSync:', error);
      return { success: false, error: error.message || 'Error con Google Sign-In' };
    }
  }

  // Cerrar sesión en Firebase y limpiar localStorage
  async signOut(): Promise<void> {
    try {
      await firebaseAuthService.signOut();
      localStorage.removeItem('barbershop_user');
    } catch (error) {
      console.error('Error en signOut:', error);
      // Limpiar localStorage aunque haya error en Firebase
      localStorage.removeItem('barbershop_user');
    }
  }

  // Recuperar contraseña
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await firebaseAuthService.resetPassword(email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error enviando email de recuperación' };
    }
  }

  // Obtener usuario desde localStorage
  getStoredUser(): any {
    const userJson = localStorage.getItem('barbershop_user');
    return userJson ? JSON.parse(userJson) : null;
  }

  // Verificar si el email está verificado
  isEmailVerified(): boolean {
    const storedUser = this.getStoredUser();
    return storedUser?.emailVerified || false;
  }

  // Convertir rolId a nombre de rol
  getRoleName(rolId: number | null): string {
    switch (rolId) {
      case AppRole.SUPER_ADMIN:
        return 'super_admin';
      case AppRole.ADMIN:
        return 'admin';
      case AppRole.BARBERO:
        return 'barbero';
      case AppRole.CLIENTE:
      case AppRole.CAJERO:
        return 'cliente';
      default:
        return 'cliente';
    }
  }

  // Obtener rolId desde nombre de rol
  getRolId(roleName: string | number | null): number {
    if (typeof roleName === 'number') {
      return roleName || AppRole.CLIENTE;
    }

    if (roleName === null) {
      return AppRole.CLIENTE;
    }

    switch (roleName.toLowerCase()) {
      case 'super_admin':
      case 'super administrador':
        return AppRole.SUPER_ADMIN;
      case 'admin':
      case 'administrador':
        return AppRole.ADMIN;
      case 'barbero':
        return AppRole.BARBERO;
      case 'cliente':
        return AppRole.CLIENTE;
      default:
        return AppRole.CLIENTE;
    }
  }
}

// Exportar instancia del servicio
export const authSyncService = new AuthSyncService();
