'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Company = mongoose.model('Company');
var ShortUrl = mongoose.model('ShortUrl');
var Feedback = mongoose.model('Feedback');
var Config = mongoose.model('Config');
var async = require('async');
var shortid = require('shortid');
var moment = require('moment');
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
var easemob = require('../../services/easemob.js');
var multerService = require('../../middlewares/multerService.js');
var path = require('path');
var smsService = require('../../services/sms_service.js');
var redisService = require('../../services/redis_service.js');
var redisPhoneValidate = redisService.redisPhoneValidate;
var isMobile = function(req) {
  var deviceAgent = req.headers["user-agent"].toLowerCase();
  return deviceAgent.match(/(iphone|ipod|ipad|android)/);
};


module.exports = {
    getCompanyByCid: function (req, res, next) {
      if (!req.body.cid) {
        res.status(400).send({ msg: 'cid不能为空' });
        return;
      }

      Company.findById(req.body.cid).exec()
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

    //验证是否是superadmin 中间件
    validateSuperAdmin: function(req, res, next) {
      if(req.user.isSuperAdmin(req.resourceUser.cid)) {
        next();
      }
      else {
        return res.status(403).send({msg:'权限不足'});
      }
    },
    //屏蔽用户
    close: function (req, res) {
      req.resourceUser.active = false;
      req.resourceUser.timeHash = new Date();
      req.resourceUser.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        easemob.user.deactivate(req.resourceUser._id);
        easemob.user.disconnect(req.resourceUser._id);
        res.sendStatus(204);
      });
    },

    //取消屏蔽
    open: function (req, res) {
      req.resourceUser.active = true;
      req.resourceUser.timeHash = new Date();
      req.resourceUser.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        easemob.user.activate(req.resourceUser._id);
        res.sendStatus(204);
      });
    },
    //短信邀请验证手机号
    validatePhones: function(req, res, next) {
      var phones = req.body.phones;
      //把不符合的手机号筛选掉
      for(var i = phones.length - 1; i>=0; i--) {
        if (!(/^(\+?0?86\-?)?1[345789]\d{9}$/).test(phones[i])) {
          phones.splice(i,1);
        }
      }
      if(phones.length) {
        next();
      }
      else {
        return res.status(400).send({msg:'手机号格式有误'});
      }
    },
    //生成短地址url
    generateInviteUrl: function(req, res, next) {
      Config.findOne({name: 'admin'}, function(err, config) {
        if(err) return res.status(500).send({msg:'设置查找失败'});
        else {
          var host = config.host.product;
          var url = 'http://' + host + '/signup?cid=' + req.user.cid + '&uid=' + req.user._id;
          //如果带着gid来就继续拼
          if(req.body.gid) {
            url.concat('&gid=' + req.body.gid);
          }
          shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');
          var shortCode =  shortid.generate();
          ShortUrl.findOne({shortId:shortCode}, function(err, shortId) {
            if(err) {
              log(err);
              return res.status(500).send({msg:'短id查找出错'});
            }
            else if(shortId) {
              //如果已存在，再生成一个
              shortCode = shortid.generate();
            }
            ShortUrl.create({
              shortId: shortCode,
              url: url
            }, function(err) {
              if(err) {
                log(err)
                return res.status(500).send({msg:'短网址生成出错'})
              };
              req.shortUrl = 'http://'+host+'/s/'+shortCode;
              next();
            });
          });
        }
      });
    },
    //发短信邀请
    inviteUser: function(req, res) {
      var phones = req.body.phones;
      async.map(phones, function(phone, callback) {
        smsService.sendInviteSMS(req.user, phone, req.shortUrl, callback);
      }, function(err, results) {
        if(err) log(err);
        return res.status(200).send({msg:'发送短信成功'});
      });
    },

    updateValidate: function(req, res, next) {
      if (req.headers['content-type'].indexOf('multipart/form-data') !== -1) {
        next();
        return;
      }

      donlerValidator({
        nickname: {
          name: '昵称',
          value: req.body.nickname,
          validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: [donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        realname: {
          name: '真实姓名',
          value: req.body.realname,
          validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        },
        introduce: {
          name: '简介',
          value: req.body.introduce,
          validators: [donlerValidator.maxLength(40)]
        },
        //暂时不让改手机号
        // phone: {
        //   name: '手机号码',
        //   value: req.body.phone,
        //   validators: ['number', donlerValidator.isLength(11)]
        // },
        qq: {
          name: 'qq',
          value: req.body.qq,
          validators: ['number']
        },
        birthday: {
          name: '生日',
          value: req.body.birthday,
          validators: ['date']
        },
        enrollment: {
          name: '入学时间',
          value: req.body.enrollment,
          validators: ['number']
        },
        // tag: {
        //   name: '标签',
        //   value: req.body.tag,
        //   validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        // },
      }, 'complete', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          return res.status(400).send({ msg: resMsg });
        }
      });
    },

    updatePhoto: function(req, res, next) {
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        next();
        return;
      }
      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/user/photo',
        success: function (url, oriName) {
          req.user.photo = path.join('/img/user/photo', url);
          req.updatePhoto = true;
          next();
        },
        error: function (err) {
          if (err.type === 'notfound') {
            next();
          } else {
            log(err);
            res.status(500).send({ msg: '服务器错误' });
          }
        }
      });
    },

    update: function(req, res) {
      var user = req.user;
      if (req.body.nickname) {
        user.nickname = req.body.nickname;
      }
      if (req.body.password) {
        if(user.authenticate(req.body.originPassword)) user.password = req.body.password;
        else
          return res.status(400).send({msg:'原密码填写错误'});
      }
      if (req.body.realname) {
        user.realname = req.body.realname;
      }
      // if (req.body.phone) {
      //   user.phone = req.body.phone;
      // }
      if (req.body.qq) {
        user.qq = req.body.qq;
      }
      if (req.body.birthday) {
        user.birthday = new Date(req.body.birthday);
      }
      if (req.body.pushToggle!==null) {
        user.push_toggle = req.body.pushToggle;
      }
      if (req.body.introduce!==null) {
        user.introduce = req.body.introduce;
      }
      if(req.body.tag) {
        var tag = req.body.tag;
        if(user.tags.indexOf(tag)===-1) user.tags.push(tag);
      }
      if(req.body.deleteTag) {
        var tag = req.body.deleteTag;
        var index = user.tags.indexOf(tag);
        if(index>-1) user.tags.splice(index, 1);
      }
      if(req.body.gender !== null) {
        user.gender = req.body.gender;
      }
      if(req.body.enrollment) {
        user.enrollment = req.body.enrollment;
      }
      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        // if(req.body.did && (!user.department || !user.department._id || user.department._id.toString()!= req.body.did)) {
        //   departmentController.joinDepartment(user,req.body.did,function (err) {
        //     if (err) {
        //       log(err);
        //       res.sendStatus(500);
        //       return;
        //     }
        //     else {
        //       res.sendStatus(200);
        //     }
        //   });
        // }
        // else {
          res.sendStatus(200);
        // }

      });
    },

    getCompanyUsers: function(req, res) {
      if(req.user.cid.toString() !== req.params.companyId)
        return res.sendStatus(403);
      var findOptions = {'cid':req.params.companyId, 'active':true};
      var outputOptions = {'nickname':1, 'photo':1, 'realname': 1, 'gender':1};
      var sortOption = req.query.freshman ? {'register_date':-1} : {'nickname':1};
      if(req.query.page) {
        var pageNum = 20;
        var page = req.query.page;
        User.paginate(findOptions, page, pageNum, function(err, pageCount, results, itemCount) {
          if(err){
            log(err);
            res.status(500).send({msg:err});
          }
          else{
            return res.send({'users':results,'maxPage':pageCount,'hasNext':pageCount>page});
          }
        },{columns:outputOptions, sortBy:sortOption});
      }
      else{
        if(req.query.from='admin' && req.user.isSuperAdmin(req.params.companyId)) {
          findOptions = {'cid':req.params.companyId};
          outputOptions.active = 1;
        }
        User.find(findOptions,outputOptions)
        .sort('nickname')
        .exec()
        .then(function (users){
          return res.status(200).send(users);
        })
        .then(null, function (err){
          log(err);
          return res.status(500).send({msg:'查询错误'});
        })
      }
    },

    forgetPassword: function(req, res) {
      User.findOne({phone:req.body.phone}, function(err, user) {
        if(err) {
          return res.status(500).send({msg:'服务器出错'});
        }
        if(!user) {
          return res.status(400).send({msg:'此手机号未注册过'});
        }
        redisPhoneValidate.getCode(req.body.phone, 'password').then(function(result) {
          if(req.body.code != result) {
            return res.status(400).send({msg:'验证码输入错误或已过期'});
          }
          if(req.body.password.length<6) {
            return res.status(400).send({msg: '密码长度不够'});
          }
          user.password = req.body.password;
          user.save(function(err) {
            if(err) {
              return res.status(500).send({msg:'服务器出错'});
            }
            else {
              return res.sendStatus(200);
            }
          })
        })
        .then(null, function(err) {
          log(err);
          return res.status(500).send({msg:'服务器出错'});
        })
      })
    },

    sendFeedback: function(req, res) {
      var feedback = new Feedback({
        user: req.user._id,
        content: req.body.content
      });
      //图片过滤
      multerService.formatPhotos(req.files, {getSize:false}, function(err, files) {
        var photos = [];
        if(files && files.length) {
          var now = new Date();
          var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
          var dir = path.join('/img/feedback', dateDirName)
          files.forEach(function(img) {
            var photo = {
              uri: path.join(dir, img.filename)
            };
            photos.push(photo);
          });
          feedback.photos = photos;
        }
        feedback.save(function(ferr) {
          if(ferr) {
            return res.status(500).send({msg:'反馈保存错误'});
          }
          else {
            return res.status(200).send({msg:'反馈发送成功'});
          }
        });
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
      var codeValidator = function(name, value, callback) {
        if(req.body.from === 'website') {
          redisPhoneValidate.getCode(req.body.phone, 'signup').then(function(result) {
            if(value == result) {
              callback(true);
            }
            else {
              callback(false, '验证码输入错误或已过期');
            }
          })
          .then(null, function(err) {
            log(err);
            callback(false, '验证码不正确');
          });
        }
        else {
          callback(true);
        }
      };
      donlerValidator({
        cid: {
          name: '学校id',
          value: req.body.cid,
          validators: ['required']
        },
        phone: {
          name: '手机号',
          value: req.body.phone,
          validators: ['required', 'phone', isUsedPhone]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        name: {
          name: '姓名',
          value: req.body.name,
          validators: ['required']
        },
        gender: {
          name: '性别',
          value: req.body.gender,
          validators: ['required']
        },
        enrollment: {
          name: '入学年份',
          value: req.body.enrollment,
          validators: ['enrollment']
        },
        smsCode: {
          name: '短信验证码' ,
          value: req.body.code,
          validators: [codeValidator]
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
    register: function (req, res) {
      var user = new User({
        phone: req.body.phone,
        username: req.body.phone,
        nickname: req.body.name,
        realname: req.body.name,
        cid: req.company._id,
        cname: req.company.info.name,
        company_official_name: req.company.info.official_name,
        password: req.body.password,
        gender: req.body.gender,
        enrollment: req.body.enrollment
      });
      if(req.file) {
        multerService.formatPhotos([req.file], {getSize:false}, function(err, files) {
          if(files && files.length) {
            var now = new Date();
            var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
            var dir = path.join('/img/user/photo', dateDirName)
            user.photo = path.join(dir, files[0].filename);
          }
        })
      }
      
      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.status(200).send({msg: '用户注册成功'});
        easemob.user.create({"username":user._id,"password":user._id, "nickname":req.body.name});
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
          if(!req.headers["x-api-key"] && !isMobile(req) && user.role!=="SuperAdmin") {
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
          req.session.uid = user.id;
          var oldToken = req.headers["x-access-token"];
          req.headers["x-access-token"] = token;
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
              oldToken && tokenService.redisToken.delete(oldToken)
                .then(null, console.log);
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
    refreshToken: function (req, res, next) {
      var token = req.headers['x-access-token'];
      tokenService.redisToken.refresh(token)
        .then(function(reply) {
          res.send({
            msg: '更新成功',
            newToken: token
          });
          req.session.touch();
        })
        .then(null, function(err) {
          var newToken = jwt.sign({
            type: "user",
            id: req.user._id.toString(),
            exp: req.app.get('tokenExpires') + Date.now()
          }, req.app.get('tokenSecret'));
          req.user.updateDeviceToken(req.headers['x-access-token'], newToken);
          req.user.save(function(err) {
            if (err) next(err);
            else {
              res.send({
                msg: '更新成功',
                newToken: newToken
              });
              req.session.touch();
            }
          });
        });
    },
    logout: function (req, res) {
      if (req.user.provider !== 'user') {
        res.sendStatus(403);
        return;
      }
      var token = req.headers['x-access-token'];
      req.user.removeDevice(req.headers);
      req.user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          req.session.destroy();
          res.sendStatus(204);
          tokenService.redisToken.delete(token)
            .then(null, console.log);
        }
      });
    },
    //todo
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
          var userData;
          if (user.cid.toString()===req.user.cid.toString()) {
            userData = {
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
              tids: user.getTids(req.user._id.toString()===req.params.userId ? 0 : 1)
            };
          } else {
            userData = {
              _id: user._id,
              nickname: user.nickname,
              photo: user.photo
            };
          }
          res.status(200).send(userData);
        })
        .then(null, next);
    },
    userInfoValidate: function(req, res) {
      var phone = req.body.phone;
      if(phone && (/^(\+?0?86\-?)?1[345789]\d{9}$/).test(phone)) {
        User.findOne({phone: phone}).exec().then(function(user) {
          if(user) {
            if(req.body.forgetValidate) {
              smsService.sendSMS(phone, 'password', function(err) {
                if(err) {
                  return res.status(500).send({active:false, msg:'发送短信失败'})
                }
                else {
                  return res.status(200).send({active:false, msg:'发送短信成功'});
                }
              })
            }
            return res.status(200).send({active: true, msg:'已注册'});
          }
          else {
            if(req.body.forgetValidate) {
              return res.status(400).send({active:false, msg:'未注册过'});
            }
            if(req.body.from === 'website') {
              smsService.sendSMS(phone, 'signup', function(err) {
                if(err) {
                  return res.status(500).send({active:false, msg:'发送短信失败'})
                }
                else {
                  return res.status(200).send({active:false, msg:'未注册过,发送短信成功'});
                }
              })
            }
            else {
              return res.status(200).send({active:false, msg:'未注册过'});
            }
          }
        })
        .then(null, function(err){
          log(err);
          return res.status(500).send({msg:'数据库查询出错'});
        });
      }
      else {
        return res.status(400).send({msg:'手机号填写错误'});
      }
    },
    // - 注释 by M 暂时不用验证，每次获取关注列表，无论发什么参数都返回自己的关注列表.
    // validateConcern: function (req, res, next) {
    //   donlerValidator({
    //     concern:{
    //       name: '关注人id',
    //       value: req.params.userId,
    //       validators: [donlerValidator.inDatabase('User', '关注者不存在')]
    //     }
    //   }, 'complete', function (pass, msg) {
    //     if(!pass) {
    //       var msg = donlerValidator.combineMsg(msg);
    //       return res.status(400).send({msg:msg});
    //     }
    //     else {
    //       next();
    //     }
    //   })
    // },
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
      var concern = req.user.concern;
      var concernIds = [];
      for(var i = concern.length-1; i>=0; i--) {
        concernIds.push(concern[i].user);
      }
      User.find({_id:{$in:concernIds}}, {interactionTime:1})
      .sort('-interactionTime')
      .exec()
      .then(function (users) {
        return res.status(200).send(users);
      })
      .then(null, function(err) {
        log(err);
        return res.status(500).send({msg:'获取用户错误'});
      });
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
    },
    getBirthDayUsers: function (req, res) {
      var day = moment().dayOfYear();
      // console.time('birthday')
      var aggregateOptions = [{
        $match: {
          'cid': mongoose.Types.ObjectId(req.user.cid),
          'birthday':{$exists:true}
        }
      },
      {
        $project:{
          nickname:'$nickname',
          photo:'$photo',
          birthday:'$birthday',
          day:{$dayOfYear:"$birthday"}
        }
      },
       {
        $match: {
          'day':{$gte:day,$lt:day+30}
        }
      }, {
        $sort: {
          'vote': -1,
          '_id': 1
        }
      }];
      User.aggregate(aggregateOptions).exec(function(err, users) {
        if (err) {
          log(err);
          return res.status(500).send({
            msg: '服务器错误'
          });
        }
        // console.timeEnd('birthday')
        return res.status(200).send(users);
      });
    }
};



