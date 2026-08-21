import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const stylesheetOrder=['css/tokens.css','css/base.css','css/components.css','css/modules.css','css/responsive.css'];
const [index,shellEvents,cssFiles,jsFiles]=await Promise.all([
  read('index.html'),read('js/app-shell-events.js'),readdir(new URL('css/',root)),readdir(new URL('js/',root))
]);
const stylesheetSources=await Promise.all(stylesheetOrder.map(read));
const cssByFile=Object.fromEntries(stylesheetOrder.map((file,index)=>[file,stylesheetSources[index]]));
const css=stylesheetSources.join('\n');

const localStyles=[...index.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](css\/[^"']+)["']/g)].map(match=>match[1]);
assert.deepEqual(localStyles,stylesheetOrder,'Stylesheets müssen vollständig und in vertraglich festgelegter Kaskadenreihenfolge geladen werden');
assert.deepEqual(cssFiles.filter(file=>file.endsWith('.css')).sort(),stylesheetOrder.map(file=>file.slice(4)).sort(),'Das CSS-Verzeichnis darf nur die fünf verantwortlichen Stylesheets enthalten');
assert.ok(!cssFiles.includes('app.css'),'Die monolithische app.css darf nicht wieder eingeführt werden');
assert.match(cssByFile['css/tokens.css'],/^\/\*[^]*?\*\/\s*:root\{[^}]+\}\s*$/,'tokens.css darf ausschließlich globale Design-Tokens definieren');
assert.ok(!/:root\s*\{/.test(stylesheetSources.slice(1).join('\n')),'Globale Design-Tokens dürfen ausschließlich in tokens.css definiert werden');
for(const marker of ['Ausgaben / Buchungen','Import','Kreditrechner','Kategorieverwaltung','Backup','Prognose'])assert.ok(cssByFile['css/modules.css'].includes(`/* ${marker} */`),`modules.css muss den Bereich ${marker} zentral besitzen`);
for(const file of ['css/base.css','css/components.css','css/responsive.css'])assert.ok(!/\/\* (?:Ausgaben \/ Buchungen|Import|Kreditrechner|Kategorieverwaltung|Backup|Prognose) \*\//.test(cssByFile[file]),`${file} darf keine fachlichen Modulstyles besitzen`);

for(const token of ['--space-1','--space-2','--space-3','--section-gap','--surface-gap','--header-h','--control-h','--nav-h','--nav-gap','--nav-reserve'])assert.ok(css.includes(token),`Zentrales Stylesheet muss ${token} definieren`);
assert.match(css,/--section-gap\s*:\s*8px/,'Interner Abschnittsabstand muss 8 px betragen');
assert.match(css,/--surface-gap\s*:\s*12px/,'Abstand zwischen Cards und eigenständigen Inhaltsblöcken muss 12 px betragen');
assert.match(css,/--page-inline\s*:\s*8px/,'Globaler Seitenabstand muss 8 px betragen');
assert.match(css,/--nav-reserve\s*:\s*calc\(var\(--nav-h\) \+ var\(--nav-gap\) \+ var\(--space-4\)\)/,'Unterer Inhaltsbereich muss Navigation plus Sicherheitsabstand reservieren');
assert.match(css,/html,body\{[^}]*-webkit-text-size-adjust:100%;text-size-adjust:100%/,'Globale Typografie darf im Querformat nicht automatisch skaliert werden');
assert.match(css,/--header-h\s*:\s*60px/,'Die mobile Header-Höhe muss zentral definiert sein');
assert.match(css,/\.header\{[^}]*position:fixed[^}]*z-index:1000/,'Der Header muss fixiert über dem scrollenden Grid liegen');
assert.match(css,/\.main\{[^}]*display:flex;flex-direction:column;gap:var\(--surface-gap\)[^}]*padding:calc\(var\(--sat\) \+ var\(--header-h\) \+ var\(--space-2\)\) var\(--page-inline\) calc\(max\(var\(--sab\),8px\) \+ var\(--nav-reserve\)\)/,'Hauptinhalt muss unter dem fixierten Header starten und anschließend darunter scrollen');
assert.match(css,/\.layout-grid,\.desktop-2col,\.grid-primary,\.grid-secondary,\.stack,\.manager-groups,\.forecast-layout,\.forecast-controls\{display:flex;flex-direction:column;gap:var\(--surface-gap\)\}/,'Alle mobilen View-Wrapper und Card-Stapel müssen den semantischen 12-px-Flächenabstand verwenden');
assert.match(css,/\.forecast-controls>\*\{margin-block:0\}/,'Prognose-Cards müssen Kind-Margins neutralisieren und ausschließlich ihren Container-gap verwenden');
assert.match(css,/\.list-head\+\.manager-groups\{margin-top:var\(--surface-gap\)\}/,'Listenüberschrift und erster Card-Eintrag müssen durch einen Flächenabstand getrennt sein');
assert.match(css,/\.list-body\{display:flex;flex-direction:column;gap:0\}/,'Kompakte Listen dürfen keinen Card-Abstand zwischen zusammengehörigen Zeilen erhalten');
assert.match(css,/\.main>\*\{margin-block:0\}/,'Top-Level-Komponenten dürfen keine eigenen Außenabstände in den Seitenfluss einbringen');
const spacingOwnership='.main>*,#genBody>*,.form-card>*,.layout-grid>*,.desktop-2col>*,.grid-primary>*,.grid-secondary>*,.stack>*,.manager-groups>*,.list-body>*,.forecast-layout>*,.forecast-controls>*{margin-block:0}';
const spacingOwnershipIndex=css.lastIndexOf(spacingOwnership);
assert.ok(spacingOwnershipIndex>=0,'Container müssen Außenabstände ihrer direkten Kinder nach allen Modulregeln neutralisieren');
for(const selector of ['.compact-toolbar{','.install-banner{','.loan-calc-card{','.backup-card{','.forecast-layout{']){
  assert.ok(spacingOwnershipIndex>css.lastIndexOf(selector),`Spacing-Ownership muss nach ${selector} in der Kaskade stehen`);
}
assert.match(css,/\.card\{[^}]*padding:var\(--space-3\);margin-bottom:0/,'Cards müssen 16 px Innenabstand besitzen und ihren Außenabstand dem Container überlassen');
assert.match(css,/\.hero\{[^}]*padding:var\(--space-3\);margin-bottom:0/,'Hero-Komponenten müssen denselben zentralen Außenrhythmus verwenden');
assert.match(css,/\.tile-grid\{[^}]*gap:var\(--space-2\);margin-bottom:0/,'Tile-Grids müssen den zentralen 8-px-Abstand verwenden');
assert.match(css,/\.month-grid\{[^}]*gap:var\(--space-2\);margin-bottom:0/,'Monats-Grids müssen den zentralen 8-px-Abstand verwenden');
assert.match(css,/\.forecast-period-card>summary,\.forecast-year-card>summary\{[^}]*display:grid;grid-template-columns:minmax\(0,1fr\) auto 12px/,'Geschlossene Prognosezeilen müssen Titel, Summe und Chevron in identischen Spalten ausrichten');
assert.match(css,/\.forecast-period-card>summary div:last-child,\.forecast-year-card>summary div:last-child\{[^}]*min-width:9\.5ch[^}]*font-variant-numeric:tabular-nums[^}]*text-align:right;justify-self:end/,'Gesamtsummen müssen eine stabile Mindestbreite besitzen und exakt rechtsbündig stehen');
assert.match(css,/\.forecast-period-card>summary::after,\.forecast-year-card>summary::after\{[^}]*width:12px/,'Beide Prognosekartentypen müssen dieselbe Chevron-Spalte verwenden');
assert.match(css,/\.overlay\{[^}]*top:calc\(var\(--sat\) \+ var\(--space-2\)\)/,'Eingabebereiche müssen 8 px unterhalb der oberen Safe Area beginnen');
assert.match(css,/\.sheet\{[^}]*max-height:100%;overflow-y:auto/,'Lange Formulare müssen innerhalb des Safe-Area-begrenzten Overlays scrollen');
assert.match(css,/\.sheet\{[^}]*border:1px solid var\(--glass-border\);border-radius:var\(--r-xl\);padding:var\(--space-3\)/,'Eingabebereiche müssen an allen vier Ecken denselben Radius und einen vollständigen Rahmen besitzen');
assert.ok(!/\.sheet\{[^}]*border-bottom:none/.test(css),'Die untere Sheet-Kante darf nicht offen oder eckig sein');
assert.match(css,/\.sheet\{[^}]*padding:var\(--space-3\)/,'Eingabemasken müssen einen einheitlichen 16-px-Innenabstand verwenden');
assert.match(css,/html\.dialog-open,body\.dialog-open\{overflow:hidden;overscroll-behavior:none\}/,'Geöffnete Eingabebereiche müssen den Hintergrund-Scroll sperren');
assert.match(css,/\.sheet\{[^}]*overscroll-behavior:contain[^}]*-webkit-overflow-scrolling:touch/,'Nur das geöffnete Sheet darf mit begrenztem Scroll-Chaining scrollen');
assert.match(css,/\.sheet-handle\{[^}]*width:100%;height:44px[^}]*touch-action:none/,'Die Schließgeste muss eine ausreichend große, exklusive Griffzone besitzen');
assert.match(css,/#genBody\{display:flex;flex-direction:column;gap:var\(--section-gap\)\}/,'Generische Eingabemasken müssen den globalen 8-px-Rhythmus erben');
assert.match(css,/\.form-card,#genBody\{display:flex;flex-direction:column;gap:var\(--space-2\)\}/,'Formulare müssen zentral mit 8 px Abstand aufgebaut werden');
assert.match(css,/\.field\{margin-bottom:0\}/,'Formularfelder dürfen keinen konkurrierenden eigenen Außenabstand besitzen');
assert.match(css,/\.form-actions,\.dialog-actions\{[^}]*gap:var\(--space-2\)[^}]*margin-top:0/,'Formularaktionen müssen ihren Abstand ausschließlich vom Container erhalten');
assert.match(css,/\.bnav-wrap\{[^}]*bottom:calc\(max\(var\(--sab\),8px\) \+ var\(--nav-gap\)\)/,'Bottom-Navigation muss Safe-Area und globalen 8-px-Abstand nutzen');
assert.match(css,/@media\(orientation:landscape\) and \(max-height:600px\)\{[^}]*html,body\{[^}]*text-size-adjust:100%/,'Querformat muss die globale Schriftgröße stabil halten');
assert.ok(!shellEvents.includes("classList.add('hidden')"),'Shell-JavaScript darf den Header nicht ausblenden');
for(const undefinedToken of ['--border','--surface','--surface-2','--text','--muted'])assert.ok(!cssByFile['css/modules.css'].includes(`var(${undefinedToken})`),`Modul-CSS darf das nicht definierte Token ${undefinedToken} nicht verwenden`);
assert.ok(!/(?:margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|gap|position|top|right|bottom|left|width|height)\s*:[^;}]*!important/i.test(css),'Layout- und Spacing-Regeln dürfen keine !important-Overrides enthalten');
assert.ok(!/@import\b/.test(css),'Das zentrale Stylesheet darf keine weiteren Stylesheets importieren');
assert.ok(!jsFiles.includes('header-layout-fix.js'),'Runtime-CSS-Mutator header-layout-fix.js darf nicht existieren');

const geometryRuntimeFiles=new Set(['app-shell-events.js','app-view-runtime.js','app-dialog-runtime.js']);
const jsSources=await Promise.all(jsFiles.filter(file=>file.endsWith('.js')).map(async file=>[file,await read(`js/${file}`)]));
const jsSourceMap=new Map(jsSources);
const dialogRuntime=jsSourceMap.get('app-dialog-runtime.js')||'';
assert.match(dialogRuntime,/CLOSE_DISTANCE=140/,'Schließen per Wischgeste muss eine ausreichend große Abwärtsdistanz verlangen');
assert.match(dialogRuntime,/closest\?\.\('\.overlay\.open \.sheet-handle'\)/,'Die Schließgeste darf ausschließlich in der oberen Griffzone beginnen');
assert.match(dialogRuntime,/drag\.sheet\.style\.transform=`translateY\(\$\{dy\}px\)`/,'Das Sheet muss der Abwärtsbewegung des Fingers unmittelbar folgen');
assert.match(dialogRuntime,/settleSheet\(active,dy>=CLOSE_DISTANCE&&dy>=Math\.abs\(dx\)\)/,'Nur eine überwiegend vertikale Abwärtsgeste darf die Schließanimation auslösen');
assert.match(dialogRuntime,/translateY\(100%\).*closeOverlay\(active\.overlay\)/s,'Die Schließanimation muss das Sheet vollständig nach unten führen und danach zentral schließen');
assert.ok(!/enableSwipeClose|closest\('\.sheet'\)/.test(jsSourceMap.get('refinements.js')||''),'Fachliche Eingabehilfen dürfen keine eigene Dialoggeste besitzen');
const violations=[];
for(const [file,source] of jsSources){
  if(/style\s*=\s*["']/.test(source))violations.push(`${file}: erzeugt Inline-Styles`);
  if(/\.style\s*\.setProperty|\.style\.setProperty|style\.setProperty/.test(source))violations.push(`${file}: überschreibt CSS-Variablen zur Laufzeit`);
  if(/createElement\s*\(\s*["'](?:style|link)["']\s*\)|insertRule\s*\(|adoptedStyleSheets/.test(source))violations.push(`${file}: injiziert eigene UI-Regeln oder Stylesheets`);
  const withoutAllowedRuntimeGeometry=geometryRuntimeFiles.has(file)
    ? source.replace(/slider\.style\.(?:left|width|transition)|sheet\.style\.(?:transform|transition)/g,'allowedRuntimeGeometry')
    : source;
  if(/\.style\s*\./.test(withoutAllowedRuntimeGeometry))violations.push(`${file}: mutiert DOM-Styles direkt`);
}
if(/style\s*=\s*["']/.test(index))violations.push('index.html: enthält Inline-Styles');
assert.deepEqual(violations,[],`Verbleibende Style-Ownership-Verstöße:\n${violations.join('\n')}`);

console.log('Phase-D-UI-Vertrag erfolgreich geprüft: getrennte CSS-Verantwortlichkeiten, UI-freie Fachmodule, Container-basierter 8-px-Rhythmus, einheitliche Dialogabstände, Nav-Sicherheitsbereich und stabile Querformat-Typografie.');
