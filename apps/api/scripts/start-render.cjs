/**
 * Arranque en Render (demo): asegura SQLite, aplica schema, seed y levanta Nest.
 * En plan free el disco es efímero: al dormir/redeploy puede resetearse la BD.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'prisma', 'data');
fs.mkdirSync(dataDir, { recursive: true });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./data/render.db';
}

const env = { ...process.env };
const opts = { cwd: root, stdio: 'inherit', env };

console.log('[render] prisma db push…');
execSync('npx prisma db push --skip-generate', opts);

console.log('[render] seed…');
try {
  execSync('npx ts-node --transpile-only prisma/seed.ts', opts);
} catch (err) {
  console.warn('[render] seed omitido o con avisos:', err.message);
}

const candidates = [
  path.join(root, 'dist', 'main.js'),
  path.join(root, 'dist', 'src', 'main.js'),
];
const main = candidates.find((file) => fs.existsSync(file));
if (!main) {
  console.error('[render] No se encontró dist/main.js ni dist/src/main.js. ¿Falló el build?');
  process.exit(1);
}

console.log('[render] starting API…');
require(main);
