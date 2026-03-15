import React, { useState } from 'react';
import { auth } from '../../../shared/services/firebase'; // Ruta al config de tu app firebase
import { updatePassword } from 'firebase/auth'; // Paquete de Firebase Client Auth
import { apiService } from '../../../shared/services/api'; // Tu servicio de subida Axios/Fetch
import { useCustomAlert } from '../../../shared/components/ui/custom-alert';

interface ForzarCambioPasswordProps {
    reason: 'first_login' | 'expired' | null;
    onComplete: () => void;
    onCancelLogout: () => void;
}

export const ForzarCambioPassword = ({ reason, onComplete, onCancelLogout }: ForzarCambioPasswordProps) => {
    const { success } = useCustomAlert();
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const esTemporal = reason === 'first_login';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPwd.length < 8) {
            setError('Tu nueva contraseña debe tener mínimo 8 caracteres');
            return;
        }

        if (newPwd !== confirmPwd) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Sesión no detectada.");

            // 1. Firebase - Cambiar la contraseña físicamente
            await updatePassword(user, newPwd);

            // 2. Nuestro Backend - Avisar para que remueva "requiresPasswordChange: true" y ponga fecha=HOY
            await apiService.confirmPasswordChange();

            // 3. ACTUALIZAR ESTADO LOCAL: Le forzamos a Firebase Auth a decodear 
            // y actualizar todos los Claims que el Backend acaba de grabar.
            await user.getIdToken(true);

            // ¡Triunfo absoluto!
            success("Contraseña actualizada", "Tu contraseña se actualizó correctamente.");
            onComplete(); // Regresamos al flujo normal

        } catch (err: any) {
            console.error("Fallo al actualizar contraseña", err);

            // CASO CLÁSICO FIREBASE: Un updatePassword requiere siempre un "re-login" reciente 
            // Si llevan horas o días logueados, Firebase te suelta un `requires-recent-login`
            if (err.code === 'auth/requires-recent-login') {
                setError('Por estrictas políticas de seguridad, para modificar su contraseña debes cerrar sesión e iniciarla nuevamente. Luego podrás poner tu nueva clave.');
            } else {
                setError('No se pudo actualizar la contraseña. Contacta soporte.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-darkest p-4 pb-20">
            <form onSubmit={handleSubmit} className="elegante-card w-full max-w-md p-8 space-y-6 text-center shadow-lg border border-gray-dark/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white-primary mb-2">Cambio de Contraseña Obligatorio</h2>

                <p className="text-gray-light text-sm mb-6 pb-4 border-b border-gray-dark">
                    {esTemporal
                        ? 'Estás ingresando con una contraseña temporal de primer uso. Por políticas de seguridad, debes crear tu propia contraseña antes de continuar.'
                        : 'Tu contraseña tiene más de 90 días de antigüedad y ha expirado. Ingresa una nueva para continuar usando el sistema.'}
                </p>

                <div className="space-y-4 text-left">
                    <div>
                        <label className="text-white-primary block text-sm mb-1 ml-1 font-medium">Nueva Contraseña</label>
                        <input
                            type="password"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            className="bg-gray-darker border border-gray-dark text-white-primary px-4 py-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-primary/50"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>
                    <div>
                        <label className="text-white-primary block text-sm mb-1 ml-1 font-medium">Confirmar Contraseña</label>
                        <input
                            type="password"
                            value={confirmPwd}
                            onChange={(e) => setConfirmPwd(e.target.value)}
                            className="bg-gray-darker border border-gray-dark text-white-primary px-4 py-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-primary/50"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>
                </div>

                {error && <div className="text-red-400 text-sm font-semibold p-3 mt-4 bg-red-900/20 border border-red-500/20 rounded-xl">{error}</div>}

                <div className="flex flex-col gap-3 mt-6 pt-2">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-gradient-to-r from-orange-primary to-orange-dark text-white-primary font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-all shadow-md w-full disabled:opacity-50"
                    >
                        {isSaving ? 'Actualizando...' : 'Guardar y Entrar'}
                    </button>

                    <button
                        type="button"
                        onClick={onCancelLogout}
                        className="text-gray-lighter font-medium text-sm py-2 hover:text-white-primary hover:underline"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </form>
        </div>
    );
};
