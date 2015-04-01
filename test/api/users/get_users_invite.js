var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function() {
  var dataService = require('../../create_data');
  var data = dataService.getData();
  describe('get /users/invite', function() {

    it('正常激活二维码可以正常跳转注册页面', function(done) {
      request.get('/users/invite')
        .query({
          'key': data[0].model.invite_key,
          'cid': data[0].model._id.toString(),
          'uid': data[0].users[0]._id.toString()
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            console.log(err);
            return done(err);
          }
          console.log(res.body);
          done();
        });
    });

    it('非法激活二维码不能跳转注册页面(参数错误)', function(done) {
      request.get('/users/invite')
        .query({
          'key': data[0].model.invite_key,
          'cid': data[0].model._id.toString()
        })
        .expect(400)
        .end(function(err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.msg.should.equal('参数错误');
          done();
        });
    });

    it('非法激活二维码不能跳转注册页面(非法邀请码)', function(done) {
      request.get('/users/invite')
        .query({
          'key': 'fdfdfd',
          'cid': data[0].model._id.toString(),
          'uid': data[0].users[0]._id.toString()
        })
        .expect(400)
        .end(function(err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.msg.should.equal('key错误');
          done();
        });
    });

    it('非法激活二维码不能跳转注册页面(非法公司id)', function(done) {
      request.get('/users/invite')
        .query({
          'key': data[0].model.invite_key,
          'cid': data[0].model._id.toString().substr(0, 23) + 'x',
          'uid': data[0].users[0]._id.toString()
        })
        .expect(404)
        .end(function(err, res) {
          if (err) {
            console.log(err);
            return done(err);
          }
          res.body.msg.should.equal('该公司不存在');
          done();
        });
    });

    it('非法激活二维码不能跳转注册页面(非法用户id)', function(done) {
      request.get('/users/invite')
        .query({
          'key': data[0].model.invite_key,
          'cid': data[0].model._id.toString(),
          'uid': data[0].users[0]._id.toString().substr(0, 23) + 'x'
        })
        .expect(404)
        .end(function(err, res) {
          if (err) {
            console.log(err);
            return done(err);
          }
          res.body.msg.should.equal('该uid不存在');
          done();
        });
    });

    it('非法激活二维码不能跳转注册页面(公司id与用户id不匹配)', function(done) {
      request.get('/users/invite')
        .query({
          'key': data[0].model.invite_key,
          'cid': data[0].model._id.toString(),
          'uid': data[1].users[0]._id.toString()
        })
        .expect(400)
        .end(function(err, res) {
          if (err) {
            console.log(err);
            return done(err);
          }
          res.body.msg.should.equal('cid与uid不匹配');
          done();
        });
    });
  });

};