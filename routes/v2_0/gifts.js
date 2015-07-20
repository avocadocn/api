'use strict';
var token = require('../../services/token');
module.exports = function (app, ctrl) {
  //获取用户收到/发出的礼物
  app.get('/gifts/history/:userId/:direction', token.needToken, ctrl.v2_0.getUserGifts);
  //送礼
  app.post('/gifts', token.needToken, ctrl.v2_0.validateGiftRemain, ctrl.v2_0.sendGift);
  //获取当前礼物详情
  app.get('/gifts/:giftId', token.needToken, ctrl.v2_0.getGift);
  //获取用户剩余礼物数
  app.get('/gifts/remain/:content', token.needToken, ctrl.v2_0.getUserGiftRemain);
};
