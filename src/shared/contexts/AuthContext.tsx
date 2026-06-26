import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { authSyncService, AppRole } from '../../features/auth/services/authSyncService';
import { firebaseAuthService } from '../services/firebase';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';

export type UserRole = 'admin' | 'cliente' | 'barbero' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  rolId?: number;
  telefono?: string;
  ultimaVisita?: string;
  fechaRegistro?: string;
  fotoPerfil?: string;
  firebaseUid?: string;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rolId?: number) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (rolId?: number) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendEmailVerification: () => Promise<{ success: boolean; error?: string }>;
  verifyPasswordReset: (token: string) => Promise<{ success: boolean; email?: string; error?: string }>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin: () => boolean;
  isCliente: () => boolean;
  isBarbero: () => boolean;
  getAllUsers: () => Promise<User[]>;
  getAllClientes: () => Promise<User[]>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  getUserById: (userId: string) => Promise<User | null>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  telefono?: string;
  role?: UserRole;
  apellido?: string;
  documento?: string;
  tipoDocumento?: string;
  direccion?: string;
  barrio?: string;
  fechaNacimiento?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isRegisteringRef = useRef(false);

  // Limpiar el antiguo cache de roles del localStorage (ya no se usa — era un vector de escalación)
  localStorage.removeItem('barbershop_role_cache');

  const rolIdToRole = (rolId?: number | null): UserRole | undefined => {
    if (rolId === AppRole.SUPER_ADMIN) return 'super_admin';
    if (rolId === AppRole.ADMIN) return 'admin';
    if (rolId === AppRole.BARBERO) return 'barbero';
    if (rolId === AppRole.CLIENTE || rolId === AppRole.CAJERO) return 'cliente';
    return undefined;
  };

  const normalizeRoleFromUnknown = (value: unknown): UserRole | undefined => {
    if (typeof value === 'number') {
      return rolIdToRole(value);
    }
    const txt = String(value || '').trim().toLowerCase();
    if (!txt) return undefined;
    
    // Variaciones de Super Admin
    if (
      txt === 'super_admin' || 
      txt === 'super administrador' || 
      txt === 'superadmin' || 
      txt === 'super_administrador' ||
      txt === '1'
    ) return 'super_admin';
    
    // Variaciones de Admin
    if (
      txt === 'admin' || 
      txt === 'administrador' || 
      txt === '18' ||
      txt === 'gerente' ||
      txt === '5'
    ) return 'admin';
    
    // Variaciones de Barbero
    if (txt === 'barbero' || txt === '2') return 'barbero';
    
    // Variaciones de Cliente
    if (
      txt === 'cliente' || 
      txt === '3' || 
      txt === 'cajero' || 
      txt === '6' ||
      txt === 'recepcionista' ||
      txt === '4'
    ) return 'cliente';
    
    return undefined;
  };

  const getRoleFromFirebaseClaims = async (): Promise<UserRole | undefined> => {
    try {
      const firebaseUser = firebaseAuthService.getCurrentUser();
      if (!firebaseUser) return undefined;
      
      // Forzar refresco de token para obtener los claims más recientes
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const claims = tokenResult?.claims || {};
      
      logger.debug('Claims de Firebase detectados:', claims);

      if ((claims as any).super_admin === true || (claims as any).superadmin === true) return 'super_admin';
      if ((claims as any).admin === true) return 'admin';

      const candidates = [
        (claims as any).role,
        (claims as any).rol,
        (claims as any).roleName,
        (claims as any).rolName,
        (claims as any).roleId,
        (claims as any).rolId,
        (claims as any).user_role
      ];

      for (const candidate of candidates) {
        const mapped = normalizeRoleFromUnknown(candidate);
        if (mapped) return mapped;
      }
      return undefined;
    } catch (error) {
      logger.error('Error obteniendo claims de Firebase:', error);
      return undefined;
    }
  };

  const isApiSyncUnavailableError = (errorMessage?: string): boolean => {
    const msg = String(errorMessage || '').toLowerCase();
    // Errores de red o de servidor (OnRender sleeping, 500s, 404s transitorios)
    if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('timeout')) return true;
    if (msg.includes('no se pudo validar tu cuenta en la api')) return true;
    if (msg.includes('500') || msg.includes('internal server error') || msg.includes('error del servidor')) return true;
    if (msg.includes('error creando usuario en la api') || msg.includes('error actualizando usuario en la api')) return true;
    if (msg.includes('error buscando usuario') || msg.includes('404')) return true;
    return false;
  };

  const buildFirebaseOnlyUser = (
    firebaseProfile: { uid: string; email: string | null; displayName: string | null; photoURL: string | null; emailVerified: boolean },
    role: UserRole
  ): User => ({
    id: firebaseProfile.uid,
    email: firebaseProfile.email || '',
    name: firebaseProfile.displayName || firebaseProfile.email || 'Usuario',
    role,
    fotoPerfil: firebaseProfile.photoURL || undefined,
    firebaseUid: firebaseProfile.uid,
    emailVerified: firebaseProfile.emailVerified
  });

  // El fallback de rol solo usa Firebase claims — nunca localStorage
  // (evita escalación de privilegios por edición manual de localStorage)
  const resolveFallbackRole = async (_email?: string | null): Promise<UserRole | undefined> => {
    return await getRoleFromFirebaseClaims();
  };

  const persistSessionUser = (sessionUser: User) => {
    // FE-C4: Guardamos nombre/email/foto para UX (continuidad visual), 
    // pero el ROL nunca se guarda en localStorage para evitar manipulación.
    // El rol se re-verifica siempre desde Firebase Claims o la API en cada carga.
    const { role: _, rolId: _rolId, ...uiData } = sessionUser;
    localStorage.setItem('barbershop_user', JSON.stringify(uiData));
    
    setUser(sessionUser);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    // Suscribirse a cambios de estado de Firebase (esto maneja la carga inicial y cambios posteriores)
    const unsubscribe = firebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      try {
        // Durante el registro, ignorar cambios de auth state para evitar race conditions
        if (isRegisteringRef.current) {
          return;
        }

        const storedUser = authSyncService.getStoredUser();

        if (firebaseUser) {
          // Hay sesión activa en Firebase: sincronizar con la API para obtener el rol real
          const firebaseProfile = firebaseAuthService.getUserProfile(firebaseUser);

          // No permitir sesion si email no verificado
          if (!firebaseProfile.emailVerified) {
            await firebaseAuthService.signOut();
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('barbershop_user');
            setIsLoading(false);
            return;
          }

          if (firebaseProfile.email) {
            const syncResult = await authSyncService.syncUsuarioConApi(
              firebaseProfile,
              AppRole.CLIENTE,
              undefined,
              { allowCreateIfMissing: false }
            );

            if (syncResult.success && syncResult.user) {
              // Rol viene de la API — fuente de verdad
              const userData: User = {
                id: syncResult.user.id.toString(),
                email: syncResult.user.correo,
                name: `${syncResult.user.nombre || ''} ${syncResult.user.apellido || ''}`.trim() || syncResult.user.correo,
                role: authSyncService.getRoleName(syncResult.user.rolId || 0) as UserRole,
                rolId: syncResult.user.rolId ?? undefined,
                telefono: syncResult.user.telefono ?? undefined,
                fotoPerfil: syncResult.user.fotoPerfil ?? undefined,
                firebaseUid: firebaseProfile.uid,
                emailVerified: firebaseProfile.emailVerified
              };
              persistSessionUser(userData);
            } else {
              // Si el sync falla (API caída o usuario no encontrado en API)
              // Intentamos usar el rol de Firebase Claims como segundo recurso
              const fallbackRole = await resolveFallbackRole(firebaseProfile.email);
              
              if (fallbackRole) {
                const uiData = storedUser && storedUser.email === firebaseProfile.email ? storedUser : null;
                persistSessionUser({
                  ...buildFirebaseOnlyUser(firebaseProfile, fallbackRole),
                  name: uiData?.name || firebaseProfile.displayName || firebaseProfile.email || 'Usuario',
                  fotoPerfil: uiData?.fotoPerfil || firebaseProfile.photoURL || undefined,
                });
              } else if (syncResult.error?.includes('no está registrado')) {
                // Si la API dice explícitamente que no está registrado Y no hay claims,
                // entonces sí es un cliente nuevo o invitado.
                persistSessionUser(buildFirebaseOnlyUser(firebaseProfile, 'cliente'));
              } else {
                // Si la API falló por error de red/500 y no hay claims, NO degradar a cliente.
                // Es mejor esperar o mostrar error que dar acceso erróneo.
                logger.error('Error de sincronización crítico y sin claims:', syncResult.error);
              }
            }
          }
        } else {
          // No hay sesión de Firebase: limpiar estado y localStorage
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('barbershop_user');
        }
      } catch (error) {
        console.error('Error procesando cambio de estado de autenticación:', error);
      } finally {
        setIsLoading(false);
      }
    });

    // Manejar 401 global: el token expiró o fue revocado por el servidor
    const handle401 = async () => {
      try { await firebaseAuthService.signOut(); } catch { /* ignorar */ }
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('barbershop_user');
      // Redirigir al login sin depender del router
      window.location.href = '/login';
    };
    window.addEventListener('auth:unauthorized', handle401);

    return () => {
      unsubscribe();
      window.removeEventListener('auth:unauthorized', handle401);
    };
  }, []);

  const login = async (email: string, password: string, rolId?: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // Autenticar con Firebase primero
      const userCredential = await firebaseAuthService.signIn(email, password);
      const firebaseProfile = firebaseAuthService.getUserProfile(userCredential.user);

      // Bloquear acceso si el email no ha sido verificado
      // No cerrar sesion de Firebase aqui para permitir reenvio de verificacion
      if (!firebaseProfile.emailVerified) {
        return { success: false, error: 'Verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada o carpeta de spam.' };
      }

      // El rol lo devuelve la API tras sync — no lo leemos del localStorage
      const selectedRolId = rolId ?? AppRole.CLIENTE;

      // Sincronizar con API usando el rol detectado
      const result = await authSyncService.syncUsuarioConApi(
        firebaseProfile,
        selectedRolId,
        undefined,
        { allowCreateIfMissing: false }
      );

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id.toString(),
          email: result.user.correo,
          name: `${result.user.nombre || ''} ${result.user.apellido || ''}`.trim() || result.user.correo,
          role: authSyncService.getRoleName(result.user.rolId) as UserRole,
          rolId: result.user.rolId ?? undefined,
          telefono: result.user.telefono ?? undefined,
          fotoPerfil: result.user.fotoPerfil ?? undefined,
          firebaseUid: firebaseProfile.uid,
          emailVerified: firebaseProfile.emailVerified
        };

        persistSessionUser(userData);
        return { success: true };
      } else {
        // Fallback si la API falla pero Firebase fue exitoso
        const fallbackRole = await resolveFallbackRole(firebaseProfile.email || email);
        if (fallbackRole) {
          persistSessionUser(buildFirebaseOnlyUser(firebaseProfile, fallbackRole));
          return { success: true };
        }
        
        // Si no hay fallback y es un error de "no registrado", podría ser un cliente
        if (result.error?.includes('no está registrado')) {
          persistSessionUser(buildFirebaseOnlyUser(firebaseProfile, 'cliente'));
          return { success: true };
        }

        return { 
          success: false, 
          error: result.error || 'Error de sincronización con el servidor. Intenta de nuevo.' 
        };
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validaciones básicas
      if (!userData.name || !userData.email || !userData.password) {
        return { success: false, error: 'Todos los campos son obligatorios' };
      }

      if (userData.password.length < 6) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
      }

      // Determinar rolId
      const rolId = userData.role ? authSyncService.getRolId(userData.role) : AppRole.CLIENTE;

      // Solo pasar los campos que el usuario realmente proporcionó
      const additionalData: Record<string, any> = {
        nombre: userData.name,
        apellido: userData.apellido || '',
        ...(userData.telefono ? { telefono: userData.telefono } : {}),
        ...(userData.documento ? { documento: userData.documento, tipoDocumento: userData.tipoDocumento || 'CC' } : {}),
        ...(userData.direccion ? { direccion: userData.direccion } : {}),
        ...(userData.barrio ? { barrio: userData.barrio } : {}),
        ...(userData.fechaNacimiento ? { fechaNacimiento: userData.fechaNacimiento } : {}),
      };

      // Bloquear onAuthStateChanged durante el registro para evitar race conditions
      isRegisteringRef.current = true;

      try {
        const result = await authSyncService.registerAndSync(
          userData.email,
          userData.password,
          rolId,
          additionalData
        );

        // Sign out manual tras registro (el usuario debe verificar email antes de login)
        try { await firebaseAuthService.signOut(); } catch { /* ignorar */ }

        if (result.success && result.user) {
          return { success: true };
        } else {
          return { success: false, error: result.error || 'Error en el registro' };
        }
      } finally {
        isRegisteringRef.current = false;
      }
    } catch (error: any) {
      console.error('Error en register:', error);
      isRegisteringRef.current = false;
      return { success: false, error: error.message || 'Error desconocido' };
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      const usuarios = await apiService.getUsuarios();
      return usuarios.map(u => ({
        id: u.id.toString(),
        name: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.correo,
        email: u.correo,
        role: authSyncService.getRoleName(u.rolId || 0) as UserRole,
        telefono: u.telefono || undefined,
        fotoPerfil: u.fotoPerfil || undefined
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  };

  const getAllClientes = async (): Promise<User[]> => {
    try {
      const usuarios = await apiService.getUsuarios();
      return usuarios
        .filter(u => u.rolId === AppRole.CLIENTE || u.rolId === AppRole.ADMIN || u.rolId === AppRole.SUPER_ADMIN)
        .map(u => ({
          id: u.id.toString(),
          name: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.correo,
          email: u.correo,
          role: authSyncService.getRoleName(u.rolId || 0) as UserRole,
          telefono: u.telefono || undefined,
          fotoPerfil: u.fotoPerfil || undefined
        }));
    } catch (error) {
      console.error('Error obteniendo clientes:', error);
      return [];
    }
  };

  const getUserById = async (userId: string): Promise<User | null> => {
    try {
      const usuario = await apiService.getUsuarioById(parseInt(userId));
      if (!usuario) return null;

      return {
        id: usuario.id.toString(),
        name: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.correo,
        email: usuario.correo,
        role: authSyncService.getRoleName(usuario.rolId || 0) as UserRole,
        telefono: usuario.telefono || undefined,
        fotoPerfil: usuario.fotoPerfil || undefined
      };
    } catch (error) {
      console.error('Error obteniendo usuario por ID:', error);
      return null;
    }
  };

  const updateUser = async (userId: string, userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiUser = await apiService.getUsuarioById(parseInt(userId));
      if (!apiUser) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      // Verificar si el email ya existe en otro usuario
      if (userData.email && userData.email !== apiUser.correo) {
        const usuarios = await apiService.getUsuarios();
        const existingUser = usuarios.find(u => u.correo === userData.email && u.id !== parseInt(userId));
        if (existingUser) {
          return { success: false, error: 'Este email ya está registrado por otro usuario' };
        }
      }

      // Preparar datos para actualizar
      const updateData: any = {
        ...userData,
        rolId: userData.role ? authSyncService.getRolId(userData.role) : apiUser.rolId
      };

      // Separar nombre y apellido
      if (userData.name) {
        const nameParts = userData.name.split(' ');
        updateData.nombre = nameParts[0];
        updateData.apellido = nameParts.slice(1).join(' ');
      }

      await apiService.updateUsuario(parseInt(userId), updateData);

      // Si el usuario actualizado es el usuario actual logueado, actualizar el estado
      if (user && user.id === userId) {
        const updatedUser = {
          ...user,
          ...userData
        };
        setUser(updatedUser);
        localStorage.setItem('barbershop_user', JSON.stringify(updatedUser));
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error actualizando usuario:', error);
      return { success: false, error: error.message || 'Error actualizando usuario' };
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // No permitir eliminar el propio usuario
      if (user && user.id === userId) {
        return { success: false, error: 'No puedes eliminar tu propia cuenta' };
      }

      await apiService.deleteUsuario(parseInt(userId));
      return { success: true };
    } catch (error: any) {
      console.error('Error eliminando usuario:', error);
      return { success: false, error: error.message || 'Error eliminando usuario' };
    }
  };

  const loginWithGoogle = async (rolId?: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // Primero autenticar con Google para obtener el email
      const userCredential = await firebaseAuthService.signInWithGoogle();
      const firebaseProfile = firebaseAuthService.getUserProfile(userCredential.user);
      const selectedRolId = rolId ?? AppRole.CLIENTE;

      // Sincronizar con API usando el rol detectado
      const result = await authSyncService.syncUsuarioConApi(
        firebaseProfile,
        selectedRolId,
        undefined,
        { allowCreateIfMissing: true }
      );

      if (result.success && result.user) {
        const userData: User = {
          id: result.user.id.toString(),
          email: result.user.correo,
          name: `${result.user.nombre || ''} ${result.user.apellido || ''}`.trim() || result.user.correo,
          role: authSyncService.getRoleName(result.user.rolId) as UserRole,
          rolId: result.user.rolId ?? undefined,
          telefono: result.user.telefono ?? undefined,
          fotoPerfil: result.user.fotoPerfil ?? undefined,
          firebaseUid: firebaseProfile.uid,
          emailVerified: firebaseProfile.emailVerified
        };

        persistSessionUser(userData);
        return { success: true };
      } else {
        // Fallback si la API falla pero Google Auth fue exitoso
        const fallbackRole = await resolveFallbackRole(firebaseProfile.email);
        if (fallbackRole) {
          persistSessionUser(buildFirebaseOnlyUser(firebaseProfile, fallbackRole));
          return { success: true };
        }
        
        // Si no hay claims y la API falló por error de red, NO asumir cliente si es un posible admin
        if (result.error?.includes('no está registrado')) {
          persistSessionUser(buildFirebaseOnlyUser(firebaseProfile, 'cliente'));
          return { success: true };
        }

        return {
          success: false,
          error: result.error || 'Error de sincronización con el servidor. Intenta de nuevo.'
        };
      }
    } catch (error: any) {
      console.error('Error en loginWithGoogle:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authSyncService.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error en logout:', error);
      // Forzar logout local aunque haya error
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('barbershop_user');
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      return await authSyncService.resetPassword(email);
    } catch (error: any) {
      console.error('Error en resetPassword:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    }
  };

  const verifyPasswordReset = async (token: string): Promise<{ success: boolean; email?: string; error?: string }> => {
    try {
      const email = await firebaseAuthService.verifyPasswordResetCode(token);
      return { success: true, email };
    } catch (error: any) {
      console.error('Error en verifyPasswordReset:', error);
      return { success: false, error: error.message || 'Error verificando el token' };
    }
  };

  const confirmPasswordReset = async (token: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await firebaseAuthService.confirmPasswordReset(token, newPassword);
      return { success: true };
    } catch (error: any) {
      console.error('Error en confirmPasswordReset:', error);
      return { success: false, error: error.message || 'Error restableciendo la contraseña' };
    }
  };

  const resendEmailVerification = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      await firebaseAuthService.sendEmailVerification();
      return { success: true };
    } catch (error: any) {
      console.error('Error en resendEmailVerification:', error);
      return { success: false, error: error.message || 'Error enviando verificación' };
    }
  };

  const isAdmin = () => user?.role === 'admin' || user?.role === 'super_admin';
  const isCliente = () => user?.role === 'cliente';
  const isBarbero = () => user?.role === 'barbero';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      loginWithGoogle,
      logout,
      resetPassword,
      verifyPasswordReset,
      confirmPasswordReset,
      resendEmailVerification,
      isAdmin,
      isCliente,
      isBarbero,
      getAllUsers,
      getAllClientes,
      updateUser,
      deleteUser,
      getUserById
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
