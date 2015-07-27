var path = require('path');
var util = require('util');

var common = require('../../support/common.js');
var campaignBusiness = require(path.join(common.config.rootPath, 'business/campaigns.js'));
module.exports = function () {
  describe('campaign', function () {

    describe('formatTime', function () {

      var testFormatTime = function (start, end, expect) {
        var itemMsg = util.format('from %s to %s should return "%s %s %s"', start, end, expect.start_flag,expect.remind_text,expect.time_text);
        it(itemMsg, function () {
          var text = campaignBusiness.formatTime(new Date(start), new Date(end));
          text.should.eql(expect);
        });
      };
      var now = new Date().getTime();
      var seconds = 1000;
      var minutes = 60 * seconds;
      var hour = 60 * minutes;
      var day = 24 * hour;
      testFormatTime(now - day * 20, now - day * 10,  { remind_text: '活动已结束', start_flag: -1, time_text: '' });
      testFormatTime(now - day * 20, now + day,  { remind_text: '距离结束', start_flag: 1, time_text: '23时' });
      testFormatTime(now + day * 20, now + day *30, { remind_text: '距离开始', start_flag: 0, time_text: '19天' });
      testFormatTime(now + hour * 20, now + day, { remind_text: '距离开始', start_flag: 0, time_text: '19时' });
      testFormatTime(now + minutes * 20, now + day, { remind_text: '距离开始', start_flag: 0, time_text: '19分' });
    });
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
}