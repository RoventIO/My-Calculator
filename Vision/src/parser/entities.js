/**
 * HTML Entity Encoder & Decoder
 */

const NAMED_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': '\u00A0',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&euro;': '€',
  '&pound;': '£',
  '&yen;': '¥',
  '&cent;': '¢'
};

/**
 * Decodes HTML entities in text strings
 * @param {string} text
 * @returns {string}
 */
export function decodeHTMLEntities(text) {
  if (!text || typeof text !== 'string') return '';

  return text.replace(/&(?:[a-zA-Z0-9]+|#\d+|#[xX][0-9a-fA-F]+);/g, (match) => {
    const lower = match.toLowerCase();
    if (NAMED_ENTITIES[lower]) {
      return NAMED_ENTITIES[lower];
    }
    if (match.startsWith('&#x') || match.startsWith('&#X')) {
      const code = parseInt(match.slice(3, -1), 16);
      if (!isNaN(code)) {
        return String.fromCodePoint(code);
      }
    } else if (match.startsWith('&#')) {
      const code = parseInt(match.slice(2, -1), 10);
      if (!isNaN(code)) {
        return String.fromCodePoint(code);
      }
    }
    return match;
  });
}

/**
 * Escapes special characters into HTML entities for safe serialization
 * @param {string} text
 * @returns {string}
 */
export function escapeHTML(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
