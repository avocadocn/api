'use strict';

module.exports = function (app, modules) {

  var root = app.get('root');
  var path = modules.path;

  app.get('/api-docs', function (req, res) {
    res.sendFile(path.join(root, 'docs/swagger.json'));
  });

  app.get('/api-docs/:apiName', function (req, res) {
    res.sendFile(path.join(root, 'docs', req.params.apiName + '.json'));
  });


};