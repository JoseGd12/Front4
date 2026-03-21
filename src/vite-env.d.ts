declare module '*.png' {
    const value: string;
    export default value;
}

declare module '*.jpg' {
    const value: string;
    export default value;
}

declare module '*.jpeg' {
    const value: string;
    export default value;
}

declare module '*.svg' {
    const value: string;
    export default value;
}

declare module '*.webp' {
    const value: string;
    export default value;
}

declare module '*.mp4' {
    const value: string;
    export default value;
}

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_FIREBASE_PROJECT_ID: string
    readonly VITE_FIREBASE_STORAGE_BUCKET: string
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
    readonly VITE_FIREBASE_APP_ID: string
    readonly VITE_FIREBASE_MEASUREMENT_ID: string
    readonly VITE_API_BASE_URL: string
    readonly VITE_ENABLE_ANALYTICS: string
    readonly VITE_ENABLE_DEBUG: string
    readonly VITE_APP_NAME: string
    readonly VITE_APP_VERSION: string
    readonly VITE_EMAILJS_SERVICE_ID: string
    readonly VITE_EMAILJS_TEMPLATE_ID_CANCELACION: string
    readonly VITE_EMAILJS_PUBLIC_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
