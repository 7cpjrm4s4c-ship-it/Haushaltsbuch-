import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const [index,css,shellEvents,cssFiles,jsFiles]=await Promise.all([
  read('index.html'),read('css/app.css'),read('js/app-shell-events.js'),readdir(new URL('css/',root)),readdir(new URL('js/',root))
]);

const localStyles=[...index.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](css\/[^"']+)["']/g)].map(match=>match[1]);
assert.deepEqual(localStyles,['css/app.css'],'Die App darf genau ein lokales Stylesheet laden');
assert.deepEqual(cssFiles.filter(file=>file.endsWith('.css')).sort(),['app.css'],'css/app.css muss die einzige CSS-Datei im Repository sein');

for(const token of ['--space-1','--space-2','--space-3','--section-gap','--control-h','--nav-h','--nav-gap'])assert.ok(css.includes(token),`Zentrales Stylesheet muss ${token} definieren`);
assert.match(css,/--section-gap\s*:\s*8px/,'Globaler Abschnittsabstand muss 8 px betragen');
assert.match(css,/--page-inline\s*:\s*8px/,'Globaler Seitenabstand muss 8 px betragen');
assert.match(css,/\.header\{[^}]*position:sticky/,'Header muss im Dokumentfluss sticky bleiben');
assert.match(css,/\.main\{[^}]*padding:var\(--space-2\) var\(--page-inline\)/,'Inhalt muss mit genau einem 8-px-Rasterabstand unter dem Header beginnen');
assert.match(css,/\.bnav-wrap\{[^}]*bottom:calc\(max\(var\(--sab\),8px\) \+ var\(--nav-gap\)\)/,'Bottom-Navigation muss Safe-Area und globalen 8-px-Abstand nutzen');
assert.ok(!shellEvents.includes("classList.add('hidden')"),'Shell-JavaScript darf den Header nicht ausblenden');
assert.ok(!/(?:margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|gap|position|top|right|bottom|left|width|height)\s*:[^;}]*!important/i.test(css),'Layout- und Spacing-Regeln dürfen keine !important-Overrides enthalten');
assert.ok(!/@import\b/.test(css),'Das zentrale Stylesheet darf keine weiteren Stylesheets importieren');
assert.ok(!jsFiles.includes('header-layout-fix.js'),'Runtime-CSS-Mutator header-layout-fix.js darf nicht existieren');

const sliderRuntimeFiles=new Set(['app-shell-events.js','app-view-runtime.js']);
const jsSources=await Promise.all(jsFiles.filter(file=>file.endsWith('.js')).map(async file=>[file,await read(`js/${file}`)]));
const violations=[];
for(const [file,source] of jsSources){
  if(/style\s*=\s*["']/.test(source))violations.push(`${file}: erzeugt Inline-Styles`);
  if(/\.style\s*\.setProperty|\.style\.setProperty|style\.setProperty/.test(source))violations.push(`${file}: überschreibt CSS-Variablen zur Laufzeit`);
  const withoutAllowedSliderGeometry=sliderRuntimeFiles.has(file)
    ? source.replace(/slider\.style\.(?:left|width|transition)/g,'sliderRuntimeGeometry')
    : source;
  if(/\.style\s*\./.test(withoutAllowedSliderGeometry))violations.push(`${file}: mutiert DOM-Styles direkt`);
}
if(/style\s*=\s*["']/.test(index))violations.push('index.html: enthält Inline-Styles');
assert.deepEqual(violations,[],`Verbleibende Style-Ownership-Verstöße:\n${violations.join('\n')}`);

console.log('Phase-D-UI-Vertrag erfolgreich geprüft: eine CSS-Quelle, ein Spacing-Vertrag, nur dynamische Slider-Geometrie als Runtime-Ausnahme.');
