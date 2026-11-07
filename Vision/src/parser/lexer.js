/**
 * Lexer / Tokenizer for HTML
 * Converts raw HTML string into a stream of tokens with line/col location tracking.
 */

import { decodeHTMLEntities } from './entities.js';

export const TokenType = {
  DOCTYPE: 'DOCTYPE',
  START_TAG: 'START_TAG',
  END_TAG: 'END_TAG',
  TEXT: 'TEXT',
  COMMENT: 'COMMENT'
};

// HTML5 standard void elements that cannot have end tags or child nodes
export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// Elements whose contents are treated as raw text (no tag parsing inside)
export const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

export class Token {
  constructor(type, properties = {}) {
    this.type = type;
    Object.assign(this, properties);
  }
}

export class Lexer {
  /**
   * @param {string} input - HTML source code
   */
  constructor(input = '') {
    this.input = input;
    this.index = 0;
    this.length = input.length;
    this.line = 1;
    this.column = 1;
  }

  /**
   * Peek current character
   */
  peek(offset = 0) {
    const idx = this.index + offset;
    return idx < this.length ? this.input[idx] : null;
  }

  /**
   * Advance one or more characters and track line/col
   */
  advance(count = 1) {
    for (let i = 0; i < count; i++) {
      if (this.index < this.length) {
        if (this.input[this.index] === '\n') {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.index++;
      }
    }
  }

  /**
   * Match string starting at current position
   */
  match(str, caseInsensitive = true) {
    const slice = this.input.slice(this.index, this.index + str.length);
    return caseInsensitive
      ? slice.toLowerCase() === str.toLowerCase()
      : slice === str;
  }

  /**
   * Skip whitespace characters
   */
  skipWhitespace() {
    while (this.index < this.length) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.advance(1);
      } else {
        break;
      }
    }
  }

  /**
   * Tokenize the entire input and return an array of tokens
   * @returns {Token[]}
   */
  tokenize() {
    const tokens = [];

    while (this.index < this.length) {
      const startLine = this.line;
      const startCol = this.column;
      const startIndex = this.index;

      // 1. Comments: <!-- ... -->
      if (this.match('<!--')) {
        const commentToken = this.readComment(startLine, startCol, startIndex);
        tokens.push(commentToken);
        continue;
      }

      // 2. Doctype: <!DOCTYPE ...>
      if (this.match('<!DOCTYPE', true) || this.match('<!doctype', true)) {
        const doctypeToken = this.readDoctype(startLine, startCol, startIndex);
        tokens.push(doctypeToken);
        continue;
      }

      // 3. End Tag: </tag>
      if (this.match('</')) {
        const endTagToken = this.readEndTag(startLine, startCol, startIndex);
        if (endTagToken) {
          tokens.push(endTagToken);
        }
        continue;
      }

      // 4. Start Tag: <tag ...>
      if (this.peek() === '<' && this.isTagNameStart(this.peek(1))) {
        const startTagToken = this.readStartTag(startLine, startCol, startIndex);
        if (startTagToken) {
          tokens.push(startTagToken);

          // If this element contains raw text (e.g. script/style), consume its body as raw text
          const lowerName = startTagToken.name.toLowerCase();
          if (RAW_TEXT_ELEMENTS.has(lowerName) && !startTagToken.selfClosing) {
            const rawToken = this.readRawText(lowerName);
            if (rawToken) {
              tokens.push(rawToken);
            }
          }
        }
        continue;
      }

      // 5. Text content
      const textToken = this.readText(startLine, startCol, startIndex);
      if (textToken) {
        tokens.push(textToken);
      }
    }

    return tokens;
  }

  readComment(startLine, startCol, startIndex) {
    this.advance(4); // Skip <!--
    let content = '';

    while (this.index < this.length) {
      if (this.match('-->')) {
        this.advance(3);
        break;
      }
      content += this.peek();
      this.advance(1);
    }

    return new Token(TokenType.COMMENT, {
      value: content,
      line: startLine,
      column: startCol,
      startIndex,
      endIndex: this.index
    });
  }

  readDoctype(startLine, startCol, startIndex) {
    this.advance(9); // Skip <!DOCTYPE
    this.skipWhitespace();

    let value = '';
    while (this.index < this.length && this.peek() !== '>') {
      value += this.peek();
      this.advance(1);
    }

    if (this.peek() === '>') {
      this.advance(1);
    }

    return new Token(TokenType.DOCTYPE, {
      value: value.trim(),
      line: startLine,
      column: startCol,
      startIndex,
      endIndex: this.index
    });
  }

  readEndTag(startLine, startCol, startIndex) {
    this.advance(2); // Skip </
    this.skipWhitespace();

    let name = '';
    while (this.index < this.length && this.isTagNameChar(this.peek())) {
      name += this.peek();
      this.advance(1);
    }

    // Skip any garbage or whitespace before closing >
    while (this.index < this.length && this.peek() !== '>') {
      this.advance(1);
    }

    if (this.peek() === '>') {
      this.advance(1);
    }

    if (!name) return null;

    return new Token(TokenType.END_TAG, {
      name: name.toLowerCase(),
      line: startLine,
      column: startCol,
      startIndex,
      endIndex: this.index
    });
  }

  readStartTag(startLine, startCol, startIndex) {
    this.advance(1); // Skip <

    let name = '';
    while (this.index < this.length && this.isTagNameChar(this.peek())) {
      name += this.peek();
      this.advance(1);
    }

    const lowerName = name.toLowerCase();
    const attributes = {};
    const rawAttributes = [];

    // Parse attributes
    while (this.index < this.length) {
      this.skipWhitespace();

      const ch = this.peek();
      if (ch === '>' || ch === '/' || ch === null) {
        break;
      }

      const attr = this.readAttribute();
      if (attr) {
        attributes[attr.name] = attr.value;
        rawAttributes.push(attr);
      } else {
        // If attribute cannot be parsed, advance to avoid infinite loop
        this.advance(1);
      }
    }

    let selfClosing = VOID_ELEMENTS.has(lowerName);

    this.skipWhitespace();
    if (this.peek() === '/') {
      selfClosing = true;
      this.advance(1);
    }

    this.skipWhitespace();
    if (this.peek() === '>') {
      this.advance(1);
    }

    return new Token(TokenType.START_TAG, {
      name: lowerName,
      attributes,
      rawAttributes,
      selfClosing,
      line: startLine,
      column: startCol,
      startIndex,
      endIndex: this.index
    });
  }

  readAttribute() {
    this.skipWhitespace();

    let name = '';
    while (this.index < this.length && this.isAttributeNameChar(this.peek())) {
      name += this.peek();
      this.advance(1);
    }

    if (!name) return null;

    name = name.toLowerCase();
    this.skipWhitespace();

    if (this.peek() !== '=') {
      // Boolean attribute (e.g., disabled, checked)
      return { name, value: '' };
    }

    // Skip '='
    this.advance(1);
    this.skipWhitespace();

    let value = '';
    const quote = this.peek();

    if (quote === '"' || quote === "'") {
      this.advance(1); // Skip opening quote
      while (this.index < this.length && this.peek() !== quote) {
        value += this.peek();
        this.advance(1);
      }
      if (this.peek() === quote) {
        this.advance(1); // Skip closing quote
      }
    } else {
      // Unquoted attribute value
      while (this.index < this.length && this.isUnquotedAttrChar(this.peek())) {
        value += this.peek();
        this.advance(1);
      }
    }

    return {
      name,
      value: decodeHTMLEntities(value)
    };
  }

  readRawText(tagName) {
    const startLine = this.line;
    const startCol = this.column;
    const startIndex = this.index;
    let content = '';

    const closePattern = `</${tagName}`;

    while (this.index < this.length) {
      if (this.match(closePattern, true)) {
        break;
      }
      content += this.peek();
      this.advance(1);
    }

    if (!content) return null;

    return new Token(TokenType.TEXT, {
      value: content,
      raw: true,
      line: startLine,
      column: startCol,
      startIndex,
      endIndex: this.index
    });
  }

  readText(startLine, startCol, startIndex) {
    let content = '';

    while (this.index < this.length && this.peek() !== '<') {
      content += this.peek();
      this.advance(1);
    }

    if (!content) return null;

    return new Token(TokenType.TEXT, {
      value: decodeHTMLEntities(content),
      line: startLine,
      column: startCol,
      startIndex,
      endIndex: this.index
    });
  }

  isTagNameStart(ch) {
    if (!ch) return false;
    return /[a-zA-Z]/.test(ch);
  }

  isTagNameChar(ch) {
    if (!ch) return false;
    return /[a-zA-Z0-9\-_:]/.test(ch);
  }

  isAttributeNameChar(ch) {
    if (!ch) return false;
    // Disallow whitespace, quotes, equals, slashes, and control chars
    return !/[\s"'>/=\x00-\x1f\x7f-\x9f]/.test(ch);
  }

  isUnquotedAttrChar(ch) {
    if (!ch) return false;
    return !/[\s"'>/=\x00-\x1f\x7f-\x9f]/.test(ch);
  }
}
