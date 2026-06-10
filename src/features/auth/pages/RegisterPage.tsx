import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Input } from '../../../shared/components/ui/input';
import { Button } from '../../../shared/components/ui/button';
import { Label } from '../../../shared/components/ui/label';
import { Eye, EyeOff, User, Mail, ArrowLeft, CheckCircle, AlertCircle, Scissors, Star, Lock } from 'lucide-react';
import { SimpleCaptcha } from '../components/captcha/index';
import manitoLogo from '../../../assets/Manito.jpeg';
const LOGO_URL = manitoLogo;
const LANDING_BG_URL = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop";

interface RegisterPageProps {
  onBack: () => void;
}

export function RegisterPage({ onBack }: RegisterPageProps) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailConflictError, setEmailConflictError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaValidated, setCaptchaValidated] = useState<boolean>(false);

  const [showRegisterFormErrors, setShowRegisterFormErrors] = useState(false);
  const [registerValidationAttempt, setRegisterValidationAttempt] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  useEffect(() => {
    if (!success) return;
    const interval = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onBack(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success, onBack]);

  const validatePassword = (password: string) => {
    return {
      minLength: password.length >= 6,
      hasNumber: /[0-9]/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password)
    };
  };

  const passwordValidations = validatePassword(formData.password);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const nameMissing = !formData.name.trim();
  const apellidoMissing = !formData.apellido.trim();
  const emailMissing = !formData.email.trim();
  const passwordMissing = !formData.password;
  const confirmPasswordMissing = !formData.confirmPassword;
  const passwordsMatch = formData.password === formData.confirmPassword;

  const shakeClass = registerValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';

  const updateFormField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (showRegisterFormErrors) setShowRegisterFormErrors(false);
    if (emailConflictError) setEmailConflictError('');
    if (error) setError('');
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    setShowRegisterFormErrors(true);
    setRegisterValidationAttempt(prev => prev + 1);

    if (nameMissing || apellidoMissing || emailMissing || !isEmailValid || passwordMissing || !passwordValidations.minLength || confirmPasswordMissing || !passwordsMatch || !captchaValidated) {
      return;
    }

    setIsLoading(true);
    setError('');
    setEmailConflictError('');

    try {
      const result = await register({
        name: formData.name.trim(),
        apellido: formData.apellido.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: 'cliente'
      });

      if (result.success) {
        setSuccess(true);
      } else {
        const errorMsg = result.error?.toLowerCase() || '';
        if (errorMsg.includes('ya está en uso') || errorMsg.includes('already in use') || errorMsg.includes('ya está registrado')) {
          setEmailConflictError('El email ya está registrado o en uso.');
        } else {
          setError(result.error || 'Error al crear la cuenta');
        }
      }
    } catch (err) {
      setError('Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptchaValidation = (isValid: boolean) => {
    setCaptchaValidated(isValid);
    if (showRegisterFormErrors) setShowRegisterFormErrors(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex font-body">
        {/* ── Panel Izquierdo: Imagen + Branding ── */}
        <div className="login-left-panel flex relative overflow-hidden items-center justify-center">
          <div
            className="absolute inset-0 bg-cover bg-center scale-125 grayscale opacity-50"
            style={{
              backgroundImage: `url('${LANDING_BG_URL}')`,
              animation: 'login-slow-zoom 25s ease-in-out infinite alternate',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a]/40 via-[#0d0d0d]/70 to-black" />
          <div className="absolute inset-0 bg-black/30" />

          <div className="relative z-10 px-12 xl:px-20 max-w-xl text-center">
            <div className="mb-8">
              <img
                src={LOGO_URL}
                alt="Manito Barbershop"
                className="w-14 h-14 rounded-full object-cover mx-auto border-2 border-[#d8b081]/30 shadow-[0_0_40px_rgba(216,176,129,0.2)]"
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
              Únete a nuestra comunidad y agenda tus citas fácilmente
            </p>

            <div className="flex items-center justify-center gap-4 mb-10">
              <span className="block w-16 h-px bg-gradient-to-r from-transparent to-[#d8b081]/60" />
              <Scissors className="w-5 h-5 text-[#d8b081]/60" />
              <span className="block w-16 h-px bg-gradient-to-l from-transparent to-[#d8b081]/60" />
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">¡Casi listo!</h2>
              <p className="text-gray-400 text-sm">Verifica tu correo para activar tu cuenta.</p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
        </div>

        {/* ── Panel Derecho: Mensaje de Éxito ── */}
        <div className="login-right-panel flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden min-h-screen">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-[#d8b081]/5 blur-[120px]" />
            <div className="absolute bottom-1/4 left-0 w-72 h-72 rounded-full bg-[#d8b081]/3 blur-[100px]" />
          </div>

          <div className="relative z-10 w-full max-w-md px-8 sm:px-12 py-12 text-center">
            {/* Mobile logo */}
            <div className="login-mobile-logo text-center mb-8">
              <img
                src={LOGO_URL}
                alt="Manito Barbershop"
                className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-2 border-[#d8b081]/30"
              />
              <Mail className="w-12 h-12 text-green-400 mx-auto mb-4" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-4 font-title">
              ¡Revisa tu correo!
            </h1>
            <p className="text-gray-400 mb-6">
              Tu cuenta ha sido creada exitosamente. Hemos enviado un enlace de verificación a <strong className="text-[#d8b081]">{formData.email}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Por favor revisa tu bandeja de entrada o carpeta de spam y haz clic en el enlace para activar tu cuenta antes de iniciar sesión.
            </p>

            <Button
              onClick={onBack}
              className="login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]"
            >
              Ir al inicio de sesión ({redirectCountdown})
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes login-slow-zoom {
            0% { transform: scale(1.25); }
            100% { transform: scale(1.35); }
          }
          .font-body { font-family: 'Outfit', sans-serif; }
          .font-title { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }
          .login-btn { height: 48px !important; }
          .login-left-panel { flex: 0 0 50%; }
          .login-right-panel { flex: 0 0 50%; }
          .login-mobile-logo { display: none; }

          @media (max-width: 1023px) {
            .login-left-panel { display: none !important; }
            .login-right-panel { flex: 0 0 100%; }
            .login-mobile-logo { display: block; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-body">
      {/* ── Panel Izquierdo: Imagen + Branding ── */}
      <div className="login-left-panel flex relative overflow-hidden items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center scale-125 grayscale opacity-50"
          style={{
            backgroundImage: `url('${LANDING_BG_URL}')`,
            animation: 'login-slow-zoom 25s ease-in-out infinite alternate',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a]/40 via-[#0d0d0d]/70 to-black" />
        <div className="absolute inset-0 bg-black/30" />

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
            Únete a nuestra comunidad y agenda tus citas fácilmente
          </p>

          <div className="flex items-center justify-center gap-4 mb-10">
            <span className="block w-16 h-px bg-gradient-to-r from-transparent to-[#d8b081]/60" />
            <Scissors className="w-5 h-5 text-[#d8b081]/60" />
            <span className="block w-16 h-px bg-gradient-to-l from-transparent to-[#d8b081]/60" />
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-4 h-4 text-[#d8b081] fill-[#d8b081]" />
              ))}
            </div>
            <p className="text-gray-300 text-sm italic leading-relaxed">
              "Registro rápido, reserva fácil. La mejor experiencia desde el primer momento."
            </p>
            <p className="text-[#d8b081] text-xs font-semibold mt-3 uppercase tracking-wider">
              +2 años de experiencia
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* ── Panel Derecho: Formulario ── */}
      <div className="login-right-panel flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-[#d8b081]/5 blur-[120px]" />
          <div className="absolute bottom-1/4 left-0 w-72 h-72 rounded-full bg-[#d8b081]/3 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-md px-8 sm:px-12 py-12">
          {/* Mobile logo */}
          <div className="login-mobile-logo text-center mb-8">
            <img
              src={LOGO_URL}
              alt="Manito Barbershop"
              className="rounded-full object-cover mx-auto mb-4 border-2 border-[#d8b081]/30 shadow-[0_0_40px_rgba(216,176,129,0.2)]"
              style={{ width: 'var(--auth-logo-mobile-size)', height: 'var(--auth-logo-mobile-size)' }}
            />
            <h1 className="text-2xl font-bold text-white font-title tracking-tight">MANITO BARBERSHOP</h1>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white font-title tracking-tight mb-2">Crear Cuenta</h2>
            <p className="text-gray-500 text-sm">Completa tus datos para registrarte</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleRegister} noValidate className="space-y-4">
            {error && (
              <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-900/15 border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300 text-sm font-medium">Nombre *</Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    maxLength={30}
                    onChange={(e) => updateFormField('name', e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9 ]/g, '').slice(0, 30))}
                    placeholder="Tu nombre"
                    className={`login-input h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all ${showRegisterFormErrors && nameMissing ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                  />
                  <User className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none ${showRegisterFormErrors && nameMissing ? 'text-red-400' : 'text-gray-500'}`} style={{ left: '14px' }} />
                </div>
                {showRegisterFormErrors && nameMissing && (
                  <p className="text-xs text-red-400 mt-1">Obligatorio</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apellido" className="text-gray-300 text-sm font-medium">Apellido *</Label>
                <div className="relative">
                  <Input
                    id="apellido"
                    type="text"
                    value={formData.apellido}
                    maxLength={30}
                    onChange={(e) => updateFormField('apellido', e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9 ]/g, '').slice(0, 30))}
                    placeholder="Tu apellido"
                    className={`login-input h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all ${showRegisterFormErrors && apellidoMissing ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                  />
                  <User className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none ${showRegisterFormErrors && apellidoMissing ? 'text-red-400' : 'text-gray-500'}`} style={{ left: '14px' }} />
                </div>
                {showRegisterFormErrors && apellidoMissing && (
                  <p className="text-xs text-red-400 mt-1">Obligatorio</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 text-sm font-medium">Email *</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormField('email', e.target.value)}
                  placeholder="tu@email.com"
                  className={`login-input h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all ${(showRegisterFormErrors && (emailMissing || !isEmailValid)) || emailConflictError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                <Mail className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none ${(showRegisterFormErrors && (emailMissing || !isEmailValid)) || emailConflictError ? 'text-red-400' : 'text-gray-500'}`} style={{ left: '14px' }} />
              </div>
              {showRegisterFormErrors && emailMissing && (
                <p className="text-xs text-red-400 mt-1">El email es obligatorio</p>
              )}
              {showRegisterFormErrors && !emailMissing && !isEmailValid && (
                <p className="text-xs text-red-400 mt-1">Ingresa un email válido</p>
              )}
              {emailConflictError && (
                <p className="text-xs text-red-400 mt-1">{emailConflictError}</p>
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
                  placeholder="Mínimo 6 caracteres"
                  className={`login-input login-input-password h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all ${showRegisterFormErrors && (passwordMissing || !passwordValidations.minLength) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none ${showRegisterFormErrors && (passwordMissing || !passwordValidations.minLength) ? 'text-red-400' : 'text-gray-500'}`} style={{ left: '14px' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1.5"
                  style={{ right: '10px' }}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {showRegisterFormErrors && passwordMissing && (
                <p className="text-xs text-red-400 mt-1">La contraseña es obligatoria</p>
              )}
              {showRegisterFormErrors && !passwordMissing && !passwordValidations.minLength && (
                <p className="text-xs text-red-400 mt-1">Debe tener al menos 6 caracteres</p>
              )}

              {formData.password && (
                <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="text-white text-xs font-medium mb-2">Requisitos de seguridad:</h4>
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${passwordValidations.minLength ? 'text-green-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidations.minLength ? 'bg-green-400' : 'bg-gray-600'}`} />
                      Mínimo 6 caracteres
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidations.hasNumber ? 'text-green-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidations.hasNumber ? 'bg-green-400' : 'bg-gray-600'}`} />
                      Al menos un número 
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidations.hasUpperCase ? 'text-green-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidations.hasUpperCase ? 'bg-green-400' : 'bg-gray-600'}`} />
                      Al menos una mayúscula 
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300 text-sm font-medium">Confirmar contraseña *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormField('confirmPassword', e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={`login-input login-input-password h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all ${showRegisterFormErrors && (confirmPasswordMissing || !passwordsMatch) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none ${showRegisterFormErrors && (confirmPasswordMissing || !passwordsMatch) ? 'text-red-400' : 'text-gray-500'}`} style={{ left: '14px' }} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1.5"
                  style={{ right: '10px' }}
                >
                  {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {showRegisterFormErrors && confirmPasswordMissing && (
                <p className="text-xs text-red-400 mt-1">Confirma tu contraseña</p>
              )}
              {showRegisterFormErrors && !confirmPasswordMissing && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Captcha */}
            <div className={`${showRegisterFormErrors && !captchaValidated ? shakeClass : ''}`}>
              <SimpleCaptcha onValidate={handleCaptchaValidation} />
              {showRegisterFormErrors && !captchaValidated && (
                <p className="text-xs text-red-400 mt-2 text-center">Completa el captcha para continuar</p>
              )}
            </div>

            {/* Register button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || !captchaValidated}
                className={`login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider pointer-events-auto mt-2 ${
                  isLoading || !captchaValidated
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-[#d8b081] text-black cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creando cuenta...
                  </span>
                ) : (
                  'Crear Cuenta'
                )}
              </button>
            </div>

            {/* Back link */}
            <div className="flex justify-center mt-4">
              <p className="text-center text-sm text-gray-500">
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={onBack}
                  className="text-orange-primary hover:text-white font-semibold transition-all cursor-pointer px-2 py-0.5 rounded-md hover:bg-[#d8b081]/10 underline underline-offset-2"
                >
                  Inicia sesión
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-orange-primary hover:text-[#e8c091] transition-all mx-auto mt-2 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-[#d8b081]/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          </form>
        </div>
      </div>

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
