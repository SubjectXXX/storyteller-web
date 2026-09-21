import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const forbiddenRoot = fileURLToPath(new URL('../../admin/', import.meta.url));
const importSpecifier = /(?:from\s*|import\s*\(?\s*)['"]([^'"]+)['"]/g;

function importsAdmin(source, sourcePath) {
  return [...source.matchAll(importSpecifier)].some(([, specifier]) => {
    if (!specifier) return false;
    if (specifier === '@storyteller/admin' || specifier.startsWith('@storyteller/admin/')) return true;
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) return false;
    const distance = relative(forbiddenRoot, resolve(dirname(sourcePath), specifier));
    return distance === '' || (!distance.startsWith('..') && !isAbsolute(distance));
  });
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : [path];
    }),
  );
  return nested.flat().filter((path) => ['.ts', '.tsx', '.js', '.jsx'].includes(extname(path)));
}

const violations = [];
for (const path of await sourceFiles(sourceRoot)) {
  const source = await readFile(path, 'utf8');
  if (importsAdmin(source, path)) {
    violations.push(relative(sourceRoot, path));
  }
}

if (violations.length > 0) {
  console.error(`Web source imports admin source: ${violations.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Web/admin import boundary: PASS');
}
