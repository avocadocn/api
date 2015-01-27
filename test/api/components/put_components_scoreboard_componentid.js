'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function() {
  describe('put /components/ScoreBoard/:componentId', function() {

    // it('it should be invitecode but not active', function(done) {

    //   request.get('/region' + campaign.id)
    //     .expect(200)
    //     .end(function(err, res) {
    //       if (err) return done(err);
    //       res.body.validate.should.equal(true);
    //       done();
    //     });
    // });

    // it('it should be the invitecode exists and active', function(done) {

    //   request.get('/region' + campaign.id)
    //     .expect(200)
    //     .end(function(err, res) {
    //       if (err) return done(err);
    //       res.body.validate.should.equal(false);
    //       done();
    //     });
    // });

    // it('it should be the invitecode do not exists', function(done) {

    //   request.get('/region' + campaign.id)
    //     .expect(404)
    //     .end(function(err, res) {
    //       if (err) return done(err);
    //       res.body.validate.should.equal(false);
    //       done();
    //     });
    // });

  });
};