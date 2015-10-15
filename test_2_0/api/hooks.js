var createDataModule = require('../create_data');

var common = require('../support/common.js');
var config = common.config;
var mongoose = require('mongoose');
var connect = mongoose.createConnection(config.db);
var Company = mongoose.model('Company');
var async = require('async');

var redisService = require('../../services/redis_service.js');
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
      createTemplate: function (parallelCallback) {
        console.log('开始生成互动模板数据');
        createDataModule.createTemplate(parallelCallback);
      },
      // createGroups: function (parallelCallback) {
      //   console.log('开始生成groups数据');
      //   createDataModule.createGroups(parallelCallback);
      // },
      // createCampaignMold: function (parallelCallback) {
      //   console.log('开始生成campaignMold数据');
      //   createDataModule.createCampaignMold(parallelCallback);
      // },
      createCompanyDataList: function (parallelCallback) {
        console.log('开始创建公司及其小队、用户等数据');
        createDataModule.createData(parallelCallback);
      }
      //todo 增加创建活动模板的数据
    }, function (err, results) {
      if (err) {
        done(err);
        return;
      }
      done();
    });
    
  };

  connect.on('open', function () {
    console.log('开始清空测试数据库:', config.db);
    var companies = Company.find().exec().then(function(companies){
      companies.forEach(function(company){
        redisService.redisRanking.removeKey(company.id, 1);
        redisService.redisRanking.removeKey(company.id, 2);
      })
      connect.db.dropDatabase(function (err, res) {
        if (err) {
          done(err);
          return;
        }
        doTasksAfterDropDB();
      });
    })
    .then(null,function(err){
      console.log('数据库错误')
    });
  });

});