'use strict';

var mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Company = mongoose.model('Company'),
    Team = mongoose.model('Team'),
    Campaign = mongoose.model('Campaign'),
    Department = mongoose.model('Department');


//同步公司名
exports.updateCname =function (cid){
  Company.findOne({_id: cid}).exec().then(function(company){
    User.update({cid: cid},{$set:{cname:company.info.name}},{multi: true},function(err,num){
      if(err){
        console.log(err);
      }
    });
    Team.update({cid: cid},{$set:{cname:company.info.official_name}},{multi: true},function(err,num){
      if(err){
        console.log(err);
      }
    });
    // Campaign.update({'poster.cid': cid},{$set:{'poster.cname':company.info.official_name}},{multi: true},function(err,num){
    //   if(err){
    //     console.log(err);
    //   }
    // });
    // Campaign.update({'cid': cid},{$set:{'cname.$':company.info.official_name}},{multi: true},function(err,num){
    //   if(err){
    //     console.log(err);
    //   }
    // });
  }).then(null,console.log);
}

//同步用户昵称
exports.updateUname =function (uid){
  // User.findOne({_id: uid}).exec().then(function(user){
  //   CompanyGroup.update({'leader._id': uid},{$set:{'leader.$.nickname':user.nickname}},{multi: true},function(err,num){
  //     if(err){
  //       console.log(err);
  //     }
  //     else{
  //       console.log('updateUname_CompanyGroup_leader',num);
  //     }
  //   });
  //   CompanyGroup.update({'member._id': uid},{$set:{'member.$.nickname':user.nickname}},{multi: true},function(err,num){
  //     if(err){
  //       console.log(err);
  //     }else{
  //       console.log('updateUname_CompanyGroup_member',num);
  //     }
  //   });
  //   Department.update({'manager._id': uid}, {$set: {'manager.$.nickname':user.nickname}}, function(err, num) {
  //     if(err){
  //       console.log(err);
  //     }else{
  //       console.log('updateUname_Department_manager',num);
  //     }
  //   });
  // }).then(null,console.log);
}
//同步小队名称
exports.updateTname =function (tid){
  // Team.findOne({_id: tid}).exec().then(function(companyGroup){
  //   Company.update({'team.id': tid},{$set:{'team.$.name':companyGroup.name}},{multi: true},function(err,num){
  //     if(err){
  //       console.log(err);
  //     }
  //     else{
  //       console.log('updateTname_CompanyGroup',num);
  //     }
  //   });
  //   User.find({'team._id': tid},function(err,users){
  //     if(err){
  //       console.log(err);
  //     }
  //     else{
  //       users.forEach(function(value){
  //         for(var i=0; i < value.team.length; i++){
  //           if(value.team[i].gid === companyGroup.gid){
  //             if(value.team[i]._id.toString() === tid.toString()){
  //               value.team[i].name = companyGroup.name;
  //               value.save(function(err){
  //                 if(err){
  //                   console.log(err);
  //                 }
  //               });
  //             }
  //           }
  //         }
  //       });
  //     }
  //   });
  // }).then(null,console.log);
}

//同步用户logo
exports.updateUlogo =function (uid){
  // User.findOne({_id: uid}).exec().then(function(user){
  //   CompanyGroup.update({'leader._id': uid},{$set:{'leader.$.photo':user.photo}},{multi: true},function(err,num){
  //     if(err){
  //       console.log(err);
  //     }
  //     else{
  //       console.log('updateUlogo_CompanyGroup',num);
  //     }
  //   });
  //   CompanyGroup.update({'member._id': uid},{$set:{'member.$.photo':user.photo}},{multi: true},function(err,num){
  //     if(err){
  //       console.log(err);
  //     }else{
  //       console.log('updateUlogo_CompanyGroup_member',num);
  //     }
  //   });
  //   Department.update({'manager._id': uid}, {$set: {'manager.$.photo':user.photo}}, function(err, num) {
  //     if(err){
  //       console.log(err);
  //     }else{
  //       console.log('updateUlogo_Department_manager',num);
  //     }
  //   });
  // }).then(null,console.log);
};

//同步小队logo
exports.updateTlogo =function (tid){
  // CompanyGroup.findOne({_id: tid}).exec().then(function(companyGroup){
  //   User.find({'team._id': tid},function(err,users){
  //     if(err){
  //       console.log(err);
  //     }
  //     else{
  //       users.forEach(function(value){
  //         for(var i=0; i < value.team.length; i++){
  //           if(value.team[i].gid === companyGroup.gid){
  //             if(value.team[i]._id.toString() === tid.toString()){
  //               value.team[i].logo = companyGroup.logo;
  //               value.save(function(err){
  //                 if(err){
  //                   console.log(err);
  //                 }
  //               });
  //             }
  //           }
  //         }
  //       });
  //     }
  //   });
  // }).then(null,console.log);
}