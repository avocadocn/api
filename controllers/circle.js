'use strict';

var path = require('path'),
  fs = require('fs');
var multiparty = require('multiparty');
var mongoose = require('mongoose');
var CircleContent = mongoose.model('CircleContent'),
  CircleComment = mongoose.model('CircleComment'),
  User = mongoose.model('User'),
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
          msg: '公司账号暂无朋友圈功能'
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
        
        // Send error when don't have content and images
        if ((fields['content'] == undefined || !fields['content'][0]) && !files[fieldName]) {
          return res.sendStatus(500);
        }
        
        req.tid = (fields['tid'] && fields['tid'][0]) ? fields['tid'][0] : [];
        req.campaign_id = (fields['campaign_id'] && fields['campaign_id'][0]) ? fields['campaign_id'][0] : null;
        req.content = (fields['content'] && fields['content'][0]) ? fields['content'][0] : null;
        
        if (files[fieldName]) {
          req.imgFiles = files[fieldName];
        }
        next();
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

        // 所属公司id
        cid: req.user.getCid(),

        tid: req.tid, // 关联的小队id(可选，不是必要的)

        campaign_id: req.campaign_id, // 关联的活动id(可选，不是必要的)

        content: req.content, // 文本内容(content和photos至少要有一个)

        // 照片列表
        photos: photos,

        // 发消息的用户的id（头像和昵称再次查询）
        post_user_id: req.user._id,

        // // 参与过评论的用户id(包括发消息用户id)
        // comment_users: comment_users
      });
      
      circleContent.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '同事圈消息发送成功'
          });
          //发新朋友圈的push 应该push给公司所有人
          socketClient.pushCircleContent(req.user.getCid(), req.user);
          // Update the relative user's have_new_content status(if true, not update
          // ; if false, update has_new_content and new_content_date)
          // TODO: update user(add conditions: active, provider)
          User.update({
            'cid': req.user.getCid(),
            'has_new_content': {
              $in: [false, null]
            }
          }, {
            $set: {
              'has_new_content': true
            }

          }, {
            multi: true
          }, function(err) {
            if (err) {
              log(err);
            }
          });

        }
      });
    },
    /**
     * get the circle contents for user
     * TODO: get circle-comments while getting circle-content and comments sort by time
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
     *             comments: [
     *               ...Reference: Schema CircleComment
     *             ]
     *           }
     *           ....
     *         ]
     */
    getCircleContents: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无朋友圈功能'
        });
      }
      var options = {
        'cid': req.user.cid,
        'status': 'show'
      };

      if (req.query.last_content_date) { //如果带此属性来，则查找比它更早的limit条
        options.post_date = {
          '$lt': req.query.last_content_date
        };
      }

      var limit = req.query.limit || 20;
      
      CircleContent.find(options)
        .sort('-post_date')
        .limit(limit)
        .exec()
        .then(function(contents) {
          if (!contents) {
            return res.status(404).send({
              msg: '未找到同事圈消息'
            }); // 
          } else {
            async.map(contents, function(content, callback) {
                var result = {};
                CircleComment.find({
                  target_content_id: content._id,
                  status: 'show'
                }).sort('-post_date').exec().then(function(comments) {
                  result.content = content;
                  result.comments = comments;
                  callback(null, result);
                }).then(null, function(err) {
                  log(err);
                  callback(err);
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

      /**
       * Query the user who fits our conditions and
       * update the user's has_new_content(true->false)
       */
      if (req.user.has_new_content) {
        User.findOneAndUpdate({
          has_new_content: true, // the field to show whether has new circle-contents
          _id: req.user._id
        }, {
          has_new_content: false
        }, function(err) {
          if (err) {
            log(err);
          }
        });
      }

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
          msg: '公司账号暂无朋友圈功能'
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
     * Delete the circle-contents and if this content is other colleagues'
     * new message, don't update the fields has_new_content and
     * new_content_date of User Schema.
     * Warning: this function don't delete the user's upload-image and relative comments
     * when the user delete circle-contents.
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
     * TODO: check the body validate(kind, is_only_to_content, etc.)
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
      var companies = [];
      companies.push(circleContent.cid);
      var role = auth.getRole(req.user, {
        companies: companies
      });
      var allow = auth.auth(role, ['createCircleComment']);
      if (!allow.createCircleComment) {
        return res.status(403).send({
          msg: '权限错误'
        });
      }

      var relative_user = []; // the other commenters (exclude the current commenter) 
      var relative_user_ids = [];
      var comment_users = []; // the commenter (exclude the owner of content)
      // Generate relative_user
      if (req.user._id.toString() != circleContent.post_user_id.toString()) {
        relative_user_ids.push(circleContent.post_user_id);
        relative_user.push({
          _id: circleContent.post_user_id,
          list_status: 'show'
        });
      }

      circleContent.comment_users.forEach(function(user) {
        if (user._id.toString() != req.user._id.toString() && user.comment_num > 0) {
          relative_user_ids.push(user._id);
          relative_user.push({
            _id: user._id,
            list_status: 'show'
          });
        }
      });

      // Generate comment_users
      if (req.user._id.toString() == circleContent.post_user_id.toString()) {
        comment_users = circleContent.comment_users;
      } else {
        var new_comment_user = {
          _id: req.user._id,
          comment_num: 1
        };
        circleContent.comment_users.forEach(function(user) {
          if (user._id.toString() == req.user._id.toString()) {
            new_comment_user.comment_num = user.comment_num + 1;
          } else {
            comment_users.push(user);
          }
        });
        comment_users.push(new_comment_user);
      }
      
      var circleComment = new CircleComment({
        // 类型，评论或赞
        kind: req.body.kind,

        content: req.body.kind == 'appreciate' ? null : req.body.content,

        // 是否仅仅是回复消息，而不是对用户
        is_only_to_content: req.body.is_only_to_content,

        // # 评论目标消息的id
        target_content_id: req.params.contentId,

        // 评论目标用户的id(直接回复消息则保存消息发布者的id)
        target_user_id: !req.body.target_user_id ? circleContent.post_user_id : req.body.target_user_id,

        post_user_cid: req.user.cid, // 发评论或赞的用户的公司id

        post_user_id: req.user._id, // 发评论或赞的用户的id（头像和昵称再次查询)

        relative_user: relative_user
      });
      
      circleComment.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '评论或点赞成功'
          });

          socketClient.pushCircleComment(relative_user_ids, req.user.photo);
          
          var new_comment_user = {
            _id: req.user._id,
            photo: req.user.photo,
            nickname: req.user.nickname
          };
          // Update the feilds new_comment_user and new_comment_num of User Schema
          User.update({
            _id: {
              $in: relative_user_ids
            }
          }, {
            $set: {
              new_comment_user: new_comment_user
            },
            $inc: {
              new_comment_num: 1
            }

          }, function(err) {
            if (err) {
              console.log(err);
              log(err);
            }
          });
          // Update the feild comment_users of CircleContent Schema
          CircleContent.findOneAndUpdate({
            _id: req.params.contentId,
            status: 'show'
          }, {
            comment_users: comment_users
          }, function(err) {
            if(err) {
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
          return res.status(200).send({
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

              // Upadate new_comment_num
              var relative_user_ids = [];
              comment.relative_user.forEach(function(user) {
                relative_user_ids.push(user._id);
              });
              User.update({
                _id: {
                  $in: relative_user_ids
                },
                new_comment_num: {
                  $gte: 1
                }
              }, {
                $inc: {
                  new_comment_num: -1
                }
              }, function(err) {
                if (err) {
                  log(err);
                }
              });

              // Update comment_users of circle content
              // Reference: http://stackoverflow.com/questions/11184079/how-to-increment-mongodb-document-object-fields-inside-an-array
              CircleContent.update({
                  _id: comment.target_content_id,
                  'comment_users._id': req.user._id,
                  'comment_users.comment_num': {
                    $gte: 1
                  }
                }, {
                  $inc: {
                    'comment_users.$.comment_num': -1
                  }
                },
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
     * @param  {Object} req:{ query:{last_comment_date(optional):date ,limit:int} }
     * @return [comment]
     */
    getCircleComments: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无提醒功能'
        });
      }
      var options = {
        'post_user_cid': req.user.cid,
        'relative_user_ids': req.user._id
      };
      if (req.query.last_comment_date) { //如果带此属性来，则查找比它更早的limit条
        options.post_date = {
          '$lt': req.query.last_comment_date
        };
      }
      var limit = req.query.limit || 20;
      //先查出所有的评论
      CircleComment.find(options)
        .sort('-post_date')
        .limit(limit)
        .exec()
        .then(function(comments) {
          //再聚合所有的post_user、target_content_id
          var uids = [];
          var targetIds = [];
          var comments_length = comments.length;
          for (var i = 0; i < comments_length; i++) {
            uids.push(comments[i].post_user_id);
            targetIds.push(comments[i].target_content_id);
          };
          async.parallel({
            users: function(callback) { //获取所有人的昵称和头像
              User.find({
                'cid': req.user.cid,
                '_id': {
                  '$in': uids
                }
              }, {
                'nickname': 1,
                'photo': 1
              }, function(err, users) {
                if (err) callback(err);
                else callback(null, users);
              })
            },
            contents: function(callback) {//获取所有的circlecontent
              CircleContent.find({
                'cid': req.user.cid,
                '_id': {
                  '$in': targetIds
                },
                'status': 'show'
              }, {
                'content': 1,
                'photos': 1
              }, function(err, contents) {
                if (err) callback(err);
                else callback(null, contents);
              })
            }
          }, function(err, results) {
            if (err) {
              log(err);
              return res.status(500).send({
                msg: 'database err'
              });
            } else {
              //一个个赋值回去
              async.map(comments, function(comment, callback) {
                var posterIndex = tools.arrayObjectIndexOf(results.users, comment.post_user_id, '_id');
                var circleContentIndex = tools.arrayObjectIndexOf(results.contents, comment.target_content_id, '_id');
                var circle_comment = {
                  '_id': comment._id,
                  'kind': comment.kind,
                  'content': comment.content,
                  'targetContent': results.contents[circleContentIndex], //{_id,conent,photos}
                  'targetUserId': comment.target_user_id,
                  'poster': results.users[posterIndex], //{_id, nickname,photo}
                  'postDate': comment.post_date
                }
                callback(null,circle_comment);
              }, function(err, circleComments) {
                if (err) {
                  log(err);
                  return res.status(500).send({
                    msg: 'output err'
                  });
                } else {
                  return res.status(200).send(circleComments);
                }
              });
            }
          });
        })
        .then(null, function(err) {
          log(err);
          return res.status(500).send({
            msg: 'circleComments not found.'
          })
        });
    },

    /**
     * 获取同事圈消息列表
     * @param  {Object} req [description]
     * @return {}     [description]
     */
    //功能同getCircleComments
    // getCircleMessages: function(req, res) {

    // },

    /**
     * 员工用户获取是否有新评论、新朋友圈内容&消息(包括最新消息人的头像)
     * @param  {Object} req:{query:{has_new:string}}
     * @return {
     *           comments:boolean, 
     *           reminds:{number:int, user:{photo:uri}},
     *           new_content:{has_new:boolean, user:{photo:uri}}
     *         }
     */
    getReminds: function(req, res) {
      if (req.query.has_new !== 'true') {
        return res.status(422).send({msg:'参数错误'});
      }
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无提醒功能'
        });
      }
      var reminds = {number: req.user.new_comment_num};
      if(reminds.number) {
        reminds.user = { photo: req.user.new_comment_user.photo };
      }
      var comments = false;
      var length = req.user.commentCampaigns.length;
      for (var i = 0; i < length; i++) {
        if (req.user.commentCampaigns[i].unread > 0) {
          comments = true;
          break;
        }
      }
      if (!comments) {
        var length = req.user.unjoinedCommentCampaigns.length;
        for (var i = 0; i < length; i++) {
          if (req.user.unjoinedCommentCampaigns[i].unread > 0) {
            comments = true;
            break;
          }
        }
      }
      var new_content = {has_new:req.user.has_new_content};//是否有新的同事圈内容
      if(new_content.has_new) {
        CircleContent.find({'cid':req.user.cid, 'status':'show'},{'post_user_id':1})
        .sort('-post_date')
        .limit(1)
        .exec()
        .then(function(contents){
          User.findOne({'_id':contents[0].post_user_id}, {'photo':1}, function (err, user) {
            if(err) {
              log(err);
            }else{
              new_content.user = {photo: user.photo};
            }
            return res.status(200).send({
              comments: comments,
              reminds: reminds,
              new_content: new_content
            });
          });
        })
        .then(null, function (err) {
          log(err);
          return res.status(500).send({
            comments: comments,
            reminds: reminds,
            new_content: new_content
          });
        });
      }else {
        return res.status(200).send({
          comments: comments,
          reminds: reminds,
          new_content: new_content
        });
      }
    },
    /**
     * 删除消息列表
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    deleteRemindComment: function(req, res) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无提醒功能'
        });
      }

      var options = {
        'relative_user._id': req.user._id,
        'relative_user.list_status': 'show'
      };

      if (req.query.commentId) {
        options._id = req.query.commentId;
      }
      
      CircleComment.update(options, {
        $set: {
          'relative_user.$.list_status': 'delete'
        }
      }, function(err, num) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }
        if (num) {
          return res.status(200).send({
            msg: '消息列表删除成功'
          });

        }
        return res.status(404).send({
          msg: '未找到该消息'
        });
      });
    }
  };
};