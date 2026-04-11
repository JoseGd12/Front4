import { useRef, useState, useCallback } from 'react';
import type { GalleryItem } from './InstagramPostModal';

interface Props {
  item: GalleryItem;
  className?: string;
  style?: React.CSSProperties;
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Celda de galería con:
 * - Imagen de fondo (thumbnail)
 * - Overlay oscuro al hover
 * - Preview de video al hacer hover (si es VIDEO con videoUrl)
 */
export const GalleryCell = ({ item, className, style, onMouseDown, onClick }: Props) => {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = item.media_type === 'VIDEO' && !!item.videoUrl;

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [isVideo]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isVideo]);

  return (
    <div
      className={className}
      style={{ ...style, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail (siempre visible) */}
      <img
        src={item.url}
        alt={item.caption || ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.7s ease',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
          display: 'block',
        }}
        loading="lazy"
        draggable={false}
      />

      {/* Video preview al hover (solo para videos) */}
      {isVideo && (
        <video
          ref={videoRef}
          src={item.videoUrl}
          muted
          playsInline
          loop
          preload="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Overlay oscuro al hover */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: hovered ? 'rgba(0,0,0,0.35)' : 'transparent',
          transition: 'background-color 0.3s ease',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
