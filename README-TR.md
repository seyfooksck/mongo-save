## mongo-save (TR)

MongoDB için dosya tabanlı yedekleme ve geri yükleme aracı. Mongoose ile bağlanır, her koleksiyon için basit bir şema çıkarır ve her dokümanı ayrı bir EJSON dosyası olarak yazar.

Koleksiyon başına çıktı:
- `schema/<koleksiyon>.json`: Örnek dokümanlardan türetilmiş basit tip şeması
- `data/<koleksiyon>/<id>.json`: Her doküman için tek bir EJSON dosyası (ObjectId, Date, Decimal128 vb. türler korunur)

### Özellikler
- CLI komutları: `backup` ve `restore`.
- Programatik API: `backup`, `restore`, `loadConfig`.
- Konfigürasyon dosyası desteği: `mongo-save.config.json|js|cjs` + `.env` (`MONGODB_URI`).
- Yedeklemede cursor ile akış bazlı okuma (bellek dostu) ve doküman başına dosya yazımı.
- Geri yüklemede `insertMany` ile 1000’lik batch işlemleri; `--drop` ile koleksiyonları önce temizleyebilme.
- `--collections` ile koleksiyon filtreleme.
- Windows’ta dosya adı güvenliği (yasak karakterler değiştirilir).
- Yedek meta bilgisi için `manifest.json` üretimi.

### Gereksinimler
- Node.js >= 18
- MongoDB (kullandığınız Mongoose sürümüyle uyumlu)

### Kurulum (yerel proje)
1. Bağımlılıkları yükleyin.
2. `.env` dosyası oluşturup `MONGODB_URI` değerini girin (örnek için `.env.example`).

### Klasör yapısı

```
<dbName>/
  manifest.json
  schema/
    <collection>.json
  data/
    <collection>/
      <_id>.json
```

### Hızlı başlangıç (CLI)

Yardım:

```
node src/index.js --help
```

Yedek alma (varsayılan çıktı dizini: `./<dbName>`):

```
node src/index.js backup --uri "mongodb://localhost:27017/mydb"
```

Sadece belirli koleksiyonlar:

```
node src/index.js backup --uri "mongodb://localhost:27017/mydb" --collections users posts
```

Geri yükleme (`./mydb` klasöründen başka bir veritabanına):

```
node src/index.js restore --uri "mongodb://localhost:27017/otherdb" --in ./mydb --drop
```

Bu paketi npm’e yayınladıktan sonra aynı komutları `npx mongo-save ...` şeklinde de kullanabilirsiniz.

### Programatik kullanım (Node.js)

Yayınlanmış paket adıyla:

```js
const { backup, restore, loadConfig } = require('mongo-save');

(async () => {
  await backup({ uri: 'mongodb://localhost:27017/mydb' });
  await restore({ uri: 'mongodb://localhost:27017/otherdb', inDir: './mydb', drop: true });
})();
```

Bu depo kaynaklarını doğrudan kullanmak için:

```js
const { backup, restore, loadConfig } = require('./src/api');
```

### Konfigürasyon dosyası

Proje köküne `mongo-save.config.json` (veya `.js/.cjs`) ekleyebilirsiniz. Örnek:

```json
{
  "uri": "mongodb://localhost:27017/mydb",
  "db": "mydb",
  "out": "./mydb",
  "in": "./mydb",
  "collections": ["users", "posts"],
  "pretty": true,
  "drop": false
}
```

Öncelik sırası: CLI argümanları > config dosyası > `.env` değerleri.

Desteklenen config/CLI seçenekleri:
- `uri`: MongoDB bağlantı dizesi (alternatif: `.env` içindeki `MONGODB_URI`).
- `db`: Veritabanı adı (opsiyonel; yoksa URI’dan çıkarılır).
- `out`: Yedek çıktı dizini (varsayılan: `./<dbName>`).
- `in`: Geri yükleme için giriş dizini (yedek klasörü).
- `collections`: Dahil edilecek koleksiyon listesi (varsayılan: tümü).
- `pretty`: JSON dosyalarını okunaklı yaz (varsayılan: `true`).
- `drop`: Geri yükleme öncesi dokümanları sil (varsayılan: `false`).

### Notlar ve sınırlamalar
- Şema dosyaları bilgilendirme amaçlıdır; geri yükleme veri dosyalarını temel alır.
- Büyük koleksiyonlar yedeklemede cursor, geri yüklemede 1000’lik `insertMany` batch ile yönetilir.
- JSON formatı EJSON’dur ve `relaxed: false` kullanılır; `ObjectId`/`Date`/`Decimal128` gibi türler korunur.
- Dosya adları Windows için güvenli hale getirilir; doküman `_id` değeri dosya adı olarak kullanılır.
- Mevcut sürüm indeksleri ve doğrulama kurallarını (validator) yedeklemez.

### Lisans
MIT — `LICENSE` dosyasına bakın.

### Katkı
PR ve issue’lar memnuniyetle karşılanır.
