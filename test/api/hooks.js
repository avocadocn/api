var createDataModule = require('../create_data');

var common = require('../support/common.js');
var config = common.config;
var mongoose = require('mongoose');
var connect = mongoose.createConnection(config.db);


before(function (done) {
  this.timeout(30 * 1000);
  connect.on('open', function () {
    console.log('开始清空测试数据库:', config.db);
    connect.db.dropDatabase(function (err, res) {
      if (err) {
        done(err);
        return;
      }
      console.log('开始创建测试数据');
      createDataModule.createData(function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });

    });
  });

});