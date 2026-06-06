import React, { useEffect, useRef, useState } from 'react';
import { httpClient } from '../../../../shared/services/httpClient';

/**
 * FE-A3: Captcha real con verificación server-side (Cloudflare Turnstile).
 *
 * Reemplaza a SimpleCaptcha (que era 100% cliente y falsificable). El flujo es:
 *  1. El widget de Turnstile genera un token en el navegador.
 *  2. El token se envía al backend (POST /auth/verify-captcha).
 *  3. El backend lo valida contra Cloudflare con la secret key.
 *  4. Solo si el backend confirma, se considera el captcha superado.
 *
 * Configuración:
 *  - Frontend: VITE_TURNSTILE_SITE_KEY (site key pública de Turnstile).
 *  - Backend:  Turnstile:SecretKey (en User Secrets / variables de entorno).
 *
 * Si la site key no está configurada, el componente se muestra en modo
 * "no configurado" y delega la decisión al backend (que en ese caso responde
 * success=true para no bloquear el desarrollo).
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

interface TurnstileCaptchaProps {
  onValidate: (isValid: boolean) => void;
  className?: string;
}

async function verifyTokenServerSide(token: string): Promise<boolean> {
  try {
    const res: any = await httpClient.post('/auth/verify-captcha', { token });
    return !!(res?.success ?? res?.Success);
  } catch {
    return false;
  }
}

function ensureTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).turnstile) return resolve();
    const existing = document.querySelector(`script[src^="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export function TurnstileCaptcha({ onValidate, className = '' }: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) {
      // Sin site key: el widget no se puede renderizar. El backend decide.
      setError('Captcha no configurado (define VITE_TURNSTILE_SITE_KEY).');
      return;
    }

    let cancelled = false;

    ensureTurnstileScript().then(() => {
      const turnstile = (window as any).turnstile;
      if (cancelled || !containerRef.current || !turnstile) return;

      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: async (token: string) => {
          const ok = await verifyTokenServerSide(token);
          onValidate(ok);
          setError(ok ? null : 'Verificación fallida, intenta de nuevo.');
        },
        'error-callback': () => {
          onValidate(false);
          setError('Error del captcha, intenta de nuevo.');
        },
        'expired-callback': () => {
          onValidate(false);
        },
      });
    });

    return () => {
      cancelled = true;
      const turnstile = (window as any).turnstile;
      if (widgetIdRef.current && turnstile) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          /* noop */
        }
      }
    };
  }, [onValidate]);

  return (
    <div className={className}>
      <div ref={containerRef} />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
