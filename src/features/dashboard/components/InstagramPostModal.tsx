import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Instagram, ExternalLink, Image, Play, Images, ChevronLeft, ChevronRight } from 'lucide-react';

export interface GalleryItem {
  url: string;
  caption?: string;
  permalink?: string;
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  id?: string;
  videoUrl?: string;
}

interface Props {
  item: GalleryItem | null;
  allItems: GalleryItem[];
  onClose: () => void;
  onSelect: (item: GalleryItem) => void;
}

export const InstagramPostModal = ({ item, allItems, onClose, onSelect }: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Encontrar el índice actual
  const currentIndex = item ? allItems.findIndex(g => g.id === item.id && g.url === item.url) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allItems.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onSelect(allItems[currentIndex - 1]);
  }, [hasPrev, allItems, currentIndex, onSelect]);

  const goNext = useCallback(() => {
    if (hasNext) onSelect(allItems[currentIndex + 1]);
  }, [hasNext, allItems, currentIndex, onSelect]);

  // Cerrar con Escape, navegar con flechas
  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [item, onClose, goPrev, goNext]);

  // Bloquear scroll del body
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [item]);

  if (!item) return null;

  const isVideo = item.media_type === 'VIDEO';
  const isCarousel = item.media_type === 'CAROUSEL_ALBUM';
  const isInstagram = !!item.permalink;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Estilo compartido para botones de navegación (estilo Instagram)
  const navBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#262626',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'background-color 0.15s, transform 0.15s',
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 99999,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Vista de publicación"
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          zIndex: 100000,
        }}
        aria-label="Cerrar"
      >
        <X style={{ width: '24px', height: '24px' }} />
      </button>

      {/* ─── Flecha anterior (fuera del modal, sobre el overlay) ─── */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          style={{ ...navBtnStyle, left: '12px' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.85)'; }}
          aria-label="Publicación anterior"
        >
          <ChevronLeft style={{ width: '20px', height: '20px' }} />
        </button>
      )}

      {/* ─── Flecha siguiente (fuera del modal, sobre el overlay) ─── */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          style={{ ...navBtnStyle, right: '12px' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.85)'; }}
          aria-label="Publicación siguiente"
        >
          <ChevronRight style={{ width: '20px', height: '20px' }} />
        </button>
      )}

      {/* ─── Modal split-column ─── */}
      <div
        style={{
          display: 'flex',
          maxWidth: '1150px',
          height: 'calc(100vh - 80px)',
          maxHeight: '820px',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        {/* ─── Columna izquierda: Media (se adapta al aspect ratio) ─── */}
        <div
          style={{
            flexShrink: 0,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isVideo && item.videoUrl ? (
            <video
              key={item.videoUrl}
              src={item.videoUrl}
              controls
              autoPlay
              muted
              playsInline
              style={{ height: '100%', maxWidth: '650px', display: 'block' }}
            />
          ) : (
            <img
              src={item.url}
              alt={item.caption || 'Publicación de galería'}
              style={{ height: '100%', maxWidth: '650px', objectFit: 'contain', display: 'block' }}
              draggable={false}
            />
          )}

          {/* Badge solo para álbumes */}
          {isCarousel && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <Images style={{ width: '14px', height: '14px' }} />
              Álbum
            </div>
          )}

          {/* Contador de posición */}
          {allItems.length > 1 && currentIndex >= 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 12px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {currentIndex + 1} / {allItems.length}
            </div>
          )}
        </div>

        {/* ─── Columna derecha: Información ─── */}
        <div
          style={{
            width: '500px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#000',
            borderLeft: '1px solid #262626',
          }}
        >
          {/* Header con perfil */}
          {isInstagram && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0 16px',
                height: '60px',
                borderBottom: '1px solid #262626',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  padding: '2px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundColor: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Instagram style={{ width: '14px', height: '14px', color: '#fff' }} />
                </div>
              </div>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                edwin.s_barberia
              </span>
            </div>
          )}

          {/* Caption */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#333 transparent',
            }}
          >
            {item.caption ? (
              <div>
                {isInstagram && (
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginRight: '6px' }}>
                    edwin.s_barberia
                  </span>
                )}
                <span
                  style={{
                    color: '#e0e0e0',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {item.caption}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '12px',
                  color: '#555',
                }}
              >
                <Image style={{ width: '40px', height: '40px' }} />
                <span style={{ fontSize: '14px' }}>
                  {isInstagram ? 'Publicación sin descripción' : 'Imagen de galería'}
                </span>
              </div>
            )}
          </div>

          {/* Footer con enlace a Instagram */}
          {isInstagram && item.permalink && (
            <div
              style={{
                flexShrink: 0,
                padding: '12px 16px',
                borderTop: '1px solid #262626',
              }}
            >
              <a
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 0',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#fff',
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.opacity = '1';
                }}
              >
                <ExternalLink style={{ width: '16px', height: '16px' }} />
                Ver en Instagram
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
