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
  Company = mongoose.model('Company'),
  CompanyGroup = mongoose.model('CompanyGroup'),
  Chat = mongoose.model('Chat'),
  CompetitionMessage = mongoose.model('CompetitionMessage');
var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  socketClient = require('../../services/socketClient'),
  uploader = require('../../services/uploader.js'),
  tools = require('../../tools/tools.js'),
  async = require('async');



module.exports =  {

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

            var post_user_tid = null;
            var campaign_unit = campaign.campaign_unit;
            var findUserTeam = false;
            for (var i = 0; i < campaign_unit.length && !findUserTeam; i++) {
              var members = campaign_unit[i].member;
              for (var j = 0; j < members.length; j++) {
                if (members[j]._id.toString() == req.user.id) {
                  post_user_tid = campaign_unit[i].team._id.toString();
                  findUserTeam = true;
                  break;
                }
              }
            }
            req.post_user_tid = post_user_tid;

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

        post_user_tid: req.post_user_tid,

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
          Campaign.update({
            _id: circleContent.campaign_id
          }, {
            $inc: {
              circle_content_sum: 1
            }
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
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
            res.status(204).send({
              msg: '未找到同事圈消息'
            });
            return;
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

      CircleContent.find(conditions, null, {limit: req.query.limit || 20})
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
                photo: 1,
                cid: 1,
                company_official_name: 1
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

    getTeamCircle: function(req, res, next) {
      if (req.user.provider === 'company') {
        res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
        return;
      }

      var conditions = {
        'tid': req.params.teamId,
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
            res.status(404).send({
              msg: '未找到该小队的精彩瞬间数据'
            });
            return;
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
     * get the team circle for user
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return (Reference getCampaignCircle)
     */
    getUserCircle: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }

      var conditions = {
        'post_user_id': req.params.userId,
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
          if (contentDocs.length == 0) {
            return res.status(404).send({
              msg: '未找到该用户的精彩瞬间数据'
            });
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
            //   pushIdToUniqueArray(content.post_user_id, userIdsForQuery);
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
            //           target_content_id: {
            //             $in: contentIdsForQuery
            //           },
            //           status: 'show'
            //         }).sort('+post_date').exec()
            //         .then(function(commentDocs) {
            //           var comments = commentDocs.map(docToObject);

            //           comments.forEach(function(comment) {
            //             pushIdToUniqueArray(comment.post_user_id, userIdsForQuery);
            //             pushIdToUniqueArray(comment.target_user_id, userIdsForQuery);
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
            //                   if (users[i]._id.toString() === obj.post_user_id.toString()) {
            //                     obj.poster = users[i];
            //                     break;
            //                   }
            //                 }
            //               };

            //               var addTargetInfoToComment = function(comment) {
            //                 for (var i = 0, usersLen = users.length; i < usersLen; i++) {
            //                   if (users[i]._id.toString() === comment.target_user_id.toString()) {
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
            //           return comment.target_content_id.toString() === content._id.toString();
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
      }, function(err, circleContent) {
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

          Campaign.update({
            '_id': circleContent.campaign_id,
            'circle_content_sum': {
              $gt: 0
            }
          }, {
            $inc: {
              'circle_content_sum': -1
            }
          }, function(err, numberAffected) {
            if (err) {
              log(err);
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
        res.status(400).send({
          msg: '不可以回复自己的评论'
        });
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
            photo: req.user.photo,
            cid: req.user.cid
          };

          // res.send({ circleComment: resComment });
          // socketClient.pushCircleComment([circleContent.post_user_id], resComment);

          // var noticeUserIds = circleContent.comment_users.map(function(commentUser) {
          //     return commentUser._id.toString();
          // });
          // Send reminds to user whose comment_num is larger than 0
          // var noticeUserIds = [];
          // circleContent.comment_users.forEach(function(commentUser) {
          //   if(commentUser.comment_num > 0) {
          //     noticeUserIds.push(commentUser._id.toString());
          //   }
          // });

          // if (noticeUserIds.indexOf(circleContent.post_user_id.toString()) == -1)
          //   noticeUserIds.push(circleContent.post_user_id.toString());

          if (resComment.is_only_to_content) {
            res.send({
              circleComment: resComment
            });
            socketClient.pushCircleComment([circleContent.post_user_id], resComment);
          } else {
            User.findById(resComment.target_user_id, {
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

                  socketClient.pushCircleComment([circleContent.post_user_id], resComment);
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
           * If the user who sends comment is already in the comment_users, only update the comment_num, appreciated and
           * latest_comment_date. Otherwise, using update function to add this user info to commment_users, then through the
           * numberAffected, we can decide whether using update function. Update the user info again when the numberAffected
           * is zero.
           */
          // var updateCommentUser = false;
          // for (var i = 0, commentUsersLen = circleContent.comment_users.length; i < commentUsersLen; i++) {
          //   var commentUser = circleContent.comment_users[i];
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
          //         'comment_users._id': {
          //           $ne: req.user.id
          //         }
          //       };

          //       var doc = {
          //         $set: {
          //           'latest_comment_date': circleComment.post_date
          //         },
          //         $push: {
          //           'comment_users': {
          //             _id: req.user._id,
          //             comment_num: 1,
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
          //           'comment_users._id': req.user.id
          //         };

          //         var doc = {
          //           $inc: {
          //             'comment_users.$.comment_num': 1
          //           },
          //           $set: {
          //             'comment_users.$.appreciated': req.body.kind === 'appreciate',
          //             'latest_comment_date': circleComment.post_date
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

    getCircleContent: function(req, res, next) {
      if (req.user.provider === 'company') {
        res.status(403).send({msg: '公司账号暂无朋友圈功能'});
        return;
      }

      var docs = {}, data = {};
      CircleContent.findById(req.params.contentId).exec()
      .then(function(circleContent) {
        if (!circleContent) {
          res.status(404).send({msg: '找不到该消息'});// TODO:提示文字需要改善
          return;
        }

        data.circleContent = circleContent.toObject();

        return Campaign.findById(circleContent.campaign_id, {
          _id: 1,
          theme: 1
        }).exec()
        .then(function(campaign) {
          if (campaign && campaign.theme) {
            data.circleContent.campaignTheme = campaign.theme;
          }

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
          pushUserIdToQueryIds(data.circleContent.post_user_id);
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

          res.send({circle: resData});

        });

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
              if (!comment) {
                return res.status(400).send({
                  msg: '评论已删除'
                });
              }
              res.status(200).send({
                msg: '评论删除成功'
              });
              // Update comment_users of circle content
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
                  'comment_users': {
                    '$elemMatch': {
                      '_id': req.user._id,
                      'comment_num': {
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
      if (!req.query.last_comment_date) {
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
          return comment.target_user_id;
        });
        userIdsForQuery = userIdsForQuery.concat(comments.map(function(comment) {
          return comment.post_user_id;
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
              var circleContentIndex = tools.arrayObjectIndexOf(data.contents, comment.target_content_id, '_id');
              comment.targetContent = data.contents[circleContentIndex];
              comment.poster = getUserById(comment.post_user_id);
              comment.target = getUserById(comment.target_user_id);
            });
            res.send(comments);
          })
          .then(null, next);
      });
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
     * @param  {Object} req:{
     *           query:{
     *             last_read_time: Date,
     *             last_comment_date: Date
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
      if (!req.query.last_read_time || !req.query.last_comment_date) {
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

    },
    /**
     * 删除消息列表
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    /**
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
    */
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
    {'cid':req.user.cid, 'status':'show', 'post_date':{'$gt':req.query.last_read_time}},
    {'post_user_id':1}
  )
  .sort('-post_date')
  .populate('post_user_id','photo')
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

  // filter
  if (!req.body.campaign_id) {
    res.status(400).send({
      msg: '参数不足'
    });
    return;
  }

  // auth
  Campaign.findById(req.body.campaign_id).exec()
    .then(function(campaign) {
      if (!campaign) {
        res.status(403).send({
          msg: '您没有权限'
        });
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
        res.status(403).send({
          msg: '您没有权限'
        });
        return;
      }

      var tid = campaign.campaign_type == 1 ? [] : campaign.tid;
      var relative_cids = campaign.cid;
      // 发消息用户所属小队id， 若为null, 则该消息为公司活动消息
      var post_user_tid = null;
      var campaign_unit = campaign.campaign_unit;
      var findUserTeam = false;
      for (var i = 0; i < campaign_unit.length && !findUserTeam; i++) {
        var members = campaign_unit[i].member;
        for (var j = 0; j < members.length; j++) {
          if (members[j]._id.toString() == req.user.id&&campaign_unit[i].team&&campaign_unit[i].team._id) {
            post_user_tid = campaign_unit[i].team._id.toString();
            findUserTeam = true;
            break;
          }
        }
      }
      // console.log(post_user_tid);
      // create
      var circleContent = new CircleContent({
        cid: req.user.getCid(), // 所属公司id
        tid: tid, // 关联的小队id(可选，不是必要的)
        campaign_id: campaign._id, // 关联的活动id(可选，不是必要的)
        post_user_id: req.user._id, // 发消息的用户的id（头像和昵称再次查询）
        post_user_tid: post_user_tid, // 发消息用户所属小队id
        relative_cids: relative_cids, // 参加同事圈消息所属的活动的所有公司id
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

    })
    .then(null, next);

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
              // 更新活动精彩瞬间数目
              Campaign.update({
                _id: circleContent.campaign_id
              }, {
                $inc: {
                  circle_content_sum: 1
                }
              }, function(err, numberAffected) {
                if(err) {
                  log(err);
                }
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
    'post_user_id': req.user.id,
    // 'post_date': {
    //   '$lte': req.query.latest_content_date
    // },
    'latest_comment_date': {
      '$gt': req.query.last_comment_date
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
          // post_user_cid: req.user.cid,
          target_content_id: {
            $in: content_ids
          },
          post_user_id: {
            $ne: req.user.id
          },
          post_date: {
            $gt: req.query.last_comment_date
          },
          status: {
            $ne: 'delete'
          },
          // $or: [
          //   {kind: {$ne: 'appreciate'}},
          //   {status: {$ne: 'delete'}}
          // ]
        })
        .sort('-post_date')
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

  var campaignIds = [];
  contents.forEach(function(content) {
    pushIdToUniqueArray(content.campaign_id, campaignIds);
  });

  // 查询content对应的活动，获取活动数据
  Campaign.find({
    _id: {$in: campaignIds}
  }, {
    _id: 1,
    theme: 1
  }).exec()
  .then(function(campaigns) {

    // 设置相应的活动主题
    contents.forEach(function(content) {
      for (var i = 0, campaignsLen = campaigns.length; i < campaignsLen; i++) {
        if (content.campaign_id && campaigns[i].id === content.campaign_id.toString()) {
          content.campaignTheme = campaigns[i].theme;
          break;
        }
      }
    });

    var contentIdsForQuery = contents.map(function(content) {
      return content._id;
    });

    return CircleComment.find({
      target_content_id: {$in: contentIdsForQuery},
      status: 'show'
    }).sort('+post_date').exec();

  })
  .then(function(commentDocs) {
    var comments = commentDocs.map(docToObject);

    var userIdsForQuery = []; // 元素为String类型

    contents.forEach(function(content) {
      pushIdToUniqueArray(content.post_user_id, userIdsForQuery);
    });

    comments.forEach(function(comment) {
      pushIdToUniqueArray(comment.post_user_id, userIdsForQuery);
      pushIdToUniqueArray(comment.target_user_id, userIdsForQuery);
    });

    queryData.comments = comments;

    return User.find({
      _id: {$in: userIdsForQuery}
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

    queryData.comments.forEach(function(comment) {
      addPosterInfoToObj(comment);
      addTargetInfoToComment(comment);
    });

    contents.forEach(function(content) {
      addPosterInfoToObj(content);

      // 将comments添加到对应的contents中
      var contentComments = queryData.comments.filter(function(comment) {
        return comment.target_content_id.toString() === content._id.toString();
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
