'use strict';

var mongoose = require('mongoose');
var Department = mongoose.model('Department'),
  Company = mongoose.model('Company'),
  CompanyGroup = mongoose.model('CompanyGroup'),
  User = mongoose.model('User'),
  donlerValidator = require('../services/donler_validator.js'),
  log = require('../services/error_log.js'),
  auth = require('../services/auth.js'),
  StackAndQueue = require('../tools/stack.js');
/**
 * 获取部门树的所有部门的_id，并push进数组中，返回该数组
 *
 * Example:
 * var list = getDepartmentId(company);
 * // list should be [_did1, _did2, ...]
 *
 * 注意: 如果参数department为company对象, 则也会将company._id认为是根节点_id放进返回的数组中
 *
 * @param  {Object} department 部门树的一个节点，可以是company对象
 * @return {Array}            部门的_id数组
 */
var getDepartmentId = function(department) {
  var ids = [department._id];
  if (department.department || department.department.length > 0) {
    for (var i = 0; i < department.department.length; i++) {
      ids = ids.concat(getDepartmentId(department.department[i]));
    }
  }
  return ids;
};


/**
 * 深度优先的方式操作部门树
 * @param  {Object} department 部门树的一个节点，可以是company对象
 * @param  {Function} operate  operate(department)对某一节点进行操作
 */
var doDepartment = function(department, operate) {
  operate(department);
  if (department.department || department.department.length > 0) {
    for (var i = 0; i < department.department.length; i++) {
      doDepartment(department.department[i], operate);
    }
  }
};

/**
 * 复制部门树(仅复制_id和name和level属性)
 * @param  {Object} company mongoose.model('company')
 * @return {Object}         仅包含_id,name,department属性的company对象
 */
var cloneDepartmentTree = function(company) {
  var clone = {
    _id: company._id,
    name: company.info.name,
    level:0
  };

  var _clone = function(departments) {
    var clone = [];
    for (var i = 0; i < departments.length; i++) {
      clone[i] = {
        _id: departments[i]._id,
        name: departments[i].name,
        level: departments[i].level
      };
      if (departments[i].department) {
        clone[i].department = _clone(departments[i].department);
      }
    }
    return clone;
  };

  clone.department = _clone(company.department);
  return clone;
};

/**
 * 返回部门树的详细数据
 * @param  {Object} company        company对象
 * @param  {Array} department_ids 部门_id数组
 * @param  {Object} res            res对象
 */
var sendDepartments = function(company, department_ids, res) {
  Department
  .where('_id').in(department_ids)
  .exec()
  .then(function(departments) {

    var departmentTree = cloneDepartmentTree(company);

    doDepartment(departmentTree, function(department) {
      for (var i = 0; i < departments.length; i++) {
        if (department._id.toString() === departments[i]._id.toString()) {
          department.manager = departments[i].manager;
          break;
        }
      }
    });
    res.send(departmentTree);
  })
  .then(null, function(err) {
    console.log(err);
    res.send(500);
  });
};
module.exports = function (app) {

  return {
    getDepartmentTree: function(req, res) {
      Company.findOne({
        _id: req.params.companyId,
        'status.active': true
      }).exec()
        .then(function (company) {
          if (!company) {
            res.sendStatus(404);
          } else {
            res.send({
              '_id': company._id,
              'name': company.info.name,
              'department': company.department
            });
          }
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    getDepartmentTreeDetail: function(req, res){
      if (req.user._id.toString() === req.params.companyId) {
        var department_ids = getDepartmentId(req.user);
        sendDepartments(req.user, department_ids, res);
      } else {
        Company
        .findById(req.params.companyId)
        .exec()
        .then(function(company) {
          if (!company) {
            return res.sendStatus(404);
          }
          var department_ids = getDepartmentId(company);
          sendDepartments(company, department_ids, res);
        })
        .then(null, function(err) {
          log(err);
          res.sendStatus(500);
        });
      }
    },

    createDepartment: function (req, res, next) {
      // todo 从yali原封不动移到这里，现在可用，但应该改进这部分代码
      var did = req.body.did;
      var name = req.body.name;
      var cid = req.body.cid;

      var role = auth.getRole(req.user, {
        companies: [cid]
      });
      var allow = auth.auth(role, ['operateDepartment']);
      if (!allow.operateDepartment) {
        res.status(403).send({ msg: '权限不足' });
        return;
      }

      var team_create = {
        'cid': req.user._id,
        'gid': '0',
        'group_type': 'virtual',
        'name':req.body.name,
        'cname': req.user.info.name,
        'entity_type': 'virtual'
      }
      CompanyGroup.create(team_create, function(err, company_group) {
        if (err || !company_group) {
          res.send({
            'msg': 'TEAM_CREATE_FAILURE'
          });
        } else {
          var department_create = {
            'parent_department': did,
            'name': name,
            'company': {
              '_id': req.user._id,
              'name': req.user.info.name,
              'logo': req.user.info.logo
            },
            'team': company_group._id
          };
          Department.create(department_create, function(err, department) {
            if (err || !department) {
              res.send({
                'msg': 'DEPARTMENT_CREATE_FAILURE'
              });
            } else {
              Company.findOne({
                '_id': req.user._id
              }, function(err, company) {
                if (err || !company) {
                  res.send({
                    'msg': 'DEPARTMENT_UPDATE_FAILURE'
                  });
                } else {
                  var child = {
                    '_id': department._id,
                    'level':0,
                    'name': name,
                    'department': []
                  };
                  var param = {
                    'type': 0,
                    'child': child
                  };
                  company.department = departmentFindAndUpdate(req.user, did, param).department;

                  company.save(function(err) {
                    if (err) {
                      res.send({
                        'msg': 'DEPARTMENT_UPDATE_FAILURE'
                      });
                    } else {
                      res.send({
                        '_id': req.user._id,
                        'name': req.user.info.name,
                        'department': company.department
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    },

    getDepartment: function (req, res, next) {
      Department.findOne({
        '_id': req.params.departmentId,
        'status':{'$ne':'delete'}
      }).populate('team').exec(function(err, department) {
        if (err || !department) {
          res.send(500, {
            'department': null
          });
        } else {
          res.send(200, {
            'department': department
          })
        }
      });
    },

    updateDepartment: function (req, res, next) {
      // todo 可用，但需要改进

      var did = req.body.did;
      var name = req.body.name;
      Company.findOne({
        '_id': req.user._id
      }, function(err, company) {
        if (err || !company) {
          res.send({
            'msg': 'DEPARTMENT_UPDATE_FAILURE'
          });
        } else {
          var param = {
            'type': 1,
            'name': name
          };
          company.department = departmentFindAndUpdate(req.user, did, param).department;
          company.save(function(err) {
            if (err) {
              res.send({
                'msg': 'DEPARTMENT_UPDATE_FAILURE'
              });
            } else {

              Department
                .findById(did)
                .populate('team')
                .exec()
                .then(function(department) {

                  var role = auth.getRole(req.user, {
                    companies: [department.company._id]
                  });
                  var allow = auth.auth(role, ['operateDepartment']);
                  if (!allow.operateDepartment) {
                    res.status(403).send({ msg: '权限不足' });
                    return;
                  }

                  department.name = name;
                  department.save(function(err) {
                    if (err) {
                      console.log(err);
                      res.send(500);
                    } else {
                      department.team.name = name;
                      department.team.save(function(err) {
                        if (err) {
                          console.log(err);
                          res.send(500);
                        } else {
                          User.update(
                            {'department._id': department._id},
                            {'department.name': name},
                            {'safe': false, 'multi': true},
                            function(err, users) {
                              if (err) {
                                console.log(err);
                                res.send(500);
                              } else {
                                res.send({
                                  'msg': 'DEPARTMENT_UPDATE_SUCCESS',
                                  '_id': company._id,
                                  'name': company.info.name,
                                  'department': company.department
                                });
                              }
                            });
                        }
                      });
                    }
                  });
                })
                .then(null, function(err) {
                  console.log(err);
                  res.send(500);
                });
            }
          });
        }
      });
    },

    deleteDepartment: function (req, res, next) {
      // todo 可用，但需要改进

      var did = req.params.departmentId;
      if (did.toString() === req.user._id.toString()) {
        //删除该公司下的所有部门
        deleteFromRoot(req.user, -1, req, res);
      } else {
        //删除某个部门以及其下所有子部门
        operateFromRootAndDeleteOne(did, req, res);
      }
    },
    joinDepartment: function (user, did,callback) {
      if(user.department) {
        departmentOperate({did:user.department._id,user:user,method:false},function () {
          departmentOperate({did:did,user:user,method:true},callback)
        })
      }
      else {
        departmentOperate({did:did,user:user,method:true},callback)
      }
    }

  }
};
var departmentOperate = function(options, callback){
  var did = options.did;
  var user = options.user;
  var method = options.method;
  var member = {
    _id: user._id,
    nickname: user.nickname,
    photo: user.photo,
    apply_status: 'pass'
  }
  var departmentOperate,teamOperate;
  //加入
  if(method) {
    teamOperate = departmentOperate = {
      '$push': {
        'member': member
      }
    }
  }
  //退出
  else {
    departmentOperate = {
      '$pull': {
        'member': {
          '_id': member._id
        },
        'manager':{'_id':member._id}
      }
    }
    teamOperate = {
      '$pull': {
        'member': {
          '_id': member._id
        },
        'leader':{'_id':member._id}
      }
    }
  }
  Department.findByIdAndUpdate({'_id':did},departmentOperate,function(err,department){
    if (err) {
      callback(err);
    }
    else if(!department){
      callback('not found');
    } else {
      CompanyGroup.findByIdAndUpdate({'_id':department.team},teamOperate,function(err,company_group){
        if(err){
          callback(err);
        } else if (!company_group) {
          callback('not found');
        }
        else{
          //加入
          if(method){
            user.department ={'_id':did,'name':department.name};
            user.team.push({'gid':'0','group_type':'virtual','entity_type':'virtual','_id':company_group._id,'name':company_group.name,'logo':company_group.logo})
          }
          //退出
          else{
            user.department = null;
          }
          user.save(function (err){
            if(err){
              callback(err);
            }else{
              callback(null)
            }
          });
        }
      });
    }
  });
}
function deleteFromRoot(department, seq, req, res) {
  var stack = new StackAndQueue.stack();
  var delete_ids = [];

  //删除某个部门以及其下的所有部门
  if (seq != -1) {
    delete_ids.push(department[seq]._id);
    stack.push({
      '_id': department[seq]._id,
      'department': department[seq].department
    });
    //删除公司下的所有部门
  } else {
    stack.push({
      '_id': department._id,
      'department': department.department
    });
  }
  while (!stack.isEmpty()) {
    var pop = stack.pop();
    if (pop.department.length > 0) {
      for (var i = 0; i < pop.department.length; i++) {
        //待删除的部门id
        delete_ids.push(pop.department[i]._id);
        stack.push(pop.department[i]);
      }
    }
  }

  //员工的部门、小队也要删掉
  Department.find({
    '_id': {
      '$in': delete_ids
    }
  }, function(err, departments) {
    var user_ids = [];
    var team_ids = [];
    if (departments && departments.length > 0) {

      // 权限判断
      var role = auth.getRole(req.user, {
        companies: [departments[0].company._id]
      });
      var allow = auth.auth(role, ['operateDepartment']);
      if (!allow.operateDepartment) {
        res.status(403).send({ msg: '权限不足' });
        return;
      }


      for (var i = 0; i < departments.length; i++) {
        for (var j = 0; j < departments[i].member.length; j++) {
          user_ids.push(departments[i].member[j]._id);
        }
        team_ids.push(departments[i].team);
      }

      User.update({
        '_id': {
          '$in': user_ids
        }
      }, {
        '$set': {
          'department': undefined
        },
        '$pull':{
          'team':{
            'gid':'0'
          }
        }
      }, {
        'multi': true
      }, function(err, users) {
        Department.update({
          '_id': {
            '$in': delete_ids
          }
        },{'$set':{'status':'delete'}},{'multi':true}, function(err, _department) {
          if (err || !_department) {
            return res.send({
              'msg': 'DEPARTMENT_DELETE_FAILURE',
              'department': []
            });
          } else {

            if (seq != -1) {
              department.splice(seq, 1);
            } else {
              req.user.department = [];
            }

            Company.findOne({
              '_id': req.user._id
            }, function(err, company) {
              if (err || !company) {
                res.send({
                  'msg': 'DEPARTMENT_DELETE_FAILURE',
                  'department': []
                });
              } else {
                company.department = req.user.department;
                company.save(function(err) {
                  if (err) {
                    res.send({
                      'msg': 'DEPARTMENT_DELETE_FAILURE',
                      'department': []
                    });
                  } else {
                    res.send({
                      'msg': 'DEPARTMENT_DELETE_SUCCESS',
                      '_id': req.user._id,
                      'name': req.user.info.name,
                      'department': company.department
                    });
                  }
                })
              }
            })
          }
        });
      });
    }
  });
}

function operateFromRootAndDeleteOne(did, req, res) {
  var stack = new StackAndQueue.stack();
  var find = false;
  //从根部开始找
  stack.push({
    '_id': req.user._id,
    'department': req.user.department
  });
  while (!stack.isEmpty() && !find) {
    var pop = stack.pop();
    if (pop.department.length > 0) {
      for (var i = 0; i < pop.department.length && !find; i++) {

        if (pop.department[i]._id.toString() === did.toString()) {
          find = true;

          //pop.department.splice(i,1);

          deleteFromRoot(pop.department, i, req, res);
          return;

        } else {
          stack.push(pop.department[i]);
        }

      }
    }
  }
  if (!find) {
    return res.send({
      'msg': 'DEPARTMENT_DELETE_SUCCESS',
      'department': req.user.department
    });
  }
}


//深度优先修改算法
//第一次传进来的是company
function departmentFindAndUpdate(department, did, param) {
  var stack = new StackAndQueue.stack();
  //如果department._id === did 就不用深搜了,直接在department的department里放入子部门
  if (department._id.toString() === did) {
    //操作
    switch (param.type) {
    case 0:
      param.child.parent_id = department._id;
      var parent_level = (department.level != undefined && department.level != null) ? department.level : 0;
      param.child.level = parent_level + 1;

      //console.log(parent_level);

      department.department.push(param.child);

      Department.update({'_id':param.child._id},{'$set':{'level':param.child.level}},function(err,department){
        if(!department){
          console.log({'msg':'DEPARTMENT_LEVEL_SET_NOT_FOUND'});
        }
        if(err){
          console.log({'msg':'DEPARTMENT_LEVEL_SET_ERROR','date':err});
        }
      });
      return department;
    case 1:
      if (department.department.name != undefined) {
        department.department.name = param.name;
      }
      return department;
    default:
      break;
    }
    //did肯定在department的子部门里,因此要深度搜索找到did对应的部门,在其department中放入子部门
  } else {
    stack.push({
      '_id': department._id,
      'department': department.department
    });
    while (!stack.isEmpty()) {
      var pop = stack.pop();
      if (pop.department.length > 0) {
        for (var i = 0; i < pop.department.length; i++) {
          if (pop.department[i]._id.toString() === did.toString()) {
            //操作
            switch (param.type) {
            case 0:
              param.child.level = pop.department[i].level + 1;
              param.child.parent_id = pop.department[i]._id;
              param.child.department = [];
              pop.department[i].department.push(param.child);

              //console.log(pop.department[i].level);

              Department.update({'_id':param.child._id},{'$set':{'level':param.child.level}},function(err,department){
                if(!department){
                  console.log({'msg':'DEPARTMENT_LEVEL_SET_NOT_FOUND'});
                }
                if(err){
                  console.log({'msg':'DEPARTMENT_LEVEL_SET_ERROR','date':err});
                }
              });
              return department;
            case 1:
              pop.department[i].name = param.name;
              return department;
            default:
              break;
            }
          } else {
            stack.push(pop.department[i]);
          }
        }
      }
    }
  }
  return department;
}
