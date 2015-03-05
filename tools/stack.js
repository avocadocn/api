'use strict';

//栈
exports.stack = function(){
  this.st = [];
  this.top = -1;
  this.init = function(){
    this.st = [];
    this.top = -1;
  }
  this.push = function(j){
    this.top++;
    this.st.push(j);
  }
  this.pop = function(){
    this.top--;
    return this.st.pop();
  }
  this.peek = function(){
    return this.st[this.top];
  }
  this.isEmpty = function(){
    return this.top === -1;
  }
}

//队列
exports.queue = function(){
  this.SIZE = 2000;
  this.que = [];
  this.front = 0;
  this.rear = -1;
  this.init = function(){
    this.que = [];
    this.front = 0;
    this.rear = -1;
  }
  this.insert = function(j){
    if(this.rear === this.SIZE-1) this.rear = -1;
    this.que.push(j);
    this.rear ++;
  }
  this.remove = function(){
    var tmp = this.que[this.front++];
    if(this.front === this.SIZE)this.front = 0;
    return tmp;
  }
  this.isEmpty = function(){
    return ((this.rear+1===this.front)||(this.front+this.SIZE-1==this.rear));
  }
}