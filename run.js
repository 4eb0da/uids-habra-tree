(function(){
  "use strict";

  var PARALLEL_REQUESTS = 4;
  var USER_LIMIT = 1000;
  
  var TreeNode = function() {
    this.children = [];
    this.nodeCounter = 0;
  };
  
  var tree = new TreeNode();
  var queue = [];
  var processed = {};
  var nodes = {};
  var viewedNode = tree;
  var loadingRequests = 0;
  var loads = 0;
  
  var parseUserList = function() {
    var links = document.querySelectorAll('.username > a');
    for (var i = 0, len = links.length; i < len; ++i) {
      addToQueue(links[i].getAttribute('href'));
    }
  };

  var match = function(text, regexp) {
    var res = text.match(regexp);
    if (res && res[1]) {
      return res[1];
    }
    return undefined;
  };

  var findParent = function(node) {
    if (node.invitedBy) {
      if (nodes[node.invitedBy]) {
        return nodes[node.invitedBy];
      }
      return undefined;
    }
    if (node === tree) {
      return undefined;
    }
    return tree;
  };
  
  var parseResponse = function(url, text){
    var nickname = match(url, /users\/([^\/]+)\/$/),
      avatar = match(text, /img src="([^"]+)" alt="avatar"/),
      invitedBy = match(text, /id="invited-by"\s*href="([^"]+)"/),
      friends = text.match(/rel="friend"\s*href="[^"]+"/g),
      invites = friends ? friends.map(function(item){
        return match(item, /href="([^"]+)"/);
      }) : [],
      node = new TreeNode();
    node.nickname = nickname;
    node.avatar = avatar;
    node.invitedBy = invitedBy;
    node.invites = invites;
    return node;
  };

  var processNewNode = function(url, node) {
    nodes[url] = node;
    //Tangro, Milla
    if (node.invites.indexOf(node.invitedBy) > -1 && !nodes[node.invitedBy]) {
      node.invitedBy = undefined;
    }
    node.invites.forEach(function(item) {
      if (item !== node.invitedBy) {
        if (nodes[item]) {
          childFound(item);
        } else {
          addToQueue(item);
        }
      }
    });
    if (findParent(node)) {
      childFound(url);
    } else {
      addToQueue(node.invitedBy);
    }
  };
  
  var updateCount = function(node) {
    var parentNode = findParent(node),
      count = node.children.length + 1;
    while (parentNode) {
      parentNode.nodeCounter += count;
      parentNode = findParent(parentNode);
    }
  };
  
  var childFound = function(url) {
    var childNode = nodes[url],
      parentNode = findParent(childNode);
    // multi-parent users
    if (parentNode) {
      parentNode.children.push(childNode);
      updateCount(childNode);
      addVisualNode(childNode);
    }
  };

  var addToQueue = function(url) {
    if (!processed[url]) {
      processed[url] = true;
      queue.push(url);
    }
  };
  
  var load = function(url) {
    var request = new XMLHttpRequest();
    request.url = url;
    request.addEventListener('load', requestLoad);
    request.addEventListener('error', requestError);
    request.open('get', url, true);
    ++loadingRequests;
    request.send();
  };

  var loadEnd = function() {
    --loadingRequests;
    loadStep();
  };

  var requestLoad = function() {
    var node;
    if (this.status == '200') {
      node = parseResponse(this.url, this.responseText);
      try{
        localStorage[this.url] = JSON.stringify(node);
      } catch(e) {
        console.error('localStorage overflow', e);
      }
      node.url = this.url;
      processNewNode(this.url, node);
      loadEnd();
    } else {
      requestError.call(this);
    }
  };
  
  var requestError = function(){
    loadEnd();
    console.error('load error');
  };
  
  var loadStep = function() {
    var url,
      data,
      parsed,
      node;
    while (queue.length && loadingRequests < PARALLEL_REQUESTS && loads < USER_LIMIT) {
      url = queue.shift();
      ++loads;
      node = undefined;
      if (localStorage[url]) {
        data = localStorage[url];
        try{
          parsed = JSON.parse(data);
          node = new TreeNode();
          node.nickname = parsed.nickname;
          node.avatar = parsed.avatar;
          node.invites = parsed.invites;
          node.invitedBy = parsed.invitedBy;
          node.url = url;
          processNewNode(url, node);
          ++loadingRequests;
          loadEnd();
        } catch(e) {
          node = undefined;
        }
      }
      if (!node) {
        load(url);
      }
    }
  };

  var addStyles = function() {
    var style = document.createElement('style');
    style.textContent = 
      '.tree-outer{' +
        'position: absolute;' +
        'width: 90%;' +
        'left: 5%;' +
        'top: 20px;' +
        'background: rgba(0, 0, 0, 0.4);' +
        'color: #FFF;' +
        'padding: 10px;' +
        'box-sizing: border-box;' +
      '}' +
      '.tree-header{' +
        'padding: 10px;' +
        'text-align: left;' +
        'font-size: 140%;' +
      '}' +
      '.tree-header-text{' +
        'cursor: pointer;' +
      '}' +
      '.tree-header-text:hover{' +
        'text-decoration: underline;' +
      '}' +
      '.tree-close{' +
        'cursor: pointer;' +
        'float: right;' +
      '}' +
      '.tree-close:hover{' +
        'text-decoration: underline;' +
      '}' +
      '.tree-content{' +
        'padding: 0 10px 10px 10px;' +
        'text-align: left;' +
        'color: #fff;' +
      '}' +
      '.tree-fade{' +
        'position: absolute;' +
        'background: rgba(0, 0, 0, 0.4);' +
        'transition: all 0.6s linear;' +
        'opacity: 0;' +
        '-webkit-transform: scale(2.0);' +
        '-moz-transform: scale(2.0);' +
        'transform: scale(2.0);' +
      '}' +
      '.tree-item{' +
        'display: inline-block;' +
        'width: 50px;' +
        'height: 50px;' +
        'border: 1px solid #CCC;' +
        'cursor: pointer;' +
        'padding: 5px;' +
      '}' +
      '.tree-item:hover{' +
        'border-color: #D3D3D3;;' +
        'color: #D3D3D3;;' +
      '}' +
      '.tree-item-title{' +
        'font-size: 200%;' +
        'font-weight: bold;' +
      '}' +
      '.tree-item-name{' +
        'overflow: hidden;' +
        'text-overflow: ellipsis;' +
        'font-size: 70%;' +
        'padding-top: 10px;' +
      '}';
    document.head.appendChild(style);
  };

  var processTitle = function(nickname) {
    var part = nickname.substring(0, 2);
    return part.charAt(0).toUpperCase() + part.charAt(1).toLowerCase();
  };

  var createVisualNode = function(node) {
    var block = document.createElement('div'),
      title = document.createElement('div'),
      name = document.createElement('div');
    block.className = 'tree-item';
    title.className = 'tree-item-title';
    name.className = 'tree-item-name';
    block.setAttribute('data-url', node.url);
    title.textContent = processTitle(node.nickname);
    name.textContent = node.nickname;
    block.appendChild(title);
    block.appendChild(name);
    return block;
  };

  var content,
    header,
    empty;
  var addVisualNode = function(node) {
    var parentNode = findParent(node);
    if (parentNode === viewedNode) {
      if (empty) {
        empty.parentNode.removeChild(empty);
        empty = undefined;
      }
      content.appendChild(createVisualNode(node));
    }
  };

  var closest = function(element, className) {
    while (element && !element.classList.contains(className)) {
      element = element.parentNode;
    }
    if (element && element.classList.contains(className)) {
      return element;
    }
    return undefined;
  };

  var elementOffset = function(element) {
    var res = {
      left: 0,
      top: 0
    };
    while (element) {
      res.left += element.offsetLeft;
      res.top += element.offsetTop;
      element = element.offsetParent;
    }
    return res;
  };

  var elementSize = function(element) {
    return {
      width: element.offsetWidth,
      height: element.offsetHeight
    };
  };

  var applyStyles = function(element, styles) {
    for (var i in styles) {
      if (styles.hasOwnProperty(i)) {
        element.style[i] = styles[i] + 'px';
      }
    }
  };

  var clearContent = function() {
    var copy = content.cloneNode(true),
      offset = elementOffset(content),
      size = elementSize(content);
    applyStyles(copy, offset);
    applyStyles(copy, size);
    content.innerHTML = '';
    document.body.appendChild(copy);
    setTimeout(function() {
      copy.classList.add('tree-fade');
    }, 10);
    setTimeout(function() {
      copy.parentNode.removeChild(copy);
    }, 600);
  };

  var appendChilds = function(node) {
    if (node.children.length) {
      node.children.forEach(function(item) {
        content.appendChild(createVisualNode(item));
      });
    } else {
      empty = document.createTextNode('No childs');
      content.appendChild(empty);
    }
  };

  var showNode = function(node) {
    viewedNode = node;
    clearContent();
    header.textContent = node.nickname ? node.nickname : 'UFO';
    appendChilds(node);
  };

  var cellClick = function(event) {
    var target = closest(event.target, 'tree-item'),
      url,
      node;
    if (target) {
      url = target.dataset.url;
      if (url) {
        if (nodes[url]) {
          node = nodes[url];
        } else {
          node = tree;
        }
        showNode(node);
      }
    }
  };

  var goBack = function() {
    var parent = findParent(viewedNode);
    if (parent) {
      showNode(parent);
    }
  };
  
  var drawVisuals = function() {
    var outer = document.createElement('div');
    outer.className = 'tree-outer';
    outer.innerHTML = '<div class="tree-header"><div class="tree-close">close</div><div class="tree-header-text">UFO</div></div><div class="tree-content"></div>';
    header = outer.querySelector('.tree-header-text');
    content = outer.querySelector('.tree-content');
    content.addEventListener('click', cellClick);
    outer.querySelector('.tree-close').addEventListener('click', clear);
    header.addEventListener('click', goBack);
    document.body.appendChild(outer);
  };

  var clear = function() {
    var outer = document.querySelector('.tree-outer');
    if (outer) {
      outer.parentNode.removeChild(outer);
    }
  };

  clear();
  parseUserList();
  addStyles();
  drawVisuals();
  loadStep();
})();
