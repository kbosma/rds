// Controleert dat elke vertaalsleutel die in de code gebruikt wordt in nl.json én en.json bestaat, en dat
// nl.json en en.json dezelfde sleutels hebben. Dynamische sleutels ('a.b_' + waarde) worden niet gezien.
// Gebruik: npm run check:i18n  (faalt met exitcode 1 bij een ontbrekende sleutel)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]);

const load = (lang) => new Set(flat(JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8'))));
const nl = load('nl');
const en = load('en');

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
});

const key = "([a-zA-Z]+(?:\\.[a-zA-Z0-9_]+)+)";
const patterns = [
  new RegExp(`'${key}'\\s*\\|\\s*translate`, 'g'),          // 'a.b' | translate
  new RegExp(`instant\\(\\s*'${key}'`, 'g'),                 // translate.instant('a.b')
  new RegExp(`\\?\\s*'${key}'\\s*:\\s*'${key}'`, 'g'),       // cond ? 'a.b' : 'c.d'
];

const used = new Map();
for (const file of files('src/app')) {
  const text = readFileSync(file, 'utf8');
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      for (const k of m.slice(1)) {
        if (k) used.set(k, [...(used.get(k) ?? []), file]);
      }
    }
  }
}

// Sleutels in data-objecten (bv. `{ labelKey: 'bookings.status_opreis' }`): elke tekst tussen aanhalingstekens die
// eruitziet als een sleutel van een bekende hoofdgroep, maar nergens bestaat. Een tekst die het begin is van
// bestaande sleutels (een prefix zoals 'bookings.status_', die met een waarde wordt aangevuld) telt niet.
const groups = new Set([...nl].map((k) => k.split('.')[0]));
const literal = new RegExp(`(['"\`])${key}\\1`, 'g');
for (const file of files('src/app')) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(literal)) {
    const k = m[2];
    if (!groups.has(k.split('.')[0]) || nl.has(k) || [...nl].some((x) => x.startsWith(k))) continue;
    used.set(k, [...(used.get(k) ?? []), file]);
  }
}

const problems = [];
for (const [k, where] of [...used].sort()) {
  if (!nl.has(k)) problems.push(`ontbreekt in nl.json: ${k}   (${where[0]})`);
  if (!en.has(k)) problems.push(`ontbreekt in en.json: ${k}   (${where[0]})`);
}
for (const k of nl) if (!en.has(k)) problems.push(`alleen in nl.json: ${k}`);
for (const k of en) if (!nl.has(k)) problems.push(`alleen in en.json: ${k}`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`i18n ok: ${used.size} sleutels in de code, ${nl.size} in nl.json en en.json`);
