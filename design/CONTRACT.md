# Contract

What GrebFig hands to code (the export) and what code hands back (changes). The starter
project, its preview and every agent read these formats. Change them only in ways old
readers ignore, or bump the version: `export` in specs.json, `v` in changes.json.

## Export, version 2

Foundations › Export › Download all gives `[client]-grebfig-export.zip`, its files at their
places in the project. `[client]` is specs.json's `client` without accents, lowercase, every
run of other characters a `-` (`Åhléns City` → `ahlens-city`); with no client, just
`grebfig-export.zip`. The starter's `npm run import` finds it, checks the client matches, and
unzips it over the project after clearing the one folder that can lose files:

```bash
rm -rf [project]/design/components && unzip -o ~/Downloads/[client]-grebfig-export.zip -d [project]
```

| File | What it is |
|---|---|
| `src/theme.css` | Every variable and mode, as Tailwind 4 `@theme` plus a block per mode (`[data-theme="dark"]`). Text styles, gradient styles (`bg-[style]`), effects, textures, durations and the scroll bar as utilities and base rules. Never edited by hand. |
| `design/components/[name].md` | One component Spec. `[name]` is its Figma name, lowercase, `-` for `/` and spaces. The first line is a comment: the Spec's id, each set's name and id, and `Uses:` the files of the components it contains. |
| `design/foundations.md` | The shared Specs (Code, the foundations, the type Specs such as Buttons), `#` heading per Spec. |
| `design/assets.md` | Brand assets, and the list of icons and images. |
| `design/components.md` | Every component Spec in one file. Kept for old readers; dropped in version 3. |
| `src/assets/icons/[name]-[size].svg` | One file per icon and size, drawn in `currentColor`. |
| `src/assets/images/[name].png` | Images components use. |
| `design/specs.json` | The index, below. |
| `design/CONTRACT.md` | This file, as of the GrebFig that exported. |

No file but specs.json carries the version or the date, so a release changes only specs.json.

### specs.json

```json
{ "export": 2, "grebfig": "1.30.0", "exported": "2026-11-27T06:32:04.659Z", "file": "[Figma file key]", "client": "[Client]",
  "specs": [], "sets": [], "layout": {}, "names": {}, "fromCode": [], "warnings": [] }
```

- `export`: this format's version. A reader that doesn't know it stops and says so.
- `file`: the Figma file key, for the MCP.
- `client`: the Project Spec's Client line, else the Figma file's name. The preview's title.
- `specs[]`: each exported Spec: `name`, `file` (`foundations.md`, `assets.md` or
  `components.md`), `slice` (its file in `design/components/`, components only), `id`,
  `hash` (of its exported text), `page`, `stale` (Figma's Spec is behind the template).
- `sets[]`: each documented component set: `name` (Figma's), `id`, `spec` (its Spec's id),
  `hash` (of its structure: an update fetches only sets whose hash moved), `page`,
  `width` (`hug`, `fill` or `both`), `showcase`.
- `showcase`: what the preview draws, from the set's Generate plan. `cell` (card width),
  `states` (Figma's order), `stateProp` (a yes/no state's prop), `modes`, `switches`,
  `variants[]` (`title`, `props` in camelCase, `widths`, `focusVisible`, slot `count` and
  `states`), `behaviour[]` (`title`, `text` prop, `props`, `short`, `long`), `validation`.
- `layout`: `maxWidth`, `grid[]` (`platform`, `width`), `overlay[]` (`platform`, `width`,
  `height`, `panel` as `[x, y, w, h]`).
- `names`: CSS name to Figma name, for every variable, text style and effect.
- `fromCode[]`: changes handled in Figma: `id`, `status` (`applied`, `done`, `dismissed`),
  `at`. Code takes these out of its changes.json.
- `warnings[]`: what to fix in Figma, as sentences.

## Changes, version 1

`design/changes.json` in the project: what code changed that Figma owns. Figma stays the
source of truth; a change reaches the file as a proposal, and a designer applies it.

```json
{ "v": 1, "changes": [
  { "id": "c-20261127-1", "kind": "token", "name": "--color-ui-fill-primary", "mode": "dark", "from": "#111111", "to": "#000000", "why": "…" },
  { "id": "c-20261127-2", "kind": "setting", "sets": [{ "id": "14134:89161", "hash": "…" }], "setting": "width", "to": "fill", "why": "…" },
  { "id": "c-20261127-3", "kind": "note", "sets": [{ "id": "14134:89161", "hash": "…" }], "text": "Padding 12 to 16 on Md", "why": "…" }
] }
```

- `id`: unique, `c-YYYYMMDD-N`. Same id, same change: a new version replaces the old one.
- **token**: a variable by its CSS name. `mode` is the mode's slug (`dark`), left out for the
  default. `from` is the value code saw; if Figma's value is different now, the change is
  blocked. `to` is hex, px, rem, ms or `var(--x)`; anything else is set by hand.
- **setting**: what Details › Component sets: `width` (`hug`, `fill`, `both`), `long` (`wrap`,
  `truncate`, `grow`) or `long/[text part]` (those, or `scroll`).
- **note**: anything else (padding, a new variant, structure), a to-do for the designer.
- `sets`: `id` and `hash` from specs.json, for every size the change touches. A setting on a
  set whose hash moved is blocked: export, then send it again.

### Sending it

Either way, the whole file as it is. GrebFig merges by id and skips changes it already
handled, so sending the same file twice is safe.

- **Through Figma's MCP**, one `use_figma` call on specs.json's `file`:
  ```js
  figma.root.setSharedPluginData('grebfig', 'code/inbox', JSON.stringify(/* design/changes.json */));
  return 'sent';
  ```
- **Without the MCP**: Foundations › Export › From code › Import changes.json.

The designer applies, does or dismisses each one in From code. The next export lists them
in `fromCode`.
