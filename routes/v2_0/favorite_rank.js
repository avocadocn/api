'use strict';

var token = require('../../services/token.js');

module.exports = function(app, ctrl) {
  app.get('/favoriteRank', token.needToken, ctrl.v2_0.getRankFromRedis, ctrl.v2_0.getFavoriteRank); // 获取公司内、公司外排行榜 (TODO: 历史榜单)
  app.get('/favoriteRank/team', token.needToken, ctrl.v2_0.getTeamRank); // 获取小队排行榜
};