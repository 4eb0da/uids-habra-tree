document.addEventListener('DOMContentLoaded', function(){
  "use strict";
  
  var Promise = function() {
    this._callbacks = [];
  };
  var PROMISE_STATUS = {
    NOT_READY: 0,
    FAIL: 1,
    SUCCESS: 2
  };
  
  Promise.prototype = {
    _status: PROMISE_STATUS.NOT_READY,
    _callbacks: undefined,
    _res: undefined,
    status: function() {
      return this._status;
    },
    isFired: function() {
      return this._status !== PROMISE_STATUS.NOT_READY;
    },
    success: function(res) {
      this._status = PROMISE_STATUS.SUCCESS;
      this._res = res;
      this._fire();
    },
    fail: function(res) {
      this._status = PROMISE_STATUS.FAIL;
      this._res = res;
      this._fire();
    },
    then: function(callback, errback) {
      this._callbacks.push([callback, errback]);
      if (this.isFired()) {
        this._fire();
      }
    },
    _fire: function() {
      var funcs,
        func;
      while (this._callbacks.length) {
        funcs = this._callbacks.shift();
        func = funcs[this._status === PROMISE_STATUS.SUCCESS ? 0 : 1];
        this._res = func(this._res);
      }
    }
  };
  
  var TreeNode = function() {
    this.children = [];
    this.nodeCounter = 0;
  };
  
  var tree = new TreeNode();
  var queue = [];
  var processed = {};
  var nodes = {};
  var viewedNode;
  
  var parseUserList = function() {
    var links = document.querySelectorAll('.username > a');
    for (var i = 0, len = links.length; i < len; ++i) {
      queue.push(links[i].getAttribute('href'));
    }
  };
  
  var parseResponse = function(url, text){
    var nickname = url.match(/users\/([^\/]+)\/$/)[1],
      avatar = text.match(/img src="([^"]+)" alt="avatar"/)[1],
      invitedBy = text.match(/id="invited-by"\s*href="([^"]+)"/)[1],
      invites = text.match(/rel="friend"\s*href="[^"]+"/g).map(function(item){
        return item.match(/href="([^"]+)"/)[1];
      }),
      node = new TreeNode();
    node.nickname = nickname;
    node.avatar = avatar;
    node.invitedBy = invitedBy;
    nodes[url] = node;
    invites.forEach(function(item) {
      if (nodes[item]) {
        childFound(item);
      } else {
        load(item);
      }
    });
    if (nodes[invitedBy]) {
      childFound(url);
    } else {
      load(invitedBy);
    }
  };
  
  var updateCount = function(node) {
    var fatherNode = nodes[node.invitedBy],
      count = node.children.length;
    while (fatherNode) {
      fatherNode.nodeCounter += count;
      fatherNode = nodes[fatherNode.invitedBy];
    }
  };
  
  var childFound = function(url) {
    var childNode = nodes[url],
      fatherNode = nodes[childNode.invitedBy];
    fatherNode.children.push(childNode);
    updateCount(childNode);
    addVisualNode(url);
  };
  
  var load = function(url) {
    var request;
    if (!processed[url]) {
      processed[url] = true;
      request = new XMLHttpRequest();
      request.url = url;
      request.addEventListener('load', requestLoad);
      request.addEventListener('error', requestError);
      request.open('get', url);
      request.send();
    }
  };
  
  var requestLoad = function() {
    if (this.status === '200') {
      parseResponse(this.url, this.responseText);
      loadStep();
    } else {
      requestError.call(this);
    }
  };
  
  var requestError = function(){
    loadStep();
    ;
  };
  
  var loadStep = function() {
    if (queue.length) {
      load(queue.shift());
    }
  };
  
  var addVisualNode = function(url) {
    ;
  };
  
  var drawVisuals = function() {
    var outer = document.createElement('div'),
      header,
      content;
    outer.innerHTML = '<div class="header">UFO</div><div class="content"></div>';
    header = outer.querySelector('.header');
    content = outer.querySelector('.content');
    document.body.appendChild(outer);
  };
  
  parseUserList();
  loadStep();
  drawVisuals();
});
