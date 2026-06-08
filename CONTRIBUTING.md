# Contributing to ClearHTML

Thank you for your interest in contributing to ClearHTML! This project aims to make the web more readable for everyone.

## Core Documentation

Before contributing, please familiarize yourself with our core documentation:

- **[README.md](README.md)** — Project overview and setup
- **[ClearHTML-Proposal.md](ClearHTML-Proposal.md)** — Language design rationale and philosophy
- **[SPECIFICATION.md](SPECIFICATION.md)** — Technical reference for elements and attributes
- **[ROADMAP.md](ROADMAP.md)** — Current status and future plans

## How to Contribute

### 1. Reporting Bugs

- Use the GitHub issue tracker.
- Provide a minimal `.chtml` file that reproduces the issue.
- Describe the expected vs. actual HTML output.

### 2. Suggesting Features

- Open an issue to discuss your idea before implementing it.
- Explain how the change aligns with the "Human First" design goals of ClearHTML.

### 3. Improving the Parser

The parser lives in `bin/chtml-parser.js`. It's a dependency-free Node.js script.

- Ensure all existing chtml files in `src/` still compile correctly.
- Add  tests using imports from `bin/test-runner.sesi` for new features.

### 4. Improving the Compiler

The compiler is written in Sesi (`compiler.sesi`). It handles the build orchestration.

- Focus on performance and better error reporting.
- Ensure cross-platform compatibility (macOS, Linux, Windows).

### 5. Enhancing the Design System

The design system lives in `assets/clearhtml.css`.

- Focus on accessibility (a11y), responsive design, and readability.
- Use CSS custom properties for easy theming.

### 6. Documentation

- Help us improve the [SPECIFICATION.md](SPECIFICATION.md) or [ROADMAP.md](ROADMAP.md).
- Add new tutorials or example `.chtml` files to the `examples/` folder.

## Development Workflow

1.  **Fork** the repository.
2.  **Clone** your fork locally.
3.  **Install dependencies**: `npm install`.
4.  **Create a branch** for your changes.
5.  **Run tests**: `npm run sesi bin/test-runner.sesi`.
6.  **Commit** with descriptive messages.
7.  **Push** to your fork and **open a Pull Request**.

## Design Philosophy

When contributing to the language itself, always ask:
- Is this name self-describing?
- Does this reduce cognitive load for a new developer?
- Does this map clearly to a semantic HTML equivalent?

---

*ClearHTML is a Sesi native project. We love using Sesi scripts for our build pipeline!*
