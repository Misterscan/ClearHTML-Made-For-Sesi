#!/usr/bin/env node
'use strict';

/**
 * bin/html-to-chtml.js
 * Converts an HTML file to ClearHTML syntax.
 * Usage: node bin/html-to-chtml.js <file.html>
 */

const fs = require('fs');

const filePath = process.argv[2];
if (!filePath) { process.stderr.write('Usage: html-to-chtml.js <file.html>\n'); process.exit(1); }

const raw = fs.readFileSync(filePath, 'utf8');

// ── Element maps ───────────────────────────────────────────────────────────────

const TAG_MAP = {
  html: 'document', head: 'metadata', body: 'page',
  header: 'page-header', nav: 'navigation', main: 'main-content',
  section: 'content-section', article: 'article-content',
  aside: 'complementary-content', footer: 'page-footer',
  div: 'group', span: 'text-fragment',
  h1: 'heading', h2: 'heading', h3: 'heading',
  h4: 'heading', h5: 'heading', h6: 'heading',
  p: 'paragraph', blockquote: 'quote-block', q: 'quote-inline',
  em: 'emphasis', i: 'emphasis',
  strong: 'strong-importance', b: 'strong-importance',
  code: 'code-text', pre: 'preformatted-text',
  a: 'link', img: 'image',
  figure: 'captioned-media', figcaption: 'media-caption',
  ul: 'list', ol: 'list', li: 'item',
  table: 'data-table', thead: 'table-header', tbody: 'table-body',
  tfoot: 'table-body', tr: 'row', th: 'column-heading', td: 'cell',
  form: 'form', label: 'label', button: 'submit-button',
  input: 'field',
};

const ATTR_MAP = {
  href: 'to', src: 'source', alt: 'description',
  class: 'style-group', id: 'identifier',
  'aria-label': 'accessibility-label', rel: 'relationship',
  lang: 'language', action: 'submit-to', method: 'method',
  name: 'name', type: 'type',
};

// Tags whose subtrees are silently dropped
const SKIP = new Set(['script','style','link','noscript','svg','path','symbol','use',
                      'defs','g','template','iframe','canvas','object','embed',
                      'head > link','head > meta[name]']);

// HTML void elements
const VOID = new Set(['area','base','br','col','embed','hr','img','input',
                      'link','meta','param','source','track','wbr']);

// Inline ClearHTML elements
const INLINE = new Set(['a','em','i','strong','b','code','q','span','img','button']);

// ── HTML tokenizer ─────────────────────────────────────────────────────────────

function tokenize(html) {
  const tokens = [];
  // Strip comments and DOCTYPE
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<!DOCTYPE[^>]*>/i, '');

  // Regex to find tags; handles quoted attributes
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9\-]*)([^>]*?)(\s*\/)?>/g;
  let last = 0, m;

  while ((m = re.exec(html)) !== null) {
    // Text before this tag
    if (m.index > last) {
      let t = html.slice(last, m.index);
      // collapse whitespace for normal text, but decode entities
      t = htmlUnescape(t.replace(/\s+/g, ' '));
      if (t.trim()) tokens.push({ type: 'text', value: t.trim() });
    }

    const close = m[1] === '/';
    const tag   = m[2].toLowerCase();
    const attrs = parseAttrs(m[3] || '');
    const self  = !!(m[4]) || VOID.has(tag);
    // If we encounter a <pre> or <code> open tag, preserve its inner
    // content verbatim (including whitespace and entities) until the
    // matching closing tag. This avoids collapsing code blocks and
    // mangling & entities or quote characters inside code samples.
    if (!close && !self && (tag === 'pre' || tag === 'code')) {
      const startInner = m.index + m[0].length;
      const closingTag = `</${tag}>`;
      const endIdx = html.indexOf(closingTag, startInner);
      if (endIdx !== -1) {
        // Push the open tag token
        tokens.push({ type: 'open', tag, attrs });
        // Push inner content as a single raw text token (do not collapse)
        let rawInner = html.slice(startInner, endIdx);
        // decode entities but preserve whitespace/newlines
        rawInner = htmlUnescape(rawInner);
        if (rawInner.length) tokens.push({ type: 'text', value: rawInner });
        // Push the explicit close token and advance the regex
        tokens.push({ type: 'close', tag });
        last = endIdx + closingTag.length;
        re.lastIndex = last;
        continue;
      }
      // If no closing tag found, fall through and treat as normal open
    }

    if (close) {
      tokens.push({ type: 'close', tag });
    } else if (self) {
      tokens.push({ type: 'self', tag, attrs });
    } else {
      tokens.push({ type: 'open', tag, attrs });
    }
    last = m.index + m[0].length;
  }

  if (last < html.length) {
    let t = html.slice(last);
    t = htmlUnescape(t.replace(/\s+/g, ' ')).trim();
    if (t) tokens.push({ type: 'text', value: t });
  }

  return tokens;
}

function parseAttrs(str) {
  const attrs = {};
  const re = /([a-zA-Z][a-zA-Z0-9\-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const k = m[1].toLowerCase();
    attrs[k] = m[2] ?? m[3] ?? m[4] ?? true;
  }
  return attrs;
}

// Decode common HTML entities and numeric entities to raw characters
function htmlUnescape(s) {
  if (typeof s !== 'string') return s;
  s = s.replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'");
  // Numeric (decimal)
  s = s.replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)));
  // Numeric (hex)
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (m, n) => String.fromCharCode(parseInt(n, 16)));
  return s;
}

// ── Tree builder ───────────────────────────────────────────────────────────────

function buildTree(tokens) {
  const root = { tag: '__root__', attrs: {}, children: [] };
  const stack = [root];

  for (const tok of tokens) {
    const top = stack[stack.length - 1];
    if (tok.type === 'text') {
      top.children.push({ tag: '__text__', value: tok.value });
    } else if (tok.type === 'open') {
      const node = { tag: tok.tag, attrs: tok.attrs, children: [] };
      top.children.push(node);
      stack.push(node);
    } else if (tok.type === 'self') {
      top.children.push({ tag: tok.tag, attrs: tok.attrs, children: [] });
    } else if (tok.type === 'close') {
      // Pop until we find a matching open tag (tolerates malformed HTML)
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tok.tag) {
          stack.splice(i);
          break;
        }
      }
    }
  }

  return root;
}

// ── ClearHTML emitter ──────────────────────────────────────────────────────────

function quote(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function mapAttrs(tag, attrs) {
  const parts = [];

  // Attribute-specific logic
  if (tag === 'html' && attrs.lang) {
    parts.push(`language="${quote(attrs.lang)}"`);
  }
  if ((tag === 'h1'||tag==='h2'||tag==='h3'||tag==='h4'||tag==='h5'||tag==='h6')) {
    parts.push(`level=${tag[1]}`);
  }
  if ((tag === 'ul'||tag==='ol')) {
    parts.push(`type="${tag==='ul'?'bulleted':'numbered'}"`);
  }
  if (tag === 'a' && attrs.href) {
    parts.push(`to="${quote(attrs.href)}"`);
    if (attrs.target === '_blank') parts.push('open-in="new-tab"');
    if (attrs.rel) parts.push(`relationship="${quote(attrs.rel)}"`);
  }
  if (tag === 'img') {
    if (attrs.src) parts.push(`source="${quote(attrs.src)}"`);
    // Enforce description (required for ClearHTML compiler accessibility check)
    const altText = attrs.alt || 'Image description';
    parts.push(`description="${quote(altText)}"`);
  }
  if (tag === 'form') {
    if (attrs.action) parts.push(`submit-to="${quote(attrs.action)}"`);
    if (attrs.method) parts.push(`method="${quote(attrs.method)}"`);
  }
  if (tag === 'input') {
    if (attrs.name || attrs.id) parts.push(`name="${quote(attrs.name || attrs.id)}"`);
    if (attrs.type) parts.push(`type="${quote(attrs.type)}"`);
    if (attrs.required) parts.push('required');
  }

  // Generic attribute mapping
  for (const [k, v] of Object.entries(attrs)) {
    if (['href','src','alt','lang','target','rel','action','method','type','required','name','id'].includes(k)) continue;
    const mapped = ATTR_MAP[k];
    if (!mapped) continue;
    if (v === true) parts.push(mapped);
    else parts.push(`${mapped}="${quote(String(v))}"`);
  }

  return parts.length ? ' ' + parts.join(' ') : '';
}

// Get all text content of a node recursively
function textContent(node) {
  if (node.tag === '__text__') return node.value;
  // Preserve raw content for pre/code blocks (do not normalize whitespace)
  if (node.tag === 'pre' || node.tag === 'code') {
    return (node.children || []).map(c => c.tag === '__text__' ? c.value : textContent(c)).join('');
  }
  return (node.children || []).map(textContent).join(' ').replace(/\s+/g, ' ').trim();
}

// Does a node have only text and inline children?
function isPureInline(node) {
  if (!node.children) return true;
  return node.children.every(c => {
    if (c.tag === '__text__') return true;
    if (INLINE.has(c.tag)) return true;
    return false;
  });
}

// Tags that must always render their children as block-level items
const FORCE_BLOCK = new Set(['nav','ul','ol','table','thead','tbody','tfoot','tr',
                             'figure','form','select','details','summary']);

// Emit a node as ClearHTML
function emit(node, depth, state = { insideForm: false, insideList: false }) {
  const pad = '  '.repeat(depth);

  // Root: emit children
  if (node.tag === '__root__') {
    return node.children.map(c => emit(c, depth, state)).filter(Boolean).join('\n');
  }

  // Raw text nodes at block level
  if (node.tag === '__text__') {
    return node.value ? `${pad}"${quote(node.value)}"` : '';
  }

  // Skip silently
  if (SKIP.has(node.tag)) return '';

  // ── Special: meta charset ─────────────────────────────────────────────────
  if (node.tag === 'meta' && node.attrs.charset) {
    return `${pad}character-encoding "${quote(node.attrs.charset)}"`;
  }
  // Skip other meta tags
  if (node.tag === 'meta') return '';

  // ── Special: title ────────────────────────────────────────────────────────
  if (node.tag === 'title') {
    const text = textContent(node);
    return text ? `${pad}page-title "${quote(text)}"` : '';
  }

  // Handle forms and lists states
  const nextState = { ...state };
  if (node.tag === 'form') nextState.insideForm = true;
  if (node.tag === 'ul' || node.tag === 'ol') nextState.insideList = true;

  // ── Special: strip the div.field-group wrapper the compiler emits ─────────
  // The 'field' keyword already compiles to <div class="field-group">, so when
  // converting compiled HTML back to ClearHTML we must skip this wrapper div
  // to avoid generating a redundant outer group element.
  if (node.tag === 'div' && node.attrs.class === 'field-group') {
    return (node.children || []).map(c => emit(c, depth, nextState)).filter(Boolean).join('\n');
  }

  // ── Special Case: input tag ───────────────────────────────────────────────
  if (node.tag === 'input') {
    // If input type is submit, map to submit-button
    if (node.attrs.type === 'submit') {
      const btnText = node.attrs.value || 'Submit';
      return `${pad}submit-button "${quote(btnText)}"`;
    }
    // Otherwise it maps to field. Must be inside form.
    if (!state.insideForm) return ''; // skip orphan fields
  }

  // ── Unknown HTML tag — emit children only ─────────────────────────────────
  let chtmlTag = TAG_MAP[node.tag];
  if (!chtmlTag) {
    const inner = (node.children || []).map(c => emit(c, depth, nextState)).filter(Boolean).join('\n');
    return inner || '';
  }

  // ── Special Case: item tag (li) ───────────────────────────────────────────
  if (chtmlTag === 'item' && !state.insideList) {
    // Convert orphan items to paragraphs to pass compiler validation
    chtmlTag = 'paragraph';
  }

  // ── Special Case: link tag (a) ────────────────────────────────────────────
  if (chtmlTag === 'link') {
    if (!node.attrs.href) return ''; // skip empty/destinationless links
    const linkText = textContent(node);
    if (!linkText && (!node.children || !node.children.length)) {
      return ''; // skip empty links to pass compiler validation
    }
  }

  const attrStr = mapAttrs(node.tag, node.attrs);

  // ── Self-closing: image / field ───────────────────────────────────────────
  if (node.tag === 'img') {
    if (!node.attrs.src) return ''; // skip sourceless images
    return `${pad}image${attrStr}`;
  }
  if (node.tag === 'input') {
    const labelNode = (node.children || []).find(c => c.tag === 'label');
    const labelText = labelNode ? textContent(labelNode) : '';

    if (labelText) {
      return `${pad}field${attrStr} {\n${pad}  label "${quote(labelText)}"\n${pad}}`;
    }

  return `${pad}field${attrStr}`;
}

  // ── Force-block containers: always emit children as block items ───────────
  if (FORCE_BLOCK.has(node.tag) && node.children && node.children.length > 0) {
    const inner = node.children.map(c => emit(c, depth + 1, nextState)).filter(Boolean).join('\n');
    if (!inner.trim()) return '';
    return `${pad}${chtmlTag}${attrStr} {\n${inner}\n${pad}}`;
  }

  // ── Leaf elements: pure text only ─────────────────────────────────────────
  const hasOnlyText = !node.children || node.children.every(c => c.tag === '__text__');
  const text = textContent(node);

  if (hasOnlyText && text) {
    return `${pad}${chtmlTag}${attrStr} "${quote(text)}"`;
  }

  // ── Mixed inline content: collapse to text if all inline ──────────────────
  if (isPureInline(node) && !FORCE_BLOCK.has(node.tag) && text) {
    return `${pad}${chtmlTag}${attrStr} "${quote(text)}"`;
  }

  // ── Block with children ───────────────────────────────────────────────────
  if (node.children && node.children.length > 0) {
    const inner = node.children.map(c => emit(c, depth + 1, nextState)).filter(Boolean).join('\n');
    if (!inner.trim()) {
      return text ? `${pad}${chtmlTag}${attrStr} "${quote(text)}"` : '';
    }
    return `${pad}${chtmlTag}${attrStr} {\n${inner}\n${pad}}`;
  }

  // ── Empty element ─────────────────────────────────────────────────────────
  return text ? `${pad}${chtmlTag}${attrStr} "${quote(text)}"` : '';
}

// Helper to reconstruct form fields by pairing <label> with following <input>
function reconstructForms(node) {
  if (!node.children) return;

  for (const child of node.children) {
    reconstructForms(child);
  }

  const newChildren = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];

    if (child.tag === 'label') {
      // Find the next non-whitespace sibling
      let nextIdx = i + 1;
      while (nextIdx < node.children.length) {
        const nextChild = node.children[nextIdx];
        if (nextChild.tag === '__text__' && !nextChild.value.trim()) {
          nextIdx++;
          continue;
        }
        break;
      }

      if (nextIdx < node.children.length && node.children[nextIdx].tag === 'input') {
        const labelNode = child;
        const inputNode = node.children[nextIdx];

        if (!inputNode.children) inputNode.children = [];
        inputNode.children.push(labelNode);
        continue;
      }
    }

    newChildren.push(child);
  }

  node.children = newChildren;
}

// ── Main ───────────────────────────────────────────────────────────────────────

const tokens = tokenize(raw);
const tree   = buildTree(tokens);
reconstructForms(tree);
const chtml  = emit(tree, 0, { insideForm: false, insideList: false });

process.stdout.write(chtml.trim() + '\n');
