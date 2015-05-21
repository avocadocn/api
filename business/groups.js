'use strict';

exports.getGroups = function (callback) {
  var groups = [
    { "_id" : "7", "groupType" : "足球", "entityType" : "FootBall" },
    { "_id" : "2", "groupType" : "篮球", "entityType" : "BasketBall" },
    { "_id" : "11", "groupType" : "跑步", "entityType" : "Running" },
    { "_id" : "1", "groupType" : "羽毛球", "entityType" : "Badminton" },
    { "_id" : "4", "groupType" : "自行车", "entityType" : "Bicycle" },
    { "_id" : "9", "groupType" : "健身", "entityType" : "Fitness" },
    { "_id" : "8", "groupType" : "k歌", "entityType" : "Ktv" },
    { "_id" : "10", "groupType" : "美食", "entityType" : "Food" },
    { "_id" : "5", "groupType" : "下午茶", "entityType" : "AfternoonTea" },
    { "_id" : "6", "groupType" : "棋牌", "entityType" : "Chess" },
    { "_id" : "3", "groupType" : "阅读", "entityType" : "Reading" },
    { "_id" : "12", "groupType" : "亲子", "entityType" : "Kids" },
    { "_id" : "13", "groupType" : "影视", "entityType" : "Movie" },
    { "_id" : "14", "groupType" : "摄影", "entityType" : "Photography" },
    { "_id" : "15", "groupType" : "旅行", "entityType" : "Travel" },
    { "_id" : "16", "groupType" : "桌游", "entityType" : "BoardGame" },
    { "_id" : "17", "groupType" : "其他", "entityType" : "Other" }
  ];
  callback(groups);
}