'use strict';

var token = require('../../services/token.js');

module.exports = function(app, ctrl) {
  app.get('/favoriteRank', token.needToken, ctrl.v2_0.getRankFromRedis, ctrl.v2_0.getRankFromDB); // 获取公司内、公司外排行榜 (TODO: 历史榜单)
};