'use strict';
module.exports = function (app, ctrl) {

  app.get('/region', ctrl.v1_3.getRegions);
};