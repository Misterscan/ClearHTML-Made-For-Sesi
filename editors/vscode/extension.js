const vscode = require('vscode');

const DOCS = {
  'document': {
    html: '<html>',
    desc: 'The root container for the document. Represents the outer page layout wrapper.',
    example: 'document language="en" {\n  metadata { ... }\n  page { ... }\n}'
  },
  'metadata': {
    html: '<head>',
    desc: 'Container for metadata definitions such as page title, character encoding, or styles.',
    example: 'metadata {\n  character-encoding "utf-8"\n  page-title "My Site"\n}'
  },
  'page': {
    html: '<body>',
    desc: 'The main wrapper containing all visible page structure and visual content.',
    example: 'page {\n  page-header { ... }\n  main-content { ... }\n}'
  },
  'page-header': {
    html: '<header>',
    desc: 'A header section containing site logos, headings, or main navigation links.',
    example: 'page-header {\n  heading level=1 "My Site"\n}'
  },
  'navigation': {
    html: '<nav>',
    desc: 'Represents a block containing navigation links.',
    example: 'navigation {\n  link to="/home" "Home"\n  link to="/about" "About"\n}'
  },
  'main-content': {
    html: '<main>',
    desc: 'The main content area of the document. Should contain unique main content.',
    example: 'main-content {\n  content-section { ... }\n}'
  },
  'content-section': {
    html: '<section>',
    desc: 'A thematic group of content, typically with a heading.',
    example: 'content-section {\n  heading level=2 "Features"\n  paragraph "Content here..."\n}'
  },
  'article-content': {
    html: '<article>',
    desc: 'A self-contained composition (e.g. blog post, news story, forum post).',
    example: 'article-content {\n  heading level=2 "Post Title"\n  paragraph "Article body..."\n}'
  },
  'complementary-content': {
    html: '<aside>',
    desc: 'Content that is tangentially related to the main content (e.g. sidebars, callouts).',
    example: 'complementary-content {\n  heading level=3 "Quick Info"\n}'
  },
  'page-footer': {
    html: '<footer>',
    desc: 'The footer of the page or section, containing copyrights, links, or contact info.',
    example: 'page-footer {\n  paragraph "© 2026 Company Inc."\n}'
  },
  'group': {
    html: '<div>',
    desc: 'A generic structural flow container with no semantic meaning of its own.',
    example: 'group style-group="card" {\n  paragraph "Card contents"\n}'
  },
  'heading': {
    html: '<h1> - <h6>',
    desc: 'A section heading. Level is specified by the `level` attribute (1-6).',
    example: 'heading level=1 "Main Title"\nheading level=2 "Section Title"'
  },
  'paragraph': {
    html: '<p>',
    desc: 'A block-level paragraph of text.',
    example: 'paragraph "This is a body paragraph containing prose."'
  },
  'link': {
    html: '<a>',
    desc: 'A hyperlink. Target URL is specified by the `to` attribute.',
    example: 'link to="https://example.com" "Visit Site"'
  },
  'image': {
    html: '<img>',
    desc: 'An image element. Source path/URL is specified by `source` and alt text by `description`. Optional `width` and `height` can also be provided.',
    example: 'image source="logo.png" description="Company Logo" width="200" height="100"'
  },
  'list': {
    html: '<ul> or <ol>',
    desc: 'A list container. Type is specified by `type` ("bulleted" or "numbered").',
    example: 'list type="bulleted" {\n  item "First item"\n  item "Second item"\n}'
  },
  'item': {
    html: '<li>',
    desc: 'A single item inside a list.',
    example: 'item "List entry item"'
  },
  'submit-button': {
    html: '<button type="submit">',
    desc: 'A button used to submit a form or trigger actions.',
    example: 'submit-button "Save Changes"'
  },
  'label': {
    html: '<label>',
    desc: 'A label for a form input element.',
    example: 'label "Enter your email"'
  },
  'character-encoding': {
    html: '<meta charset="...">',
    desc: 'Declares the document\'s character encoding.',
    example: 'character-encoding "utf-8"'
  },
  'page-title': {
    html: '<title>',
    desc: 'Defines the document\'s title, which is shown in the browser\'s title bar.',
    example: 'page-title "My Project"'
  }
};

function activate(context) {
  // ── 1. Hover Provider ──────────────────────────────────────────────────────────
  const hoverProvider = vscode.languages.registerHoverProvider('clearhtml', {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position);
      if (!range) return;

      const word = document.getText(range);
      const doc = DOCS[word];

      if (doc) {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`### ClearHTML: **${word}**\n\n`);
        md.appendMarkdown(`Compiles to: \`${doc.html}\`\n\n`);
        md.appendMarkdown(`**Description:** ${doc.desc}\n\n`);
        md.appendMarkdown(`**Example:**\n\`\`\`clearhtml\n${doc.example}\n\`\`\``);
        return new vscode.Hover(md);
      }
    }
  });

  // ── 2. Document Link Provider (Clickable Link Navigation) ──────────────────────
  const path = require('path');
  const linkProvider = vscode.languages.registerDocumentLinkProvider('clearhtml', {
    provideDocumentLinks(document) {
      const links = [];
      const text = document.getText();
      
      // Matches: key="val", key='val', or key=val
      const pattern = /\b(to|source)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"}]+))/g;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const key = match[1];
        const urlStr = match[2] ?? match[3] ?? match[4];
        if (!urlStr) continue;

        let valStartOffset;
        if (match[2] !== undefined) {
          valStartOffset = match.index + match[0].indexOf('"') + 1;
        } else if (match[3] !== undefined) {
          valStartOffset = match.index + match[0].indexOf("'") + 1;
        } else {
          valStartOffset = match.index + match[0].indexOf(urlStr);
        }

        const startPos = document.positionAt(valStartOffset);
        const endPos = document.positionAt(valStartOffset + urlStr.length);
        const range = new vscode.Range(startPos, endPos);

        try {
          if (urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.startsWith('mailto:')) {
            links.push(new vscode.DocumentLink(range, vscode.Uri.parse(urlStr)));
          } else {
            // Relative file path navigation
            let targetFile = urlStr;
            // Map .html link targets to the source .chtml files for easier authoring
            if (targetFile.endsWith('.html')) {
              targetFile = targetFile.slice(0, -5) + '.chtml';
            }
            const currentDir = path.dirname(document.uri.fsPath);
            const resolvedPath = path.resolve(currentDir, targetFile);
            links.push(new vscode.DocumentLink(range, vscode.Uri.file(resolvedPath)));
          }
        } catch (e) {
          // ignore malformed URIs
        }
      }

      return links;
    }
  });

  context.subscriptions.push(hoverProvider, linkProvider);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
