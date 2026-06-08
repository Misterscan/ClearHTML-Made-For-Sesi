# Proposal: ClearHTML, A More Human-Readable Markup Language for Web Documents

## 1. Small sample page in current HTML

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Neighborhood Library</title>
  </head>
  <body>
    <header>
      <h1>Neighborhood Library</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/events">Events</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>

    <main>
      <section>
        <h2>Welcome</h2>
        <p>Our library is open seven days a week.</p>
        <a href="/hours">See library hours</a>
      </section>

      <section>
        <h2>Upcoming Events</h2>
        <ul>
          <li>Story time on Tuesday</li>
          <li>Book club on Thursday</li>
        </ul>
      </section>
    </main>

    <footer>
      <p>&copy; 2026 Neighborhood Library</p>
    </footer>
  </body>
</html>
```

## 2. Same page in redesigned ClearHTML

```clearhtml
document language="en" {
  metadata {
    character-encoding "utf-8"
    page-title "Neighborhood Library"
  }

  page {
    page-header {
      heading level=1 "Neighborhood Library"

      navigation {
        link to="/" "Home"
        link to="/events" "Events"
        link to="/contact" "Contact"
      }
    }

    main-content {
      content-section {
        heading level=2 "Welcome"
        paragraph "Our library is open seven days a week."
        link to="/hours" "See library hours"
      }

      content-section {
        heading level=2 "Upcoming Events"

        list type="bulleted" {
          item "Story time on Tuesday"
          item "Book club on Thursday"
        }
      }
    }

    page-footer {
      paragraph "© 2026 Neighborhood Library"
    }
  }
}
```

# 3. Design goal

ClearHTML is a proposed alternative markup language, or a possible future authoring layer for HTML, designed to make web document structure easier to read, write, teach, lint, and transform.

It does **not** replace the web platform’s rendering model. Instead, it provides a clearer source language that can be compiled or translated into standard HTML.

The core purpose remains the same:

> Structure web documents using semantic elements that browsers, search engines, accessibility tools, and developer tools can understand.

# 4. Core design principles

## 4.1 Prefer readable words over abbreviations

Current HTML contains many short tags that are historically practical but not always self-explanatory.

| Current HTML     | ClearHTML               | Reason                                                  |
| ---------------- | ----------------------- | ------------------------------------------------------- |
| `html`           | `document`              | Describes the whole document directly                   |
| `head`           | `metadata`              | Clarifies that this section is not visible page content |
| `body`           | `page`                  | Easier for non-specialists to understand                |
| `h1`, `h2`, `h3` | `heading level=1`, etc. | Removes numeric tag-name variants                       |
| `p`              | `paragraph`             | Avoids abbreviation                                     |
| `a`              | `link`                  | States purpose directly                                 |
| `img`            | `image`                 | Avoids abbreviation                                     |
| `ul`             | `list type="bulleted"`  | Makes list behavior explicit                            |
| `ol`             | `list type="numbered"`  | Uses one list element with a type                       |
| `li`             | `item`                  | More natural inside lists                               |
| `em`             | `emphasis`              | Describes meaning, not visual style                     |
| `strong`         | `strong-importance`     | Clarifies semantic emphasis                             |
| `div`            | `group`                 | Indicates generic grouping                              |
| `span`           | `text-fragment`         | Indicates inline text grouping                          |

## 4.2 Make document regions explicit

ClearHTML distinguishes between major document regions with names that describe their role.

```clearhtml
page {
  page-header { }
  navigation { }
  main-content { }
  complementary-content { }
  page-footer { }
}
```

This maps cleanly to standard HTML:

```html
<body>
  <header></header>
  <nav></nav>
  <main></main>
  <aside></aside>
  <footer></footer>
</body>
```

## 4.3 Use one heading element with a level attribute

Instead of six separate heading tags:

```html
<h1>Main title</h1>
<h2>Section title</h2>
<h3>Subsection title</h3>
```

ClearHTML uses:

```clearhtml
heading level=1 "Main title"
heading level=2 "Section title"
heading level=3 "Subsection title"
```

This makes headings easier to generate, validate, and reorganize. It also makes heading level transitions more visible.

## 4.4 Use braces for nesting

HTML uses opening and closing tags:

```html
<section>
  <p>Hello</p>
</section>
```

ClearHTML uses block syntax:

```clearhtml
content-section {
  paragraph "Hello"
}
```

This reduces visual noise from repeated closing tags while preserving explicit hierarchy.

## 4.5 Separate content from configuration

Short text can be written inline:

```clearhtml
paragraph "Our library is open seven days a week."
```

Longer content can use block text:

```clearhtml
paragraph {
  Our library is open seven days a week.
  Membership is free for local residents.
}
```

Attributes remain named and readable:

```clearhtml
link to="/hours" label="See library hours"
image source="/photo.jpg" description="Front entrance of the library"
```

# 5. Proposed element model

## 5.1 Document-level elements

| ClearHTML            | Standard HTML output | Purpose                           |
| -------------------- | -------------------- | --------------------------------- |
| `document`           | `html`               | Root document                     |
| `metadata`           | `head`               | Machine-readable page information |
| `page-title`         | `title`              | Browser/tab/search result title   |
| `character-encoding` | `meta charset`       | Text encoding                     |
| `page`               | `body`               | Visible document content          |

Example:

```clearhtml
document language="en" {
  metadata {
    character-encoding "utf-8"
    page-title "Example Page"
  }

  page {
    paragraph "Visible content goes here."
  }
}
```

Compiled HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Example Page</title>
  </head>
  <body>
    <p>Visible content goes here.</p>
  </body>
</html>
```

## 5.2 Page structure elements

| ClearHTML               | Standard HTML output | Purpose                              |
| ----------------------- | -------------------- | ------------------------------------ |
| `page-header`           | `header`             | Introductory page or section content |
| `navigation`            | `nav`                | Navigation links                     |
| `main-content`          | `main`               | Primary page content                 |
| `content-section`       | `section`            | Thematic section                     |
| `article-content`       | `article`            | Self-contained content               |
| `complementary-content` | `aside`              | Related secondary content            |
| `page-footer`           | `footer`             | Closing page or section content      |
| `group`                 | `div`                | Generic block grouping               |

Example:

```clearhtml
main-content {
  article-content {
    heading level=1 "Review: The City Garden"
    paragraph "This article reviews a local community garden."
  }

  complementary-content {
    heading level=2 "Related Links"
    link to="/gardens" "More gardens"
  }
}
```

## 5.3 Text elements

| ClearHTML           | Standard HTML output | Purpose                 |
| ------------------- | -------------------- | ----------------------- |
| `heading level=n`   | `h1` through `h6`    | Section heading         |
| `paragraph`         | `p`                  | Paragraph               |
| `quote-block`       | `blockquote`         | Extended quotation      |
| `quote-inline`      | `q`                  | Inline quotation        |
| `emphasis`          | `em`                 | Stress emphasis         |
| `strong-importance` | `strong`             | Strong importance       |
| `code-text`         | `code`               | Inline code             |
| `preformatted-text` | `pre`                | Preformatted block      |
| `text-fragment`     | `span`               | Generic inline grouping |

Current HTML:

```html
<p>This is <strong>important</strong> and <em>urgent</em>.</p>
```

ClearHTML:

```clearhtml
paragraph {
  This is strong-importance "important" and emphasis "urgent".
}
```

Compiled HTML:

```html
<p>This is <strong>important</strong> and <em>urgent</em>.</p>
```

## 5.4 Links and media

| ClearHTML         | Standard HTML output | Purpose            |
| ----------------- | -------------------- | ------------------ |
| `link`            | `a`                  | Hyperlink          |
| `image`           | `img`                | Image              |
| `audio-player`    | `audio`              | Audio              |
| `video-player`    | `video`              | Video              |
| `captioned-media` | `figure`             | Media with caption |
| `media-caption`   | `figcaption`         | Caption            |

Current HTML:

```html
<figure>
  <img src="/library.jpg" alt="Front entrance of the library">
  <figcaption>The library entrance on Main Street.</figcaption>
</figure>
```

ClearHTML:

```clearhtml
captioned-media {
  image source="/library.jpg" description="Front entrance of the library"
  media-caption "The library entrance on Main Street."
}
```

Compiled HTML:

```html
<figure>
  <img src="/library.jpg" alt="Front entrance of the library">
  <figcaption>The library entrance on Main Street.</figcaption>
</figure>
```

## 5.5 Lists

ClearHTML replaces `ul`, `ol`, and `li` with a single list model.

Current HTML:

```html
<ul>
  <li>Apples</li>
  <li>Oranges</li>
</ul>

<ol>
  <li>Preheat oven</li>
  <li>Mix ingredients</li>
</ol>
```

ClearHTML:

```clearhtml
list type="bulleted" {
  item "Apples"
  item "Oranges"
}

list type="numbered" {
  item "Preheat oven"
  item "Mix ingredients"
}
```

Compiled HTML:

```html
<ul>
  <li>Apples</li>
  <li>Oranges</li>
</ul>

<ol>
  <li>Preheat oven</li>
  <li>Mix ingredients</li>
</ol>
```

## 5.6 Tables

Tables become more explicit about structure.

Current HTML:

```html
<table>
  <thead>
    <tr>
      <th>Day</th>
      <th>Hours</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Monday</td>
      <td>9 AM to 5 PM</td>
    </tr>
  </tbody>
</table>
```

ClearHTML:

```clearhtml
data-table {
  table-header {
    row {
      column-heading "Day"
      column-heading "Hours"
    }
  }

  table-body {
    row {
      cell "Monday"
      cell "9 AM to 5 PM"
    }
  }
}
```

Compiled HTML:

```html
<table>
  <thead>
    <tr>
      <th>Day</th>
      <th>Hours</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Monday</td>
      <td>9 AM to 5 PM</td>
    </tr>
  </tbody>
</table>
```

## 5.7 Forms

Forms are one of the least readable parts of current HTML. ClearHTML makes intent more visible.

Current HTML:

```html
<form action="/subscribe" method="post">
  <label for="email">Email address</label>
  <input id="email" name="email" type="email" required>
  <button type="submit">Subscribe</button>
</form>
```

ClearHTML:

```clearhtml
form submit-to="/subscribe" method="post" {
  field name="email" type="email" required {
    label "Email address"
  }

  submit-button "Subscribe"
}
```

Compiled HTML:

```html
<form action="/subscribe" method="post">
  <label for="email">Email address</label>
  <input id="email" name="email" type="email" required>
  <button type="submit">Subscribe</button>
</form>
```

In this model, a compiler can automatically generate safe `id` and `for` attributes when the author does not provide them.

---

## Further Documentation

- **[README.md](README.md)** — Project overview and setup
- **[SPECIFICATION.md](SPECIFICATION.md)** — Technical reference guide
- **[ROADMAP.md](ROADMAP.md)** — Project roadmap and future plans
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contribution guidelines

# 6. Nesting rules

ClearHTML should be stricter than HTML source syntax. HTML is permissive because browsers must recover from malformed documents. ClearHTML should instead optimize for authoring clarity.

## 6.1 Required top-level structure

Every document must contain:

```clearhtml
document {
  metadata { }
  page { }
}
```

Invalid:

```clearhtml
paragraph "Hello"
```

Valid:

```clearhtml
document language="en" {
  metadata {
    page-title "Hello"
  }

  page {
    paragraph "Hello"
  }
}
```

## 6.2 Only one `main-content` per page

A page should contain exactly one primary content area.

Valid:

```clearhtml
page {
  page-header { }
  main-content { }
  page-footer { }
}
```

Invalid:

```clearhtml
page {
  main-content { }
  main-content { }
}
```

This maps to the accessibility expectation that a document has one main landmark.

## 6.3 List items only inside lists

Valid:

```clearhtml
list type="bulleted" {
  item "One"
  item "Two"
}
```

Invalid:

```clearhtml
item "One"
```

## 6.4 Table cells only inside rows

Valid:

```clearhtml
data-table {
  table-body {
    row {
      cell "A"
      cell "B"
    }
  }
}
```

Invalid:

```clearhtml
data-table {
  cell "A"
}
```

## 6.5 Interactive content cannot be nested inside incompatible interactive content

Invalid:

```clearhtml
link to="/checkout" {
  submit-button "Buy now"
}
```

Valid:

```clearhtml
link to="/checkout" "Go to checkout"
```

This avoids confusing keyboard, screen reader, and pointer behavior.

# 7. Attribute design

ClearHTML renames common attributes to be more readable.

| Current HTML | ClearHTML             | Example                                   |
| ------------ | --------------------- | ----------------------------------------- |
| `href`       | `to`                  | `link to="/about"`                        |
| `src`        | `source`              | `image source="/photo.jpg"`               |
| `alt`        | `description`         | `image description="A red bicycle"`       |
| `class`      | `style-group`         | `paragraph style-group="intro"`           |
| `id`         | `identifier`          | `content-section identifier="events"`     |
| `for`        | Usually automatic     | Generated from `field name`               |
| `aria-label` | `accessibility-label` | `button accessibility-label="Close menu"` |
| `target`     | `open-in`             | `link open-in="new-tab"`                  |
| `rel`        | `relationship`        | `link relationship="noopener"`            |

Example:

```clearhtml
link to="https://example.com"
     open-in="new-tab"
     relationship="noopener"
     "External example"
```

Compiled HTML:

```html
<a href="https://example.com" target="_blank" rel="noopener">
  External example
</a>
```

# 8. Before-and-after examples

## 8.1 Abbreviated tags

Current HTML:

```html
<p>Read the <a href="/guide">full guide</a>.</p>
```

ClearHTML:

```clearhtml
paragraph {
  Read the link to="/guide" "full guide".
}
```

## 8.2 Generic containers

Current HTML:

```html
<div class="card">
  <h2>Membership</h2>
  <p>Membership is free.</p>
</div>
```

ClearHTML:

```clearhtml
group style-group="card" {
  heading level=2 "Membership"
  paragraph "Membership is free."
}
```

The term `group` is still generic, but it reads more naturally than `div`.

## 8.3 Semantic article

Current HTML:

```html
<article>
  <h2>New Reading Room Opens</h2>
  <p>The new reading room opens this Saturday.</p>
</article>
```

ClearHTML:

```clearhtml
article-content {
  heading level=2 "New Reading Room Opens"
  paragraph "The new reading room opens this Saturday."
}
```

## 8.4 Accessible image

Current HTML:

```html
<img src="/map.png" alt="Map showing the library near Pine Street">
```

ClearHTML:

```clearhtml
image source="/map.png" description="Map showing the library near Pine Street"
```

The word `description` is easier for authors to understand than `alt`, especially for beginners.

# 9. Translation model

ClearHTML should not require browsers to implement a new rendering engine. Instead, it can be translated into standard HTML.

## 9.1 Compilation pipeline

```text
ClearHTML source
  ↓
Parser
  ↓
ClearHTML abstract syntax tree
  ↓
Validator
  ↓
HTML generator
  ↓
Standard HTML
  ↓
Browser rendering engine
```

## 9.2 Example translation

ClearHTML:

```clearhtml
content-section identifier="hours" {
  heading level=2 "Hours"
  paragraph "We are open every day."
}
```

Generated HTML:

```html
<section id="hours">
  <h2>Hours</h2>
  <p>We are open every day.</p>
</section>
```

## 9.3 Tooling options

ClearHTML could be supported through:

1. **Build tools**

   * Static site generators
   * Bundlers
   * Documentation systems
   * Component compilers

2. **Editor plugins**

   * Syntax highlighting
   * Auto-formatting
   * Structural validation
   * HTML preview

3. **Browser preprocessing**

   * Not recommended as the default path
   * Useful only for experimentation

4. **Server-side rendering**

   * ClearHTML files stored on the server
   * Standard HTML sent to browsers

# 10. Compatibility issues

## 10.1 Existing browsers do not understand ClearHTML

Browsers understand HTML, CSS, JavaScript, SVG, MathML, and related web standards. They would not natively understand ClearHTML unless browser vendors implemented it.

The practical solution is compilation:

```text
author writes ClearHTML
browser receives HTML
```

## 10.2 Existing CSS expects HTML selectors

Current CSS often targets tags such as:

```css
h1 {
  font-size: 2rem;
}

nav a {
  text-decoration: none;
}
```

If ClearHTML compiles to standard HTML, existing CSS can still work after translation.

ClearHTML source:

```clearhtml
navigation {
  link to="/" "Home"
}
```

Generated HTML:

```html
<nav>
  <a href="/">Home</a>
</nav>
```

CSS remains compatible:

```css
nav a {
  text-decoration: none;
}
```

## 10.3 JavaScript expects HTML DOM elements

JavaScript code often queries HTML elements:

```js
document.querySelector("main");
document.querySelectorAll("a");
```

This remains compatible if ClearHTML compiles to normal HTML.

However, source maps would be needed so developer tools can connect generated HTML back to the original ClearHTML file.

## 10.4 Framework integration would require adapters

React, Vue, Svelte, Angular, Astro, and similar tools are already deeply integrated with HTML-like syntax.

ClearHTML could be adopted in three ways:

| Adoption model          | Description                                            | Difficulty     |
| ----------------------- | ------------------------------------------------------ | -------------- |
| Preprocessor            | ClearHTML compiles to HTML before framework processing | Medium         |
| Template language       | Frameworks support ClearHTML-style templates           | High           |
| Component output format | Components emit ClearHTML before final compilation     | Medium to high |

# 11. Tradeoffs

## 11.1 Benefits

ClearHTML improves:

* **Readability**: `paragraph`, `image`, and `link` are more obvious than `p`, `img`, and `a`.
* **Teachability**: Beginners can infer purpose from names.
* **Accessibility**: Terms like `description` and `accessibility-label` make accessibility features more visible.
* **Validation**: Stricter nesting rules catch errors earlier.
* **Tooling**: A compiler can generate repetitive attributes, enforce document structure, and provide clearer diagnostics.
* **Semantic consistency**: One heading element and one list element simplify the language.

## 11.2 Costs

ClearHTML also introduces problems:

* **More typing**: Descriptive names are longer.
* **New tooling required**: Editors, linters, formatters, and compilers must be built.
* **Learning split**: Authors may need to understand both ClearHTML and generated HTML.
* **Debugging complexity**: Browser developer tools show HTML, not necessarily the original ClearHTML.
* **Migration friction**: Existing codebases, CMS tools, and frameworks are HTML-oriented.
* **Specification burden**: A new language needs precise parsing, error handling, and compatibility rules.

## 11.3 Naming debates

Some HTML names are terse but familiar. For example:

```html
<a>
```

is obscure to beginners, but it is universally known among web developers.

Changing it to:

```clearhtml
link
```

is clearer but disrupts decades of convention.

# 12. Design constraints

ClearHTML should avoid becoming a general programming language. Its purpose is document structure, not application logic.

It should not include:

* Loops
* Conditionals
* Database queries
* Styling rules
* Client-side behavior
* Component state

Those concerns belong to separate layers:

| Concern                 | Recommended layer                          |
| ----------------------- | ------------------------------------------ |
| Structure               | ClearHTML                                  |
| Presentation            | CSS                                        |
| Behavior                | JavaScript                                 |
| Data rendering          | Frameworks or templates                    |
| Accessibility semantics | ClearHTML plus generated ARIA where needed |

# 13. Possible file extension and MIME handling

Potential file extensions:

```text
.clearhtml
.chtml
.readable.html
```

Recommended:

```text
.clearhtml
```

Possible MIME type for tooling:

```text
text/clearhtml
```

However, public web delivery should usually remain:

```text
text/html
```

because browsers already understand it.

# 14. Migration strategy

A realistic adoption path would avoid requiring browsers to change.

## Phase 1: Experimental compiler

Authors write:

```text
index.clearhtml
```

Build tools generate:

```text
index.html
```

## Phase 2: Editor support

Editors add:

* Syntax highlighting
* Formatting
* Autocomplete
* Validation
* HTML preview

## Phase 3: Framework integration

Static site generators and documentation systems add native support.

## Phase 4: Optional browser exploration

Browsers could theoretically support ClearHTML directly, but that should not be required for adoption.

# 15. Summary

ClearHTML keeps the purpose of HTML but changes the authoring experience.

It replaces terse, historically inherited tag names with explicit semantic names:

```html
<p><a href="/about">About us</a></p>
```

becomes:

```clearhtml
paragraph {
  link to="/about" "About us"
}
```

It also simplifies document structure:

```html
<html>
  <head></head>
  <body></body>
</html>
```

becomes:

```clearhtml
document {
  metadata { }
  page { }
}
```

The main value is not that browsers need a new language. The main value is that authors, educators, linters, documentation systems, and code-generation tools could work with a clearer source format while still producing fully standard HTML.
