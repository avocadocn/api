'use strict';

module.exports = function (err, req, res, next) {
  try {
    console.log(err.stack);
    // todo 如果需要记录错误日志，可在这里处理
    res.status(500).send({ msg: '服务器错误' });
  } catch (e) {
    console.log(e.stack);
    res.status(500).send({ msg: '服务器错误' });
  }
};