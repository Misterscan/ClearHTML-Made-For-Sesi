#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ── Tokenizer ──────────────────────────────────────────────────────────────────
const T = { WORD: 0, STRING: 1, LBRACE: 2, RBRACE: 3, EQUALS: 4, EOF: 5, NL: 6 };

// Characters that are part of a word/identifier token
const WORD_RE = /[a-zA-Z0-9_\-\.\/@#%?&:]/;

function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    // Newlines are significant — they terminate unquoted content
    if (c === '\n') { toks.push({ t: T.NL }); i++; continue; }
    if (c === '\r') { i++; continue; } // skip bare CR
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '{') { toks.push({ t: T.LBRACE }); i++; continue; }
    if (c === '}') { toks.push({ t: T.RBRACE }); i++; continue; }
    if (c === '=') { toks.push({ t: T.EQUALS }); i++; continue; }
    if (c === '"') {
      i++;
      let v = '';
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) { i++; v += src[i]; }
        else v += src[i];
        i++;
      }
      i++;
      toks.push({ t: T.STRING, v });
      continue;
    }
    if (WORD_RE.test(c)) {
      let j = i;
      while (j < src.length && WORD_RE.test(src[j])) j++;
      toks.push({ t: T.WORD, v: src.slice(i, j) });
      i = j;
      continue;
    }
    i++; // skip unknown chars (punctuation dropped; use quoted strings for it)
  }
  toks.push({ t: T.EOF });
  return toks;
}

// ── Parser ─────────────────────────────────────────────────────────────────────
const BOOL_ATTRS = new Set(['required', 'disabled', 'readonly', 'checked', 'multiple', 'autofocus']);

// All valid ClearHTML element keywords — used by parseChildren to detect new elements
const KEYWORDS = new Set([
  'document','metadata','page','page-title','character-encoding','page-header',
  'navigation','main-content','content-section','article-content','complementary-content',
  'page-footer','group','heading','paragraph','quote-block','quote-inline','emphasis',
  'strong-importance','code-text','preformatted-text','text-fragment','link','image',
  'audio-player','video-player','captioned-media','media-caption','list','item',
  'data-table','table-header','table-body','row','column-heading','cell',
  'form','field','submit-button','label',
]);

// Elements that take only inline text content — never block children in normal use.
// For these, we collect unquoted words even if the first word matches a keyword.
const LEAF_ELEMENTS = new Set([
  'item','cell','column-heading','media-caption','submit-button',
  'page-title','emphasis','strong-importance','code-text','quote-inline','text-fragment',
]);

function parse(toks) {
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];

  function parseAttrs() {
    const attrs = {};
    while (true) {
      const tok = peek();
      if (tok.t !== T.WORD) break;
      const lookahead = toks[pos + 1];
      if (lookahead && lookahead.t === T.EQUALS) {
        const key = next().v; next(); // skip =
        const val = next();
        attrs[key] = val.v;
      } else if (BOOL_ATTRS.has(tok.v)) {
        attrs[next().v] = true;
      } else {
        break;
      }
    }
    return attrs;
  }

  // Collect consecutive WORDs as a text run, stopping only at NL, LBRACE, RBRACE, or EOF.
  // Newlines are the reliable statement boundary for unquoted (prompt-block) content.
  function collectUnquotedContent() {
    const parts = [];
    while (true) {
      const tok = peek();
      if (tok.t === T.EOF || tok.t === T.LBRACE || tok.t === T.RBRACE || tok.t === T.NL) break;
      if (tok.t === T.STRING) { parts.push(next().v); continue; }
      if (tok.t === T.WORD) { parts.push(next().v); continue; }
      break;
    }
    // consume trailing newlines
    while (peek().t === T.NL) next();
    return parts.length ? parts.join(' ') : null;
  }

  function parseChildren() {
    const children = [];
    // skip leading newlines
    while (peek().t === T.NL) next();
    while (peek().t !== T.RBRACE && peek().t !== T.EOF) {
      if (peek().t === T.NL) { next(); continue; }
      if (peek().t === T.STRING) {
        children.push({ keyword: '__text__', content: next().v });
      } else if (peek().t === T.WORD && KEYWORDS.has(peek().v)) {
        children.push(parseNode());
      } else if (peek().t === T.WORD) {
        // Unquoted text run inside a block
        const text = collectUnquotedContent();
        if (text) children.push({ keyword: '__text__', content: text });
      } else {
        next();
      }
    }
    return children;
  }

  function parseNode() {
    const keyword = next().v;
    const attrs = parseAttrs();
    let content = null, children = null;

    // Leaf elements always take inline content (never have block children in normal use).
    // For these, we collect unquoted words even if the next word is a ClearHTML keyword,
    // because those words are prose text (e.g. "item paragraph maps to p").
    const isLeaf = LEAF_ELEMENTS.has(keyword);

    if (peek().t === T.STRING) {
      content = next().v;
      while (peek().t === T.NL) next();
    } else if (peek().t === T.WORD && (isLeaf || !KEYWORDS.has(peek().v))) {
      // Unquoted content — stops at newline
      content = collectUnquotedContent();
    } else {
      while (peek().t === T.NL) next();
    }

    if (peek().t === T.LBRACE) {
      next(); // {
      children = parseChildren();
      next(); // }
      while (peek().t === T.NL) next();
    }
    return { keyword, attrs, content, children };
  }

  const nodes = [];
  // skip leading newlines
  while (peek().t === T.NL) next();
  while (peek().t !== T.EOF) {
    if (peek().t === T.NL) { next(); continue; }
    if (peek().t === T.WORD) nodes.push(parseNode());
    else next();
  }
  return nodes;
}

function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Attribute mapper ───────────────────────────────────────────────────────────
function buildAttrs(keyword, attrs) {
  const REMAP = {
    to: 'href', source: 'src', description: 'alt',
    'style-group': 'class', identifier: 'id',
    'accessibility-label': 'aria-label', relationship: 'rel',
    'submit-to': 'action', language: 'lang',
    name: 'name', method: 'method', type: 'type',
    level: null, // consumed by heading special-case
  };
  const parts = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'open-in') { parts.push(v === 'new-tab' ? 'target="_blank"' : `target="${escapeAttr(v)}"`); continue; }
    if (k === 'level') continue;
    if (k === 'type' && (keyword === 'list')) continue; // consumed by list special-case
    const mapped = REMAP[k];
    if (mapped === null) continue;
    const htmlKey = mapped || k;
    if (v === true) parts.push(htmlKey);
    else parts.push(`${htmlKey}="${escapeAttr(v)}"`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

// ── Element map ────────────────────────────────────────────────────────────────
const ELEM = {
  'document': 'html', 'metadata': 'head', 'page': 'body',
  'page-title': 'title', 'page-header': 'header', 'navigation': 'nav',
  'main-content': 'main', 'content-section': 'section',
  'article-content': 'article', 'complementary-content': 'aside',
  'page-footer': 'footer', 'group': 'div', 'paragraph': 'p',
  'quote-block': 'blockquote', 'quote-inline': 'q',
  'emphasis': 'em', 'strong-importance': 'strong',
  'code-text': 'code', 'preformatted-text': 'pre', 'text-fragment': 'span',
  'captioned-media': 'figure', 'media-caption': 'figcaption',
  'data-table': 'table', 'table-header': 'thead', 'table-body': 'tbody',
  'row': 'tr', 'column-heading': 'th', 'cell': 'td', 'item': 'li',
  'audio-player': 'audio', 'video-player': 'video', 'label': 'label',
};

// ── Generator ──────────────────────────────────────────────────────────────────
function escape(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function gen(node, indent) {
  const pad = '  '.repeat(indent);

  if (node.keyword === '__text__') return pad + escape(node.content);

  // Special: document
  if (node.keyword === 'document') {
    const langAttr = node.attrs.language ? ` lang="${escapeAttr(node.attrs.language)}"` : '';
    let out = '<!DOCTYPE html>\n';
    out += `<html${langAttr}>\n`;
    for (const child of (node.children || [])) out += gen(child, indent) + '\n';
    out += '</html>';
    return out;
  }

  // Special: character-encoding
  if (node.keyword === 'character-encoding') {
    const charset = node.content || node.attrs.charset || 'utf-8';
    return `${pad}<meta charset="${escapeAttr(charset)}">`;
  }

  // Special: heading
  if (node.keyword === 'heading') {
    const lvl = node.attrs.level || 1;
    const a = buildAttrs(node.keyword, node.attrs);
    const text = escape(node.content || '');
    return `${pad}<h${lvl}${a}>${text}</h${lvl}>`;
  }

  // Special: link
  if (node.keyword === 'link') {
    const a = buildAttrs(node.keyword, node.attrs);
    if (node.children) {
      let inner = '';
      for (const c of node.children) inner += gen(c, 0);
      return `${pad}<a${a}>${inner}</a>`;
    }
    return `${pad}<a${a}>${escape(node.content || '')}</a>`;
  }

  // Special: image
  if (node.keyword === 'image') {
    const a = buildAttrs(node.keyword, node.attrs);
    return `${pad}<img${a}>`;
  }

  // Special: list
  if (node.keyword === 'list') {
    const tag = node.attrs.type === 'numbered' ? 'ol' : 'ul';
    const a = buildAttrs(node.keyword, node.attrs);
    let out = `${pad}<${tag}${a}>\n`;
    for (const c of (node.children || [])) out += gen(c, indent + 1) + '\n';
    out += `${pad}</${tag}>`;
    return out;
  }

  // Special: metadata (inject stylesheet links)
  if (node.keyword === 'metadata') {
    let out = `${pad}<head>\n`;
    for (const c of (node.children || [])) out += gen(c, indent + 1) + '\n';
    out += `${pad}  <link rel="stylesheet" href="clearhtml.css">\n`;
    out += `${pad}  <link rel="stylesheet" href="generated.css">\n`;
    out += `${pad}</head>`;
    return out;
  }

  // Special: form
  if (node.keyword === 'form') {
    const a = buildAttrs(node.keyword, node.attrs);
    let out = `${pad}<form${a}>\n`;
    for (const c of (node.children || [])) out += gen(c, indent + 1) + '\n';
    out += `${pad}</form>`;
    return out;
  }

  // Special: field → <label> + <input>
  if (node.keyword === 'field') {
    const name = escapeAttr(node.attrs.name || '');
    const type = escapeAttr(node.attrs.type || 'text');
    const req = node.attrs.required ? ' required' : '';
    const styleGroup = node.attrs['style-group'] ? ` class="${escapeAttr(node.attrs['style-group'])}"` : '';
    let labelText = '';
    if (node.children) {
      for (const c of node.children) {
        if (c.keyword === 'label') labelText = escape(c.content || '');
      }
    }
    let out = `${pad}<div class="field-group">\n`;
    out += `${pad}  <label for="${name}">${labelText}</label>\n`;
    out += `${pad}  <input id="${name}" name="${name}" type="${type}"${req}${styleGroup}>\n`;
    out += `${pad}</div>`;
    return out;
  }

  // Special: submit-button
  if (node.keyword === 'submit-button') {
    return `${pad}<button type="submit">${escape(node.content || '')}</button>`;
  }

  // Generic: mapped element
  const tag = ELEM[node.keyword];
  if (!tag) {
    // Unknown keyword — pass through children or content as comment
    if (node.children) {
      let out = `${pad}<!-- unknown: ${node.keyword} -->\n`;
      for (const c of node.children) out += gen(c, indent + 1) + '\n';
      return out;
    }
    return `${pad}<!-- unknown: ${node.keyword}: ${escape(node.content || '')} -->`;
  }

  const a = buildAttrs(node.keyword, node.attrs);

  // Inline/prose container with children -> compile children inline on the same line
  const INLINE_CONTAINERS = new Set([
    'paragraph', 'emphasis', 'strong-importance', 'quote-inline',
    'code-text', 'text-fragment', 'link', 'item', 'cell', 'column-heading'
  ]);

  if (node.children && INLINE_CONTAINERS.has(node.keyword)) {
    let inner = '';
    for (const c of node.children) {
      if (c.keyword === '__text__') {
        inner += escape(c.content);
      } else {
        // Generate child with 0 indent and no extra padding
        inner += gen(c, 0).trim();
      }
    }
    return `${pad}<${tag}${a}>${inner}</${tag}>`;
  }

  // Inline (no children, just content)
  if (node.content !== null && !node.children) {
    return `${pad}<${tag}${a}>${escape(node.content)}</${tag}>`;
  }

  // Block
  if (node.children) {
    let out = `${pad}<${tag}${a}>\n`;
    for (const c of node.children) out += gen(c, indent + 1) + '\n';
    out += `${pad}</${tag}>`;
    return out;
  }

  // Empty block
  return `${pad}<${tag}${a}></${tag}>`;
}

// ── Validation ─────────────────────────────────────────────────────────────────
function validateAST(ast) {
  let mainContentCount = 0;

  function traverse(node, parentStack) {
    const parent = parentStack[parentStack.length - 1];

    // 1. main-content should appear once per page
    if (node.keyword === 'main-content') {
      mainContentCount++;
      if (mainContentCount > 1) {
        throw new Error("Validation Error: 'main-content' can only appear once per page.");
      }
    }

    // 2. link must have to and visible text
    if (node.keyword === 'link') {
      if (!node.attrs.to || !node.attrs.to.trim()) {
        throw new Error("Validation Error: 'link' must specify a destination using the 'to' attribute.");
      }
      const hasText = node.content && node.content.trim();
      const hasChildren = node.children && node.children.some(c => c.keyword === '__text__' ? c.content.trim() : true);
      if (!hasText && !hasChildren) {
        throw new Error(`Validation Error: 'link' pointing to "${node.attrs.to}" is empty. It must contain visible text content.`);
      }
    }

    // 3. image must have source and description
    if (node.keyword === 'image') {
      if (!node.attrs.source || !node.attrs.source.trim()) {
        throw new Error("Validation Error: 'image' is missing the 'source' attribute.");
      }
      if (!node.attrs.description || !node.attrs.description.trim()) {
        throw new Error("Validation Error: 'image' is missing the 'description' attribute (required for accessibility).");
      }
    }

    // 4. heading level must be 1 through 6
    if (node.keyword === 'heading') {
      const levelAttr = node.attrs.level;
      if (levelAttr !== undefined) {
        if (!/^[1-6]$/.test(String(levelAttr))) {
          throw new Error(`Validation Error: 'heading' level must be an integer between 1 and 6, got "${levelAttr}".`);
        }
      }
    }

    // 5. list must use type="bulleted" or type="numbered"
    if (node.keyword === 'list') {
      const type = node.attrs.type;
      if (!type || (type !== 'bulleted' && type !== 'numbered')) {
        throw new Error(`Validation Error: 'list' type must be "bulleted" or "numbered", got "${type || 'none'}".`);
      }
    }

    // 6. item must be inside list
    if (node.keyword === 'item') {
      const parentName = parent ? parent.keyword : null;
      if (parentName !== 'list') {
        throw new Error("Validation Error: 'item' must be nested inside a 'list' element.");
      }
    }

    // 7. field must be inside form
    if (node.keyword === 'field') {
      const insideForm = parentStack.some(p => p.keyword === 'form');
      if (!insideForm) {
        throw new Error("Validation Error: 'field' must be nested inside a 'form' element.");
      }
    }

    // Recurse children
    if (node.children) {
      parentStack.push(node);
      for (const child of node.children) {
        traverse(child, parentStack);
      }
      parentStack.pop();
    }
  }

  for (const node of ast) {
    traverse(node, []);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
const filePath = process.argv[2];
if (!filePath) { process.stderr.write('Usage: chtml-parser.js <file.chtml>\n'); process.exit(1); }

const src = fs.readFileSync(filePath, 'utf8');
const toks = tokenize(src);
const ast = parse(toks);

try {
  validateAST(ast);
} catch (err) {
  process.stderr.write(err.message + '\n');
  process.exit(1);
}

let html = '';
for (const node of ast) html += gen(node, 0) + '\n';

process.stdout.write(html.trimEnd() + '\n');
