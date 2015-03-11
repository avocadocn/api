'use strict';

var path = require('path'),
  fs = require('fs');
var multiparty = require('multiparty');
var mongoose = require('mongoose');
var CircleContent = mongoose.model('CircleContent'),
  CircleComment = mongoose.model('CircleComment'),
  User = mongoose.model('User'),
  Campaign = mongoose.model('Campaign'),
  async = require('async');
var auth = require('../services/auth.js'),
  log = require('../services/error_log.js'),
  socketClient = require('../services/socketClient'),
  uploader = require('../services/uploader.js'),
  tools = require('../tools/tools.js');



module.exports = function(app) {
  return {
    /**
     * [getFormData description]
     * To parse the form data from the fore-end
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    getFormData: function(req, res, next) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }

      var fieldName = 'photo';
      var form = new multiparty.Form({
        uploadDir: uploader.tempDir
      });
      
      form.parse(req, function(err, fields, files) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }
        
        // Send error(400) when don't have content and images
        if ((fields['content'] == undefined || !fields['content'][0]) && !files[fieldName]) {
          return res.sendStatus(400);
        }
        
        // req.tid = (fields['tid'] && fields['tid'][0]) ? fields['tid'][0] : [];
        req.campaign_id = (fields['campaign_id'] && fields['campaign_id'][0]) ? fields['campaign_id'][0] : null;
        req.content = (fields['content'] && fields['content'][0]) ? fields['content'][0] : null;

        // send error(400) when campain_id is null
        if (!req.campaign_id) {
          return res.status(400).send({
            msg: '参数错误'
          });
        }

        // Judge authority
        Campaign.findById(req.campaign_id).exec()
          .then(function(campaign) {
            if (!campaign) {
              return res.status(400).send({
                msg: '无此活动'
              });
            }
            var role = auth.getRole(req.user, {
              companies: campaign.cid,
              teams: campaign.tid,
              users: campaign.relativeMemberIds
            });
            var taskName = campaign.campaign_type == 1 ? 'publishCompanyCircle' : 'publishTeamCircle';
            var allow = auth.auth(role, [taskName]);
            if (!allow[taskName]) {
              return res.status(403).send({
                msg: '您没有权限发同事圈'
              });
            }
            // set req.tid
            req.tid = campaign.campaign_type == 1 ? [] : campaign.tid;
            req.relative_cids = campaign.cid;

            if (files[fieldName]) {
              req.imgFiles = files[fieldName];
            }
            next();

          })
          .then(null, function(err) {
            log(err);
            return res.sendStatus(500);
          })


      });
    },
    /**
     * Upload images for the circle content
     * Images upload path: /public/img/circle/{YYYY-MM}/{cid}/{DateTime.jpg}
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    uploadPhotoForContent: function(req, res, next) {
      if (!req.imgFiles) {
        // 不传照片的话直接到下一步
        next();
        return ;
      }

      var files = req.imgFiles;
      async.map(files, function(file, callback) {
        uploader.uploadImage(file, {
          targetDir: '/public/img/circle',
          subDir: req.user.getCid().toString(),
          saveOrigin: true,
          getSize: true,
          success: function(imgInfo, oriCallback) {
            callback(null, imgInfo);
          },
          error: function(err) {
            log(err);
            return res.status(500).send({ msg: '服务器错误' });
          }
        });

      }, function(err, results) {
        if (err) {
          log(err);
        }
        req.imgInfos = results;
        next();
      });

    },
    /**
     * Create circle content
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createCircleContent: function(req, res) {
      var photos = [];
      if (req.imgInfos) {
        req.imgInfos.forEach(function(imgInfo) {
          var photo = {
            uri: imgInfo.url,
            width: imgInfo.size.width,
            height: imgInfo.size.height
          };
          photos.push(photo);
        });
      }

      var circleContent = new CircleContent({
        cid: req.user.getCid(), // 所属公司id

        tid: req.tid, // 关联的小队id(可选，不是必要的)

        campaign_id: req.campaign_id, // 关联的活动id(可选，不是必要的)

        content: req.content, // 文本内容(content和photos至少要有一个)

        photos: photos, // 照片列表
        
        post_user_id: req.user._id, // 发消息的用户的id（头像和昵称再次查询）
        
        relative_cids: req.relative_cids // 参加同事圈消息所属的活动的所有公司id
      });
      
      circleContent.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            // 'msg': '同事圈消息发送成功',
            'circleContent': circleContent // this field is used for test 
          });
        }
      });
    },
    /**
     * get the circle contents for user
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return [
     *           {
     *             content: {
     *               cid // 所属公司id
     *               tid: [Schema.Types.ObjectId], // 关联的小队id(可选，不是必要的)
     *               campaign_id: Schema.Types.ObjectId, // 关联的活动id(可选，不是必要的)
     *               content: String, // 文本内容(content和photos至少要有一个)
     *               photos: [], // 照片列表
     *               post_user_id: Schema.Types.ObjectId, // 发消息的用户的id（头像和昵称再次查询）
     *               post_date: type: Date,
     *               status: type: String,
     *               comment_users: [Schema.Types.ObjectId] // 参与过评论的用户id
     *             }
     *             photo: String// 发消息的用户头像
     *             comments: [
     *               ...Reference: Schema CircleComment
     *             ]
     *           }
     *           ....
     *         ]
     */
    getCompanyCircle: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }
      if (req.query.last_content_date && req.query.latest_content_date) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }
      var conditions = {
        'cid': req.user.cid,
        'status': 'show'
      };
      var options = {};
      if (req.query.last_content_date) { //如果带此属性来，则查找比它更早的limit条
        conditions.post_date = {
          '$lt': req.query.last_content_date
        };
      }

      if (req.query.latest_content_date) { //如果带此属性来，则查找比它新的消息
        conditions.post_date = {
          '$gt': req.query.latest_content_date
        };
      } else {
        options.limit = req.query.limit || 20;
      }

      CircleContent.find(conditions, null, options)
        .sort('-post_date')
        .exec()
        .then(function(contents) {
          if (!contents[0]) {
            return res.status(404).send({
              msg: '未找到同事圈消息'
            });
          } else {
            async.map(contents, function(content, callback) {
                var result = {};
                async.parallel([
                  function(callback) {
                    User.findById(content.post_user_id, 'photo', function(err, user) {
                      if (err) {
                        log(err);
                        callback(err);
                      }
                      callback(null, user)
                    });
                  },
                  function(callback) {
                    CircleComment.find({
                      target_content_id: content._id,
                      status: 'show'
                    }).sort('-post_date').exec().then(function(comments) {
                      callback(null, comments);
                    }).then(null, function(err) {
                      log(err);
                      callback(err);
                    });
                  }
                ], function(err, results) {
                  result.content = content;
                  result.photo = results[0].photo;
                  result.comments = results[1];
                  callback(null, result);
                });
              },
              function(err, results) {
                return res.status(200).send(results);
              });
          }
        })
        .then(null, function(err) {
          log(err);
          return res.sendStatus(500);
        });
    },
    /**
     * get the campaign circle for user
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return (Reference getCampaignCircle)
     */
    getCampaignCircle: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }

      var conditions = {
        'campaign_id': req.params.campaignId,
        'relative_cids': req.user.getCid(), // 该活动必须属于该用户所属公司
        'status': 'show'
      };
      
      CircleContent.find(conditions)
        .sort('-post_date')
        .exec()
        .then(function(contents) {
          if (!contents[0]) {
            return res.status(404).send({
              msg: '未找到该活动同事圈消息'
            });
          } else {
            async.map(contents, function(content, callback) {
                var result = {};
                async.parallel([
                  function(callback) {
                    User.findById(content.post_user_id, 'photo', function(err, user) {
                      if (err) {
                        log(err);
                        callback(err);
                      }
                      callback(null, user)
                    });
                  },
                  function(callback) {
                    CircleComment.find({
                      target_content_id: content._id,
                      status: 'show'
                    }).sort('-post_date').exec().then(function(comments) {
                      callback(null, comments);
                    }).then(null, function(err) {
                      log(err);
                      callback(err);
                    });
                  }
                ], function(err, results) {
                  result.content = content;
                  result.photo = results[0].photo;
                  result.comments = results[1];
                  callback(null, result);
                });
              },
              function(err, results) {
                return res.status(200).send(results);
              });
          }
        })
        .then(null, function(err) {
          log(err);
          return res.sendStatus(500);
        });
    },
    /**
     * get the team circle for user
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return (Reference getCampaignCircle)
     */
    getTeamCircle: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }
      // TODO: think conditions twice and set date conditions
      var conditions = {
        'tid': req.params.teamId,
        'status': 'show'
      };
      
      CircleContent.find(conditions)
        .sort('-post_date')
        .exec()
        .then(function(contents) {
          if (!contents[0]) {
            return res.status(404).send({
              msg: '未找到该小队同事圈消息'
            });
          } else {
            async.map(contents, function(content, callback) {
                var result = {};
                async.parallel([
                  function(callback) {
                    User.findById(content.post_user_id, 'photo', function(err, user) {
                      if (err) {
                        log(err);
                        callback(err);
                      }
                      callback(null, user)
                    });
                  },
                  function(callback) {
                    CircleComment.find({
                      target_content_id: content._id,
                      status: 'show'
                    }).sort('-post_date').exec().then(function(comments) {
                      callback(null, comments);
                    }).then(null, function(err) {
                      log(err);
                      callback(err);
                    });
                  }
                ], function(err, results) {
                  result.content = content;
                  result.photo = results[0].photo;
                  result.comments = results[1];
                  callback(null, result);
                });
              },
              function(err, results) {
                return res.status(200).send(results);
              });
          }
        })
        .then(null, function(err) {
          log(err);
          return res.sendStatus(500);
        });
    },
    /**
     * Get the circle-contents by id for further use.
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    getCircleContentById: function(req, res, next) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }

      CircleContent.findOne({
          _id: req.params.contentId,
          status: 'show'
        }).exec()
        .then(function(circleContent) {
          if (!circleContent) {
            return res.status(404).send({
              msg: '未找到同事圈消息'
            });
          } else {
            req.circleContent = circleContent;
            next();
          }
        })
        .then(null, function(err) {
          return res.sendStatus(500);
        });
    },
    /**
     * Delete the circle-contents
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    deleteCircleContent: function(req, res) {
      // Judge authority
      var users = [];
      users.push(req.circleContent.post_user_id);
      var role = auth.getRole(req.user, {
        users: users
      });
      var allow = auth.auth(role, ['deleteCircleContent']);
      if (!allow.deleteCircleContent) {
        return res.status(403).send({
          msg: '权限错误'
        });
      }

      CircleContent.findByIdAndUpdate(req.params.contentId, {
        status: 'delete'
      }, function(err, contents) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '同事圈消息删除成功'
          });

          CircleComment.update({
            target_content_id: req.params.contentId,
            status: 'show'
          }, {
            $set: {
              status: 'content_delete'
            }
          }, {
            multi: true
          }, function(err) {
            if (err) {
              log(err);
              return res.sendStatus(500);
            }
          });
        }
      });
    },
    /**
     * Create circle comment
     * @param req {
     *          "kind": "string", (required)
     *          "content": "string",
     *          "is_only_to_content": true, (required)
     *          "target_user_id": "string"
     * }
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createCircleComment: function(req, res) {
      var circleContent = req.circleContent;

      // Judge authority
      var role = auth.getRole(req.user, {
        companies: circleContent.relative_cids
      });
      var allow = auth.auth(role, ['createCircleComment']);
      if (!allow.createCircleComment) {
        return res.status(403).send({
          msg: '权限错误'
        });
      }
      /** 
       * parameters limit:
       * 1. is_only_to_content is not null(or undefined) and must be true or false(see definition)
       * 2. kind must be 'comment' or 'appreciate'
       * 3. content is null(or undefined) when kind is 'appreciate'
       * 4. content is not null(or undefined) when kind is 'comment'
       * 5. target_user_id is null(or undefined) when is_only_to_content is true
       * 6. target_user_id is not null(or undefined) when is_only_to_content is false
       */
      if (!req.body.is_only_to_content || (req.body.kind != 'comment' && req.body.kind != 'appreciate') || (req.body.content && req.body.kind == 'appreciate') || (!req.body.content && req.body.kind == 'comment') || (req.body.is_only_to_content == true && req.body.target_user_id) ||
        (req.body.is_only_to_content == false && !req.body.target_user_id))
        return res.status(400).send({
          msg: '参数错误'
        });

      if (req.body.kind == 'appreciate') {
        var isAppreciate = false;
        circleContent.comment_users.forEach(function(user) {
          if (req.user._id.toString() == user._id.toString() && user.appreciated == true) {
            isAppreciate = true;
          }
        });
        if (isAppreciate) {
          return res.status(403).send({
            msg: '已点赞'
          });
        }
      }

      var circleComment = new CircleComment({
        kind: req.body.kind, // 类型，评论或赞

        content: req.body.content,

        is_only_to_content: req.body.is_only_to_content, // 是否仅仅是回复消息，而不是对用户

        target_content_id: req.params.contentId, // # 评论目标消息的id

        // 评论目标用户的id(直接回复消息则保存消息发布者的id)
        target_user_id: !req.body.target_user_id ? circleContent.post_user_id : req.body.target_user_id,

        post_user_cid: req.user.cid, // 发评论或赞的用户的公司id

        post_user_id: req.user._id, // 发评论或赞的用户的id（头像和昵称再次查询)

      });

      circleComment.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            // msg: '评论或点赞成功',
            'circleComment': circleComment // the field is used for test
          });

          var comment_users = []; // the commenter (exclude the owner of content)

          var new_comment_user = {
            _id: req.user._id,
            comment_num: 1,
            appreciated: false
          };
          if (req.body.kind == 'appreciate') {
            new_comment_user.appreciated = true;
          }
          circleContent.comment_users.forEach(function(user) {
            if (user._id.toString() == req.user._id.toString()) {
              new_comment_user.comment_num = user.comment_num + 1;
            } else {
              comment_users.push(user);
            }
          });
          comment_users.push(new_comment_user);

          var options = {
            'comment_users': comment_users,
            'latest_comment_date': circleComment.post_date
          };

          // Update the feild comment_users of CircleContent Schema
          CircleContent.findOneAndUpdate({
            _id: req.params.contentId,
            status: 'show'
          }, options, function(err) {
            if (err) {
              log(err);
            }
          });
        }
      });
    },
    /**
     * Delete circle comment
     *
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    deleteCircleComment: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无朋友圈功能'
        });
      }

      CircleComment.findById(req.params.commentId, function(err, comment) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }
        if (!comment) {
          return res.status(404).send({
            msg: '无法找到评论'
          });
        }
        // Judge authority
        var users = [];
        users.push(comment.post_user_id);
        var role = auth.getRole(req.user, {
          users: users
        });
        var allow = auth.auth(role, ['deleteCircleComment']);
        if (!allow.deleteCircleComment) {
          return res.status(403).send({
            msg: '权限错误'
          });
        }
        CircleComment.findByIdAndUpdate(
          req.params.commentId, {
            status: 'delete'
          },
          function(err, comment) {
            if (err) {
              log(err);
              return res.sendStatus(500);
            } else {
              res.status(200).send({
                msg: '评论删除成功'
              });

              // Update comment_users of circle content
              // Reference: http://stackoverflow.com/questions/11184079/how-to-increment-mongodb-document-object-fields-inside-an-arra
              var options = {
                $inc: {
                  'comment_users.$.comment_num': -1
                }
              };
              if (comment.kind == 'appreciate') {
                options.$set = {
                  'comment_users.$.appreciated': false
                }
              }
              CircleContent.update({
                  _id: comment.target_content_id,
                  'comment_users._id': req.user._id,
                  'comment_users.comment_num': {
                    $gte: 1
                  }
                }, options,
                function(err) {
                  if (err) {
                    log(err);
                  }
                });
            }
          });
      });
    },
    /**
     * 获取同事圈提醒
     * @param  {Object}
     * @return [comment]
     */
    getCircleComments: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无提醒功能'
        });
      }
      if (!req.query.latest_content_date || !req.query.last_comment_date) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }
      var conditons = {
        'cid': req.user.cid,
        'post_date': {
          '$lte': req.query.latest_content_date
        },
        'latest_comment_date': {
          '$gt': req.query.last_comment_date
        }
      };
      CircleContent.find(conditons, 'content photos')
        .exec()
        .then(function(contents) {
          if (!contents) {
            res.status(404).send({
              msg: '无新评论或赞'
            });
          }
          var content_ids = [];
          contents.forEach(function(content) {
            content_ids.push(content._id);
          });
          CircleComment.find({
              'post_user_cid': req.user.cid,
              'target_content_id': {
                $in: content_ids
              },
              'post_date': {
                '$gt': req.query.last_comment_date
              }
            })
            .sort('-post_date')
            .exec()
            .then(function(comments) {
              async.map(comments, function(comment, callback) {
                User.find({
                  '_id': comment.post_user_id
                }, 'nickname photo', function(err, user) {
                  var circleContentIndex = tools.arrayObjectIndexOf(contents, comment.target_content_id, '_id');
                  var circle_comment = {
                    '_id': comment._id,
                    'kind': comment.kind,
                    'content': comment.content,
                    'targetContent': contents[circleContentIndex], //{_id,conent,photos}
                    'targetUserId': comment.target_user_id,
                    'poster': user, //{_id, nickname,photo}
                    'postDate': comment.post_date
                  };
                  callback(null, circle_comment);
                });
              }, function(err, results) {
                if (err) {
                  log(err);
                  return res.sendStatus(500);
                } else {
                  console.log(results);
                  res.status(200).send(results);
                }
              })
            })
            .then(null, function(err) {
              log(err);
              return res.sendStatus(500);
            });
        })
        .then(null, function(err) {
          log(err);
          return res.sendStatus(500);
        })
    },
    // getCircleComments: function(req, res) {
    //   if (req.user.provider === 'company') {
    //     return res.status(403).send({
    //       msg: '公司账号暂无提醒功能'
    //     });
    //   }
    //   var options = {
    //     'post_user_cid': req.user.cid,
    //     'relative_user': {'_id':req.user._id,'list_status':'show'}
    //   };
    //   if (req.query.last_comment_date) { //如果带此属性来，则查找比它更早的limit条
    //     options.post_date = {
    //       '$lt': req.query.last_comment_date
    //     };
    //   }
    //   var limit = req.query.limit || 20;
    //   //先查出所有的评论
    //   CircleComment.find(options)
    //     .sort('-post_date')
    //     .limit(limit)
    //     .exec()
    //     .then(function(comments) {
    //       //再聚合所有的post_user、target_content_id
    //       var uids = [];
    //       var targetIds = [];
    //       var comments_length = comments.length;
    //       for (var i = 0; i < comments_length; i++) {
    //         uids.push(comments[i].post_user_id);
    //         targetIds.push(comments[i].target_content_id);
    //       };
    //       async.parallel({
    //         users: function(callback) { //获取所有人的昵称和头像
    //           User.find({
    //             'cid': req.user.cid,
    //             '_id': {
    //               '$in': uids
    //             }
    //           }, {
    //             'nickname': 1,
    //             'photo': 1
    //           }, function(err, users) {
    //             if (err) callback(err);
    //             else callback(null, users);
    //           })
    //         },
    //         contents: function(callback) {//获取所有的circlecontent
    //           CircleContent.find({
    //             'cid': req.user.cid,
    //             '_id': {
    //               '$in': targetIds
    //             },
    //             'status': 'show'
    //           }, {
    //             'content': 1,
    //             'photos': 1
    //           }, function(err, contents) {
    //             if (err) callback(err);
    //             else callback(null, contents);
    //           })
    //         }
    //       }, function(err, results) {
    //         if (err) {
    //           log(err);
    //           return res.status(500).send({
    //             msg: 'database err'
    //           });
    //         } else {
    //           //一个个赋值回去
    //           async.map(comments, function(comment, callback) {
    //             var posterIndex = tools.arrayObjectIndexOf(results.users, comment.post_user_id, '_id');
    //             var circleContentIndex = tools.arrayObjectIndexOf(results.contents, comment.target_content_id, '_id');
    //             var circle_comment = {
    //               '_id': comment._id,
    //               'kind': comment.kind,
    //               'content': comment.content,
    //               'targetContent': results.contents[circleContentIndex], //{_id,conent,photos}
    //               'targetUserId': comment.target_user_id,
    //               'poster': results.users[posterIndex], //{_id, nickname,photo}
    //               'postDate': comment.post_date
    //             }
    //             callback(null,circle_comment);
    //           }, function(err, circleComments) {
    //             if (err) {
    //               log(err);
    //               return res.status(500).send({
    //                 msg: 'output err'
    //               });
    //             } else {
    //               return res.status(200).send(circleComments);
    //             }
    //           });
    //         }
    //       });
    //     })
    //     .then(null, function(err) {
    //       log(err);
    //       return res.status(500).send({
    //         msg: 'circleComments not found.'
    //       })
    //     });
    // },

    /**
     * 员工用户获取是否有新评论、新朋友圈内容&消息(包括最新消息人的头像)
     * @param  {Object} req:{query:{has_new:string}}
     * @return {
     *           comments:boolean, (2015/3/5 注释by M)
     *           reminds:{number:int, user:{photo:uri}},
     *           new_content:{has_new:boolean, user:{photo:uri}}
     *         }
     */
    // getReminds: function(req, res) {
    //   if (req.query.has_new !== 'true') {
    //     return res.status(422).send({msg:'参数错误'});
    //   }
    //   if (req.user.provider === 'company') {
    //     return res.status(403).send({
    //       msg: '公司账号暂无提醒功能'
    //     });
    //   }
    //   var reminds = {number: req.user.new_comment_num};
    //   if(reminds.number) {
    //     reminds.user = { photo: req.user.new_comment_user.photo };
    //   }
    //   // var comments = false;
    //   // var length = req.user.commentCampaigns.length;
    //   // for (var i = 0; i < length; i++) {
    //   //   if (req.user.commentCampaigns[i].unread > 0) {
    //   //     comments = true;
    //   //     break;
    //   //   }
    //   // }
    //   // if (!comments) {
    //   //   var length = req.user.unjoinedCommentCampaigns.length;
    //   //   for (var i = 0; i < length; i++) {
    //   //     if (req.user.unjoinedCommentCampaigns[i].unread > 0) {
    //   //       comments = true;
    //   //       break;
    //   //     }
    //   //   }
    //   // }
    //   var new_content = {has_new:req.user.has_new_content};//是否有新的同事圈内容
    //   if(new_content.has_new) {
    //     CircleContent.find({'cid':req.user.cid, 'status':'show'},{'post_user_id':1})
    //     .sort('-post_date')
    //     .limit(1)
    //     .exec()
    //     .then(function(contents){
    //       User.findOne({'_id':contents[0].post_user_id}, {'photo':1}, function (err, user) {
    //         if(err) {
    //           log(err);
    //         }else{
    //           new_content.user = {photo: user.photo};
    //         }
    //         return res.status(200).send({
    //           // comments: comments,
    //           reminds: reminds,
    //           new_content: new_content
    //         });
    //       });
    //     })
    //     .then(null, function (err) {
    //       log(err);
    //       return res.status(500).send({
    //         // comments: comments,
    //         reminds: reminds,
    //         new_content: new_content
    //       });
    //     });
    //   }else {
    //     return res.status(200).send({
    //       // comments: comments,
    //       reminds: reminds,
    //       new_content: new_content
    //     });
    //   }
    // },
    /**
     * 删除消息列表
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    // deleteRemindComment: function(req, res) {
    //   if (req.user.provider === 'company') {
    //     return res.status(403).send({
    //       msg: '公司账号暂无提醒功能'
    //     });
    //   }

    //   var options = {
    //     'relative_user._id': req.user._id,
    //     'relative_user.list_status': 'show'
    //   };

    //   if (req.query.commentId) {
    //     options._id = req.query.commentId;
    //   }
      
    //   CircleComment.update(options, {
    //     $set: {
    //       'relative_user.$.list_status': 'delete'
    //     }
    //   }, function(err, num) {
    //     if (err) {
    //       log(err);
    //       return res.sendStatus(500);
    //     }
    //     if (num) {
    //       return res.status(200).send({
    //         msg: '消息列表删除成功'
    //       });

    //     }
    //     return res.status(404).send({
    //       msg: '未找到该消息'
    //     });
    //   });
    // }
  };
};