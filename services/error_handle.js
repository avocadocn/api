'use strict';

var mongoose = require('mongoose'),
  ErrorStatistics = mongoose.model('ErrorStatistics');
var err_log = require('./error_log.js');
module.exports = function (err, req, res, next) {
  if (res.statusCode < 400) {
    res.status(500);
  }

  var _err, msg;
  if (err instanceof Error) {
    _err = err.stack;
    msg = err.message;
    err_log(_err);
  }
  else {
    _err = err;
    msg = err;
    err_log(_err);
  }
  if (res.statusCode === 403) {
    res.status(403).send({msg: msg});
  }
  else if (res.statusCode === 404) {
    res.status(404).send({msg: msg});
  }
  else if (res.statusCode >= 500) {
    var log = new ErrorStatistics({
      error: {
        kind: res.statusCode.toString(),
        body: _err,
        headers: req.headers,
        method: req.method,
        url: req.url
      }
    });
    if (req.user) {
      log.error.target = {
        kind: req.user.provider,
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email
      };
      if (req.user.provider === 'company') {
        log.error.target.name = req.user.info.name;
      }
      else if (req.user.provider === 'user') {
        log.error.target.name = req.user.nickname;
      }
    }
    log.save(function(err) {
      if (err) err_log(err);
    });
    res.status(500).send({ msg: '服务器错误' });
  }
  else {
    res.status(res.statusCode).send({msg: msg});
  }
};