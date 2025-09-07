const { backup } = require('./lib/backup');
const { restore } = require('./lib/restore');
const { loadConfig } = require('./lib/config');

module.exports = {
  backup,
  restore,
  loadConfig,
};
