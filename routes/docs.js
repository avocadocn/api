'use strict';

module.exports = function (app, ctrl) {

  app.get('/api-docs', ctrl.getSwaggerJson);
  app.get('/api-docs/:apiName', ctrl.getSubApiDocs);

};