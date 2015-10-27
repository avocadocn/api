'use strict';
var CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
var randomString = function(length) {
  length = length || 4;
  var result='';
  for (var i = 0; i < length; i++) {
    result+=CHARS_LOWER[Math.round(Math.random()*25)]
  }
  return result;
}
var _school = {
  "status" : {active:true,verification:0},
  info: {
    name: "上海大学",               //公司全称
    city: {
      province: "上海市",
      city: "上海市",
      district: "宝山区"
    },
    address: "上海大学",
    brief: "上海大学",
    official_name: "上大",        //公司官方用户名（简称）
    logo:'/img/icons/default_company_logo.png',
    membernumber: 10,
    cover: '/img/company_cover.png'
  },
  register_date:new Date(),
  provider:'company',
  invite_key: "GRokm2b5",
};
db.companies.insert(_school);
var school = db.companies.findOne({"info.name":"上海大学"});
var phone = 18801910000;
var userFactory  = function(){
  phone++;
  return {
    username: phone.toString(),
    active: true,
    invited: false,
    hashed_password: "DczHy6TqH+xsMV78YtFIGLOqKGGVt2X7Q3RoDWo5LMNz3vMj9t5nJJz1SAA8jwTNS3ek07XDPNTBSDcV9sWeVA==",
    provider: 'user',
    salt: "z3HIf33DZy19QUqLb/Fwtg==",
    //头像
    photo: '/img/icons/default_user_photo.png',

    nickname: randomString(),
    realname: randomString(),
    gender: !!Math.round(Math.random()),
    birthday: new Date(1991,3,11),
    bloodType: 'AB',
    //个人简介
    introduce: "啦啦啦啦",
    //注册日期
    register_date: new Date(),
    //手机
    phone: phone.toString(),
    role: 'Student',
    //公司_id
    cid: school._id,
    cname: school.info.name, // 公司全称
    company_official_name: school.info.official_name, //公司简称
    disabled: false,
    push_toggle:false,
    //todo
    score: {
      // 积分总数
      total:  0
    },
    //修改个人基本资料时更新
    timeHash: new Date(),
    enrollment: 2010
  }
};
var users = [];
for (var i = 0; i < 10; i++) {
  users.push(userFactory());
};
db.users.insert(users);
var resultUsers = db.users.find({cid:school._id});
/**
 * 小队数据
 * @param  {[type]} type 0：公开，不需验证，1公开，验证，2不公开
 * @return {[type]}      [description]
 */
var teamFactory  = function(index,type){
  return {
    cid: school._id,
    cname: school.info.name, // 公司名称

    name: randomString(), // 群组名称

    logo: '/img/icons/default_group_logo.png',
    themeColor: "0000", // 群组主题颜色
    brief: randomString(10), // 群组简介
    open: type!=2,
    hasValidate: type!=0,
    level: Math.round(Math.random()),
    //0:未申请, 1:等待验证, 2:通过, 3:拒绝
    applyStatus:0,
    member: [{_id: resultUsers[index%10]._id,time: new Date()},{_id: resultUsers[(index+1)%10]._id,time: new Date()},{_id: resultUsers[(index+2)%10]._id,time: new Date()},{_id: resultUsers[(index+3)%10]._id,time: new Date()}], // 群组成员

    leader: resultUsers[(index)%10]._id,
    administrators: [resultUsers[(index+1)%10]._id],
    active: true,
    // 小队所属公司是否关闭(待用)
    companyActive: true,
    createTime: new Date(),
    score: {
      total: 0
    }
  }
};
var teams = [];
for (var i = 0; i < 10; i++) {
  teams.push(teamFactory(i,Math.floor(i/4)));
};
db.teams.insert(teams);
var resultTeams = db.teams.find({cid:school._id});
for (var i = 0; i < resultUsers.length(); i++) {
  var _teams=[];
  for(var j = 0;j<4;j++) {
    var index = (i-j+10)%10;
    _teams.push({
      _id: resultTeams[index]._id, //群组id
      leader: j==0,
      admin: j==1,
      public: resultTeams[index].open
    })
  }
  resultUsers[i].team = _teams;
  print(_teams)
  db.users.save(resultUsers[i])
};

// var interactionFactory  = function(option){
//   return {
//     cid:school._id,
//     //互动类型 1:'活动',2:'投票',3:'求助'
//     type:option.type,
//     //目标类型 1:'个人'（暂无）,2:'群',3:'公司'
//     targetType:option.targetType,
//     //目标
//     target:option.target,
//     createTime:new Date,
//     //参与人员
//     members: option,
//     //邀请参与人员
//     inviters: option.inviters,
//     //评论数
//     // commentCount: Number,
//     //状态 1:'正常',2:'结束',3:'删除'
//     status:1,
//     //发布者
//     poster: {
//       _id: option.poster._id,
//       role: 'user'
//     },
//     theme: randomString(),
//     content: randomString(10),
//     endTime: {
//       type: Date
//     },
//     tags: [String],
//     //对应内容的id Activity
//     activity: {
//       type: Schema.Types.ObjectId,
//       ref: 'Activity'
//     },
//     //对应内容的id Poll
//     poll: {
//       type: Schema.Types.ObjectId,
//       ref: 'Poll'
//     },
//     //对应内容的id Question
//     question: {
//       type: Schema.Types.ObjectId,
//       ref: 'Question'
//     },
//     relatedTeam: {
//       type: Schema.Types.ObjectId,
//       ref: 'Team'
//     },
//     //是否为空开，私有群发的为非公开
//     public: true,
//     offical: {
//       type: Boolean,
//       default: false
//     }
//   }
// };
