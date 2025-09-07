const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');

(async () => {
  // Basit dosya/dizin varlık testleri
  const files = [
    'src/index.js',
    'src/api.js',
    'src/lib/backup.js',
    'src/lib/restore.js',
    'src/lib/config.js',
    'README.md',
    'package.json',
  ];
  for (const f of files) {
    const p = path.resolve(__dirname, '..', f);
    const exists = await fs.pathExists(p);
    assert.ok(exists, `Eksik: ${f}`);
  }
  console.log('Smoke tests passed.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
