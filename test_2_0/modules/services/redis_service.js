var path = require('path');

var common = require('../../support/common.js');
var dataService = require('../../create_data');
var redisService = require(path.join(common.config.rootPath, 'services/redis_service.js'));
var redisPushQueue = redisService.redisPushQueue;

module.exports = function() {
  describe('redisService', function () {
    var data;
    var msgs;
    before(function () {
      data = dataService.getData();
      msgs = [
        {type:1, time: new Date()},
        {type:2, time: new Date()}
      ];
    });

    describe('redisPushQueue', function () {

      it('应能成功push进队列', function (done) {
        redisPushQueue.addToQueue(2,msgs[1])
        .then(function(result) {
          result.should.be.ok;
          done();
        })
        .then(null, function(err) {
          err & done(err);
        })
      })

      before(function(done) {
        
        redisPushQueue.addToQueue(1,msgs[0])
        .then(function(result) {
          redisPushQueue.addToQueue(1,msgs[1])
          .then(function(result) {
            redisPushQueue.addToQueue(3,msgs[0])
            .then(function (result) {
              done();
            })
            .then(null, function() {
              err & done(err);
            })
          })
          .then(null, function() {
            err & done(err);
          })
        })
        .then(null, function(err) {
          err & done(err);
        })
      })

      it('应能成功取出队列', function (done) {
        redisPushQueue.getList(1)
        .then(function(result) {
          result.length.should.equal(2);
          done();
        })
        .then(null, function(err) {
          err & done(err);
        })
      })

      it('应能获取第一个进队列的元素', function(done) {
        redisPushQueue.getFirst(1)
        .then(function(result) {
          result.type.should.equal(msgs[0].type);
          done();
        })
        .then(null, function(err) {
          err & done(err);
        })
      })

      it('应能删除整个队列', function(done) {
        redisPushQueue.deleteList(3)
        .then(function(result) {
          result.should.be.ok;
          done();
        })
        .then(null, function(err) {
          err & done(err);
        })

        redisPushQueue.deleteList(1);
        redisPushQueue.deleteList(2);
      })
      
    })

  })
}
