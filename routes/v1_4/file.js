/**
 * 文件api routes
 * CahaVar <cahavar@55yali.com> 于2015-03-17创建
 */

var token = require('../../services/token');

module.exports = function(app, ctrl) {

  app.post('/files', token.needToken, ctrl.v1_3.upload);

};