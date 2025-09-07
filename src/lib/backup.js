const path = require('path');
const fs = require('fs-extra');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

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

async function inferSchemaFromDocuments(docs) {
  // Basit şema çıkarımı: tipleri tarar, nested alanları keşfeder
  const schema = {};
  const mergeType = (acc, key, val) => {
    const t = inferType(val);
    if (!acc[key]) acc[key] = t;
    else acc[key] = mergeValueTypes(acc[key], t);
  };
  for (const doc of docs) {
    for (const [k, v] of Object.entries(doc)) {
      mergeType(schema, k, v);
    }
  }
  return schema;
}

function inferType(v) {
  if (v === null) return { type: 'null' };
  if (Array.isArray(v)) {
    const itemTypes = v.slice(0, 20).map(inferType);
    return { type: 'array', items: unionTypes(itemTypes) };
  }
  const t = typeof v;
  if (t === 'string') return { type: 'string' };
  if (t === 'number') return { type: Number.isInteger(v) ? 'int' : 'double' };
  if (t === 'boolean') return { type: 'bool' };
  if (v && v._bsontype === 'ObjectId') return { type: 'objectId' };
  if (v && v._bsontype === 'Decimal128') return { type: 'decimal128' };
  if (v && (v instanceof Date)) return { type: 'date' };
  if (t === 'object') {
    const props = {};
    for (const [k, val] of Object.entries(v)) props[k] = inferType(val);
    return { type: 'object', properties: props };
  }
  return { type: 'unknown' };
}

function unionTypes(types) {
  if (types.length === 0) return { anyOf: [] };
  const seen = new Map();
  for (const t of types) {
    const key = JSON.stringify(t);
    if (!seen.has(key)) seen.set(key, t);
  }
  if (seen.size === 1) return [...seen.values()][0];
  return { anyOf: [...seen.values()] };
}

function mergeValueTypes(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (JSON.stringify(a) === JSON.stringify(b)) return a;
  return { anyOf: [a, b] };
}

async function backup({ uri, dbName, outDir, collections, pretty = true }) {
  const db = dbName || getDbNameFromUri(uri);
  // İstek: veritabanı adında bir klasör oluştursun
  const baseOut = outDir || path.resolve(process.cwd(), db);

  await fs.ensureDir(baseOut);
  const schemaDir = path.join(baseOut, 'schema');
  const dataDir = path.join(baseOut, 'data');
  await fs.ensureDir(schemaDir);
  await fs.ensureDir(dataDir);

  const conn = await connect(uri, db);
  try {
    const allCollections = (await conn.db.listCollections().toArray()).map(c => c.name);
    const targetCollections = collections && collections.length > 0
      ? allCollections.filter(c => collections.includes(c))
      : allCollections;

    // Top-level manifest
    const manifest = {
      db,
      createdAt: new Date().toISOString(),
      collections: targetCollections,
      tool: 'mongo-save',
      version: 1
    };
    await fs.writeJson(path.join(baseOut, 'manifest.json'), manifest, { spaces: pretty ? 2 : 0 });

    for (const colName of targetCollections) {
      const col = conn.db.collection(colName);

      // Şema çıkarımı için örnekleme (en fazla 500 doküman)
      const sampleDocs = await col.find({}).limit(500).toArray();
      const inferred = await inferSchemaFromDocuments(sampleDocs);
      await fs.writeJson(path.join(schemaDir, `${colName}.json`), inferred, { spaces: pretty ? 2 : 0 });

      // Data klasörü: her koleksiyon için alt klasör, her doküman ayrı dosya
      const colDataDir = path.join(dataDir, colName);
      await fs.ensureDir(colDataDir);

      const cursor = col.find({}).batchSize(1000);
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const id = safeFileName(String(doc._id));
        const ejson = EJSON.stringify(doc, { relaxed: false, indent: pretty ? 2 : 0 });
        await fs.writeFile(path.join(colDataDir, `${id}.json`), ejson);
      }
    }

    console.log(`Yedek oluşturuldu: ${baseOut}`);
  } finally {
    await conn.close().catch(() => {});
  }
}

function safeFileName(name) {
  // Windows için yasak karakterler: < > : " / \ | ? *
  return name.replace(/[<>:"/\\|?*]/g, '_');
}

module.exports = { backup };
