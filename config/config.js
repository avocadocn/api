exports.PERMISSION = ['HR','LEADER','EMPLOYEE'];

exports.MAIL_OPTION = {
  host: 'smtp.ym.163.com',
  // secureConnection: true, // use SSL
  // port: 994 ,// port for secure SMTP  默认端口号:25  SSL端口号:994
  auth: {
    user: 'service@donler.com',
    pass: '55yali'
  }
};

exports.BASE_URL = 'http://127.0.0.1:3000';

exports.SECRET = '18801912891';

exports.CONFIG_NAME = 'admin';

exports.COMPANY_VALIDATE_TIMELIMIT = 72 * 3600 * 1000;

exports.COMPETITION_CONFIRM_TIMEOUT = 72 * 3600 * 1000;

exports.CAMPAIGN_STAY_HOUR = 24;

exports.PUSH_SECRET = 'dOnLeRHuAnGHeRoAd618'; //推送服务用到的密钥

exports.PUSH_ON = false;