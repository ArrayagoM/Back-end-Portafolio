// Normalización de teléfonos a formato internacional (compartido por entrevistador y generador).
const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');

/**
 * Lleva un número local al formato internacional para tel:/wa.me (solo dígitos, sin "+").
 * País por defecto: DEFAULT_COUNTRY_CODE (54 = Argentina). Si ya trae código de país, se respeta.
 * Argentina + WhatsApp: el móvil lleva un 9 tras el 54 (549...).
 */
export function intlDigits(value, forWhatsApp = false) {
  let d = onlyDigits(value);
  if (!d) return '';
  const cc = onlyDigits(process.env.DEFAULT_COUNTRY_CODE || '54') || '54';
  d = d.replace(/^00/, '');
  if (!d.startsWith(cc) || d.length <= 10) {
    // "0341 15 5551234" (0 de área + 15 de celular) -> "3415551234". Solo con el 0 inicial: sin él,
    // un "15" en medio del número es parte del número real.
    if (cc === '54') d = d.replace(/^0(\d{2,4})15(\d{6,8})$/, '$1$2');
    d = d.replace(/^0+/, '');
    d = cc + d;
  }
  if (cc === '54' && forWhatsApp && d.startsWith('54') && !d.startsWith('549')) d = '549' + d.slice(2);
  return d;
}
