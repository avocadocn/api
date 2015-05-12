'use strict';
var publicDomains = ['126.com','qq.com','163.com','139.com','hotmail.com','sina.com', 'sina.cn','yeah.net','sohu.com','yahoo.com','yeah.com','gmail.com','189.cn','189.com','sogou.com','tianya.cn','tom.com','21cn.com','hexun.com','139.com','eastday.com','shangmail.com','outlook.com','ymail.com','live.com','msn.com','cntv.cn','me.com','icloud.com','china.com.cn','173.com'];

// exports.getPublicDomains = function() {
//   return publicDomains;
// }

exports.isPublicDomain = function(domain) {
  return publicDomains.indexOf(domain) > -1;
}