import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Input } from '../../../shared/components/ui/input';
import { Button } from '../../../shared/components/ui/button';
import { Label } from '../../../shared/components/ui/label';
import { Eye, EyeOff, Lock, AlertCircle, Mail, ArrowLeft, Scissors, Star } from 'lucide-react';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { PasswordResetPage } from './PasswordResetPage';
import { SimpleCaptcha } from '../components/captcha/index';
import { useCustomAlert } from '../../../shared/components/ui/custom-alert';
import manitoLogo from '../../../assets/Manito.jpeg';
const LOGO_URL = manitoLogo;
const LANDING_BG_URL = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop";

interface LoginPageProps {
  onRequestRegister?: () => void;
  onBackToLanding?: () => void;
  initialResetData?: { email: string; token: string } | null;
  onResetComplete?: () => void;
}

export function LoginPage({ onRequestRegister, onBackToLanding, initialResetData, onResetComplete }: LoginPageProps) {
  const { login, loginWithGoogle, resendEmailVerification } = useAuth();
  const { success } = useCustomAlert();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<'login' | 'forgot-password' | 'password-reset'>('login');
  const [resetToken, setResetToken] = useState<string>('');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [captchaValidated, setCaptchaValidated] = useState<boolean>(false);
  const [captchaKey, setCaptchaKey] = useState<number>(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const [showLoginFormErrors, setShowLoginFormErrors] = useState(false);
  const [loginValidationAttempt, setLoginValidationAttempt] = useState(0);
  const [credentialsError, setCredentialsError] = useState(false);

  const emailMissing = !formData.email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const passwordMissing = !formData.password;

  const shakeClass = loginValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';

  const updateFormField = (field: 'email' | 'password', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (showLoginFormErrors) setShowLoginFormErrors(false);
    if (credentialsError) setCredentialsError(false);
    if (error) setError('');
  };

  // Control de intentos fallidos (FE-A2: Persistencia en sessionStorage)
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_SECONDS = 5 * 60; // 5 minutos
  
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = sessionStorage.getItem('login_failed_attempts');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('login_lockout_until');
    return saved ? parseInt(saved, 10) : null;
  });
  
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

  // Sincronizar con sessionStorage
  useEffect(() => {
    sessionStorage.setItem('login_failed_attempts', failedAttempts.toString());
  }, [failedAttempts]);

  useEffect(() => {
    if (lockoutUntil) {
      sessionStorage.setItem('login_lockout_until', lockoutUntil.toString());
    } else {
      sessionStorage.removeItem('login_lockout_until');
    }
  }, [lockoutUntil]);

  // Countdown del bloqueo
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutCountdown(0);
        setFailedAttempts(0);
        setError('');
      } else {
        setLockoutCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Leer oobCode directo desde la URL (reset de contraseña)
  useEffect(() => {
    const urlOobCode = searchParams.get('oobCode');
    if (urlOobCode) {
      console.log('🔄 oobCode detectado en URL, cambiando a vista de reset');
      setResetToken(urlOobCode);
      setResetEmail('');
      setCurrentView('password-reset');
      setCaptchaValidated(true);
      return;
    }
    // Fallback al prop legacy
    if (initialResetData && initialResetData.token) {
      console.log('🔄 Inbox reset detected, switching to reset view');
      setResetToken(initialResetData.token);
      setResetEmail(initialResetData.email);
      setCurrentView('password-reset');
      setCaptchaValidated(true);
    }
  }, [initialResetData, searchParams]);

  const getLoginErrorMessage = (error: string): string => {
    const e = (error || '').toLowerCase();
    // Errores de credenciales → siempre mensaje genérico, nunca revelar cuál campo falló
    if (
      e.includes('user-not-found') || e.includes('no user') || e.includes('not found') ||
      e.includes('wrong-password') || e.includes('invalid-credential') || e.includes('invalid credential')
    ) {
      return 'Correo o contraseña incorrectos. Verifica tus datos.';
    }
    if (e.includes('invalid-email') || e.includes('invalid email')) {
      return 'El correo electrónico no tiene un formato válido.';
    }
    if (e.includes('too-many-requests') || e.includes('too many')) {
      return 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.';
    }
    if (e.includes('user-disabled') || e.includes('disabled')) {
      return 'Esta cuenta ha sido deshabilitada. Contacta al administrador.';
    }
    if (e.includes('network') || e.includes('conexión') || e.includes('connection')) {
      return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    }
    if (e.includes('verifica tu email') || e.includes('verify')) {
      return error; // Mantener el mensaje original para verificación de email
    }
    // Si el error ya es un mensaje amigable (no un código técnico), mostrarlo tal cual
    if (!e.includes('/') && !e.includes('firebase') && !e.includes('auth')) {
      return error;
    }
    return 'Correo o contraseña incorrectos. Verifica tus datos.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setShowLoginFormErrors(true);
    setLoginValidationAttempt(prev => prev + 1);

    if (emailMissing || !isEmailValid || passwordMissing) {
      return;
    }

    // Verificar bloqueo por intentos fallidos
    if (isLockedOut) {
      setError(`Demasiados intentos fallidos. Intenta de nuevo en ${formatCountdown(lockoutCountdown)}.`);
      return;
    }

    // Verificar que el captcha esté validado
    if (!captchaValidated) {
      setError('Completa la verificación "No soy un robot" para continuar');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        const errMsg = result.error || 'Credenciales inválidas';
        const eLower = errMsg.toLowerCase();
        const isSystemOrStatusError = eLower.includes('too-many-requests') || 
                                      eLower.includes('too many') || 
                                      eLower.includes('user-disabled') || 
                                      eLower.includes('disabled') || 
                                      eLower.includes('network') || 
                                      eLower.includes('conexión') || 
                                      eLower.includes('connection') || 
                                      eLower.includes('verifica tu email') || 
                                      eLower.includes('verify');

        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockoutUntil(until);
          setLockoutCountdown(LOCKOUT_SECONDS);
          setError('');
          setCredentialsError(false);
        } else if (!isSystemOrStatusError) {
          setCredentialsError(true);
          // No incrementar aquí: handleLogin ya incrementó en línea 171,
          // agregar un segundo +1 hace que % 2 siempre dé el mismo resto → shake nunca cambia.
          setError('');
        } else {
          setError(getLoginErrorMessage(errMsg));
          setCredentialsError(false);
        }

        setCaptchaValidated(false);
        setCaptchaKey(k => k + 1);
      } else {
        // Login exitoso — resetear intentos
        setFailedAttempts(0);
        setLockoutUntil(null);
        setCredentialsError(false);
      }
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      // Clasificar el error capturado: distinguir sistema vs credenciales
      const caughtMsg = err instanceof Error ? err.message : String(err);
      const caughtLower = caughtMsg.toLowerCase();
      const isCaughtSystemError =
        caughtLower.includes('network') ||
        caughtLower.includes('conexión') ||
        caughtLower.includes('connection') ||
        caughtLower.includes('too-many-requests') ||
        caughtLower.includes('too many') ||
        caughtLower.includes('user-disabled') ||
        caughtLower.includes('disabled') ||
        caughtLower.includes('verifica tu email') ||
        caughtLower.includes('verify');

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockoutUntil(until);
        setLockoutCountdown(LOCKOUT_SECONDS);
        setError('');
        setCredentialsError(false);
      } else if (isCaughtSystemError) {
        setError(getLoginErrorMessage(caughtMsg));
        setCredentialsError(false);
      } else {
        setCredentialsError(true);
        setError('');
      }

      setCaptchaValidated(false);
      setCaptchaKey(k => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSent(false);
    try {
      const res = await resendEmailVerification();
      if (res.success) {
        setResendSent(true);
      } else {
        setError(res.error || 'No se pudo enviar el correo de verificación');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
    setError('');
    setResetToken('');
    setResetEmail('');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      // El sistema detectará automáticamente el rol del usuario desde la API
      const result = await loginWithGoogle();
      if (!result.success) {
        setError(getLoginErrorMessage(result.error || 'Error con Google Sign-In'));
      }
    } catch (err) {
      setError('Error al iniciar sesión con Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptchaValidation = (isValid: boolean) => {
    setCaptchaValidated(isValid);
  };

  const handlePasswordReset = (email: string, token: string) => {
    setResetEmail(email);
    setResetToken(token);
    setCurrentView('password-reset');
  };

  const handlePasswordResetComplete = () => {
    setCurrentView('login');
    setResetToken('');
    setResetEmail('');
    if (onResetComplete) onResetComplete();
    success('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.');
  };

  if (currentView === 'forgot-password') {
    return <ForgotPasswordPage onBack={handleBackToLogin} onPasswordReset={handlePasswordReset} />;
  }

  if (currentView === 'password-reset') {
    return (
      <PasswordResetPage
        token={resetToken}
        email={resetEmail}
        onComplete={handlePasswordResetComplete}
        onBack={handleBackToLogin}
      />
    );
  }

  // Vista principal de login
  return (
    <div className="min-h-screen flex font-body">
      {/* ── Panel Izquierdo: Imagen + Branding ── */}
      <div className="login-left-panel flex relative overflow-hidden items-center justify-center">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-125 grayscale opacity-50"
          style={{
            backgroundImage: `url('${LANDING_BG_URL}')`,
            animation: 'login-slow-zoom 25s ease-in-out infinite alternate',
          }}
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a]/40 via-[#0d0d0d]/70 to-black" />
        <div className="absolute inset-0 bg-black/30" />

        {/* Contenido del panel izquierdo */}
        <div className="relative z-10 px-12 xl:px-20 max-w-xl text-center">
          <div className="mb-8">
            <img
              src={LOGO_URL}
              alt="Manito Barbershop"
              className="rounded-full object-cover mx-auto border-2 border-[#d8b081]/30 shadow-[0_0_40px_rgba(216,176,129,0.2)]"
              style={{ width: 'var(--auth-logo-size)', height: 'var(--auth-logo-size)' }}
            />
          </div>

          <h1
            className="font-bold tracking-tight font-title leading-none mb-6"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              background: 'linear-gradient(135deg, #fff 0%, #d8b081 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            MANITO BARBERSHOP
          </h1>

          <p className="text-gray-300 text-lg leading-relaxed mb-10 font-light">
            Estilo, Elegancia y Profesionalismo en Cada Corte
          </p>

          {/* Decorative separator */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className="block w-16 h-px bg-gradient-to-r from-transparent to-[#d8b081]/60" />
            <Scissors className="w-5 h-5 text-[#d8b081]/60" />
            <span className="block w-16 h-px bg-gradient-to-l from-transparent to-[#d8b081]/60" />
          </div>

          {/* Testimonial / Social proof */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-4 h-4 text-[#d8b081] fill-[#d8b081]" />
              ))}
            </div>
            <p className="text-gray-300 text-sm italic leading-relaxed">
              "La mejor barbería de Medellín. Atención profesional y un ambiente increíble."
            </p>
            <p className="text-[#d8b081] text-xs font-semibold mt-3 uppercase tracking-wider">
              +2 años de experiencia
            </p>
          </div>
        </div>

        {/* Bottom decorative gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* ── Panel Derecho: Formulario ── */}
      <div className="login-right-panel flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden min-h-screen">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-[#d8b081]/5 blur-[120px]" />
          <div className="absolute bottom-1/4 left-0 w-72 h-72 rounded-full bg-[#d8b081]/3 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-md px-8 sm:px-12 py-12">
          {/* Mobile logo (only on small screens) */}
          <div className="login-mobile-logo text-center mb-8">
            <img
              src={LOGO_URL}
              alt="Manito Barbershop"
              className="rounded-full object-cover mx-auto mb-4 border-2 border-[#d8b081]/30 shadow-[0_0_40px_rgba(216,176,129,0.2)]"
              style={{ width: 'var(--auth-logo-mobile-size)', height: 'var(--auth-logo-mobile-size)' }}
            />
            <h1 className="text-2xl font-bold text-white font-title tracking-tight">MANITO BARBERSHOP</h1>
          </div>
          {/* Header del formulario */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white font-title tracking-tight mb-2">Iniciar Sesión</h2>
            <p className="text-gray-500 text-sm">Ingresa tus credenciales para acceder a tu cuenta</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} noValidate className="space-y-5">
            {error && !credentialsError && (
              <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-900/15 border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}
            {error.toLowerCase().includes('verifica tu email') && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">¿No recibiste el correo?</span>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="text-xs text-[#d8b081] hover:text-[#e8c091] underline transition-colors"
                >
                  {resendLoading ? 'Enviando...' : (resendSent ? 'Enviado' : 'Reenviar verificación')}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 text-sm font-medium">Email *</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormField('email', e.target.value)}
                  placeholder="tu@email.com"
                  className={`login-input h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all ${(showLoginFormErrors && (emailMissing || !isEmailValid)) || credentialsError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                <Mail className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none ${(showLoginFormErrors && (emailMissing || !isEmailValid)) || credentialsError ? 'text-red-400' : 'text-gray-500'}`} style={{ left: '14px' }} />
              </div>
              {showLoginFormErrors && emailMissing && (
                <p className="text-xs text-red-400 mt-1">El email es obligatorio</p>
              )}
              {showLoginFormErrors && !emailMissing && !isEmailValid && (
                <p className="text-xs text-red-400 mt-1">Ingresa un email válido</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 text-sm font-medium">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateFormField('password', e.target.value)}
                  placeholder="Tu contraseña"
                  className={`login-input login-input-password h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all ${(showLoginFormErrors && passwordMissing) || credentialsError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none ${(showLoginFormErrors && passwordMissing) || credentialsError ? 'text-red-400' : 'text-gray-500'}`} style={{ left: '14px' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1.5"
                  style={{ right: '10px' }}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {showLoginFormErrors && passwordMissing && (
                <p className="text-xs text-red-400 mt-1">La contraseña es obligatoria</p>
              )}
              {credentialsError && (
                <div className="flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-red-400 text-sm">Correo o contraseña incorrectos. Verifica tus datos.</span>
                </div>
              )}
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => setCurrentView('forgot-password')}
                className="text-sm text-orange-primary hover:text-white transition-colors underline underline-offset-2 py-1 px-2 cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Captcha */}
            <div>
              {!isLockedOut && (
                <SimpleCaptcha
                  key={captchaKey}
                  onValidate={handleCaptchaValidation}
                />
              )}
            </div>

            {/* Banner de bloqueo */}
            {isLockedOut && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-900/20 border border-red-500/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span className="text-red-400 text-sm font-semibold">Acceso no disponible</span>
                </div>
                <p className="text-red-300 text-sm text-center">
                  Vuelve a intentarlo más tarde.
                </p>
              </div>
            )}

            {/* Login button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || !captchaValidated || isLockedOut}
                className={`login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider pointer-events-auto ${
                  captchaValidated && !isLockedOut
                    ? 'bg-[#d8b081] text-black cursor-pointer'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : isLockedOut ? (
                  'Bloqueado'
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0a0a0a] px-4 text-gray-600 uppercase tracking-wider">o continúa con</span>
              </div>
            </div>

            {/* Google Sign-In */}
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="outline"
              className="login-btn-google w-full h-12 rounded-xl flex items-center justify-center gap-3 bg-white/5 border-white/10 text-orange-primary hover:text-white-primary hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer text-base font-semibold"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </Button>

            {/* Register link */}
            <div className="flex justify-center mt-6">
              <p className="text-sm text-gray-500">
                ¿No tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={onRequestRegister}
                  className="text-orange-primary hover:text-white font-semibold transition-all cursor-pointer px-2 py-0.5 rounded-md hover:bg-[#d8b081]/10 underline underline-offset-2"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>

            {/* Back to landing */}
            {onBackToLanding && (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="flex items-center gap-2 text-sm text-orange-primary hover:text-[#e8c091] transition-all mx-auto cursor-pointer px-3 py-1.5 rounded-lg hover:bg-[#d8b081]/10"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Inline styles */}
      <style>{`
        @keyframes login-slow-zoom {
          0% { transform: scale(1.25); }
          100% { transform: scale(1.35); }
        }
        .font-body { font-family: 'Outfit', sans-serif; }
        .font-title { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }

        .login-input {
          padding-inline: 44px 12px !important;
          height: 48px !important;
        }
        .login-input-password {
          padding-inline: 44px 44px !important;
        }
        .login-btn {
          height: 48px !important;
          transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        .login-btn:not(:disabled):hover {
          background-color: #c9974f !important;
          transform: scale(1.02);
        }
        .login-btn:disabled:hover {
          background-color: #4a3d24 !important;
        }
        .login-btn-google {
          height: 48px !important;
        }

        .login-left-panel {
          flex: 0 0 50%;
        }
        .login-right-panel {
          flex: 0 0 50%;
        }
        .login-mobile-logo {
          display: none;
        }

        @media (max-width: 1023px) {
          .login-left-panel {
            display: none !important;
          }
          .login-right-panel {
            flex: 0 0 100%;
          }
          .login-mobile-logo {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
