# ClearHTML Roadmap

A living document outlining planned features, improvements, and future directions for ClearHTML and its Sesi compiler.

---

## Current Status

- ✅ Core language specification (`ClearHTML-Proposal.md`)
- ✅ Node.js parser and HTML generator (`bin/chtml-parser.js`)
- ✅ Sesi compiler for batch compilation (`compiler.sesi`)
- ✅ Base design system (`assets/clearhtml.css`)
- ✅ CSS customization via AI (`customize_css.sesi`)
- ✅ VS Code syntax highlighting extension (`editors/vscode/`)

---

## Phase 1: Foundation (Current)

### Parser & Compiler
- [x] Recursive descent tokenizer
- [x] Full AST validation
- [x] HTML generation with semantic elements
- [x] Automatic stylesheet injection
- [x] File discovery and batch compilation

### Design System
- [x] Typography system (Bricolage Grotesque + DM Sans)
- [x] Color palette and tokens
- [x] Component styling (header, nav, main, footer, forms, tables, lists)
- [x] Responsive layout (max-width, mobile breakpoints)
- [x] Micro-interactions (hover states, transitions)

### Tooling
- [x] Sesi script orchestration
- [x] AI-powered CSS generation
- [x] Error reporting and validation
- [x] Example projects in `examples/`

---

## Phase 2: Expansion (Planned)

### Language Features
- [ ] Variables and computed values in ClearHTML
- [ ] Template/macro system for reusable components
- [ ] Conditional rendering (`if`/`else`)
- [ ] Loop support for repeated elements
- [ ] Comments and metadata preservation

### Parser Improvements
- [ ] Better error messages with line/column information
- [ ] Streaming compilation for large files
- [ ] Source map generation for debugging
- [ ] Linting rules and warnings (`bin/lint.sesi` integration)

### Tooling & Workflow
- [ ] Watch mode for live recompilation
- [ ] Hot reload support for development
- [ ] Build optimization (minification, tree-shaking)
- [ ] Asset pipeline integration
- [ ] CLI tool with subcommands (`chtml build`, `chtml serve`, `chtml lint`)

### Ecosystem
- [ ] NPM package for the parser and compiler
- [ ] Language server protocol (LSP) for better IDE support
- [ ] Additional editor extensions (Sublime, Vim, etc.)
- [ ] Community template library
- [ ] Integration with static site generators (11ty, Hugo, etc.)

---

## Phase 3: Advanced (Future)

### Framework Integration
- [ ] React/Vue component generation from ClearHTML
- [ ] Backend template engines (Django, Rails, etc.)
- [ ] JAMstack and headless CMS support

### Performance & Scale
- [ ] Parallel compilation for large projects
- [ ] Incremental builds
- [ ] Caching layer for unchanged files
- [ ] Benchmarking suite

### Analytics & Observability
- [ ] Build performance metrics
- [ ] Compilation statistics and reports
- [ ] Usage analytics (optional telemetry)

### AI & Automation
- [ ] Auto-generation of ClearHTML from plain text prompts
- [ ] Accessibility auditing and suggestions
- [ ] Content-aware styling recommendations
- [ ] Automated code refactoring

---

## Known Issues & Limitations

### Parser
- Cannot easily handle deeply nested content due to tokenizer design
- Limited error recovery — parsing stops at first syntax error
- Special characters in unquoted prompt blocks need workarounds

### Design System
- Only tested at a single responsive breakpoint (640px mobile)
- Font loading via Google Fonts — no offline fallback provided
- Color palette hardcoded; theming requires CSS variable overrides

### Customization
- `customize_css.sesi` requires network access (Gemini API call)
- Generated CSS may not perfectly match user intent on first try
- No versioning or diff tracking for CSS changes

---

## Community Contributions

We welcome contributions in these areas:

- Additional editor extensions (Sublime, Vim, Emacs, etc.)
- Example projects and templates
- Design system themes and color palettes
- Documentation and tutorials
- Language bindings (Python, Go, Rust parsers)
- Performance optimizations

---

## Release Schedule

- **Q2 2026**: Core language and Sesi compiler stabilization
- **Q3 2026**: Phase 2 language features and tooling improvements
- **Q4 2026**: Ecosystem expansion and community contributions
- **2027+**: Phase 3 advanced features and framework integrations

---

## Feedback & Suggestions

Found a bug or have a feature request? Please file an issue or open a pull request. All feedback is valued.

---

## Documentation Links

- **[README.md](README.md)** — Home
- **[ClearHTML-Proposal.md](ClearHTML-Proposal.md)** — Philosophy
- **[SPECIFICATION.md](SPECIFICATION.md)** — Reference
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contribute
