'use strict';

module.exports = function (swagger, modules) {

  var paramTypes = swagger.paramTypes;
  var swe = swagger.errors;

  return {

    findById: {
      'spec': {
        description: "Operations about pets",
        path: "/useres/{userId}",
        method: "GET",
        summary: "Find user by ID",
        notes: "Returns a user based on ID",
        type: "User",
        nickname: "getUserById",
        produces: ["application/json"],
        parameters: [paramTypes.path("userId", "ID of user that needs to be fetched", "string")],
        responseMessages: [swe.invalid('id'), swe.notFound('user')]
      },
      'action': function(req, res) {
        if (!req.params.userId) {
          return swe.invalid('id');
        }

        modules.mongoose.model('User').findById(req.params.userId).exec()
          .then(function(user) {
            res.send(user);
          })
          .then(null, function(err) {
            // todo
            return swe.notFound('user', res);
          });

      }
    }


  }

};
