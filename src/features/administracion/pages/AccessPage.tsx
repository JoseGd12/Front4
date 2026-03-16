import { useState } from "react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/components/ui/tabs";
import { Label } from "../../../shared/components/ui/label";
import { Eye, EyeOff, Lock, Mail, User, Key, Shield, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";

export function AccessPage() {
  const { success, error: showErrorAlert, AlertContainer } = useCustomAlert();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'forgot' | 'reset' | 'success'>('login');
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [forgotForm, setForgotForm] = useState({
    email: ''
  });
  
  const [resetForm, setResetForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      showErrorAlert("Campos requeridos", "Por favor completa todos los campos.");
      return;
    }
    
    setIsLoading(true);
    // Simulación de login
    setTimeout(() => {
      setIsLoading(false);
      success("Inicio de sesión exitoso", "Has iniciado sesión correctamente.");
    }, 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      showErrorAlert("Contraseñas no coinciden", "Las contraseñas no coinciden.");
      return;
    }
    if (registerForm.password.length < 8) {
      showErrorAlert("Contraseña débil", "La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    
    setIsLoading(true);
    // Simulación de registro
    setTimeout(() => {
      setIsLoading(false);
      success("Cuenta creada", "Tu cuenta ha sido creada exitosamente.");
      setCurrentView('login');
    }, 2000);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotForm.email) {
      showErrorAlert("Email requerido", "Por favor ingresa tu email.");
      return;
    }
    
    setIsLoading(true);
    // Simulación de envío de código
    setTimeout(() => {
      setIsLoading(false);
      success("Código enviado", "El código de verificación ha sido enviado a tu email.");
      setCurrentView('reset');
    }, 2000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = resetCode.join('');
    if (code.length !== 6) {
      showErrorAlert("Código requerido", "Por favor ingresa el código de 6 dígitos.");
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      showErrorAlert("Contraseñas no coinciden", "Las contraseñas no coinciden.");
      return;
    }
    if (resetForm.newPassword.length < 8) {
      showErrorAlert("Contraseña débil", "La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    
    setIsLoading(true);
    // Simulación de reset
    setTimeout(() => {
      setIsLoading(false);
      setCurrentView('success');
    }, 2000);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1 && /^[0-9]*$/.test(value)) {
      const newCode = [...resetCode];
      newCode[index] = value;
      setResetCode(newCode);
      
      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !resetCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const resendCode = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      success("Nuevo código enviado", "Se ha enviado un nuevo código a tu email.");
    }, 1000);
  };

  // Render Login View
  if (currentView === 'login') {
    return (
      <>
        <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white-primary">Control de Acceso</h1>
              <p className="text-sm text-gray-lightest mt-1">Gestión de autenticación y seguridad</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="elegante-tag-orange flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Seguro
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-black-primary">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Login Card */}
              <div className="elegante-card">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-orange-primary flex items-center justify-center">
                    <Lock className="w-6 h-6 text-black-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white-primary">Iniciar Sesión</h3>
                    <p className="text-gray-lightest font-medium">Accede a tu cuenta de BarberShop</p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white-primary">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                        className="elegante-input pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white-primary">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        className="elegante-input pl-10 pr-10"
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
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded bg-gray-darker border-gray-dark" />
                      <span className="text-sm text-gray-lightest">Recordarme</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setCurrentView('forgot')}
                      className="text-sm text-orange-primary hover:text-orange-secondary transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="elegante-button-primary w-full flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-black-primary border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <span className="text-sm text-gray-lightest">¿No tienes cuenta? </span>
                  <button
                    onClick={() => setCurrentView('register')}
                    className="text-sm text-orange-primary hover:text-orange-secondary transition-colors"
                  >
                    Crear cuenta
                  </button>
                </div>
              </div>

              {/* Info Card */}
              <div className="elegante-card">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-medium flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white-primary">Seguridad Avanzada</h3>
                    <p className="text-gray-lightest font-medium">Tu información está protegida</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-darker">
                    <Shield className="w-5 h-5 text-orange-primary" />
                    <div>
                      <h4 className="font-semibold text-white-primary">Encriptación SSL</h4>
                      <p className="text-sm text-gray-lightest">Conexión segura 256-bit</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-darker">
                    <Key className="w-5 h-5 text-orange-primary" />
                    <div>
                      <h4 className="font-semibold text-white-primary">Autenticación Segura</h4>
                      <p className="text-sm text-gray-lightest">Verificación de identidad</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-darker">
                    <Lock className="w-5 h-5 text-orange-primary" />
                    <div>
                      <h4 className="font-semibold text-white-primary">Datos Protegidos</h4>
                      <p className="text-sm text-gray-lightest">Cumplimiento de normativas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Render Register View
  if (currentView === 'register') {
    return (
      <>
        <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('login')}
                className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-white-primary">Crear Cuenta</h1>
                <p className="text-sm text-gray-lightest mt-1">Únete a nuestro sistema</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-black-primary">
          <div className="max-w-md mx-auto">
            <div className="elegante-card">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-orange-primary flex items-center justify-center">
                  <User className="w-6 h-6 text-black-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white-primary">Nueva Cuenta</h3>
                  <p className="text-gray-lightest font-medium">Completa tus datos</p>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white-primary">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Tu nombre completo"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                      className="elegante-input pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-white-primary">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      className="elegante-input pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-white-primary">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      className="elegante-input pl-10"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-white-primary">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Repite tu contraseña"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                      className="elegante-input pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded bg-gray-darker border-gray-dark" required />
                  <span className="text-sm text-gray-lightest">
                    Acepto los términos y condiciones
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="elegante-button-primary w-full flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black-primary border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <User className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Render Forgot Password View
  if (currentView === 'forgot') {
    return (
      <>
        <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('login')}
                className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-white-primary">Recuperar Contraseña</h1>
                <p className="text-sm text-gray-lightest mt-1">Te enviaremos un código de verificación</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-black-primary">
          <div className="max-w-md mx-auto">
            <div className="elegante-card">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-orange-primary flex items-center justify-center">
                  <Mail className="w-6 h-6 text-black-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white-primary">Recuperación</h3>
                  <p className="text-gray-lightest font-medium">Ingresa tu email</p>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-white-primary">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={forgotForm.email}
                      onChange={(e) => setForgotForm({...forgotForm, email: e.target.value})}
                      className="elegante-input pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-darker border border-gray-dark">
                  <p className="text-sm text-gray-lightest">
                    Te enviaremos un código de 6 dígitos a tu email para que puedas restablecer tu contraseña.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="elegante-button-primary w-full flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black-primary border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Enviando código...' : 'Enviar Código'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Render Reset Password View
  if (currentView === 'reset') {
    return (
      <>
        <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('forgot')}
                className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-white-primary">Verificación</h1>
                <p className="text-sm text-gray-lightest mt-1">Ingresa el código y tu nueva contraseña</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-black-primary">
          <div className="max-w-md mx-auto">
            <div className="elegante-card">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-orange-primary flex items-center justify-center">
                  <Key className="w-6 h-6 text-black-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white-primary">Nueva Contraseña</h3>
                  <p className="text-gray-lightest font-medium">Código enviado a {forgotForm.email}</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white-primary">Código de Verificación</Label>
                  <div className="flex justify-between space-x-2">
                    {resetCode.map((digit, index) => (
                      <Input
                        key={index}
                        id={`code-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="elegante-input w-12 h-12 text-center text-lg font-bold"
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-lightest">¿No recibiste el código?</span>
                    <button
                      type="button"
                      onClick={resendCode}
                      disabled={isLoading}
                      className="text-sm text-orange-primary hover:text-orange-secondary transition-colors flex items-center"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reenviar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-white-primary">Nueva Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={resetForm.newPassword}
                      onChange={(e) => setResetForm({...resetForm, newPassword: e.target.value})}
                      className="elegante-input pl-10"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-white-primary">Confirmar Nueva Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Repite tu nueva contraseña"
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm({...resetForm, confirmPassword: e.target.value})}
                      className="elegante-input pl-10"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="elegante-button-primary w-full flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black-primary border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Render Success View
  if (currentView === 'success') {
    return (
      <>
        <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white-primary">Contraseña Restablecida</h1>
              <p className="text-sm text-gray-lightest mt-1">Tu contraseña ha sido actualizada exitosamente</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-black-primary">
          <div className="max-w-md mx-auto">
            <div className="elegante-card text-center">
              <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-white-primary mb-2">¡Listo!</h3>
              <p className="text-gray-lightest mb-6">
                Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>

              <button
                onClick={() => {
                  setCurrentView('login');
                  setResetCode(['', '', '', '', '', '']);
                  setResetForm({ newPassword: '', confirmPassword: '' });
                  setForgotForm({ email: '' });
                  success("Contraseña actualizada", "Ahora puedes iniciar sesión con tu nueva contraseña.");
                }}
                className="elegante-button-primary w-full flex items-center justify-center"
              >
                <Key className="w-4 h-4 mr-2" />
                Ir al Login
              </button>
            </div>
          </div>
        </main>
      <AlertContainer />
      </>
    );
  }

  return null;
}
