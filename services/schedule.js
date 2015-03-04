'use strict';

var mongoose = require('mongoose'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    Campaign = mongoose.model('Campaign'),
    ScoreBoard = mongoose.model('ScoreBoard'),
    Rank = mongoose.model('Rank'),
    Group = mongoose.model('Group'),
    Region = mongoose.model('Region'),
    async = require('async'),
    schedule = require('node-schedule');

var winScore =3;
var tieScore = 1;
var loseScore = 0;
//统计所有小组的活动数、人员参与数、评论数、照片从而得出分数
var teamPoint = function(){
  var now = new Date()
  // CompanyGroup.find({'active':true}).populate('photo_album_list').exec(function(err,teams){
  //   if(err){
  //     console.log(err);
  //   }
  //   else{
  //     async.each(teams,function(value, mapCallback){
  //       var campaignNum=0;
  //       var participatorNum=0;
  //       var commentNum = 0;
  //       var photoNum = 0;
  //       var memberNum = 0;
  //       var score=0;
  //       memberNum = value.member.length;
  //       //统计小队照片总数
  //       for(var i = 0; i < value.photo_album_list.length; i ++){
  //         photoNum += value.photo_album_list[i].photo_count;
  //       }
  //       //使用聚合无法直接算出member，所以暂时放弃
  //         // Campaign
  //         //   .aggregate()
  //         //   .match({'active':true,'tid':value._id,'end_time':{'$lte':now}})
  //         //   .project()
  //         //   .group({
  //         //     _id: {
  //         //       active: '$active'
  //         //     },
  //         //     campaignNum: {'$sum':1},
  //         //     participatorNum: {'$sum':{"$size":"$members"}},
  //         //     commentNum: {'$sum': "$comment_sum"}
  //         //   })
  //         //   .exec()
  //         //   .then(function (results) {
  //         //     value.score = {
  //         //       'campaign' : results[0].campaignNum,
  //         //       'album' : photoNum,
  //         //       'comment' : results[0].commentNum,
  //         //       'participator' : results[0].participatorNum,
  //         //       'member' : memberNum,
  //         //       'total' : results[0].campaignNum * 10 + parseInt(photoNum/5) + parseInt(results[0].commentNum / 20) + results[0].participatorNum + memberNum * 10
  //         //     }
  //         //     console.log(results)
  //         //     console.log(value.score)
  //         //     value.save(function(err){
  //         //       if(err){
  //         //         console.log('TEAM_POINT_FAILED!',err);
  //         //       }
  //         //     });
  //         //   })
  //         //   .then(null, function (err) {
  //         //     console.log(err);
  //         //   });
  //         async.parallel([
  //             function(callback){
  //               //TODO:将所有的已经结束的该小队活动进行统计，效率较低
  //               Campaign.find({'active':true,'tid':value._id,'end_time':{'$lte':now}}).exec(function(err,campaigns){
  //                 if (err) {
  //                   return callback(err);
  //                 }
  //                 campaigns.forEach(function(campaign){
  //                   campaignNum++;
  //                   participatorNum+=campaign.members.length;
  //                   commentNum += campaign.comment_sum;
  //                 });
  //                 value.count.total_campaign = campaignNum;
  //                 value.score = {
  //                   'campaign' : campaignNum *10,
  //                   'album' : parseInt(photoNum/5),
  //                   'comment' : parseInt(commentNum / 20),
  //                   'participator' : participatorNum,
  //                   'member' : memberNum * 10,
  //                   'total' : campaignNum * 10 + parseInt(photoNum/5) + parseInt(commentNum / 20) + participatorNum + memberNum * 10
  //                 }
  //                 callback(null, 'activity');
  //               });
  //             },
  //             function(callback){
  //               ScoreBoard.find({'status':2,'owner.teams':value._id}).exec(function(err,scoreBoards){
  //                 if (err) {
  //                   return callback(err);
  //                 }
  //                 scoreBoards.forEach(function(scoreBoard){
  //                   var _index = 0;
  //                   if(scoreBoard.playing_teams[0].tid.toString()!==value._id.toString()){
  //                     _index =1;
  //                   } 
  //                   switch(scoreBoard.playing_teams[_index].result) {
  //                     case 1:
  //                       score+=winScore;
  //                       break;
  //                     case 0:
  //                       score+=tieScore;
  //                       break;
  //                     case -1:
  //                       score+=loseScore;
  //                       break;
  //                   }
  //                 });
  //                 value.score_rank.score = score;
  //                 callback(null, 'score');
  //               });
  //             }
  //         ],
  //         // optional callback
  //         mapCallback);
  //     },function (err, results) {
  //       async.series([
  //         function(callback){
  //           teams.sort(function(first, last){
  //             return first.score.total<last.score.total;
  //           });
  //           var activityRank = new Rank();
  //           activityRank.rank_type = 'activity';
  //           console.log('activity');
  //           teams.forEach(function (team,index) {
  //             team.score.rank = index+1;
  //             console.log(team.name,team.score.total);
  //             if(index<10){
  //               activityRank.team.push({
  //                 _id: team._id,
  //                 cid: team.cid,
  //                 name: team.name,
  //                 logo: team.logo,
  //                 score: team.score.total,
  //                 rank: index+1
  //               })
  //             }
  //           });
  //           activityRank.save(function (err) {
  //             if(err){
  //               console.log(err);
  //             }
  //           });
  //           callback(null);
  //         },
  //         function(callback){
  //           teams.sort(function(first, last){
  //             console.log(first.score_rank.score,last.score_rank.score);
  //             return first.score_rank.score<last.score_rank.score;
  //           });
  //           var scoreRank = new Rank();
  //           scoreRank.rank_type = 'score';
  //           console.log('score');
  //           teams.forEach(function (team,index) {
  //             team.score_rank.rank = index+1;
  //             if(index<10){
  //               scoreRank.team.push({
  //                 _id: team._id,
  //                 cid: team.cid,
  //                 name: team.name,
  //                 logo: team.logo,
  //                 score: team.score_rank.score,
  //                 rank: index+1
  //               })
  //             }
  //           });
  //           scoreRank.save(function (err) {
  //             if(err){
  //               console.log(err);
  //             }
  //           });
  //           callback(null);
  //         }
  //       ],
  //       // optional callback
  //       function(err, results){
  //         teams.forEach(function(team,index) {
  //           team.save(function (err) {
  //             if(err){
  //               console.log(err);
  //             }
  //           })
  //         });
  //       });
  //     });
  //   }
  // });
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
                CompanyGroup.find({'city.province':region.name,'city.city': city.name,gid:group._id}).sort('-score.total').exec(function (err,teams) {
                
                  var activityRank = new Rank();
                  activityRank.rank_type = 'activity';
                  activityRank.group_type ={
                    _id:group._id,
                    name:group.group_type
                  }
                  activityRank.city = {
                    province: region.name,
                    city: city.name
                  }
                  teams.forEach(function (team,index) {
                    team.score.rank = index+1;
                    if(index<10){
                      activityRank.team.push({
                        _id: team._id,
                        cid: team.cid,
                        name: team.name,
                        logo: team.logo,
                        score: team.score.total,
                        rank: index+1
                      })
                    }
                  });

                  if(activityRank.team.length>0){
                    activityRank.save(function (err) {
                      if(err){
                        log(err)
                      }
                    })
                  }
                  teams.sort(function (first,last) {
                    return first.score_rank.score-first.score_rank.score;
                  })
                  var scoreRank = new Rank();
                  scoreRank.rank_type = 'score';
                  scoreRank.group_type ={
                    _id:group._id,
                    name:group.group_type
                  }
                  scoreRank.city = {
                    province: region.name,
                    city: city.name
                  }
                  teams.forEach(function (team,index) {
                    team.score_rank.rank = index+1;
                    if(index<10){
                      scoreRank.team.push({
                        _id: team._id,
                        cid: team.cid,
                        name: team.name,
                        logo: team.logo,
                        score: team.score_rank.score,
                        rank: index+1
                      });
                    }
                    team.save(function (err) {
                      if(err){
                        log(err);
                      }
                    })
                  });
                  if(scoreRank.team.length>0){
                    scoreRank.save(function (err) {
                      if(err){
                        log(err)
                      }
                    });
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

exports.init = function(){
  //自动统计小队分数
  var teamPointRule = new schedule.RecurrenceRule();
  teamPointRule.dayOfWeek = 0;
  teamPointRule.hour = 0;
  teamPointRule.minute = 0;
  var teamPointSchedule = schedule.scheduleJob(teamPointRule, function(){
    teamPoint();
  });
  teamPoint();
};

