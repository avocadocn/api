var registeredTasks = require('./tasks_description.js');

/**
 * 比较用户和资源的关系，获取对应的角色
 *  owner: {
 *    companies: [{Mongoose.Schema.Types.ObjectId|String}],(必需)
 *    teams: [{Mongoose.Schema.Types.ObjectId|String}],
 *    users: [{Mongoose.Schema.Types.ObjectId|String}]
 *  }
 *
 *  return role: {
 *    company: String, // 'hr' or 'other_hr' or 'member' or 'other_member'
 *    team: String, // 'leader' or 'member'
 *    user: String // 'self', 不是自己则没有此属性
 *  }
 *  对于公司用户，role只可能有company属性
 *  如果与资源的公司、小队、部门等无关，则不会有该属性，例如用户不是某相册资源所属的小队，则没有team属性
 * @param {Object} user req.user
 * @param {Object} owner 资源的所属者, 部门资源视为部门的组的资源
 * @return {Object} 返回一个角色对象
 */
var getRole = function (user, owner) {
  var role = {};
  if (!user) { return role; }

  if (user.provider === 'company') {
    if (owner.companies) {
      role.company = 'other_hr';
      for (var i = 0; i < owner.companies.length; i++) {
        if (user._id.toString() === owner.companies[i].toString()) {
          role.company = 'hr';
          break;
        }
      }
    }
  } else if (user.provider === 'user') {

    // 判断是否是公司成员
    if (owner.companies) {
      role.company = 'other_member';
      var cid = user.populated('cid') || user.cid;
      cid = cid.toString();
      for (var i = 0; i < owner.companies.length; i++) {
        if (cid === owner.companies[i].toString()) {
          role.company = 'member';
          break;
        }
      }
    }


    if (owner.teams) {
      // 判断是否是小队成员, 用户可能同属于这两个小队，所以owner.teams需要完全遍历
      for (var i = 0; i < owner.teams.length; i++) {

        for (var j = 0; j < user.team.length; j++) {
          if (user.team[j]._id.toString() === owner.teams[i].toString()) {
            if (user.team[j].leader === true) {
              role.team = 'leader';
            } else {
              role.team = 'member';
            }
            break;
          }
        }

        // 如果已确认是队长，则不再查找，保留权限最高的角色
        if (role.team && role.team === 'leader') {
          break;
        }
      }
    }

    // 判断是否是自己的资源
    if (owner.users) {
      for (var i = 0; i < owner.users.length; i++) {
        if (user._id.toString() === owner.users[i].toString()) {
          role.user = 'self';
          break;
        }
      }
    }


  }
  return role;
};


/**
 * 判断该角色是否能执行某些任务
 *
 * 例如:
 *  var allow = auth(role, tasks);
 *  allow: {
 *    uploadPhoto: true,
 *    createPhotoAlbum: false
 *  }
 *
 * @param {Object} role getRole方法返回的role对象
 * @param {Array} tasks 需要判断的任务列表, 例如:['uploadPhoto', 'createPhotoAlbum']
 * @return {Object} 返回一个任务名、是否可以执行的键值对
 */
var auth = function (role, tasks) {
  var taskCando = {};

  for (var i = 0; i < tasks.length; i++) {
    var taskName = tasks[i];
    var registeredTask = registeredTasks[taskName];

    if (typeof(registeredTask) === 'function') {
      taskCando[taskName] = registeredTask(role);
    } else {
      taskCando[taskName] = false;
      for (var key in role) {
        if (registeredTask[key] && registeredTask[key].indexOf(role[key]) !== -1) {
          taskCando[taskName] = true;
          break;
        }
      }

    }
  }
  return taskCando;
};

exports.getRole = getRole;
exports.auth = auth;
