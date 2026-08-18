// Atlas — Central HTML escaping utility.
// Every module that renders user-controlled text into HTML must use these
// helpers instead of inline string interpolation. This is the single
// defense against stored XSS.

/**
 * Escape text for safe insertion into HTML content contexts.
 * Handles &, <, >, ", and ' characters.
 * @param {*} str - Value to escape (coerced to string)
 * @returns {string} Escaped string safe for innerHTML text content
 */
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape text for safe insertion into HTML attribute values.
 * Handles &, <, >, ", ', and backtick characters.
 * @param {*} str - Value to escape (coerced to string)
 * @returns {string} Escaped string safe for attribute contexts
 */
export function escAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;');
}

/**
 * Escape text for safe use in JavaScript string contexts (inline handlers).
 * @param {*} str - Value to escape
 * @returns {string} Escaped string
 */
export function escJs(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
