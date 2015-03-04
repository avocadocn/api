'use strict';

var async = require('async');
var chance = require('chance').Chance();

var common = require('../support/common');
var mongoose = common.mongoose;
var Chat = mongoose.model('Chat');

/**
 * 为公司创建讨论数据
 * example:
 *  var companyData = {
 *    model: doc,
 *    teams: [{
 *      model: doc,
 *      users: [doc],
 *      leaders: [doc],
 *      ...
 *    }],
 *    ...
 *  };
 *  createChats(companyData, function (err) {});
 *
 *  // 然后 companyData 将添加chats:
 *  companyData: {
 *    model: doc,
 *    teams: [{
 *      ...
 *      chats: [doc] // 5个。第1，2个是leaders[0]发的（如果有队长的话）；第3-5个是users[0]发的，之后随机
 *      // 如果没有队长也没有成员，则为空
 *    }],
 *    ...
 *    chats: [doc] // 30个
 *  }
 *
 * @param {Object} companyData
 */
var createChats = function (companyData, callback) {

  async.parallel({
    createTeamChats: function (parallelCallback) {
      async.map(companyData.teams, function (team, mapCallback) {
        createTeamChats(team, mapCallback);
      }, function (err, result) {
        parallelCallback(err);
      });
    },
    createCompanyChats: function (parallelCallback) {
      createCompanyChats(companyData, parallelCallback);
    }
  }, function (err, results) {
    callback(err);
  });

};

/**
 * 创建小队的chats
 * @param {Object} team companyData中的teams的单个元素
 * @param {Function} callback 形如function (err) {}
 */
function createTeamChats(team, callback) {
  if (team.leaders.length + team.users.length === 0) {
    callback();
    return;
  }
  team.chats = new Array(5);
  async.times(5, function (n, next) {
    var poster;
    if (n <= 1 && team.leaders.length > 0) {
      poster = team.leaders[0];
    } else {
      poster = team.users[0];
    }
    createChat(team.model._id, poster, function (err, chat) {
      team.chats[n] = chat;
      next();
    });
  }, function (err) {
    callback(err);
  });
}

/**
 * 创建公司管理的chats
 * @param {Object} companyData companyData
 * @param {Array} teams companyData中的teams
 * @param {Function} callback 形如function (err) {}
 */
function createCompanyChats(companyData, callback) {
  var leaders = [];
  companyData.teams.forEach(function (team) {
    leaders = leaders.concat(team.leaders);
  });
  if (leaders.length === 0) {
    callback();
    return;
  }
  companyData.chats = new Array(50);

  async.times(30, function (n, next) {
    var leaderIndex = chance.integer({ min: 0, max: leaders.length -1 });
    createChat(companyData.model._id, leaders[leaderIndex], function (err, chat) {
      companyData.chats[n] = chat;
      next();
    });
  }, function (err) {
    callback(err);
  });
}

/**
 * 创建单个chat
 * @param {ObjectId|String} chatRoomId 讨论组的id
 * @param {Object} poster 发表者(完整的user model)
 * @param {Function} callback 形如function (err, chat) {}
 */
function createChat(chatRoomId, poster, callback) {
  var chat = new Chat({
    chatroom_id: chatRoomId,
    content: 'test content',
    poster: poster._id
  });
  chat.save(function (err) {
    callback(err, chat);
  });
}

module.exports = createChats;
