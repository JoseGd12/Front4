import { useState, useEffect } from 'react';

export interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  caption?: string;
  /** URL original del video (antes de normalizar a thumbnail) */
  video_url?: string;
}

const MEDIA_FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink';

function normalizeMedia(items: any[]): InstagramMedia[] {
  return items.map((item: any) => ({
    ...item,
    // Para videos: guardar la URL real del video y mostrar thumbnail en la galería
    video_url: item.media_type === 'VIDEO' ? item.media_url : undefined,
    media_url:
      item.media_type === 'VIDEO' && item.thumbnail_url
        ? item.thumbnail_url
        : item.media_url,
  }));
}

/**
 * Obtiene el feed de Instagram probando estrategias en orden:
 *
 * A) Page ID directo (VITE_FACEBOOK_PAGE_ID):
 *    /{pageId}?fields=instagram_business_account → /{igId}/media
 *    Resuelve el caso en que la página vive dentro de un Business Manager
 *    y no aparece en /me/accounts.
 *
 * B) /me/accounts → página → cuenta IG Business:
 *    Flujo estándar para páginas administradas desde el perfil personal.
 *
 * C) /me/media directo:
 *    Funciona con tokens de usuario de Instagram.
 *
 * D) /me?fields=instagram_accounts:
 *    Variante de permisos alternativa.
 */
export const useInstagramFeed = (limit = 12) => {
  const [feed, setFeed] = useState<InstagramMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstagram = async () => {
      try {
        setLoading(true);

        const token = import.meta.env.VITE_INSTAGRAM_TOKEN;
        if (!token) throw new Error('VITE_INSTAGRAM_TOKEN no configurado en .env');

        const pageIdEnv = import.meta.env.VITE_FACEBOOK_PAGE_ID;

        const BASE = import.meta.env.DEV
          ? '/instagram-api'
          : 'https://graph.facebook.com';

        const errors: string[] = [];

        const API_VER = 'v22.0';

        // ══════════════════════════════════════════════════════════════
        // ESTRATEGIA A — Page ID conocido (Business Manager)
        // Evita /me/accounts que devuelve vacío cuando la página
        // pertenece a un portafolio de Business Manager.
        // ══════════════════════════════════════════════════════════════
        if (pageIdEnv && pageIdEnv !== 'CAMBIAR_POR_ID_REAL_EN_VERCEL') {
          try {
            const pageRes = await fetch(
              `${BASE}/${API_VER}/${pageIdEnv}?fields=instagram_business_account,access_token&access_token=${token}`
            );
            const pageData = await pageRes.json();

            if (pageData.error) {
              errors.push(`Estrategia A (page): ${pageData.error.message}`);
            } else if (pageData.instagram_business_account?.id) {
              const igId = pageData.instagram_business_account.id;
              // Usar page access_token si está disponible, sino el user token
              const pageToken = pageData.access_token ?? token;

              const mediaRes = await fetch(
                `${BASE}/${API_VER}/${igId}/media?fields=${MEDIA_FIELDS}&limit=${limit}&access_token=${pageToken}`
              );
              const mediaData = await mediaRes.json();

              if (!mediaData.error && Array.isArray(mediaData.data) && mediaData.data.length > 0) {
                setFeed(normalizeMedia(mediaData.data));
                return;
              }

              errors.push(
                mediaData.error
                  ? `Estrategia A (media): ${mediaData.error.message}`
                  : 'Estrategia A: cuenta IG sin publicaciones accesibles'
              );
            } else {
              errors.push('Estrategia A: la página no tiene instagram_business_account vinculado');
            }
          } catch (e: any) {
            errors.push(`Estrategia A: ${e.message}`);
          }
        } else {
          errors.push('Estrategia A: VITE_FACEBOOK_PAGE_ID no configurado o tiene valor placeholder');
        }

        // ══════════════════════════════════════════════════════════════
        // ESTRATEGIA B — /me/accounts (páginas del perfil personal)
        // ══════════════════════════════════════════════════════════════
        try {
          const pagesRes = await fetch(
            `${BASE}/${API_VER}/me/accounts?access_token=${token}`
          );
          const pagesData = await pagesRes.json();

          if (pagesData.error) {
            errors.push(`Estrategia B (pages): ${pagesData.error.message}`);
          } else if (!pagesData.data?.length) {
            errors.push('Estrategia B: /me/accounts devolvió 0 páginas');
          } else {
            let igUserId: string | null = null;
            let pageAccessToken: string = token;

            for (const page of pagesData.data) {
              const igRes = await fetch(
                `${BASE}/${API_VER}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
              );
              const igData = await igRes.json();
              if (igData.instagram_business_account?.id) {
                igUserId = igData.instagram_business_account.id;
                pageAccessToken = page.access_token;
                break;
              }
            }

            if (!igUserId) {
              errors.push('Estrategia B: ninguna página tiene instagram_business_account');
            } else {
              const mediaRes = await fetch(
                `${BASE}/${API_VER}/${igUserId}/media?fields=${MEDIA_FIELDS}&limit=${limit}&access_token=${pageAccessToken}`
              );
              const mediaData = await mediaRes.json();

              if (!mediaData.error && Array.isArray(mediaData.data) && mediaData.data.length > 0) {
                setFeed(normalizeMedia(mediaData.data));
                return;
              }

              errors.push(
                mediaData.error
                  ? `Estrategia B (media): ${mediaData.error.message}`
                  : 'Estrategia B: cuenta IG sin publicaciones'
              );
            }
          }
        } catch (e: any) {
          errors.push(`Estrategia B: ${e.message}`);
        }

        // ══════════════════════════════════════════════════════════════
        // ESTRATEGIA C — /me/media directo
        // ══════════════════════════════════════════════════════════════
        try {
          const res = await fetch(
            `${BASE}/${API_VER}/me/media?fields=${MEDIA_FIELDS}&limit=${limit}&access_token=${token}`
          );
          const data = await res.json();

          if (!data.error && Array.isArray(data.data) && data.data.length > 0) {
            setFeed(normalizeMedia(data.data));
            return;
          }

          errors.push(
            data.error
              ? `Estrategia C: ${data.error.message}`
              : 'Estrategia C: /me/media sin resultados'
          );
        } catch (e: any) {
          errors.push(`Estrategia C: ${e.message}`);
        }

        // ══════════════════════════════════════════════════════════════
        // ESTRATEGIA D — /me?fields=instagram_accounts
        // ══════════════════════════════════════════════════════════════
        try {
          const meRes = await fetch(
            `${BASE}/${API_VER}/me?fields=id,name,instagram_accounts&access_token=${token}`
          );
          const meData = await meRes.json();

          if (meData.error) {
            errors.push(`Estrategia D (me): ${meData.error.message}`);
          } else if (meData.instagram_accounts?.data?.length) {
            const igId = meData.instagram_accounts.data[0].id;
            const mediaRes = await fetch(
              `${BASE}/${API_VER}/${igId}/media?fields=${MEDIA_FIELDS}&limit=${limit}&access_token=${token}`
            );
            const mediaData = await mediaRes.json();

            if (!mediaData.error && Array.isArray(mediaData.data) && mediaData.data.length > 0) {
              setFeed(normalizeMedia(mediaData.data));
              return;
            }

            errors.push(
              mediaData.error
                ? `Estrategia D (media): ${mediaData.error.message}`
                : 'Estrategia D: cuenta IG sin publicaciones accesibles'
            );
          } else {
            errors.push('Estrategia D: no hay instagram_accounts en /me');
          }
        } catch (e: any) {
          errors.push(`Estrategia D: ${e.message}`);
        }

        // Todas las estrategias fallaron
        console.error(
          '[useInstagramFeed] Todas las estrategias fallaron:\n' +
          errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
        );
        throw new Error(errors.join(' | '));

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
