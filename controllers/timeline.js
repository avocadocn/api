'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign');
var tools = require('../tools/tools');

module.exports = function (app) {

  return {

    getTimelineRecord: function (req, res) {
      // todo 权限判断
      var cacheName,finishLimit='';
      var options ={
        'active':true
      };
      if(req.params.requestType=='team'){
        cacheName ='TeamPageCampaignDateRecord';
        options.tid = { $in: [mongoose.Types.ObjectId(req.params.requestId)] }
      }
      else if(req.params.requestType=='user'){
        cacheName ='UserPageCampaignDateRecord';
        options['campaign_unit.member._id'] = mongoose.Types.ObjectId(req.params.requestId);
        if(!req.query.unfinishFlag){
          options.finish=true;
          finishLimit ='1';
        }
      }
      else if(req.params.requestType=='company'){
        cacheName ='CompanyPageCampaignDateRecord';
        options['cid'] = mongoose.Types.ObjectId(req.params.requestId);
        if(!req.query.unfinishFlag){
          options.finish=true;
          finishLimit ='1';
        }
      }
      //cache.createCache(cacheName);
      //var dateRecord = cache.get(cacheName, req.params.requestId+finishLimit);
      var dateRecord = false;
      if (dateRecord) {
        res.send({ result: 1, dateRecord: dateRecord });
      } else {
        // 查找分页数据
        // todo 可能会有垃圾数据影响分组，需要清除
        Campaign
          .aggregate()
          .match(options)
          .group({
            _id: {
              year: { $year: '$start_time' },
              month: { $month: '$start_time' }
            }
          })
          .sort('-_id.year -_id.month')
          .exec()
          .then(function (results) {
            var dateRecord = [];
            results.forEach(function (result) {
              var found = false;
              var i;
              for (i = 0; i < dateRecord.length; i++) {
                if (dateRecord[i].year === result._id.year) {
                  found = true;
                  break;
                }
              }
              if (found) {
                dateRecord[i].month.push({
                  month:result._id.month
                });
              } else {
                dateRecord.push({
                  year: result._id.year,
                  month: [{
                    month:result._id.month
                  }]
                });
              }
            });
            // cache.set(cacheName, req.params.hostId, dateRecord);
            return res.status(200).send(dateRecord);
          })
          .then(null, function (err) {
            console.log(err);
            res.status(200).send({msg: '获取有活动的年月列表失败' });
          });
      }
    },
    getTimelineData: function(req, res){
      // todo 权限判断

      var now = new Date();
      var year = req.query.year || now.getFullYear();
      var month = req.query.month || now.getMonth();

      var thisMonth = new Date(year, month - 1);
      var nextMonth = new Date(year, month);
      var options ={
        start_time: { $gte: thisMonth, $lt: nextMonth },
        'active':true,
        'confirm_status': { '$ne': false } // 旧数据没有此属性，新数据默认为true
      };
      if(req.params.requestType=='team'){
        options.tid = mongoose.Types.ObjectId(req.params.requestId);
      }
      else if(req.params.requestType=='user'){
        options['campaign_unit.member._id'] = mongoose.Types.ObjectId(req.params.requestId);
      }
      else if(req.params.requestType=='company'){
        options['cid'] = mongoose.Types.ObjectId(req.params.requestId);
      }
      Campaign
        .find(options)
        .populate('photo_album')
        .sort('-start_time')
        .exec()
        .then(function (campaigns) {
          var timeLine = {
            year:year,
            month:month,
            campaigns:[]
          };
          campaigns.forEach(function(campaign) {
            var _head,_logo,_name;
            var ct = campaign.campaign_type;
            var unitInfos = [];
            //公司活动
            if(ct===1){
              // _head = '公司活动';
              _logo = campaign.campaign_unit[0].company.logo;
              _name = campaign.campaign_unit[0].company.name
            }
            //多队
            else if(ct!==6&&ct!==2){
              // _head = campaign.team[0].name +'对' + campaign.team[1].name +'的比赛';
              for(var i = 0;i<campaign.campaign_unit.length;i++){
                var index = tools.arrayObjectIndexOf(campaign.campaign_unit[i].member,req.params.requestId,'_id');
                if(index>-1){
                  _logo = campaign.campaign_unit[i].team.logo;
                  _name = campaign.campaign_unit[i].team.name;
                  break;
                }
                unitInfos.push({
                  name: campaign.campaign_unit[i].team.name,
                  logo: campaign.campaign_unit[i].team.logo
                });
              }
              // _logo = tools.arrayObjectIndexOf(campaign.camp[0].member,uid,'uid')>-1 ?campaign.camp[0].logo :campaign.camp[1].logo;
            }
            //单队
            else {
              // _head = campaign.compaign_unit.team.name + '活动';
              _logo = campaign.campaign_unit[0].team.logo;
              _name = campaign.campaign_unit[0].team.name;
            }
            var _endTime = new Date(campaign.end_time);
            var _groupYear = _endTime.getFullYear();
            var _groupMonth = _endTime.getMonth()+1;
            var memberIds = [];
            campaign.members.forEach(function (member) {
              memberIds.push(member._id);
            });

            var isJoin = false;
            if (req.user && req.user.provider === 'user') {
              isJoin = !!campaign.whichUnit(req.user._id);
            }

            var tempObj = {
              id: campaign._id,
              //head: _head,//???
              head:campaign.theme,
              logo:_logo,
              name:_name,
              content: campaign.content,
              location: campaign.location,
              group_type: campaign.group_type,
              start_time: campaign.start_time,
              provoke:ct===4||ct===5||ct===7||ct===9,
              year: _groupYear,
              month:_groupMonth,
              comment_sum:campaign.comment_sum,
              isJoin: isJoin,
              isStart: campaign.start_time < Date.now(),
              isEnd: campaign.end_time < Date.now(),
              unitInfos: unitInfos,
              // photo_list: photo_album_controller.photoThumbnailList(campaign.photo_album,4)
            }
            tempObj.components = campaign.formatComponents();
            // var allow = auth(req.user, {
            //   companies: campaign.cid,
            //   teams: campaign.tid,
            //   users: memberIds
            // }, [
            //   'publishComment'
            // ]);
            // tempObj.allow = allow;

            timeLine.campaigns.push(tempObj);
          });
          return res.status(200).send(timeLine);
        })
        .then(null, function (err) {
          console.log(err);
          res.status(400).send({ msg: '获取活动失败' });
        });
    }

  };

};