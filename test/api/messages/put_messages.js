var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');
var mongoose = common.mongoose;

module.exports = function () {

  describe('put /messages', function () {
    var accessToken;
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].users[0];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          accessToken = res.body.token;
          done();
        });
    });

    var hrToken;
    before(function (done) {
      data = dataService.getData();
      var company = data[0].model;
      request.post('/companies/login')
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          hrToken = res.body.token;
          done();
        });
    });

    var resMsg;
    before(function (done) {
      mongoose.model('Message').findOne()
        .exec()
        .then(function (message) {
          resMsg = message;
          done();
        })
        .then(null, function (err) {
          done(err);
        });
    });

    it('应该可以设置一条站内信为已读', function (done) {
      request.put('/messages')
        .set('x-access-token', accessToken)
        .query({
          requestId: data[0].users[0].id
        })
        .send({
          msg_id: resMsg.id,
          status: 'read'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    var testType = function (type) {
      it('应该可以设置多条站内信(' + type + ')为已读', function (done) {
        request.put('/messages')
          .set('x-access-token', accessToken)
          .query({
            requestType: type,
            requestId: data[0].users[0].id
          })
          .send({
            status: 'read',
            multi: true
          })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });
    };

    ['private', 'send', 'all'].map(function (item) {
      testType(item);
    });

    it('不能设置别人的站内信为已读', function (done) {
      request.put('/messages')
        .set('x-access-token', accessToken)
        .query({
          requestId: data[0].users[1].id
        })
        .send({
          msg_id: resMsg.id,
          status: 'read'
        })
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });


  });

};