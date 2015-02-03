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

    getFormData: function(req, res, next) {
      // 如果不传照片就直接进入下一中间件
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        next();
        return;
      }

      var fieldName = 'photo';
      var form = new multiparty.Form({
        uploadDir: uploader.tempDir
      });

      form.parse(req, function(err, fields, files) {
        // if (options.getFields) {
        //   options.getFields(fields);
        // }
        // console.log(fields['tid'][0]);
        // console.log(fields['campaign_id']);
        if (err) {
          log(err);
          return;
        }

        if (!files[fieldName]) {
          log(err);

          // if (options.error) {
          //   options.error({
          //     type: 'notfound',
          //     msg: '没有收到文件' + options.fieldName
          //   });
          //   return;
          // }
        } else {
          req.imgFiles = files[fieldName];
          next();
        }
      });
    },

    uploadPhotoForContent: function(req, res, next) {
      if (!req.imgFiles) {
        // 不传照片的话直接到下一步
        next();
        return;
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
            callback(err);
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
     * [createCircleContent description]
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createCircleContent: function(req, res) {
      var tid = req.body.tid ? req.body.tid : [];
      var campaign_id = req.body.campaign_id ? req.body.campaign_id : null;
      var comment_users = [];
      comment_users.push(req.user._id);

      var photos = [];
      if (req.imgInfos) {
        req.imgInfos.forEach(function(imgInfo) {
          console.log(imgInfo);
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

        tid: tid, // 关联的小队id(可选，不是必要的)

        campaign_id: campaign_id, // 关联的活动id(可选，不是必要的)

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

          User.update({
            'cid': req.user.getCid(),
            'has_new_content': false
          }, {
            $set: {
              'has_new_content': true,
              'new_content_date': circleContent.post_date
            }

          }, {
            multi: true
          }, function(err, user) {
            if (!user) {
              console.log('no user');
            }
            if (err) {
              log(err);
              // return res.sendStatus(500);
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
     *               cid // 所属公司id
     *               tid: [Schema.Types.ObjectId], // 关联的小队id(可选，不是必要的)
     *               campaign_id: Schema.Types.ObjectId, // 关联的活动id(可选，不是必要的)
     *               content: String, // 文本内容(content和photos至少要有一个)
     *               photos: [], // 照片列表
     *               post_user_id: Schema.Types.ObjectId, // 发消息的用户的id（头像和昵称再次查询）
     *               post_date: type: Date,
     *               status: type: String,
     *               comment_users: [Schema.Types.ObjectId] // 参与过评论的用户id
     *               comments: [
     *                          ...Reference: Schema CircleComment
     *                         ]
     *           }
     *           ....
     *         ]
     */
    getCircleContents: function(req, res) {
      /**
       * Query the user who fits our conditions and
       * update the user's has_new_content(true->false)
       */
      User.findOneAndUpdate({
        has_new_content: true, // the field to show whether has new circle-contents
        _id: req.user._id
      }, {
        has_new_content: false
      }).exec().then(function(user) {
        if (!user) {
          return res.status(404).send({
            msg: '无新的同事圈消息'
          });
        }
        /**
         * If the user have new circle-contents, query the
         * circleContent with the key: cid and postdate.
         */
        circleContent.find({
          cid: user.cid,
          postdate: {
            $gte: new Date(user.new_content_date)
          },
          status: 'show'
        }).sort('-post_date').exec().then(function(contents) {
          /**
           * The following msg maybe not precise.
           * Resons:
           * (1)functions conflict (getCircleContents and createCircleContent).
           *    The user's has_new_content is true but contents is showed previously.
           * (2)If user delete circle-contents, only delete the relative info from
           *    CircleContent Schema and remain the has_new_content field of User Schema
           *    true.
           */
          if (!contents) {
            return res.status(404).send({
              msg: '未找到同事圈消息'
            }); // 
          } else {

            var resContent = [];
            contents.forEach(function(content) {
              CircleComment.find({
                target_content_id: content._id
              }).sort('-post_date').exec().then(function(comments) {
                // However the comments is null or not null, 
                // set the content's comments with it.
                content.comments = comments;
              }).then(null, function(err) {
                log(err);
                return res.sendStatus(500);
              });
              resContent.push(content);
            });
            return res.status(200).send(resContent);

          }
        }).then(null, function(err) {
          log(err);
          return res.sendStatus(500);
        });

      }).then(null, function(err) {
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
      CircleContent.findById(req.params.contentId).exec()
        .then(function(circlecontent) {
          if (!circlecontent) {
            return res.status(404).send({
              msg: '未找到同事圈消息'
            });
          } else {
            req.circlecontent = circlecontent;
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
            target_content_id: req.params.contentId
          }, {
            $set: {
              status: 'delete'
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
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createCircleComment: function(req, res) {

      CircleContent.findById(req.body.target_content_id).exec()
        .then(function(circleContent) {
          if (!circleContent) {
            return res.status(403).send({
              msg: '未找到同事圈消息'
            });
          }
          var relative_user_ids = [];
          var comment_users = [];

          var user = {
            _id: req.user._id,
            comment_num: 1
          };

          relative_user_ids.push(circleContent.post_user_id);

          circleContent.comment_users.forEach(function(_user) {
            relative_user_ids.push(_user._id);
            if (_user._id == req.user._id) {
              user.comment_num = _user.comment_num + 1;
            } else {
              comment_users.push(_user);
            }
          });
          comment_users.push(user);

          var circleComment = new CircleComment({
            // 类型，评论或赞
            kind: req.body.kind,

            content: req.body.kind == 'appreciate' ? null : req.body.content,

            // 是否仅仅是回复消息，而不是对用户
            is_only_to_content: req.body.is_only_to_content,

            // # 评论目标消息的id
            target_content_id: req.body.target_content_id,

            // 评论目标用户的id(直接回复消息则保存消息发布者的id)
            target_user_id: req.body.target_user_id,

            post_user_cid: req.user.cid, // 发评论或赞的用户的公司id

            post_user_id: req.user._id, // 发评论或赞的用户的id（头像和昵称再次查询)

            relative_user_ids: relative_user_ids
          });

          circleComment.save(function(err) {
            if (err) {
              log(err);
              return res.sendStatus(500);
            } else {
              res.status(200).send({
                msg: '评论或点赞成功'
              });

              var new_comment_user = {
                _id: req.user._id,
                photo: req.user.photo,
                nickname: req.user.nickname
              };

              relative_user_ids.forEach(function(user_id) {
                User.findByIdAndUpdate(
                  user_id, {
                    $inc: {
                      new_comment_num: +1
                    },
                    new_comment_user: new_comment_user
                  },
                  function(err) {
                    if (err) {
                      log(err);
                    }
                  });
              });

              CircleContent.findByIdAndUpdate(req.body.target_content_id, {
                comment_users: comment_users
              }, function(err) {
                log(err);
              });

            }

          });

        }).then(null, function(err) {
          log(err);
          return res.sendStatus(500);
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
            // Modify the feilds new_comment_num and new_comment_user
            // of User Schema after deleting the relative comment.
            comment.relative_user_ids.forEach(function(id) {
              User.findById(id, function(err, user) {
                if (user.new_comment_num > 1) {
                  User.findByIdAndUpdate(id, {
                    new_comment_num: user.new_comment_num - 1
                  }, function(err) {
                    log(err);
                  });
                  if (user.new_comment_num > 2) {
                    CircleComment.find({
                      relative_user_ids: user._id
                    }).sort('-post_date').limit(1).exec().then(function(comment) {
                      User.findById(post_user_id, function(err, user) {
                        if (err) {
                          log(err);
                        } else {
                          var new_comment_user = {
                            _id: user._id,
                            photo: user.photo,
                            nickname: user.nickname
                          };
                          User.findByIdAndUpdate(id, {
                            new_comment_user: new_comment_user
                          }, function(err) {
                            log(err);
                          });

                        }
                      });
                    }).then(function(null, err) {
                      log(err);
                    });
                  }
                }
              });

            });
            // Modify the field comment_users of CircleContent Schema after deleting the
            // relative comment. This action guarantees a user can't get new comments if
            // he/she deletes all the comments.
            CircleContent.findById(comment.target_content_id, function(err, content) {
              if (err) {
                log(err);
              }
              var comment_users = [];
              content.comment_users.forEach(function(user) {
                if (user._id == req.user._id) {
                  if (user.comment_num > 1) {
                    user.comment_num = user.comment_num - 1;
                    comment_users.push(user);
                  }
                } else {
                  comment_users.push(user);
                }
              });
              CircleContent.findByIdAndUpdate(comment.target_content_id, {
                comment_users: comment_users
              }, function(err) {
                if (err) {
                  log(err);
                }
              });
            });
          }
        });
    },

    /**
     * 员工用户获取是否有新评论、新朋友圈内容&消息
     * @param  {Object} req:{query:{has_new:string}}
     * @return {comments:boolean, reminds:number, new_content:boolean}
     */
    getReminds: function(req, res) {
      if (req.query.has_new !== 'true') {
        return res.status(422);
      }
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无提醒功能'
        });
      }
      var new_content = req.user.has_new_content; //是否有新的同事圈内容
      var reminds = req.user.new_comment_num;
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
      return res.status(200).send({
        comments: comments,
        reminds: reminds,
        new_content: new_content
      });
    }
  };
};