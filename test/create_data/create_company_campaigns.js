'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var chance = require('chance').Chance();
var moment = require('moment');
var Campaign = mongoose.model('Campaign'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    CampaignMold = mongoose.model('CampaignMold');

/**
 * 创建公司活动
 * @param {Object} company
 * @param {Function} callback 形式为function(err, campaigns){}
 */
var createCompanyCampaigns = function (company, callback) {
  var now = new Date();
  var nowYear = now.getFullYear();
  var nowMonth = now.getMonth();
  var campaign = new Campaign({
    cid : [company._id],
    campaign_unit:[
    {
      company : {
        _id:company._id,
        name:company.info.official_name,
        logo:company.info.logo
      },
      start_confirm : true
    }],
    active : true,
    confirm_status: true,
    finish : false,
    poster : {
      cid : company._id,
      cname : company.info.official_name
    },
    theme : chance.string({length: 10}),
    content : chance.sentence(),
    memberMin : chance.integer({min: 0, max: 10}),
    memberMax : chance.integer({min: 10, max: 100}),
    location : {
      name : chance.address(),
      coordinates : [chance.longitude(),chance.latitude()]
    },
    start_time : chance.date({year: nowYear, month: nowMonth}),
    end_time : chance.date({year: nowYear, month: nowMonth+2}),
    deadline : chance.date({year: nowYear, month: nowMonth+1}),
    campaign_type : 1,
    campaign_mold : "其它",
  });
  var _user = {
    '_id': company._id,
    'name': company.info.official_name,
    'type': 'hr'
  };
  var photoInfo = {
    owner: {
      model: {
        // _id: campaign._id,
        type: 'Campaign'
      },
      companies: campaign.cid
    },
    name: moment(campaign.start_time).format("YYYY-MM-DD ") + campaign.theme,
    update_user: _user,
    create_user: _user
  };
  //---Photo
  var photo_album = new PhotoAlbum();
  for (var attr in photoInfo) {
    photo_album[attr] = photoInfo[attr];
  }
  photo_album.owner.model._id = campaign._id;

  //---save
  photo_album.save(function (err) {
    if (err) {
      console.log(err)
      callback('保存相册失败');
      return;
    }

    campaign.photo_album = photo_album._id;

    campaign.components = [];
    campaign.modularization = true;
    var componentNames = [];
    CampaignMold.findOne({'name': campaign.campaign_mold}, function (err, mold) {
      if (err) {
        callback('查找活动类型失败');
        return;
      }

      componentNames = mold.module;
      if (campaign.campaign_unit.length !== 2) {//单组去除比分板
        var scoreIndex = componentNames.indexOf('ScoreBoard');
        if (scoreIndex > -1)
          componentNames.splice(scoreIndex, 1);
      }
      async.map(componentNames, function (componentName, asyncCallback) {
        mongoose.model(componentName).establish(campaign, function (err, component) {
          if (err) {
            asyncCallback(err);
          }
          else {
            campaign.components.push({
              name: componentName,
              _id: component._id
            });
            asyncCallback(null, component);
          }
        });
      }, function (err, results) {
        if (err) {
          callback('创建活动组件失败');
          return;
        }
        campaign.save(function (err) {
          if (err) {
            callback('保存活动失败');
            return;
          }
          // todo test push
          // var pushData;
          // if (campaign.campaign_type === 1) {
          //   pushData = {
          //     name: 'companyCampaign',
          //     target: {
          //       cid: campaign.cid
          //     },
          //     campaignId: campaign._id,
          //     msg: {
          //       body: '您有新活动: ' + campaign.theme,
          //       description: '您有新活动: ' + campaign.theme,
          //       title: '您的公司有新活动'
          //     }
          //   };
          // } else {
          //   // 不是公司活动且不是挑战
          //   if (campaign.confirm_status === true) {
          //     pushData = {
          //       name: 'teamCampaign',
          //       target: {
          //         tid: campaign.tid
          //       },
          //       campaignId: campaign._id,
          //       msg: {
          //         title: '您的小队有新活动',
          //         body: '您有新活动: ' + campaign.theme,
          //         description: '您有新活动: ' + campaign.theme
          //       }
          //     }
          //   }
          // }

          // if (pushData) {
          //   pushService.push(pushData, function (err) {
          //     if (err) {
          //       console.log(err);
          //       if (err.stack) {
          //         console.log(err.stack);
          //       }
          //     }
          //   });
          // }

          callback(null, campaign);

        });

      });
    });


  });
};

module.exports = createCompanyCampaigns;