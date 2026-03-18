  import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./shared/contexts/AuthContext";
import { Toaster } from "sonner";
import { ThemeProvider } from "./shared/contexts/ThemeContext";
import { AlertProvider, GlobalAlertContainer } from "./shared/components/ui/custom-alert";
import { Dashboard } from "./features/dashboard/components/Dashboard";
import { ClienteDashboard } from "./features/clientes/pages/ClienteDashboard";
import { LandingPage } from "./features/dashboard/pages/LandingPage";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { RegisterPage } from "./features/auth/pages/RegisterPage";
import { EmailVerificationPage } from "./features/auth/pages/EmailVerificationPage";
import { ForzarCambioPassword } from "./features/auth/components/ForzarCambioPassword";
import { checkPasswordPolicy } from "./features/auth/services/authUtils";
import { firebaseAuthService } from "./shared/services/firebase";

function AppContent() {
  const { isAuthenticated, isAdmin, isCliente, logout } = useAuth();
  const [publicView, setPublicView] = useState<"landing" | "login" | "register" | "verify" | "dashboard">("landing");
  const [passwordPolicyReason, setPasswordPolicyReason] = useState<'first_login' | 'expired' | null>(null);
  const [passwordPolicyChecked, setPasswordPolicyChecked] = useState(false);

  const [resetData, setResetData] = useState<{ email: string; token: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [initialReservation, setInitialReservation] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin()) {
        setPublicView("dashboard");
      } else {
        setPublicView("landing");
      }
    }

    // Solución REAL: Detectar parámetros y ruta de recuperación/verificación
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');
    const isResetPage = window.location.pathname.includes('reset-password');
    const isVerifyPage = window.location.pathname.includes('verify-email');
    let handledSpecialLink = false;

    // Priorizar siempre el mode proporcionado por Firebase por encima de la ruta, 
    // en caso de que la URL de redirección en Firebase Console esté mal configurada.
    if ((mode === 'resetPassword' || (isResetPage && mode !== 'verifyEmail')) && oobCode) {
      console.log('🎯 Solución REAL: Detectado oobCode para reseteo, abriendo formulario personalizado');
      handledSpecialLink = true;
      setPublicView("login");
      setResetData({ email: '', token: oobCode });

      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } 
    else if ((mode === 'verifyEmail' || (isVerifyPage && mode !== 'resetPassword')) && oobCode) {
      console.log('📧 Detectado oobCode para verificación de email');
      handledSpecialLink = true;
      setVerifyCode(oobCode);
      setPublicView("verify");

      const newUrl = window.location.origin + '/'; // O la ruta base
      window.history.replaceState({}, document.title, newUrl);
    }

    if (!isAuthenticated && !handledSpecialLink) {
      const postLogoutView = sessionStorage.getItem("barbershop_post_logout_view");
      if (postLogoutView === "login") setPublicView("login");
      if (postLogoutView === "landing") setPublicView("landing");
      if (postLogoutView === "login" || postLogoutView === "landing") {
        sessionStorage.removeItem("barbershop_post_logout_view");
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    const validatePasswordPolicy = async () => {
      if (!isAuthenticated) {
        if (isMounted) {
          setPasswordPolicyReason(null);
          setPasswordPolicyChecked(true);
        }
        return;
      }

      setPasswordPolicyChecked(false);
      const firebaseUser = firebaseAuthService.getCurrentUser();
      const state = await checkPasswordPolicy(firebaseUser);
      if (!isMounted) return;

      if (state === 'FIRST_LOGIN') setPasswordPolicyReason('first_login');
      else if (state === 'EXPIRED') setPasswordPolicyReason('expired');
      else setPasswordPolicyReason(null);
      setPasswordPolicyChecked(true);
    };

    validatePasswordPolicy();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  if (isAuthenticated && !passwordPolicyChecked) {
    return null;
  }

  if (isAuthenticated && passwordPolicyReason) {
    return (
      <ForzarCambioPassword
        reason={passwordPolicyReason}
        onComplete={() => {
          setPasswordPolicyReason(null);
          setPasswordPolicyChecked(true);
        }}
        onCancelLogout={() => {
          logout();
        }}
      />
    );
  }

  if (!isAuthenticated) {
    if (publicView === "verify") {
      return (
        <EmailVerificationPage 
          oobCode={verifyCode}
          onVerificationComplete={() => {
            setVerifyCode('');
            setPublicView('login');
          }}
          onBackToLogin={() => {
            setVerifyCode('');
            setPublicView('login');
          }}
        />
      );
    }
    if (publicView === "login") {
      return (
        <LoginPage
          onRequestRegister={() => setPublicView("register")}
          onBackToLanding={() => setPublicView("landing")}
          initialResetData={resetData}
          onResetComplete={() => setResetData(null)}
        />
      );
    }

    if (publicView === "register") {
      return <RegisterPage onBack={() => setPublicView("login")} />;
    }

    return (
      <LandingPage
        onRequestLogin={() => setPublicView("login")}
        onRequestRegister={() => setPublicView("register")}
        onSelectReservation={(item) => {
          setInitialReservation(item);
          setPublicView("dashboard");
        }}
      />
    );
  }

  if (isAdmin()) {
    if (publicView === "landing") {
      return (
        <LandingPage
          onRequestLogin={() => setPublicView("login")}
          onRequestRegister={() => setPublicView("register")}
          onRequestDashboard={() => setPublicView("dashboard")}
          onSelectReservation={(item) => {
            setInitialReservation(item);
            setPublicView("dashboard");
          }}
        />
      );
    }
    return (
      <Dashboard
        onBackToLanding={() => setPublicView("landing")}
      />
    );
  }

  if (isCliente()) {
    if (publicView === "landing") {
      return (
        <LandingPage
          onRequestLogin={() => setPublicView("login")}
          onRequestRegister={() => setPublicView("register")}
          onRequestDashboard={() => setPublicView("dashboard")}
          onSelectReservation={(item) => {
            setInitialReservation(item);
            setPublicView("dashboard");
          }}
        />
      );
    }
    return (
      <ClienteDashboard 
        onBackToLanding={() => {
          setInitialReservation(null);
          setPublicView("landing");
        }} 
        initialItem={initialReservation}
      />
    );
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertProvider>
          <>
            <AppContent />
            <GlobalAlertContainer />
            <Toaster
              position="bottom-right"
              theme="dark"
              duration={8000}
              closeButton
              visibleToasts={6}
              expand
              gap={10}
              toastOptions={{
                classNames: {
                  toast: "elegante-card !bg-gray-darkest !border-2 !border-gray-dark !text-white-primary !shadow-lg !rounded-xl !pr-10",
                  title: "!text-white-primary !font-semibold !text-base",
                  description: "!text-gray-lightest !text-sm !leading-relaxed",
                  closeButton: "!bg-transparent !border-0 !text-gray-lighter hover:!text-white-primary hover:!bg-gray-darker !rounded-lg"
                },
                style: {
                  fontSize: '0.95rem',
                  lineHeight: '1.4',
                  zIndex: 100000,
                  pointerEvents: 'auto'
                },
              }}
            />
          </>
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
