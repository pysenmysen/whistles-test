# Greb starter

Builds a Figma file's components in code from GrebFig's export and Figma's MCP, with a
preview of the stylesheet and every component. Stack: Vite, React, TypeScript, Tailwind CSS
v4. No other libraries. Project-specific notes and decisions are in `PROJECT.md`.

- Each component has its own folder under `src/components/`.
- `preview/` is a generic preview: it reads `src/theme.css`, `design/specs.json` and
  `src/assets/`, and shows the foundations and every component. `src/preview.config.tsx`
  maps each Figma set to its component; nothing else in it is project-specific.
- `src/theme.css` is GrebFig's export of every variable and mode. Never edit it: a new export
  replaces it.
- `design/` holds the rest of the export: `components/` (one file per component Spec),
  `foundations.md`, `assets.md`, `specs.json` (`specs[].slice` names each component file),
  and `CONTRACT.md`, the formats of the export and of `changes.json`. `changes.json` is this
  project's own: what code changed that Figma owns.
- `npm run import` brings in a new export (`~/Downloads/[client]-grebfig-export.zip`).
  `npm run dev` serves the preview on port 5175. `npm run check` lints, type-checks and runs
  the design check.

Work only from Figma's MCP and the export in this folder. Don't edit `preview/`, `scripts/` or this file:
`npm run starter:update` replaces them. A fix they need goes to the greb-starter repo; a
project's own rules go in `PROJECT.md`.

## Rules for every component

1. The set id for `get_design_context` is in the header comment of the component's file in
   `design/components/` ("Figma: Spec …, Input/Select: set …"). A build doesn't need
   `specs.json`; don't find sets through a section's overview.
2. Call `get_design_context` on each set you build: that's the only MCP call a component
   needs. A set whose `Uses:` files are already built: call it on one variant (Default, closed,
   from `get_metadata` on the set), not on the whole set, and take the parts it contains from their
   own code. A set's own states are in its Spec's States table.
3. A component's Spec is its file in `design/components/`. Read that file and the files in
   its `Uses:` line, nothing else from there. Never read `components.md` whole. In
   `design/foundations.md`, read only the sections the Spec names, such as Code or the type
   Spec (Buttons, Inputs): `grep -n '^# ' design/foundations.md`, then read that line range.
   Read Specs from disk; don't open them through the MCP. `design/assets.md` has Brand
   assets, for builds that need them.
4. `src/theme.css` is GrebFig's export of every variable and mode. Use it as it is:
   don't edit it and don't call `get_variable_defs`. A variable you need that isn't
   there goes in PROJECT.md › Open questions.
5. Build only what the component and its Spec say. Don't invent props, states or styles.
6. A component is done when `npm run check` passes: oxlint, `tsc -b`, and the design check
   (every theme class and variable you used is in `src/theme.css`).
7. Icons come from `src/assets/icons/` (`[name]-[size].svg`, drawn in `currentColor`, one
   file per size), placed with the one `Icon` component. Never draw paths, and never
   download the MCP's coloured copies of an icon.
8. Add each built set to `src/preview.config.tsx`, so the preview shows it. Its comment has
   one example per kind of showcase. Print only that set's showcase, never read
   `design/specs.json` whole:
   `node -p "JSON.stringify(require('./design/specs.json').sets.find((s) => s.name === 'Input/Select').showcase)"`.
9. Something missing, unclear or contradictory in a Spec goes in PROJECT.md › Open
   questions, quoting the line. Don't guess silently.

## Building many components

Every tool call re-sends the whole conversation, so a long one costs more with every step.

1. One session or subagent per type (Buttons, Links, Tabs, Accordions, Breadcrumbs, Inputs, and
   so on): it reads only that type's Specs, its foundations sections and its sets.
2. Build what several types share first, in the first session: Icon, the focus ring, a field's
   container, a list's keyboard behaviour. Later sessions import it and don't rebuild it.
3. The session that hands out the types reads no Specs and fetches no sets. It runs
   `npm run check` at the end.

## Checking in the preview

Check a component with text, not pixels: `read_page` for its structure and text, a
`javascript_tool` call on `getComputedStyle` for a colour, size or transition. Take one
screenshot per type when it's done, not one per state.

## Updating after a new export

1. `npm run import` brings the export in, checks its format version and lists what changed;
   `git diff` on `src/theme.css` and `design/` shows how.
2. A changed value in theme.css needs no code change (components use names), unless a
   variable a component uses was renamed or removed: `npm run check` finds those.
3. A changed Spec: `git diff --stat design/components/` lists the changed components; read
   only those files. A changed foundations Spec hash: read only that section of
   `design/foundations.md`. Update what they change.
4. A changed set hash, or a new set: call `get_design_context` on that set only.
5. Don't fetch anything whose hash didn't change.
6. A new export version is a new baseline: hashes don't compare; read the changed Specs,
   fetch nothing; commit it as the baseline.
7. An update is done when `npm run check` passes.

## Changes Figma should know about

Figma is the source of truth. `src/theme.css` and `design/` are replaced by every export, so a
design change made only in code is lost. Never edit Figma designs directly. When you change
something a designer owns, also add an entry to `design/changes.json`. The format is in
`design/CONTRACT.md` › Changes. `npm run check` validates the file.

Push only when asked ("push to Figma"), in one `use_figma` call on `design/specs.json`'s
`file`:

```js
figma.root.setSharedPluginData('grebfig', 'code/inbox', JSON.stringify(/* design/changes.json */));
return 'sent';
```

Sending it again is safe. Without the MCP, the designer imports the file in GrebFig › From
code.

After an export, remove the ids listed in `design/specs.json` `fromCode` from
`design/changes.json`.
