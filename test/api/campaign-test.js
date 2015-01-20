// Copyright by ytoon, 2014-01-18.
// This file is bulit for test and generates random campaign use cases. 
// 

'use strict';

var chance   = require('./chance.js');
var mongoose = require('mongoose');
var fs       = require('fs');

var Campaign = mongoose.model('Campaign')


/**
 * The function produce random campaign datas and insert them to the
 * MongoDB.
 *
 * /num: the number of datas that you want to produce and insert
 *
 **/
 exports.randomCampaignData = function(num) {
  fs.readFile('/data/company.txt', 'utf8', function(err, data) {
    var companys = data.split('\n');
    for(var i = 0; i < companys.length - 1; i++) {
      var company = JSON.parse(companys[i]);
      var id = [];
      id.push(company._id);
      //camp
      var _campaignUnit={
        company:{
          _id:company._id
        }
      };
      var campaignUnit = [];
      campaignUnit.push(_campaignUnit);

      for(var j = 0; j < num; j++) {
      chance.generateCampaignData(function(err, result) {
        var campaign = new Campaign({
    		cid: id,  
        campaign_unit: campaignUnit,                  
  		  theme: result.theme,
  		  content: result.content,
  		  member_min: result.memberMin,
  		  member_max: result.memberMax,
  		  start_time: result.startTime,
  		  end_time: result.endTime,
  		  deadline: result.deadline,
        active: true
        });
        
        // Insert campaign data to MongoDB
        campaign.save(function(err) {
          if(err) console.log(err);
          process.exit(0);
        });
        result.cid   = company._id;
        result.cname = company.name;
        result._id   = campaign._id;
        // Write random campaign data to campaign.txt
        fs.appendFile('/data/campaign.txt', JSON.stringify(result) + '\n', function(err) {
          if(err) throw err;
        });
        
      });
     }
    }
  });
}
