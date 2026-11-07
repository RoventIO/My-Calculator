/**
 * Main Web Application Controller for DOMCraft
 */

import { Lexer, TreeBuilder, NodeType, TokenType } from './parser/index.js';
import { PRESETS } from './presets.js';
import { escapeHTML } from './parser/entities.js';

// Application State
let currentDoc = null;
let currentTokens = [];
let selectedNode = null;
let nodeMap = new Map(); // id -> Node
let nextNodeId = 1;

// DOM Elements
const editor = document.getElementById('html-editor');
const lineNumbers = document.getElementById('line-numbers');
const presetSelect = document.getElementById('preset-select');
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const activeFilename = document.getElementById('active-filename');

// Stats
const statTime = document.getElementById('stat-time');
const statNodes = document.getElementById('stat-nodes');
const statElements = document.getElementById('stat-elements');
const statDepth = document.getElementById('stat-depth');

// Buttons
const btnParse = document.getElementById('btn-parse');
const btnClear = document.getElementById('btn-clear');
const btnFormat = document.getElementById('btn-format');
const btnExportJson = document.getElementById('btn-export-json');
const btnExpandAll = document.getElementById('btn-expand-all');
const btnCollapseAll = document.getElementById('btn-collapse-all');
const treeSearchInput = document.getElementById('tree-search-input');

// Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Tree & Inspector
const treeCanvas = document.getElementById('tree-canvas');
const inspTag = document.getElementById('insp-tag');
const inspType = document.getElementById('insp-type');
const inspId = document.getElementById('insp-id');
const inspChildrenCount = document.getElementById('insp-children-count');
const inspAttrBody = document.getElementById('insp-attr-body');
const inspAttrCount = document.getElementById('insp-attr-count');
const inspOuterHtml = document.getElementById('insp-outer-html');
const inspJsCode = document.getElementById('insp-js-code');
const inspectorBreadcrumbs = document.getElementById('inspector-breadcrumbs');

// Query Playground
const queryInput = document.getElementById('query-input');
const btnRunQuery = document.getElementById('btn-run-query');
const queryResultCount = document.getElementById('query-result-count');
const queryExecTime = document.getElementById('query-exec-time');
const queryResultsBody = document.getElementById('query-results-body');
const queryChips = document.querySelectorAll('.query-chip');

// Token Stream
const tokenTableBody = document.getElementById('token-table-body');

// AST & Compare
const astJsonBox = document.getElementById('ast-json-box');
const btnCopyAst = document.getElementById('btn-copy-ast');
const btnDownloadAst = document.getElementById('btn-download-ast');
const compCustomElements = document.getElementById('comp-custom-elements');
const compCustomTime = document.getElementById('comp-custom-time');
const compNativeElements = document.getElementById('comp-native-elements');
const compNativeTime = document.getElementById('comp-native-time');

/**
 * Initialize App
 */
function init() {
  setupTabs();
  setupEditor();
  setupPresets();
  setupFileUpload();
  setupQueryPlayground();
  setupExportButtons();

  // Load default preset
  loadPreset('landingPage');
}

/**
 * Tab Switching
 */
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

/**
 * Editor Setup & Line Numbers
 */
function setupEditor() {
  function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
      numbers += i + '\n';
    }
    lineNumbers.textContent = numbers;
  }

  editor.addEventListener('input', () => {
    updateLineNumbers();
  });

  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });

  btnParse.addEventListener('click', parseCurrentHTML);

  btnClear.addEventListener('click', () => {
    editor.value = '';
    activeFilename.textContent = 'empty';
    updateLineNumbers();
    parseCurrentHTML();
  });

  btnFormat.addEventListener('click', () => {
    if (!currentDoc) return;
    const formatted = formatNode(currentDoc);
    editor.value = formatted.trim();
    updateLineNumbers();
    parseCurrentHTML();
  });

  updateLineNumbers();
}

/**
 * Presets Setup
 */
function setupPresets() {
  presetSelect.addEventListener('change', (e) => {
    loadPreset(e.target.value);
  });
}

function loadPreset(key) {
  const preset = PRESETS[key];
  if (preset) {
    editor.value = preset.html.trim();
    activeFilename.textContent = `preset: ${key}`;
    const lines = editor.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) numbers += i + '\n';
    lineNumbers.textContent = numbers;
    parseCurrentHTML();
  }
}

/**
 * File Upload & Drag-and-Drop
 */
function setupFileUpload() {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      readFile(file);
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      readFile(file);
    }
  });
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    editor.value = e.target.result;
    activeFilename.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    const lines = editor.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) numbers += i + '\n';
    lineNumbers.textContent = numbers;
    parseCurrentHTML();
  };
  reader.readAsText(file);
}

/**
 * Main Parse Function
 */
function parseCurrentHTML() {
  const rawHtml = editor.value;
  nodeMap.clear();
  nextNodeId = 1;
  selectedNode = null;

  // 1. Measure custom parser
  const t0 = performance.now();
  const lexer = new Lexer(rawHtml);
  currentTokens = lexer.tokenize();
  const builder = new TreeBuilder();
  currentDoc = builder.build(currentTokens);
  const t1 = performance.now();
  const customDuration = (t1 - t0).toFixed(2);

  // 2. Measure Native Browser DOMParser for comparison
  let nativeElementsCount = 0;
  let nativeDuration = '0.00';
  try {
    const natT0 = performance.now();
    const nativeParser = new DOMParser();
    const nativeDoc = nativeParser.parseFromString(rawHtml, 'text/html');
    const natT1 = performance.now();
    nativeDuration = (natT1 - natT0).toFixed(2);
    nativeElementsCount = nativeDoc.querySelectorAll('*').length;
  } catch (err) {
    console.error('Native parser error:', err);
  }

  // 3. Compute Tree Statistics
  const stats = calculateTreeStats(currentDoc);

  // 4. Update UI Header Stats
  statTime.textContent = `${customDuration} ms`;
  statNodes.textContent = stats.totalNodes;
  statElements.textContent = stats.elements;
  statDepth.textContent = stats.maxDepth;

  // 5. Update Comparison Tab
  compCustomElements.textContent = stats.elements;
  compCustomTime.textContent = `${customDuration} ms`;
  compNativeElements.textContent = nativeElementsCount;
  compNativeTime.textContent = `${nativeDuration} ms`;

  // 6. Render Views
  renderTreeCanvas(currentDoc);
  renderTokenTable(currentTokens);
  renderASTJson(currentDoc);

  // Select root or first element for inspector
  const initialInspect = currentDoc.firstElementChild || currentDoc;
  inspectNode(initialInspect);

  // Run current query in playground
  runCurrentQuery();
}

/**
 * Computes tree metrics: total nodes, elements, comments, max depth
 */
function calculateTreeStats(root) {
  let totalNodes = 0;
  let elements = 0;
  let comments = 0;
  let maxDepth = 0;

  function traverse(node, depth) {
    totalNodes++;
    if (depth > maxDepth) maxDepth = depth;

    if (node.nodeType === NodeType.ELEMENT_NODE) elements++;
    if (node.nodeType === NodeType.COMMENT_NODE) comments++;

    if (node.childNodes) {
      for (const child of node.childNodes) {
        traverse(child, depth + 1);
      }
    }
  }

  traverse(root, 1);
  return { totalNodes, elements, comments, maxDepth };
}

/**
 * Render DOM Tree Visualizer
 */
function renderTreeCanvas(doc) {
  treeCanvas.innerHTML = '';
  if (!doc || doc.childNodes.length === 0) {
    treeCanvas.innerHTML = '<div style="color: var(--text-faint); padding: 20px;">No DOM tree generated. Enter HTML to parse.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const child of doc.childNodes) {
    fragment.appendChild(createTreeNodeDOM(child));
  }
  treeCanvas.appendChild(fragment);

  setupTreeSearch();
}

/**
 * Create DOM element for a single Node in the Visual Tree
 */
function createTreeNodeDOM(node) {
  const nodeId = `node_${nextNodeId++}`;
  nodeMap.set(nodeId, node);
  node._visualId = nodeId;

  const container = document.createElement('div');
  container.className = 'tree-node-item';
  container.id = `item_${nodeId}`;

  const row = document.createElement('div');
  row.className = 'tree-node-row';
  row.id = `row_${nodeId}`;
  row.setAttribute('data-node-id', nodeId);

  // Row Click -> Inspect Node
  row.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    inspectNode(node);
  });

  const hasChildren = node.childNodes && node.childNodes.length > 0;

  // Toggle Icon for collapsible branch
  const toggle = document.createElement('span');
  toggle.className = 'toggle-icon';
  if (hasChildren) {
    toggle.textContent = '▼';
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = container.classList.toggle('collapsed');
      toggle.textContent = isCollapsed ? '▶' : '▼';
    });
  } else {
    toggle.innerHTML = '&nbsp;';
  }
  row.appendChild(toggle);

  // Render based on Node Type
  if (node.nodeType === NodeType.ELEMENT_NODE) {
    const openTag = document.createElement('span');

    let html = `<span class="tag-bracket">&lt;</span><span class="tag-name">${node.localName}</span>`;

    // Render attributes
    const attrs = Object.entries(node.attributes);
    for (const [key, val] of attrs) {
      if (val === '') {
        html += ` <span class="tag-attr-name">${key}</span>`;
      } else {
        html += ` <span class="tag-attr-name">${key}</span><span class="tag-bracket">=</span><span class="tag-attr-val">"${escapeHTML(val)}"</span>`;
      }
    }

    html += `<span class="tag-bracket">&gt;</span>`;
    openTag.innerHTML = html;
    row.appendChild(openTag);

    container.appendChild(row);

    // If has child nodes, render children container
    if (hasChildren) {
      const childrenBox = document.createElement('div');
      childrenBox.className = 'node-children-container';

      for (const child of node.childNodes) {
        childrenBox.appendChild(createTreeNodeDOM(child));
      }

      container.appendChild(childrenBox);

      // Closing Tag row
      const closeRow = document.createElement('div');
      closeRow.className = 'tree-node-row close-row';
      closeRow.style.paddingLeft = '20px';
      closeRow.innerHTML = `<span class="tag-bracket">&lt;/</span><span class="tag-name">${node.localName}</span><span class="tag-bracket">&gt;</span>`;
      container.appendChild(closeRow);
    }
  } else if (node.nodeType === NodeType.TEXT_NODE) {
    const textPreview = node.data.trim();
    if (!textPreview) {
      // Empty whitespace text node
      row.innerHTML += `<span style="color: var(--text-faint); font-size: 11px;">#text: (whitespace)</span>`;
    } else {
      const preview = textPreview.length > 60 ? textPreview.slice(0, 60) + '…' : textPreview;
      row.innerHTML += `<span style="color: var(--color-purple); font-size: 11px; margin-right: 6px;">#text</span><span class="tag-text-val">"${escapeHTML(preview)}"</span>`;
    }
    container.appendChild(row);
  } else if (node.nodeType === NodeType.COMMENT_NODE) {
    row.innerHTML += `<span class="tag-comment-val">&lt;!-- ${escapeHTML(node.data)} --&gt;</span>`;
    container.appendChild(row);
  } else if (node.nodeType === NodeType.DOCUMENT_TYPE_NODE) {
    row.innerHTML += `<span style="color: var(--color-cyan); font-weight: 700;">&lt;!DOCTYPE ${node.name}&gt;</span>`;
    container.appendChild(row);
  }

  return container;
}

/**
 * Expand All / Collapse All controls
 */
btnExpandAll.addEventListener('click', () => {
  document.querySelectorAll('.tree-node-item.collapsed').forEach(item => {
    item.classList.remove('collapsed');
    const toggle = item.querySelector('.toggle-icon');
    if (toggle) toggle.textContent = '▼';
  });
});

btnCollapseAll.addEventListener('click', () => {
  document.querySelectorAll('.tree-node-item').forEach(item => {
    if (item.querySelector('.node-children-container')) {
      item.classList.add('collapsed');
      const toggle = item.querySelector('.toggle-icon');
      if (toggle) toggle.textContent = '▶';
    }
  });
});

/**
 * Tree Search & Filter
 */
function setupTreeSearch() {
  treeSearchInput.addEventListener('input', () => {
    const query = treeSearchInput.value.trim().toLowerCase();
    document.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('highlighted'));

    if (!query) return;

    for (const [nodeId, node] of nodeMap.entries()) {
      let match = false;
      if (node.nodeType === NodeType.ELEMENT_NODE) {
        if (node.localName.includes(query)) match = true;
        if (node.id && node.id.toLowerCase().includes(query)) match = true;
        if (node.className && node.className.toLowerCase().includes(query)) match = true;
      } else if (node.nodeType === NodeType.TEXT_NODE) {
        if (node.data.toLowerCase().includes(query)) match = true;
      }

      if (match) {
        const row = document.getElementById(`row_${nodeId}`);
        if (row) {
          row.classList.add('highlighted');
          // Uncollapse ancestors so matched node is visible
          let parent = row.closest('.tree-node-item');
          while (parent) {
            parent.classList.remove('collapsed');
            const toggle = parent.querySelector('.toggle-icon');
            if (toggle) toggle.textContent = '▼';
            parent = parent.parentElement ? parent.parentElement.closest('.tree-node-item') : null;
          }
        }
      }
    }
  });
}

/**
 * Inspect Node in Node Inspector Tab
 */
function inspectNode(node) {
  if (!node) return;
  selectedNode = node;

  // Highlight corresponding row in tree
  if (node._visualId) {
    document.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('selected'));
    const targetRow = document.getElementById(`row_${node._visualId}`);
    if (targetRow) {
      targetRow.classList.add('selected');
    }
  }

  // Update Breadcrumbs
  renderBreadcrumbs(node);

  if (node.nodeType === NodeType.ELEMENT_NODE) {
    inspTag.textContent = `<${node.localName}>`;
    inspType.textContent = '1 (ELEMENT_NODE)';
    inspId.textContent = node.id || '(none)';
    inspChildrenCount.textContent = `${node.children.length} elements (${node.childNodes.length} total)`;

    // Attributes Table
    const attrs = Object.entries(node.attributes);
    inspAttrCount.textContent = `${attrs.length} attributes`;
    if (attrs.length === 0) {
      inspAttrBody.innerHTML = '<tr><td colspan="2" style="color: var(--text-faint)">No attributes</td></tr>';
    } else {
      inspAttrBody.innerHTML = attrs.map(([key, val]) => `
        <tr>
          <td style="color: var(--tag-attr-name); font-weight: 600;">${key}</td>
          <td style="color: var(--tag-attr-val);">${escapeHTML(val)}</td>
        </tr>
      `).join('');
    }

    // Outer HTML
    inspOuterHtml.textContent = node.outerHTML;

    // Generated JS Code Snippet
    let selector = node.localName;
    if (node.id) {
      selector = `#${node.id}`;
    } else if (node.className) {
      selector = `${node.localName}.${node.className.trim().split(/\s+/).join('.')}`;
    }
    inspJsCode.textContent = `const element = doc.querySelector("${selector}");\nconsole.log(element.textContent);`;
  } else if (node.nodeType === NodeType.TEXT_NODE) {
    inspTag.textContent = '#text';
    inspType.textContent = '3 (TEXT_NODE)';
    inspId.textContent = '(none)';
    inspChildrenCount.textContent = '0';
    inspAttrCount.textContent = '0 attributes';
    inspAttrBody.innerHTML = '<tr><td colspan="2" style="color: var(--text-faint)">Text nodes have no attributes</td></tr>';
    inspOuterHtml.textContent = node.data;
    inspJsCode.textContent = `// TextNode content\nnode.data = "${escapeHTML(node.data.slice(0, 30))}";`;
  } else if (node.nodeType === NodeType.COMMENT_NODE) {
    inspTag.textContent = '#comment';
    inspType.textContent = '8 (COMMENT_NODE)';
    inspId.textContent = '(none)';
    inspChildrenCount.textContent = '0';
    inspAttrCount.textContent = '0 attributes';
    inspAttrBody.innerHTML = '<tr><td colspan="2" style="color: var(--text-faint)">Comment nodes have no attributes</td></tr>';
    inspOuterHtml.textContent = `<!-- ${node.data} -->`;
    inspJsCode.textContent = `// Comment Node`;
  } else {
    inspTag.textContent = node.nodeName;
    inspType.textContent = `${node.nodeType}`;
    inspId.textContent = '(none)';
    inspChildrenCount.textContent = `${node.childNodes.length}`;
    inspAttrCount.textContent = '0 attributes';
    inspAttrBody.innerHTML = '<tr><td colspan="2" style="color: var(--text-faint)">No attributes</td></tr>';
    inspOuterHtml.textContent = '';
    inspJsCode.textContent = '';
  }
}

/**
 * Render Breadcrumbs for selected Node
 */
function renderBreadcrumbs(node) {
  const chain = [];
  let curr = node;
  while (curr) {
    chain.unshift(curr);
    curr = curr.parentNode;
  }

  inspectorBreadcrumbs.innerHTML = '';
  chain.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.className = 'crumb-btn';
    let label = item.nodeName;
    if (item.nodeType === NodeType.ELEMENT_NODE) {
      label = item.localName;
      if (item.id) label += `#${item.id}`;
      else if (item.className) label += `.${item.className.split(/\s+/)[0]}`;
    }
    btn.textContent = label;
    btn.addEventListener('click', () => inspectNode(item));
    inspectorBreadcrumbs.appendChild(btn);

    if (index < chain.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = ' > ';
      inspectorBreadcrumbs.appendChild(sep);
    }
  });
}

/**
 * Copy Helpers
 */
document.getElementById('btn-copy-js').addEventListener('click', () => {
  navigator.clipboard.writeText(inspJsCode.textContent);
});

document.getElementById('btn-copy-outer-html').addEventListener('click', () => {
  navigator.clipboard.writeText(inspOuterHtml.textContent);
});

/**
 * Query Playground Setup
 */
function setupQueryPlayground() {
  btnRunQuery.addEventListener('click', runCurrentQuery);

  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      runCurrentQuery();
    }
  });

  queryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      queryInput.value = chip.getAttribute('data-query');
      runCurrentQuery();
    });
  });
}

function runCurrentQuery() {
  if (!currentDoc) return;
  const selector = queryInput.value.trim();
  if (!selector) return;

  const t0 = performance.now();
  let matches = [];
  try {
    matches = currentDoc.querySelectorAll(selector);
  } catch (err) {
    queryResultsBody.innerHTML = `<div style="color: var(--color-danger)">Selector Error: ${escapeHTML(err.message)}</div>`;
    return;
  }
  const t1 = performance.now();

  queryResultCount.textContent = `Matches: ${matches.length}`;
  queryExecTime.textContent = `${(t1 - t0).toFixed(2)} ms`;

  // Highlight matches in tree
  document.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('highlighted'));
  matches.forEach(m => {
    if (m._visualId) {
      const row = document.getElementById(`row_${m._visualId}`);
      if (row) row.classList.add('highlighted');
    }
  });

  if (matches.length === 0) {
    queryResultsBody.innerHTML = '<div style="color: var(--text-faint); padding: 12px;">No elements matched the selector.</div>';
    return;
  }

  queryResultsBody.innerHTML = matches.map((match, idx) => {
    const textPreview = match.textContent.trim().slice(0, 80);
    return `
      <div class="query-result-card" data-index="${idx}">
        <div class="query-result-header">
          <span style="color: var(--color-primary); font-weight: 700;">#${idx + 1} &lt;${match.localName}&gt;</span>
          <span style="color: var(--text-faint); font-size: 11px;">children: ${match.children.length}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">
          ${escapeHTML(match.outerHTML.slice(0, 100))}${match.outerHTML.length > 100 ? '…' : ''}
        </div>
        ${textPreview ? `<div style="font-size: 12px; color: var(--tag-text); font-style: italic;">"${escapeHTML(textPreview)}"</div>` : ''}
      </div>
    `;
  }).join('');

  // Add click to inspect on cards
  const cards = queryResultsBody.querySelectorAll('.query-result-card');
  cards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      inspectNode(matches[idx]);
      // Switch to inspector tab
      document.querySelector('[data-tab="tab-inspector"]').click();
    });
  });
}

/**
 * Render Lexer Token Table
 */
function renderTokenTable(tokens) {
  tokenTableBody.innerHTML = '';
  if (!tokens || tokens.length === 0) return;

  const rows = tokens.map((t, idx) => {
    let nameOrVal = t.name || '';
    let attrOrContent = '';

    if (t.type === TokenType.START_TAG) {
      const attrs = Object.entries(t.attributes || {});
      attrOrContent = attrs.map(([k, v]) => `${k}="${v}"`).join(' ');
    } else if (t.type === TokenType.TEXT) {
      nameOrVal = `"${t.value.slice(0, 30)}${t.value.length > 30 ? '…' : ''}"`;
    } else if (t.type === TokenType.COMMENT) {
      nameOrVal = `"${t.value.slice(0, 30)}"`;
    } else if (t.type === TokenType.DOCTYPE) {
      nameOrVal = t.value;
    }

    return `
      <tr>
        <td style="color: var(--text-faint);">${idx + 1}</td>
        <td><span class="token-badge badge-${t.type}">${t.type}</span></td>
        <td style="color: var(--color-primary); font-weight: 600;">${escapeHTML(nameOrVal)}</td>
        <td style="color: var(--text-muted); font-size: 11px;">${escapeHTML(attrOrContent)}</td>
        <td style="color: var(--text-faint); font-size: 11px;">L${t.line}:C${t.column}</td>
      </tr>
    `;
  }).join('');

  tokenTableBody.innerHTML = rows;
}

/**
 * Render JSON AST & Exports
 */
function renderASTJson(doc) {
  if (!doc) return;
  const json = doc.toJSON();
  const formatted = JSON.stringify(json, null, 2);
  astJsonBox.textContent = formatted;
}

function setupExportButtons() {
  btnCopyAst.addEventListener('click', () => {
    navigator.clipboard.writeText(astJsonBox.textContent);
  });

  btnExportJson.addEventListener('click', downloadASTFile);
  btnDownloadAst.addEventListener('click', downloadASTFile);
}

function downloadASTFile() {
  if (!currentDoc) return;
  const jsonStr = JSON.stringify(currentDoc.toJSON(), null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'parsed-dom-tree.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Simple HTML Formatter / Beautifier
 */
function formatNode(node, depth = 0) {
  const indent = '  '.repeat(depth);

  if (node.nodeType === NodeType.DOCUMENT_NODE) {
    return node.childNodes.map(c => formatNode(c, depth)).join('\n');
  }

  if (node.nodeType === NodeType.DOCUMENT_TYPE_NODE) {
    return `<!DOCTYPE ${node.name}>`;
  }

  if (node.nodeType === NodeType.COMMENT_NODE) {
    return `${indent}<!-- ${node.data.trim()} -->`;
  }

  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = node.data.trim();
    return text ? `${indent}${text}` : '';
  }

  if (node.nodeType === NodeType.ELEMENT_NODE) {
    const attrs = Object.entries(node.attributes).map(([k, v]) => v === '' ? k : `${k}="${escapeHTML(v)}"`).join(' ');
    const attrStr = attrs ? ` ${attrs}` : '';

    if (['img', 'br', 'hr', 'input', 'meta', 'link'].includes(node.localName)) {
      return `${indent}<${node.localName}${attrStr}>`;
    }

    if (node.childNodes.length === 1 && node.childNodes[0].nodeType === NodeType.TEXT_NODE) {
      return `${indent}<${node.localName}${attrStr}>${escapeHTML(node.childNodes[0].data.trim())}</${node.localName}>`;
    }

    const childrenHtml = node.childNodes
      .map(c => formatNode(c, depth + 1))
      .filter(Boolean)
      .join('\n');

    return `${indent}<${node.localName}${attrStr}>\n${childrenHtml}\n${indent}</${node.localName}>`;
  }

  return '';
}

// Start Application
window.addEventListener('DOMContentLoaded', init);
