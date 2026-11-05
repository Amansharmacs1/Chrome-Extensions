# Contributing to ViewPortX

Thank you for your interest in improving ViewPortX! We welcome bug reports, layout heuristic suggestions, and code contributions.

---

## Development Setup

1. Clone or navigate to the repository:
   ```bash
   cd extensions/ViewPortX
   ```
2. Verify test harness runs cleanly:
   ```bash
   npm test
   ```
3. Load unpacked in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `extensions/ViewPortX`

---

## Code Standards

- **Zero Heavy Build Step**: Keep core modules self-contained using modern vanilla ES Modules.
- **Strict Typing**: Update `src/types/index.ts` whenever data structures or interfaces change.
- **Maintain 100% Test Pass Rate**: Always write matching unit tests under `tests/` for new heuristic rules or transformation properties.
- **Non-Destructive Overrides**: Overrides must use non-destructive CSS rules (`max-width`, `box-sizing`, `overflow-x`) without breaking functional event listeners or hiding essential content.

---

## Submitting Pull Requests

1. Create a feature branch (`git checkout -b feat/new-heuristic-rule`).
2. Implement your changes with clean, documented code.
3. Run the complete automated test suite (`npm test`).
4. Commit your changes with descriptive commit messages following Conventional Commits (`feat: add grid minmax heuristic`).
5. Open a Pull Request detailing the changes and before/after layout screenshots.
