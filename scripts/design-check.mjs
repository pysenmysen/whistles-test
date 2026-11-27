// Checks that every theme class and variable the components use exists in theme.css.
// Tailwind drops a class it doesn't know without an error, so this asks Tailwind itself.
// Run: npm run design:check   (add a path to compare against another theme, e.g. an older one)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// DESIGN_SRC checks another project's components against this theme.css
const src = process.env.DESIGN_SRC || join(root, 'src');
const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) && f !== 'theme.css' ? [p] : [];
});
// Comments quote the Specs (`bg-[var(--color-x)]`), so they're left out
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const code = files(src).map((p) => ({ p: p.slice(root.length + 1), text: strip(readFileSync(p, 'utf8')) }));
const theme = readFileSync(join(root, 'src', 'theme.css'), 'utf8');
// A fresh copy of the starter has no export yet: nothing to check against
if (!/--[\w-]+\s*:/.test(theme)) { console.log('design:check: no export yet; run npm run import first.'); process.exit(0); }

// Classes that take a theme value: the utilities whose names come from Figma variables
const PREFIX = /^(?:[a-z0-9-]+:)*!?-?(bg|text|border(?:-[trblxy])?|ring|inset-ring|outline|fill|stroke|from|via|to|shadow|rounded(?:-[trbl]{1,2})?|p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|space-[xy]|w|h|size|min-[wh]|max-[wh]|font|duration|ease|decoration|underline-offset|top|right|bottom|left|inset(?:-[xy])?|translate-[xy])-(.+)$/;
// Values Tailwind has without a theme: numbers, fractions, keywords
const BUILTIN = /^(\[.*\]|\d+(\.\d+)?|\d+\/\d+|px|full|screen|auto|min|max|fit|none|current|transparent|inherit|white|black|sm|md|lg|xl|\d?xl|normal|medium|semibold|bold|light|thin|linear|in|out|in-out|t|b|l|r|x|y|solid|dashed|dotted|center|left|right|top|bottom|start|end|wrap|nowrap|ellipsis|clip)$/;
const candidates = new Set();
for (const { text } of code) for (const m of text.matchAll(/[\w:!\-/.[\]()]+/g)) {
  const c = m[0].replace(/^[!]/, '');
  const hit = c.match(PREFIX);
  if (hit && !BUILTIN.test(hit[2])) candidates.add(c);
}

const css = '@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n' +
  readFileSync(join(src, 'index.css'), 'utf8').replace(/@import[^;]+;/g, '') + '\n' + theme;
// --self-test: a class that can't exist must be caught, or the check proves nothing
if (process.argv.includes('--self-test')) candidates.add('bg-not-in-theme');
const compiler = await compile(css, { base: src, onDependency() {} });
const out = compiler.build([...candidates]);
const esc = (c) => c.replace(/[:!/.[\]()]/g, (x) => '\\' + x);
const unknown = [...candidates].filter((c) => out.indexOf('.' + esc(c)) === -1).sort();

// var(--x) in the components: defined in theme.css or by Tailwind
const defined = new Set([...out.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]).concat([...theme.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])));
const vars = new Map();
for (const { p, text } of code) for (const m of text.matchAll(/var\((--[\w-]+)|\((--[\w-]+)\)/g)) {
  const v = m[1] || m[2];
  if (!defined.has(v)) vars.set(v, (vars.get(v) || []).concat(p));
}

let bad = 0;
if (unknown.length) { bad++; console.log('Classes Tailwind doesn’t know (no variable in theme.css):\n' + unknown.map((c) => '  ' + c).join('\n')); }
if (vars.size) { bad++; console.log('Variables used but not defined:\n' + [...vars].map(([v, ps]) => '  ' + v + '  (' + [...new Set(ps)].join(', ') + ')').join('\n')); }

// design/changes.json: the changes waiting to go back to Figma (AGENTS.md › Changes Figma should know about)
{
  const problems = [];
  let changes = null;
  try { changes = JSON.parse(readFileSync(join(root, 'design', 'changes.json'), 'utf8')); }
  catch (e) { problems.push(e.code === 'ENOENT' ? 'missing' : 'not valid JSON: ' + e.message); }
  if (changes) {
    const specs = JSON.parse(readFileSync(join(root, 'design', 'specs.json'), 'utf8'));
    const setIds = new Set((specs.sets || []).map((s) => s.id));
    const names = specs.names || {};
    const LONG = ['wrap', 'truncate', 'grow'];
    const allowed = (setting) => setting === 'width' ? ['hug', 'fill', 'both'] : setting === 'long' ? LONG : /^long\/.+/.test(setting || '') ? [...LONG, 'scroll'] : null;
    if (!Array.isArray(changes.changes)) problems.push('"changes" is not a list');
    const seen = new Set();
    for (const c of changes.changes || []) {
      const at = c?.id || JSON.stringify(c).slice(0, 40);
      if (!c?.id) problems.push(at + ': no id');
      else if (seen.has(c.id)) problems.push(at + ': id used twice');
      seen.add(c?.id);
      if (!['token', 'setting', 'note'].includes(c?.kind)) { problems.push(at + ': kind is ' + JSON.stringify(c?.kind) + ', not token, setting or note'); continue; }
      if (c.kind === 'token' && !Object.hasOwn(names, c.name)) problems.push(at + ': token ' + c.name + ' is not in specs.json names');
      if (c.kind !== 'token') {
        if (!Array.isArray(c.sets) || !c.sets.length) problems.push(at + ': no sets');
        for (const s of c.sets || []) if (!setIds.has(s?.id)) problems.push(at + ': set ' + s?.id + ' is not in specs.json sets');
      }
      if (c.kind === 'setting') {
        const ok = allowed(c.setting);
        if (!ok) problems.push(at + ': setting ' + JSON.stringify(c.setting) + ' is not width, long or long/<text part>');
        else if (!ok.includes(c.to)) problems.push(at + ': ' + c.setting + ' can\'t be ' + JSON.stringify(c.to) + ' (' + ok.join(', ') + ')');
      }
    }
  }
  if (problems.length) { bad++; console.log('design/changes.json:\n' + problems.map((p) => '  ' + p).join('\n')); }
}

// Optional: names an older theme had that this one lacks
const other = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (other) {
  const mine = new Set([...theme.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const gone = [...new Set([...readFileSync(other, 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))].filter((v) => !mine.has(v));
  if (gone.length) console.log('In ' + other + ' but not in theme.css:\n' + gone.map((v) => '  ' + v).join('\n'));
}

console.log(bad ? '\ndesign:check found problems.' : 'design:check: every theme class and variable the components use is in theme.css (' + candidates.size + ' classes checked).');
process.exit(bad ? 1 : 0);
