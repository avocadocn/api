'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');

module.exports = function (app) {

  return {

    getUserById: function (req, res) {
      User.findById(req.params.userId).exec()
      .then(function (user) {
        if (!user) {
          return res.sendStatus(404);
        }
        res.send(user);
      })
      .then(null, function (err) {
        res.sendStatus(500);
      });
    }

  }

}