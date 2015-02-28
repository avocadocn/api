'use strict';

var token = require('../services/token.js');
var getById = require('../middlewares/getById.js');

module.exports = function (app, ctrl) {
  app.get('/departmentTree/:companyId', token.needToken, ctrl.getDepartmentTree);
  app.get('/departmentTree/:companyId/detail', token.needToken, ctrl.getDepartmentTreeDetail);

  app.post('/department', token.needToken, ctrl.createDepartment);
  app.get('/department/:departmentId', token.needToken, ctrl.getDepartment);
  app.put('/department/:departmentId', token.needToken, ctrl.updateDepartment);
  app.delete('/department/:departmentId', token.needToken, ctrl.deleteDepartment);

};