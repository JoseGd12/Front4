import { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Clock } from 'lucide-react';
import manitoLogo from '../../../assets/Manito.jpeg';
const LOGO_URL = manitoLogo;
const LANDING_BG_URL = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop";

function AuthBackground({ children }: { children: any }) {
  return (
    <div className="min-h-screen bg-black-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${LANDING_BG_URL}')` }}
      />
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/75" />
      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </div>
  );
}

interface PasswordResetPageProps {
  token?: string;
  email?: string;
  onComplete?: () => void;
  onBack?: () => void;
}

export function PasswordResetPage({ token, email, onComplete, onBack }: PasswordResetPageProps) {
  const { verifyPasswordReset, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState<'verify' | 'reset' | 'success'>('verify');
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(true);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 horas en segundos
  const [verifiedEmail, setVerifiedEmail] = useState(email || '');

  // Capturar oobCode directamente de la URL (Solución Real solicitada)
  const [urlParams] = useState(() => new URLSearchParams(window.location.search));
  const oobCodeFromUrl = urlParams.get('oobCode');
  const finalToken = token || oobCodeFromUrl;

  // Validación real del token al cargar
  useEffect(() => {
    const validateToken = async () => {
      // Usamos finalToken que puede venir por props o por URL
      if (!finalToken) {
        setTokenValid(false);
        setStep('reset');
        return;
      }

      try {
        const result = await verifyPasswordReset(finalToken);
        if (result.success && result.email) {
          setTokenValid(true);
          setVerifiedEmail(result.email);
          setStep('reset');
        } else {
          setTokenValid(false);
          setStep('reset');
        }
      } catch (error) {
        console.error("Error validando token:", error);
        setTokenValid(false);
        setStep('reset');
      }
    };

    validateToken();
  }, [finalToken, verifyPasswordReset]);

  // Contador regresivo para la expiración del token
  useEffect(() => {
    if (step === 'reset' && tokenValid) {
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
  }, [step, tokenValid]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const validatePassword = (password: string) => {
    return {
      minLength: password.length >= 6,
      hasNumber: /[0-9]/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password)
    };
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const validations = validatePassword(passwords.newPassword);
    if (!validations.minLength) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!finalToken) {
      setError('Token de recuperación no válido o expirado');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await confirmPasswordReset(finalToken, passwords.newPassword);
      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Error al actualizar la contraseña');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidations = validatePassword(passwords.newPassword);

  // Paso 1: Verificación inicial del token
  if (step === 'verify') {
    return (
      <AuthBackground>
        <div className="w-full max-w-md">
          <div className="elegante-card text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6 elegante-shadow-lg relative overflow-hidden">
              <img src={LOGO_URL} alt="Manito Barbershop Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white-primary mb-4">
              Verificando enlace...
            </h1>
            <p className="text-gray-lightest mb-6">
              Estamos validando tu enlace de recuperación de contraseña
            </p>
            <div className="w-8 h-8 border-2 border-orange-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </AuthBackground>
    );
  }

  // Token inválido o expirado
  if (!tokenValid) {
    return (
      <AuthBackground>
        <div className="w-full max-w-md">
          <div className="elegante-card text-center">
            <div className="w-20 h-20 bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white-primary mb-4">
              Enlace no válido
            </h1>
            <p className="text-gray-lightest mb-6">
              El enlace de recuperación ha expirado o no es válido. Por favor, solicita un nuevo enlace de recuperación.
            </p>
            <div className="space-y-3">
              <Button
                onClick={onBack}
                className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]"
              >
                Solicitar nuevo enlace
              </Button>
            </div>
          </div>
        </div>
      </AuthBackground>
    );
  }

  // Paso 2: Éxito
  if (step === 'success') {
    return (
      <AuthBackground>
        <div className="w-full max-w-md">
          <div className="elegante-card text-center">
            <div className="w-20 h-20 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white-primary mb-4">
              ¡Contraseña actualizada!
            </h1>
            <p className="text-gray-lightest mb-6">
              Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <div className="space-y-3">
              <Button
                onClick={onComplete}
                className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]"
              >
                Ir a iniciar sesión
              </Button>
            </div>
          </div>
        </div>
      </AuthBackground>
    );
  }

  // Paso principal: Formulario de restablecimiento
  return (
    <AuthBackground>
      <div className="w-full max-w-lg">
        {/* Header con información de la solicitud */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 elegante-shadow-lg relative overflow-hidden">
            <img src={LOGO_URL} alt="Manito Barbershop Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white-primary mb-2">
            Recuperación de Contraseña
          </h1>
          <p className="text-gray-lightest">
            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta
          </p>
        </div>

        {/* Detalles de la solicitud */}
        <div className="elegante-card mb-6">
          <h3 className="text-lg font-semibold text-white-primary mb-4">
            Detalles de la solicitud:
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-lightest">Cuenta:</span>
              <span className="text-white-primary font-mono">{verifiedEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-lightest">Fecha:</span>
              <span className="text-white-primary">{new Date().toLocaleString('es-ES')}</span>
            </div>
          </div>
        </div>

        {/* Formulario de nueva contraseña */}
        <div className="elegante-card">
          <form onSubmit={handlePasswordReset} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* Tiempo restante */}
            <div className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-orange-primary/10 border border-orange-primary/20">
              <Clock className="w-4 h-4 text-orange-primary" />
              <span className="text-orange-primary text-sm">
                Este enlace es válido por: <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-white-primary">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="elegante-input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-lighter hover:text-white-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Validaciones de contraseña */}
              {passwords.newPassword && (
                <div className="mt-3 p-3 bg-gray-darker rounded-lg border border-gray-dark">
                  <h4 className="text-white-primary text-sm font-medium mb-2">Requisitos de seguridad:</h4>
                  <div className="space-y-1 text-sm">
                    <div className={`flex items-center gap-2 ${passwordValidations.minLength ? 'text-green-400' : 'text-gray-lighter'}`}>
                      <div className={`w-2 h-2 rounded-full ${passwordValidations.minLength ? 'bg-green-400' : 'bg-gray-medium'}`} />
                      Mínimo 6 caracteres
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidations.hasNumber ? 'text-green-400' : 'text-gray-lighter'}`}>
                      <div className={`w-2 h-2 rounded-full ${passwordValidations.hasNumber ? 'bg-green-400' : 'bg-gray-medium'}`} />
                      Al menos un número (recomendado)
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidations.hasUpperCase ? 'text-green-400' : 'text-gray-lighter'}`}>
                      <div className={`w-2 h-2 rounded-full ${passwordValidations.hasUpperCase ? 'bg-green-400' : 'bg-gray-medium'}`} />
                      Al menos una mayúscula (recomendado)
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white-primary">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Repite tu nueva contraseña"
                  className="elegante-input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-lighter hover:text-white-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                <p className="text-red-400 text-sm">Las contraseñas no coinciden</p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-dark">
              <Button
                type="submit"
                disabled={isLoading || !passwords.newPassword || !passwords.confirmPassword || passwords.newPassword !== passwords.confirmPassword || !passwordValidations.minLength}
                className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02] flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black-primary border-t-transparent rounded-full animate-spin mr-2" />
                    Actualizando contraseña...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Restablecer Contraseña
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Botón de regreso */}
          <div className="mt-6 pt-6 border-t border-gray-dark">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-orange-primary hover:text-orange-secondary transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
