'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Company = mongoose.model('Company');

var log = require('../../services/error_log.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    uploader = require('../../services/uploader.js'),
    tools = require('../../tools/tools.js'),
    auth = require('../../services/auth.js');
var publicDomain = require('../../services/public_domain.js');
var emailService = require('../../services/email.js');
var multiparty = require('multiparty');
var tokenService = require('../../services/token.js');
var jwt = require('jsonwebtoken');
var isMobile = function(req) {
  var deviceAgent = req.headers["user-agent"].toLowerCase();
  return deviceAgent.match(/(iphone|ipod|ipad|android)/);
};

module.exports = {
      /**
     * 解析注册用户formData
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    getFormData: function(req, res, next) {
      var fieldName = 'photo';
      var form = new multiparty.Form({
        uploadDir: uploader.tempDir
      });

      form.parse(req, function(err, fields, files) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }
        req.userInfo = {};

        req.userInfo.cid = (fields['cid'] && fields['cid'][0]) ? fields['cid'][0] : undefined; // 学校id
        req.userInfo.phone = (fields['phone'] && fields['phone'][0]) ? fields['phone'][0] : undefined; // 用户手机号
        req.userInfo.name = (fields['name'] && fields['name'][0]) ? fields['name'][0] : undefined; // 用户昵称(姓名)
        req.userInfo.password = (fields['password'] && fields['password'][0]) ? fields['password'][0] : undefined; // 用户密码
        req.userInfo.gender = (fields['gender'] && fields['gender'][0]) ? fields['gender'][0] : undefined; // 用户性别
        req.userInfo.enrollment = (fields['enrollment'] && fields['enrollment'][0]) ? fields['enrollment'][0] : undefined; // 用户入学年份

        req.photoFile = (files['photo'] && files['photo'][0].originalFilename) ? files['photo'][0] : undefined; // 用户头像
        
        next();
      });
    },
    getCompanyByCid: function (req, res, next) {
      if (!req.userInfo.cid) {
        res.status(400).send({ msg: 'cid不能为空' });
        return;
      }

      Company.findById(req.userInfo.cid).exec()
        .then(function (company) {
          if (!company) {
            res.status(400).send({ msg: '没有找到对应的学校' });
          } else {
            req.company = company;
            
            next();
          }
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    registerValidate: function (req, res, next) {
      var isUsedPhone = function (name, value, callback) {
        User.findOne({ phone: value }).exec()
          .then(function (user) {
            if (user) {
              callback(false, '该手机号已被注册');
              return;
            }
            callback(true);
          })
          .then(null, function (err) {
            log(err);
            callback(false, '服务器错误');
          });
      };

      donlerValidator({
        cid: {
          name: '学校id',
          value: req.userInfo.cid,
          validators: ['required']
        },
        phone: {
          name: '手机号',
          value: req.userInfo.phone,
          validators: ['required', 'phone', isUsedPhone]
        },
        password: {
          name: '密码',
          value: req.userInfo.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        name: {
          name: '姓名',
          value: req.userInfo.name,
          validators: ['required']
        },
        gender: {
          name: '性别',
          value: req.userInfo.gender,
          validators: ['required']
        },
        enrollment: {
          name: '入学年份',
          value: req.userInfo.enrollment,
          validators: ['enrollment']
        }
      }, 'complete', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },
    /**
     * 上传头像
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    uploadPhotoForUser: function(req, res, next) {
      if (!req.photoFile) {
        // 不传照片的话直接到下一步
        next();
        return;
      }

      uploader.uploadImage(req.photoFile, {
        targetDir: '/public/img/user/photo',
        saveOrigin: true,
        getSize: true,
        success: function(imgInfo, oriCallback) {
          req.userInfo.photo = imgInfo.url;
          next();
        },
        error: function(err) {
          log(err);
          return res.status(500).send({
            msg: '服务器错误'
          });
        }
      });
    },
    register: function (req, res) {
      var user = new User({
        phone: req.userInfo.phone,
        username: req.userInfo.phone,
        nickname: req.userInfo.name,
        realname: req.userInfo.name,
        cid: req.company._id,
        cname: req.company.info.name,
        password: req.userInfo.password,
        gender: req.userInfo.gender,
        enrollment: req.userInfo.enrollment
      });

      if (req.userInfo.photo) {
        user.photo = req.userInfo.photo;
      }
      
      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.status(200).send({msg: '用户注册成功'});
      });
    },

    login: function (req, res) {
      if (!req.body || !req.body.phone || !req.body.password) {
        return res.status(400).send({ msg: '缺少账户或密码' });
      }

      User.findOne({
        phone: req.body.phone
      }).exec()
        .then(function (user) {
          if (!user) {
            return res.status(401).send({ msg: '账号不存在,请检查或注册。' });
          }

          if (!user.authenticate(req.body.password)) {
            return res.status(401).send({ msg: '密码输入错误,请检查重试。' });
          }

          // if(!user.mail_active) {
          //   return res.status(401).send({ msg: '账号未激活,请至邮箱点击链接激活。' });
          // }

          if(!user.active) {
            return res.status(401).send({ msg: '您的账号已被管理员禁用。' });
          }

          if(user.disabled) {
            return res.status(401).send({ msg: '账号已被关闭。'})
          }
          //登录网站，则只能管理员（大使，社团管理员）进行登录,app登录没有现在
          if(!req.headers["x-api-key"] && !isMobile(req) && user.role!=="SuperAdmin" &&!user.isAdmin()) {
            return res.status(401).send({ msg: '您不是管理员无法进行登录管理界面'})
          }
          // if(!user.cid.status.active) {
          //   return res.status(401).send({ msg: '你的账号所属学校已被关闭。'})
          // }
          var payload = {
            type: "user",
            id: user._id.toString(),
            exp: req.app.get('tokenExpires') + Date.now()
          };
          var token = jwt.sign(payload, req.app.get('tokenSecret'));
          var pushInfo = req.body.pushInfo ||{};
          user.addDevice(req.headers, token, pushInfo);
          user.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              res.status(200).send({
                token: token,
                id:user._id,
                cid:user.cid,
                role:user.role
              });
              tokenService.redisToken.create(token, payload)
                .then(null, console.log);
            }
          });

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    getUserById: function (req, res, next) {
      //获取免打扰开关
      if(req.query.responseKey==='pushToggle') {
        var user = {'pushToggle' : req.user.push_toggle};
        return res.status(200).send(user);
      }

      //非获取免打扰
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send({ msg: "找不到该用户" });
          }
          var role = auth.getRole(req.user, {
            companies: [user.cid],
            users: [user._id]
          });
          var allow = auth.auth(role, ['getUserCompleteData', 'getUserBriefData', 'getUserMinData']);
          if (allow.getUserCompleteData) {
            var completeData = {
              _id: user._id,
              active:user.active,
              mail_active:user.mail_active,
              email: user.email,
              nickname: user.nickname,
              photo: user.photo,
              realname: user.realname,
              department: user.department,
              gender: user.gender,
              birthday: user.birthday,
              bloodType: user.bloodType,
              introduce: user.introduce,
              registerDate: user.register_date,
              phone: user.phone,
              qq: user.qq,
              company: {
                _id: user.cid,
                name: user.company_official_name,
                briefName: user.cname
              },
              tids: user.getTids(0),
              score: user.score.total || 0,
              tags: user.tags,
              team: user.teams
            };
            res.status(200).send(completeData);
          } else if (allow.getUserBriefData) {
            var tids = [];
            user.team.forEach(function (team) {//不拿部门和公司
              if(team.entity_type!='virtual') tids.push(team._id);
            });
            var briefData = {
              _id: user._id,
              email: user.email,
              nickname: user.nickname,
              photo: user.photo,
              realname: user.realname,
              department: user.department,
              gender: user.gender,
              birthday: user.birthday,
              bloodType: user.bloodType,
              introduce: user.introduce,
              company: {
                _id: user.cid,
                name: user.company_official_name,
                briefName: user.cname
              },
              phone: user.phone,
              qq: user.qq,
              score: user.score.total || 0,
              tags: user.tags,
              campaignCount: user.campaignCount || 0,
              tids: user.getTids(1)
            };
            res.status(200).send(briefData);
          } else if (allow.getUserMinData) {
            var minData = {
              _id: user._id,
              nickname: user.nickname,
              photo: user.photo
            };
            res.status(200).send(minData);
          } else {
            res.sendStatus(403);
          }

        })
        .then(null, next);
    },

    validateConcern: function (req, res, next) {
      donlerValidator({
        concern:{
          name: '关注人id',
          value: req.params.userId,
          validators: [donlerValidator.inDatabase('User', '关注者不存在')]
        }
      }, 'complete', function (pass, msg) {
        if(!pass) {
          var msg = donlerValidator.combineMsg(msg);
          return res.status(400).send({msg:msg});
        }
        else {
          next();
        }
      })
    },
    addConcern: function (req, res) {
      if(req.params.userId === req.user._id.toString()) {
        return res.status(400).send({msg: '无法关注自己'});
      }
      var newConcern = {
        user: req.params.userId,
        createTime: new Date()
      }
      if(!req.user.concern) {
        req.user.concern = [newConcern];
      }
      else {
        var index = tools.arrayObjectIndexOf(req.user.concern, req.params.userId, 'user');
        if(index === -1) {
          req.user.concern.push(newConcern);
        }
        else {
          return res.status(200).send({msg:'已关注过'});
        }
      }
      req.user.save(function(err) {
        if(err) {
          log(err);
          return res.status(500).send({msg:'保存出错'});
        }
        else{
          return res.status(200).send({msg:'添加关注成功'});
        }
      });
    },
    getConcern: function (req, res) {
      //暂时只能获取自己的
      return res.status(200).send(req.user.concern);
    },
    deleteConcern: function (req, res) {
      var index = -1;
      if(req.user.concern){
        index = tools.arrayObjectIndexOf(req.user.concern, req.params.userId, 'user');
      }
      if(index>-1) {
        req.user.concern.splice(index,1);
        req.user.save(function (err) {
          if(err) {
            log(err);
            return res.status(500).send({msg:'保存出错'});
          }
          else{
            return res.status(200).send({msg:'取消关注成功'});
          }
        });
      }
      else {
        return res.status(200).send({msg:'取消关注成功'});
      }
    }
};