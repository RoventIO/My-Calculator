/**
 * Tree Builder
 * Consumes tokens from the Lexer and constructs a robust DOM Tree.
 * Includes HTML5 auto-closing tag rules (e.g., <p>, <li>) and stack unwinding.
 */

import { Lexer, TokenType } from './lexer.js';
import {
  DocumentNode,
  ElementNode,
  TextNode,
  CommentNode,
  DocumentTypeNode,
  NodeType
} from './nodes.js';

// Block tags that implicitly close an open <p>
const P_CLOSING_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2',
  'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p',
  'pre', 'section', 'table', 'ul'
]);

export class TreeBuilder {
  /**
   * @param {object} options
   * @param {boolean} [options.mergeTextNodes=true]
   */
  constructor(options = {}) {
    this.options = {
      mergeTextNodes: true,
      ...options
    };
  }

  /**
   * Check if current element on stack should be auto-closed before opening nextTag
   */
  shouldAutoClose(currentTag, nextTag) {
    if (!currentTag) return false;
    const curr = currentTag.toLowerCase();
    const next = nextTag.toLowerCase();

    if (curr === 'p' && P_CLOSING_TAGS.has(next)) {
      return true;
    }
    if (curr === 'li' && next === 'li') {
      return true;
    }
    if ((curr === 'dt' || curr === 'dd') && (next === 'dt' || next === 'dd')) {
      return true;
    }
    if (curr === 'tr' && (next === 'tr')) {
      return true;
    }
    if ((curr === 'td' || curr === 'th') && (next === 'td' || next === 'th' || next === 'tr')) {
      return true;
    }
    if (curr === 'option' && (next === 'option' || next === 'optgroup')) {
      return true;
    }

    return false;
  }

  /**
   * Builds a DOM tree from a token array
   * @param {import('./lexer.js').Token[]} tokens
   * @returns {DocumentNode}
   */
  build(tokens) {
    const document = new DocumentNode();
    const stack = [document];

    for (const token of tokens) {
      let currentParent = stack[stack.length - 1];

      switch (token.type) {
        case TokenType.DOCTYPE: {
          const doctypeNode = new DocumentTypeNode(token.value || 'html');
          document.appendChild(doctypeNode);
          break;
        }

        case TokenType.COMMENT: {
          const commentNode = new CommentNode(token.value);
          currentParent.appendChild(commentNode);
          break;
        }

        case TokenType.TEXT: {
          if (
            this.options.mergeTextNodes &&
            currentParent.lastChild &&
            currentParent.lastChild.nodeType === NodeType.TEXT_NODE
          ) {
            currentParent.lastChild.data += token.value;
          } else {
            const textNode = new TextNode(token.value);
            currentParent.appendChild(textNode);
          }
          break;
        }

        case TokenType.START_TAG: {
          // Check for auto-closing elements like unclosed <p> or <li>
          while (
            stack.length > 1 &&
            this.shouldAutoClose(stack[stack.length - 1].localName, token.name)
          ) {
            stack.pop();
          }

          currentParent = stack[stack.length - 1];
          const element = new ElementNode(token.name, token.attributes);
          currentParent.appendChild(element);

          if (!token.selfClosing) {
            stack.push(element);
          }
          break;
        }

        case TokenType.END_TAG: {
          const targetTag = token.name.toUpperCase();

          // Find the most recent matching opening tag in the stack
          let matchIndex = -1;
          for (let i = stack.length - 1; i >= 1; i--) {
            if (stack[i].tagName === targetTag) {
              matchIndex = i;
              break;
            }
          }

          if (matchIndex !== -1) {
            // Unwind stack up to and including the matched element
            while (stack.length > matchIndex) {
              stack.pop();
            }
          }
          break;
        }
      }
    }

    return document;
  }
}

/**
 * Convenience function to parse an HTML string into a DOM DocumentNode
 * @param {string} html
 * @param {object} [options]
 * @returns {DocumentNode}
 */
export function parseHTML(html, options = {}) {
  const lexer = new Lexer(html);
  const tokens = lexer.tokenize();
  const builder = new TreeBuilder(options);
  return builder.build(tokens);
}
