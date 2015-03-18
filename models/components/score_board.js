'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// var auth = require('../../services/auth');
var moment = require('moment'),
    mongoosePaginate = require('mongoose-paginate');

var ScoreBoard = new Schema({
  owner: {
    companies: [Schema.Types.ObjectId],
    teams: [Schema.Types.ObjectId]
  },
  host_type: {
    type: String,
    enum: ['campaign']
  },
  host_id: Schema.Types.ObjectId,
  // 长度能且仅能为2
  playing_teams: [{
    cid: Schema.Types.ObjectId,
    tid: Schema.Types.ObjectId, // 如果是公司活动，则没有此属性（现在不会出现这种情况，所有能用计分板的都是小队间的挑战）
    // 现在没有以公司为单位的挑战，所以以下两个属性都会是小队的属性
    name: String, // 实际参赛的队名，可能是公司名，也可能是小队名
    logo: String, // 实际参赛队伍的Logo，可能是公司的，也可能是小队的
    score: Number,
    result: Number, // 1：胜；0：平；-1：负
    confirm: {
      type: Boolean, // 是否确认，这个数据有利于做页面显示和确认比分时确定小队的逻辑判断。
      default: false
    }
  }],
  status: {
    type: Number, // 0: 初始状态（双方数据为空）；1，待确认（一方修改了比分，等待对方确认）；2，确认（同意了对方的修改）
    default: 0
  },
  logs: [{
    playing_team: {
      cid: Schema.Types.ObjectId,
      tid: Schema.Types.ObjectId
    }, // 如果同时编辑并确认，则无此属性
    // scores和results二者至少存在一个
    scores: [Number], // 长度能且仅能为2
    results: [Number], // 长度能且仅能为2
    confirm: Boolean, // 是否是确认比分
    date: {
      type: Date,
      default: Date.now
    }
  }],
  create_date: {
    type: Date,
    default: Date.now
  } // 创建日期，用于结合status判断比分板是否失效
});

// 是否失效，超过7天就设为失效
ScoreBoard.virtual('effective').get(function () {
  var days = moment().diff(this.create_date, 'days', true);
  if (Math.abs(days) > 7 && this.status !== 2) {
    return false;
  }
  return true;
});


ScoreBoard.statics = {

  /**
   * 创建组件
   * @param {Object} host 目前只允许是活动
   * @param {Function} callback callback(err, scoreBoard)
   */
  establish: function (host, callback) {
    var modelName = host.constructor.modelName;
    var playingTeams = [];
    switch (modelName) {
      case 'Campaign':
        var owner = {
          companies: host.cid,
          teams: host.tid
        };

        var host_type = 'campaign';
        var host_id = host._id;

        if (host.campaign_unit.length !== 2) {
          return callback('比分板只允许在两个队的比赛中使用');
        } else {
          // 现在能用比分板的活动一定会有team
          host.campaign_unit.forEach(function (unit) {
            playingTeams.push({
              cid: unit.company._id,
              tid: unit.team._id,
              name: unit.team.name,
              logo: unit.team.logo
            });
          });
        }

        break;
      default:
        return callback('比分板只允许在活动中使用');
    }
    var scoreBoard = new this({
      owner: owner,
      host_type: host_type,
      host_id: host_id,
      playing_teams: playingTeams
    });

    scoreBoard.save(function (err) {
      if (err) { return callback(err); }
      else { callback (null, scoreBoard); }
    });
  }
};

/**
 * 设置比分和胜负数据
 * @param {Object} scoreBoard
 * @param {Array} allowSetScore 是否可以设置比分
 * @param {Object} data
 *  data: {
 *    scores: [Number], // 可选
 *    results: [Number], // 可选
 *    // scores,results属性至少要有一个
 *  }
 */
var setScore = function (scoreBoard, allowSetScore, data) {
  var log = {};
  if (data.scores) {
    log.scores = data.scores;
  }
  if (data.results) {
    log.results = data.results;
  }

  var isAllLeader = true;
  for (var i = 0; i < scoreBoard.playing_teams.length; i++) {
    var playing_team = scoreBoard.playing_teams[i];

    if (data.scores) {
      playing_team.score = data.scores[i];
    }
    if (data.results) {
      playing_team.result = data.results[i];
    }

    if (allowSetScore[i]) {
      playing_team.confirm = true;
      log.playing_team = {
        cid: playing_team.cid,
        tid: playing_team.tid
      };
    } else {
      playing_team.confirm = false;
      isAllLeader = false;
    }
  }

  if (isAllLeader) {
    delete log.playing_team;
    scoreBoard.status = 2;
  } else {
    scoreBoard.status = 1;
  }

  scoreBoard.logs.push(log);
};
ScoreBoard.plugin(mongoosePaginate);
ScoreBoard.methods = {

  /**
   * 获取组件数据
   * @param {Object} user req.user
   * @param {Function} callback
   */
  getData: function (user, callback) {
    this.playing_teams.forEach(function (playing_team) {
      var allow = auth(user, {
        companies: [playing_team.cid],
        teams: [playing_team.tid]
      }, ['setScoreBoardScore']);
      if (allow.setScoreBoardScore) {
        playing_team.set('allowManage', true, {strict: false});
      } else {
        playing_team.set('allowManage', false, {strict: false});
      }
    });

    if (this.effective) {
      callback({
        playingTeams: this.playing_teams,
        status: this.status,
        effective: true
      });
    } else {
      callback({
        effective: false
      });
    }
  },

  /**
   * 初始化比分和胜负关系，会将状态改为1（待确认状态）。如果此时状态为1会阻止设置。
   * @param {Array} allowSetScore 是否允许设置比分
   * @param {Object} data 比分数据
   *  data: {
   *    scores: [Number], // 可选
   *    results: [Number], // 可选
   *    // scores,results属性至少要有一个
   *  }
   * @returns {String|undefined} 如果有错误，则返回错误信息
   */
  initScore: function (allowSetScore, data) {
    if (this.status === 1) {
      return '对方已设置了比分，请刷新页面进行确认。';
    } else if (this.status === 2) {
      return '抱歉，比分已确认，不可以再设置。';
    } else {
      setScore(this, allowSetScore, data);
    }
  },

  /**
   * 不同意对方设置的比分，重新设置
   * @param {Array} allowSetScore 是否允许设置比分
   * @param {Object} data 比分数据
   *  data: {
   *    scores: [Number], // 可选
   *    results: [Number], // 可选
   *    // scores,results属性至少要有一个
   *  }
   * @returns {String|undefined} 如果有错误，则返回错误信息
   */
  resetScore: function (allowSetScore, data) {
    if (this.status === 2) {
      return '抱歉，比分已确认，不可以再设置。';
    } else {
      setScore(this, allowSetScore, data);
    }
  },

  /**
   * 
   * @returns {String|undefined} 如果有错误，则返回错误信息
   */
  /**
   * 确认比分
   * @param  {[array]}   confirmIndex 有权限确认比分的阵营下标
   * @param  {Function} callback     回调函数
   * @return {[type]}                [description]
   */
  confirm: function (confirmIndex) {

    var log = {
      scores: [],
      results: [],
      confirm: true
    };
    for (var i = 0; i < confirmIndex.length; i++) {
      var playing_team = this.playing_teams[confirmIndex[i]];
      log.playing_team = {
        cid: playing_team.cid,
        tid: playing_team.tid
      };
      playing_team.confirm = true;
    }

    for (var i = 0; i < this.playing_teams.length; i++) {
      log.scores.push(this.playing_teams[i].score);
      log.results.push(this.playing_teams[i].result);
    }
    this.logs.push(log);
    this.status = 2;
  },

  /**
   * 获取设置比分的记录
   * example:
   *  var logs = scoreBoard.getLogs();
   *
   * logs: {
   *   text: String,
   *   date: String,
   *   teamName: String
   * }
   *
   * @return {Array} 返回一个对象数组
   */
  getLogs: function () {
    var self = this;
    var logs = [];

    var formatResult = function (result) {
      switch (result) {
      case 1:
        return '胜';
      case 0:
        return '平';
      case -1:
        return '败';
      default:
        return '';
      }
    };

    this.logs.forEach(function (log) {
      var newLog = {
        date: moment(log.date).format('YYYY-MM-DD HH:mm')
      };
      var scoreText = '';
      for (var i = 0; i < self.playing_teams.length; i++) {
        var team = self.playing_teams[i];
        if (log.playing_team.tid.toString() === team.tid.toString()) {
          newLog.teamName = team.name;
        }

        scoreText += (team.name + ' ' + log.scores[i] + ' ' + formatResult(log.results[i]));
        if (i === 0) {
          scoreText += ' : ';
        }
      }
      if (!log.confirm) {
        newLog.text = scoreText;
      } else {
        newLog.text = '确认了比分';
      }
      logs.push(newLog);
    });

    return logs;
  }


};

mongoose.model('ScoreBoard', ScoreBoard);

