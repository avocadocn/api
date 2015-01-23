'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var CampaignMold = mongoose.model('CampaignMold');

var molds = [
    {
        'name':'其它',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'羽毛球',
        'module':['RichComment','ScoreBoard'],
        'enable':true
    },
    {
        'name':'篮球',
        'module':['RichComment','ScoreBoard'],
        'enable':true
    },
    {
        'name':'阅读',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'自行车',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'下午茶',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'棋牌',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'足球',
        'module':['RichComment','ScoreBoard'],
        'enable':true
    },
    {
        'name':'k歌',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'健身',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'美食',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'跑步',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'亲子',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'影视',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'摄影',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'旅行',
        'module':['RichComment'],
        'enable':true
    },
    {
        'name':'桌游',
        'module':['RichComment'],
        'enable':true
    }
];
/**
 * 创建活动的mold
 * @param {Function} callback function(err){}
 */
var createCampaignMold = function (callback) {
  molds.forEach(function(mold, index){
    var campaignMold = new CampaignMold({
      name: mold.name,
      module: mold.module
    });
    campaignMold.save(function (err) {
      if (err) {
        conole.log(err);
      }
    });
  });
  callback();
};

module.exports = createCampaignMold;