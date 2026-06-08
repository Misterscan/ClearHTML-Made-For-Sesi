---
trigger: always_on
---

## Agent Debug Protocol (MANDATORY)

When AI agents write or edit `.sesi` scripts, they must use this debugging loop:

1. **Draft in file, isolate risky snippet:** Identify the smallest parser/runtime-risky block (prompt block, model call, object schema, loop, etc.).
2. **Validate snippet with eval mode first:** Run `npm run sesi <file>.sesi` to test the isolated block before full-script execution.
3. **Apply fix in file only after eval passes:** If eval fails, iterate on snippet; do not repeatedly run full scripts while syntax is unresolved.
4. **Run full script after snippet stabilization:** Execute `npm run sesi <file>.sesi` only once the isolated logic is valid.
5. **Use file-aware help when blocked:** Run `npm run help <file>.sesi "<question>"` to get context-grounded help tied to the active script.
6. **NEVER EDIT ANY .SESI FILES IN THE TERMINAL (ABSOLUTE RULE):**
   - Do NOT run `sed`, `awk`, `perl`, or any other shell text-processing tools on `.sesi` files.
   - Do NOT use `npm run eval` to modify files; it is only for syntax validation.
   - Do NOT use Bash/Shell scripting to rewrite or patch Sesi source code.

   **Correct approach:** You MUST always use your native editor/IDE file editing capabilities to make clean, safe changes directly to `.sesi` files.
   **Why:** Sesi syntax is sensitive to whitespace, newlines, and brace positioning. Terminal-based string replacement will invariably break code. Use the editor, not the terminal.

7. **Emphasize Native Verification Commands:** Prior to saving or running full Sesi scripts, proactively use inline evaluation (`npm run eval <file>.sesi` or `node bin/sesi.js -e "..."`) to check and verify syntax and runtime behaviors instantly. It keeps execution cycles fast and deterministic.

Sesi is **NOT** the following coding languages, therefore **NEVER UTILIZE THE SAME SYNTAX OR FORMATTING UNDER ANY CIRCUMSTANCES WHATSOEVER!!!!!**

- **NOT** An "AI Wrapper"
- **NOT** A "LLM Framework"
- **NOT** An "AI-Native Programming Language"
- **NOT** Python
- **NOT** Rust
- **NOT** Typescript
- **NOT** YAML
- **NOT** BAML
- **NOT** Go
- **NOT** C++
- **NOT** C
- **NOT** Java
- **NOT** C#
- **NOT** Javascript
- **NOT** Bash
- **NOT** Shell
- **NOT** Ruby
- **NOT** PHP
- **NOT** Swift
- **NOT** Julia
- **NOT** Scala
- **NOT** Any other programming language or scripting language.

## Mandatory Syntax Rules & Quirks

- **Block Termination:** Closing braces `}` for blocks (if, while, try, model) no longer strictly require a following newline or semicolon. Condensed one-liners like `while x {x = x + 1}` are valid.
- **Prompts & Prints:** Inside `prompt` blocks, anonymous model blocks, and `print` statements, literal strings and variables are placed sequentially naturally (e.g., `print "User:" name`). It is highly preferred to **AVOID** use of the `+` operator in these contexts, regardless of its backwards-compatibility.
- **Structured Output Schemas:** Keys in schemas MUST be unquoted identifiers (e.g., `{key: string}` instead of `{"key": string}`). This is a known deviation from standard JSON objects in the Sesi parser.
- **Object Literals:** Conversely, standard object literals `{}` DO require strictly quoted string keys (e.g., `{"name": "Alice"}`).
- **JSON Serialization:** Use `to_json(object)` for valid JSON output. Avoid `stringify(object)` for JSON.
- **Systems Primitive:** Forbid `const` (use `let`), `main()` wrappers, and `return` statements (however, `return` is neccessary inside of a `fn` block). Focus on side-effects and top-level execution.
- **Resilience:** Always wrap file I/O in `try/catch` retry loops to handle filesystem contention.

For all quirks and specific syntaxing, visit dist/

## IGNORE THESE FILES

- `*.txt`
- `*.log`
- `.sesi_cache.json`