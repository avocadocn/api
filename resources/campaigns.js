'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign');
var tools = require('../tools/tools');

/**
 * 根据路由的campaignId获取活动
 * @param req
 * @param res
 * @param next
 */
exports.getCampaignByParamId = function (req, res, next) {

  // 取活动详细数据时基本都会需要相册的最近照片，所以将默认值设为需要相册，可简化请求
  // 现在可以populate只有photo_album
  var populate = 'photo_album';
  if (req.query.populate === 'no') {
    populate = '';
  }
  if(!mongoose.Types.ObjectId.isValid(req.params.campaignId)){
    return res.status(404).send({ msg: '找不到该活动' });
  };
  Campaign.findById(req.params.campaignId)
    .populate(populate)
    .exec()
    .then(function (campaign) {
      if (!campaign) {
        return res.status(404).send({ msg: '找不到该活动' });
      } else {
        req.campaign = campaign;
        req.srcOwner = {
          companies: campaign.cid,
          teams: campaign.tid,
          users: tools.flatCollect(campaign.members, '_id')
        };
        next();
      }
    })
    .then(null, function (err) {
      next(err);
    });
};