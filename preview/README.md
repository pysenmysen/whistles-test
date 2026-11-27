# GrebFig preview

A page that shows a project's GrebFig export: every foundation in `theme.css`, and the components built from it,
in every mode. It has no client-specific code: the project supplies its export and a list of components.

## What it needs from the project

```
your-project/
  preview/              ← this folder, copied as it is
  design/               ← the rest of GrebFig's export (foundations.md, assets.md, specs.json)
  src/
    theme.css           ← GrebFig › Template Specs › Export for code
    index.css           ← the Tailwind entry
    preview.config.tsx  ← which components to show
    main.tsx
    components/…
```

Stack: Vite, React, TypeScript, Tailwind CSS v4.

## Set it up

1. Copy `preview/` into the project root.
2. Put GrebFig's export in `src/theme.css` (and the Markdown files in `design/`). The preview reads
   `src/theme.css` itself (`preview/theme/readTheme.ts`), so a new export shows up with no code changes.
3. In `src/index.css`:

   ```css
   @import "tailwindcss";
   @import "./theme.css";
   @import "../preview/preview.css";
   @source "../preview";
   ```

4. Add `"preview"` to `include` in `tsconfig.app.json`.
5. Register components in `src/preview.config.tsx`, and render the preview from `src/main.tsx`:

   ```tsx
   import { Preview } from '../preview/Preview'
   import { config } from './preview.config'

   createRoot(document.getElementById('root')!).render(<Preview config={config} />)
   ```

## Register components

One entry per Figma component set. The preview draws a card per state, with every size inside it,
then any extra examples, and groups entries into sidebar pages by `page`.

```tsx
export const config: PreviewConfig = {
  // Figma set name (as in specs.json) → its component. The preview draws the set's showcase and asks for one Cell at a time.
  sets: {
    'Button/Primary/Md': { page: 'Buttons', render: (c) => <ButtonPrimary size="md" disabled={c.state === 'Disabled'} /> },
  },
  // Optional: the surface components sit on. Left out, the preview finds the theme's background and text roles.
  // stage: 'bg-ui-background-default text-ui-content-primary',
}
```

The title is *[Client] Stylesheet*, from the export's `client`.

- **Hover**, **Pressed** and **Focus** are drawn by the preview: it sets `data-preview="hover"`, `"active"` or `"focus"` on the component's
  first link, button or tab, and `preview.css` makes that match the component's own `hover:`, `active:` and `focus-visible:` classes.
  `render` only handles data states (Disabled, Selected, Current, Open…).
- A set with one size leaves out `sizes`.
- Everything sits on a 12-column grid (up to 1200px): each state spans 3 columns (four per row), each example 6
  (two per row). Give an example `span: 12` for the full width, or `3` for a small one.

## What it shows

- **Foundations**, laid out like Figma's Foundations page: Primitives, Themes (a Variable / Light / Dark table, one
  column per mode), Gradients & effects, Typography, Layout, Interaction. Each variable as its visual and its
  Figma-style name (`color/base/black`, `space/sm`, `Misc/14_100_UC`), with a value where the value is the point.
- **Components**: one page per `page` in the config.
- **Theme** at the top of the sidebar: a toggle for two modes, a dropdown for more (Light and every `[data-theme]`
  mode in theme.css). It sets `data-theme` on the main area, so every page shows that mode; the chrome follows it.
  Other switches (icon size) are set where they're used, so the Layout page shows all their values instead.
- The URL hash keeps the page (`#buttons`, `#layout/grid`), so a reload keeps your place.

## Files

- `Preview.tsx`: the shell (sidebar, top bar and menu below 768px, switches, pages).
- `theme/readTheme.ts`: parses `src/theme.css` into variables, modes, media blocks and utilities; Figma names.
- `foundations/FoundationPages.tsx`: the Foundations pages.
- `components/ComponentPage.tsx`: draws a page from the registered entries.
- `preview.css`: the GrebFig plugin look as `--pv-*` variables, light and dark, and the `data-preview` variants.
