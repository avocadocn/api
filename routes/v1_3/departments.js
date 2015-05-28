'use strict';

var token = require('../../services/token.js');
var getById = require('../../middlewares/getById.js');

module.exports = function (app, ctrl) {
  app.get('/departmentTree/:companyId', token.needToken, ctrl.v1_3.getDepartmentTree);
  app.get('/departmentTree/:companyId/detail', token.needToken, ctrl.v1_3.getDepartmentTreeDetail);

  app.post('/departments', token.needToken, ctrl.v1_3.createDepartment);
  app.get('/departments/:departmentId', token.needToken, ctrl.v1_3.getDepartment);
  app.put('/departments/:departmentId', token.needToken, ctrl.v1_3.updateDepartment);
  app.delete('/departments/:departmentId', token.needToken, ctrl.v1_3.deleteDepartment);

  app.post('/departments/:departmentId/actions/appointManager', token.needToken, ctrl.v1_3.appointManager);

};