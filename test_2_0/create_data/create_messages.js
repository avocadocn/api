var async = require('async');
var chance = require('chance').Chance();
var common = require('../support/common');
var mongoose = common.mongoose;
var MessageContent = mongoose.model('MessageContent');
var Message = mongoose.model('Message');


var time_out = 72*24*3600;
var sendMessage = function (param, callback) {
  callback = callback || function (err) {
  };
  var MC = {
    'type': param.type,
    'caption': param.caption,
    'content': param.content,
    'sender': param.sender,
    'receiver': param.receiver,
    'team': param.team,
    'specific_type': param.specific_type,
    'company_id': param.company_id,
    'campaign_id': param.campaign_id,
    'deadline': (new Date()) + time_out,
    'auto': param.auto
  };
  MessageContent.create(MC, function (err, message_content) {
    if (err) {
      log(err);
      callback(err);
    } else {
      if (MC.type != 'global' && MC.type !== 'company') {
        var counter = {'i': 0};
        async.whilst(
          function () {
            return counter.i < param.receiver.length
          },
          function (__callback) {
            var M = {
              'type': param.type,
              'rec_id': param.receiver[counter.i]._id,
              'MessageContent': message_content._id,
              'specific_type': MC.specific_type,
              'status': 'unread'
            };
            Message.create(M, function (err, message) {
              if (err) {
                log(err);
              } else {
                counter.i++;
                __callback();
              }
            })
          },
          function (err) {
            if (err) {
              log(err);
              callback(err);
            }
            else {
              callback(null);
            }
          }
        );
      }
      else {
        callback(null);
      }
    }
  })
};





/**
 * 随机生成站内信
 * example:
 *  createMessage({
 *    model: doc,
 *    teams: [
 *      model: doc,
 *      ...
 *    ],
 *    campaigns: [doc]
 *    users: [doc]
 *  }, function (err, messages) {
 *
 *  });
 * @param {Object} companyData 公司完整数据
 * @param {Function} callback function(err){}
 */
var createMessages = function (companyData, callback) {

  var leader = companyData.teams[0].leaders[0];
  var campaignNoticeParams = {
    type: 'private',
    caption: 'testCampaignTheme',
    content: 'testCampaignMsgContent',
    specific_type: {
      value: 3,
      child_type: 0
    },
    company_id: companyData.model.id,
    campaign_id: companyData.teams[0].campaigns[0].id,
    auto: false,
    sender: [{
      _id: leader.id,
      nickname: leader.nickname,
      photo: leader.photo,
      role: 'LEADER'
    }],
    receiver: []
  };
  campaignNoticeParams.receiver =[];
  companyData.teams[0].campaigns[0].members.forEach(function (member) {
    campaignNoticeParams.receiver.push(member._id);
  });

  var team = companyData.teams[0].model;
  var teamMessageParams = {
    type: 'private',
    caption: 'testTeamMsgCaption',
    content: 'testTeamMsgContent',
    specific_type: {
      value: 2
    },
    company_id: companyData.model.id,
    team: [{
      _id: team._id,
      name: team.name,
      logo: team.logo
    }],
    sender: [{
      _id: leader.id,
      nickname: leader.nickname,
      photo: leader.photo,
      role: 'LEADER'
    }],
    auto: false,
    receiver: []
  };
  team.member.forEach(function(member){
    teamMessageParams.receiver.push(member._id);
  });

  async.parallel({
    // 创建活动站内信
    campaign: function (parallelCallback) {
      // 创建30个活动站内信
      async.times(30, function (n, next) {
        sendMessage(campaignNoticeParams, next);
      }, parallelCallback);

    },
    // 创建小队站内信
    team: function (parallelCallback) {
      // 创建30个小队站内信
      async.times(30, function (n, next) {
        sendMessage(teamMessageParams, next);
      }, parallelCallback);
    }
  }, function (err, results) {
    callback(err);
  });


};

module.exports = createMessages;
