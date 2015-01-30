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
        if(err) {
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
      var tid = req.tid ? req.params.tid : [];
      var campaign_id = req.campaign_id ? req.params.campaign_id : null;

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
        post_user_id: req.user._id
      });

      circleContent.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          User.update({
            'cid': req.user.getCid(),
            'has_new_content': false
          }, {
            'has_new_content': true,
            'new_content_date': circleContent.post_date
          }, {
            multi: true
          }, function(err, user) {
            if (err) {
              log(err);
              return res.sendStatus(500);
            } else {
              console.log('success');
              return res.status(200).send({msg: '同事圈消息发送成功'});
            }
          });

        }
      });
    },
    /**
     * get the circle contents for user
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
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
         * @key postdate must newer than user.new_content_date
         */
        circleContent.find({
          cid: user.cid,
          postdate: {
            $gte: new Date(user.new_content_date)
          },
          status: 'show'
        }).exec().then(function(contents) {
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
            return res.status(200).send(contents);
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
          return res.status(500);
        });
    },


    /**
     * Delete the circle-contents and if this content is other colleagues'
     * new message, don't update the fields has_new_content and 
     * new_content_date of User Schema.
     * Warning: this function don't delete the user's upload-image when the
     * user delete circle-contents.
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    deleteCircleContent: function(req, res) {
      CircleContent.update({
        _id: req.params.contentId
      }, {
        status: 'delete'
      }, function(err, contents){
        if(err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({msg: '同事圈消息删除成功'});
        }
      });
    },
    /**
     * [createCircleComment description]
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createCircleComment: function(req, res) {

    }

  };
};