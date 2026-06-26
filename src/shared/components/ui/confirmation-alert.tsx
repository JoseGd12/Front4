import { useState, useEffect } from "react";
import { AlertTriangle, X, Trash2, Edit, CheckCircle } from "lucide-react";
import { Input } from "./input";
import { Label } from "./label";

export type ConfirmationType = 'delete' | 'edit';

interface ConfirmationAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmText?: string) => void;
  type: ConfirmationType;
  title: string;
  message: string;
  itemName?: string;
  requireInput?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const confirmationIcons = {
  delete: Trash2,
  edit: Edit,
};

const confirmationStyles = {
  delete: {
    iconColor: "text-red-400",
    borderColor: "border-red-400",
    bgColor: "bg-red-400/10",
    buttonColor: "bg-red-600 hover:bg-red-700 text-white font-semibold"
  },
  edit: {
    iconColor: "text-orange-primary",
    borderColor: "border-orange-primary",
    bgColor: "bg-orange-primary/10",
    buttonColor: "bg-orange-primary hover:bg-orange-secondary text-black-primary font-semibold"
  }
};

export function ConfirmationAlert({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  itemName,
  requireInput = false,
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar"
}: ConfirmationAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setConfirmText("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (requireInput && itemName) {
      setIsConfirmDisabled(confirmText.trim() !== itemName);
    } else {
      setIsConfirmDisabled(false);
    }
  }, [confirmText, itemName, requireInput]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      setConfirmText("");
    }, 200);
  };

  const handleConfirm = () => {
    if (requireInput && isConfirmDisabled) return;
    
    setIsVisible(false);
    setTimeout(() => {
      onConfirm(requireInput ? confirmText : undefined);
      onClose();
      setConfirmText("");
    }, 200);
  };

  if (!isOpen) return null;

  const Icon = confirmationIcons[type];
  const styles = confirmationStyles[type];

  return (
    <div 
      className={`fixed inset-0 z-confirmation flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'bg-black-primary/80 backdrop-blur-sm' : 'bg-black-primary/0'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      style={{ pointerEvents: 'all' }}
    >
      <div 
        className={`relative max-w-md w-full transition-all duration-200 transform ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`elegante-card ${styles.bgColor} border-2 ${styles.borderColor} relative`}>
          {/* Botón de cerrar */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-darker transition-colors"
          >
            <X className="w-4 h-4 text-gray-lighter" />
          </button>

          {/* Contenido */}
          <div className="pr-8">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={`w-6 h-6 ${styles.iconColor}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white-primary font-semibold text-base mb-2">
                  {title}
                </h3>
                <p className="text-gray-lightest text-sm leading-relaxed mb-4">
                  {message}
                </p>

                {/* Input de confirmación si es requerido */}
                {requireInput && itemName && (
                  <div className="space-y-2 mb-4">
                    <Label className="text-white-primary text-sm">
                      Para confirmar, escribe: <span className="font-semibold text-orange-primary">{itemName}</span>
                    </Label>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={`Escribe "${itemName}" para confirmar`}
                      className="elegante-input"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={handleClose}
                className="elegante-button-secondary px-4 py-2 text-sm"
              >
                {cancelButtonText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
                className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  type === 'delete' 
                    ? isConfirmDisabled 
                      ? 'bg-red-600/50 text-gray-400 cursor-not-allowed' 
                      : styles.buttonColor
                    : isConfirmDisabled 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : styles.buttonColor + ' border-none'
                }`}
              >
                {confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para manejar alertas de confirmación
export function useConfirmationAlert() {
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    type: ConfirmationType;
    title: string;
    message: string;
    itemName?: string;
    requireInput?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
    onConfirm: (confirmText?: string) => void;
    onCancel: () => void;
  } | null>(null);

  const showConfirmation = (
    type: ConfirmationType,
    title: string,
    message: string,
    onConfirm: (confirmText?: string) => void,
    options?: {
      itemName?: string;
      requireInput?: boolean;
      confirmButtonText?: string;
      cancelButtonText?: string;
      onCancel?: () => void;
    }
  ) => {
    setConfirmation({
      isOpen: true,
      type,
      title,
      message,
      itemName: options?.itemName,
      requireInput: options?.requireInput ?? false,
      confirmButtonText: options?.confirmButtonText,
      cancelButtonText: options?.cancelButtonText,
      onConfirm,
      onCancel: options?.onCancel || (() => {})
    });
  };

  const closeConfirmation = () => {
    if (confirmation?.onCancel) {
      confirmation.onCancel();
    }
    setConfirmation(null);
  };

  const handleConfirm = (confirmText?: string) => {
    if (confirmation?.onConfirm) {
      confirmation.onConfirm(confirmText);
    }
    setConfirmation(null);
  };

  const confirmDelete = (
    itemName: string,
    onConfirm: () => void,
    options?: {
      title?: string;
      message?: string;
      requireInput?: boolean;
      confirmButtonText?: string;
      cancelButtonText?: string;
      onCancel?: () => void;
    }
  ) => {
    showConfirmation(
      'delete',
      options?.title || 'Confirmar eliminación',
      options?.message || `¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`,
      () => onConfirm(),
      {
        itemName,
        requireInput: options?.requireInput ?? true,
        confirmButtonText: options?.confirmButtonText || 'Eliminar',
        cancelButtonText: options?.cancelButtonText || 'Cancelar',
        onCancel: options?.onCancel
      }
    );
  };

  const confirmEdit = (
    itemName: string,
    onConfirm: () => void,
    options?: {
      title?: string;
      message?: string;
      onCancel?: () => void;
    }
  ) => {
    showConfirmation(
      'edit',
      options?.title || 'Confirmar edición',
      options?.message || `¿Estás seguro de que deseas editar "${itemName}"?`,
      () => onConfirm(),
      {
        itemName,
        requireInput: false,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        onCancel: options?.onCancel
      }
    );
  };

  const confirmationContainer = confirmation ? (
    <ConfirmationAlert
      isOpen={confirmation.isOpen}
      onClose={closeConfirmation}
      onConfirm={handleConfirm}
      type={confirmation.type}
      title={confirmation.title}
      message={confirmation.message}
      itemName={confirmation.itemName}
      requireInput={confirmation.requireInput}
      confirmButtonText={confirmation.confirmButtonText}
      cancelButtonText={confirmation.cancelButtonText}
    />
  ) : null;

  return {
    confirmDelete,
    confirmEdit,
    ConfirmationContainer: confirmationContainer,
  };
}
