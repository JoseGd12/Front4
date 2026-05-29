import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { AlertCircle, Phone, CreditCard, User, ArrowRight } from "lucide-react";

const CAMPOS_INFO: Record<string, { label: string; descripcion: string; icono: React.ReactNode }> = {
  telefono: {
    label: "Número de celular",
    descripcion: "Necesario para confirmar y recordarte tu cita.",
    icono: <Phone className="w-4 h-4 text-orange-primary" />,
  },
  documento: {
    label: "Número de documento",
    descripcion: "Requerido para procesar compras y generar tu comprobante.",
    icono: <CreditCard className="w-4 h-4 text-orange-primary" />,
  },
};

interface PerfilIncompletoModalProps {
  open: boolean;
  onClose: () => void;
  onGoToPerfil: () => void;
  camposFaltantes: string[];
}

export function PerfilIncompletoModal({ open, onClose, onGoToPerfil, camposFaltantes }: PerfilIncompletoModalProps) {
  if (camposFaltantes.length === 0) return null;

  const handleGoToPerfil = () => {
    onClose();
    onGoToPerfil();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-darkest border-gray-dark max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-orange-primary/10 border border-orange-primary/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-orange-primary" />
            </div>
            <DialogTitle className="text-white-primary">Completa tu perfil</DialogTitle>
          </div>
          <p className="text-gray-lighter text-sm leading-relaxed">
            Para crear citas o realizar compras, necesitas completar los siguientes datos:
          </p>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {camposFaltantes.map((campo) => {
            const info = CAMPOS_INFO[campo];
            if (!info) return null;
            return (
              <div
                key={campo}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-darker border border-orange-primary/20"
              >
                <div className="shrink-0">{info.icono}</div>
                <div>
                  <p className="text-white-primary text-sm font-medium">{info.label}</p>
                  <p className="text-gray-lighter text-xs">{info.descripcion}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={handleGoToPerfil}
            className="elegante-button-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            <User className="w-4 h-4" />
            Completar mi perfil
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="elegante-button-secondary w-full text-sm"
          >
            Continuar sin completar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
