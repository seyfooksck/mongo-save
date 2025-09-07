const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

async function loadConfig(cwd = process.cwd(), explicitPath) {
  const tryPaths = explicitPath
    ? [path.resolve(cwd, explicitPath)]
    : [
        path.resolve(cwd, 'mongo-save.config.js'),
        path.resolve(cwd, 'mongo-save.config.cjs'),
        path.resolve(cwd, 'mongo-save.config.json'),
      ];
  for (const p of tryPaths) {
    if (await fs.pathExists(p)) {
      if (p.endsWith('.json')) return await fs.readJson(p);
      // js/cjs
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const cfg = require(p);
      return cfg.default || cfg;
    }
  }
  return {};
}

module.exports = { loadConfig };
