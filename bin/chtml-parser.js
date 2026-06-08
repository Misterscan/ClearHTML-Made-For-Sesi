#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ── Tokenizer ──────────────────────────────────────────────────────────────────
const T = { WORD: 0, STRING: 1, LBRACE: 2, RBRACE: 3, EQUALS: 4, EOF: 5, NL: 6, PUNC: 7, COMMENT: 8 };

// Characters that are part of a word/identifier token
const WORD_RE = /[a-zA-Z0-9_\-\.\/@#%?\&:]/;

function tokenize(src) {
  const toks = [];
  let i = 0, line = 1, col = 1;
  // ws = whitespace was seen before the next token — used by collectUnquotedContent
  // to reconstruct spacing without storing every space as a token.
  let ws = false;
  while (i < src.length) {
    const c = src[i];
    // Newlines are significant — they terminate unquoted content
    if (c === '\n') { toks.push({ t: T.NL, line, col }); i++; line++; col = 1; ws = false; continue; }
    if (c === '\r') { i++; continue; } // skip bare CR
    if (c === ' ' || c === '\t') { i++; col++; ws = true; continue; }
    
    // Comments
    if (c === '/' && src[i + 1] === '/') {
      let v = '';
      i += 2; col += 2;
      while (i < src.length && src[i] !== '\n') {
        v += src[i];
        i++; col++;
      }
      toks.push({ t: T.COMMENT, v: v.trim(), line, col, ws });
      ws = false;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      let v = '';
      const startLine = line, startCol = col;
      i += 2; col += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') { line++; col = 0; }
        v += src[i];
        i++; col++;
      }
      i += 2; col += 2;
      toks.push({ t: T.COMMENT, v: v.trim(), line: startLine, col: startCol, ws, multi: true });
      ws = false;
      continue;
    }

    if (c === '{') { toks.push({ t: T.LBRACE, line, col, ws }); i++; col++; ws = false; continue; }
    if (c === '}') { toks.push({ t: T.RBRACE, line, col, ws }); i++; col++; ws = false; continue; }
    if (c === '=') { toks.push({ t: T.EQUALS, line, col, ws }); i++; col++; ws = false; continue; }
    if (c === '"') {
      const startCol = col;
      i++; col++;
      let v = '';
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) { i++; col++; v += src[i]; }
        else {
          if (src[i] === '\n') { line++; col = 0; }
          v += src[i];
        }
        i++; col++;
      }
      i++; col++;
      toks.push({ t: T.STRING, v, line, col: startCol, ws }); ws = false;
      continue;
    }
    if (WORD_RE.test(c)) {
      let j = i;
      while (j < src.length && WORD_RE.test(src[j])) j++;
      const val = src.slice(i, j);
      toks.push({ t: T.WORD, v: val, line, col, ws }); ws = false;
      col += (j - i);
      i = j;
      continue;
    }
    // Emit PUNC for printable non-whitespace special characters (!, ,, ', (, ), etc.)
    // Previously these were silently dropped. Now they survive in unquoted prose.
    if (c.charCodeAt(0) > 31) {
      toks.push({ t: T.PUNC, v: c, line, col, ws }); ws = false;
      col++;
    }
    i++;
  }
  toks.push({ t: T.EOF, line, col });
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
  'define-component', 'use-component', 'slot'
]);

// Elements that take only inline text content — never block children in normal use.
// For these, we collect unquoted words even if the first word matches a keyword.
// Leaf elements: text-only nodes that should never parse block children.
// Inline formatting elements (emphasis, code-text, etc.) are intentionally
// NOT leaves — they can host children via { } for deep nesting:
//   emphasis { code-text "snippet" }  →  <em><code>snippet</code></em>
const LEAF_ELEMENTS = new Set([
  'item', 'column-heading', 'media-caption', 'submit-button', 'page-title',
]);

function parse(toks) {
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];
  const COMPONENTS = {};

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

  // Collect a prose text run, stopping only at NL, LBRACE, RBRACE, or EOF.
  // Newlines are the reliable statement boundary for unquoted content.
  // PUNC tokens (!, ,, ', (, ) etc.) are now included — no more workarounds needed.
  // The ws (whitespace-before) flag on each token reconstructs original spacing.
  function collectUnquotedContent() {
    const parts = [];
    while (true) {
      const tok = peek();
      if (tok.t === T.EOF || tok.t === T.LBRACE || tok.t === T.RBRACE || tok.t === T.NL) break;
      if (tok.t === T.STRING || tok.t === T.WORD || tok.t === T.PUNC) {
        const t = next();
        // Restore the whitespace that the tokenizer consumed, but only between parts
        if (parts.length > 0 && t.ws) parts.push(' ');
        parts.push(t.v);
        continue;
      }
      break;
    }
    // consume trailing newlines
    while (peek().t === T.NL) next();
    return parts.length ? parts.join('') : null;
  }

  function parseChildren() {
    const children = [];
    // skip leading newlines
    while (peek().t === T.NL) next();
    while (peek().t !== T.RBRACE && peek().t !== T.EOF) {
      if (peek().t === T.NL) { next(); continue; }
      if (peek().t === T.COMMENT) {
        const tok = next();
        children.push({ keyword: '__comment__', content: tok.v, line: tok.line, col: tok.col });
      } else if (peek().t === T.STRING) {
        const tok = next();
        children.push({ keyword: '__text__', content: tok.v, line: tok.line, col: tok.col });
      } else if (peek().t === T.WORD && KEYWORDS.has(peek().v)) {
        children.push(parseNode());
      } else if (peek().t === T.WORD) {
        // Unquoted text run inside a block
        const startTok = peek();
        const text = collectUnquotedContent();
        if (text) children.push({ keyword: '__text__', content: text, line: startTok.line, col: startTok.col });
      } else {
        next();
      }
    }
    return children;
  }

  function parseNode() {
    const keywordTok = next();
    const keyword = keywordTok.v;
    const line = keywordTok.line;
    const col = keywordTok.col;
    const attrs = parseAttrs();
    let content = null, children = null;

    // Handle define-component
    if (keyword === 'define-component') {
      const name = peek().t === T.STRING ? next().v : next().v;
      while (peek().t === T.NL) next();
      if (peek().t === T.LBRACE) {
        next();
        const body = parseChildren();
        next();
        COMPONENTS[name] = body;
      }
      while (peek().t === T.NL) next();
      return { keyword: '__nop__', line };
    }

    // Handle use-component
    if (keyword === 'use-component') {
      const name = peek().t === T.STRING ? next().v : next().v;
      while (peek().t === T.NL) next();
      let slotChildren = [];
      if (peek().t === T.LBRACE) {
        next();
        slotChildren = parseChildren();
        next();
      }
      const def = COMPONENTS[name];
      if (!def) {
        return { keyword: '__comment__', content: `Error: Component "${name}" not found`, line, col };
      }
      
      function expand(nodes) {
        const result = [];
        for (const n of nodes) {
          if (n.keyword === 'slot') {
            result.push(...slotChildren);
          } else {
            const newNode = { ...n };
            if (newNode.children) newNode.children = expand(newNode.children);
            result.push(newNode);
          }
        }
        return result;
      }

      return { keyword: '__fragment__', children: expand(def), line, col };
    }

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
    return { keyword, attrs, content, children, line, col };
  }

  const nodes = [];
  // skip leading newlines
  while (peek().t === T.NL) next();
  while (peek().t !== T.EOF) {
    if (peek().t === T.NL) { next(); continue; }
    if (peek().t === T.COMMENT) {
      const tok = next();
      nodes.push({ keyword: '__comment__', content: tok.v, line: tok.line, col: tok.col });
      continue;
    }
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

const ENABLE_SOURCE_INFO = process.env.CH_DEBUG === 'true' || process.argv.includes('--debug');

// ── Attribute mapper ───────────────────────────────────────────────────────────
function buildAttrs(keyword, attrs, node = null) {
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

  if (node && node.line && ENABLE_SOURCE_INFO) {
    parts.push(`data-source-line="${node.line}"`);
    parts.push(`data-source-col="${node.col}"`);
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
  if (node.keyword === '__nop__') return '';
  if (node.keyword === '__fragment__') {
    let out = '';
    for (const c of (node.children || [])) {
      const res = gen(c, indent);
      if (res) out += res + '\n';
    }
    return out.trimEnd();
  }
  if (node.keyword === '__comment__') {
    if (node.content.includes('\n')) {
      return `${pad}<!--\n${node.content.split('\n').map(l => pad + '  ' + l).join('\n')}\n${pad}-->`;
    }
    return `${pad}<!-- ${node.content} -->`;
  }

  // Special: document
  if (node.keyword === 'document') {
    const langAttr = node.attrs.language ? ` lang="${escapeAttr(node.attrs.language)}"` : '';
    const a = buildAttrs(node.keyword, node.attrs, node);
    let out = '<!DOCTYPE html>\n';
    out += `<html${langAttr}${a}>\n`;
    for (const child of (node.children || [])) out += gen(child, indent) + '\n';
    out += '</html>';
    return out;
  }

  // Special: character-encoding
  if (node.keyword === 'character-encoding') {
    const charset = node.content || node.attrs.charset || 'utf-8';
    return `${pad}<meta charset="${escapeAttr(charset)}">`;
  }

  // Special: heading — supports plain text, children, or mixed (leading text + inline children)
  if (node.keyword === 'heading') {
    const lvl = node.attrs.level || 1;
    const a = buildAttrs(node.keyword, node.attrs, node);
    let inner = '';
    if (node.content) inner += escape(node.content);
    for (const c of (node.children || [])) {
      if (c.keyword === '__text__') inner += escape(c.content);
      else inner += gen(c, 0).trim();
    }
    return `${pad}<h${lvl}${a}>${inner}</h${lvl}>`;
  }

  // Special: link
  if (node.keyword === 'link') {
    const a = buildAttrs(node.keyword, node.attrs, node);
    if (node.children) {
      let inner = '';
      for (const c of node.children) inner += gen(c, 0);
      return `${pad}<a${a}>${inner}</a>`;
    }
    return `${pad}<a${a}>${escape(node.content || '')}</a>`;
  }

  // Special: image
  if (node.keyword === 'image') {
    const a = buildAttrs(node.keyword, node.attrs, node);
    return `${pad}<img${a}>`;
  }

  // Special: list
  if (node.keyword === 'list') {
    const tag = node.attrs.type === 'numbered' ? 'ol' : 'ul';
    const a = buildAttrs(node.keyword, node.attrs, node);
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
    const a = buildAttrs(node.keyword, node.attrs, node);
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
    const a = buildAttrs(node.keyword, node.attrs, node);
    let out = `${pad}<div class="field-group"${a}>\n`;
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
      let out = `${pad}<!-- unknown: ${node.keyword} (line ${node.line}) -->\n`;
      for (const c of node.children) out += gen(c, indent + 1) + '\n';
      return out;
    }
    return `${pad}<!-- unknown: ${node.keyword}: ${escape(node.content || '')} (line ${node.line}) -->`;
  }

  const a = buildAttrs(node.keyword, node.attrs, node);

  // Inline/prose containers — handles three modes:
  //   1. plain text:       paragraph "text"
  //   2. children only:    paragraph { emphasis "bold" " rest" }
  //   3. mixed content:    paragraph "prefix " { emphasis "bold" " suffix" }
  const INLINE_CONTAINERS = new Set([
    'paragraph', 'emphasis', 'strong-importance', 'quote-inline',
    'code-text', 'text-fragment', 'link', 'item', 'cell', 'column-heading', 'media-caption'
  ]);

  if (INLINE_CONTAINERS.has(node.keyword)) {
    let inner = '';
    // Render any leading inline content that precedes a { } block
    if (node.content !== null) inner += escape(node.content);
    // Render children (text nodes and inline elements) on the same line
    for (const c of (node.children || [])) {
      if (c.keyword === '__text__') {
        inner += escape(c.content);
      } else {
        inner += gen(c, 0).trim();
      }
    }
    return `${pad}<${tag}${a}>${inner}</${tag}>`;
  }

  // Inline (no children, just content) — for non-inline-container elements
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
// Collects ALL errors before reporting — no more stopping at the first mistake.
function validateAST(ast) {
  const errors = [];
  let mainContentCount = 0;

  function err(node, msg) {
    const loc = node.line ? ` (line ${node.line})` : '';
    errors.push(`Validation Error${loc}: ${msg}`);
  }

  function traverse(node, parentStack) {
    const parent = parentStack[parentStack.length - 1];

    // 1. main-content should appear once per page
    if (node.keyword === 'main-content') {
      mainContentCount++;
      if (mainContentCount > 1) {
        err(node, "'main-content' can only appear once per page.");
      }
    }

    // 2. link must have to and visible text
    if (node.keyword === 'link') {
      if (!node.attrs.to || !node.attrs.to.trim()) {
        err(node, "'link' must specify a destination using the 'to' attribute.");
      } else {
        const hasText = node.content && node.content.trim();
        const hasChildren = node.children && node.children.some(c => c.keyword === '__text__' ? c.content.trim() : true);
        if (!hasText && !hasChildren) {
          err(node, `'link' pointing to "${node.attrs.to}" is empty. It must contain visible text content.`);
        }
      }
    }

    // 3. image must have source and description
    if (node.keyword === 'image') {
      if (!node.attrs.source || !node.attrs.source.trim()) {
        err(node, "'image' is missing the 'source' attribute.");
      }
      if (!node.attrs.description || !node.attrs.description.trim()) {
        err(node, "'image' is missing the 'description' attribute (required for accessibility).");
      }
    }

    // 4. heading level must be 1 through 6
    if (node.keyword === 'heading') {
      const levelAttr = node.attrs.level;
      if (levelAttr !== undefined && !/^[1-6]$/.test(String(levelAttr))) {
        err(node, `'heading' level must be an integer between 1 and 6, got "${levelAttr}".`);
      }
    }

    // 5. list must use type="bulleted" or type="numbered"
    if (node.keyword === 'list') {
      const type = node.attrs.type;
      if (!type || (type !== 'bulleted' && type !== 'numbered')) {
        err(node, `'list' type must be "bulleted" or "numbered", got "${type || 'none'}".`);
      }
    }

    // 6. item must be inside list
    if (node.keyword === 'item') {
      const parentName = parent ? parent.keyword : null;
      if (parentName !== 'list') {
        err(node, "'item' must be nested inside a 'list' element.");
      }
    }

    // 7. field must be inside form
    if (node.keyword === 'field') {
      const insideForm = parentStack.some(p => p.keyword === 'form');
      if (!insideForm) {
        err(node, "'field' must be nested inside a 'form' element.");
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

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
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
