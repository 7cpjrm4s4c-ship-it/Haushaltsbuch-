import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(process.cwd());
const indexPath = resolve(root, 'index.html');
const backupPath = resolve(root, 'backup/index.monolith.html');
const cssPath = resolve(root, 'css/app.css');
const jsPath = resolve(root, 'js/app.js');

function extractSingleBlock(source, tagName) {
  const open = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'i');
  const openMatch = source.match(open);
  if (!openMatch || openMatch.index === undefined) {
    throw new Error(`<${tagName}> wurde nicht gefunden.`);
  }

  const contentStart = openMatch.index + openMatch[0].length;
  const closeTag = `</${tagName}>`;
  const closeIndex = source.indexOf(closeTag, contentStart);
  if (closeIndex < 0) throw new Error(`${closeTag} wurde nicht gefunden.`);

  return {
    before: source.slice(0, openMatch.index),
    content: source.slice(contentStart, closeIndex).trim() + '\n',
    after: source.slice(closeIndex + closeTag.length),
  };
}

function assertStructure(html) {
  const required = [
    '<link rel="stylesheet" href="css/app.css"/>',
    '<script src="js/app.js"></script>',
  ];
  for (const marker of required) {
    if (!html.includes(marker)) throw new Error(`Prüfung fehlgeschlagen: ${marker}`);
  }
  if (/<style(?:\s[^>]*)?>/i.test(html)) throw new Error('Inline-Style ist noch vorhanden.');
  if (/<script>\s*['"]use strict['"]/i.test(html)) throw new Error('Das Hauptskript ist noch inline vorhanden.');
}

const original = await readFile(indexPath, 'utf8');
if (original.includes('href="css/app.css"') || original.includes('src="js/app.js"')) {
  throw new Error('index.html scheint bereits zerlegt zu sein. Abbruch ohne Änderung.');
}

const style = extractSingleBlock(original, 'style');
const withoutStyle = `${style.before}<link rel="stylesheet" href="css/app.css"/>${style.after}`;
const script = extractSingleBlock(withoutStyle, 'script');
const modularIndex = `${script.before}<script src="js/app.js"></script>${script.after}`;

assertStructure(modularIndex);
await mkdir(dirname(backupPath), { recursive: true });
await mkdir(dirname(cssPath), { recursive: true });
await mkdir(dirname(jsPath), { recursive: true });
await copyFile(indexPath, backupPath);
await writeFile(cssPath, style.content, 'utf8');
await writeFile(jsPath, script.content, 'utf8');
await writeFile(indexPath, modularIndex, 'utf8');

console.log('Zerlegung abgeschlossen:');
console.log('- backup/index.monolith.html');
console.log('- css/app.css');
console.log('- js/app.js');
console.log('- index.html aktualisiert');
