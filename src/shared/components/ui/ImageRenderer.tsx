import React, { useState, useMemo } from 'react';
import { Package, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from "./utils";

interface ImageRendererProps {
    url?: string | null;
    alt?: string;
    className?: string;
    showLabel?: boolean;
}

/**
 * Componente unificado para renderizar imágenes de productos, servicios, clientes, etc.
 * Maneja automáticamente URLs de Cloudinary, Base64, rutas locales y legacy a través del proxy.
 */
const ImageRenderer = ({ url, alt = "Imagen", className, showLabel = true }: ImageRendererProps) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Normalizar la URL de la imagen de forma inteligente
    const normalizedUrl = useMemo(() => {
        if (!url) return null;

        const trimmed = String(url).trim();
        if (!trimmed) return null;

        // 1. URLs externas (Cloudinary, Google, etc.) o Base64
        if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) {
            return trimmed;
        }

        // 2. Rutas que ya son absolutas o relativas al servidor (empiezan con / o assets/)
        if (trimmed.startsWith('/') || trimmed.startsWith('assets/')) {
            const pathWithSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            // Si el path ya incluye assets/images, lo dejamos así (con slash inicial)
            if (pathWithSlash.includes('/assets/images/')) {
                return pathWithSlash;
            }
            // Si solo incluye assets/, intentamos asegurar que sea /assets/images/ si no tiene extensiones comunes
            return pathWithSlash;
        }

        // 3. Nombres de archivo sueltos (Legacy case)
        // Asumimos que están en /assets/images/ en el servidor
        if (!trimmed.includes('/')) {
            return `/assets/images/${trimmed}`;
        }

        // 4. Default: asegurar slash inicial para el proxy de Vite
        return `/${trimmed.replace(/^\/+/, '')}`;
    }, [url]);

    const handleLoad = () => {
        setLoading(false);
        setError(false);
    };

    const handleError = () => {
        setLoading(false);
        setError(true);
        console.error('❌ Error al cargar imagen:', normalizedUrl);
    };

    // Renderizar placeholder si no hay URL o si hubo un error
    if (!normalizedUrl || error) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center bg-gray-dark/40 border border-gray-dark/30 rounded-lg overflow-hidden shrink-0 aspect-square",
                className,
                error ? "border-red-500/20" : ""
            )}>
                <div className="flex flex-col items-center gap-1.5 opacity-40">
                    {error ? (
                        <ImageIcon className="w-5 h-5 text-red-400/60" />
                    ) : (
                        <Package className="w-5 h-5 text-gray-400" />
                    )}
                    {showLabel && (
                        <>
                            {!error && <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500">Sin imagen</span>}
                            {error && <span className="text-[9px] uppercase tracking-wider font-semibold text-red-400/60">Error</span>}
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "relative overflow-hidden bg-gray-dark/20 border border-gray-dark/30 rounded-lg flex items-center justify-center shrink-0 aspect-square",
            className
        )}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-dark/40 z-10">
                    <Loader2 className="w-4 h-4 text-orange-primary/60 animate-spin" />
                </div>
            )}

            <img
                src={normalizedUrl}
                alt={alt}
                loading="lazy"
                referrerPolicy="no-referrer"
                onLoad={handleLoad}
                onError={handleError}
                className={cn(
                    "w-full h-full object-cover transition-all duration-300",
                    loading ? "opacity-0 scale-95" : "opacity-100 scale-100"
                )}
            />
        </div>
    );
};

export default React.memo(ImageRenderer);
