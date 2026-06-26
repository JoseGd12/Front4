  import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./shared/contexts/AuthContext";
import { AlertProvider, GlobalAlertContainer } from "./shared/components/ui/custom-alert";
import { Dashboard } from "./features/dashboard/components/Dashboard";
import { ClienteDashboard } from "./features/clientes/pages/ClienteDashboard";
import { LandingPage } from "./features/dashboard/pages/LandingPage";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { RegisterPage } from "./features/auth/pages/RegisterPage";
import { AuthActionPage } from "./features/auth/pages/AuthActionPage";
import { ForzarCambioPassword } from "./features/auth/components/ForzarCambioPassword";
import { checkPasswordPolicy } from "./features/auth/services/authUtils";
import { firebaseAuthService } from "./shared/services/firebase";
import { logger } from "./shared/utils/logger";

import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

function AppContent() {
  const { isAuthenticated, isAdmin, isCliente, isBarbero, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);

  const [passwordPolicyReason, setPasswordPolicyReason] = useState<'first_login' | 'expired' | null>(null);
  const [passwordPolicyChecked, setPasswordPolicyChecked] = useState(false);

  const [resetData, setResetData] = useState<{ email: string; token: string } | null>(null);
  const [initialReservation, setInitialReservation] = useState<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');
    const isAuthActionPage = window.location.pathname.includes('auth/action');
    let handledSpecialLink = false;

    if ((mode === 'verifyEmail' && oobCode) || (mode === 'resetPassword' && oobCode)) {
      logger.debug('🔐 Detectado acción de Firebase:', mode);
      handledSpecialLink = true;
      if (!isAuthActionPage) {
        navigate(`/auth/action?mode=${mode}&oobCode=${oobCode}`, { replace: true });
      }
    }

    if (!isAuthenticated && !handledSpecialLink) {
      const postLogoutView = sessionStorage.getItem("barbershop_post_logout_view");
      if (postLogoutView === "login") navigate('/login');
      if (postLogoutView === "landing") navigate('/');
      if (postLogoutView === "login" || postLogoutView === "landing") {
        sessionStorage.removeItem("barbershop_post_logout_view");
      }
    }
  }, [isAuthenticated, navigate, location.pathname]);

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

  // Mientras Firebase resuelve el estado de auth no renderizar rutas
  // (evita el flash de redirect a login cuando el usuario recarga estando autenticado)
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--orange-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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

      <Route path="/auth/action" element={<AuthActionPage />} />
      
      {/* Mantener rutas antiguas por compatibilidad */}
      <Route path="/verify-email" element={<Navigate to="/auth/action" replace />} />
      <Route path="/reset-password" element={<Navigate to="/auth/action" replace />} />

      <Route path="/dashboard/*" element={
        isAuthenticated ? (
          (isAdmin() || isBarbero()) ? (
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
        </>
      </AlertProvider>
    </AuthProvider>
  );
}
