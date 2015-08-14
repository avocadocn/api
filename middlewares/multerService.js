var path = require('path');
var multer = require('multer');
var publicDir = path.join(__dirname, '../../yali/public/img/');

exports.upload = function(dest) {
  var destDir = path.join(publicDir,dest);
  var upload = multer({ dest: destDir });

  return upload;
}

exports.formatFiles = function(req, res, next) {

}