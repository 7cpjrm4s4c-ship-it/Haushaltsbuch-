import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const publicModules=[
  'js/forecast-engine.js',
  'js/planning-events.js',
  'js/recurrence-engine.js',
  'js/state-schema.js',
  'js/loan-store.js',
  'js/forecast-state-store.js',
  'js/backup-store.js',
  'js/app-extension-registry.js',
  'js/app-view-runtime.js',
];

for(const path of publicModules){
  const source=await read(path);
  assert.match(source,/\/\*\*[\s\S]{0,1200}@module\s+[A-Za-z0-9_.-]+[\s\S]*?\*\//,`${path} benötigt einen JSDoc-@module-Block`);
  assert.ok(source.includes('@returns'),`${path} muss Rückgabeverträge dokumentieren`);
}

for(const path of ['js/forecast-engine.js','js/planning-events.js','js/recurrence-engine.js','js/state-schema.js','js/loan-store.js','js/app-extension-registry.js','js/app-view-runtime.js']){
  const source=await read(path);
  assert.ok(source.includes('@param'),`${path} muss Parameterverträge dokumentieren`);
}

console.log('Phase-D-JSDoc-Vertrag erfolgreich geprüft.');
