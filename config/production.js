'use strict';

var moment = require('moment');

module.exports = {
  env: 'production',
  token: {
    secret: 'donler',
    expires: 1000 * 60 * 60 * 24 * 7
  },
  serverListenPort: 3002,
  db: 'mongodb://localhost/donler-beta'
};