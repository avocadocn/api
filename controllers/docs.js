'use strict';

var path = require('path');

module.exports = function (app) {

  var root = app.get('root');

  return {

    getSwaggerJson: function (req, res) {
      res.sendFile(path.join(root, 'docs/swagger.json'));
    },

    getSubApiDocs: function (req, res) {
      res.sendFile(path.join(root, 'docs', req.params.apiName + '.json'));
    }

  };

};