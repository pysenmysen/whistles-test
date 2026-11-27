# Starter changelog

What changed in the starter's own files (preview/, scripts/, AGENTS.md). A project brings
them in with `npm run starter:update`, which lists the entries it doesn't have yet. Newest
first; one line each.

## 2026-11-27

- The default colour mode is the theme's first, whatever it's called (Light, Default-light…): shown once in Themes and the Theme switch, not as a second Light column.
- Gradients & effects draws the file's gradient styles from the export (`bg-[style]` utilities), named and grouped as in Figma (Gradient/Soft, ↓ ← → ↑). Exports from before GrebFig adds them still show each stop fading to the clear one.
- AGENTS.md: build one type per session or subagent, shared pieces first; fetch a composite on one variant once its parts are built; check the preview with read_page and computed styles, one screenshot per type; print one set's showcase instead of reading specs.json.
- A new project's preview.config.tsx has one example per kind of showcase.
- The preview finds the theme's background and text roles itself (ui-background-default, canvas-bg, ui-pri…); `stage` in preview.config.tsx is optional, for when it picks wrong.
- Gradients & effects shows gradient stops named by opacity (100, 40, 0) as well as by name (soft, hard, transparent); Effects only when there are any.
- Export warnings show on the page they're about: colours on Themes, icon sizes on Assets.
- npm run starter:update brings in the starter's newest preview, scripts and rules.
- npm run import finds this client's export in Downloads and stops on another client's.
- The preview is titled [Client] Stylesheet, from the export.
