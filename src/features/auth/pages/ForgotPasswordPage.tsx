import { useState } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Input } from '../../../shared/components/ui/input';
import { Button } from '../../../shared/components/ui/button';
import { Label } from '../../../shared/components/ui/label';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, Clock, Scissors, Star } from 'lucide-react';
import manitoLogo from '../../../assets/Manito.jpeg';

const LOGO_URL = manitoLogo;
const LANDING_BG_URL = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop";

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      setIsLoading(false);
      return;
    }

    try {
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

  const renderSuccess = () => (
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
            className="rounded-full object-cover mx-auto mb-4 border-2 border-[#d8b081]/30 shadow-[0_0_40px_rgba(216,176,129,0.2)]"
            style={{ width: 'var(--auth-logo-mobile-size)', height: 'var(--auth-logo-mobile-size)' }}
          />
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4 font-title">
          ¡Email enviado!
        </h1>
        <p className="text-gray-400 mb-6 leading-relaxed">
          Si existe una cuenta asociada con <span className="text-[#d8b081] font-mono font-bold">{sentEmail}</span>,
          recibirás un enlace para restablecer tu contraseña pronto.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-[#d8b081]/10 border border-[#d8b081]/20 rounded-xl text-left">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#d8b081] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-2 text-sm">Próximos pasos:</h4>
                <ul className="text-xs text-gray-400 space-y-1">
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
              className="login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]"
            >
              Volver al inicio de sesión
            </Button>

            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
                setError('');
              }}
              className="w-full text-xs text-orange-primary hover:text-white-primary transition-colors underline uppercase tracking-widest font-bold mt-1 p-2 cursor-pointer"
            >
              Enviar a otro email
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm = () => (
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
            className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-[#d8b081]/30 shadow-[0_0_40px_rgba(216,176,129,0.2)]"
          />
          <h1 className="text-2xl font-bold text-white font-title tracking-tight">MANITO BARBERSHOP</h1>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white font-title tracking-tight mb-2">Recuperar Contraseña</h2>
          <p className="text-gray-500 text-sm">Te enviaremos un enlace para restablecer tu contraseña</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleForgotPassword} className="space-y-5">
          {error && (
            <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-red-900/15 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300 text-sm font-medium">Email de tu cuenta</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="login-input h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600 rounded-xl focus:border-[#d8b081]/50 focus:ring-[#d8b081]/20 transition-all font-body px-11"
                required
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl mt-2">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[#d8b081] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-2 text-sm">Seguridad</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Solo enviamos enlaces a emails registrados</li>
                  <li>• El enlace expira en 24 horas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Send button */}
          <div>
            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className={`login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                email.trim()
                  ? 'bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Enviando enlace...
                </span>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </Button>
          </div>

          {/* Back link */}
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-orange-primary hover:text-white-primary transition-colors mx-auto cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex font-body">
      {/* ── Panel Izquierdo: Imagen + Branding (Siempre común) ── */}
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
            Recupera el acceso a tu cuenta de forma segura
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
              "Tu seguridad es nuestra prioridad. Recupera tu cuenta en minutos."
            </p>
            <p className="text-[#d8b081] text-xs font-semibold mt-3 uppercase tracking-wider">
              Proceso seguro y rápido
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>

      {/* ── Panel Derecho: Alternar Formulario / Éxito ── */}
      {success ? renderSuccess() : renderForm()}

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
        .login-btn {
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
