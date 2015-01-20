// Copyright by ytoon, 2014-01-18.
// This file generates random datas for test. 
// 

'use strict'

var user   = require('./user-test.js');
var company   = require('./company-test.js');
var canmpaign   = require('./canmpaign-test.js');

var userNum = 1;
var companyNum = 10;
var campaignNum = 10;

exports.randomData = function() {
	user.randomUserData(userNum);
	company.randomCompanyData(companyNum);
	campaign.randomCampaignData(campaignNum);
}

exports.getCompanyData = function(callback) {
	fs.readFile('/data/company.txt', 'utf8', function(err, data) {
		var companys = data.split('\n');
		var result = [];
		for(var i = 0; i < companys.length - 1; i++) {
			var company = JSON.parse(companys[i]);
			result.push(company.email);
		}
		
		callback(null, result)
	});
}
