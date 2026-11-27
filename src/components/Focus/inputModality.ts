// Focus (foundations.md): "A text field matches :focus-visible on a click too, so its ring also needs keyboard focus:
// a data-input="keyboard" on <html>, set by a keydown and cleared by a pointerdown." Imported once, by the app's entry.
const root = document.documentElement
addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) root.dataset.input = 'keyboard' }, true)
addEventListener('pointerdown', () => { delete root.dataset.input }, true)
