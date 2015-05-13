var qr = require('qr-image'),
async = require('async'),
fs = require('fs'),
mkdirp = require('mkdirp');
var formatTimeDir = function () {
  var now = new Date()
  return now.getFullYear()+'-'+now.getMonth()+'/';
}
exports.generateCompanyQrcode = function (qrDir, fileName, qrText,callback) {
  var _formatDir = formatTimeDir();
  var relativeDir = '../yali/public';
  var finalSaveDir = qrDir +_formatDir;
  var finalRealDir = relativeDir+ finalSaveDir;
  var createQr = function () {
    var qrImg = qr.image(qrText, { type: 'png' });
    var finalDir =finalRealDir+fileName;
    var stream = fs.createWriteStream(finalDir)
    stream.on('error', function (error) {
      console.log("Caught", error);
      callback(error)
    });
    qrImg.pipe(stream);
    callback(null,finalSaveDir+fileName)
  }
  fs.exists(finalRealDir, function (isExists) {
    if (isExists) {
      createQr();
    }
    else {
      mkdirp(finalRealDir, createQr);
    }
  });
  
};