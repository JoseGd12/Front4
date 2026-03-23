import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/button';

interface SimpleCaptchaProps {
  onValidate: (isValid: boolean) => void;
  className?: string;
}

export function SimpleCaptcha({ onValidate, className = '' }: SimpleCaptchaProps) {
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isFailed, setIsFailed] = useState<boolean>(false);

  // Simular proceso de verificación simple
  const performVerification = async () => {
    setIsVerifying(true);
    setIsFailed(false);
    
    // Simular verificación (1-2 segundos)
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
    
    // 95% probabilidad de éxito
    const isSuccess = Math.random() > 0.05;
    
    if (isSuccess) {
      setIsVerified(true);
      setIsFailed(false);
      onValidate(true);
    } else {
      setIsFailed(true);
      setIsVerified(false);
      setIsChecked(false);
      onValidate(false);
    }
    
    setIsVerifying(false);
  };

  // Manejar clic en checkbox
  const handleCheckboxClick = () => {
    if (isVerified || isVerifying) return;
    
    setIsChecked(true);
    performVerification();
  };

  // Resetear captcha
  const resetCaptcha = () => {
    setIsChecked(false);
    setIsVerifying(false);
    setIsVerified(false);
    setIsFailed(false);
    onValidate(false);
  };

  return (
    <div className={`${className}`}>
      <div className={`p-3 bg-gray-darker/40 border border-white/5 rounded-lg transition-all duration-300 group ${
        isVerified 
          ? 'border-green-500/20 bg-green-500/5' 
          : isFailed 
            ? 'border-red-500/20 bg-red-500/5' 
            : 'hover:bg-gray-darker/60'
      }`}>
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <div 
            className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
              isVerified
                ? 'bg-green-600 border-green-600'
                : isFailed
                  ? 'bg-red-600 border-red-600'
                  : isVerifying || isChecked
                    ? 'bg-orange-primary border-orange-primary'
                    : 'bg-transparent border-gray-600 group-hover:border-gray-500'
            } ${(isVerifying || isVerified) ? 'cursor-default' : 'cursor-pointer'}`}
            onClick={handleCheckboxClick}
          >
            {isVerifying ? (
              <div className="w-3 h-3 border-2 border-white-primary border-t-transparent rounded-full animate-spin" />
            ) : isVerified ? (
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            ) : isFailed ? (
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            ) : null}
          </div>

          {/* Texto */}
          <div className="flex-1">
            <p className={`text-sm font-medium transition-colors duration-300 ${
              isVerified 
                ? 'text-green-400' 
                : isFailed 
                  ? 'text-red-400'
                  : 'text-white-primary'
            }`}>
              {isVerifying 
                ? 'Verificando...' 
                : isVerified 
                  ? 'Verificación completada'
                  : isFailed
                    ? 'Verificación falló, intenta de nuevo'
                    : 'No soy un robot'
              }
            </p>
          </div>

          {/* Botón de reset solo si falló */}
          {isFailed && (
            <Button
              type="button"
              onClick={resetCaptcha}
              className="p-1.5 h-auto bg-white/5 hover:bg-white/10 rounded-md border border-red-500/20 transition-all"
              title="Intentar de nuevo"
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-400" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
