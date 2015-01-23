var createDataModule = require('../create_data');

var common = require('../support/common.js');
var config = common.config;
var mongoose = require('mongoose');
var connect = mongoose.createConnection(config.db);

var async = require('async');

before(function (done) {
  this.timeout(30 * 1000);

  var doTasksAfterDropDB = function () {

    async.parallel({
      createConfig: function (parallelCallback) {
        console.log('开始生成config数据');
        createDataModule.createConfig(parallelCallback);
      },
      createRegion: function (parallelCallback) {
        console.log('开始生成region数据');
        createDataModule.createRegion(parallelCallback);
      },
      createCampaignMold: function (parallelCallback) {
        console.log('开始生成campaignMold数据');
        createDataModule.createCampaignMold(parallelCallback);
      },
      createCompanyDataList: function (parallelCallback) {
        console.log('开始创建公司及其小队、用户等数据');
        createDataModule.createData(parallelCallback);
      }
    }, function (err, results) {
      done(err);
    });
    
  };

  connect.on('open', function () {
    console.log('开始清空测试数据库:', config.db);
    connect.db.dropDatabase(function (err, res) {
      if (err) {
        done(err);
        return;
      }
      doTasksAfterDropDB();
    });
  });

});