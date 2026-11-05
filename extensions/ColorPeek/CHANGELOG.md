# 📋 ColorPeek Changelog

All notable changes to the **ColorPeek** extension are documented in this file.

---

## [1.0.0] — 2026-11-04

### Initial Release — "Pick. Inspect. Copy."

#### Added
- **Core Eyedropper Sampling**: Native `EyeDropper` API integration with display pixel sampling and cancel handling.
- **Element CSS Computed Inspector**: Content script with floating HUD showing element tag, classes, computed `color`, `background-color`, and `border-color` with parent background compositing for transparent layers.
- **Universal Color Conversion**: Bidirectional conversions across 3, 4, 6, 8-digit HEX, RGB, RGBA, HSL, HSLA, named colors, and CSS custom variables.
- **WCAG 2.1 Contrast Engine**: Exact sRGB channel linearization, relative luminance computation, and AA/AAA compliance evaluation for normal and large text.
- **Harmonic Palettes & Shading Scale**: Algorithms for Complementary, Analogous, Triadic, Tetradic, Monochromatic harmonies and 10-step design system tint/shade curves (50 to 900).
- **Palette Management**: Create, rename, delete palettes, reorder colors, add developer notes, and track recent picks with automatic deduplication.
- **Developer Code Export Center**: Direct snippet generation for CSS Custom Properties (`:root`), SCSS variables, Tailwind CSS configurations, plain HEX lists, and JSON design tokens.
- **CSS Gradient Studio**: Interactive multi-stop linear and radial gradient builder with angle control.
- **Workstation UI**: Compact popup interface (`popup.html`) and studio workstation dashboard (`dashboard.html`).
- **Automated Test Suite**: 216 self-contained automated tests across 8 test suites passing at 100%.
- **Documentation**: Comprehensive `README.md`, `ARCHITECTURE.md`, `PERMISSIONS.md`, `PRIVACY.md`, and `TESTING.md`.
