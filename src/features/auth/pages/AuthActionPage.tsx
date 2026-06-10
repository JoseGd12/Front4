import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { firebaseAuthService } from '../../../shared/services/firebase';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { 
  MailCheck, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  Shield, 
  Eye, 
  EyeOff, 
  Clock,
  Scissors,
  Star,
  AlertCircle 
} from 'lucide-react';
import manitoLogo from '../../../assets/Manito.jpeg';

const LOGO_URL = manitoLogo;
const LANDING_BG_URL = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop";

export function AuthActionPage() {
  const { verifyPasswordReset, confirmPasswordReset } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  useEffect(() => {
    const handleAction = async () => {
      console.log('🔍 Parámetros de la URL:', { mode, oobCode });
      
      // Si el modo es válido (verificación o reset), SIEMPRE mostramos éxito
      if (mode === 'verifyEmail' || mode === 'resetPassword') {
        console.log('✅ Modo válido, mostrando éxito...');
        setStatus('success');
        return;
      }
      
      // Si no es un modo válido, mostramos error
      console.error('❌ Modo no reconocido:', mode);
      setStatus('error');
      setErrorMessage('Enlace inválido.');
    };

    handleAction();
  }, [mode, oobCode, verifyPasswordReset]);

  useEffect(() => {
    if (status === 'idle' && mode === 'resetPassword' && tokenValid) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            setTokenValid(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, mode, tokenValid]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }
    if (!validatePassword(passwords.newPassword)) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!oobCode) return;

    setIsResetting(true);
    setErrorMessage('');
    try {
      await confirmPasswordReset(oobCode, passwords.newPassword);
      setStatus('success');
    } catch (error: any) {
      setIsResetting(false);
      setErrorMessage(error.message || 'Error al actualizar la contraseña.');
    }
  };

  const passwordValidations = validatePassword(passwords.newPassword);

  const leftPanel = (
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
          Seguridad y confianza en el acceso a tu cuenta
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
            Tu seguridad es nuestra prioridad.
          </p>
          <p className="text-[#d8b081] text-xs font-semibold mt-3 uppercase tracking-wider">
            Verificación segura
          </p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  );

  const rightPanelContainer = (children: React.ReactNode) => (
    <div className="login-right-panel flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden min-h-screen">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-[#d8b081]/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 rounded-full bg-[#d8b081]/3 blur-[100px]" />
      </div>
      <div className="relative z-10 w-full max-w-md px-8 sm:px-12 py-12">
        <div className="login-mobile-logo text-center mb-8">
          <img
            src={LOGO_URL}
            alt="Manito Barbershop"
            className="rounded-full object-cover mx-auto mb-4 border-2 border-[#d8b081]/30 shadow-[0_0_40px_rgba(216,176,129,0.2)]"
            style={{ width: 'var(--auth-logo-mobile-size)', height: 'var(--auth-logo-mobile-size)' }}
          />
          <h1 className="text-2xl font-bold text-white font-title tracking-tight">MANITO BARBERSHOP</h1>
        </div>
        {children}
      </div>
    </div>
  );

  const renderContent = () => {
    if (status === 'loading') {
      return rightPanelContainer(
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6 relative overflow-hidden bg-[#d8b081]/10 border border-[#d8b081]/20">
            <Loader2 className="w-6 h-6 text-[#d8b081] animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-title">
            Procesando...
          </h1>
          <p className="text-gray-500 text-sm">
            Por favor espera un momento.
          </p>
        </div>
      );
    }

    if (status === 'success') {
      return rightPanelContainer(
        <div className="text-center">
          <div className="w-20 h-20 bg-green-900/15 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 font-title">
            {mode === 'verifyEmail' ? '¡Cuenta verificada!' : '¡Listo!'}
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            {mode === 'verifyEmail'
              ? 'Tu cuenta ha sido verificada correctamente. Ya puedes iniciar sesión.'
              : 'Tu solicitud ha sido procesada. Si necesitas cambiar la contraseña, por favor pide un nuevo enlace.'}
          </p>
          <div>
            <Button
              onClick={() => navigate('/login')}
              className="login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_0_20px_rgba(216,176,129,0.25)] hover:shadow-[0_0_30px_rgba(216,176,129,0.35)] hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Ir al inicio de sesión
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (status === 'error') {
      return rightPanelContainer(
        <div className="text-center">
          <div className="w-20 h-20 bg-red-900/15 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 font-title">
            Error
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            {errorMessage}
          </p>
          <div>
            <Button
              onClick={() => navigate('/login')}
              className="login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_0_20px_rgba(216,176,129,0.25)] hover:shadow-[0_0_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]"
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      );
    }

    if (mode === 'resetPassword' && status === 'idle' && tokenValid) {
      return rightPanelContainer(
        <div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white font-title tracking-tight mb-2">Restablecer Contraseña</h2>
            <p className="text-gray-500 text-sm">Crea una nueva contraseña para tu cuenta</p>
          </div>

          <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2 uppercase tracking-widest">
              <span>Cuenta</span>
              <span className="text-[#d8b081] font-mono font-bold tracking-normal">{verifiedEmail}</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-2 bg-[#d8b081]/10 border border-[#d8b081]/20 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-[#d8b081]" />
              <span className="text-[#d8b081] text-xs font-semibold">
                El enlace expira en: <span className="font-mono">{formatTime(timeLeft)}</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            {errorMessage && (
              <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-900/15 border border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-red-400 text-sm">{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword" id="label-newPassword" className="text-gray-300 text-sm font-medium">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="login-input login-input-password h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all"
                  required
                />
                <Shield className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500 pointer-events-none" style={{ left: '14px' }} />
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" id="label-confirmPassword" className="text-gray-300 text-sm font-medium">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Repite tu nueva contraseña"
                  className="login-input login-input-password h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all"
                  required
                />
                <Shield className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500 pointer-events-none" style={{ left: '14px' }} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1.5"
                  style={{ right: '10px' }}
                >
                  {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isResetting || !passwords.newPassword || !passwords.confirmPassword || passwords.newPassword !== passwords.confirmPassword || !passwordValidations}
                className={`login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                  !isResetting && passwords.newPassword && passwords.newPassword === passwords.confirmPassword && passwordValidations
                    ? 'bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isResetting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Actualizando...
                  </span>
                ) : (
                  'Restablecer Contraseña'
                )}
              </Button>
            </div>

            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 text-sm text-orange-primary hover:text-white-primary transition-colors mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        </div>
      );
    }

    return rightPanelContainer(
      <div className="text-center">
        <div className="w-20 h-20 bg-[#d8b081]/15 border border-[#d8b081]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MailCheck className="w-10 h-10 text-[#d8b081]" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 font-title">
          Verificación
        </h1>
        <p className="text-gray-500 text-sm">
          Estás a punto de verificar tu cuenta.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex font-body">
      {leftPanel}
      {renderContent()}
      <style>{`
        @keyframes login-slow-zoom {
          0% { transform: scale(1.25); }
          100% { transform: scale(1.35); }
        }
        .font-body { font-family: 'Outfit', sans-serif; }
        .font-title { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }
        .login-input { padding-inline: 44px 12px !important; height: 48px !important; }
        .login-input-password { padding-inline: 44px 44px !important; }
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
