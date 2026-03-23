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
      <div className={`p-4 bg-white/5 backdrop-blur-md rounded-xl border transition-all duration-300 group ${
        isVerified 
          ? 'border-green-500/40 bg-green-500/5' 
          : isFailed 
            ? 'border-red-500/40 bg-red-500/5' 
            : 'border-white/10 hover:border-[#d8b081]/40 hover:bg-white/[0.07]'
      }`}>
        <div className="flex items-center gap-4">
          {/* Checkbox */}
          <div 
            className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-500 flex items-center justify-center ${
              isVerified
                ? 'bg-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : isFailed
                  ? 'bg-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : isVerifying || isChecked
                    ? 'bg-[#d8b081] border-[#d8b081] shadow-[0_0_20px_rgba(216,176,129,0.4)]'
                    : 'bg-black/20 border-white/20 group-hover:border-[#d8b081]/60'
            } ${(isVerifying || isVerified) ? 'cursor-default' : 'cursor-pointer'}`}
            onClick={handleCheckboxClick}
          >
            {isVerifying ? (
              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isVerified ? (
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            ) : isFailed ? (
              <AlertTriangle className="w-4 h-4 text-white" />
            ) : null}
          </div>

          {/* Texto */}
          <div className="flex-1">
            <p className={`text-sm font-medium tracking-wide transition-colors duration-300 ${
              isVerified 
                ? 'text-green-400' 
                : isFailed 
                  ? 'text-red-400'
                  : 'text-gray-300 group-hover:text-white'
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
              className="p-2 h-auto bg-white/5 hover:bg-white/10 rounded-lg border border-red-500/30 transition-all"
              title="Intentar de nuevo"
            >
              <RefreshCw className="w-4 h-4 text-red-400" />
            </Button>
          )}

          {/* Badge decorativo */}
          {!isVerified && !isFailed && !isVerifying && (
            <div className="opacity-20 hidden sm:block">
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
