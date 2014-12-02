'use strict';

// mongoose models
var mongoose = require('mongoose'),
  Log = mongoose.model('Log');


//增加日志
exports.addLog = function(body){
  Log.create(body,function(err,error){
    if(err || !error){
      return {'msg':'ERROR_ADD_FAILED','result':0};
    } else {
      return {'msg':'ERROR_ADD_SUCCESS','result':1};
    }
  });
}