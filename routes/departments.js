'use strict';

var token = require('../services/token.js');
var getById = require('../middlewares/getById.js');

module.exports = function (app, ctrl) {
  app.get('/departmentTree/:companyId',  token.needToken, ctrl.getDepartment);
  app.get('/departmentTree/:companyId/detail',  token.needToken, ctrl.getDepartmentTreeDetail);
};