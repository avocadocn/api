'use strict';

var mongoose = require('mongoose');
var Company = mongoose.model('Company');

module.exports = function (app) {

  return {

    getCompanyById: function (req, res) {
      res.sendStatus(200)
    }

  };

};