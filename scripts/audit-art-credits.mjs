import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export function artworkPathsFromSource(code, sourceFile, root = projectRoot) {
  // Match the two static asset conventions used by this repository.
  const references = [...code.matchAll(/(?:new URL\(\s*|url\(\s*)['"]([^'"]+\.(?:png|jpe?g|webp|gif|svg))['"]/giu)];
  return references.map(([, asset]) => path.relative(root, path.resolve(path.dirname(sourceFile), asset)).split(path.sep).join('/'))
    .filter((asset) => asset.startsWith('img/'));
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (/\.(?:jsx?|css)$/u.test(entry.name)) files.push(file);
  }
  return files;
}

export async function auditArtCredits() {
  const credits = JSON.parse(await readFile(path.join(projectRoot, 'src/data/artCredits.json'), 'utf8'));
  const credited = new Set(credits.flatMap((credit) => credit.files));
  const referenced = new Set();
  for (const file of await walk(path.join(projectRoot, 'src'))) {
    for (const asset of artworkPathsFromSource(await readFile(file, 'utf8'), file)) referenced.add(asset);
  }
  return {
    referenced: referenced.size,
    missing: [...referenced].filter((asset) => !credited.has(asset)).sort()
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const result = await auditArtCredits();
  console.log(`${result.referenced} referenced image files; ${result.missing.length} still need a credit record.`);
  for (const asset of result.missing) console.log(`- ${asset}`);
  console.log('This inventory does not verify authorship, permission, or license coverage.');
}
