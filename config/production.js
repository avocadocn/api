'use strict';

var moment = require('moment');

module.exports = {
  env: 'production',
  token: {
    secret: 'donler',
    expires: moment().add('days', 7).valueOf()
  },
  serverListenPort: 3002,
  db: 'mongodb://localhost/donler-beta'
};