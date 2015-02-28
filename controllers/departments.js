'use strict';

var mongoose = require('mongoose');
var Department = mongoose.model('Department'),
    Company = mongoose.model('Company'),
    donlerValidator = require('../services/donler_validator.js'),
    log = require('../services/error_log.js'),
    auth = require('../services/auth.js');
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
    getDepartment: function(req, res) {
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
    }
  }
};