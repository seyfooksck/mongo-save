## mongo-save

File-based MongoDB backup and restore tool. Uses Mongoose to connect, infers simple schema per collection, and writes data as one EJSON file per document.

Key outputs per collection:
- `schema/<collection>.json`: Simple type schema inferred from sample documents.
- `data/<collection>/<id>.json`: One EJSON file per document (ObjectId, Date, Decimal128, etc. preserved).

### Features
- CLI commands: `backup` and `restore`.
- Programmatic API: `backup`, `restore`, `loadConfig`.
- Config file support: `mongo-save.config.json|js|cjs` + `.env` (`MONGODB_URI`).
- Streams documents with a cursor (memory-friendly) and writes each doc into a separate file.
- Batch restore with `insertMany` (size 1000), optional `--drop` to clean collections before restore.
- Per-collection filtering via `--collections`.
- Safe filenames on Windows (replaces illegal characters).
- `manifest.json` with backup metadata.

### Requirements
- Node.js >= 18
- MongoDB (any modern version supported by your Mongoose driver)

### Install (local project)
1. Install dependencies.
2. Create a `.env` file (see `.env.example`) and set `MONGODB_URI`.

### Folder structure

```
<dbName>/
	manifest.json
	schema/
		<collection>.json
	data/
		<collection>/
			<_id>.json
```

### Quick start (CLI)

Help:

```
node src/index.js --help
```

Backup (default output folder: `./<dbName>`):

```
node src/index.js backup --uri "mongodb://localhost:27017/mydb"
```

Only specific collections:

```
node src/index.js backup --uri "mongodb://localhost:27017/mydb" --collections users posts
```

Restore (from `./mydb` to another DB):

```
node src/index.js restore --uri "mongodb://localhost:27017/otherdb" --in ./mydb --drop
```

If you publish this package to npm, you can also use `npx mongo-save ...` the same way.

### Programmatic usage (Node.js)

Using the published package name:

```js
const { backup, restore, loadConfig } = require('mongo-save');

(async () => {
	await backup({ uri: 'mongodb://localhost:27017/mydb' });
	await restore({ uri: 'mongodb://localhost:27017/otherdb', inDir: './mydb', drop: true });
})();
```

Using this repository source directly:

```js
const { backup, restore, loadConfig } = require('./src/api');
```

### Configuration file

Place a `mongo-save.config.json` (or `.js/.cjs`) in the project root. Example:

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

CLI flags override config values, which override `.env` values.

Supported config/CLI options:
- `uri`: MongoDB connection string (can also use `.env` `MONGODB_URI`).
- `db`: Database name (optional; inferred from URI when missing).
- `out`: Backup output directory (default: `./<dbName>`).
- `in`: Input directory for restore (backup folder path).
- `collections`: List of collections to include (default: all).
- `pretty`: Pretty-print JSON files (default: `true`).
- `drop`: Delete documents before restore (default: `false`).

### Notes and limitations
- Schema files are informational; restore uses data files only.
- Large collections are handled via a cursor on backup and `insertMany` batches on restore (`1000`).
- JSON format is EJSON with `relaxed: false` to preserve types like `ObjectId`/`Date`/`Decimal128`.
- Filenames are sanitized for Windows; document `_id` is used as the filename.
- Indices and validation rules are not backed up in the current version.

### License
MIT — see `LICENSE`.

### Contributing
PRs and issues are welcome.
