'use strict';


var arrayObjectIndexOf = function(myArray, searchTerm, property) {
  var _property=property.split('.');
  for(var i = 0, len = myArray.length; i < len; i++) {
    var item=myArray[i];
    _property.forEach(function(_pro){
      item=item[_pro];
    });
    if (item.toString() === searchTerm.toString()) return i;
  }
  return -1;
};
exports.arrayObjectIndexOf = arrayObjectIndexOf;