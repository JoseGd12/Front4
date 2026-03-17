import { useState } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Input } from '../../../shared/components/ui/input';
import { Button } from '../../../shared/components/ui/button';
import { Label } from '../../../shared/components/ui/label';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, Clock } from 'lucide-react';
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

interface ForgotPasswordPageProps {
  onBack: () => void;
  onPasswordReset?: (email: string, token: string) => void;
}

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');



  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email.trim()) {
      setError('El email es obligatorio');
      setIsLoading(false);
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      setIsLoading(false);
      return;
    }

    try {
      // Llamada real a Firebase a través del AuthContext
      const result = await resetPassword(email.toLowerCase().trim());

      if (result.success) {
        setSentEmail(email.toLowerCase().trim());
        setSuccess(true);
      } else {
        setError(result.error || 'No se pudo enviar el email de recuperación.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };



  if (success) {
    return (
      <AuthBackground>
        <div className="w-full max-w-md mx-auto">
          <div className="elegante-card text-center flex flex-col justify-center">
            <div className="w-20 h-20 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white-primary mb-4">
              ¡Email enviado!
            </h1>
            <p className="text-gray-lightest mb-6">
              Si existe una cuenta asociada con <span className="text-orange-primary font-mono">{sentEmail}</span>,
              recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </p>

            <div className="space-y-4">
              <div className="p-4 bg-orange-primary/10 border border-orange-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-orange-primary flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-medium text-white-primary mb-2">Próximos pasos:</h4>
                    <ul className="text-sm text-gray-lightest space-y-1">
                      <li>• Revisa tu bandeja de entrada y spam</li>
                      <li>• El enlace expira en 24 horas</li>
                      <li>• Solo puedes usar el enlace una vez</li>
                      <li>• Si no lo recibes, intenta de nuevo</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={onBack}
                  className="elegante-button-primary w-full"
                >
                  Volver al inicio de sesión
                </Button>

                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                    setError('');
                  }}
                  className="w-full text-sm text-orange-primary hover:text-orange-secondary transition-colors underline"
                >
                  Enviar a otro email
                </button>
              </div>
            </div>
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
            <img
              src={LOGO_URL}
              alt="Manito Barbershop Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white-primary mb-2">
            Recuperar Contraseña
          </h1>
          <p className="text-gray-lightest">
            Te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        {/* Formulario de recuperación */}
        <div className="elegante-card">
          <form onSubmit={handleForgotPassword} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white-primary">Email de tu cuenta</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="elegante-input pl-10"
                  required
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
              </div>
              <p className="text-xs text-gray-lightest">
                Ingresa el email asociado con tu cuenta de MANITO BARBERSHOP
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="elegante-button-primary w-full flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando enlace...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar enlace de recuperación
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

        {/* Información de seguridad */}
        <div
          className="mt-6 p-5 rounded-xl shadow-lg border border-orange-primary/30"
          style={{ backgroundColor: "#0d0d0d" }}
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-orange-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-white-primary mb-2">Información de Seguridad</h4>
              <ul className="text-sm text-gray-lightest space-y-1">
                <li>• Solo enviamos enlaces a emails registrados en nuestro sistema</li>
                <li>• El enlace de recuperación expira en 24 horas</li>
                <li>• Cada enlace solo puede ser usado una vez</li>
                <li>• Si no recibes el email, revisa tu carpeta de spam</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </AuthBackground>
  );
}
