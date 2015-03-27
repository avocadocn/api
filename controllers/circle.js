'use strict';

var path = require('path'),
  fs = require('fs');
var multiparty = require('multiparty');
var mongoose = require('mongoose');
var CircleContent = mongoose.model('CircleContent'),
  CircleComment = mongoose.model('CircleComment'),
  File = mongoose.model('File'),
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

    singleImgUploadSwitcher: function (req, res, next) {

      /**
       * 如果前端不能一次上传多张照片，则另外处理。
       * 此时使用另外的上传文件api，不在此路由上传文件，所以这里可以获取req.body。
       * 处理流程如下：
       * 1. 先发一个请求，创建CircleContent，设置其状态为等待上传，并返回id给前端
       * 2. 发请求上传图片，使用另一个api
       * 3. 图片全部传好后，再发一次创建CircleContent的请求，确认已经传好，并查询File数据，将uri等相关信息保存到CircleConten中
       *    激活CircleContent
       *
       * req.body.isUploadImgFromFileApi: Boolean // 是否先通过文件api上传完图片再创建
       * req.body.uploadStep: String // 上传步骤，可以为'create'或'active'对应上述的第1步和第3步
       */
      if (req.body && req.body.isUploadImgFromFileApi === true) {
        singleUpload(req, res, next);
      }
      else {
        next();
      }
    },

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
          //socket
          var poster = {
            _id: req.user._id,
            nickname: req.user.nickname,
            photo: req.user.photo
          };
          socketClient.pushCircleContent(circleContent.cid, poster);
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
     *               ...
     *             }
     *             comments: [
     *               ...Reference: Schema CircleComment
     *             ]
     *           }
     *           ....
     *         ]
     */
    getCompanyCircle: function(req, res, next) {
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
        .then(function(contentDocs) {
          if (contentDocs.length === 0) {
            return res.status(404).send({
              msg: '未找到同事圈消息'
            });
          } else {
            // 修正查询逻辑，减少查询次数
            // 1. 将contents的id保存到一个数组中，先将各个contents的评论一次查询出来，然后分组放到各个content中
            // 2. 将contents的post_user_id及comment的post_user_id及target_user_id不重复地保存到一个数组中，然后一次查出所有用户，然后向各个含post_user_id的对象添加用户信息
            // 仅需要查询两次数据库，相比之前方案的contents总数*3次(即很可能是60次)要好得多

            /**
             * 响应返回数据，形式为：
             *  [{
             *    content: contentDoc,
             *    comments: [commentDoc]
             *  }]
             */
            var resData = [];

            // 转换为简单对象，以解除mongoose文档的约束，便于修改属性写入响应
            var docToObject = function(doc) {
              return doc.toObject();
            };
            var contents = contentDocs.map(docToObject);

            var contentIdsForQuery = contents.map(function(content) {
              return content._id;
            });
            var userIdsForQuery = []; // 元素为String类型

            // 向用户id数组不重复地添加用户id
            var pushUserIdToUniqueArray = function(userId, array) {
              var resultIndex = array.indexOf(userId);
              if (resultIndex === -1) {
                array.push(userId.toString());
              }
            };
            contents.forEach(function(content) {
              pushUserIdToUniqueArray(content.post_user_id, userIdsForQuery);
            });

            CircleComment.find({
              target_content_id: {$in: contentIdsForQuery},
              status: 'show'
            }).sort('+post_date').exec()
            .then(function(commentDocs) {
              var comments = commentDocs.map(docToObject);

              comments.forEach(function(comment) {
                pushUserIdToUniqueArray(comment.post_user_id, userIdsForQuery);
                pushUserIdToUniqueArray(comment.target_user_id, userIdsForQuery);
              });

              User.find({
                _id: {$in: userIdsForQuery}
              }, {
                _id: 1,
                nickname: 1,
                photo: 1
              }).exec()
              .then(function(users) {

                // 向CircleContent和CircleComment对象添加发布者的详细信息
                var addPosterInfoToObj = function(obj) {
                  for (var i = 0, usersLen = users.length; i < usersLen; i++) {
                    if (users[i]._id.toString() === obj.post_user_id.toString()) {
                      obj.poster = users[i];
                      break;
                    }
                  }
                };

                var addTargetInfoToComment = function(comment) {
                  for (var i = 0, usersLen = users.length; i < usersLen; i++) {
                    if (users[i]._id.toString() === comment.target_user_id.toString()) {
                      comment.target = users[i];
                      break;
                    }
                  }
                };

                comments.forEach(function(comment) {
                  addPosterInfoToObj(comment);
                  addTargetInfoToComment(comment);
                });

                contents.forEach(function(content) {
                  addPosterInfoToObj(content);

                  // 将comments添加到对应的contents中
                  var contentComments = comments.filter(function(comment) {
                    return comment.target_content_id.toString() === content._id.toString();
                  });
                  resData.push({
                    content: content,
                    comments: contentComments
                  });
                });

                res.send(resData);

              })
              .then(null, next);

            })
            .then(null, next);

          }
        })
        .then(null, next);
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
        .then(function(contentDocs) {
          if (contentDocs.length == 0) {
            return res.status(404).send({
              msg: '未找到该活动同事圈消息'
            });
          } else {
            /**
             * 响应返回数据，形式为：
             *  [{
             *    content: contentDoc,
             *    comments: [commentDoc]
             *  }]
             */
            var resData = [];

            // 转换为简单对象，以解除mongoose文档的约束，便于修改属性写入响应
            var docToObject = function(doc) {
              return doc.toObject();
            };

            var contents = contentDocs.map(docToObject);

            var contentIdsForQuery = contents.map(function(content) {
              return content._id;
            });
            var userIdsForQuery = []; // 元素为String类型

            // 向用户id数组不重复地添加用户id
            var pushUserIdToUniqueArray = function(userId, array) {
              var resultIndex = array.indexOf(userId);
              if (resultIndex === -1) {
                array.push(userId.toString());
              }
            };
            contents.forEach(function(content) {
              pushUserIdToUniqueArray(content.post_user_id, userIdsForQuery);
            });

            CircleComment.find({
              target_content_id: {$in: contentIdsForQuery},
              status: 'show'
            }).sort('+post_date').exec()
            .then(function(commentDocs) {
              var comments = commentDocs.map(docToObject);

              comments.forEach(function(comment) {
                pushUserIdToUniqueArray(comment.post_user_id, userIdsForQuery);
                pushUserIdToUniqueArray(comment.target_user_id, userIdsForQuery);
              });

              User.find({
                _id: {$in: userIdsForQuery}
              }, {
                _id: 1,
                nickname: 1,
                photo: 1
              }).exec()
              .then(function(users) {

                // 向CircleContent和CircleComment对象添加发布者的详细信息
                var addPosterInfoToObj = function(obj) {
                  for (var i = 0, usersLen = users.length; i < usersLen; i++) {
                    if (users[i]._id.toString() === obj.post_user_id.toString()) {
                      obj.poster = users[i];
                      break;
                    }
                  }
                };

                var addTargetInfoToComment = function(comment) {
                  for (var i = 0, usersLen = users.length; i < usersLen; i++) {
                    if (users[i]._id.toString() === comment.target_user_id.toString()) {
                      comment.target = users[i];
                      break;
                    }
                  }
                };

                comments.forEach(function(comment) {
                  addPosterInfoToObj(comment);
                  addTargetInfoToComment(comment);
                });

                contents.forEach(function(content) {
                  addPosterInfoToObj(content);

                  // 将comments添加到对应的contents中
                  var contentComments = comments.filter(function(comment) {
                    return comment.target_content_id.toString() === content._id.toString();
                  });
                  resData.push({
                    content: content,
                    comments: contentComments
                  });
                });

                res.send(resData);
              })
              .then(null, function(err) {
                log(err);
                return res.sendStatus(500);
              })
            })
            .then(null, function(err) {
              log(err);
              return res.sendStatus(500);
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
      var isTeamMember = false;
      for(var i = 0; i < req.user.team.length; i++) {
        if(req.user.team[i]._id.toString() == req.params.teamId) {
          isTeamMember = true;
        }
      }
      if (!isTeamMember) {
        return res.status(403).send({
          msg: '权限错误'
        });
      }
      // TODO: think conditions twice. For example: set limit conditions; judge the team users
      var conditions = {
        'tid': req.params.teamId,
        'status': 'show'
      };

      CircleContent.find(conditions)
        .sort('-post_date')
        .exec()
        .then(function(contentDocs) {
          if (contentDocs.length == 0) {
            return res.status(404).send({
              msg: '未找到该活动同事圈消息'
            });
          } else {
            /**
             * 响应返回数据，形式为：
             *  [{
             *    content: contentDoc,
             *    comments: [commentDoc]
             *  }]
             */
            var resData = [];

            // 转换为简单对象，以解除mongoose文档的约束，便于修改属性写入响应
            var docToObject = function(doc) {
              return doc.toObject();
            };

            var contents = contentDocs.map(docToObject);

            var contentIdsForQuery = contents.map(function(content) {
              return content._id;
            });
            var userIdsForQuery = []; // 元素为String类型

            // 向用户id数组不重复地添加用户id
            var pushUserIdToUniqueArray = function(userId, array) {
              var resultIndex = array.indexOf(userId);
              if (resultIndex === -1) {
                array.push(userId.toString());
              }
            };
            contents.forEach(function(content) {
              pushUserIdToUniqueArray(content.post_user_id, userIdsForQuery);
            });

            CircleComment.find({
              target_content_id: {$in: contentIdsForQuery},
              status: 'show'
            }).sort('+post_date').exec()
            .then(function(commentDocs) {
              var comments = commentDocs.map(docToObject);

              comments.forEach(function(comment) {
                pushUserIdToUniqueArray(comment.post_user_id, userIdsForQuery);
                pushUserIdToUniqueArray(comment.target_user_id, userIdsForQuery);
              });

              User.find({
                _id: {$in: userIdsForQuery}
              }, {
                _id: 1,
                nickname: 1,
                photo: 1
              }).exec()
              .then(function(users) {

                // 向CircleContent和CircleComment对象添加发布者的详细信息
                var addPosterInfoToObj = function(obj) {
                  for (var i = 0, usersLen = users.length; i < usersLen; i++) {
                    if (users[i]._id.toString() === obj.post_user_id.toString()) {
                      obj.poster = users[i];
                      break;
                    }
                  }
                };

                var addTargetInfoToComment = function(comment) {
                  for (var i = 0, usersLen = users.length; i < usersLen; i++) {
                    if (users[i]._id.toString() === comment.target_user_id.toString()) {
                      comment.target = users[i];
                      break;
                    }
                  }
                };

                comments.forEach(function(comment) {
                  addPosterInfoToObj(comment);
                  addTargetInfoToComment(comment);
                });

                contents.forEach(function(content) {
                  addPosterInfoToObj(content);

                  // 将comments添加到对应的contents中
                  var contentComments = comments.filter(function(comment) {
                    return comment.target_content_id.toString() === content._id.toString();
                  });
                  resData.push({
                    content: content,
                    comments: contentComments
                  });
                });

                res.send(resData);
              })
              .then(null, function(err) {
                log(err);
                return res.sendStatus(500);
              });
            })
            .then(null, function(err) {
              log(err);
              return res.sendStatus(500);
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
    createCircleComment: function(req, res, next) {
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
      if (req.body.is_only_to_content === undefined || req.body.is_only_to_content === null || (req.body.kind != 'comment' && req.body.kind != 'appreciate') || (req.body.content && req.body.kind == 'appreciate') || (!req.body.content && req.body.kind == 'comment') || (req.body.is_only_to_content == true && req.body.target_user_id) ||
        (req.body.is_only_to_content == false && !req.body.target_user_id)) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }

      if (req.body.target_user_id === req.user.id) {
        res.status(400).send({msg: '不可以回复自己的评论'});
        return;
      }

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
          next(err);
        } else {
          var resComment = circleComment.toObject();
          resComment.poster = {
            _id: req.user._id,
            nickname: req.user.nickname,
            photo: req.user.photo
          };

          var noticeUserIds = circleContent.comment_users.map(function(commentUser) {
            return commentUser._id.toString();
          });
          if(noticeUserIds.indexOf(circleContent.post_user_id.toString())==-1)
            noticeUserIds.push(circleContent.post_user_id.toString());

          if (resComment.is_only_to_content) {
            res.send({ circleComment: resComment });
            socketClient.pushCircleComment(noticeUserIds, resComment);
          }
          else {
            User.findById(resComment.target_user_id, {
              _id: 1,
              nickname: 1,
              photo: 1
            }).exec()
            .then(function(user) {
              if (!user) {
                next(new Error('Target user not found.'));
              }
              else {
                resComment.target = user;
                res.send({ circleComment: resComment });

                socketClient.pushCircleComment(noticeUserIds, resComment);
              }
            })
            .then(null, next);
          }

          var hasFindCommentUser = false;
          for (var i = 0, commentUsersLen = circleContent.comment_users.length; i < commentUsersLen; i++) {
            var commentUser = circleContent.comment_users[i];
            if (req.user.id === commentUser._id.toString()) {
              commentUser.comment_num += 1;
              if (req.body.kind === 'appreciate') { // 如果是赞，则设置为true，否则不再设置，不可以覆盖之前的赞
                commentUser.appreciated = true;
              }
              hasFindCommentUser = true;
              break;
            }
          }
          if (!hasFindCommentUser) {
            circleContent.comment_users.push({
              _id: req.user._id,
              comment_num: 1,
              appreciated: req.body.kind === 'appreciate'
            });
          }

          circleContent.latest_comment_date = circleComment.post_date;
          // Warning: http://docs.mongodb.org/manual/reference/method/db.collection.save/ #Replace an Existing Document
          circleContent.save(function(err) {
            if (err) {
              console.log(err.stack || 'Save circleContent error.');
            }
          });
        }
      });
    },

    getCircleContent: function(req, res, next) {
      if (req.user.provider === 'company') {
        res.status(403).send({msg: '公司账号暂无朋友圈功能'});
        return;
      }

      var docs = {};
      CircleContent.findById(req.params.contentId).exec()
      .then(function(circleContent) {
        if (!circleContent) {
          res.status(404).send({msg: '找不到该消息'});// TODO:提示文字需要改善
          return;
        }

        docs.circleContent = circleContent;

        return CircleComment.find({
          target_content_id: circleContent._id,
          status: 'show'
        }).sort('+post_date').exec();

      })
      .then(function(circleComments) {
        docs.circleComments = circleComments;

        var userIdsForQuery = [];
        // 向用户id数组不重复地添加用户id
        var pushUserIdToQueryIds = function(userId) {
          var resultIndex = userIdsForQuery.indexOf(userId);
          if (resultIndex === -1) {
            userIdsForQuery.push(userId.toString());
          }
        };
        pushUserIdToQueryIds(docs.circleContent.post_user_id);
        circleComments.forEach(function(comment) {
          pushUserIdToQueryIds(comment.post_user_id);
          pushUserIdToQueryIds(comment.target_user_id);
        });

        return User.find({
          _id: {$in: userIdsForQuery}
        }, {
          _id: 1,
          nickname: 1,
          photo: 1
        }).exec();

      })
      .then(function(users) {

        // 向CircleContent和CircleComment对象添加发布者的详细信息
        var addPosterInfoToObj = function(obj) {
          for (var i = 0, usersLen = users.length; i < usersLen; i++) {
            if (users[i]._id.toString() === obj.post_user_id.toString()) {
              obj.poster = users[i];
              break;
            }
          }
        };

        var addTargetInfoToComment = function(comment) {
          for (var i = 0, usersLen = users.length; i < usersLen; i++) {
            if (users[i]._id.toString() === comment.target_user_id.toString()) {
              comment.target = users[i];
              break;
            }
          }
        };

        var resData = {
          content: docs.circleContent.toObject(),
          comments: docs.circleComments.map(function(doc) {
            return doc.toObject();
          })
        };

        resData.comments.forEach(function(comment) {
          addPosterInfoToObj(comment);
          addTargetInfoToComment(comment);
        });
        addPosterInfoToObj(resData.content);

        res.send({circle: resData});

      })
      .then(null, next);
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
     * 
     */
    getCircleComments: function(req, res, next) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无提醒功能'
        });
      }
      if (!req.query.last_comment_date) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }

      var conditons = {
        'post_user_id': req.user._id.toString(),
        // 'post_date': {
        //   '$lte': req.query.latest_content_date
        // },
        'latest_comment_date': {
          '$gt': req.query.last_comment_date
        }
      };
      CircleContent.find(conditons, 'content photos')
        .exec()
        .then(function(contents) {
          if (contents.length == 0) {
            res.status(404).send({
              msg: '无新评论或赞'
            });
            return;
          }
          var content_ids = [];
          contents.forEach(function(content) {
            content_ids.push(content._id);
          });
          CircleComment.find({
              post_user_cid: req.user.cid,
              target_content_id: {
                $in: content_ids
              },
              post_user_id: {
                $ne: req.user.id
              },
              post_date: {
                $gt: req.query.last_comment_date
              },
              $or: [
                {kind: {$ne: 'appreciate'}},
                {status: {$ne: 'delete'}}
              ]
            })
            .sort('-post_date')
            .exec()
            .then(function(commentDocs) {
              var comments = commentDocs.map(function(comment) {
                return comment.toObject();
              });

              var userIdsForQuery = [];
              userIdsForQuery = comments.map(function(comment) {
                return comment.target_user_id;
              });
              userIdsForQuery = userIdsForQuery.concat(comments.map(function(comment) {
                return comment.post_user_id;
              }));

              User.find({
                _id: {$in: userIdsForQuery}
              }, {
                _id: 1,
                nickname: 1,
                photo: 1
              }).exec()
                .then(function(users) {

                  var getUserById = function(id) {
                    for (var i = 0, usersLen = users.length; i < usersLen; i++) {
                      if (id.toString() === users[i]._id.toString()) {
                        return users[i];
                      }
                    }
                  };

                  comments.forEach(function(comment) {
                    var circleContentIndex = tools.arrayObjectIndexOf(contents, comment.target_content_id, '_id');
                    comment.targetContent = contents[circleContentIndex];
                    comment.poster = getUserById(comment.post_user_id);
                    comment.target = getUserById(comment.target_user_id);
                  });
                  res.send(comments);
                })
                .then(null, next);
            })
            .then(null, next);
        })
        .then(null, next);
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

// 处理只能一次请求只能传一张图片时发同事圈的请求
function singleUpload(req, res, next) {
  if (req.body.uploadStep === 'create') {
    createCircleContent(req, res, next);
  }
  else if (req.body.uploadStep === 'active') {
    activeCircleContent(req, res, next);
  }
}

// 创建同事圈的内容
function createCircleContent(req, res, next) {

  // filter
  if (!req.body.campaign_id) {
    res.status(400).send({msg: '参数不足'});
    return;
  }

  // auth
  Campaign.findById(req.body.campaign_id).exec()
    .then(function (campaign) {
      if (!campaign) {
        res.status(403).send({msg: '您没有权限'});
        return;
      }

      var role = auth.getRole(req.user, {
        companies: campaign.cid,
        teams: campaign.tid,
        users: campaign.relativeMemberIds
      });
      var taskName = campaign.campaign_type == 1 ? 'publishCompanyCircle' : 'publishTeamCircle';
      var allow = auth.auth(role, [taskName]);
      if (!allow[taskName]) {
        res.status(403).send({msg: '您没有权限'});
        return;
      }

      var tid = campaign.campaign_type == 1 ? [] : campaign.tid;
      var relative_cids = campaign.cid;

      // create
      var circleContent = new CircleContent({
        cid: req.user.getCid(), // 所属公司id
        tid: tid, // 关联的小队id(可选，不是必要的)
        campaign_id: req.campaign_id, // 关联的活动id(可选，不是必要的)
        post_user_id: req.user._id, // 发消息的用户的id（头像和昵称再次查询）
        relative_cids: relative_cids, // 参加同事圈消息所属的活动的所有公司id
        status: 'wait'
      });
      if (req.body.content) {
        circleContent.content = req.body.content;
      }
      circleContent.save(function (err) {
        if (err) {
          next(err);
        }
        else {
          res.send({
            msg: '创建成功，等待文件上传',
            id: circleContent.id
          });
        }
      });

    })
    .then(null, next);

}

// 激活
function activeCircleContent(req, res, next) {
  CircleContent.findById(req.body.circleContentId).exec()
    .then(function (circleContent) {
      if (!circleContent) {
        res.status(403).send({msg: '您没有权限'});
        return;
      }

      // 查找circleContent对应的文件
      File.find({
        'owner.kind': 'CircleContent',
        'owner._id': circleContent._id
      }, {
        _id: 0,
        uri: 1,
        width: 1,
        height: 1
      }).exec()
        .then(function (files) {
          if (files.length === 0 && (!circleContent.content || circleContent.content === '')) {
            res.send({msg: '发表失败，不允许既无文本内容又没有图片'});
            // TODO: 可以考虑将此CircleContent从数据库中删除，或是定期清除
            return;
          }
          circleContent.photos = files;
          circleContent.status = 'show';
          circleContent.save(function (err) {
            if (err) {
              next(err);
            }
            else {
              res.send({
                msg: '发表成功',
                circleContent: circleContent
              });
              var poster = {
                _id: req.user._id,
                nickname: req.user.nickname,
                photo: req.user.photo
              };
              socketClient.pushCircleContent(circleContent.cid, poster);
            }
          });
        })
        .then(null, next);
    })
    .then(null, next);
}
