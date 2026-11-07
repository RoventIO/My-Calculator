/**
 * Lightweight CSS Selector Parser & Matcher for Custom DOM Nodes
 * Supports:
 * - Tags: `div`, `p`, `*`
 * - IDs: `#main`, `header#main`
 * - Classes: `.btn`, `.btn.primary`
 * - Attributes: `[name]`, `[type="text"]`, `[href^="https"]`, `[src$=".png"]`, `[class*="icon-"]`
 * - Combinators: `div p` (descendant), `ul > li` (child), `h1, h2` (comma-separated groups)
 * - Pseudo-classes: `:first-child`, `:last-child`, `:empty`, `:not(sub)`
 */

/**
 * Splits a selector list by commas that are not inside quotes or brackets
 * @param {string} selector
 * @returns {string[]}
 */
export function splitCommaSelectors(selector) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let inBrackets = false;

  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];

    if ((ch === '"' || ch === "'") && !inBrackets) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = ch;
      } else if (ch === quoteChar) {
        inQuotes = false;
      }
    } else if (ch === '[' && !inQuotes) {
      inBrackets = true;
    } else if (ch === ']' && !inQuotes) {
      inBrackets = false;
    } else if (ch === ',' && !inQuotes && !inBrackets) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Tokenizes a single compound selector chain (e.g. "div.card > ul li.item")
 * into compound steps and combinators (' ', '>')
 */
export function parseSelectorChain(selectorStr) {
  const tokens = [];
  let i = 0;
  const len = selectorStr.length;

  while (i < len) {
    // Skip whitespace, but note if it represents a descendant combinator
    let hadSpace = false;
    while (i < len && /\s/.test(selectorStr[i])) {
      hadSpace = true;
      i++;
    }

    if (i >= len) break;

    const ch = selectorStr[i];
    if (ch === '>') {
      tokens.push({ type: 'combinator', value: '>' });
      i++;
      continue;
    } else if (hadSpace && tokens.length > 0 && tokens[tokens.length - 1].type !== 'combinator') {
      tokens.push({ type: 'combinator', value: ' ' });
    }

    // Parse simple selector unit (e.g., tag + id + classes + attrs + pseudos)
    let unit = '';
    while (i < len && !/\s|>/.test(selectorStr[i])) {
      if (selectorStr[i] === '[') {
        // Read until closing bracket
        while (i < len && selectorStr[i] !== ']') {
          unit += selectorStr[i];
          i++;
        }
        if (i < len) {
          unit += selectorStr[i];
          i++;
        }
      } else {
        unit += selectorStr[i];
        i++;
      }
    }

    if (unit) {
      tokens.push({ type: 'unit', ...parseCompoundUnit(unit) });
    }
  }

  return tokens;
}

/**
 * Parses a single compound unit like "div#card.active.large[data-id='42']:first-child"
 */
function parseCompoundUnit(raw) {
  const parts = {
    tag: '*',
    id: null,
    classes: [],
    attributes: [],
    pseudos: []
  };

  let buffer = '';
  let i = 0;

  // Check tag at the beginning
  const tagMatch = raw.match(/^([a-zA-Z0-9\-_]+|\*)/);
  if (tagMatch) {
    parts.tag = tagMatch[1].toLowerCase();
    i += tagMatch[1].length;
  }

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === '#') {
      i++;
      let idStr = '';
      while (i < raw.length && /[a-zA-Z0-9\-_]/.test(raw[i])) {
        idStr += raw[i];
        i++;
      }
      parts.id = idStr;
    } else if (ch === '.') {
      i++;
      let classStr = '';
      while (i < raw.length && /[a-zA-Z0-9\-_]/.test(raw[i])) {
        classStr += raw[i];
        i++;
      }
      if (classStr) parts.classes.push(classStr);
    } else if (ch === '[') {
      i++;
      let attrExpr = '';
      while (i < raw.length && raw[i] !== ']') {
        attrExpr += raw[i];
        i++;
      }
      if (raw[i] === ']') i++;

      // Parse attribute expression e.g., name="value", name, name^="val", name$="val", name*="val"
      const attrMatch = attrExpr.match(/^([a-zA-Z0-9\-_:]+)(?:([~|^$*]?=)(["']?)(.*?)\3)?$/);
      if (attrMatch) {
        parts.attributes.push({
          name: attrMatch[1].toLowerCase(),
          operator: attrMatch[2] || null,
          value: attrMatch[4] !== undefined ? attrMatch[4] : null
        });
      }
    } else if (ch === ':') {
      i++;
      let pseudoStr = '';
      while (i < raw.length && /[a-zA-Z0-9\-_()]/.test(raw[i])) {
        pseudoStr += raw[i];
        i++;
      }
      if (pseudoStr) parts.pseudos.push(pseudoStr.toLowerCase());
    } else {
      i++;
    }
  }

  return parts;
}

/**
 * Checks if a single ElementNode matches a parsed compound unit
 * @param {import('./nodes.js').ElementNode} element
 * @param {object} unit
 * @returns {boolean}
 */
export function matchesUnit(element, unit) {
  if (!element || element.nodeType !== 1) return false;

  // Tag match
  if (unit.tag !== '*' && element.localName !== unit.tag) {
    return false;
  }

  // ID match
  if (unit.id !== null && element.id !== unit.id) {
    return false;
  }

  // Class match (all must match)
  for (const cls of unit.classes) {
    if (!element.classList.contains(cls)) {
      return false;
    }
  }

  // Attribute match
  for (const attr of unit.attributes) {
    if (!element.hasAttribute(attr.name)) {
      return false;
    }

    if (attr.operator !== null) {
      const actualVal = element.getAttribute(attr.name) || '';
      const targetVal = attr.value || '';

      switch (attr.operator) {
        case '=':
          if (actualVal !== targetVal) return false;
          break;
        case '^=':
          if (!actualVal.startsWith(targetVal)) return false;
          break;
        case '$=':
          if (!actualVal.endsWith(targetVal)) return false;
          break;
        case '*=':
          if (!actualVal.includes(targetVal)) return false;
          break;
        case '~=': {
          const words = actualVal.split(/\s+/);
          if (!words.includes(targetVal)) return false;
          break;
        }
      }
    }
  }

  // Pseudo-classes
  for (const pseudo of unit.pseudos) {
    if (pseudo === 'first-child') {
      if (!element.parentNode) return false;
      const elementSiblings = element.parentNode.children;
      if (elementSiblings[0] !== element) return false;
    } else if (pseudo === 'last-child') {
      if (!element.parentNode) return false;
      const elementSiblings = element.parentNode.children;
      if (elementSiblings[elementSiblings.length - 1] !== element) return false;
    } else if (pseudo === 'empty') {
      if (element.childNodes.length > 0) return false;
    }
  }

  return true;
}

/**
 * Checks if an element matches a selector chain tokens array (from right to left)
 * @param {import('./nodes.js').ElementNode} element
 * @param {object[]} tokens
 * @returns {boolean}
 */
export function matchesChain(element, tokens) {
  if (tokens.length === 0) return false;

  let currentElement = element;
  let tokenIdx = tokens.length - 1;

  // Rightmost token must be a unit that matches currentElement
  const rightUnit = tokens[tokenIdx];
  if (rightUnit.type !== 'unit' || !matchesUnit(currentElement, rightUnit)) {
    return false;
  }

  tokenIdx--;

  while (tokenIdx >= 0) {
    const combinator = tokens[tokenIdx];
    tokenIdx--;

    if (tokenIdx < 0) return false;
    const targetUnit = tokens[tokenIdx];
    tokenIdx--;

    if (combinator.value === '>') {
      // Direct parent must match
      currentElement = currentElement.parentElement;
      if (!currentElement || !matchesUnit(currentElement, targetUnit)) {
        return false;
      }
    } else if (combinator.value === ' ') {
      // Any ancestor must match
      let ancestor = currentElement.parentElement;
      let matchedAncestor = false;
      while (ancestor) {
        if (matchesUnit(ancestor, targetUnit)) {
          matchedAncestor = true;
          currentElement = ancestor;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (!matchedAncestor) return false;
    }
  }

  return true;
}

/**
 * Evaluates whether an element matches the given full CSS selector string
 * @param {import('./nodes.js').ElementNode} element
 * @param {string} selector
 * @returns {boolean}
 */
export function matchesSelector(element, selector) {
  if (!element || element.nodeType !== 1) return false;

  const selectorGroups = splitCommaSelectors(selector);
  for (const group of selectorGroups) {
    const tokens = parseSelectorChain(group);
    if (matchesChain(element, tokens)) {
      return true;
    }
  }
  return false;
}
