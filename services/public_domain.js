'use strict';
var publicDomains = ['126.com','qq.com','163.com','139.com','hotmail.com','sina.com', 'sina.cn','yeah.net','sohu.com','yahoo.com','yeah.net','gmail.com'];

// exports.getPublicDomains = function() {
//   return publicDomains;
// }

exports.isPublicDomain = function(domain) {
  return publicDomains.indexOf(domain) > -1;
}