'use strict';

module.exports = function (app, modules) {

  var mongoose = modules.mongoose;
  var User = mongoose.model('User');

  app.get('/users/:userId', function (req, res) {
    User.findById(req.params.userId).exec()
      .then(function (user) {
        if (!user) {
          return res.send(404);
        }
        res.send(user);
      })
      .then(null, function (err) {
        res.send(500);
      });
  });


};