# ClearHTML Specification Reference

A concise reference guide for the ClearHTML language. For the full proposal and design rationale, see [`ClearHTML-Proposal.md`](ClearHTML-Proposal.md).

---

## Quick Start

```clearhtml
document language="en" {
  metadata {
    character-encoding "utf-8"
    page-title "My Page"
  }

  page {
    page-header {
      heading level=1 "Welcome"
    }

    main-content {
      paragraph "Your content here."
    }

    page-footer {
      paragraph "© 2026"
    }
  }
}
```

---

## Document Structure

Every ClearHTML file must contain a `document` element with `metadata` and `page`:

```clearhtml
document language="en" {
  metadata {
    character-encoding "utf-8"
    page-title "Page Title"
  }

  page {
    // page content
  }
}
```

### Metadata Elements

| Element               | HTML Equivalent | Purpose                    |
| -------------------- | --------------- | -------------------------- |
| `character-encoding`  | `<meta charset>` | Document encoding (default: utf-8) |
| `page-title`         | `<title>`       | Browser tab and search result title |

---

## Page Structure

Organize page content into semantic regions:

| ClearHTML                   | HTML        | Purpose             |
| --------------------------- | ----------- | ------------------- |
| `page-header`               | `<header>`  | Top of page         |
| `navigation`                | `<nav>`     | Navigation links    |
| `main-content`              | `<main>`    | Primary content     |
| `content-section`           | `<section>` | Content grouping    |
| `article-content`           | `<article>` | Self-contained article |
| `complementary-content`     | `<aside>`   | Sidebar / supplementary |
| `page-footer`               | `<footer>`  | Bottom of page      |
| `group`                     | `<div>`     | Generic container   |

---

## Text & Prose Elements

| ClearHTML                  | HTML                    | Usage |
| -------------------------- | ----------------------- | ----- |
| `heading level=1..6 "text"` | `<h1>...<h6>`           | Section headings |
| `paragraph "text"`         | `<p>`                   | Paragraphs |
| `emphasis "text"`          | `<em>`                  | Emphasized (italic) |
| `strong-importance "text"` | `<strong>`              | Strong emphasis (bold) |
| `code-text "text"`         | `<code>`                | Inline code |
| `preformatted-text { ... }` | `<pre>`                 | Multi-line code blocks |
| `quote-block { ... }`      | `<blockquote>`          | Block quotations |
| `quote-inline "text"`      | `<q>`                   | Inline quotations |
| `text-fragment "text"`     | `<span>`                | Inline text grouping |

---

## Links & Media

### Links

```clearhtml
link to="/about" "About us"
link to="https://example.com" "External link"
link to="/page" open-in="new-tab" "Open in new tab"
link to="/page" relationship="noopener noreferrer" "Safe external"
```

### Images

```clearhtml
image source="/photo.jpg" description="Photo alt text"
```

Required attributes:
- `source`: path or URL to image
- `description`: alt text (required for accessibility)

### Media with Captions

```clearhtml
captioned-media {
  image source="/map.png" description="Map"
  media-caption "Our location on Main Street."
}
```

### Audio & Video

```clearhtml
audio-player source="/audio.mp3"
video-player source="/video.mp4"
```

---

## Lists

### Bulleted Lists

```clearhtml
list type="bulleted" {
  item "First item"
  item "Second item"
  item "Third item"
}
```

### Numbered Lists

```clearhtml
list type="numbered" {
  item "Step one"
  item "Step two"
  item "Step three"
}
```

---

## Tables

```clearhtml
data-table {
  table-header {
    row {
      column-heading "Name"
      column-heading "Age"
      column-heading "City"
    }
  }
  table-body {
    row {
      cell "Alice"
      cell "28"
      cell "Portland"
    }
    row {
      cell "Bob"
      cell "35"
      cell "Seattle"
    }
  }
}
```

---

## Forms

```clearhtml
form submit-to="/subscribe" method="post" {
  field name="email" type="email" required {
    label "Email address"
  }

  field name="message" type="text" {
    label "Message"
  }

  submit-button "Subscribe"
}
```

---

## Components

ClearHTML supports a powerful component system for reusable markup blocks.

### Defining a Component

Use `define-component` at the top level of your document:

```clearhtml
define-component "user-profile" {
  group style-group="profile-card" {
    heading level=3 { slot }
    paragraph "User description goes here."
  }
}
```

- The `slot` element is a placeholder where children passed to the component will be injected.

### Using a Component

```clearhtml
use-component "user-profile" {
  "John Doe"
}
```

This expands to:
```html
<div class="profile-card">
  <h3>John Doe</h3>
  <p>User description goes here.</p>
</div>
```

---

## Comments

ClearHTML supports both single-line and multi-line comments. These are preserved and converted into standard HTML comments (`<!-- ... -->`).

```clearhtml
// This is a single-line comment

/* 
   This is a 
   multi-line comment
*/
```

---

## Debugging & Source Maps

The ClearHTML compiler automatically tracks line and column information for every element. When running in debug mode, it injects metadata attributes into the output:

```bash
# Run with debug flag
node bin/chtml-parser.js src/index.chtml --debug
```

Output:
```html
<p data-source-line="42" data-source-col="5">Paragraph text</p>
```

---

## Attribute Mapping Reference

- `text` — single-line text input (default)
- `email` — email validation
- `password` — masked input
- `number` — numeric input
- `checkbox` — boolean checkbox
- `radio` — radio button
- `textarea` — multi-line text

### Field Attributes

- `name` — form field name (required)
- `type` — input type (default: "text")
- `required` — boolean flag for required fields
- `style-group` — CSS class

---

## Attribute Reference

ClearHTML attributes map to HTML equivalents:

| ClearHTML Attribute      | HTML Attribute   | Example |
| ------------------------ | ---------------- | ------- |
| `to="..."`               | `href`           | `link to="/about"` |
| `source="..."`           | `src`            | `image source="/pic.jpg"` |
| `description="..."`      | `alt`            | `image description="A photo"` |
| `style-group="..."`      | `class`          | `paragraph style-group="highlight"` |
| `width="..."`            | `width`          | `image width="600" ...` |
| `height="..."`           | `height`         | `image height="400" ...` |
| `identifier="..."`       | `id`             | `group identifier="top"` |
| `accessibility-label="..."` | `aria-label`    | `link accessibility-label="Skip to content"` |
| `relationship="..."`     | `rel`            | `link relationship="nofollow"` |
| `open-in="new-tab"`      | `target="_blank"` | `link open-in="new-tab"` |
| `language="..."`         | `lang`           | `document language="en"` |
| `submit-to="..."`        | `action`         | `form submit-to="/api/submit"` |
| `method="..."`           | `method`         | `form method="post"` |

---

## Writing Styles

### Inline Content

```clearhtml
paragraph "This is a single-line paragraph."
```

### Block Content

```clearhtml
paragraph {
  This is a multi-line paragraph.
  It spans multiple lines and is easier to read.
}
```

### Mixed Content with Children

```clearhtml
content-section {
  heading level=2 "Section Title"
  paragraph "Intro paragraph."
  list type="bulleted" {
    item "Point one"
    item "Point two"
  }
}
```

---

## Validation Rules

The parser enforces these rules:

1. **`main-content` uniqueness** — Only one per page
2. **Links require destination** — `link` must have `to` attribute
3. **Links require text** — `link` must have visible content
4. **Images require accessibility** — `image` must have `description`
5. **Heading levels** — `level` must be 1–6
6. **List types** — `type` must be "bulleted" or "numbered"
7. **Items in lists** — `item` must be inside `list`
8. **Fields in forms** — `field` must be inside `form`

---

## Styling & Customization

All pages automatically link to:
- **`clearhtml.css`** — Base design system
- **`generated.css`** — Custom overrides (optional)

Use CSS custom properties for theming:

```css
:root {
  --bg: #f7f4ee;           /* Background */
  --text: #171410;         /* Text color */
  --accent: #b54a14;       /* Accent color */
  --font-body: 'DM Sans';  /* Body font */
}
```

---

## Compiling to HTML

```bash
npm run compile                                    # Compile all .chtml files
node bin/chtml-parser.js src/file.chtml            # Compile single file
npm run demo                                       # Run demo

# Run npm link for access to the CLI tool
npm link
chtml "your-detailed-prompt"                       # Generate custom CSS
```

---

## Full Documentation

See the following for more details:
- **[README.md](README.md)** — Overview and getting started
- **[ClearHTML-Proposal.md](ClearHTML-Proposal.md)** — Complete design rationale
- **[ROADMAP.md](ROADMAP.md)** — Future plans and phases
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — How to help improve ClearHTML

---

## Version

- **Language**: ClearHTML v1.0
- **Parser**: Node.js with Sesi compiler support
- **Last Updated**: June 2026
