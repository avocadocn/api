var path = require('path');
var util = require('util');

var common = require('./common.js');
var campaignBusiness = require(path.join(common.config.rootPath, 'business/campaigns.js'));

describe('business.campaign', function () {

  describe('formatRestTime', function () {

    var testFormatRestTime = function (start, end, expect) {
      var itemMsg = util.format('from %s to %s should return "%s"', start, end, expect);
      it(itemMsg, function () {
        var text = campaignBusiness.formatRestTime(new Date(start), new Date(end));
        text.should.equal(expect);
      });
    };

    testFormatRestTime('2015-01-01', '2015-01-10', '9天');
    testFormatRestTime('2015-01-01', '2015-01-03', '2天');
    testFormatRestTime('2015-01-01 0:00', '2015-01-03 6:00', '2天6小时');
    testFormatRestTime('2015-01-01 6:00', '2015-01-01 12:00', '6小时0分');
    testFormatRestTime('2015-01-01 6:00', '2015-01-01 6:50', '50分0秒');
    testFormatRestTime('2015-01-01 6:00:00', '2015-01-01 6:01:05', '1分5秒');
  });

});