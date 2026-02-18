/**
 * Patches @huggingface/transformers package.json so the subpath
 * ./dist/transformers.node.cjs is explicitly in "exports". This fixes
 * ERR_PACKAGE_PATH_NOT_EXPORTED when the packaged Electron app (Windows)
 * resolves the package from inside app.asar.
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'node_modules', '@huggingface', 'transformers', 'package.json');
if (!fs.existsSync(pkgPath)) {
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (!pkg.exports || typeof pkg.exports !== 'object') {
  process.exit(0);
}

// Allow explicit subpath so Node's exports check passes when this path is required
if (!pkg.exports['./dist/transformers.node.cjs']) {
  pkg.exports['./dist/transformers.node.cjs'] = './dist/transformers.node.cjs';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Patched @huggingface/transformers exports for Electron packaged app');
}
