import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'your_service_id';
const TEMPLATE_ID_CANCEL = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_CANCELACION || 'your_template_id';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key';

interface CancelacionParams {
  cliente_nombre: string;
  cliente_email: string;
  barbero_nombre: string;
  fecha_original: string;
  motivo_cancelacion: string;
  sugerencias_reprogramacion?: string[];
  app_name?: string;
}

export const emailJsService = {
  /**
   * Envía un correo de notificación de cancelación a un cliente.
   */
  async notificarCancelacion(params: CancelacionParams): Promise<boolean> {
    try {
      if (SERVICE_ID === 'your_service_id' || !PUBLIC_KEY) {
        console.warn('⚠️ EmailJS no está configurado. El correo no se enviará realmente.');
        return false;
      }

      const templateParams = {
        to_name: params.cliente_nombre,
        to_email: params.cliente_email,
        barbero_name: params.barbero_nombre,
        fecha_hora: params.fecha_original,
        motivo: params.motivo_cancelacion,
        sugerencias: params.sugerencias_reprogramacion?.join(', ') || 'No disponibles',
        app_name: params.app_name || import.meta.env.VITE_APP_NAME || 'Barbería App'
      };

      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID_CANCEL,
        templateParams,
        PUBLIC_KEY
      );

      console.log('✅ Email enviado exitosamente vía EmailJS:', response.status, response.text);
      return true;
    } catch (error) {
      console.error('❌ Error al enviar email vía EmailJS:', error);
      return false;
    }
  }
};
