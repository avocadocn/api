'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    CampaignMold = mongoose.model('CampaignMold');
var moment = require('moment'),
    async = require('async');


module.exports = function (app) {

  return {

    postCampaign: function (req, res) {
      res.sendStatus(200)
      // var campaign = new Campaign();
      // // campaign.theme = basicInfo.theme;//主题
      // // campaign.content = basicInfo.content ? basicInfo.content : ''; //活动内容
      // // campaign.location = basicInfo.location; //活动地点
      // // campaign.start_time = basicInfo.start_time;
      // // campaign.end_time = basicInfo.end_time;
      // // campaign.member_min = basicInfo.member_min ? basicInfo.member_min : 0;
      // // campaign.member_max = basicInfo.member_max ? basicInfo.member_max : 0;
      // // campaign.deadline = basicInfo.deadline ? basicInfo.deadline : basicInfo.end_time;
      // campaign.active = true;
      // // campaign.campaign_mold = basicInfo.campaign_mold?basicInfo.campaign_mold:'其它';//以防万一
      // // if(basicInfo.tags&&basicInfo.tags.length>0)
      // //   campaign.tags = basicInfo.tags;
      // var _now = new Date();
      // if (req.body.body.start_time < _now || req.body.body.end_time < _now || req.body.body.deadline < _now) {
      //   return res.send(400,'活动的时间比现在更早');
      // }
      // else{
      //   //---providerInfo
      //   for (var attr in req.body.body) {
      //     campaign[attr] = req.body.body[attr];
      //   }
      //   var _user={
      //     '_id':campaign.poster.uid||campaign.poster.cid,
      //     'name':campaign.poster.uid ? campaign.poster.nickname:campaign.poster.cname,
      //     'type':campaign.poster.uid ? 'hr':'user'
      //   };
      //   var photoInfo= {
      //     owner: {
      //       model: {
      //         // _id: campaign._id,
      //         type: 'Campaign'
      //       },
      //       companies: campaign.cid,
      //       teams:  campaign.tid,
      //     },
      //     name: moment(campaign.start_time).format("YYYY-MM-DD ") + campaign.theme,
      //     update_user:_user,
      //     create_user:_user
      //   };
      //   //---Photo
      //   var photo_album = new PhotoAlbum();
      //   for (var attr in photoInfo){
      //     photo_album[attr]=photoInfo[attr];
      //   }
      //   photo_album.owner.model._id=campaign._id;

      //   //---save

      //   photo_album.save(function(err) {
      //     if(err) return res.send(500,'保存相册失败');
      //     campaign.photo_album = photo_album._id;

      //     campaign.components = [];
      //     campaign.modularization = true;
      //     var componentNames = [];
      //     CampaignMold.findOne({'name':campaign.campaign_mold},function(err,mold){
      //       if(err) return res.send(500,'查找活动类型失败');
      //       else{
      //         componentNames = mold.module;
      //         if(campaign.campaign_unit.length!==2){//单组去除比分板
      //           var scoreIndex = componentNames.indexOf('ScoreBoard');
      //           if(scoreIndex>-1)
      //             componentNames.splice(scoreIndex,1);
      //         }
      //         async.map(componentNames, function (componentName, asyncCallback) {
      //           mongoose.model(componentName).establish(campaign, function (err, component) {
      //             if (err) { asyncCallback(err); }
      //             else {
      //               campaign.components.push({
      //                 name: componentName,
      //                 _id: component._id
      //               });
      //               asyncCallback(null, component);
      //             }
      //           });
      //         }, function (err, results) {
      //           if (err) { return res.send(500, '创建活动组件失败'); }
      //           else {
      //             campaign.save(function(err) {
      //               if(err) return res.send(500,'保存活动失败');
      //               else {
      //                 return res.send(200,{'campaign_id':campaign._id,'photo_album_id':photo_album._id});
      //               }

      //             });

      //           }
      //         });
      //       }
      //     });
      //   });
      // }
    },
    getCampaign: function (req, res) {
      var option ={

      }
      Campaign
      .find(option)
      // .populate('photo_album')
      .limit(5)
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.send(404,'未找到活动')
        }
        else{
          res.send(200,campaign);
        }
      })
      .then(null, function (err) {
        res.send(500, '服务器错误');
      });
    },
    getCampaignById: function (req, res) {
      Campaign
      .findById(req.params.campaignId)
      // .populate('photo_album')
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.send(404,'未找到活动')
        }
        else{
          res.send(200,campaign);
        }
      })
      .then(null, function (err) {
        res.send(500, '服务器错误');
      });
    },
    updateCampaign: function (req, res) {
      res.sendStatus(200)
    },
    closeCampaign: function (req, res) {
      res.sendStatus(200)
    },

  };

};