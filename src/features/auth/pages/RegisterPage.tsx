import { useState, FormEvent } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Input } from '../../../shared/components/ui/input';
import { Button } from '../../../shared/components/ui/button';
import { Label } from '../../../shared/components/ui/label';
import { Eye, EyeOff, User, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { SimpleCaptcha } from '../components/captcha/index';
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
  const [error, setError] = useState(''); // Error global
  const [emailConflictError, setEmailConflictError] = useState(''); // Error específico de correo en uso
  const [success, setSuccess] = useState(false);
  const [captchaValidated, setCaptchaValidated] = useState<boolean>(false);
  
  // Validaciones visuales y de animación
  const [showRegisterFormErrors, setShowRegisterFormErrors] = useState(false);
  const [registerValidationAttempt, setRegisterValidationAttempt] = useState(0);

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
    
    // Al presionar el botón, forzamos mostrar los errores y re-lanzar la animación
    setShowRegisterFormErrors(true);
    setRegisterValidationAttempt(prev => prev + 1);

    // Si falta algo o no es válido, no procedemos a llamar la API
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
        // No reseteamos el captcha para permitir volver a presionar tras corregir el correo
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
      <AuthBackground>
        <div className="w-full max-w-md">
          <div className="elegante-card text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600" />
            <div className="w-20 h-20 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 mt-4">
              <Mail className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white-primary mb-4">
              ¡Revisa tu correo!
            </h1>
            <p className="text-gray-lightest mb-6">
              Tu cuenta ha sido creada exitosamente. Hemos enviado un enlace de verificación a <strong>{formData.email}</strong>.
            </p>
            <p className="text-sm text-gray-lighter mb-8">
              Por favor revisa tu bandeja de entrada o carpeta de spam y haz clic en el enlace para activar tu cuenta antes de iniciar sesión.
            </p>
            <Button
              onClick={onBack}
              className="elegante-button-primary w-full flex items-center justify-center"
            >
              Ir al inicio de sesión
            </Button>
          </div>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 elegante-shadow-lg relative overflow-hidden">
            <img src={LOGO_URL} alt="Manito Barbershop Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white-primary mb-2">
            Crear Cuenta
          </h1>
          <p className="text-gray-lightest">
            Únete a MANITO BARBERSHOP
          </p>
        </div>

        {/* Formulario de registro */}
        <div className="elegante-card">
          <form onSubmit={handleRegister} noValidate className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white-primary">Nombre *</Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    placeholder="Tu nombre"
                    className={`elegante-input pl-10 ${showRegisterFormErrors && nameMissing ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                  />
                  <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${showRegisterFormErrors && nameMissing ? 'text-red-400' : 'text-gray-lighter'}`} />
                </div>
                {showRegisterFormErrors && nameMissing && (
                  <p className="text-xs text-red-400 mt-1">El nombre es obligatorio</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apellido" className="text-white-primary">Apellido *</Label>
                <div className="relative">
                  <Input
                    id="apellido"
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => updateFormField('apellido', e.target.value)}
                    placeholder="Tu apellido"
                    className={`elegante-input pl-10 ${showRegisterFormErrors && apellidoMissing ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                  />
                  <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${showRegisterFormErrors && apellidoMissing ? 'text-red-400' : 'text-gray-lighter'}`} />
                </div>
                {showRegisterFormErrors && apellidoMissing && (
                  <p className="text-xs text-red-400 mt-1">El apellido es obligatorio</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white-primary">Email *</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormField('email', e.target.value)}
                  placeholder="tu@email.com"
                  className={`elegante-input pl-10 ${(showRegisterFormErrors && (emailMissing || !isEmailValid)) || emailConflictError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${(showRegisterFormErrors && (emailMissing || !isEmailValid)) || emailConflictError ? 'text-red-400' : 'text-gray-lighter'}`} />
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
              <Label htmlFor="password" className="text-white-primary">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateFormField('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`elegante-input pl-10 pr-10 ${showRegisterFormErrors && (passwordMissing || !passwordValidations.minLength) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${showRegisterFormErrors && (passwordMissing || !passwordValidations.minLength) ? 'text-red-400' : 'text-gray-lighter'}`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-lighter hover:text-white-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {showRegisterFormErrors && passwordMissing && (
                <p className="text-xs text-red-400 mt-1">La contraseña es obligatoria</p>
              )}
              {showRegisterFormErrors && !passwordMissing && !passwordValidations.minLength && (
                <p className="text-xs text-red-400 mt-1">Debe tener al menos 6 caracteres</p>
              )}

              {/* Validaciones visuales en tiempo real */}
              {formData.password && (
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
              <Label htmlFor="confirmPassword" className="text-white-primary">Confirmar contraseña *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormField('confirmPassword', e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={`elegante-input pl-10 pr-10 ${showRegisterFormErrors && (confirmPasswordMissing || !passwordsMatch) ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                />
                <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${showRegisterFormErrors && (confirmPasswordMissing || !passwordsMatch) ? 'text-red-400' : 'text-gray-lighter'}`} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-lighter hover:text-white-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {showRegisterFormErrors && confirmPasswordMissing && (
                <p className="text-xs text-red-400 mt-1">Confirma tu contraseña</p>
              )}
              {showRegisterFormErrors && !confirmPasswordMissing && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Captcha de seguridad */}
            <div className={`mt-6 ${showRegisterFormErrors && !captchaValidated ? shakeClass : ''}`}>
              <SimpleCaptcha
                onValidate={handleCaptchaValidation}
              />
              {showRegisterFormErrors && !captchaValidated && (
                <p className="text-xs text-red-400 mt-2 text-center">Completa el captcha para continuar</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="elegante-button-primary w-full flex items-center justify-center mt-6"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Crear Cuenta
                </>
              )}
            </Button>
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
