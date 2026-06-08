import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MailCheck, CheckCircle, XCircle, Loader2, ArrowRight, Scissors, Star } from 'lucide-react';
import { firebaseAuthService } from '../../../shared/services/firebase';
import manitoLogo from '../../../assets/Manito.jpeg';

const LOGO_URL = manitoLogo;
const LANDING_BG_URL = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop";

interface EmailVerificationPageProps {
  onVerificationComplete: () => void;
  onBackToLogin: () => void;
}

export function EmailVerificationPage({ onVerificationComplete, onBackToLogin }: EmailVerificationPageProps) {
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useSearchParams();

  // Leer oobCode directo desde la URL
  const oobCode = searchParams.get('oobCode');

  // Verificar automáticamente al cargar si hay oobCode en la URL
  useEffect(() => {
    if (oobCode && status === 'idle') {
      handleVerify(oobCode);
    }
  }, []);

  const handleVerify = async (code?: string) => {
    const codeToUse = code || oobCode;
    if (!codeToUse) {
      setStatus('error');
      setErrorMessage('Enlace de verificación inválido o inexistente.');
      return;
    }

    setStatus('verifying');
    try {
      await firebaseAuthService.verifyEmailWithCode(codeToUse);
      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'El enlace de verificación es inválido o ha expirado.');
    }
  };

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
          Verifica tu cuenta y comienza tu experiencia con nosotros
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
            "Seguridad en cada paso. Un solo clic para activar tu acceso premium."
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
        {children}
      </div>
    </div>
  );

  const renderStatus = () => {
    switch (status) {
      case 'idle':
        return rightPanelContainer(
          <div className="text-center">
            <div className="w-20 h-20 bg-[#d8b081]/15 border border-[#d8b081]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MailCheck className="w-10 h-10 text-[#d8b081]" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4 font-title">Verificación</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Estás a un paso de activar tu cuenta. Confirma tu correo para comenzar.
            </p>
            <div>
              <button
                onClick={() => handleVerify()}
                className="login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                Verificar cuenta
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      case 'verifying':
        return rightPanelContainer(
          <div className="text-center">
            <div className="w-20 h-20 bg-[#d8b081]/15 border border-[#d8b081]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-[#d8b081] animate-spin" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4 font-title">Verificando...</h1>
            <p className="text-gray-400">Por favor espera un momento...</p>
          </div>
        );
      case 'success':
        return rightPanelContainer(
          <div className="text-center">
            <div className="w-20 h-20 bg-green-900/15 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4 font-title">¡Excelente!</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Tu cuenta ha sido activada. Ya puedes disfrutar de todos nuestros servicios.
            </p>
            <div>
              <button
                onClick={onVerificationComplete}
                className="login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                Ir a mi cuenta
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      case 'error':
        return rightPanelContainer(
          <div className="text-center">
            <div className="w-20 h-20 bg-red-900/15 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4 font-title">Error</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">{errorMessage}</p>
            <div>
              <button
                onClick={onBackToLogin}
                className="login-btn w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 bg-[#d8b081] hover:bg-[#e8c091] text-black shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)] hover:scale-[1.02]"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex font-body">
      {leftPanel}
      {renderStatus()}

      <style>{`
        @keyframes login-slow-zoom {
          0% { transform: scale(1.25); }
          100% { transform: scale(1.35); }
        }
        .font-body { font-family: 'Outfit', sans-serif; }
        .font-title { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }

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

