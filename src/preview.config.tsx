// This project's entry for the GrebFig preview (preview/): each Figma set (as named in design/specs.json) mapped to
// its component. The preview draws the set's showcase (states, modes, variants, behaviour, switches) and asks for one
// Cell at a time; Hover, Pressed, Focus and Focus visible are its own. Texts are Figma's ("Label", "Buy").
// See one set's showcase: node -p "JSON.stringify(require('./design/specs.json').sets.find((s) => s.name === 'Tab/Item').showcase)"
//
// One example per kind of showcase. Add an entry when a component is built:
//
// States, plus behaviour (short and long text for one text prop): `c.state` is the state, `c.textProp` and `c.text`
// the behaviour cell's text, `c.width` fill where the Spec says so.
//   'Button/Primary/Md': {
//     page: 'Buttons',
//     render: (c) => (
//       <ButtonPrimary size="Md" disabled={c.state === 'Disabled'} className={c.width === 'fill' ? 'w-full' : undefined}
//         buttonLabel={(c.textProp === 'buttonLabel' && c.text) || 'Label'} />
//     ),
//   },
//
// A data state as its own prop (Selected, Current): read it from `c.state`.
//   'Tab/Item': { page: 'Tabs', render: (c) => <TabItem label={c.text || 'Label'} selected={c.state === 'Selected'} /> },
//
// Variants with props (showMessage, showLeftIcon): `c.props` as Figma names them; a prop a cell leaves out is its default.
//   'Input/Textfield': {
//     page: 'Inputs',
//     render: (c) => (
//       <InputTextfield inputLabel="Label" message={c.props.showMessage !== false ? 'Message' : undefined}
//         error={c.state === 'Error' ? 'Error' : undefined} disabled={c.state === 'Disabled'} required={c.required}
//         defaultValue={c.title === 'Empty' ? undefined : 'Value'} />
//     ),
//   },
//
// A yes/no state the component changes itself (showcase.stateProp, such as open): `c.props[stateProp]` is the value,
// `c.onState` hands a change back. A slot: `c.count` items in it.
//   'Accordion/Default': {
//     page: 'Accordions',
//     render: (c) => (
//       <AccordionDefault label="Label" open={!!c.props.open} onOpenChange={(o) => c.onState?.(o)}>
//         {Array.from({ length: c.count ?? 2 }, (_, i) => <LinkPrimary key={i} href="#" label="Label" />)}
//       </AccordionDefault>
//     ),
//   },
//
// A field with a list: `c.open` shows it open. A variant property Figma sets (Content: Empty) is in `c.variant`.
//   'Input/Listbox': {
//     page: 'Inputs',
//     render: (c) => <InputListbox options={c.variant?.Content === 'Empty' ? [] : options.slice(0, c.count ?? 8)} />,
//   },
import type { PreviewConfig } from '../preview/types'

export const config: PreviewConfig = {
  sets: {},
}
