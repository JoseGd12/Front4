export { SimpleCaptcha } from './SimpleCaptcha';
// FE-A3: captcha real con verificación server-side. Para activarlo, reemplazar
// <SimpleCaptcha .../> por <TurnstileCaptcha .../> en LoginPage/RegisterPage y
// configurar VITE_TURNSTILE_SITE_KEY (front) + Turnstile:SecretKey (backend).
export { TurnstileCaptcha } from './TurnstileCaptcha';
