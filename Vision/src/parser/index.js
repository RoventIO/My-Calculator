/**
 * DOM Parser Library Entry Point
 * Exports the complete HTML Parsing & DOM Tree toolchain.
 */

import { Lexer, Token, TokenType, VOID_ELEMENTS, RAW_TEXT_ELEMENTS } from './lexer.js';
import {
  Node,
  ElementNode,
  TextNode,
  CommentNode,
  DocumentTypeNode,
  DocumentNode,
  NodeType
} from './nodes.js';
import { TreeBuilder, parseHTML } from './treeBuilder.js';
import { decodeHTMLEntities, escapeHTML } from './entities.js';
import { matchesSelector } from './selector.js';

/**
 * Drop-in DOMParser replacement for JavaScript environments
 */
export class CustomDOMParser {
  /**
   * @param {string} markup
   * @param {string} [type='text/html']
   * @returns {DocumentNode}
   */
  parseFromString(markup, type = 'text/html') {
    return parseHTML(markup);
  }
}

export {
  // Parsing functions
  parseHTML,
  Lexer,
  Token,
  TokenType,
  TreeBuilder,
  VOID_ELEMENTS,
  RAW_TEXT_ELEMENTS,

  // DOM Node classes
  Node,
  ElementNode,
  TextNode,
  CommentNode,
  DocumentTypeNode,
  DocumentNode,
  NodeType,

  // Utilities
  decodeHTMLEntities,
  escapeHTML,
  matchesSelector
};

export default {
  parseHTML,
  DOMParser: CustomDOMParser,
  Lexer,
  TreeBuilder
};
