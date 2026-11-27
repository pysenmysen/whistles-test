<!-- design/foundations.md from GrebFig (specs.json has the version and date). Values are in theme.css; each Spec names them. -->

# Code

How the project builds what's in the file, and how to read a component Spec.

### Reading a component Spec

Only what the MCP can’t read from the component. The rest (variants, layout, variables, text styles) comes from the component.

- **Anatomy**: each part by layer name, `*` when required, with its props, the component it is and notes. One table per variant that changes the parts. **Sizes**: each set, with what differs.
- **Props**: only where code differs from what the MCP writes (text and variant props it writes as they are): ⏻ boolean (shows a part, or an on/off variant like Open), ⇄ swap, ▣ slot. Names as code writes them.
- **States**: each animated change, its trigger and preset (hover, press and focus are CSS: `:hover`, `:active`, `:focus`, never a click handler; On validation and Set by the app are props), and only what the variants can’t show: what moves (layers first: `LeftIcon: translate: 0 -2px`, from Default), what appears, and what swaps. Every other change (colours, size) animates with the preset; the variables are on the variants.
- **Behavior**: only what differs from the type’s Spec (Button/… follows Buttons; another type is named).
- A Fill width comes from the parent (`w-full`), not a prop.

### States in code

| **State** | **In code** |
|---|---|
| `Error` | `aria-invalid` |

`Notify`, `Added`: a prop of the same name.

### Rules

- A component is one component in code, named without slashes (`Button/Primary` → `ButtonPrimary`).
- Size sets are a `size` prop (`Md`, `Sm`); one size alone is no prop. Device sets are breakpoints in CSS.
- A part's prop is named after the part (`LeftIcon` → `leftIcon`). A boolean that shows a part is an optional prop or slot. ⏻ + ⇄ on one part are one optional prop that takes the icon; ⇄ alone on a required part is a required prop. Icons: the Icons Spec.
- Strokes are inside and take no space (`inset-ring`, or `box-shadow: inset`). On a frame whose children have a fill, the stroke is an `::after` on top: the children cover an inset ring.
- A data state (Disabled, Selected, Current, Open) is a boolean prop of the same name (`selected`); interaction states (Hover, Pressed, Focus) are CSS only. One the user changes is controlled with `open` + `onOpenChange`, else the component keeps its own; one at a time is the page closing the rest. A data state that's a value of `State` has no hover or press: only the focus ring shows.
- A nested component's prop (⇄, or a required part with no prop of its own) is named after the part and takes that component's props (`active` → `{ label }`); an icon's takes the icon.
- Long text does what Typography's default says, or its part's Anatomy when it differs. A part that truncates shrinks with its container (`min-w-0`); the parts beside it don't (`shrink-0`). Truncate is `overflow-x-clip text-ellipsis whitespace-nowrap`, not `truncate`: its `overflow: hidden` cuts the descenders at line height 1.
- Scroll bars: every element that scrolls has the file's thin scroll bar (`ui/scroll/thumb` on `ui/scroll/track`, set in theme.css). `scrollbar-none` hides it where a Spec says no visible scrollbar. No note (–) is that default. Wrapping text is start-aligned; the MCP's `whitespace-nowrap` on it is Figma's auto width.
- An unbound fixed width on a main component (`w-[540px]`) is for display. In code the component fills its parent.
- Width: a component hugs its content unless its Spec has a Width line (fills, or both).
- A container (`Breadcrumb/Trail`, `Tab/Bar`) has no states; its items do.
- A main component may show every optional part for styling: the Spec's combination rule wins.
- Every value is a variable; a raw value is a bug. Tailwind: theme classes only, no arbitrary values. CSS: one module per component, no inline styles.

### Tokens

Each variable's code syntax is its name in code, so the MCP writes it; `theme.css` (GrebFig › Export for code) has every value. Use it; don't rebuild values from `get_variable_defs`.

- Specs name variables as in Figma (`ui/link/hover`, `space/sm`). In code: colours → `--color-`, `space/` → `--spacing-`, `font/` → `--font-`, `radius/` → `--radius-`, text styles → `--text-`; anything else is its path with `-` (`stroke/focus` → `--stroke-focus`).
- Spacing names are also Tailwind's width names: `max-w-3xl` reads `space/3xl`. A page width is `max-w-(--container-3xl)`.
- The MCP writes `bg-[var(--color-x)]`; in code that's `bg-x`. A variable outside Tailwind's namespaces (`stroke/`, `focus/`) goes in a class as `utility-(--name)`.

---

# Primitives

Raw colours. Themes point to them.

### Rules

- Never bound in a design or component: a theme role points to it.
- A colour at an opacity is its own primitive (`color/base/black/50`), so a theme never sets opacity.
- Named for what it is (`color/base/gray/600`), never where it's used.

---

# Themes

Colour roles, per mode.

### Rules

- Every role points to a primitive.
- Each content variable names the background it sits on (`ui/content/primary` on `ui/background/primary`). Every pair passes contrast at `project/a11y/level`: 4.5:1 text, 3:1 large text, icons and borders.

### In code

- Every mode has the same variables; the first is the default. Another mode overrides them: `[data-theme="dark"]`. Components never redefine them.

---

# Gradients & effects

Gradients, shadows and textures, each a style.

### Rules

- Every gradient stop and shadow colour is a theme variable, so it follows the mode.
- One shadow per elevation (`Shadow/Sm`), never a shadow set by hand.

### In code

- A gradient style is a `bg-[style]` utility in theme.css (`Gradient/Hard/Down` is `bg-gradient-hard-down`): its stops are theme colours, so it follows the mode. Never a fixed image.
- A texture (`Texture/Noise`) is a `texture-[name]` utility: an `::after` over the surface with the noise as an SVG. Close to Figma's, not the same.

---

# Typography

Text styles grouped by role: **Primary** (headings), **Secondary** (body), **Misc** (UI, labels, inputs).

### Rules

- Text always uses a style.
- Inputs render at ≥16px on mobile, below 16px iOS zooms in on focus. Labels and messages at least 12px.
- Labels and headings are short: 2 to 3 words. Text someone types, and messages, can be any length.
- **Long labels**: Labels wrap unless a component sets its own (Details).

### In code

- The MCP's font fallback `'Arial:Regular'` is family:style, not a weight.
- Paragraph and list spacing, when a style sets them, become `margin-block-end` on `<p>` and `<li>`.
- Underline on a link in running text sits on top of the style; the style itself isn't underlined.

---

# Grid & breakpoints

One layout grid per breakpoint, for horizontal placement. Vertical rhythm comes from `space`, not from here.

### Rules

- Design at each platform's design size.
- Content stays within the columns, up to `columns/max-width`. When max width is `–`, the page has no cap and keeps growing.
- 320px is the mobile accessibility floor. Nothing may break above it.
- Overlays are sized by their panel, not the page. On mobile they're bottom sheets.

### In code

- Breakpoints are `min-width`, mobile first.

---

# Spacing & sizing

Spacing, corner radius, stroke width and tap targets.

### Rules

- Gaps and padding use the `space/` scale.
- A larger step is always a larger value.
- `radius/pill` is fully rounded, not a measurement.
- Anything you tap or click is at least `size/tap/min`.

### In code

- `space/…` is the spacing scale: `p-sm`, `gap-xs`.

---

# Switches

Variables with modes that aren't colour themes: one value that changes with a setting or with the screen.

### Rules

- A mode collection holds what changes together (icon size, input text size per device).

### In code

- A mode named after a breakpoint group (`Mobile`, `Desktop`) is a media query from that breakpoint up; the smallest is the default.
- Any other mode is set where it's used (an `Icon` at `Sm`): `data-[collection]="[mode]"` on the element; the first is the default.

---

# Motion & interaction

Motion is a set of presets, each a curve and a duration. Timings are how long something waits or stays.

### Rules

- Everything that moves uses a preset, hover states included. Every property that changes between two states animates with it.
- Leaving a state uses the preset of the state it returns to. A preset with in and out uses in to appear and out to go.
- Pressed states start instantly unless the press has its own preset.
- Content that moves while the component keeps its size is a `translate`. When the component changes size, the move is its gap or padding growing, which animates with the preset.

### In code

- A preset is a `transition` (or `animation`): `duration-[name] ease-[name]`. GrebFig's export writes a `duration-[name]` utility for each preset, since Tailwind has no duration namespace.
- A transition belongs to the state it lands on: the base and `:hover` take Hover's preset, `:active` takes Pressed's. Releasing a press uses Hover's.
- `prefers-reduced-motion: reduce` sets every duration to 0. Opacity transitions are kept; motion stops.

---

# Focus

The keyboard focus ring. Drawn over any focusable component.

### Rules

- Focus visible is the ring: `:focus-visible`, keyboard focus only. Mouse click or tap shows nothing.
- A Focus state (a field's border) is `:focus`, any focus, without the ring. A component with no Focus state has only Focus visible.
- Not a variant. Nothing on the component changes, the ring appears on top.
- Stretches with the component. Takes no space in the layout.

### Tokens

- `ui/focus` and `stroke/focus`: the ring's colour and width. `focus/ring/offset`: its distance outside the component.

### In code

- An `::after` at `inset: -[offset]` with a border of the ring width, `border-radius` the component's own or `radius/focus`. Not `outline`: it can't take `radius/focus` on a component with no radius of its own.
- A text field matches `:focus-visible` on a click too, so its ring also needs keyboard focus: a `data-input="keyboard"` on `<html>`, set by a keydown and cleared by a pointerdown.
- A scroll or clipping container keeps the ring visible: padding of the ring offset with a negative margin of the same, or `overflow-clip-margin` of the offset.

---

# Buttons

Everything a user clicks to do something on the page.

### Rules

- `<button>` does something on the page. Going somewhere is a link, even when it looks like a button. `type="button"` unless it submits a form.
- `State=Disabled` uses the `disabled` attribute: no hover, press or focus, and not reachable by keyboard.
- An icon-only button sets `aria-label`.
- Loading only on buttons that act in place (submit, add to bag). It keeps the width and ignores repeat clicks.
- A destructive button (Danger) asks for confirmation in an Overlay.

---

# Links

Navigation. Everything a user clicks to go somewhere.

### Rules

- `<a href>`. A link always has a destination, even when it looks like a button.
- Inline links are never disabled: if the destination isn't available, don't render the link. A standalone link (`Link/Primary`) may have `State=Disabled`: `aria-disabled="true"`, no `href`.
- `aria-current="page"` on the link to the page the user is on.
- External link: open in a new tab, show an external-link icon, add `rel="noopener noreferrer"`.
- A breadcrumb trail is `<nav aria-label="Breadcrumb">` with an `<ol>`, one `<li>` per item. The current item is `aria-current="page"` and not a link. The separator is decorative (`aria-hidden="true"`).

---

# Tabs

Navigation. A row of tabs that switches what's shown.

### Rules

- Tabs that change content in place are a tablist: `role="tablist"`, `tab` and `tabpanel`, `aria-selected`, one tab in the tab order.
- In a tablist, arrow keys move focus between tabs; `Home` / `End` jump to the first and last. `Enter` or `Space` selects; focus alone doesn't.
- The tablist has an `aria-label`; each tab has `aria-controls` pointing to its panel, and the panel has `aria-labelledby` pointing back to the tab.
- The same Tab/Item is a link with `aria-current` when it has an `href`, and a tab otherwise. A bar whose tabs have an `href` is a `<nav>`: each link is in the tab order, and the selected link keeps its `href`.
- A selected tab can't be selected again and stays focusable.
- No disabled state. If a tab isn't available, don't render it.

---

# Accordions

Navigation. Headers that open and close a section of content.

### Rules

- The header is a `<button aria-expanded aria-controls>` inside a heading, its level a `headingLevel` prop (2–6, default 3). The panel is `role="region"`, `aria-labelledby` the header.
- `Up` / `Down` move between the headers of accordions stacked in one container, without wrapping; `Home` / `End` jump to the first and last.
- Closed content is `inert` with `visibility: hidden`: not read out, not focusable. `inert` from the start of closing; visibility switches at the end of the transition, so it hides after closing.
- Several can be open at once unless the page using it allows one at a time.
- Opening animates height with the preset in the accordion's States. Height to `auto` can't transition: use `grid-rows-0fr` → `grid-rows-1fr` (`theme.css`). Reduced motion opens instantly.

---

# Inputs

Fields the user types in or picks a value from.

### Rules

- Every field has a visible label, a `<label for>`. A placeholder is an example, never the label.
- A required field has `*` after its label and `aria-required="true"`.
- The message is linked with `aria-describedby`. An error replaces it, sets `aria-invalid="true"`, and shows after the field loses focus or on submit, never while typing. It clears as soon as the value is valid.
- Error is a value of State. A field with an error keeps its Error look on hover and focus; keyboard focus adds the ring on top.
- An empty field and a filled one are the same component: the value is content (`Show UserInput` off or on), not a prop.
- A value longer than the field scrolls inside it, as a native `<input>` does: one line, the end in view while typing. It never wraps.
- `type`, `inputmode` and `autocomplete` fit the value (`email`, `tel`, `postal-code`).
- A password field has a show/hide button with `aria-pressed`.
- A select is a combobox: `role="combobox"` with `aria-expanded` and `aria-controls`, its list a `listbox` of `option`s, the active one `aria-activedescendant`. `Up` / `Down` move, `Enter` picks, `Esc` closes, typing filters.
- A selected option shows no hover; picking it again does nothing.
- Focus stays on the field while the list is open: arrow keys move the active option, which has no focus ring of its own. A list with a search bar moves focus into its search input instead, which carries `aria-activedescendant`, so typing filters and a phone's keyboard opens. The list and its options have no states beyond Hover, Selected and Disabled.
- An option's image (a flag) is on every option or on none. A missing one is a placeholder, never a gap.
- Focus is the field's border on any focus; the ring is Focus visible, keyboard only (Focus).
- The placeholder shows only while the field is empty, never with a value. Open is the focused field with its list showing.
- A phone field is a country select and a `type="tel"` field, both named by the one label.

---

# Selection

Checkboxes and radio buttons: choices shown at once.

### Rules

- A native `<input type="checkbox">` or `type="radio"`; its `<label>` is the whole row, so the row clicks.
- Checked is a data state (`:checked`). It combines with hover, focus and disabled, so it's its own property, or the check's own when the check is a nested component.
- Choices that answer one question are a group: a `<fieldset>` with a `<legend>` (`Form/ChoiceGroup`). Radios in a group share a `name`; arrow keys move between them and select.
- An error belongs to the group: one message under it, linked with `aria-describedby`.
- A consent checkbox is never checked by default.

---

# Forms

Forms, their sections and rows, and the error summary.

### Rules

- A form is a `<form>` that submits with its primary button, `type="submit"`, at the end.
- Each field checks itself when the user leaves it, and again on submit.
- Submitting with errors keeps every value, shows `Feedback/Error` above the form listing each error as a link to its field, and moves focus to it.
- A section is a heading and its fields. Fields that answer one question are a `<fieldset>` with a `<legend>` instead.
- A row is two fields side by side; below the tablet breakpoint they stack.

---

# Icons

Every icon in the system, and the one component that places them.

### Rules

- `Icon` is the only icon component placed in other components. Swap picks the glyph; `Size` sets the size.
- `Icon` wraps the glyph in a union so parent colour can't leak into the glyph's layers. The fill follows the parent.
- Size is bound to `icon-size`. One mode per size, `px-value` holds the pixels. Never resized by hand.
- Every glyph carries every size on `Icon`, spelled the same. A swap keeps the size only when both sides have it, a glyph missing a size still swaps, at the wrong size, with no warning.
- Each size can be its own drawing. A small icon often needs a simpler shape, fewer details or a heavier stroke than a large one, sizes don't have to be scaled copies.
- Each glyph is its own component, `Icon/[Name]`: singular, PascalCase, for what it is, never where it's used.
- A second look (filled, crossed out) is its own icon (`Icon/WishlistFilled`), not a variant.
- Directional icons end in their direction (`Icon/ArrowRight`, `Icon/ChevronDown`). One master holds the drawing; other directions are rotated instances of it.
- Names follow the naming convention.

### In code

- One SVG per glyph and size, filled with `currentColor` so it follows the text colour.
- Size is a prop matching `icon-size` (`size="md"`), not width/height. Each size uses its own drawing. The component that places an icon sets its size.
- Never a colour baked into the SVG.
- An icon swap with a preset crossfades: both icons stacked, opacity with the preset. To morph (`+` → `−`), build one icon whose parts move; its Spec then lists the part (`Vertical: rotate: 90deg`).
- Arrow in a name becomes a word: ← Left, → Right, ↑ Up, ↓ Down.
- Next to a label: `aria-hidden="true"`. Standalone: the parent button carries the accessible name.
