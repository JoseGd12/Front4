  import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./shared/contexts/AuthContext";
import { Toaster } from "sonner";
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

import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

function AppContent() {
  const { isAuthenticated, isAdmin, isCliente, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [passwordPolicyReason, setPasswordPolicyReason] = useState<'first_login' | 'expired' | null>(null);
  const [passwordPolicyChecked, setPasswordPolicyChecked] = useState(false);

  const [resetData, setResetData] = useState<{ email: string; token: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [initialReservation, setInitialReservation] = useState<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');
    const isResetPage = window.location.pathname.includes('reset-password');
    const isVerifyPage = window.location.pathname.includes('verify-email');
    let handledSpecialLink = false;

    if ((mode === 'resetPassword' || (isResetPage && mode !== 'verifyEmail')) && oobCode) {
      console.log('🎯 Solución REAL: Detectado oobCode para reseteo, abriendo formulario personalizado');
      handledSpecialLink = true;
      setResetData({ email: '', token: oobCode });
      navigate('/login', { replace: true });
    } 
    else if ((mode === 'verifyEmail' || (isVerifyPage && mode !== 'resetPassword')) && oobCode) {
      console.log('📧 Detectado oobCode para verificación de email');
      handledSpecialLink = true;
      setVerifyCode(oobCode);
      navigate('/verify-email', { replace: true });
    }

    if (!isAuthenticated && !handledSpecialLink) {
      const postLogoutView = sessionStorage.getItem("barbershop_post_logout_view");
      if (postLogoutView === "login") navigate('/login');
      if (postLogoutView === "landing") navigate('/');
      if (postLogoutView === "login" || postLogoutView === "landing") {
        sessionStorage.removeItem("barbershop_post_logout_view");
      }
    }
  }, [isAuthenticated, navigate]);

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

  return (
    <Routes>
      <Route path="/" element={
        <LandingPage
          onRequestLogin={() => navigate('/login')}
          onRequestRegister={() => navigate('/register')}
          onRequestDashboard={() => navigate('/dashboard')}
          onSelectReservation={(item) => {
            setInitialReservation(item);
            navigate('/dashboard');
          }}
        />
      } />
      
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" /> : (
          <LoginPage
            onRequestRegister={() => navigate('/register')}
            onBackToLanding={() => navigate('/')}
            initialResetData={resetData}
            onResetComplete={() => setResetData(null)}
          />
        )
      } />

      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/dashboard" /> : (
          <RegisterPage onBack={() => navigate('/login')} />
        )
      } />

      <Route path="/verify-email" element={
        <EmailVerificationPage 
          oobCode={verifyCode}
          onVerificationComplete={() => {
            setVerifyCode('');
            navigate('/login');
          }}
          onBackToLogin={() => {
            setVerifyCode('');
            navigate('/login');
          }}
        />
      } />

      <Route path="/dashboard/*" element={
        isAuthenticated ? (
          isAdmin() ? (
            <Dashboard
              initialItem={initialReservation}
              onClearInitialItem={() => setInitialReservation(null)}
              onBackToLanding={() => navigate('/')}
            />
          ) : (
            isCliente() ? (
              <ClienteDashboard 
                initialItem={initialReservation}
                onBackToLanding={() => {
                  setInitialReservation(null);
                  navigate('/');
                }}
              />
            ) : (
              <Navigate to="/" />
            )
          )
        ) : (
          <Navigate to="/login" />
        )
      } />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
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
  );
}
