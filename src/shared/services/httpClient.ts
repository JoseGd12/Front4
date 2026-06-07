import { auth } from './firebase';
import { API_BASE_URL } from '../config/api';

interface CacheEntry {
  data: any;
  timestamp: number;
}

/**
 * Cliente HTTP centralizado para manejar peticiones a la API.
 * Incluye deduplicación de peticiones y caché inteligente.
 */
class HttpClient {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly CACHE_TTL = 5000; // 5 segundos para datos que cambian poco

  /** Genera un UUID v4 para usar como Idempotency-Key */
  generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  private async getHeaders(method: string, body: any, customHeaders: HeadersInit = {}): Promise<Headers> {
    const headers = new Headers(customHeaders);

    const hasBody = !['GET', 'DELETE', 'HEAD'].includes(method.toUpperCase());
    if (hasBody && !(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('Authorization')) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  private async handleResponse(response: Response): Promise<Response> {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new Error('Sesión expirada o no autorizada');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Error en la petición: ${response.status}`);
    }

    return response;
  }

  /**
   * Realiza una petición genérica.
   */
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const base = API_BASE_URL.replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http') ? endpoint : `${base}${path}`;
    
    const method = (options.method || 'GET').toUpperCase();
    const headers = await this.getHeaders(method, options.body, options.headers);
    
    const config: RequestInit = {
      ...options,
      method,
      headers,
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`HttpClient Error [${method}] ${url}:`, error);
      throw error;
    }
  }

  /**
   * GET con deduplicación y caché.
   * Si hay una petición idéntica en curso, devuelve la misma promesa.
   */
  async get<T = any>(endpoint: string, options: { useCache?: boolean; ttl?: number } & RequestInit = {}): Promise<T> {
    const cacheKey = `GET:${endpoint}`;
    const { useCache = true, ttl = this.CACHE_TTL } = options;

    // 1. Verificar caché
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data as T;
      }
    }

    // 2. Deduplicación: Si ya hay una petición en curso para este endpoint, reusar su promesa
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const response = await this.request(endpoint, { ...options, method: 'GET' });
        const text = await response.text();
        const data = text ? JSON.parse(text) : ({} as T);

        if (useCache) {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }
        return data;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Limpia el caché para un endpoint específico o todo el caché.
   */
  invalidateCache(endpoint?: string) {
    if (endpoint) {
      this.cache.delete(`GET:${endpoint}`);
    } else {
      this.cache.clear();
    }
  }

  async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    this.invalidateCache(endpoint); // Invalida caché al mutar
    const isFormData = body instanceof FormData;
    const config: RequestInit = {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    };
    
    const response = await this.request(endpoint, config);
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  async put<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    this.invalidateCache(endpoint);
    const isFormData = body instanceof FormData;
    const config: RequestInit = {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    };

    const response = await this.request(endpoint, config);
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    this.invalidateCache(endpoint);
    const response = await this.request(endpoint, { ...options, method: 'DELETE' });
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }
}

export const httpClient = new HttpClient();
export default httpClient;
