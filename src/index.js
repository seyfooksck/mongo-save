#!/usr/bin/env node
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { backup } = require('./lib/backup');
const { restore } = require('./lib/restore');
const { loadConfig } = require('./lib/config');
require('dotenv').config();

const argv = yargs(hideBin(process.argv))
  .scriptName('mongo-save')
  .usage('$0 <cmd> [args]')
  .command(
    'backup',
    'Veritabanını belirtilen klasöre yedekler',
    (y) =>
      y
        .option('uri', {
          type: 'string',
          describe: 'MongoDB bağlantı URI (env: MONGODB_URI)',
        })
        .option('db', { type: 'string', describe: 'Veritabanı adı (opsiyonel, URI içinden tespit edilir)' })
        .option('out', {
          type: 'string',
          describe: 'Çıktı klasörü (varsayılan: ./<dbName>)',
        })
        .option('collections', {
          type: 'array',
          describe: 'Yedeklenecek koleksiyon listesi (boşsa hepsi)'
        })
        .option('pretty', { type: 'boolean', default: true, describe: 'JSON dosyalarını daha okunur yaz' }),
    async (args) => {
      const cfg = await loadConfig(process.cwd(), args.config);
      const uri = args.uri || cfg.uri || process.env.MONGODB_URI;
      if (!uri) {
        console.error('Hata: MONGODB_URI gerekli. --uri ile geçebilir veya .env içine ekleyebilirsiniz.');
        process.exit(1);
      }
      await backup({
        uri,
        dbName: args.db || cfg.db,
        outDir: args.out || cfg.out,
        collections: args.collections || cfg.collections,
        pretty: typeof args.pretty === 'boolean' ? args.pretty : (cfg.pretty ?? true),
      });
    }
  )
  .command(
    'restore',
    'Belirtilen klasörden veritabanına geri yükler',
    (y) =>
      y
        .option('uri', { type: 'string', describe: 'MongoDB bağlantı URI (env: MONGODB_URI)' })
        .option('db', { type: 'string', describe: 'Hedef veritabanı adı (opsiyonel)' })
        .option('in', { alias: 'input', type: 'string', demandOption: true, describe: 'Yedek klasör yolu' })
        .option('drop', { type: 'boolean', default: false, describe: 'Geri yüklemeden önce koleksiyonları boşalt' })
        .option('collections', { type: 'array', describe: 'Sadece bu koleksiyonları geri yükle' }),
    async (args) => {
      const cfg = await loadConfig(process.cwd(), args.config);
      const uri = args.uri || cfg.uri || process.env.MONGODB_URI;
      if (!uri) {
        console.error('Hata: MONGODB_URI gerekli. --uri ile geçebilir veya .env içine ekleyebilirsiniz.');
        process.exit(1);
      }
      await restore({
        uri,
        dbName: args.db || cfg.db,
        inDir: args.input || cfg.in,
        drop: typeof args.drop === 'boolean' ? args.drop : (cfg.drop ?? false),
        collections: args.collections || cfg.collections,
      });
    }
  )
  .demandCommand(1, 'Bir komut belirtin: backup veya restore')
  .help()
  .strict()
  .parse();
