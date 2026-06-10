import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  applyActionCode,
  deleteUser,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  UserCredential,
  ActionCodeSettings
} from "firebase/auth";

const requiredFirebaseEnv = (key: string): string => {
  const envValue = (import.meta.env as unknown as Record<string, string | undefined>)[key];
  if (!envValue || !String(envValue).trim()) {
    throw new Error(`Falta la variable de entorno ${key} para inicializar Firebase.`);
  }
  return envValue;
};

const firebaseConfig = {
  apiKey: requiredFirebaseEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requiredFirebaseEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requiredFirebaseEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requiredFirebaseEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredFirebaseEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requiredFirebaseEnv("VITE_FIREBASE_APP_ID"),
  measurementId: requiredFirebaseEnv("VITE_FIREBASE_MEASUREMENT_ID")
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Interfaces para tipado
export interface FirebaseAuthError {
  code: string;
  message: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

// Servicio de Autenticación Firebase
export class FirebaseAuthService {
  private auth = auth;
  private secondaryApp?: FirebaseApp;
  private secondaryAuth?: Auth;

  private ensureSecondaryAuth(): Auth {
    if (this.secondaryAuth) return this.secondaryAuth;
    const apps = getApps();
    const existing = apps.find(a => a.name === 'secondary');
    const app2 = existing || initializeApp(firebaseConfig, 'secondary');
    const auth2 = getAuth(app2);
    this.secondaryApp = app2;
    this.secondaryAuth = auth2;
    return auth2;
  }

  private getEmailVerificationActionCodeSettings(): ActionCodeSettings {
    const isLocalhost = window.location.hostname === 'localhost';
    const baseUrl = isLocalhost
      ? window.location.origin
      : 'https://manitobarbershop.vercel.app';
    return {
      url: `${baseUrl}/auth/action`,
      handleCodeInApp: true
    };
  }

  private getPasswordResetActionCodeSettings(): ActionCodeSettings {
    const isLocalhost = window.location.hostname === 'localhost';
    const baseUrl = isLocalhost
      ? window.location.origin
      : 'https://manitobarbershop.vercel.app';
    return {
      url: `${baseUrl}/auth/action`,
      handleCodeInApp: true
    };
  }

  // Obtener usuario actual
  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  // Observador de estado de autenticación
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return this.auth.onAuthStateChanged(callback);
  }

  // Login con email y contraseña
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);

      if (!result.user.emailVerified) {
        await this.sendEmailVerification();
        throw new Error('Por favor, verifica tu email antes de iniciar sesión. Hemos enviado un email de verificación a ' + email);
      }

      return result;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Registro con email y contraseña
  async signUp(
    email: string,
    password: string,
    options?: { sendVerification?: boolean }
  ): Promise<UserCredential> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);

      const shouldSendVerification = options?.sendVerification !== false;
      if (shouldSendVerification) {
        await this.sendEmailVerification();
      }

      return result;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Crear usuario sin afectar la sesión actual (usa app secundaria)
  async createUserWithoutAffectingSession(
    email: string,
    password: string,
    options?: { sendVerification?: boolean; sendPasswordReset?: boolean }
  ): Promise<void> {
    const auth2 = this.ensureSecondaryAuth();
    const result = await createUserWithEmailAndPassword(auth2, email, password);
    const sendReset = options?.sendPasswordReset === true;   // solo si se pide explícitamente
    const sendVerify = options?.sendVerification !== false;  // por defecto enviar verificación
    if (sendReset) {
      await this.resetPassword(email);
    } else if (sendVerify) {
      await sendEmailVerification(result.user, this.getEmailVerificationActionCodeSettings());
    }
    await firebaseSignOut(auth2);
  }

  // Login con Google
  async signInWithGoogle(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(this.auth, googleProvider);
      return result;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Enviar email de verificación
  async sendEmailVerification(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }

    try {
      await sendEmailVerification(user, this.getEmailVerificationActionCodeSettings());
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Verificar email con código de acción
  async verifyEmailWithCode(code: string): Promise<void> {
    try {
      await applyActionCode(this.auth, code);
      const current = this.auth.currentUser;
      if (current) {
        await current.reload();
      }
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Eliminar usuario específico de Firebase (rollback de registro)
  async deleteUser(user: FirebaseUser): Promise<void> {
    try {
      const { deleteUser } = await import("firebase/auth");
      await deleteUser(user);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Eliminar usuario actual de Firebase (mantener compatibilidad)
  async deleteCurrentUser(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    return this.deleteUser(user);
  }

  // Recuperar contraseña
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email, this.getPasswordResetActionCodeSettings());
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Verificar código de restablecimiento
  async verifyPasswordResetCode(code: string): Promise<string> {
    try {
      const { verifyPasswordResetCode } = await import("firebase/auth");
      return await verifyPasswordResetCode(this.auth, code);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Confirmar nuevo password
  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    try {
      const { confirmPasswordReset } = await import("firebase/auth");
      await confirmPasswordReset(this.auth, code, newPassword);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Cerrar sesión
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Obtener perfil de usuario
  getUserProfile(user: FirebaseUser): UserProfile {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified
    };
  }

  // Manejar errores de autenticación
  private handleAuthError(error: any): FirebaseAuthError {
    const errorMap: { [key: string]: string } = {
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/email-already-in-use': 'El email ya está en uso',
      'auth/weak-password': 'La contraseña es muy débil',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Usuario deshabilitado',
      'auth/too-many-requests': 'Demasiados intentos. Intente más tarde',
      'auth/network-request-failed': 'Error de conexión',
      'auth/popup-closed-by-user': 'Ventana cerrada por el usuario',
      'auth/popup-blocked': 'Ventana emergente bloqueada',
      'auth/cancelled-popup-request': 'Solicitud cancelada',
      'auth/invalid-action-code': 'El enlace ya no es válido o ya fue utilizado',
      'auth/expired-action-code': 'El enlace ha expirado, solicita uno nuevo'
    };

    return {
      code: error.code || 'unknown',
      message: errorMap[error.code] || error.message || 'Error desconocido'
    };
  }

  // Verificar si el email está verificado
  isEmailVerified(): boolean {
    const user = this.auth.currentUser;
    return user?.emailVerified || false;
  }

  // Recargar usuario para actualizar estado de verificación
  async reloadUser(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await user.reload();
    }
  }
}

// Exportar instancia del servicio
export const firebaseAuthService = new FirebaseAuthService();

export default app;
