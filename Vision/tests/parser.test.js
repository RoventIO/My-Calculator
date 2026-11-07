import { describe, it, expect } from 'vitest';
import { parseHTML, CustomDOMParser, NodeType, Lexer, TokenType } from '../src/parser/index.js';

describe('Lexer', () => {
  it('tokenizes doctype, tags, attributes, and text', () => {
    const html = '<!DOCTYPE html><div id="main" class="box" disabled>Hello &amp; World</div>';
    const lexer = new Lexer(html);
    const tokens = lexer.tokenize();

    expect(tokens.length).toBe(4);
    expect(tokens[0].type).toBe(TokenType.DOCTYPE);
    expect(tokens[0].value).toBe('html');

    expect(tokens[1].type).toBe(TokenType.START_TAG);
    expect(tokens[1].name).toBe('div');
    expect(tokens[1].attributes.id).toBe('main');
    expect(tokens[1].attributes.class).toBe('box');
    expect(tokens[1].attributes.disabled).toBe('');

    expect(tokens[2].type).toBe(TokenType.TEXT);
    expect(tokens[2].value).toBe('Hello & World'); // Decoded entity

    expect(tokens[3].type).toBe(TokenType.END_TAG);
    expect(tokens[3].name).toBe('div');
  });

  it('handles void elements as self-closing automatically', () => {
    const html = '<img src="avatar.png" alt="User"><br><hr/>';
    const lexer = new Lexer(html);
    const tokens = lexer.tokenize();

    expect(tokens.length).toBe(3);
    expect(tokens[0].name).toBe('img');
    expect(tokens[0].selfClosing).toBe(true);
    expect(tokens[1].name).toBe('br');
    expect(tokens[1].selfClosing).toBe(true);
    expect(tokens[2].name).toBe('hr');
    expect(tokens[2].selfClosing).toBe(true);
  });

  it('handles unquoted and single-quoted attributes', () => {
    const html = '<input type=text name=\'user_name\' value=robert required>';
    const lexer = new Lexer(html);
    const tokens = lexer.tokenize();

    expect(tokens.length).toBe(1);
    expect(tokens[0].name).toBe('input');
    expect(tokens[0].attributes.type).toBe('text');
    expect(tokens[0].attributes.name).toBe('user_name');
    expect(tokens[0].attributes.value).toBe('robert');
    expect(tokens[0].attributes.required).toBe('');
  });

  it('treats script and style contents as raw text', () => {
    const html = '<script>if (a < b && b > 0) { console.log("<div>hi</div>"); }</script>';
    const lexer = new Lexer(html);
    const tokens = lexer.tokenize();

    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(TokenType.START_TAG);
    expect(tokens[0].name).toBe('script');
    expect(tokens[1].type).toBe(TokenType.TEXT);
    expect(tokens[1].value).toBe('if (a < b && b > 0) { console.log("<div>hi</div>"); }');
    expect(tokens[2].type).toBe(TokenType.END_TAG);
    expect(tokens[2].name).toBe('script');
  });

  it('tokenizes comments correctly', () => {
    const html = '<!-- This is a comment --><div>Content</div>';
    const lexer = new Lexer(html);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.COMMENT);
    expect(tokens[0].value).toBe(' This is a comment ');
  });
});

describe('DOM Tree Builder', () => {
  it('constructs a nested DOM tree hierarchy', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>My Page</title></head>
        <body>
          <div id="wrapper">
            <h1 class="header">Hello World</h1>
            <p>Welcome to <span>DOM</span> parsing!</p>
          </div>
        </body>
      </html>
    `;

    const doc = parseHTML(html);

    expect(doc.nodeType).toBe(NodeType.DOCUMENT_NODE);
    expect(doc.doctype).not.toBeNull();
    expect(doc.doctype.name).toBe('html');

    const htmlElem = doc.documentElement;
    expect(htmlElem.tagName).toBe('HTML');

    const headElem = doc.head;
    expect(headElem.tagName).toBe('HEAD');
    expect(headElem.children[0].tagName).toBe('TITLE');
    expect(headElem.children[0].textContent).toBe('My Page');

    const bodyElem = doc.body;
    expect(bodyElem.tagName).toBe('BODY');

    const wrapper = bodyElem.firstElementChild;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.id).toBe('wrapper');
    expect(wrapper.children.length).toBe(2);

    const h1 = wrapper.children[0];
    expect(h1.tagName).toBe('H1');
    expect(h1.className).toBe('header');
    expect(h1.textContent).toBe('Hello World');

    const p = wrapper.children[1];
    expect(p.tagName).toBe('P');
    expect(p.textContent).toBe('Welcome to DOM parsing!');
  });

  it('gracefully recovers from unclosed and mismatched tags', () => {
    const html = '<div class="container"><p>Paragraph 1<div>Inner div</p>After</div>';
    const doc = parseHTML(html);

    const container = doc.querySelector('.container');
    expect(container).not.toBeNull();
    expect(container.children.length).toBe(2);
    expect(container.children[0].tagName).toBe('P');
    expect(container.children[1].tagName).toBe('DIV');
  });

  it('auto-closes consecutive <li> items without closing tags', () => {
    const html = '<ul><li>First<li>Second<li>Third</ul>';
    const doc = parseHTML(html);
    const ul = doc.querySelector('ul');
    expect(ul.children.length).toBe(3);
    expect(ul.children[0].textContent).toBe('First');
    expect(ul.children[1].textContent).toBe('Second');
    expect(ul.children[2].textContent).toBe('Third');
  });
});

describe('DOM Query Methods', () => {
  const sampleHTML = `
    <main id="app">
      <nav class="navbar">
        <a href="/" class="nav-link active">Home</a>
        <a href="/about" class="nav-link">About</a>
        <a href="/contact" class="nav-link disabled" target="_blank">Contact</a>
      </nav>
      <section class="content">
        <article class="post featured" data-id="101">
          <h2 class="title">First Article</h2>
          <p class="summary">Summary text here.</p>
        </article>
        <article class="post" data-id="102">
          <h2 class="title">Second Article</h2>
          <p class="summary">Another summary.</p>
        </article>
      </section>
    </main>
  `;

  it('getElementById finds element', () => {
    const doc = parseHTML(sampleHTML);
    const app = doc.getElementById('app');
    expect(app).not.toBeNull();
    expect(app.tagName).toBe('MAIN');
  });

  it('getElementsByClassName finds matching elements', () => {
    const doc = parseHTML(sampleHTML);
    const links = doc.getElementsByClassName('nav-link');
    expect(links.length).toBe(3);
    expect(links[0].textContent).toBe('Home');
  });

  it('getElementsByTagName finds matching elements', () => {
    const doc = parseHTML(sampleHTML);
    const articles = doc.getElementsByTagName('article');
    expect(articles.length).toBe(2);
  });

  it('querySelector and querySelectorAll support complex selectors', () => {
    const doc = parseHTML(sampleHTML);

    // Tag and class
    const featured = doc.querySelector('article.featured');
    expect(featured).not.toBeNull();
    expect(featured.getAttribute('data-id')).toBe('101');

    // Child combinator
    const titles = doc.querySelectorAll('article.post > h2.title');
    expect(titles.length).toBe(2);
    expect(titles[0].textContent).toBe('First Article');
    expect(titles[1].textContent).toBe('Second Article');

    // Attribute selectors
    const blankLink = doc.querySelector('a[target="_blank"]');
    expect(blankLink).not.toBeNull();
    expect(blankLink.textContent).toBe('Contact');

    // Multi-class matching
    const activeLink = doc.querySelector('.nav-link.active');
    expect(activeLink).not.toBeNull();
    expect(activeLink.textContent).toBe('Home');

    // Pseudo-class :first-child
    const firstLink = doc.querySelector('.navbar a:first-child');
    expect(firstLink).not.toBeNull();
    expect(firstLink.textContent).toBe('Home');
  });

  it('supports closest() ancestor matching', () => {
    const doc = parseHTML(sampleHTML);
    const title = doc.querySelector('article.featured h2.title');
    expect(title).not.toBeNull();

    const parentArticle = title.closest('article');
    expect(parentArticle).not.toBeNull();
    expect(parentArticle.getAttribute('data-id')).toBe('101');

    const mainApp = title.closest('#app');
    expect(mainApp).not.toBeNull();
    expect(mainApp.tagName).toBe('MAIN');
  });
});

describe('Node Sibling & Tree Navigation', () => {
  it('navigates through element and node siblings', () => {
    const html = `<div><!-- note --><h1>Title</h1><p>Text</p></div>`;
    const doc = parseHTML(html);
    const div = doc.firstElementChild;

    const h1 = div.children[0];
    const p = div.children[1];

    expect(h1.nextElementSibling).toBe(p);
    expect(p.previousElementSibling).toBe(h1);
    expect(div.contains(h1)).toBe(true);
    expect(div.contains(p)).toBe(true);
  });
});

describe('Node Manipulation and Serialization', () => {
  it('supports classList methods', () => {
    const doc = parseHTML('<div class="alpha beta"></div>');
    const div = doc.firstElementChild;

    expect(div.classList.contains('alpha')).toBe(true);
    expect(div.classList.contains('gamma')).toBe(false);

    div.classList.add('gamma');
    expect(div.classList.contains('gamma')).toBe(true);
    expect(div.className).toBe('alpha beta gamma');

    div.classList.remove('alpha');
    expect(div.classList.contains('alpha')).toBe(false);
    expect(div.className).toBe('beta gamma');

    div.classList.toggle('gamma');
    expect(div.classList.contains('gamma')).toBe(false);
  });

  it('supports appendChild, removeChild, and insertBefore', () => {
    const doc = parseHTML('<ul><li>Item 1</li><li>Item 3</li></ul>');
    const ul = doc.querySelector('ul');

    const item2 = doc.createElement('li');
    item2.textContent = 'Item 2';

    const item3 = ul.children[1];
    ul.insertBefore(item2, item3);

    expect(ul.children.length).toBe(3);
    expect(ul.children[0].textContent).toBe('Item 1');
    expect(ul.children[1].textContent).toBe('Item 2');
    expect(ul.children[2].textContent).toBe('Item 3');

    ul.removeChild(ul.children[0]);
    expect(ul.children.length).toBe(2);
    expect(ul.children[0].textContent).toBe('Item 2');
  });

  it('serializes outerHTML and innerHTML correctly', () => {
    const doc = parseHTML('<div id="box"><p>Hello <strong>World</strong>!</p><img src="test.jpg"></div>');
    const div = doc.querySelector('#box');

    expect(div.outerHTML).toBe('<div id="box"><p>Hello <strong>World</strong>!</p><img src="test.jpg"></div>');
    expect(div.innerHTML).toBe('<p>Hello <strong>World</strong>!</p><img src="test.jpg">');
  });

  it('serializes to JSON AST cleanly', () => {
    const doc = parseHTML('<button type="submit" class="btn">Click Me</button>');
    const json = doc.toJSON();

    expect(json.nodeType).toBe(NodeType.DOCUMENT_NODE);
    expect(json.childNodes.length).toBe(1);

    const btn = json.childNodes[0];
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.attributes.type).toBe('submit');
    expect(btn.attributes.class).toBe('btn');
    expect(btn.childNodes[0].data).toBe('Click Me');
  });

  it('works with CustomDOMParser drop-in', () => {
    const parser = new CustomDOMParser();
    const doc = parser.parseFromString('<div id="root">Hello</div>', 'text/html');
    expect(doc.getElementById('root').textContent).toBe('Hello');
  });
});
