/**
 * DOM Node Hierarchy
 * Implements standard W3C-like DOM manipulation methods and properties.
 */

import { escapeHTML } from './entities.js';
import { matchesSelector } from './selector.js';

export const NodeType = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10
};

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/**
 * Base DOM Node
 */
export class Node {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.parentNode = null;
    this.childNodes = [];
  }

  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === NodeType.ELEMENT_NODE
      ? this.parentNode
      : null;
  }

  get children() {
    return this.childNodes.filter((child) => child.nodeType === NodeType.ELEMENT_NODE);
  }

  get childElementCount() {
    return this.children.length;
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] || null;
  }

  get firstElementChild() {
    return this.children[0] || null;
  }

  get lastElementChild() {
    const list = this.children;
    return list[list.length - 1] || null;
  }

  get previousSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    return idx > 0 ? siblings[idx - 1] : null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    return idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  }

  get previousElementSibling() {
    if (!this.parentNode) return null;
    const elemSiblings = this.parentNode.children;
    const idx = elemSiblings.indexOf(this);
    return idx > 0 ? elemSiblings[idx - 1] : null;
  }

  get nextElementSibling() {
    if (!this.parentNode) return null;
    const elemSiblings = this.parentNode.children;
    const idx = elemSiblings.indexOf(this);
    return idx >= 0 && idx < elemSiblings.length - 1 ? elemSiblings[idx + 1] : null;
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this.childNodes = [];
    if (value !== '') {
      this.appendChild(new TextNode(String(value)));
    }
  }

  appendChild(child) {
    if (!child || !(child instanceof Node)) {
      throw new TypeError('Failed to execute appendChild: parameter 1 is not of type Node.');
    }
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx === -1) {
      throw new Error('Failed to execute removeChild: The node to be removed is not a child of this node.');
    }
    this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }

  insertBefore(newNode, referenceNode) {
    if (!referenceNode) {
      return this.appendChild(newNode);
    }
    const idx = this.childNodes.indexOf(referenceNode);
    if (idx === -1) {
      throw new Error('Failed to execute insertBefore: The reference node is not a child of this node.');
    }
    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }
    newNode.parentNode = this;
    this.childNodes.splice(idx, 0, newNode);
    return newNode;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.childNodes.indexOf(oldChild);
    if (idx === -1) {
      throw new Error('Failed to execute replaceChild: The node to be replaced is not a child of this node.');
    }
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    newChild.parentNode = this;
    oldChild.parentNode = null;
    this.childNodes[idx] = newChild;
    return oldChild;
  }

  contains(otherNode) {
    if (!otherNode) return false;
    let curr = otherNode;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  cloneNode(deep = false) {
    throw new Error('cloneNode must be implemented by subclass.');
  }

  toJSON() {
    return {
      nodeType: this.nodeType,
      nodeName: this.nodeName
    };
  }
}

/**
 * Text Node
 */
export class TextNode extends Node {
  constructor(data = '') {
    super(NodeType.TEXT_NODE, '#text');
    this.data = data;
  }

  get textContent() {
    return this.data;
  }

  set textContent(val) {
    this.data = String(val);
  }

  cloneNode() {
    return new TextNode(this.data);
  }

  toJSON() {
    return {
      nodeType: this.nodeType,
      nodeName: this.nodeName,
      data: this.data
    };
  }
}

/**
 * Comment Node
 */
export class CommentNode extends Node {
  constructor(data = '') {
    super(NodeType.COMMENT_NODE, '#comment');
    this.data = data;
  }

  get textContent() {
    return this.data;
  }

  set textContent(val) {
    this.data = String(val);
  }

  cloneNode() {
    return new CommentNode(this.data);
  }

  toJSON() {
    return {
      nodeType: this.nodeType,
      nodeName: this.nodeName,
      data: this.data
    };
  }
}

/**
 * DocumentType Node
 */
export class DocumentTypeNode extends Node {
  constructor(name = 'html', publicId = '', systemId = '') {
    super(NodeType.DOCUMENT_TYPE_NODE, name.toLowerCase());
    this.name = name.toLowerCase();
    this.publicId = publicId;
    this.systemId = systemId;
  }

  cloneNode() {
    return new DocumentTypeNode(this.name, this.publicId, this.systemId);
  }

  toJSON() {
    return {
      nodeType: this.nodeType,
      nodeName: this.nodeName,
      name: this.name
    };
  }
}

/**
 * ClassList implementation
 */
class ClassList {
  constructor(element) {
    this.element = element;
  }

  _getClasses() {
    const cls = this.element.getAttribute('class');
    if (!cls) return [];
    return cls.trim().split(/\s+/).filter(Boolean);
  }

  _setClasses(classes) {
    if (classes.length === 0) {
      this.element.removeAttribute('class');
    } else {
      this.element.setAttribute('class', classes.join(' '));
    }
  }

  add(...classes) {
    const current = new Set(this._getClasses());
    for (const c of classes) {
      if (c) current.add(c);
    }
    this._setClasses(Array.from(current));
  }

  remove(...classes) {
    const current = new Set(this._getClasses());
    for (const c of classes) {
      current.delete(c);
    }
    this._setClasses(Array.from(current));
  }

  contains(className) {
    return this._getClasses().includes(className);
  }

  toggle(className, force) {
    const has = this.contains(className);
    const shouldAdd = force !== undefined ? force : !has;
    if (shouldAdd) {
      this.add(className);
    } else {
      this.remove(className);
    }
    return shouldAdd;
  }

  toString() {
    return this.element.getAttribute('class') || '';
  }
}

/**
 * Element Node
 */
export class ElementNode extends Node {
  constructor(tagName, attributes = {}) {
    const upperTag = tagName.toUpperCase();
    super(NodeType.ELEMENT_NODE, upperTag);
    this.tagName = upperTag;
    this.localName = tagName.toLowerCase();
    this.attributes = { ...attributes };
    this._classList = new ClassList(this);
  }

  get id() {
    return this.getAttribute('id') || '';
  }

  set id(value) {
    if (!value) {
      this.removeAttribute('id');
    } else {
      this.setAttribute('id', value);
    }
  }

  get className() {
    return this.getAttribute('class') || '';
  }

  set className(value) {
    if (!value) {
      this.removeAttribute('class');
    } else {
      this.setAttribute('class', value);
    }
  }

  get classList() {
    return this._classList;
  }

  getAttribute(name) {
    const lower = name.toLowerCase();
    return Object.prototype.hasOwnProperty.call(this.attributes, lower)
      ? this.attributes[lower]
      : null;
  }

  setAttribute(name, value) {
    this.attributes[name.toLowerCase()] = String(value);
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name.toLowerCase());
  }

  removeAttribute(name) {
    delete this.attributes[name.toLowerCase()];
  }

  getAttributeNames() {
    return Object.keys(this.attributes);
  }

  get innerHTML() {
    return this.childNodes.map((child) => {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        return child.outerHTML;
      }
      if (child.nodeType === NodeType.TEXT_NODE) {
        return escapeHTML(child.data);
      }
      if (child.nodeType === NodeType.COMMENT_NODE) {
        return `<!--${child.data}-->`;
      }
      return '';
    }).join('');
  }

  get outerHTML() {
    const tag = this.localName;
    const attrPairs = Object.entries(this.attributes).map(([key, val]) => {
      if (val === '') return key;
      return `${key}="${escapeHTML(val)}"`;
    });

    const attrStr = attrPairs.length > 0 ? ` ${attrPairs.join(' ')}` : '';

    if (VOID_TAGS.has(tag)) {
      return `<${tag}${attrStr}>`;
    }

    return `<${tag}${attrStr}>${this.innerHTML}</${tag}>`;
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  closest(selector) {
    let curr = this;
    while (curr && curr.nodeType === NodeType.ELEMENT_NODE) {
      if (curr.matches(selector)) {
        return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const traverse = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) {
          results.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  getElementById(id) {
    const traverse = (node) => {
      for (const child of node.children) {
        if (child.id === id) return child;
        const found = traverse(child);
        if (found) return found;
      }
      return null;
    };
    return traverse(this);
  }

  getElementsByClassName(className) {
    const results = [];
    const traverse = (node) => {
      for (const child of node.children) {
        if (child.classList.contains(className)) {
          results.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  getElementsByTagName(tagName) {
    const target = tagName.toUpperCase();
    const results = [];
    const traverse = (node) => {
      for (const child of node.children) {
        if (target === '*' || child.tagName === target) {
          results.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  cloneNode(deep = false) {
    const clone = new ElementNode(this.localName, { ...this.attributes });
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  toJSON() {
    return {
      nodeType: this.nodeType,
      nodeName: this.nodeName,
      tagName: this.tagName,
      attributes: { ...this.attributes },
      childNodes: this.childNodes.map((child) => child.toJSON())
    };
  }
}

/**
 * Document Node
 */
export class DocumentNode extends Node {
  constructor() {
    super(NodeType.DOCUMENT_NODE, '#document');
  }

  get doctype() {
    return this.childNodes.find((child) => child.nodeType === NodeType.DOCUMENT_TYPE_NODE) || null;
  }

  get documentElement() {
    return this.children.find((child) => child.localName === 'html') || this.firstElementChild;
  }

  get head() {
    const docElem = this.documentElement;
    if (!docElem) return null;
    return docElem.children.find((child) => child.localName === 'head') || null;
  }

  get body() {
    const docElem = this.documentElement;
    if (!docElem) return null;
    return docElem.children.find((child) => child.localName === 'body') || null;
  }

  querySelector(selector) {
    for (const child of this.children) {
      if (child.matches(selector)) {
        return child;
      }
      const match = child.querySelector(selector);
      if (match) return match;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    for (const child of this.children) {
      if (child.matches(selector)) {
        results.push(child);
      }
      results.push(...child.querySelectorAll(selector));
    }
    return results;
  }

  getElementById(id) {
    for (const child of this.children) {
      if (child.id === id) return child;
      const match = child.getElementById(id);
      if (match) return match;
    }
    return null;
  }

  getElementsByClassName(className) {
    const results = [];
    for (const child of this.children) {
      if (child.classList.contains(className)) {
        results.push(child);
      }
      results.push(...child.getElementsByClassName(className));
    }
    return results;
  }

  getElementsByTagName(tagName) {
    const target = tagName.toUpperCase();
    const results = [];
    for (const child of this.children) {
      if (target === '*' || child.tagName === target) {
        results.push(child);
      }
      results.push(...child.getElementsByTagName(tagName));
    }
    return results;
  }

  createElement(tagName) {
    return new ElementNode(tagName);
  }

  createTextNode(text) {
    return new TextNode(text);
  }

  createComment(data) {
    return new CommentNode(data);
  }

  cloneNode(deep = false) {
    const clone = new DocumentNode();
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  toJSON() {
    return {
      nodeType: this.nodeType,
      nodeName: this.nodeName,
      childNodes: this.childNodes.map((child) => child.toJSON())
    };
  }
}
