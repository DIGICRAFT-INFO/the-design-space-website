/**
 * copy-standalone-static.js
 * 
 * Copies .next/static and public/ into .next/standalone/
 * so that Hostinger's standalone server.js can serve them correctly.
 * 
 * Next.js standalone output does NOT copy these automatically.
 * This script runs automatically after `next build` via the postbuild script.
 * 
 * Required folder structure on server:
 *   .next/standalone/
 *     server.js          ← runs this
 *     .next/
 *       static/          ← copied from .next/static (CSS, JS chunks)
 *     public/            ← copied from public/ (images, fonts, icons)
 */

const fs   = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  skip (not found): ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

console.log('\n📦 Copying static files into standalone build...');

// 1. .next/static → .next/standalone/.next/static
const staticSrc  = path.join(root, '.next', 'static');
const staticDest = path.join(root, '.next', 'standalone', '.next', 'static');
console.log(`  .next/static → .next/standalone/.next/static`);
copyDir(staticSrc, staticDest);

// 2. public/ → .next/standalone/public
const publicSrc  = path.join(root, 'public');
const publicDest = path.join(root, '.next', 'standalone', 'public');
console.log(`  public/ → .next/standalone/public`);
copyDir(publicSrc, publicDest);

console.log('✅ Standalone static copy complete.\n');
console.log('Deploy command on Hostinger:');
console.log('  Build: npm run build');
console.log('  Start: node .next/standalone/server.js\n');
