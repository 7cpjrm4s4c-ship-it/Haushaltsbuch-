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

for(const token of ['--space-1','--space-2','--space-3','--section-gap','--control-h','--nav-h','--nav-gap','--nav-reserve'])assert.ok(css.includes(token),`Zentrales Stylesheet muss ${token} definieren`);
assert.match(css,/--section-gap\s*:\s*8px/,'Globaler Abschnittsabstand muss 8 px betragen');
assert.match(css,/--page-inline\s*:\s*8px/,'Globaler Seitenabstand muss 8 px betragen');
assert.match(css,/--nav-reserve\s*:\s*calc\(var\(--nav-h\) \+ var\(--nav-gap\) \+ var\(--space-4\)\)/,'Unterer Inhaltsbereich muss Navigation plus Sicherheitsabstand reservieren');
assert.match(css,/html,body\{[^}]*-webkit-text-size-adjust:100%;text-size-adjust:100%/,'Globale Typografie darf im Querformat nicht automatisch skaliert werden');
assert.match(css,/\.header\{[^}]*position:sticky/,'Header muss im Dokumentfluss sticky bleiben');
assert.match(css,/\.main\{[^}]*display:flex;flex-direction:column;gap:var\(--section-gap\)[^}]*padding:var\(--space-2\) var\(--page-inline\) calc\(max\(var\(--sab\),8px\) \+ var\(--nav-reserve\)\)/,'Hauptinhalt muss den zentralen 8-px-Rhythmus und den Navigations-Sicherheitsbereich verwenden');
assert.match(css,/\.main>\*\{margin-block:0\}/,'Top-Level-Komponenten dürfen keine eigenen Außenabstände in den Seitenfluss einbringen');
assert.match(css,/\.card\{[^}]*padding:var\(--space-3\);margin-bottom:0/,'Cards müssen 16 px Innenabstand besitzen und ihren Außenabstand dem Container überlassen');
assert.match(css,/\.hero\{[^}]*padding:var\(--space-3\);margin-bottom:0/,'Hero-Komponenten müssen denselben zentralen Außenrhythmus verwenden');
assert.match(css,/\.tile-grid\{[^}]*gap:var\(--space-2\);margin-bottom:0/,'Tile-Grids müssen den zentralen 8-px-Abstand verwenden');
assert.match(css,/\.month-grid\{[^}]*gap:var\(--space-2\);margin-bottom:0/,'Monats-Grids müssen den zentralen 8-px-Abstand verwenden');
assert.match(css,/\.sheet\{[^}]*padding:var\(--space-3\)/,'Eingabemasken müssen einen einheitlichen 16-px-Innenabstand verwenden');
assert.match(css,/#genBody\{display:flex;flex-direction:column;gap:var\(--section-gap\)\}/,'Generische Eingabemasken müssen den globalen 8-px-Rhythmus erben');
assert.match(css,/\.form-card,#genBody\{display:flex;flex-direction:column;gap:var\(--space-2\)\}/,'Formulare müssen zentral mit 8 px Abstand aufgebaut werden');
assert.match(css,/\.field\{margin-bottom:0\}/,'Formularfelder dürfen keinen konkurrierenden eigenen Außenabstand besitzen');
assert.match(css,/\.form-actions,\.dialog-actions\{[^}]*gap:var\(--space-2\)[^}]*margin-top:0/,'Formularaktionen müssen ihren Abstand ausschließlich vom Container erhalten');
assert.match(css,/\.bnav-wrap\{[^}]*bottom:calc\(max\(var\(--sab\),8px\) \+ var\(--nav-gap\)\)/,'Bottom-Navigation muss Safe-Area und globalen 8-px-Abstand nutzen');
assert.match(css,/@media\(orientation:landscape\) and \(max-height:600px\)\{[^}]*html,body\{[^}]*text-size-adjust:100%/,'Querformat muss die globale Schriftgröße stabil halten');
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

console.log('Phase-D-UI-Vertrag erfolgreich geprüft: eine CSS-Quelle, Container-basierter 8-px-Rhythmus, einheitliche Dialogabstände, Nav-Sicherheitsbereich und stabile Querformat-Typografie.');
