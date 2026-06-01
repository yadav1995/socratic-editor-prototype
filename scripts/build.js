#!/usr/bin/env node
/**
 * Production build — Architecture §9 (v9)
 * Bundles CSS and copies static assets to dist/ (no npm required).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const CSS_FILES = [
  'css/design-tokens.css',
  'css/styles.css',
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function bundleCss() {
  const parts = CSS_FILES.map((f) => {
    const p = path.join(SRC, f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  });
  const header = '/* Socratic Editor — bundled CSS (v9 build) */\n';
  return header + parts.join('\n');
}

function patchIndexHtml(html) {
  return html
    .replace(
      /<link rel="stylesheet" href="css\/design-tokens.css">\s*\n\s*<link rel="stylesheet" href="css\/styles.css">/,
      '<link rel="stylesheet" href="css/app.bundle.css">'
    )
    .replace('https://cdn.tailwindcss.com', 'https://cdn.tailwindcss.com');
}

function build() {
  console.log('Building Socratic Editor → dist/\n');

  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(DIST, { recursive: true });

  fs.mkdirSync(path.join(DIST, 'css'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'css', 'app.bundle.css'), bundleCss());
  console.log('  ✓ css/app.bundle.css');

  copyRecursive(path.join(SRC, 'js'), path.join(DIST, 'js'));
  console.log('  ✓ js/');

  copyRecursive(path.join(SRC, 'content'), path.join(DIST, 'content'));
  console.log('  ✓ content/');

  const indexSrc = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(DIST, 'index.html'), patchIndexHtml(indexSrc));
  console.log('  ✓ index.html');

  copyRecursive(path.join(ROOT, 'server'), path.join(DIST, 'server'));
  console.log('  ✓ server/ (for deployment bundle)');

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  pkg.scripts = { start: 'node server/server.js' };
  fs.writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(pkg, null, 2));

  console.log('\nBuild complete. Run: cd dist && node server/server.js\n');
}

build();
