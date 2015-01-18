var app = require('../../config/express.js')
  , request = require('supertest');

request = request(app);


describe('region api', function () {
  describe('get /region', function () {
    it('it should be region json data', function (done) {
      request.get('/region')
        .expect(200)
        .end(function (err, res) {
          var regionData = res.body;
          regionData.data.length.should.equal(31);
          regionData.data[0].label.should.be.type('string');
          regionData.data[0].value.should.be.type('string');
          regionData.data[0].data[0].label.should.be.type('string');
          regionData.data[0].data[0].value.should.be.type('string');
          regionData.data[0].data[0].data[0].label.should.be.type('string');
          regionData.data[0].data[0].data[0].value.should.be.type('string');
          done();
        });
    });
  });
});
