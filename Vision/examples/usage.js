/**
 * Example demonstrating how to use the Custom HTML DOM Parser in a JavaScript program.
 * Run with: node examples/usage.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML, CustomDOMParser } from '../src/parser/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Read an HTML file
const samplePath = path.join(__dirname, '../samples/landing-page.html');
const rawHtml = fs.readFileSync(samplePath, 'utf8');

console.log('='.repeat(60));
console.log('--- Custom HTML Parser to DOM Tree Demo ---');
console.log('='.repeat(60));

// 2. Parse into a DOM Tree
console.time('HTML Parsing Time');
const doc = parseHTML(rawHtml);
console.timeEnd('HTML Parsing Time');

// 3. Query the DOM tree using standard selectors
const siteHeader = doc.getElementById('site-header');
console.log('\n[1] Found Header by ID: <' + siteHeader.tagName + ' class="' + siteHeader.className + '">');

// 4. Query all feature cards
const featureCards = doc.querySelectorAll('.feature-card');
console.log(`\n[2] Found ${featureCards.length} Feature Cards:`);
featureCards.forEach((card, index) => {
  const category = card.getAttribute('data-category');
  const title = card.querySelector('h3').textContent;
  const description = card.querySelector('p').textContent;
  console.log(`  Card #${index + 1} [Category: ${category}]: "${title}" -> ${description}`);
});

// 5. Query using child combinators & attribute selectors
const ctaButtons = doc.querySelectorAll('.cta-group > .btn');
console.log(`\n[3] Found ${ctaButtons.length} CTA Buttons:`);
ctaButtons.forEach(btn => {
  console.log(`  Button text: "${btn.textContent}", href: "${btn.getAttribute('href')}"`);
});

// 6. Manipulate the DOM tree programmatically
console.log('\n[4] Manipulating the DOM Tree:');
const newCard = doc.createElement('div');
newCard.className = 'feature-card';
newCard.setAttribute('data-category', 'ai');

const newTitle = doc.createElement('h3');
newTitle.textContent = 'Agentic Workflows';
newCard.appendChild(newTitle);

const newDesc = doc.createElement('p');
newDesc.textContent = 'Autonomous multi-step execution with deep introspection.';
newCard.appendChild(newDesc);

const featureGrid = doc.querySelector('.feature-grid');
featureGrid.appendChild(newCard);
console.log('  -> Appended new Feature Card ("Agentic Workflows") to .feature-grid');
console.log(`  -> New feature card count: ${doc.querySelectorAll('.feature-card').length}`);

// 7. Using drop-in CustomDOMParser
console.log('\n[5] Using drop-in CustomDOMParser:');
const domParser = new CustomDOMParser();
const miniDoc = domParser.parseFromString('<div id="test"><span class="highlight">Success!</span></div>');
console.log('  Result text:', miniDoc.querySelector('.highlight').textContent);

console.log('\n' + '='.repeat(60));
console.log('DOM parsing & manipulation completed successfully!');
console.log('='.repeat(60));
