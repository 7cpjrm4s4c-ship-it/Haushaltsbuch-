import { readFile, writeFile, mkdir } from 'node:fs/promises';

const appPath = new URL('../js/app.js', import.meta.url);
const indexPath = new URL('../index.html', import.meta.url);
const bootstrapPath = new URL('../js/bootstrap.js', import.meta.url);

const marker = '// ═══════════════════════════════════════════════\n// BOOT\n// ═══════════════════════════════════════════════';
const app = await readFile(appPath, 'utf8');
const index = await readFile(indexPath, 'utf8');

if (index.includes('js/bootstrap.js')) {
  console.log('Bootstrap ist bereits ausgelagert.');
  process.exit(0);
}

const markerIndex = app.lastIndexOf(marker);
if (markerIndex < 0) throw new Error('BOOT-Block wurde in js/app.js nicht gefunden.');

const bootCode = app.slice(markerIndex + marker.length).trim();
if (!bootCode.includes('load();') || !bootCode.includes('render();')) {
  throw new Error('BOOT-Block enthält nicht die erwarteten Startaufrufe.');
}

const appWithoutBoot = app.slice(0, markerIndex).trimEnd() + '\n';
const bootstrap = `'use strict';\n\n// App erst starten, nachdem Kern und Erweiterungen geladen wurden.\n${bootCode}\n`;

const oldScript = '<script src="js/app.js"></script>';
const newScripts = [
  '<script src="js/app.js"></script>',
  '<script src="js/recurrence-engine.js"></script>',
  '<script src="recurring-payments.js"></script>',
  '<script src="js/bootstrap.js"></script>',
].join('\n');

if (!index.includes(oldScript)) throw new Error('Verweis auf js/app.js wurde nicht gefunden.');

await mkdir(new URL('../js/', import.meta.url), { recursive: true });
await writeFile(appPath, appWithoutBoot, 'utf8');
await writeFile(bootstrapPath, bootstrap, 'utf8');
await writeFile(indexPath, index.replace(oldScript, newScripts), 'utf8');

console.log('App-Start wurde nach js/bootstrap.js ausgelagert.');
