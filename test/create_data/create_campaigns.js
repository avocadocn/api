'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var Campaign = mongoose.model('Campaign'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    CampaignMold = mongoose.model('CampaignMold'),
    CompanyGroup = mongoose.model('CompanyGroup');

var async = require('async');
var chance = require('chance').Chance();
var moment = require('moment');


/**
 * 创建单个活动
 * @param  {[type]}   options       活动的参数 
 *                                           campaign_mold: 活动模型
 *                                           confirm_status: 活动是否确认
 *                                           campaign_type: 活动类型
 *                                           campaignUnits:活动的阵营信息
 *                                           statusType       1:未开始，2:正在进行，3:已经结束，4:关闭
 *                                           poster           1:poster对象
 * @param  {Function} callback      [description]
 * @return {[type]}                 [description]
 */
var createCampaign = function (options, callback) {
  var _options = {
    campaign_mold : options.campaign_mold || '其他',
    confirm_status : options.confirm_status==undefined || options.confirm_status,
    statusType : statusType || 1
  }
  
  var now = new Date();
  var nowYear = now.getFullYear();
  var nowMonth = now.getMonth();
  var campaign = new Campaign({
    cid : campaignUnits.length==1?[campaignUnits[0].company._id]:[campaignUnits[0].company._id,campaignUnits[1].company._id],
    tid : options.campaign_type==1?undefined:(campaignUnits.length==1? [campaignUnits[0].team._id]:[campaignUnits[0].team._id,campaignUnits[1].team._id]),
    campaign_unit : options.campaignUnits,
    active : _options.statusType!=4,
    confirm_status : _options.confirm_status,
    finish : _options.statusType==3,
    poster : _options.poster,
    theme : chance.string({length: 10}),
    content : chance.sentence(),
    memberMin : chance.integer({min: 0, max: 10}),
    memberMax : chance.integer({min: 10, max: 100}),
    location : {
      name : chance.address(),
      coordinates : [chance.longitude(), chance.latitude()]
    },
    start_time : chance.date({year: nowYear, month: _options.statusType==1 ? nowMonth+1 : nowMonth -3}),
    end_time : chance.date({year: nowYear, month: _options.statusType ==3 ? nowMonth-1:nowMonth +3}),
    deadline : chance.date({year: nowYear, month: _options.statusType ==3 ? nowMonth-2:nowMonth +2}),
    campaign_type : _options.campaign_type,
    campaign_mold : _options.campaign_mold,
  });
  var _user = {
    '_id': options.poster.uid || options.poster.cid,
    'name': options.poster.nickname || options.poster.cname,
    'type': options.poster.role =="HR" ? 'hr' :'user'
  };
  var photoInfo = {
    owner: {
      model: {
        // _id: campaign._id,
        type: 'Campaign'
      },
      companies: campaign.cid,
      teams: campaign.tid
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
  if (campaign.campaign_type !== 1) {
    CompanyGroup.find({
      _id: campaign.tid
    }).exec()
      .then(function (teams) {
        teams.forEach(function (team) {
          team.last_campaign = {
            _id: campaign._id,
            theme: campaign.theme,
            start_time: campaign.start_time
          };
          team.save(function (err) {
            if (err) {
              conole.log(err);
            }
          });
        });

      })
      .then(null, function (err) {
        conole.log(err);
      });
  }
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
          callback(null, campaign);

        });

      });
    });


  });
};
/**
 * 新建活动，并让成员加入，新建活动后在companyDataList添加相应属性
 *  example: createCampaigns([{
 *    model: doc,
 *    teams: [{
 *      model: doc,
 *      users: [doc],
 *      leaders: [doc]
 *    }], // 约定teams[0]为类型A，teams[1]~teams[3]为类型B
 *    users: [doc]
 *  }], function (err, companyDataList) {
 *    //companyDataList: [{
 *    //  model: doc,
 *    //  teams: [{
 *    //    model: doc,
 *    //    users: [doc],
 *    //    leaders: [doc],
 *    //    campaigns: [doc]
 *    //  }],
 *    //  users: [doc],
 *    //  campaigns: [doc]
 *    //}]
 *  });
 * @param {Array} companyDataList
 * @param callback
 */
var createCampaigns = function (companyDataList, callback) {
  //公司内的活动
  if(companyDataList.length ==1 ) {
    async.parallel({
      //创建公司活动
      companyCampaign: function(callback){
        var users = [];
        companyDataList[0].users.forEach(function(user){
          users.push({
            _id: user._id,
            nickname: user.nickname,
            photo: user.photo
          });
        });
        var poster = {
          cid: companyDataList[0].company._id,                       //活动发起者所属的公司
          cname: companyDataList[0].company.info.official_name,
          role: 'HR'
        }
        var campaignUnits = [{
          company:{
            _id:companyDataList[0].company._id,
            name:companyDataList[0].company.info.official_name,
            logo:companyDataList[0].company.info.logo
          },
          member:users,
          start_confirm: true
        }];
        async.parallel([
          //未开始
          function(callback){
            createCampaign({campaignUnits: campaignUnits, campaign_type: 1, start_confirm: true, poster: poster, statusType: 1}, callback);
          },
          //正在进行
          function(callback){
            createCampaign({campaignUnits: campaignUnits, campaign_type: 1, start_confirm: true, poster: poster, statusType: 2}, callback);
          },
          //已经结束
          function(callback){
            createCampaign({campaignUnits: campaignUnits, campaign_type: 1, start_confirm: true, poster: poster, statusType: 3}, callback);
          },
          //已经关闭
          function(callback){
            createCampaign({campaignUnits: campaignUnits, campaign_type: 1, start_confirm: true, poster: poster, statusType: 4}, callback);
          }
        ],
        // optional callback
        function(err, results){
          companyDataList[0].campaigns = results;
          callback(err, 'companyCampaign');
        });
      },
      //创建小队活动
      teamCampaign: function(callback){
        var users = [];
        companyDataList[0].teams[0].users.forEach(function(user){
          users.push({
            _id: user._id,
            nickname: user.nickname,
            photo: user.photo
          });
        });
        var hrPoster = {
          cid: companyDataList[0].company._id,                       //活动发起者所属的公司
          cname: companyDataList[0].company.info.official_name,
          role: 'HR'
        }
        var leaderPoster = {
          cid: companyDataList[0].company._id,                       //活动发起者所属的公司
          cname: companyDataList[0].company.info.official_name,
          uid: companyDataList[0].teams[0].leader[0]._id,
          nickname: companyDataList[0].teams[0].leader[0].nickname,
          role: 'LEADER'
        }
        var campaignUnits = [{
          company:{
            _id:companyDataList[0].company._id,
            name:companyDataList[0].company.info.official_name,
            logo:companyDataList[0].company.info.logo
          },
          team:{
            _id:companyDataList[0].teams[0]._id,
            name:companyDataList[0].teams[0].name,
            logo:companyDataList[0].teams[0].logo
          },
          member:users,
          start_confirm: true
        }];
        var campaign_mold = companyDataList[0].teams[0].group_type;
        async.parallel([
          //hr发送
            //未开始
            function(callback){
              createCampaign({
                campaignUnits: campaignUnits,
                campaign_type: 2,
                start_confirm: true,
                poster: hrPoster,
                campaign_mold: campaign_mold,
                statusType: 1
              }, callback);
            },
            //正在进行
            function(callback){
              createCampaign({campaignUnits: campaignUnits, campaign_type: 2, start_confirm: true, poster: hrPoster, campaign_mold: campaign_mold, statusType: 2}, callback);
            },
            //已经结束
            function(callback){
              createCampaign({campaignUnits: campaignUnits, campaign_type: 2, start_confirm: true, poster: hrPoster, campaign_mold: campaign_mold, statusType: 3}, callback);
            },
            //已经关闭
            function(callback){
              createCampaign({campaignUnits: campaignUnits, campaign_type: 2, start_confirm: true, poster: hrPoster, campaign_mold: campaign_mold, statusType: 4}, callback);
            },
          //队长发送
            //未开始
            function(callback){
              createCampaign({campaignUnits: campaignUnits, campaign_type: 2, start_confirm: true, poster: leaderPoster, campaign_mold: campaign_mold, statusType: 1}, callback);
            },
            //正在进行
            function(callback){
              createCampaign({campaignUnits: campaignUnits, campaign_type: 2, start_confirm: true, poster: leaderPoster, campaign_mold: campaign_mold, statusType: 2}, callback);
            },
            //已经结束
            function(callback){
              createCampaign({campaignUnits: campaignUnits, campaign_type: 2, start_confirm: true, poster: leaderPoster, campaign_mold: campaign_mold, statusType: 3}, callback);
            },
            //已经关闭
            function(callback){
              createCampaign({campaignUnits: campaignUnits, campaign_type: 2, start_confirm: true, poster: leaderPoster, campaign_mold: campaign_mold, statusType: 4}, callback);
            }
        ],
        // optional callback
        function(err, results){
          companyDataList[0].teams[0].campaign = results;
          callback(err, 'teamCampaignCampaign');
        });
      },
      //创建小队间挑战
      teamProvoke: function(callback){
        var campaign_mold = companyDataList[0].teams[0].group_type;
        var poster = {
          cid: companyDataList[0].company._id,                       //活动发起者所属的公司
          cname: companyDataList[0].company.info.official_name,
          uid: companyDataList[0].teams[1].leader[0]._id,
          nickname: companyDataList[0].teams[1].leader[0].nickname,
          role: 'LEADER'
        }
        var teamOneUsers = [];
        companyDataList[0].teams[1].users.forEach(function(user){
          teamOneUsers.push({
            _id: user._id,
            nickname: user.nickname,
            photo: user.photo
          });
        });
        var teamTwoUsers = [];
        companyDataList[0].teams[2].users.forEach(function(user){
          teamTwoUsers.push({
            _id: user._id,
            nickname: user.nickname,
            photo: user.photo
          });
        });
        var campaignUnits = [{
          company:{
            _id:companyDataList[0].company._id,
            name:companyDataList[0].company.info.official_name,
            logo:companyDataList[0].company.info.logo
          },
          team:{
            _id:companyDataList[0].teams[1]._id,
            name:companyDataList[0].teams[1].name,
            logo:companyDataList[0].teams[1].logo
          },
          member:teamOneUsers,
          start_confirm: true
        },{
          company:{
            _id:companyDataList[0].company._id,
            name:companyDataList[0].company.info.official_name,
            logo:companyDataList[0].company.info.logo
          },
          team:{
            _id:companyDataList[0].teams[2]._id,
            name:companyDataList[0].teams[2].name,
            logo:companyDataList[0].teams[2].logo
          },
          member:teamTwoUsers,
          start_confirm: true
        }];
        async.parallel([
          //未开始
          function(callback){
            createCampaign({campaignUnits: campaignUnits, campaign_type: 4, start_confirm: true, poster: poster, campaign_mold: campaign_mold, statusType: 1}, callback);
          },
          //正在进行
          function(callback){
            createCampaign({campaignUnits: campaignUnits, campaign_type: 4, start_confirm: true, poster: poster, campaign_mold: campaign_mold, statusType: 2}, callback);
          },
          //已经结束
          function(callback){
            createCampaign({campaignUnits: campaignUnits, campaign_type: 4, start_confirm: true, poster: poster, campaign_mold: campaign_mold, statusType: 3}, callback);
          },
          //已经关闭
          function(callback){
            createCampaign({campaignUnits: campaignUnits, campaign_type: 4, start_confirm: true, poster: poster, campaign_mold: campaign_mold, statusType: 4}, callback);
          },
          //取消应战
          function(callback){
            var _campaignUnits = [{
              company:{
                _id:companyDataList[0].company._id,
                name:companyDataList[0].company.info.official_name,
                logo:companyDataList[0].company.info.logo
              },
              team:{
                _id:companyDataList[0].teams[1]._id,
                name:companyDataList[0].teams[1].name,
                logo:companyDataList[0].teams[1].logo
              },
              member:teamOneUsers,
              start_confirm: false
            },{
              company:{
                _id:companyDataList[0].company._id,
                name:companyDataList[0].company.info.official_name,
                logo:companyDataList[0].company.info.logo
              },
              team:{
                _id:companyDataList[0].teams[2]._id,
                name:companyDataList[0].teams[2].name,
                logo:companyDataList[0].teams[2].logo
              },
              member:teamTwoUsers,
              start_confirm: false
            }]
            createCampaign({campaignUnits: _campaignUnits, campaign_type: 2, member: users, start_confirm: false, poster: poster, campaign_mold: campaign_mold, statusType: 4}, callback);
          },
          //拒绝应战
          function(callback){
            var _campaignUnits = [{
              company:{
                _id:companyDataList[0].company._id,
                name:companyDataList[0].company.info.official_name,
                logo:companyDataList[0].company.info.logo
              },
              team:{
                _id:companyDataList[0].teams[1]._id,
                name:companyDataList[0].teams[1].name,
                logo:companyDataList[0].teams[1].logo
              },
              member:teamOneUsers,
              start_confirm: true
            },{
              company:{
                _id:companyDataList[0].company._id,
                name:companyDataList[0].company.info.official_name,
                logo:companyDataList[0].company.info.logo
              },
              team:{
                _id:companyDataList[0].teams[2]._id,
                name:companyDataList[0].teams[2].name,
                logo:companyDataList[0].teams[2].logo
              },
              member:teamTwoUsers,
              start_confirm: false
            }]
            createCampaign({campaignUnits: _campaignUnits, campaign_type: 2, member: users, start_confirm: false, poster: poster, campaign_mold: campaign_mold, statusType: 4}, callback);
          }
        ],
        // optional callback
        function(err, results){
          companyDataList[0].teams[0].campaign = results;
          callback(err, 'teamProvoke');
        });
      }
    },
    function(err, results) {
      callback(err,companyDataList)
    });
  }
  //跨公司挑战
  else if( companyDataList.length == 2) {
    var campaign_mold = companyDataList[0].teams[0].group_type;
    var poster = {
      cid: companyDataList[0].company._id,                       //活动发起者所属的公司
      cname: companyDataList[0].company.info.official_name,
      uid: companyDataList[0].teams[1].leader[0]._id,
      nickname: companyDataList[0].teams[1].leader[0].nickname,
      role: 'LEADER'
    }
    var teamOneUsers = [];
    companyDataList[0].teams[0].users.forEach(function(user){
      teamOneUsers.push({
        _id: user._id,
        nickname: user.nickname,
        photo: user.photo
      });
    });
    var teamTwoUsers = [];
    companyDataList[1].teams[0].users.forEach(function(user){
      teamTwoUsers.push({
        _id: user._id,
        nickname: user.nickname,
        photo: user.photo
      });
    });
    var campaignUnits = [{
      company:{
        _id:companyDataList[0].company._id,
        name:companyDataList[0].company.info.official_name,
        logo:companyDataList[0].company.info.logo
      },
      team:{
        _id:companyDataList[0].teams[0]._id,
        name:companyDataList[0].teams[0].name,
        logo:companyDataList[0].teams[0].logo
      },
      member:teamOneUsers,
      start_confirm: true
    },{
      company:{
        _id:companyDataList[1].company._id,
        name:companyDataList[1].company.info.official_name,
        logo:companyDataList[1].company.info.logo
      },
      team:{
        _id:companyDataList[1].teams[0]._id,
        name:companyDataList[1].teams[0].name,
        logo:companyDataList[1].teams[0].logo
      },
      member:teamTwoUsers,
      start_confirm: true
    }];
    async.parallel([
      //未开始
      function(callback){
        createCampaign({campaignUnits: campaignUnits, campaign_type: 5, start_confirm: true, poster: poster, campaign_mold: campaign_mold, statusType: 1}, callback);
      },
      //正在进行
      function(callback){
        createCampaign({campaignUnits: campaignUnits, campaign_type: 5, start_confirm: true, poster: poster, campaign_mold: campaign_mold, statusType: 2}, callback);
      },
      //已经结束
      function(callback){
        createCampaign({campaignUnits: campaignUnits, campaign_type: 5, start_confirm: true, poster: poster, campaign_mold: campaign_mold, statusType: 3}, callback);
      },
      //已经关闭
      function(callback){
        createCampaign({campaignUnits: campaignUnits, campaign_type: 5, start_confirm: true, poster: poster, campaign_mold: campaign_mold, statusType: 4}, callback);
      },
      //取消应战
      function(callback){
        var _campaignUnits = [{
          company:{
            _id:companyDataList[0].company._id,
            name:companyDataList[0].company.info.official_name,
            logo:companyDataList[0].company.info.logo
          },
          team:{
            _id:companyDataList[0].teams[0]._id,
            name:companyDataList[0].teams[0].name,
            logo:companyDataList[0].teams[0].logo
          },
          member:teamOneUsers,
          start_confirm: false
        },{
          company:{
            _id:companyDataList[1].company._id,
            name:companyDataList[1].company.info.official_name,
            logo:companyDataList[1].company.info.logo
          },
          team:{
            _id:companyDataList[1].teams[0]._id,
            name:companyDataList[1].teams[0].name,
            logo:companyDataList[1].teams[0].logo
          },
          member:teamTwoUsers,
          start_confirm: false
        }]
        createCampaign({campaignUnits: _campaignUnits, campaign_type: 5, start_confirm: false, poster: poster, campaign_mold: campaign_mold, statusType: 4}, callback);
      },
      //拒绝应战
      function(callback){
        var _campaignUnits = [{
          company:{
            _id:companyDataList[0].company._id,
            name:companyDataList[0].company.info.official_name,
            logo:companyDataList[0].company.info.logo
          },
          team:{
            _id:companyDataList[0].teams[0]._id,
            name:companyDataList[0].teams[0].name,
            logo:companyDataList[0].teams[0].logo
          },
          member:teamOneUsers,
          start_confirm: true
        },{
          company:{
            _id:companyDataList[1].company._id,
            name:companyDataList[1].company.info.official_name,
            logo:companyDataList[1].company.info.logo
          },
          team:{
            _id:companyDataList[1].teams[0]._id,
            name:companyDataList[1].teams[0].name,
            logo:companyDataList[1].teams[0].logo
          },
          member:teamTwoUsers,
          start_confirm: false
        }]
        createCampaign({campaignUnits: _campaignUnits, campaign_type: 5, start_confirm: false, poster: poster, campaign_mold: campaign_mold, statusType: 4}, callback);
      }
    ],
    // optional callback
    function(err, results){
      companyDataList[0].teams[0].campaign = results;
      callback(err, companyDataList);
    });
  }

}

module.exports = createCampaigns;