import { useState, useEffect } from 'react';

export interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  caption?: string;
}

export const useInstagramFeed = (limit = 12) => {
  const [feed, setFeed] = useState<InstagramMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstagram = async () => {
      try {
        setLoading(true);
        // Para que esto funcione, necesitas generar un Instagram Basic Display API Token 
        // y guardarlo en tu archivo .env como VITE_INSTAGRAM_TOKEN
        const token = import.meta.env.VITE_INSTAGRAM_TOKEN; 

        if (!token) {
          throw new Error('No VITE_INSTAGRAM_TOKEN. Fallback a imágenes locales.');
        }

        const response = await fetch(
          `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=${limit}&access_token=${token}`
        );

        if (!response.ok) {
          throw new Error('Error al obtener el feed de Instagram Graph API');
        }

        const data = await response.json();
        
        // Mapear los datos a formato usable, priorizando el thumbnail para videos
        const mediaList: InstagramMedia[] = data.data.map((item: any) => ({
          ...item,
          media_url: item.media_type === 'VIDEO' && item.thumbnail_url 
             ? item.thumbnail_url 
             : item.media_url,
        }));

        setFeed(mediaList);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInstagram();
  }, [limit]);

  return { feed, loading, error };
};
