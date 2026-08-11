import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [index,sw,runtime,manifestRaw]=await Promise.all([
  read('index.html'),read('sw.js'),read('js/pwa-runtime.js'),read('manifest.json')
]);
const manifest=JSON.parse(manifestRaw);

const localAssets=new Set();
for(const match of index.matchAll(/(?:src|href)="([^"]+)"/g)){
  const value=match[1];
  if(/^(?:https?:|data:|#)/.test(value))continue;
  if(!/\.(?:js|css|png|ico|json)$/.test(value))continue;
  localAssets.add(value.startsWith('./')?value:`./${value}`);
}
for(const asset of localAssets)assert.ok(sw.includes(`'${asset}'`)||sw.includes(`"${asset}"`),`Offline-App-Shell fehlt: ${asset}`);

assert.ok(sw.includes("const CACHE_VERSION='hp-v8'"),'Service Worker braucht versionierten Cache');
assert.ok(sw.includes("request.mode==='navigate'"),'Navigation muss separat behandelt werden');
assert.ok(sw.includes("['script','style','image','font']"),'Statische Ressourcen brauchen eigene Strategie');
assert.ok(sw.includes('const cached=await caches.match(request)'),'Statische Ressourcen müssen Cache-first/stale-while-revalidate nutzen');
assert.ok(sw.includes("caches.match('./index.html')"),'Navigation braucht Offline-HTML-Fallback');
assert.ok(!/catch\([^)]*\)\s*=>\s*caches\.match\([^)]*\)\.then\([^)]*index\.html/.test(sw),'JS/CSS dürfen nicht pauschal index.html als Fehlerantwort erhalten');
assert.ok(sw.includes('keys.filter(key=>key!==CACHE_VERSION)'),'Alte Caches müssen beim Aktivieren bereinigt werden');
assert.ok(sw.includes('self.skipWaiting()')&&sw.includes('self.clients.claim()'),'Neue Version muss kontrolliert sofort übernehmen');

assert.ok(runtime.includes("updateViaCache:'none'"),'Service-Worker-Update darf nicht aus HTTP-Cache bedient werden');
assert.ok(runtime.includes('registration.update()'),'Runtime muss aktiv nach Updates prüfen');
assert.ok(runtime.includes("{once:true,passive:true}"),'Load-Registrierung darf nur einmal erfolgen');

assert.equal(manifest.id,'./');
assert.equal(manifest.scope,'./');
assert.equal(manifest.start_url,'./');
assert.equal(manifest.display,'standalone');
assert.ok(Array.isArray(manifest.icons)&&manifest.icons.some(icon=>icon.sizes==='192x192')&&manifest.icons.some(icon=>icon.sizes==='512x512'));
assert.ok(manifest.categories.includes('finance'));

console.log('Phase-D-Offline-PWA-Vertrag erfolgreich geprüft.');
