var LRU = require("./algorithm/LRU");
var LFU = require("./algorithm/LFU");

var lastAlgo = null, lastMaxsize = null;
var cache = null , queue = null;//定为二维数组

var generateQueue = function (buffer_name, name, maxsize) {
    var algorithm = {
        "LRU": LRU,
        "LFU": LFU
    };

    lastAlgo = name || "LRU";
    lastMaxsize = maxsize;

    var Queue = algorithm[name];
    return Queue.createQueue(maxsize);
}


var set = function (buffer_name, key, value, expire) {
    if(!cache[buffer_name])
        return null;
    var _cache = cache[buffer_name];
    var _queue = queue[buffer_name];
    // 如果已经存在该值，则重新赋值
    if (_cache&&_cache[key]) {

        // 重新赋值
        _cache[key].value = value;
        _cache[key].expire = expire;

        _queue.update(_cache[key].node);

    // 如果为新插入
    } else {

        // 更新索引
        var returnNode = _queue.insert(key);

        _cache[key] = {
            value: value,
            expire: expire,
            insertTime: +new Date(),
            node: returnNode.node
        }        


        returnNode.delArr.forEach(function (key) {
            _cache[key] = null;
        });
    }
}

var get = function (buffer_name, key) {
    if(cache[buffer_name]){
        var _cache = cache[buffer_name];
        var _queue = queue[buffer_name];
        
        // 如果存在该值
        if (_cache[key]) {
            var insertTime = _cache[key].insertTime;
            var expire = _cache[key].expire;
            var node = _cache[key].node;
            var curTime = +new Date();

            // 如果不存在过期时间 或者 存在过期时间但尚未过期
            if (!expire || (expire && curTime - insertTime < expire)) {

                // 已经使用过，更新队列
                _queue.update(node);

                return _cache[key].value;

            // 如果已经过期
            } else if (expire && curTime - insertTime > expire) {

                // 从队列中删除
                _queue.del(node);
                return null;
            }

        } else {
            return null;
        }
    }
    else
        return null;

}

var clear = function () {
    cache = {};
    queue = generateQueue(lastMaxsize, lastAlgo);
}

var print = function () {
    var _queue = queue;
    return _queue.print();
}

var createCache = function (buffer_name, alg_name, maxsize) {
    if (cache&&cache[buffer_name])
        return null;// 如果已经创建过了就不创建。
    if (!alg_name) alg_name = "LFU";
    if (!maxsize) maxsize = 100 * 100 * 10 *5; //开500K 每个链表100K 待调
    if(!obj){
        var obj =  {
            cache: {},
            queue: generateQueue(buffer_name, alg_name, maxsize/5),
            set: set,
            get: get,
            clear: clear,
            print: print
        }
    }

    obj.cache[buffer_name]={};
    obj.queue[buffer_name]=generateQueue(buffer_name, alg_name, maxsize);
    
    cache = obj.cache;
    queue = obj.queue;

    setInterval(function () {
        cache = obj.cache;
        queue = obj.queue;
        for(var i in cache){
            for (var key in cache[i]) {
                if (!cache[i][key]) continue;
                var insertTime = cache[i][key].insertTime;
                var expire = cache[i][key].expire;
                var curTime = +new Date();
                var node = cache[i][key]["node"];
                // 如果过期时间存在并且已经过期
                if (expire && curTime - insertTime > expire) {
                    queue[i].del(node);
                    cache[i][key] = null;
                }
            }
        }
    }, 1000*60*60);//60分钟清理一次,查询的时候如果过期，也是会删除的～

    return obj;
}

exports.createCache = createCache;
exports.set = set;
exports.get = get;