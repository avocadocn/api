'use strict';

var mongoose = require('mongoose'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    Campaign = mongoose.model('Campaign'),
    ScoreBoard = mongoose.model('ScoreBoard'),
    Rank = mongoose.model('Rank'),
    Group = mongoose.model('Group'),
    Region = mongoose.model('Region'),
    CompetitionMessage = mongoose.model('CompetitionMessage'),
    async = require('async'),
    schedule = require('node-schedule');

var winScore =3;
var tieScore = 1;
var loseScore = 0;
var rankLimit = 10;
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
  var now = new Date()
  async.waterfall([
    function(callback) {
      Group.find({active:true}).exec(callback);
    },
    function(groups, callback) {
      Region.find().exec(function (err,regions) {
        regions.forEach(function (region) {
          region.city.forEach(function(city){
            groups.forEach(function(group){
              //虚拟组不计算
              if(group._id!="0"){
                CompanyGroup.find({'active':true,'city.province':region.name,'city.city': city.name,gid:group._id}).sort('-score_rank.score -score.total -score.win_percent -score.campaign -score.member').exec(function (err,teams) {
                  var rank = new Rank();
                  rank.group_type ={
                    _id:group._id,
                    name:group.group_type
                  }
                  rank.city = {
                    province: region.name,
                    city: city.name
                  }
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

exports.init = function(){
  //自动统计小队分数
  var teamPointRule = new schedule.RecurrenceRule();
  teamPointRule.dayOfWeek = 0;
  teamPointRule.hour = 0;
  teamPointRule.minute = 0;
  var teamPointSchedule = schedule.scheduleJob(teamPointRule, function(){
    teamRank();
  });
  // teamRank();
  //比分板过期
  var scoreBoardRule = new schedule.RecurrenceRule();
  scoreBoardRule.hour = 1;
  var scoreBoardSchedule = schedule.scheduleJob(scoreBoardRule, function(){
    scoreBoardTimeoutJob();
  });
  //挑战信过期
  var competitionMessageRule = new schedule.RecurrenceRule();
  competitionMessageRule.hour = 2;
  var competitionMessageSchedule = schedule.scheduleJob(competitionMessageRule, function(){
    competitionMessageTimeoutJob();
  });
  //自动统计小队分数
  // var teamPointRule = new schedule.RecurrenceRule();
  // teamPointRule.hour = 0;
  // teamPointRule.minute = 0;
  // var teamPointSchedule = schedule.scheduleJob(teamPointRule, function(){
  //     teamPoint();
  // });
  // teamPoint();
  // //自动完成已经结束的活动
  // var finishCampaignRule = new schedule.RecurrenceRule();
  // finishCampaignRule.minute = 0;
  // var finishCampaignSchedule = schedule.scheduleJob(finishCampaignRule, function(){
  //     finishCampaign();
  // });
  // //统计本周的活动数和活动人次，每小时一次
  // var currentWeekCampaignRule = new schedule.RecurrenceRule();
  // currentWeekCampaignRule.minute = 0;
  // var currentWeekCampaignSchedule = schedule.scheduleJob(currentWeekCampaignRule,currentWeekCampaignCount );
  // //统计上周的活动数和活动人次，每周一的0点运行一次
  // var lastWeekCampaignRule = new schedule.RecurrenceRule();
  // lastWeekCampaignRule.dayOfWeek = 1;
  // lastWeekCampaignRule.hour = 0;
  // lastWeekCampaignRule.minute = 0;
  // var lastWeekCampaignSchedule = schedule.scheduleJob(lastWeekCampaignRule, lastWeekCampaignCount);
  // //统计上月的活动数和活动人次，每月1号的0点运行一次
  // var lastMonthCampaignRule = new schedule.RecurrenceRule();
  // lastMonthCampaignRule.date = 1;
  // lastMonthCampaignRule.hour = 0;
  // lastMonthCampaignRule.minute = 0;
  // var lastMonthCampaignSchedule = schedule.scheduleJob(lastMonthCampaignRule,lastMonthCampaignCount);
};

