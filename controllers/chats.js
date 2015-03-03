'use strict';

var path = require('path'),
  fs = require('fs');
var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Chat = mongoose.model('Chat'),
  CompanyGroup = mongoose.model('CompanyGroup');

// var async = require('async');
var auth = require('../services/auth.js'),
    log = require('../services/error_log.js'),
    socketClient = require('../services/socketClient'),
    uploader = require('../services/uploader.js'),
    tools = require('../tools/tools.js');

var shieldTip = "该评论已经被系统屏蔽";

var updateUserChatroom = function(chatroomId, user, reqUserId, callback) {

}

module.exports = function (app) {

  return {
    canPublishChat: function (req, res, next) {
      //如果是这个队伍的人则能发
      var index = tools.arrayObjectIndexOf(req.user.chatrooms, req.params.chatroomId, '_id');
      if(index===-1) {
        return res.status(403).send({ msg: '权限错误'});
      }else {
        next();
      }
    },
    uploadPhotoForChat: function (req, res, next) {
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        next();
        return;
      }

      var imgSize;
      var randomId;
      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/photo_album',
        subDir: req.user.getCid().toString(),
        saveOrigin: true,
        getFields: function (fields) {
          if(fields.randomId) {
            randomId = fields.randomId[0];
            req.randomId = randomId;
          }
        },
        getSize: function (size) {
          imgSize = size;
        },
        success: function (url, oriName, oriCallback) {
          var now = new Date();
          var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
          oriCallback(path.join('/chat_ori_img', dateDirName), now.valueOf() ,function(err, ori_name) {
            if(err) {
              log(err);
            }else {
              req.photo = {
                uri: path.join('/img/chats', url),
                width: imgSize.width,
                height: imgSize.height,
                ori_uri: path.join('/chat_ori_img', dateDirName) + '/' + ori_name
              };
            }
            next();
          })
        },
        error: function (err) {
          log(err);
          res.sendStatus(500);
        }
      });

    },
    createChat: function (req, res, next) {
      var chat = new Chat({
        chatroom_id: req.query.chatroomId,
        content: req.body.content,
        poster: req.user._id,
        photos: [req.photo]
      });
      chat.save(function (err) {
        if(err) {
          log(err)
          return res.status(500).send({msg: '聊天保存失败'});
        }else {
          res.status(200).send({'chat': chat});
          //user更新
          // User.find({'cid': req.user.cid, 'chatrooms':chat.chatroom_id}, {''}, function())
          //socket推送
        }
      })      
    },

    getChatRooms: function (req, res, next) {

      var role = auth.getRole(req.user, {
        companies: [req.user.getCid()]
      });
      var allow = auth.auth(role, ['getChatRooms']);
      if (!allow.getChatRooms) {
        res.status(403).send({ msg: '抱歉，您没有权限做此操作。' });
        return;
      }

      var chatRoomIds = [];
      var chatRoomList = [];
      if (req.user.team) {
        chatRoomIds = req.user.team.map(function (team) {
          return team._id;
        });

        chatRoomList = req.user.team.map(function (team) {
          return {
            kind: 'team',
            _id: team._id,
            name: team.name,
            logo: team.logo
          };
        });
      }
      chatRoomIds.push(req.user.getCid());
      chatRoomList.push({
        kind: 'company',
        _id: req.user.cid,
        name: req.user.company_official_name
      });

      Chat.aggregate()
        .match({
          chatroom_id: chatRoomIds,
          status: 'active'
        })
        .sort('-create_date')
        .group({
          _id: '$chatroom_id',
          docs: {
            $first: '$$ROOT'
          }
        })
        .exec()
        .then(function (results) {
          chatRoomList.forEach(function (chatRoom) {
            var latestChat;
            for (var i = 0; i < results.length; i++) {
              if (chatRoom._id.toString() === results[i]._id.toString()) {
                latestChat = results[i].docs[0];
                break;
              }
            }

            chatRoom.latestChat = {
              _id: latestChat._id,
              content: latestChat.content,
              create_date: latestChat.create_date,
              poster: latestChat.poster,
              photos: latestChat.photos ? latestChat.photos.map(function (photo) {
                return {
                  uri: photo.uri,
                  width: photo.width,
                  height: photo.height
                };
              }) : null
            };
          });

          res.send({ chatRoomList: chatRoomList });
        })
        .then(null, function (err) {
          next(err);
        });
    }
  };

};