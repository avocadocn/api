'use strict';

var mongoose = require('mongoose'),
    Company = mongoose.model('Company'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    User = mongoose.model('User'),
    Team = mongoose.model('Team'),
    Interaction = mongoose.model('Interaction'),
    Campaign = mongoose.model('Campaign'),
    ScoreBoard = mongoose.model('ScoreBoard'),
    Rank = mongoose.model('Rank'),
    Group = mongoose.model('Group'),
    Region = mongoose.model('Region'),
    CompetitionMessage = mongoose.model('CompetitionMessage'),
    FavoriteRank = mongoose.model('FavoriteRank'),
    Gift = mongoose.model('Gift'),
    async = require('async'),
    schedule = require('node-schedule'),
    emailService = require('../services/email.js'),
    pushService = require('./push_service.js'),
    userScore = require('./user_score.js'),
    moment = require('moment');
var winScore =3;
var tieScore = 1;
var loseScore = 0;
var rankLimit = 10;
var objectToArray = function(obj) {
  var arr = [];
  for (var index in obj) {
    arr.push({index:index,value:obj[index]});
  }
  return arr;
}
/**
 * 活动结束更新小队积分
 * @param {Function} callback [description]
 */
var addTeamScore = function (callback) {

  var pageSize = 20;
  var nowResultLength = 0;
  var totalCount = 0, successCount = 0, failedCount = 0;
  var nextQueryId;
  var teamDatas ={};
  var _updateTeamScore = function (interaction, mapCallback) {
    var memberLength = interaction.members.length;
    //仅小队活动或者有发起小队的全校活动且有人参加时计算分数
    if(interaction.targetType===1 ||interaction.targetType===3&&!interaction.relatedTeam || !memberLength)
      return mapCallback();
    var teamId = interaction.targetType ===2 ? interaction.target :interaction.relatedTeam;
    //每个人参加加1分，活动本身10分。
    var score = memberLength + 10;
    if(!teamDatas[teamId]){
      teamDatas[teamId] = score;
    }
    else {
      teamDatas[teamId] += score;
    }
    mapCallback();
  };
  var updateTeamScore = function (resultCallback) {
    async.each(teamDatas, function(team,mapCallback){
      Team.update({
      _id: team.index
    }, {
      $inc: {
        "score.total": team.value
      }
    }, {
      multi: false
    }, function (err, num) {
      if (err) {
        console.log('更新小队积分出错:', err, '小队id:',team.index);
        console.log(err.stack);
        failedCount++;
      } else {
        successCount++
      }
      mapCallback();
    });
    }, function (err, results) {
      resultCallback();
    })
  };
  async.doWhilst(function (doWhilstCallback) {
    var query = {
      'type':1,
      'status':1,
      'endTime':{
        '$lt': new Date()
      }
    }
    if (nextQueryId) {
      query._id = {
        $gt: nextQueryId
      };
    }
    Interaction.find(query)
      .select("members targetType target relatedTeam")
      .sort('_id')
      .limit(pageSize)
      .exec()
      .then(function (interactions) {
        if (interactions.length > 0) {
          nowResultLength = interactions.length;
          nextQueryId = interactions[nowResultLength - 1]._id;
          totalCount += nowResultLength;
        }
        async.map(interactions, _updateTeamScore, function (err, results) {
          doWhilstCallback();
        })

      })
      .then(null, function (err) {
        console.log('查找活动出错:', err);
        console.log(err.stack);
        doWhilstCallback();
      });

  }, function () {
    return nowResultLength === pageSize;
  }, function (err) {
    teamDatas = objectToArray(teamDatas);
    updateTeamScore(callback)
    console.log('[更新小队分数]处理活动数:', totalCount, '成功:', successCount, '失败:', failedCount);
  });

}
//结束比赛，并统计小队积分
var finishActivity = function() {
  addTeamScore(function (err) {
    if (err) {
      console.log('更新积分出错：', err);
    }

    // 必须在更新完成员积分后再进行，否则无法查询将要设为结束的活动
    // 把时间到了的设为finish
    Interaction.update({'type':1,'status':1,'endTime':{'$lt':new Date()}},{$set:{'status':2, 'updateTime': new Date()}},{multi:true},function(err,num){
      if(err){
        console.log(err);
      }
      else{
        console.log('finishActivity:'+num);
      }
    })
  })
}
/**
 * 活动结束更新成员积分
 * @param {Function} callback [description]
 */
var addCampaignMemberScore = function (callback) {

  var pageSize = 20;
  var nowResultLength = 0;
  var totalCount = 0, successCount = 0, failedCount = 0;
  var nextQueryId;

  var updateMemberScore = function (campaign, mapCallback) {
    var memberIds = [];
    campaign.members.forEach(function (member) {
      memberIds.push(member._id);
    });

    User.update({
      _id: {
        $in: memberIds
      }
    }, {
      $inc: {
        "score.officialCampaignSucceded": userScore.scoreItems.officialCampaignSucceded,
        "score.total": userScore.scoreItems.officialCampaignSucceded
      }
    }, {
      multi: true
    }, function (err, num) {
      if (err) {
        console.log('更新活动成员积分出错:', err, '活动id:', campaign._id);
        console.log(err.stack);
        failedCount++;
      } else {
        successCount++
      }
      mapCallback();
    });

  };

  async.doWhilst(function (doWhilstCallback) {
    var query = {
      finish: false,
      end_time: {
        $lt: Date.now()
      }
    };
    if (nextQueryId) {
      query._id = {
        $gt: nextQueryId
      };
    }
    Campaign.find(query)
      .sort('_id')
      .limit(pageSize)
      .exec()
      .then(function (campaigns) {
        if (campaigns.length > 0) {
          nextQueryId = campaigns[campaigns.length - 1]._id;
          nowResultLength = campaigns.length;
          totalCount += campaigns.length;
        }
        async.map(campaigns, updateMemberScore, function (err, results) {
          doWhilstCallback();
        })

      })
      .then(null, function (err) {
        console.log('查找活动出错:', err);
        console.log(err.stack);
        doWhilstCallback();
      });

  }, function () {
    return nowResultLength === pageSize;
  }, function (err) {
    console.log('[更新活动成员分数]处理活动数:', totalCount, '成功:', successCount, '失败:', failedCount);
    callback(err);
  });

}
//统计所有小组的活动数、人员参与数、评论数、照片从而得出分数
var teamPoint = function(){
  var now = new Date();
  var timeLimit = new Date();
  timeLimit.setDate(now.getDate()-30);
  CompanyGroup.find({'active':true}).populate('photo_album_list').exec(function(err,teams){
    if(err){
      console.log(err);
    }
    else{
      teams.forEach(function(value){
        var campaignNum=0;
        var participatorNum=0;
        var commentNum = 0;
        var photoNum = 0;
        var memberNum = 0;
        memberNum = value.member.length;
        //统计小队照片总数
        for(var i = 0; i < value.photo_album_list.length; i ++){
          photoNum += value.photo_album_list[i].photo_count;
        }
        //使用聚合无法直接算出member，所以暂时放弃
          // Campaign
          //   .aggregate()
          //   .match({'active':true,'tid':value._id,'end_time':{'$lte':now}})
          //   .project()
          //   .group({
          //     _id: {
          //       active: '$active'
          //     },
          //     campaignNum: {'$sum':1},
          //     participatorNum: {'$sum':{"$size":"$members"}},
          //     commentNum: {'$sum': "$comment_sum"}
          //   })
          //   .exec()
          //   .then(function (results) {
          //     value.score = {
          //       'campaign' : results[0].campaignNum,
          //       'album' : photoNum,
          //       'comment' : results[0].commentNum,
          //       'participator' : results[0].participatorNum,
          //       'member' : memberNum,
          //       'total' : results[0].campaignNum * 10 + parseInt(photoNum/5) + parseInt(results[0].commentNum / 20) + results[0].participatorNum + memberNum * 10
          //     }
          //     console.log(results)
          //     console.log(value.score)
          //     value.save(function(err){
          //       if(err){
          //         console.log('TEAM_POINT_FAILED!',err);
          //       }
          //     });
          //   })
          //   .then(null, function (err) {
          //     console.log(err);
          //   });

        //TODO:将所有的已经结束的该小队活动进行统计，效率较低
        Campaign.find({'active':true,'tid':value._id,'end_time':{'$lte':now}}).exec(function(err,campaigns){
          campaigns.forEach(function(campaign){
            campaignNum++;
            participatorNum+=campaign.members.length;
            commentNum += campaign.comment_sum;
          });
          value.count.total_campaign = campaignNum;
          value.score = {
            'campaign' : campaignNum *10,
            'album' : parseInt(photoNum/5),
            'comment' : parseInt(commentNum / 20),
            'participator' : participatorNum,
            'member' : memberNum * 10,
            'total' : campaignNum * 10 + parseInt(photoNum/5) + parseInt(commentNum / 20) + participatorNum + memberNum * 10
          }
          value.timeHash = new Date();
          value.save(function(err){
            if(err){
              console.log('TEAM_POINT_FAILED!',err);
            }
          });
        });
      });
    }
  });
}
//根据小组积分算排名
var teamRank = exports.teamRank =function(){
  var now = new Date();
  
  var updateTeamRank = function(region, city, group) {
    //虚拟组不计算
    if(group._id=="0"){
      //找出所有同类型的正常小队并进行排名
      return;
    }
    CompanyGroup.find({'active':true,'company_active':{'$ne':false},'city.province':region.name,'city.city': city.name,gid:group._id})
    .sort('-score_rank.score -score.total -score.win_percent -score.campaign -score.member')
    .exec(function (err,teams) {
      var rank = new Rank();
      rank.group_type ={
        _id:group._id,
        name:group.group_type
      }
      rank.city = {
        province: region.name,
        city: city.name
      }
      //将前十个放入rank里
      teams.forEach(function (team,index) {
        team.score_rank.rank = index+1;
        if(index<rankLimit){
          var competitionCount = team.score_rank.win + team.score_rank.tie + team.score_rank.lose;
          rank.team.push({
            _id: team._id,
            cid: team.cid,
            name: team.name,
            cname: team.cname,
            logo: team.logo,
            member_num: team.member.length,
            activity_score: team.score.total,
            score: team.score_rank.score,
            rank: index+1,
            win: team.score_rank.win,
            tie: team.score_rank.tie,
            lose: team.score_rank.lose
          });
        }
        team.save(function (err) {
          if(err){
            console.log(err)
          }
        })
      });

      if(rank.team.length>0){
        rank.save(function (err) {
          if(err){
            console.log(err)
          }
        })
      }
    });
  }

  async.waterfall([
    function(callback) {
      Group.find({active:true}).exec(callback);
    },
    function(groups, callback) {
      Region.find().exec(function (err,regions) {
        regions.forEach(function (region) {
          region.city.forEach(function (city){
            groups.forEach(function (group){
              updateTeamRank(region, city, group);
            });
          });
        })
      })
      callback(null, 'score');
    }
  ], function (err, result) {
      // result now equals 'done'    
  });
  
}
//结束的活动改变状态
var finishCampaign = function(){
  //把比赛都开始都没应答的视为关闭
  Campaign.update({'active':true,'start_time':{'$lt':new Date()},'campaign_type':{'$in':[4,5,7,9]},'confirm_status':false},{$set:{'active':false, 'timeHash': new Date()}},{multi:true},function(err,num){
    if(err){
      console.log(err);
    }
    else{
      console.log('closeNoResponseCompetition:'+num);
    }
  })

  addCampaignMemberScore(function (err) {
    if (err) {
      console.log('更新积分出错：', err);
    }

    // 必须在更新完成员积分后再进行，否则无法查询将要设为结束的活动
    // 把时间到了的设为finish
    Campaign.update({'finish':false,'end_time': {'$lt':new Date()}},{$set:{'finish':true, 'timeHash': new Date()}},{multi: true},function(err,num){
      if(err){
        console.log(err);
      }
      else{
        console.log('finishCampaign:'+num);
      }
    });

  })

  
  //把finish的但是没人参加的活动视为关闭
  //   db.campaigns.find({'$nor':[{'campaign_unit.member':{'$size':{'$gt':0}}}]})
  //   Campaign.find({'finish':true,'campaign_unit':{'$size':1},'campaign_unit.member':{'$size':0}});//可以
  //   Campaign.find({'finish':true,'campaign_unit':{'$size':2},'campaign_unit.0.member':{'$size':0},'campaign_unit.1.member':{'$size':0}})//可以
  // db.campaigns.find({'$not':{'campaign_unit.member':{'$size':{'$gt':0}}}},{'campaign_unit.member':1}).pretty()//无效
  // db.campaigns.find({'campaign_unit.member':{'$size':{'$gt':0}}},{'campaign_unit.member':1}).pretty()



}
var countCampaign = function (startTime,endTime,type,newWeek){
  CompanyGroup.find({'active':true},function(err,teams){
    if(err){
      console.log(err);
    }
    else{
      teams.forEach(function(value){
        var campaignNum=0;
        var memberNum=0;
        Campaign.find({'active':true,'tid':value._id,'end_time':{'$lte':endTime,'$gt':startTime}},function(err,campaigns){
          campaigns.forEach(function(campaign){
            campaignNum++;
            memberNum+=campaign.members.length;
          });
          switch(type){
            case 'currentWeek':
            value.count.current_week_campaign = campaignNum;
            value.count.current_week_member = memberNum;
            break;
            case 'lastWeek':
            value.count.last_week_campaign = campaignNum;
            value.count.last_week_member = memberNum;
            break;
            case 'lastMonth':
            value.count.last_month_campaign = campaignNum;
            value.count.last_month_member = memberNum;
            break;
            default:
            break;
          }
          value.save(function(err){
            if(err){
              console.log(err);
            }
          });
        });
      });
    }
  });
};
var currentWeekCampaignCount = function(){
  var _nowTime=new Date();
  var startTime=new Date();
  startTime.setDate(_nowTime.getDate()-_nowTime.getDay());
  startTime.setHours(24);
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);
  countCampaign(startTime,_nowTime,'currentWeek',_nowTime.getDay() === 0);
}
var lastWeekCampaignCount =  function(){
  var _nowTime=new Date();
  var startTime=new Date();
  startTime.setDate(_nowTime.getDate()-_nowTime.getDay()-7);
  startTime.setHours(24);
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);
  var endTime=new Date();
  endTime.setDate(_nowTime.getDate()-_nowTime.getDay());
  endTime.setHours(24);
  endTime.setMinutes(0);
  endTime.setSeconds(0);
  endTime.setMilliseconds(0);
  countCampaign(startTime,endTime,'lastWeek');
}
var lastMonthCampaignCount =  function(){
  var _nowTime=new Date();
  var startTime=new Date();
  startTime.setMonth(_nowTime.getMonth()-1);
  startTime.setDate(1);
  startTime.setHours(0);
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);
  var endTime=new Date();
  endTime.setDate(1);
  endTime.setHours(0);
  endTime.setMinutes(0);
  endTime.setSeconds(0);
  endTime.setMilliseconds(0);
  countCampaign(startTime,endTime,'lastMonth');
}
//统计活动数
exports.countCampaign = function(){
  currentWeekCampaignCount();
  lastWeekCampaignCount();
  lastMonthCampaignCount();
}
//挑战信过期
var competitionMessageTimeout = 7; //7天
var competitionMessageTimeoutJob = function () {
  var limitTime = new Date();
  limitTime.setDate(limitTime.getDate()-competitionMessageTimeout);
  CompetitionMessage.update({'status':'sent',create_time:{$lte:limitTime}}, { $set: { status: 'deal_timeout' }}, { multi: true } ,function(err,num){
    if(err){
      console.log(err);
    }
    else{
      console.log('competitionMessageTimeout-noResponse:'+num);
    }
  })
  CompetitionMessage.update({'status':'accepted',deal_time:{$lte:limitTime}}, { $set: { status: 'competion_timeout' }}, { multi: true } ,function(err,num){
    if(err){
      console.log(err);
    }
    else{
      console.log('competitionMessageTimeout-noCompetition:'+num);
    }
  })

}
//比分板过期
var scoreBoardTimeout = 3; //7天
var scoreBoardTimeoutJob = function () {
  var limitTime = new Date();
  limitTime.setDate(limitTime.getDate()-scoreBoardTimeout);
  ScoreBoard.update({'status':0,limit_time:{$lte:limitTime}}, { $set: { 'playing_teams.0.result':0,'playing_teams.1.result':0,'status':2}}, { multi: true } ,function(err,num){
    if(err){
      console.log(err);
    }
    else{
      console.log('scoreBoardTimeout-noSet:'+num);
    }
  })
  ScoreBoard.update({'status':1,deal_time:{$lte:limitTime}}, { $set: { 'status':2}}, { multi: true },function(err,num){
   if(err){
      console.log(err);
    }
    else{
      console.log('scoreBoardTimeout-noResponse:'+num);
    }
  })
}
//发送邮件给刚刚激活的公司
var sendCompanyGuideJob = function () {
  var _nowTime=new Date();
  var startTime=new Date();
  startTime.setDate(_nowTime.getDate()-2);
  var endTime = new Date();
  endTime.setDate(_nowTime.getDate()-1);
  console.log(startTime,endTime);
  Company.find({'status.verification':1,'status.mail_active':true,'status.active':true,'status.date':{$gte:startTime,$lt:endTime}})
  .exec()
  .then(function (companies) {
    async.each(companies, function (company, callback) {
      emailService.sendCompanyOperationGuideMail(company.login_email,company.info.name, function (err) {
        callback(err);
      })
    }, function(err){
      if( err ) {
        console.log('发送操作指南：',err);
      }
      else{
        console.log('发送操作指南：',companies.length);
      }
    });

  })
  .then(null, function (err) {
    console.log('发送操作指南错误:', err);
  });
}

var ranking = function() {
  // 设置增量查询的时间 (TODO)
  var _start = moment().subtract(1, 'day').hour(0).minute(0).second(0).millisecond(0);
  var _end = moment().subtract(1, 'day').hour(23).minute(59).second(59).millisecond(999);

  var updateFavoriteRank = function(company, callback) {
    var aggregateOptions = [{
      $match: {
        'cid': company._id, 
        'createTime': {
          $gte: new Date(_start.format()),
          $lte: new Date(_end)
        }
      }
    }, {
      $group: {
        '_id': '$receiver',
        'vote': {
          $sum: 1
        }
      }
    }, {
      $sort: {
        'vote': -1,
        '_id': 1
      }
    }];

    // 榜单类型的选择
    switch (company.type) {
      case '1':
        aggregateOptions[0].$match.receiverGender = 1;
        aggregateOptions[0].$match.giftIndex = 4;
        break;
      case '2':
        aggregateOptions[0].$match.receiverGender = 2;
        aggregateOptions[0].$match.giftIndex = 4;
        break;
      case '3':
        aggregateOptions[0].$match.giftIndex = {
          $in: [1, 2, 3]
        };
        break;
      default:
        break;
    }

    Gift.aggregate(aggregateOptions).exec(function(err, increments) {
      if (err) {
        console.log(err);
        callback(err);
      }

      async.map(increments, function(increment, _callback) {
        var conditions = {
          'cid': company._id,
          'type': company.type,
          'userId': increment._id
        };

        FavoriteRank.findOneAndUpdate(conditions, {
          $inc: {
            'vote': increment.vote
          }
        }, {
          'upsert': 1
        }, function(err, doc) {
          if (err) _callback(err);
          else _callback();
        });
      }, function(err, res) {
        if (err) callback(err);
        else callback();
      });
    });
  };

  // TODO: 查询公司的条件还需进一步设置
  Company.find({'status.mail_active': true, 'status.active': true})
  .exec()
  .then(function(companies) {
    var objArr = [];
    companies.forEach(function(company) {
      for (var i = 1; i <= 3; i++) {
        objArr.push({'_id': company._id, 'type': i});
      }
    });

    async.map(objArr, updateFavoriteRank, function(err, res) {
      if (err) console.log('榜单数据生成失败');
      else console.log('榜单数据生成成功');
    });
  })
  .then(null, function(err) {
    console.log('榜单数据生成失败');
  });

}

exports.init = function(){
  //自动完成已经结束的活动
  var finishActivityRule = new schedule.RecurrenceRule();
  finishActivityRule.minute = 0;
  var finishActivitySchedule = schedule.scheduleJob(finishActivityRule, finishActivity);

  //每小时清推送
  var pushClearRule = new schedule.RecurrenceRule();
  pushClearRule.minute = 30;
  var pushClearSchedule = schedule.scheduleJob(pushClearRule, pushService.getAllListsAndPush);

  // finishActivity();
  //自动统计小队排名
  // var teamPointRule = new schedule.RecurrenceRule();
  // teamPointRule.dayOfWeek = 0;
  // teamPointRule.hour = 0;
  // teamPointRule.minute = 0;
  // var teamPointSchedule = schedule.scheduleJob(teamPointRule, teamRank);
  // teamRank();
  
  //比分板过期
  // var scoreBoardRule = new schedule.RecurrenceRule();
  // scoreBoardRule.hour = 1;
  // scoreBoardRule.minute = 0;
  // var scoreBoardSchedule = schedule.scheduleJob(scoreBoardRule, scoreBoardTimeoutJob);
  // scoreBoardTimeoutJob();

  //挑战信过期
  // var competitionMessageRule = new schedule.RecurrenceRule();
  // competitionMessageRule.hour = 2;
  // competitionMessageRule.minute = 0;
  // var competitionMessageSchedule = schedule.scheduleJob(competitionMessageRule, competitionMessageTimeoutJob);
  // competitionMessageTimeoutJob()

  // 自动统计小队分数
  // var teamPointRule = new schedule.RecurrenceRule();
  // teamPointRule.hour = 0;
  // teamPointRule.minute = 0;
  // var teamPointSchedule = schedule.scheduleJob(teamPointRule, teamPoint);
  // teamPoint();

  //自动完成已经结束的活动
  // var finishCampaignRule = new schedule.RecurrenceRule();
  // finishCampaignRule.minute = 0;
  // var finishCampaignSchedule = schedule.scheduleJob(finishCampaignRule, finishCampaign);
  // finishCampaign();

  //统计本周的活动数和活动人次，每小时一次
  // var currentWeekCampaignRule = new schedule.RecurrenceRule();
  // currentWeekCampaignRule.minute = 0;
  // var currentWeekCampaignSchedule = schedule.scheduleJob(currentWeekCampaignRule,currentWeekCampaignCount );
  // currentWeekCampaignCount();
 
  //统计上周的活动数和活动人次，每周一的0点运行一次
  // var lastWeekCampaignRule = new schedule.RecurrenceRule();
  // lastWeekCampaignRule.dayOfWeek = 1;
  // lastWeekCampaignRule.hour = 0;
  // lastWeekCampaignRule.minute = 0;
  // var lastWeekCampaignSchedule = schedule.scheduleJob(lastWeekCampaignRule, lastWeekCampaignCount);
  // lastWeekCampaignCount();
  
  //统计上月的活动数和活动人次，每月1号的0点运行一次
  // var lastMonthCampaignRule = new schedule.RecurrenceRule();
  // lastMonthCampaignRule.date = 1;
  // lastMonthCampaignRule.hour = 0;
  // lastMonthCampaignRule.minute = 0;
  // var lastMonthCampaignSchedule = schedule.scheduleJob(lastMonthCampaignRule,lastMonthCampaignCount);
  // lastMonthCampaignCount();
  
  //发送邮件给刚刚激活的公司,激活后一天,零时运行
  // var sendCompanyGuideRule = new schedule.RecurrenceRule();
  // sendCompanyGuideRule.hour = 0;
  // sendCompanyGuideRule.minute = 0;
  // var sendCompanyGuideSchedule = schedule.scheduleJob(sendCompanyGuideRule, sendCompanyGuideJob);
  // sendCompanyGuideJob();
};

