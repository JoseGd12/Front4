import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authSyncService, AppRole } from '../../features/auth/services/authSyncService';
import { firebaseAuthService } from '../services/firebase';
import { apiService } from '../services/api';

export type UserRole = 'admin' | 'cliente' | 'barbero' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

  const ROLE_CACHE_KEY = 'barbershop_role_cache';

  const roleToRolId = (role?: UserRole): number => {
    if (role === 'super_admin') return AppRole.SUPER_ADMIN;
    if (role === 'admin') return AppRole.ADMIN;
    if (role === 'barbero') return AppRole.BARBERO;
    return AppRole.CLIENTE;
  };

  const rolIdToRole = (rolId?: number | null): UserRole | undefined => {
    if (rolId === AppRole.SUPER_ADMIN) return 'super_admin';
    if (rolId === AppRole.ADMIN) return 'admin';
    if (rolId === AppRole.BARBERO) return 'barbero';
    if (rolId === AppRole.CLIENTE || rolId === AppRole.CAJERO) return 'cliente';
    return undefined;
  };

  const readRoleCache = (): Record<string, UserRole> => {
    try {
      const raw = localStorage.getItem(ROLE_CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeRoleCache = (cache: Record<string, UserRole>) => {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(cache));
  };

  const cacheRoleForEmail = (email: string, role: UserRole) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return;
    const cache = readRoleCache();
    cache[normalizedEmail] = role;
    writeRoleCache(cache);
  };

  const getCachedRoleByEmail = (email?: string | null): UserRole | undefined => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return undefined;
    const cache = readRoleCache();
    return cache[normalizedEmail];
  };

  const normalizeRoleFromUnknown = (value: unknown): UserRole | undefined => {
    if (typeof value === 'number') {
      return rolIdToRole(value);
    }
    const txt = String(value || '').trim().toLowerCase();
    if (!txt) return undefined;
    if (txt === 'super_admin' || txt === 'super administrador') return 'super_admin';
    if (txt === 'admin' || txt === 'administrador' || txt === '18') return 'admin';
    if (txt === 'barbero' || txt === '2') return 'barbero';
    if (txt === 'cliente' || txt === '3' || txt === 'cajero' || txt === '6') return 'cliente';
    return undefined;
  };

  const getRoleFromFirebaseClaims = async (): Promise<UserRole | undefined> => {
    try {
      const firebaseUser = firebaseAuthService.getCurrentUser();
      if (!firebaseUser) return undefined;
      const tokenResult = await firebaseUser.getIdTokenResult();
      const claims = tokenResult?.claims || {};
      if ((claims as any).super_admin === true) return 'super_admin';
      if ((claims as any).admin === true) return 'admin';

      const candidates = [
        (claims as any).role,
        (claims as any).rol,
        (claims as any).roleName,
        (claims as any).rolName,
        (claims as any).roleId,
        (claims as any).rolId
      ];

      for (const candidate of candidates) {
        const mapped = normalizeRoleFromUnknown(candidate);
        if (mapped) return mapped;
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const isApiSyncUnavailableError = (errorMessage?: string): boolean => {
    const msg = String(errorMessage || '').toLowerCase();
    if (msg.includes('no se pudo validar tu cuenta en la api')) return true;
    if (msg.includes('500') || msg.includes('internal server error') || msg.includes('error del servidor')) return true;
    if (msg.includes('error creando usuario en la api') || msg.includes('error actualizando usuario en la api')) return true;
    if (msg.includes('error buscando usuario')) return true;
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

  const resolveFallbackRole = async (email?: string | null): Promise<UserRole | undefined> => {
    const cachedRole = getCachedRoleByEmail(email);
    if (cachedRole) return cachedRole;
    return await getRoleFromFirebaseClaims();
  };

  const persistSessionUser = (sessionUser: User) => {
    if (sessionUser.email && sessionUser.role) {
      cacheRoleForEmail(sessionUser.email, sessionUser.role);
    }
    localStorage.setItem('barbershop_user', JSON.stringify(sessionUser));
    setUser(sessionUser);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    // Verificar estado de autenticación al cargar
    const initializeAuth = async () => {
      try {
        // 1. Verificar si hay usuario guardado en localStorage
        const storedUser = authSyncService.getStoredUser();

        if (storedUser) {
          if (storedUser.email && storedUser.role) {
            cacheRoleForEmail(storedUser.email, storedUser.role);
          }
          setUser(storedUser);
          setIsAuthenticated(true);
        }

        // 2. Verificar estado de Firebase
        const firebaseUser = firebaseAuthService.getCurrentUser();
        if (firebaseUser && !storedUser) {
          // Si hay usuario en Firebase pero no en localStorage, sincronizar
          const firebaseProfile = firebaseAuthService.getUserProfile(firebaseUser);
          if (firebaseProfile.email) {
            // Intentar obtener rolId por defecto (cliente)
            const syncResult = await authSyncService.syncUsuarioConApi(
              firebaseProfile,
              AppRole.CLIENTE,
              undefined,
              { allowCreateIfMissing: false }
            );

            if (syncResult.success && syncResult.user) {
              const userData: User = {
                id: syncResult.user.id.toString(),
                email: syncResult.user.correo,
                name: `${syncResult.user.nombre || ''} ${syncResult.user.apellido || ''}`.trim() || syncResult.user.correo,
                role: (() => {
                  const roleName = authSyncService.getRoleName(syncResult.user.rolId || 0);
                  return roleName as UserRole;
                })(),
                telefono: syncResult.user.telefono ?? undefined,
                fotoPerfil: syncResult.user.fotoPerfil ?? undefined,
                firebaseUid: firebaseProfile.uid,
                emailVerified: firebaseProfile.emailVerified
              };
              persistSessionUser(userData);
            } else if (isApiSyncUnavailableError(syncResult.error)) {
              const fallbackRole = await resolveFallbackRole(firebaseProfile.email);
              if (fallbackRole) {
                persistSessionUser(buildFirebaseOnlyUser(firebaseProfile, fallbackRole));
              }
            }
          }
        }
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Suscribirse a cambios de estado de Firebase
    const unsubscribe = firebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser && user) {
        // Si Firebase cierra sesión, limpiar estado local
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('barbershop_user');
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, rolId?: number): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Autenticar con Firebase primero
      const userCredential = await firebaseAuthService.signIn(email, password);
      const firebaseProfile = firebaseAuthService.getUserProfile(userCredential.user);

      const selectedRolId = rolId ?? roleToRolId(getCachedRoleByEmail(email));

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
          telefono: result.user.telefono ?? undefined,
          fotoPerfil: result.user.fotoPerfil ?? undefined,
          firebaseUid: firebaseProfile.uid,
          emailVerified: firebaseProfile.emailVerified
        };

        persistSessionUser(userData);

        return { success: true };
      } else {
        if (isApiSyncUnavailableError(result.error)) {
          const fallbackRole = await resolveFallbackRole(firebaseProfile.email || email);
          if (fallbackRole) {
            persistSessionUser(buildFirebaseOnlyUser(firebaseProfile, fallbackRole));
            return { success: true };
          }
          return {
            success: false,
            error: 'No se pudo validar tu rol porque la API no está disponible y no hay un rol previo guardado para este correo.'
          };
        }
        return { success: false, error: result.error || 'Error en la autenticación' };
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Validaciones básicas
      if (!userData.name || !userData.email || !userData.password) {
        return { success: false, error: 'Todos los campos son obligatorios' };
      }

      if (userData.password.length < 6) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
      }

      // Determinar rolId
      const rolId = userData.role ? authSyncService.getRolId(userData.role) : AppRole.CLIENTE;

      // Preparar datos adicionales para la API con valores por defecto seguros
      const additionalData = {
        nombre: userData.name,
        apellido: userData.apellido || '',
        telefono: userData.telefono || '0000000000',
        documento: userData.documento || `${Date.now()}`,
        tipoDocumento: userData.tipoDocumento || 'CC',
        direccion: userData.direccion || 'No especificada',
        barrio: userData.barrio || 'No especificado',
        fechaNacimiento: userData.fechaNacimiento || new Date().toISOString().split('T')[0]
      };

      // Registrar en Firebase y sincronizar con API
      const result = await authSyncService.registerAndSync(
        userData.email,
        userData.password,
        rolId,
        additionalData
      );

      if (result.success && result.user) {
        // En lugar de iniciar sesión, solo devolvemos éxito.
        // El usuario debe verificar su email antes de poder hacer login.
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Error en el registro' };
      }
    } catch (error: any) {
      console.error('Error en register:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);

      // Primero autenticar con Google para obtener el email
      const userCredential = await firebaseAuthService.signInWithGoogle();
      const firebaseProfile = firebaseAuthService.getUserProfile(userCredential.user);
      const selectedRolId = rolId ?? roleToRolId(getCachedRoleByEmail(firebaseProfile.email));

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
          telefono: result.user.telefono ?? undefined,
          fotoPerfil: result.user.fotoPerfil ?? undefined,
          firebaseUid: firebaseProfile.uid,
          emailVerified: firebaseProfile.emailVerified
        };

        persistSessionUser(userData);

        return { success: true };
      } else {
        if (isApiSyncUnavailableError(result.error)) {
          const fallbackRole = await resolveFallbackRole(firebaseProfile.email);
          if (fallbackRole) {
            persistSessionUser(buildFirebaseOnlyUser(firebaseProfile, fallbackRole));
            return { success: true };
          }
          return {
            success: false,
            error: 'No se pudo validar tu rol porque la API no está disponible y no hay un rol previo guardado para este correo.'
          };
        }
        return { success: false, error: result.error || 'Error con Google Sign-In' };
      }
    } catch (error: any) {
      console.error('Error en loginWithGoogle:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    } finally {
      setIsLoading(false);
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
