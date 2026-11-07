# DOMCraft - Custom HTML Parser to DOM Tree Studio

A custom HTML parser built from scratch in modern JavaScript that converts raw HTML documents into a navigable, W3C-compatible DOM tree. It includes a visual web application for uploading, inspecting, and manipulating DOM trees in real time.

---

## Features

### 1. Custom HTML Parser Engine (`src/parser/`)
* **Lexer / Tokenizer (`lexer.js`)**:
  * Emits typed tokens: `DOCTYPE`, `START_TAG`, `END_TAG`, `TEXT`, and `COMMENT`.
  * Preserves line and column position for debugging and token streams.
  * Auto-identifies void elements (`<area>`, `<base>`, `<br>`, `<col>`, `<embed>`, `<hr>`, `<img>`, `<input>`, `<link>`, `<meta>`, `<param>`, `<source>`, `<track>`, `<wbr>`) and XML-style self-closing tags (`<tag />`).
  * Handles raw text elements (`<script>`, `<style>`, `<textarea>`, `<title>`) so inner `<` / `>` operators are not parsed as HTML tags.
  * Decodes standard HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&copy;`, numeric decimal and hex codes).
* **Tree Builder (`treeBuilder.js`)**:
  * Stack-based tree construction engine.
  * Fault-tolerant auto-recovery for mismatched or unclosed tags.
  * Implements HTML5 auto-closing tag behaviors (e.g., auto-closing `<p>` before block elements, auto-closing consecutive `<li>`, `<tr>`, `<td>`, `<option>`).
* **DOM Node Hierarchy (`nodes.js`)**:
  * Full node hierarchy: `DocumentNode`, `ElementNode`, `TextNode`, `CommentNode`, `DocumentTypeNode`.
  * Standard properties: `parentNode`, `parentElement`, `childNodes`, `children`, `firstChild`, `lastChild`, `nextElementSibling`, `previousElementSibling`.
  * Class manipulation: `node.classList` (`add`, `remove`, `contains`, `toggle`).
  * Attribute manipulation: `getAttribute()`, `setAttribute()`, `hasAttribute()`, `removeAttribute()`.
  * Serialization: `innerHTML`, `outerHTML`, `textContent`, `toJSON()`.
  * DOM mutation: `appendChild()`, `removeChild()`, `insertBefore()`, `replaceChild()`, `cloneNode()`.
* **CSS Selector Matcher (`selector.js`)**:
  * Supports:
    * Tag selectors (`div`, `p`, `*`)
    * ID selectors (`#app`, `header#main`)
    * Class selectors (`.btn`, `.btn.primary`)
    * Attribute selectors (`[attr]`, `[attr="val"]`, `[attr^="prefix"]`, `[attr$="suffix"]`, `[attr*="substr"]`)
    * Descendant combinator (`div p`)
    * Direct child combinator (`ul > li`)
    * Comma-separated groups (`h1, h2, h3`)
    * Pseudo-classes (`:first-child`, `:last-child`, `:empty`)
  * Methods: `querySelector()`, `querySelectorAll()`, `getElementById()`, `getElementsByClassName()`, `getElementsByTagName()`, `matches()`, `closest()`.

---

## 2. Interactive Web Application

The included web studio provides:
1. **Source Code Editor & File Drop Zone**:
   * Drag-and-drop or upload any `.html` file.
   * Built-in presets (Semantic SaaS Landing Page, Admin Dashboard, Fault-Tolerant Malformed HTML, Scripts & Entities).
   * Line numbers and HTML beautifier / formatter.
2. **Interactive DOM Tree Visualizer**:
   * Collapsible hierarchical node tree with color-coded syntax highlighting.
   * Real-time search/filter input to highlight matching elements.
   * "Expand All" / "Collapse All" controls.
3. **Node Property Inspector**:
   * Click any node in the tree to inspect tag name, node type, ID, classes, depth, and child counts.
   * Dynamic breadcrumbs showing the full ancestor hierarchy.
   * Attributes table with name/value pairs.
   * Code snippets generating ready-to-use JavaScript queries.
4. **JavaScript / CSS Query Playground**:
   * Live console to query the custom DOM tree in real time with execution timings.
5. **Lexer Token Stream Inspector**:
   * Detailed breakdown of every token emitted by the tokenizer (type, attributes, line/col).
6. **JSON AST Viewer & Export**:
   * Full tree AST exported as structured JSON with one-click download.
7. **Native DOM vs Custom Comparison**:
   * Side-by-side performance and element count comparison against the browser's native `DOMParser()`.

---

## Quick Start

### 1. Run the Web Application
```bash
# Start local development server
npm run dev
```
Open the provided local URL (typically `http://localhost:5173`) in your web browser.

### 2. Run the Test Suite
```bash
npm test
```

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## Using the Parser in a JavaScript Program

You can use the parser directly in any Node.js or browser project without UI dependencies:

```javascript
import { parseHTML, CustomDOMParser } from './src/parser/index.js';

// 1. Parse HTML into a DOM Tree
const html = `
  <div id="container">
    <h1 class="title">Hello World</h1>
    <ul class="items">
      <li data-id="1">First item</li>
      <li data-id="2">Second item</li>
    </ul>
  </div>
`;

const doc = parseHTML(html);

// 2. Query the DOM tree
const heading = doc.querySelector('h1.title');
console.log(heading.textContent); // "Hello World"

const items = doc.querySelectorAll('ul.items > li');
items.forEach(li => {
  console.log(`Item #${li.getAttribute('data-id')}: ${li.textContent}`);
});

// 3. Mutate elements
const container = doc.getElementById('container');
const newPara = doc.createElement('p');
newPara.textContent = 'Appended dynamically!';
newPara.classList.add('footnote');
container.appendChild(newPara);

// 4. Re-serialize to HTML
console.log(container.outerHTML);

// 5. Or use drop-in CustomDOMParser
const parser = new CustomDOMParser();
const doc2 = parser.parseFromString('<button disabled>Click</button>', 'text/html');
console.log(doc2.querySelector('button').hasAttribute('disabled')); // true
```

Run the included example script:
```bash
node examples/usage.js
```
