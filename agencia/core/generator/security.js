// Defensas del sitio generado: CSP por <meta> (con hash del script inline) y archivo _headers para el hosting.
import { createHash } from 'node:crypto';

const INLINE_JS = "document.documentElement.classList.add('js')";

export const inlineScriptSource = INLINE_JS;

function sha256(text) {
  return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

/** Política de contenido compatible con el sitio generado (Google Fonts, imágenes propias/https, sin scripts de terceros). */
export function cspPolicy() {
  return [
    "default-src 'self'",
    `script-src 'self' ${sha256(INLINE_JS)}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // 'unsafe-inline': style="--d:n" de las animaciones
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
  ].join('; ');
}

/** <meta> de seguridad para el <head>. */
export function securityMeta() {
  return `<meta http-equiv="Content-Security-Policy" content="${cspPolicy()}">
<meta name="referrer" content="strict-origin-when-cross-origin">`;
}

/** Cabeceras HTTP para Netlify / Cloudflare Pages (_headers). En otros hosts, copiarlas a su configuración. */
export function buildHeadersFile() {
  return `# Cabeceras de seguridad (Netlify / Cloudflare Pages). En Apache/Nginx, replicarlas en la configuración del servidor.
/*
  Content-Security-Policy: ${cspPolicy()}; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin
`;
}
