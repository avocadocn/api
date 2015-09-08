'use strict';

var mongoose = require('mongoose');
var CircleContent = mongoose.model('CircleContent'),
  CircleComment = mongoose.model('CircleComment'),
  File = mongoose.model('File'),
  User = mongoose.model('User'),
  Company = mongoose.model('Company'),
  CompanyGroup = mongoose.model('CompanyGroup'),
  Chat = mongoose.model('Chat'),
  CompetitionMessage = mongoose.model('CompetitionMessage');
var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  socketClient = require('../../services/socketClient'),
  tools = require('../../tools/tools.js'),
  async = require('async');
var multerService = require('../../middlewares/multerService.js');


module.exports = {

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
     * 解析formData
     * To parse the form data from the fore-end
     * 
     * content和photo信息都不存在，则返回400, msg: 文字和图片至少包含一种
     * photo信息出错, 则返回400, msg: 图片信息出错
     * content和photo信息至少存在一个，则下一步
     * 
     * @param  {[type]}   req  [description]
     * formData
     * {
     *   content: String, //文字信息
     *   photo: [file] // 图片信息
     * }
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    uploadValidate: function(req, res, next) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }
      if (!req.body.content &&!req.files) {
        return res.status(400).send({
          msg: '文字和图片至少包含一种'
        });
      }
      next();
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
      if (!req.files) {
        // 不传照片的话直接到下一步
        next();
        return;
      }
      multerService.formatPhotos(req.files, {getSize:true}, function(err, files) {
        var photos = [];
        if(files && files.length) {
          files.forEach(function(img) {
            var photo = {
              uri: multerService.getRelPath(img.path),
              width: img.size.width,
              height: img.size.height
            };
            photos.push(photo);
          });
          req.body.photos = photos;
        }
        next();
      });
    },
    /**
     * 创建新同事圈消息
     * Create circle content
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createCircleContent: function(req, res) {

      var circleContent = new CircleContent({
        cid: req.user.getCid(), // 所属公司id

        content: req.body.content, // 文本内容(content和photos至少要有一个)

        photos: req.body.photos, // 照片列表

        postUserId: req.user._id // 发消息的用户的id（头像和昵称再次查询）
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

          //socket(消息通知暂时去掉)
          // var poster = {
          //   _id: req.user._id,
          //   nickname: req.user.nickname,
          //   photo: req.user.photo
          // };
          // socketClient.pushCircleContent(circleContent.cid, poster);
        }
      });
    },
    /**
     * 获取公司消息及评论
     * get the circle contents
     *
     * lastContentDate和latestContentDate都存在(两者存其一), 则返回400, msg: 参数错误
     * latestContentDate存在, 查询该时间点之后的同事圈消息
     * lastContentDate存在, 查询该时间点之前的同事圈消息
     * 注：除查询最新同事圈消息外, 均要设置limit
     * 
     * @param  {[type]} req [description]
     * query
     * {
     *   lastContentDate: Date, // 最后一条同事圈消息创建时间
     *   latestContentDate: Date, // 最新一条同事圈消息创建时间
     *   limit: Number // 刷早些同事圈消息时，页面返回消息条数
     * }
     * @param  {[type]} res [description]
     * @return [
     *           {
     *             content: {
     *               cid // 所属公司id
     *               content: String, // 文本内容(content和photos至少要有一个)
     *               photos: [], // 照片列表
     *               postUserId: Schema.Types.ObjectId, // 发消息的用户的id（头像和昵称再次查询）
     *               postDate: type: Date,
     *               status: type: String,
     *               commentUsers: [Schema.Types.ObjectId] // 参与过评论的用户id
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
      // 暂留判断用户是否为HR
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }

      if (req.query.lastContentDate && req.query.latestContentDate) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }

      var conditions = {
        'cid': req.user.cid,
        'status': 'show'
      };

      var options = {};

      if (req.query.lastContentDate) { //如果带此属性来，则查找比它更早的limit条
        conditions.postDate = {
          '$lt': req.query.lastContentDate
        };
      }

      if (req.query.latestContentDate) { //如果带此属性来，则查找比它新的消息
        conditions.postDate = {
          '$gt': req.query.latestContentDate
        };
      } else {
        // 除查询最新同事圈消息外, 均要设置limit
        options.limit = req.query.limit || 10;
      }

      CircleContent.find(conditions, null, options)
        .sort('-postDate')
        .exec()
        .then(function(contentDocs) {
          if (contentDocs.length === 0) {
            return res.sendStatus(204);
            // res.status(204).send({
            //   msg: '未找到同事圈消息'
            // });
            // return;
          }

          addInfoToCircleContent(contentDocs, function(err, resContents) {
            if (err) {
              next(err);
            }
            else {
              res.send(resContents);
            }
          });

        })
        .then(null, next);
    },

    /**
     * 获取个人消息及评论
     * get the team circle for user
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return (Reference)
     */
    getUserCircle: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }
      
      if (req.query.lastContentDate && req.query.latestContentDate) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }

      var conditions = {
        'postUserId': req.params.userId,
        'cid': req.user.cid,
        'status': 'show'
      };

      var options = {};
      if (req.query.lastContentDate) { //如果带此属性来，则查找比它更早的limit条
        conditions.postDate = {
          '$lt': req.query.lastContentDate
        };
      }

      if (req.query.latestContentDate) { //如果带此属性来，则查找比它新的消息
        conditions.postDate = {
          '$gt': req.query.latestContentDate
        };
      } else {
        options.limit = req.query.limit || 20;
      }

      CircleContent.find(conditions, null, options)
        .sort('-postDate')
        .exec()
        .then(function(contentDocs) {
          if (contentDocs.length == 0) {
            return res.sendStatus(204);
            // return res.status(204).send({
            //   msg: '未找到该用户的精彩瞬间数据'
            // });
          } else {
            addInfoToCircleContent(contentDocs, function(err, resContents) {
              if (err) {
                next(err);
              }
              else {
                res.send(resContents);
              }
            });
            //- 注：之前让个人的精彩瞬间显示活动对应的小队和公司信息，现在不需要，暂且注释，待需求稳定后移除注释代码

            // /**
            //  * 响应返回数据，形式为：
            //  *  [{
            //  *    content: contentDoc,
            //  *    comments: [commentDoc]
            //  *  }]
            //  */
            // var resData = [];

            // // 转换为简单对象，以解除mongoose文档的约束，便于修改属性写入响应
            // var docToObject = function(doc) {
            //   return doc.toObject();
            // };

            // var contents = contentDocs.map(docToObject);

            // var contentIdsForQuery = contents.map(function(content) {
            //   return content._id;
            // });
            // var userIdsForQuery = []; // 元素为String类型
            // var teamIdsForQuery = []; //
            // var campaignIdsForQuery = [];
            // // 向用户id数组不重复地添加用户id
            // // var pushUserIdToUniqueArray = function(userId, array) {
            // //   var resultIndex = array.indexOf(userId);
            // //   if (resultIndex === -1) {
            // //     array.push(userId.toString());
            // //   }
            // // };

            // // var pushTeamIdToUniqueArray = function(teamId, array) {
            // //   if (teamId) {
            // //     var resultIndex = array.indexOf(teamId);
            // //     if (resultIndex === -1) {
            // //       array.push(teamId.toString());
            // //     }
            // //   }
            // // }

            // var pushIdToUniqueArray = function(id, array) {
            //   if (id === undefined || id === null) {
            //     return;
            //   }
            //   var stringId = id.toString();
            //   var resultIndex = array.indexOf(stringId);
            //   if (resultIndex === -1) {
            //     array.push(stringId);
            //   }
            // };

            // contents.forEach(function(content) {
            //   pushIdToUniqueArray(content.postUserId, userIdsForQuery);
            //   pushIdToUniqueArray(content.post_user_tid, teamIdsForQuery);
            //   pushIdToUniqueArray(content.campaign_id, campaignIdsForQuery);
            // });

            // async.parallel([
            //     function(callback) {
            //       Company.findById(req.user.cid, 'info.name info.logo', function(err, companyDoc) {
            //         if (err) {
            //           log(err);
            //         }
            //         callback(err, companyDoc);
            //       });
            //     },
            //     function(callback) {
            //       if (teamIdsForQuery.length) {
            //         CompanyGroup.find({
            //           _id: {
            //             $in: teamIdsForQuery
            //           }
            //         }, 'name logo', function(err, teamDocs) {
            //           if (err) {
            //             log(err);
            //           }
            //           callback(err, teamDocs);
            //         })
            //       } else {
            //         callback(null, []);
            //       }
            //     },
            //     function(callback) {
            //       CircleComment.find({
            //           targetContentId: {
            //             $in: contentIdsForQuery
            //           },
            //           status: 'show'
            //         }).sort('+postDate').exec()
            //         .then(function(commentDocs) {
            //           var comments = commentDocs.map(docToObject);

            //           comments.forEach(function(comment) {
            //             pushIdToUniqueArray(comment.postUserId, userIdsForQuery);
            //             pushIdToUniqueArray(comment.targetUserId, userIdsForQuery);
            //           });

            //           User.find({
            //               _id: {
            //                 $in: userIdsForQuery
            //               }
            //             }, {
            //               _id: 1,
            //               nickname: 1,
            //               photo: 1
            //             }).exec()
            //             .then(function(users) {

            //               // 向CircleContent和CircleComment对象添加发布者的详细信息
            //               var addPosterInfoToObj = function(obj) {
            //                 for (var i = 0, usersLen = users.length; i < usersLen; i++) {
            //                   if (users[i]._id.toString() === obj.postUserId.toString()) {
            //                     obj.poster = users[i];
            //                     break;
            //                   }
            //                 }
            //               };

            //               var addTargetInfoToComment = function(comment) {
            //                 for (var i = 0, usersLen = users.length; i < usersLen; i++) {
            //                   if (users[i]._id.toString() === comment.targetUserId.toString()) {
            //                     comment.target = users[i];
            //                     break;
            //                   }
            //                 }
            //               };

            //               comments.forEach(function(comment) {
            //                 addPosterInfoToObj(comment);
            //                 addTargetInfoToComment(comment);
            //               });
            //               callback(null, comments);
            //             })
            //             .then(null, function(err) {
            //               log(err);
            //               callback(err);
            //             });
            //         })
            //         .then(null, function(err) {
            //           callback(err);
            //         })
            //     },
            //     function(callback) {
            //       Campaign.find({
            //         _id: {
            //           $in: campaignIdsForQuery
            //         }
            //       }, {
            //         _id: 1,
            //         theme: 1
            //       }, function(err, campaignDocs) {
            //         if (err) {
            //           log(err);
            //           callback(err);
            //         } else {
            //           callback(null, campaignDocs);
            //         }
            //       });
            //     }
            //   ],
            //   // optional callback
            //   function(err, results) {
            //     if (err) {
            //       log(err);
            //       return res.sendStatus(500);
            //     } else {
            //       var addTeamInfoToObj = function(obj) {
            //         var teams = results[1];
            //         for (var i = 0, teamsLen = teams.length; i < teamsLen; i++) {
            //           if (obj.post_user_tid && teams[i]._id.toString() === obj.post_user_tid.toString()) {
            //             obj.teamInfo = teams[i];
            //             break;
            //           }
            //         }
            //       };

            //       var addCompanyInfoToObj = function(obj) {
            //         obj.companyInfo = results[0];
            //       };

            //       var addCampaignInfoToObj = function(obj) {
            //         var campaigns = results[3];
            //         for (var i = 0, campaignsLen = campaigns.length; i < campaignsLen; i++) {
            //           if (obj.campaign_id && campaigns[i].id === obj.campaign_id.toString()) {
            //             obj.campaignTheme = campaigns[i].theme;
            //             break;
            //           }
            //         }
            //       };

            //       var comments = results[2];
            //       contents.forEach(function(content) {
            //         addTeamInfoToObj(content);
            //         addCompanyInfoToObj(content);
            //         addCampaignInfoToObj(content);
            //         // 将comments添加到对应的contents中
            //         var contentComments = comments.filter(function(comment) {
            //           return comment.targetContentId.toString() === content._id.toString();
            //         });

            //         resData.push({
            //           content: content,
            //           comments: contentComments
            //         });
            //       });
            //       res.send(resData);
            //     }
            //   });
          }
        })
        .then(null, function(err) {
          log(err);
          return res.sendStatus(500);
        });
    },
    /**
     * 获取同事圈消息(by id)
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
            return res.sendStatus(204);
            // return res.status(204).send({
            //   msg: '未找到同事圈消息'
            // });
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
     * 删除同事圈消息
     * Delete the circle-contents
     * 
     * 请求用户不是该条消息的所有者, 返回403, msg: 权限错误
     * 请求用户是该条消息的所有者, 删除该消息以及与该消息有关的评论, 返回200, msg: 同事圈消息删除成功
     * 
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    deleteCircleContent: function(req, res) {
      // Judge authority
      var users = [];
      users.push(req.circleContent.postUserId);
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
      }, function(err, circleContent) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '同事圈消息删除成功'
          });
          // 删除与该消息有关的评论
          CircleComment.update({
            targetContentId: req.params.contentId,
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
     * 发同事圈评论或者赞
     * Create circle comment
     *
     * 请求用户与该条消息的所有者不在同一家公司, 返回403, msg: 权限错误
     * 请求用户与该条消息的所有者在同一家公司
     *   若(1)isOnlyToContent不是boolean类型
     *     (2)kind 不是'comment'也不是'appreciate'
     *     (3)kind是'appreciate'但content有值
     *     (4)kind是'comment'但content为空
     *     (5)targetUserId是true, 但targetUserId有值
     *     (6)targetUserId是false, 但targetUserId为空
     *      上述6种情况发生, 则返回400, msg: 参数错误
     *   若targetUserId与请求用户id相同, 则返回400, msg: 不可以回复自己的评论
     *   若请求用户重复点赞, 则返回403, msg: 已点赞
     *   请求用户发评论成功, 更新与该评论相关的同事圈消息的commentUsers以及latestCommentDate, 返回200, msg: 评论成功
     * 
     * @param req {
     *          "kind": "string", (required) // 评论种类: 赞或者评论
     *          "content": "string", // 评论内容(若评论种类是赞, 则该属性不存在)
     *          "isOnlyToContent": true, (required) // 评论对象: 若此值为true, 该评论针对消息; 若此值为false, 该评论针对其他用户所发评论
     *          "targetUserId": "string" // 评论对象所有者的id: 当isOnlyToContent为false时，此值才不为空。
     * }
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createCircleComment: function(req, res, next) {
      var circleContent = req.circleContent;

      // 判断请求用户与该条消息的所有者是否在同一家公司
      if (req.user.cid.toString() !== circleContent.cid.toString()) {
        return res.status(403).send({
          msg: '权限错误'
        });
      }
      /**
       * parameters limit:
       * 1. isOnlyToContent must be true or false(see definition)
       * 2. kind must be 'comment' or 'appreciate'
       * 3. content is null(or undefined) when kind is 'appreciate'
       * 4. content is not null(or undefined) when kind is 'comment'
       * 5. targetUserId is null(or undefined) when isOnlyToContent is true
       * 6. targetUserId is not null(or undefined) when isOnlyToContent is false
       */
      if (req.body.kind != 'comment' && req.body.kind != 'appreciate' || !req.body.content && req.body.kind == 'comment' || req.body.isOnlyToContent == false && !req.body.targetUserId) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }

      if (req.body.targetUserId === req.user.id) {
        return res.status(400).send({
          msg: '不可以回复自己的评论'
        });
      }

      if (req.body.kind == 'appreciate') {
        var isAppreciate = circleContent.commentUsers.some(function(member){ return (req.user._id.toString() === member._id.toString() && member.appreciated === true); });
        // var isAppreciate = false;
        // circleContent.commentUsers.forEach(function(user) {
        //   if (req.user._id.toString() == user._id.toString() && user.appreciated == true) {
        //     isAppreciate = true;
        //   }
        // });
        if (isAppreciate) {
          return res.status(400).send({
            msg: '已点赞'
          });
        }
      }

      var circleComment = new CircleComment({
        kind: req.body.kind, // 类型，评论或赞

        content: req.body.content, // 评论内容

        isOnlyToContent: req.body.isOnlyToContent, // 是否仅仅是回复消息，而不是对用户

        targetContentId: req.params.contentId, // # 评论目标消息的id

        // 评论目标用户的id(直接回复消息则保存消息发布者的id)
        targetUserId: !req.body.targetUserId ? circleContent.postUserId : req.body.targetUserId,

        postUserCid: req.user.cid, // 发评论或赞的用户的公司id

        postUserId: req.user._id, // 发评论或赞的用户的id（头像和昵称再次查询)

      });

      circleComment.save(function(err) {
        if (err) {
          next(err);
        } else {
          var resComment = circleComment.toObject();
          resComment.poster = {
            _id: req.user._id,
            nickname: req.user.nickname,
            photo: req.user.photo,
            cid: req.user.cid
          };

          // res.send({ circleComment: resComment });
          // socketClient.pushCircleComment([circleContent.postUserId], resComment);

          // var noticeUserIds = circleContent.commentUsers.map(function(commentUser) {
          //     return commentUser._id.toString();
          // });
          // Send reminds to user whose commentNum is larger than 0
          // var noticeUserIds = [];
          // circleContent.commentUsers.forEach(function(commentUser) {
          //   if(commentUser.commentNum > 0) {
          //     noticeUserIds.push(commentUser._id.toString());
          //   }
          // });

          // if (noticeUserIds.indexOf(circleContent.postUserId.toString()) == -1)
          //   noticeUserIds.push(circleContent.postUserId.toString());

          if (resComment.isOnlyToContent) {
            res.send({
              circleComment: resComment
            });
            socketClient.pushCircleComment([circleContent.postUserId], resComment);
          } else {
            User.findById(resComment.targetUserId, {
                _id: 1,
                nickname: 1,
                photo: 1,
                cid: 1
              }).exec()
              .then(function(user) {
                if (!user) {
                  next(new Error('Target user not found.'));
                } else {
                  resComment.target = user;
                  res.send({
                    circleComment: resComment
                  });

                  socketClient.pushCircleComment([circleContent.postUserId], resComment);
                }
              })
              .then(null, next);
          }

          var hasFindCommentUser = false;
          for (var i = 0, commentUsersLen = circleContent.commentUsers.length; i < commentUsersLen; i++) {
            var commentUser = circleContent.commentUsers[i];
            if (req.user.id === commentUser._id.toString()) {
              commentUser.commentNum += 1;
              if (req.body.kind === 'appreciate') { // 如果是赞，则设置为true，否则不再设置，不可以覆盖之前的赞
                commentUser.appreciated = true;
              }
              hasFindCommentUser = true;
              break;
            }
          }
          if (!hasFindCommentUser) {
            circleContent.commentUsers.push({
              _id: req.user._id,
              commentNum: 1,
              appreciated: req.body.kind === 'appreciate'
            });

          }

          circleContent.latestCommentDate = circleComment.postDate;
          // Warning: http://docs.mongodb.org/manual/reference/method/db.collection.save/ #Replace an Existing Document
          // Don't suggest the save function to update MongoDB. And concurrent http requests maybe cause data disorder.
          // For Example:
          // A -> get data D1
          //                              B -> get Data D1
          // A -> modify D1.a and D1.b
          //                              B -> modify D1.c
          // A -> save D1
          //                              B -> save D1
          // Imagine the D1 data status, you will doubt the save validity. Save function will induce entire collection changes.
          // So I advice to use update to reduce the scope of update function.
          circleContent.save(function(err) {
            if (err) {
              console.log(err.stack || 'Save circleContent error.');
            }
          });
          /**
           * These codes avoid the faults because of the concurrent http requests. And update function reduce the scope.
           * If the user who sends comment is already in the commentUsers, only update the commentNum, appreciated and
           * latestCommentDate. Otherwise, using update function to add this user info to commment_users, then through the
           * numberAffected, we can decide whether using update function. Update the user info again when the numberAffected
           * is zero.
           */
          // var updateCommentUser = false;
          // for (var i = 0, commentUsersLen = circleContent.commentUsers.length; i < commentUsersLen; i++) {
          //   var commentUser = circleContent.commentUsers[i];
          //   if (req.user.id === commentUser._id.toString()) {
          //     updateCommentUser = true;
          //     break;
          //   }
          // }

          // async.series([
          //     function(callback) {

          //       if (updateCommentUser) {
          //         callback(null, {
          //           msg: 'comment user exists'
          //         });
          //       }

          //       var conditions = {
          //         '_id': req.params.contentId,
          //         'commentUsers._id': {
          //           $ne: req.user.id
          //         }
          //       };

          //       var doc = {
          //         $set: {
          //           'latestCommentDate': circleComment.postDate
          //         },
          //         $push: {
          //           'commentUsers': {
          //             _id: req.user._id,
          //             commentNum: 1,
          //             appreciated: req.body.kind === 'appreciate'
          //           }
          //         }
          //       };

          //       CircleContent.update(conditions, doc, function(err, numberAffected) {
          //         if (err) {
          //           log(err);
          //           callback(err);
          //         }
          //         console.log(numberAffected);
          //         if (!numberAffected) {
          //           callback(null, {
          //             msg: 'comment user exists'
          //           });
          //         }
          //         updateCommentUser = false;
          //         callback(null, {
          //           msg: 'push completed'
          //         });
          //       });
          //     },
          //     function(callback) {
          //       if (updateCommentUser) {
          //         var conditions = {
          //           '_id': req.params.contentId,
          //           'commentUsers._id': req.user.id
          //         };

          //         var doc = {
          //           $inc: {
          //             'commentUsers.$.commentNum': 1
          //           },
          //           $set: {
          //             'commentUsers.$.appreciated': req.body.kind === 'appreciate',
          //             'latestCommentDate': circleComment.postDate
          //           }
          //         };

          //         CircleContent.update(conditions, doc, function(err, numberAffected) {
          //           if (err) {
          //             log(err);
          //             callback(err);
          //           }
          //         });
          //       }
          //       callback(null, {
          //         msg: 'update completed'
          //       });
          //     }
          //   ],
          //   function(err, results) {
          //     //
          //   });
        }
      });
    },
    /**
     * 获取某个消息的内容及其评论
     * 
     * 若查询的同事圈消息不存在, 返回204
     * 若查询的同事圈消息存在, 返回200, 
     * circle: 
     * {
     *   "content": {},
     *   "comments": [
     *     {}
     *   ]
     * }
     * 
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    getCircleContent: function(req, res, next) {
      if (req.user.provider === 'company') {
        res.status(403).send({
          msg: '公司账号暂无朋友圈功能'
        });
        return;
      }

      var docs = {}, data = {};

      var conditions = {
        '_id': req.params.contentId,
        'cid': req.user.cid,
        'status': 'show'
      };

      CircleContent.findOne(conditions).exec()
        .then(function(circleContent) {
          if (!circleContent) {
            return res.sendStatus(204);
            // return res.status(204).send({
            //   msg: '找不到该消息'
            // }); // TODO:提示文字需要改善
          }

          data.circleContent = circleContent.toObject();

          CircleComment.find({
              targetContentId: circleContent._id,
              status: 'show'
            }).sort('+postDate').exec()
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
              pushUserIdToQueryIds(data.circleContent.postUserId);
              circleComments.forEach(function(comment) {
                pushUserIdToQueryIds(comment.postUserId);
                pushUserIdToQueryIds(comment.targetUserId);
              });

              return User.find({
                _id: {
                  $in: userIdsForQuery
                }
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
                  if (users[i]._id.toString() === obj.postUserId.toString()) {
                    obj.poster = users[i];
                    break;
                  }
                }
              };

              var addTargetInfoToComment = function(comment) {
                for (var i = 0, usersLen = users.length; i < usersLen; i++) {
                  if (users[i]._id.toString() === comment.targetUserId.toString()) {
                    comment.target = users[i];
                    break;
                  }
                }
              };

              var resData = {
                content: data.circleContent,
                comments: docs.circleComments.map(function(doc) {
                  return doc.toObject();
                })
              };

              resData.comments.forEach(function(comment) {
                addPosterInfoToObj(comment);
                addTargetInfoToComment(comment);
              });
              addPosterInfoToObj(resData.content);

              res.send({
                circle: resData
              });

            });

        })
        .then(null, next);
    },


    /**
     * 删除同事圈评论
     * Delete circle comment
     *
     * 若查询的评论不存在, 则返回204
     * 若请求用户不是该评论的所有者, 则返回403, msg: 权限错误
     * 若请求用户是该评论的所有者, 
     *    若重复删除评论, 返回400, msg: 评论已删除
     *    若无重复删除, 更新与之相关的消息的commentUsers, 返回200, msg: 评论删除成功
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

      CircleComment.findOne({'_id': req.params.commentId, 'status': 'show'}, function(err, comment) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }
        if (!comment) {
          return res.sendStatus(204);
          // return res.status(204).send({
          //   msg: '无法找到评论或已删除'
          // });
        }
        // Judge authority
        var users = [];
        users.push(comment.postUserId);
        var role = auth.getRole(req.user, {
          users: users
        });
        var allow = auth.auth(role, ['deleteCircleComment']);
        if (!allow.deleteCircleComment) {
          return res.status(403).send({
            msg: '权限错误'
          });
        }
        CircleComment.findOneAndUpdate({
            _id: req.params.commentId,
            status: {
              $ne: 'delete'
            }
          }, {
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
              // Update commentUsers of circle content
              var options = {
                $inc: {
                  'commentUsers.$.commentNum': -1
                }
              };
              if (comment.kind == 'appreciate') {
                options.$set = {
                  'commentUsers.$.appreciated': false
                }
              }
              CircleContent.update({
                  _id: comment.targetContentId,
                  'commentUsers': {
                    '$elemMatch': {
                      '_id': req.user._id,
                      'commentNum': {
                        $gte: 1
                      }
                    }
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
      if (!req.query.lastCommentDate) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }

      getComments(req, function(err, data) {
        if (err) {
          return res.sendStatus(500);
        }
        if (data.msg) {
          return res.status(404).send({
            msg: '无新评论或赞'
          });
        }

        var comments = data.comments.map(function(comment) {
          return comment.toObject();
        });

        var userIdsForQuery = [];
        userIdsForQuery = comments.map(function(comment) {
          return comment.targetUserId;
        });
        userIdsForQuery = userIdsForQuery.concat(comments.map(function(comment) {
          return comment.postUserId;
        }));

        User.find({
            _id: {
              $in: userIdsForQuery
            }
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
              var circleContentIndex = tools.arrayObjectIndexOf(data.contents, comment.targetContentId, '_id');
              comment.targetContent = data.contents[circleContentIndex];
              comment.poster = getUserById(comment.postUserId);
              comment.target = getUserById(comment.targetUserId);
            });
            res.send(comments);
          })
          .then(null, next);
      });
    },
    /**
     * 员工用户获取是否有新评论、新朋友圈内容&消息(包括最新消息人的头像)
     * @param  {Object} req:{
     *           query:{
     *             lastReadTime: Date,
     *             lastCommentDate: Date
     *           }
     *         }
     * @return {
     *           newChat : boolean //是否有新讨论(聊天)
     *           newDisover : boolean //是否有新挑战信或挑战信评论
     *           newCircleContent : object //是否有新同事圈,有的话带上最新那个人的头像
     *           newCircleComment : number //是否有同事圈评论
     *         }
     */
    getReminds: function(req, res, next) {
      if (!req.query.lastReadTime || !req.query.lastCommentDate) {
        return res.status(422).send({msg:'参数错误'});
      }
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无提醒功能'
        });
      }
      //获取四个参数：
      async.parallel({
        newChat: function(callback) {
          hasNewChat(req.user, callback);
        },
        newDiscover: function(callback) {
          hasNewDiscover(req.user, callback);
        },
        newCircleContent: function(callback) {
          hasNewCircleContent(req, callback);
        },
        newCircleComment: function(callback) {
          getNewCommentNumber(req, callback);
        }
      }, function(err, results) {
        if(err) {
          next(err);
        }
        else {
          return res.status(200).send(results);
        }
      })

    }
};

/**
 * 获取是否有新chat
 * @param  {object}   user
 * @param  {Function} callback function(err, unread)
 *                             unread: boolean
 */
function hasNewChat (user, callback) {
  async.map(user.chatrooms, function(chatroom, mapCallback) {
    Chat.findOne({chatroom_id: chatroom._id, create_date: {'$gt':chatroom.read_time}},{'_id':1},function(err, chat) {
      if(err) {
        mapCallback(err);
      }
      else {
        mapCallback(null, {_id: chatroom._id, unread: chat});
      }
    });
  }, function(err, results) {
    if(err) {
      callback(err);
    }
    else {
      var chatUnread = false;
      for (var i = results.length - 1; i >= 0; i--) {
        if(results[i].unread) {
          chatUnread = true;
          break;
        }
      };
      callback(null, chatUnread);
    }
  });
};

/**
 * 获取是否有新挑战信信息
 * @param  {object}   user
 * @param  {Function} callback function(err, unread)
 *                             unread: boolean
 */
function hasNewDiscover (user, callback) {
  var leaderTeamIds = [];
  for (var i = user.team.length - 1; i >= 0; i--) {
    if(user.team[i].leader === true) {
      leaderTeamIds.push(user.team[i]._id);
    }
  };
  CompetitionMessage.findOne({
    '$or': [
      {'$and':[{'sponsor_team': {'$in': leaderTeamIds}}, {'sponsor_unread':true}]},
      {'$and':[{'opposite_team': {'$in': leaderTeamIds}}, {'opposite_unread':true}]}
    ]
  }, function(err, result) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, result ? true: false);
    }
  });
};

/**
 * 获取是否有新同事圈,需要带上次时间来，如果没带...?
 * @param  {Object}   req
 * @param  {Function} callback function(err, content)
 */
function hasNewCircleContent (req, callback) {
  CircleContent.findOne(
    {'cid':req.user.cid, 'status':'show', 'postDate':{'$gt':req.query.lastReadTime}},
    {'postUserId':1}
  )
  .sort('-postDate')
  .populate('postUserId','photo')
  .exec()
  .then(function(content) {
    callback(null, content);
  })
  .then(null, function(err) {
    callback(err);
  });
};

function getNewCommentNumber (req, callback) {
  //与获取comment同,稍后修改
  getComments(req, function(err, data) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, data.comments ? data.comments.length : 0);
    }
  });
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
  // create
  var circleContent = new CircleContent({
    cid: req.user.getCid(), // 所属公司id
    postUserId: req.user._id, // 发消息的用户的id（头像和昵称再次查询）
    status: 'wait'
  });
  if (req.body.content) {
    circleContent.content = req.body.content;
  }
  circleContent.save(function(err) {
    if (err) {
      next(err);
    } else {
      res.send({
        msg: '创建成功，等待文件上传',
        id: circleContent.id
      });
    }
  });
}

// 激活
function activeCircleContent(req, res, next) {
  CircleContent.findById(req.body.circleContentId).exec()
    .then(function(circleContent) {
      if (!circleContent) {
        res.status(403).send({
          msg: '您没有权限'
        });
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
        .then(function(files) {
          if (files.length === 0 && (!circleContent.content || circleContent.content === '')) {
            res.send({
              msg: '发表失败，不允许既无文本内容又没有图片'
            });
            // TODO: 可以考虑将此CircleContent从数据库中删除，或是定期清除
            return;
          }
          circleContent.photos = files;
          circleContent.status = 'show';
          circleContent.save(function(err) {
            if (err) {
              next(err);
            } else {
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

// 获取同事圈提醒
function getComments(req, callback) {
  var conditions = {
    'postUserId': req.user.id,
    // 'postDate': {
    //   '$lte': req.query.latestContentDate
    // },
    'latestCommentDate': {
      '$gt': req.query.lastCommentDate
    }
  };
  CircleContent.find(conditions, 'content photos')
    .exec()
    .then(function(contents) {
      if (contents.length == 0) {
        callback(null, {
          msg: '无新评论或赞'
        });
        return;
      }
      var content_ids = [];
      contents.forEach(function(content) {
        content_ids.push(content._id);
      });
      CircleComment.find({
          // postUserCid: req.user.cid,
          targetContentId: {
            $in: content_ids
          },
          postUserId: {
            $ne: req.user.id
          },
          postDate: {
            $gt: req.query.lastCommentDate
          },
          status: {
            $ne: 'delete'
          },
          // $or: [
          //   {kind: {$ne: 'appreciate'}},
          //   {status: {$ne: 'delete'}}
          // ]
        })
        .sort('-postDate')
        .exec()
        .then(function(commentDocs) {
          if (commentDocs.length == 0) {
            callback(null, {
              msg: '无新评论或赞'
            });
            return;
          }
          callback(null, {
            contents: contents,
            comments: commentDocs
          });
        })
        .then(null, function(err) {
          log(err);
          callback(err);
        })
    })
    .then(null, function(err) {
      log(err);
      callback(err);
    })
}

/**
 * 添加发表者、评论发表者及目标、对应活动的信息
 * @param {Array} contentDocs
 * @param {Function} callback function(err, resContents) {}
 */
function addInfoToCircleContent(contentDocs, callback) {
  /**
   * 响应返回数据，形式为：
   *  [{
   *    content: contentDoc,
   *    comments: [commentDoc]
   *  }]
   */
  var resData = [];

  var queryData = {}; // 数据库查询获得的文档数据

  // 转换为简单对象，以解除mongoose文档的约束，便于修改属性写入响应
  var docToObject = function(doc) {
    return doc.toObject();
  };
  var contents = contentDocs.map(docToObject);

  // 向数组不重复地添加id
  var pushIdToUniqueArray = function(id, array) {
    if (id === undefined || id === null) {
      return;
    }
    var stringId = id.toString();
    var resultIndex = array.indexOf(stringId);
    if (resultIndex === -1) {
      array.push(stringId);
    }
  };

  var contentIdsForQuery = contents.map(function(content) {
    return content._id;
  });

  CircleComment.find({
      targetContentId: {
        $in: contentIdsForQuery
      },
      status: 'show'
    }).sort('+postDate').exec()
    .then(function(commentDocs) {
      var comments = commentDocs.map(docToObject);

      var userIdsForQuery = []; // 元素为String类型

      contents.forEach(function(content) {
        pushIdToUniqueArray(content.postUserId, userIdsForQuery);
      });

      comments.forEach(function(comment) {
        pushIdToUniqueArray(comment.postUserId, userIdsForQuery);
        pushIdToUniqueArray(comment.targetUserId, userIdsForQuery);
      });

      queryData.comments = comments;

      return User.find({
        _id: {
          $in: userIdsForQuery
        }
      }, {
        _id: 1,
        nickname: 1,
        photo: 1,
        cid: 1,
        company_official_name: 1
      }).exec();

    })
    .then(function(users) {

      // 向CircleContent和CircleComment对象添加发布者的详细信息
      var addPosterInfoToObj = function(obj) {
        for (var i = 0, usersLen = users.length; i < usersLen; i++) {
          if (users[i]._id.toString() === obj.postUserId.toString()) {
            obj.poster = users[i];
            break;
          }
        }
      };

      var addTargetInfoToComment = function(comment) {
        for (var i = 0, usersLen = users.length; i < usersLen; i++) {
          if (users[i]._id.toString() === comment.targetUserId.toString()) {
            comment.target = users[i];
            break;
          }
        }
      };

      queryData.comments.forEach(function(comment) {
        addPosterInfoToObj(comment);
        addTargetInfoToComment(comment);
      });

      contents.forEach(function(content) {
        addPosterInfoToObj(content);

        // 将comments添加到对应的contents中
        var contentComments = queryData.comments.filter(function(comment) {
          return comment.targetContentId.toString() === content._id.toString();
        });
        resData.push({
          content: content,
          comments: contentComments
        });
      });

      callback(null, resData);
    })
    .then(null, callback);
}
