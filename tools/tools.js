'use strict';

exports.arrayObjectIndexOf = function (myArray, searchTerm, property) {
  var _property = property.split('.');
  try {
    for (var i = 0, len = myArray.length; i < len; i++) {
      var item = myArray[i];
      _property.forEach(function (_pro) {
        item = item[_pro];
      });
      if (item.toString() === searchTerm.toString()) return i;
    }
  }
  catch (e){
    console.log(e)
    return -1;
  }
  return -1;
};

/**
 * 收集数组元素中的某几个属性，返回一个新数组
 * 示例:
 *  var array = [{
 *    key1: 1,
 *    key2: '2',
 *    key3: true
 *  }, {
 *    key1: 10,
 *    key2: '20',
 *    key3: false
 *  }];
 *  var res = collect(array, 'key1', 'key2');
 *  // res will be:
 *  // [{ key1: 1, key2: '2' }, { key1: 10, key2: '20' }]
 * @param {Array} array 目标数组
 * @param {String} attrs 需要收集的属性
 * @returns {Array} 收集后的数组
 */
exports.collect = function (array, attrs) {
  var toCollectAttrs = [];
  switch (arguments.length) {
  case 1:
    return array;
  case 2:
    toCollectAttrs = [attrs];
    break;
  case 3:
    for (var i = 1; i < arguments.length; i++) {
      toCollectAttrs.push(arguments[i]);
    }
    break;
  default:
    return;
  }

  var resArray = [];
  array.forEach(function (item) {
    var resItem = {};
    for (var i = 0; i < toCollectAttrs.length; i++) {
      var attr = toCollectAttrs[i];
      resItem[attr] = item[attr];
    }
    resArray.push(resItem);
  });
  return resArray;
};

/**
 * 收集数组某个属性到新数组中
 * 示例:
 *  var array = [{ k: 1 }, { k: 2 }, { k: 3 }];
 *  var res = flatCollect(array, 'k');
 *  // res will be:
 *  // [1, 2, 3]
 * @param {Array} array 目标数组
 * @param {String} attr 属性名
 * @returns {Array}
 */
exports.flatCollect = function (array, attr) {
  var resArray = [];
  array.forEach(function (item) {
    resArray.push(item[attr]);
  });
  return resArray;
};

/**
 * 随机生成一串只含字母和数字的字符串
 * @param  {Number} len 要生成的字符串的长度
 * @return {String}
 */
exports.randomAlphaNumeric = function (len) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomMax = possible.length;
  for(var i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * randomMax));
  }
  return text;
}


