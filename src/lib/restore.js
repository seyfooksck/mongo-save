const path = require('path');
const fs = require('fs-extra');
const mongoose = require('mongoose');
const { EJSON, ObjectId } = require('bson');

function getDbNameFromUri(uri) {
  try {
    const u = new URL(uri);
    const pathname = u.pathname.replace(/^\//, '');
    return pathname || 'test';
  } catch (e) {
    return 'test';
  }
}

async function connect(uri, dbName) {
  let url = uri;
  if (dbName) {
    try {
      const u = new URL(uri);
      u.pathname = `/${dbName}`;
      url = u.toString();
    } catch {
      url = uri.replace(/\/(?:[^/?]+)?(\?|$)/, `/${dbName}$1`);
    }
  }
  const conn = await mongoose.createConnection(url, {
    serverSelectionTimeoutMS: 5000,
  }).asPromise();
  return conn;
}

async function restore({ uri, dbName, inDir, drop = false, collections }) {
  if (!inDir) throw new Error('inDir gerekli');
  const baseIn = path.resolve(process.cwd(), inDir);
  const manifestPath = path.join(baseIn, 'manifest.json');
  const dataDir = path.join(baseIn, 'data');

  if (!(await fs.pathExists(dataDir))) {
    throw new Error(`Geçersiz yedek klasörü: ${baseIn}`);
  }

  const manifest = (await fs.pathExists(manifestPath))
    ? await fs.readJson(manifestPath)
    : null;

  const db = dbName || manifest?.db || getDbNameFromUri(uri);
  const conn = await connect(uri, db);
  try {
    const colNames = collections && collections.length > 0
      ? collections
      : (await fs.readdir(dataDir)).filter((name) => fs.lstatSync(path.join(dataDir, name)).isDirectory());

    for (const colName of colNames) {
      const colPath = path.join(dataDir, colName);
      const files = (await fs.readdir(colPath)).filter((f) => f.endsWith('.json'));
      const col = conn.db.collection(colName);

      if (drop) {
        try { await col.deleteMany({}); } catch (_) {}
      }

      const batch = [];
      for (const file of files) {
        const p = path.join(colPath, file);
        const raw = await fs.readFile(p, 'utf8');
        const doc = EJSON.parse(raw, { relaxed: false });
        batch.push(doc);
        if (batch.length >= 1000) {
          await col.insertMany(batch, { ordered: false });
          batch.length = 0;
        }
      }
      if (batch.length) {
        await col.insertMany(batch, { ordered: false });
      }
      console.log(`Geri yüklendi: ${colName} (${files.length} doküman)`);
    }

    console.log(`Geri yükleme tamamlandı: ${db}`);
  } finally {
    await conn.close().catch(() => {});
  }
}

module.exports = { restore };
