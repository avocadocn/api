'use strict';

var mongoose = require('mongoose');
var PhotoAlbum = mongoose.model('PhotoAlbum');

var log = require('../services/error_log.js');
var auth = require('../services/auth.js');
var donlerValidator = require('../services/donler_validator.js');

module.exports = function (app) {
  return {

    createPhotoAlbumValidate: function (req, res, next) {
      donlerValidator({
        cid: {
          name: '相册所属的公司id',
          value: req.body.cid,
          validators: ['required']
        },
        tid: {
          name: '相册所属小队的id',
          value: req.body.tid,
          validators: ['required']
        },
        name: {
          name: '相册名字',
          value: req.body.name,
          validators: ['required', donlerValidator.maxLength(30)]
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    createPhotoAlbum: function (req, res) {
      var role = auth.getRole(req.user, {
        companies: [req.body.cid],
        teams: [req.body.tid]
      });
      var allow = auth.auth(role, ['createPhotoAlbum']);
      if (!allow.createPhotoAlbum) {
        res.sendStatus(403);
        return;
      }

      var photoAlbum = PhotoAlbum.New(req.body.name, {
        model: {
          _id: req.body.tid,
          type: 'CompanyGroup'
        },
        companies: [req.body.cid],
        teams: [req.body.tid]
      }, req.user);
      photoAlbum.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(201);
        }
      });

    },

    getPhotoAlbumsValidate: function (req, res, next) {
      donlerValidator({
        ownerType: {
          name: 'ownerType',
          value: req.query.ownerType,
          validators: ['required', donlerValidator.enum('team')]
        },
        ownerId: {
          name: 'ownerId',
          value: req.query.ownerId,
          validators: ['required']
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      })
    },

    getPhotoAlbums: function (req, res) {
      // 因为暂时req.query.ownerType只可能会是team，所以默认为team，直接查找小队相册
      PhotoAlbum.find({
        teams: req.query.tid,
        hidden: false
      }, {
        _id: 1,
        name: 1,
        update_date: 1,
        update_user: 1,
        photo_count: 1
      }).exec()
        .then(function (photoAlbums) {
          var resPhotoAlbums = [];
          photoAlbums.forEach(function (photoAlbum) {
            resPhotoAlbums.push({
              _id: photoAlbum._id,
              name: photoAlbum.name,
              updateDate: photoAlbum.update_date,
              updateUser: photoAlbum.update_user,
              photoCount: photoAlbum.photo_count
            });
          });
          res.status(200).send(resPhotoAlbums);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    }

  };
};