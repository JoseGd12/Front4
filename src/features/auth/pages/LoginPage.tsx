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
    if (e.includes('user-not-found') || e.includes('no user') || e.includes('not found')) {
      return 'La cuenta ingresada no existe. Verifica el correo o regístrate.';
    }
    if (e.includes('wrong-password') || e.includes('contraseña') || e.includes('password')) {
      return 'Contraseña incorrecta. Verifica e intenta de nuevo.';
    }
    if (e.includes('invalid-credential') || e.includes('invalid credential')) {
      return 'La cuenta ingresada no existe o la contraseña es incorrecta.';
    }
    if (e.includes('invalid-email') || e.includes('invalid email') || e.includes('correo')) {
      return 'El correo electrónico no es válido.';
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

        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockoutUntil(until);
          setLockoutCountdown(LOCKOUT_SECONDS);
          setError('');
        } else {
          setError(getLoginErrorMessage(result.error || 'Credenciales inválidas'));
        }

        setCaptchaValidated(false);
        setCaptchaKey(k => k + 1);
        setFormData({ email: '', password: '' });
      } else {
        // Login exitoso — resetear intentos
        setFailedAttempts(0);
        setLockoutUntil(null);
      }
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECONDS * 1000;
        setLockoutUntil(until);
        setLockoutCountdown(LOCKOUT_SECONDS);
        setError('');
      } else {
        setError('Correo o contraseña incorrectos. Verifica tus datos.');
      }

      setCaptchaValidated(false);
      setCaptchaKey(k => k + 1);
      setFormData({ email: '', password: '' });
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
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
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
              <Label htmlFor="email" className="text-gray-300 text-sm font-medium">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tu@email.com"
                  className="login-input h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all"
                  required
                />
                <Mail className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500 pointer-events-none" style={{ left: '14px' }} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 text-sm font-medium">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Tu contraseña"
                  className="login-input login-input-password h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all"
                  required
                />
                <Lock className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500 pointer-events-none" style={{ left: '14px' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1.5"
                  style={{ right: '10px' }}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end pt-0.5">
              <div className="auth-access-wrapper !w-auto !p-1">
                <button
                  type="button"
                  onClick={() => setCurrentView('forgot-password')}
                  className="text-sm text-[#d8b081] hover:text-[#e8c091] transition-colors py-1 px-2"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
            <div className="auth-access-wrapper">
              <Button
                type="submit"
                disabled={isLoading || !captchaValidated || isLockedOut}
                className={`login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${captchaValidated && !isLockedOut
                    ? 'bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]'
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
              </Button>
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
              className="login-btn-google w-full h-12 rounded-xl flex items-center justify-center gap-3 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </Button>

            {/* Register link */}
            <div className="flex justify-center mt-6">
              <div className="auth-access-wrapper !w-auto !py-2 !px-4">
                <p className="text-sm text-gray-500">
                  ¿No tienes una cuenta?{' '}
                  <button
                    type="button"
                    onClick={onRequestRegister}
                    className="text-[#d8b081] hover:text-[#e8c091] font-semibold transition-colors"
                  >
                    Regístrate aquí
                  </button>
                </p>
              </div>
            </div>

            {/* Back to landing */}
            {onBackToLanding && (
              <div className="flex justify-center mt-6">
                <div className="auth-access-wrapper !w-auto !py-1 !px-4">
                  <button
                    type="button"
                    onClick={onBackToLanding}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-400 transition-colors mx-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio
                  </button>
                </div>
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
