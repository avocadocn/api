'use strict';
var common = require('../support/common');
var tools = require('../../tools/tools');
var mongoose = common.mongoose;
var Campaign = mongoose.model('Campaign'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    Photo = mongoose.model('Photo'),
    CampaignMold = mongoose.model('CampaignMold'),
    CompanyGroup = mongoose.model('CompanyGroup');

var async = require('async');
var chance = require('chance').Chance();
var moment = require('moment');

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
 * 为活动相册生成照片
 * @param {Object} photoAlbum
 * @param {Object} campaign
 * @param {Function} callback function(err){}
 */
var createPhotos = function (photoAlbum, campaign, callback) {
  var uploadUsers = [];
  campaign.members.forEach(function (member) {
    uploadUsers.push({
      _id: member._id,
      name: member.nickname,
      type: 'user'
    });
  });
  var randomPhotoCount = chance.integer({ min: 10, max: 30 });
  var uploadUsersMaxIndex = uploadUsers.length - 1;
  var photoList = [];
  for (var i = 0; i < randomPhotoCount; i++) {
    (function () {
      var photo = new Photo({
        photo_album: photoAlbum._id,
        owner: {
          companies: photoAlbum.owner.companies,
          teams: photoAlbum.owner.teams
        },
        uri: 'testuri',
        width: 200,
        height: 200,
        upload_date: chance.date(),
        hidden: chance.bool({ likelihood: 10 }),
        click: chance.integer({ min: 0, max: 500 }),
        name: 'test photo name',
        tags: ['tag1', 'tag2'],
        upload_user: uploadUsers[chance.integer({ min: 0, max: uploadUsersMaxIndex})]
      });
      photoList.push(photo);

      photoAlbum.pushPhoto(photo);
      photoAlbum.update_user = photo.upload_user;
      photoAlbum.update_date = photo.update_date;
      photoAlbum.photo_count += 1;
      i++
    }());
  }

  async.map(photoList, function (photo, mapCallback) {
    photo.save(mapCallback);
  }, function (err, results) {
    callback(err);
  });

};





/**
 * 创建单个活动
 * @param  {[type]}   options       活动的参数 
 *                                           campaign_mold: 活动模型
 *                                           confirm_status: 活动是否确认
 *                                           campaign_type: 活动类型
 *                                           campaignUnits:活动的阵营信息
 *                                           statusType       1:未开始，2:正在进行，3:已经结束，4:关闭
 *                                           poster           1:poster对象
 *                                           member_max   人数上限
 * @param  {Function} callback      [description]
 * @return {[type]}                 [description]
 */
var createCampaign = function (options, _callback) {
  var _options = {
    campaign_mold : options.campaign_mold || '其他',
    confirm_status : options.confirm_status==undefined || options.confirm_status,
    statusType : options.statusType || 1,
    campaign_type : options.campaign_type,
    campaignUnits : options.campaignUnits,
    poster : options.poster,
    member_max : options.member_max
  }
  
  var now = new Date();
  var nowYear = now.getFullYear();
  var nowMonth = now.getMonth();
  var campaign = new Campaign({
    cid : _options.campaignUnits.length==1?[_options.campaignUnits[0].company._id]:[_options.campaignUnits[0].company._id,_options.campaignUnits[1].company._id],
    tid : _options.campaign_type==1?undefined:(_options.campaignUnits.length==1? [_options.campaignUnits[0].team._id]:[_options.campaignUnits[0].team._id,_options.campaignUnits[1].team._id]),
    campaign_unit : _options.campaignUnits,
    active : _options.statusType!=4,
    confirm_status : _options.confirm_status,
    finish : _options.statusType==3,
    poster : _options.poster,
    theme : chance.string({length: 10}),
    content : chance.sentence(),
    member_min : _options.member_max ?_options.member_max : chance.integer({min: 0, max: 10}),
    member_max : _options.member_max ?_options.member_max : chance.integer({min: 10, max: 100}),
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
    '_id': _options.poster.uid || _options.poster.cid,
    'name': _options.poster.nickname || _options.poster.cname,
    'type': _options.poster.role =="HR" ? 'hr' :'user'
  };
  var photoInfo = {
    owner: {
      model: {
        _id: campaign._id,
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
  var photo_album = new PhotoAlbum(photoInfo);
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

  // 创建照片
  createPhotos(photo_album, campaign, function (err) {
    if (err) {
      _callback(err);
      return;
    }

    //---save
    photo_album.save(function (err) {
      if (err) {
        console.log(err);
        _callback('保存相册失败');
        return;
      }

      campaign.photo_album = photo_album._id;

      campaign.components = [];
      campaign.modularization = true;
      var componentNames = [];
      var modlsIndex = tools.arrayObjectIndexOf(molds,campaign.campaign_mold,'name');
      componentNames = molds[modlsIndex<0 ? 0:modlsIndex].module;
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
          console.log(err)
          _callback('创建活动组件失败');
          return;
        }
        else{
          campaign.save(function (err) {
            if (err) {
              console.log(err)
              _callback('保存活动失败');
              return;
            }
            else{
              _callback(null, campaign);
            }
          });
        }
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
 *    //    campaigns: [doc]  //正常8个活动：依次为hr发布的四个状态的活动，leader发布的四个状态的活动。第一个公司的第一个小队17个活动：再加上与第二个公司的第一个小队间的9个挑战(第一个队的队长参加活动，第二个队无人参加,未应战的无人参加）
 *    //  },{
 *    //    model: doc,
 *    //    users: [doc],
 *    //    leaders: [doc],
 *    //    campaigns: [doc] //第一和第二个小队间的9个挑战，依次为未开始，正在进行，已经结束，关闭，取消应战，拒绝应战，三个未应战的(第一个队的队长参加活动，第二个队无人参加,未应战的无人参加）
 *    //  },{
 *    //    model: doc,
 *    //    users: [doc],
 *    //    leaders: [doc],
 *    //    campaigns: [doc]
 *    //  }],
 *    //  users: [doc],
 *    //  campaigns: [doc] //公司活动5个，分别为未开始，正在进行，已经结束，关闭,成员上限为1的活动
 *    //}]
 *  });
 *  每个活动都只有第一个user参加
 * @param {Array} companyDataList长度为1时返回对象，否则返回数组
 * @param callback
 */
var createCampaigns = function (companyDataList, callback) {
  //公司内的活动
  if(companyDataList.length ==1 ) {
    if(!companyDataList[0].model.status.mail_active) {
      return callback(null,companyDataList[0]);
    }

    async.parallel({
      //创建公司活动
      companyCampaign: function(parallelCallback){
        var users = [];
        // companyDataList[0].users.forEach(function(user){
          users.push({
            _id: companyDataList[0].users[0]._id,
            nickname: companyDataList[0].users[0].nickname,
            photo: companyDataList[0].users[0].photo
          });
        // });
        var getCampaignData = function (argument) {
          return {
            campaignUnits:[{
              company:{
                _id:companyDataList[0].model._id,
                name:companyDataList[0].model.info.official_name,
                logo:companyDataList[0].model.info.logo
              },
              member: argument.users ?argument.users :users,
              start_confirm: true
            }],
            campaign_type: 1,
            start_confirm: true,
            poster: {
              cid: companyDataList[0].model._id,                       //活动发起者所属的公司
              cname: companyDataList[0].model.info.official_name,
              role: 'HR'
            },
            statusType:argument.statusType,
            member_max:argument.member_max
          }
        }
        async.parallel([
          //未开始
          function(cb){
            createCampaign(getCampaignData({statusType: 1}), cb);
          },
          //正在进行
          function(cb){
            createCampaign(getCampaignData({statusType: 2}), cb);
          },
          //已经结束
          function(cb){
            createCampaign(getCampaignData({statusType: 3}), cb);
          },
          //已经关闭
          function(cb){
            createCampaign(getCampaignData({statusType: 4}), cb);
          },
          //上限为1
          function(cb){
            createCampaign(getCampaignData({statusType: 1,member_max: 1,users:[{
            _id: companyDataList[0].users[1]._id,
            nickname: companyDataList[0].users[1].nickname,
            photo: companyDataList[0].users[1].photo
          }]}), cb);
          },
        ],
        // optional cb
        function(err, results){
          companyDataList[0].campaigns = results;
          parallelCallback(err, 'companyCampaign');
        });
      },
      //创建小队活动
      teamCampaign: function(parallelCallback){
        if(!companyDataList[0].teams ||companyDataList[0].teams.length==0){
          parallelCallback('noTeam', 'teamCampaignCampaign');
        }
        else {
          var users = [];
          // companyDataList[0].teams[0].users.forEach(function(user){
            users.push({
              _id: companyDataList[0].teams[0].users[0]._id,
              nickname: companyDataList[0].teams[0].users[0].nickname,
              photo: companyDataList[0].teams[0].users[0].photo
            });
          // });
          var hrPoster = {
            cid: companyDataList[0].model._id,                       //活动发起者所属的公司
            cname: companyDataList[0].model.info.official_name,
            role: 'HR'
          }
          var leaderPoster = {
            cid: companyDataList[0].model._id,                       //活动发起者所属的公司
            cname: companyDataList[0].model.info.official_name,
            uid: companyDataList[0].teams[0].leaders[0]._id,
            nickname: companyDataList[0].teams[0].leaders[0].nickname,
            role: 'LEADER'
          }
          var getCampaignData = function (argument) {
            return {
              campaignUnits:[{
                company:{
                  _id:companyDataList[0].model._id,
                  name:companyDataList[0].model.info.official_name,
                  logo:companyDataList[0].model.info.logo
                },
                team:{
                  _id:companyDataList[0].teams[0].model._id,
                  name:companyDataList[0].teams[0].model.name,
                  logo:companyDataList[0].teams[0].model.logo
                },
                member:users,
                start_confirm: true
              }],
              campaign_type: 2,
              start_confirm: true,
              poster: argument.poster=='hr' ? hrPoster : leaderPoster,
              campaign_mold: companyDataList[0].teams[0].model.group_type,
              statusType:argument.statusType
            }
          }
          async.parallel([
            //hr发布
              //未开始
              function(cb){
                createCampaign(getCampaignData({poster:'hr',statusType: 1}), cb);
              },
              //正在进行
              function(cb){
                createCampaign(getCampaignData({poster:'hr',statusType: 2}), cb);
              },
              //已经结束
              function(cb){
                createCampaign(getCampaignData({poster:'hr',statusType: 3}), cb);
              },
              //已经关闭
              function(cb){
                createCampaign(getCampaignData({poster:'hr',statusType: 4}), cb);
              },
            //队长发布
              //未开始
              function(cb){
                createCampaign(getCampaignData({poster:'leader',statusType: 1}), cb);
              },
              //正在进行
              function(cb){
                createCampaign(getCampaignData({poster:'leader',statusType: 2}), cb);
              },
              //已经结束
              function(cb){
                createCampaign(getCampaignData({poster:'leader',statusType: 3}), cb);
              },
              //已经关闭
              function(cb){
                createCampaign(getCampaignData({poster:'leader',statusType: 4}), cb);
              }
          ],
          // optional parallelCallback
          function(err, results){
            companyDataList[0].teams[0].campaigns = results;
            parallelCallback(err, 'teamCampaignCampaign');
          });
        }
        
      },
      //创建小队间挑战
      teamProvoke: function(parallelCallback){
        if(!companyDataList[0].teams ||companyDataList[0].teams.length<2){
          parallelCallback('noTeam', 'teamProvoke');
        }
        else {
          var teamOneUsers = [];
          teamOneUsers.push({
            _id: companyDataList[0].teams[1].leaders[0]._id,
            nickname: companyDataList[0].teams[1].leaders[0].nickname,
            photo: companyDataList[0].teams[1].leaders[0].photo
          });
          // companyDataList[0].teams[0].users.forEach(function(user){
            // teamOneUsers.push({
            //   _id: companyDataList[0].teams[0].users[0]._id,
            //   nickname: companyDataList[0].teams[0].users[0].nickname,
            //   photo: companyDataList[0].teams[0].users[0].photo
            // });
          // });
          var teamTwoUsers = [];
          // companyDataList[0].teams[1].users.forEach(function(user){
            // teamTwoUsers.push({
            //   _id: companyDataList[0].teams[1].users[0]._id,
            //   nickname: companyDataList[0].teams[1].users[0].nickname,
            //   photo: companyDataList[0].teams[1].users[0].photo
            // });
          // });
          var getCampaignData = function (argument) {
            return {
              campaignUnits:[{
                company:{
                  _id:companyDataList[0].model._id,
                  name:companyDataList[0].model.info.official_name,
                  logo:companyDataList[0].model.info.logo
                },
                team:{
                  _id:companyDataList[0].teams[0].model._id,
                  name:companyDataList[0].teams[0].model.name,
                  logo:companyDataList[0].teams[0].model.logo
                },
                member:teamOneUsers,
                start_confirm: argument.start_confirm ? argument.start_confirm[0] : true
              },{
                company:{
                  _id:companyDataList[0].model._id,
                  name:companyDataList[0].model.info.official_name,
                  logo:companyDataList[0].model.info.logo
                },
                team:{
                  _id:companyDataList[0].teams[1].model._id,
                  name:companyDataList[0].teams[1].model.name,
                  logo:companyDataList[0].teams[1].model.logo
                },
                member:teamTwoUsers,
                start_confirm:  argument.start_confirm ? argument.start_confirm[1] : true
              }],
              campaign_type: 4,
              confirm_status: argument.start_confirm ? (argument.start_confirm[0] && argument.start_confirm[1]) : true,
              poster: {
                cid: companyDataList[0].model._id,                       //活动发起者所属的公司
                cname: companyDataList[0].model.info.official_name,
                uid: companyDataList[0].teams[1].leaders[0]._id,
                nickname: companyDataList[0].teams[1].leaders[0].nickname,
                role: 'LEADER'
              },
              campaign_mold: companyDataList[0].teams[0].model.group_type,
              statusType:argument.statusType
            }
          }
          async.parallel([
            //未开始
            function(cb){
              createCampaign(getCampaignData({statusType: 1}), cb);
            },
            //正在进行
            function(cb){
              createCampaign(getCampaignData({statusType: 2}), cb);
            },
            //已经结束
            function(cb){
              createCampaign(getCampaignData({statusType: 3}), cb);
            },
            //已经关闭
            function(cb){
              createCampaign(getCampaignData({statusType: 4}), cb);
            },
            //取消应战
            function(cb){
              createCampaign(getCampaignData({statusType: 4, start_confirm: [false,false]}), cb);
            },
            //拒绝应战
            function(cb){
              createCampaign(getCampaignData({statusType: 4, start_confirm: [true,false]}), cb);
            },
            //未应战
            function(cb){
              createCampaign(getCampaignData({statusType: 1, start_confirm: [true,false]}), cb);
            },
            //未应战
            function(cb){
              createCampaign(getCampaignData({statusType: 1, start_confirm: [true,false]}), cb);
            },
            //未应战
            function(cb){
              createCampaign(getCampaignData({statusType: 1, start_confirm: [true,false]}), cb);
            }
          ],
          // optional callback
          function(err, results){
            companyDataList[0].teams[1].campaigns = results;
            parallelCallback(err, 'teamProvoke');
          });
        }
      }
    },
    function(err, results) {
      callback(err,companyDataList[0])
    });
  }
  //跨公司挑战
  else {
    var campaign_mold = companyDataList[0].teams[0].model.group_type;
    var poster = {
      cid: companyDataList[0].model._id,                       //活动发起者所属的公司
      cname: companyDataList[0].model.info.official_name,
      uid: companyDataList[0].teams[0].leaders[0]._id,
      nickname: companyDataList[0].teams[0].leaders[0].nickname,
      role: 'LEADER'
    }
    var teamOneUsers = [];
    // companyDataList[0].teams[0].users.forEach(function(user){
      teamOneUsers.push({
        _id: companyDataList[0].teams[0].users[0]._id,
        nickname: companyDataList[0].teams[0].users[0].nickname,
        photo: companyDataList[0].teams[0].users[0].photo
      });
    // });
    var teamTwoUsers = [];
    // companyDataList[1].teams[0].users.forEach(function(user){
      // teamTwoUsers.push({
      //   _id: companyDataList[1].teams[0].users[0]._id,
      //   nickname: companyDataList[1].teams[0].users[0].nickname,
      //   photo: companyDataList[1].teams[0].users[0].photo
      // });
    // });
    var getCampaignData = function (argument) {
      return {
        campaignUnits:[{
          company:{
            _id:companyDataList[0].model._id,
            name:companyDataList[0].model.info.official_name,
            logo:companyDataList[0].model.info.logo
          },
          team:{
            _id:companyDataList[0].teams[0].model._id,
            name:companyDataList[0].teams[0].model.name,
            logo:companyDataList[0].teams[0].model.logo
          },
          member:argument.start_confirm ? [] : teamOneUsers,
          start_confirm: argument.start_confirm ? argument.start_confirm[0] : true
        },{
          company:{
            _id:companyDataList[1].model._id,
            name:companyDataList[1].model.info.official_name,
            logo:companyDataList[1].model.info.logo
          },
          team:{
            _id:companyDataList[1].teams[0].model._id,
            name:companyDataList[1].teams[0].model.name,
            logo:companyDataList[1].teams[0].model.logo
          },
          member:teamTwoUsers,
          start_confirm:  argument.start_confirm ? argument.start_confirm[1] : true
        }],
        campaign_type: 5,
        start_confirm: argument.start_confirm ? argument.start_confirm[0] && argument.start_confirm[1] : true,
        poster: {
          cid: companyDataList[0].model._id,                       //活动发起者所属的公司
          cname: companyDataList[0].model.info.official_name,
          uid: companyDataList[0].teams[0].leaders[0]._id,
          nickname: companyDataList[0].teams[0].leaders[0].nickname,
          role: 'LEADER'
        },
        campaign_mold: companyDataList[0].teams[0].model.group_type,
        statusType:argument.statusType
      }
    }
    async.parallel([
      //未开始
      function(cb){
        createCampaign(getCampaignData({statusType: 1}), cb);
      },
      //正在进行
      function(cb){
        createCampaign(getCampaignData({statusType: 2}), cb);
      },
      //已经结束
      function(cb){
        createCampaign(getCampaignData({statusType: 3}), cb);
      },
      //已经关闭
      function(cb){
        createCampaign(getCampaignData({statusType: 4}), cb);
      },
      //取消应战
      function(cb){
        createCampaign(getCampaignData({statusType: 4, start_confirm: [false,false]}), cb);
      },
      //拒绝应战
      function(cb){
        createCampaign(getCampaignData({statusType: 4, start_confirm: [true,false]}), cb);
      },
      //未应战
      function(cb){
        createCampaign(getCampaignData({statusType: 1, start_confirm: [true,false]}), cb);
      },
      //未应战
      function(cb){
        createCampaign(getCampaignData({statusType: 1, start_confirm: [true,false]}), cb);
      },
      //未应战
      function(cb){
        createCampaign(getCampaignData({statusType: 1, start_confirm: [true,false]}), cb);
      }
    ],
    // optional callback
    function(err, results){
      companyDataList[0].teams[0].campaigns = companyDataList[0].teams[0].campaigns.concat(results);
      callback(err, companyDataList);
    });
  }

}

module.exports = createCampaigns;