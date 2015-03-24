var MAX_ITEMS = 50;
var CHILDREN = {"childList":true};

function Cache() {
  this.items = new Map();
  this.querying = new Map();
}

Cache.prototype.populateLocal = function(key) {
  var cache = this;

  var ids = $("[data-context-item-id]").map(function() {
    return $(this).attr('data-context-item-id');
  });
  Array.prototype.push.apply(ids, $("[data-vid]").map(function() {
    return $(this).attr('data-vid');
  }));

  var targets = $.makeArray(ids.filter(function(element,index,array) {
    return element != key && !cache.hasKey(element) && !cache.querying.has(element);
  }).filter(function(index,element,array) {
    return index < MAX_ITEMS - 1;
  }));
  
  targets.push(key);

  var promise = new Promise(function(resolve,reject) {

    chrome.runtime.sendMessage({"id": targets.join(",")}, function(data) {
      var now = Date.now();
      data.forEach(function(element, index, array) {
        cache.set(element.id, { 
          "expiry": now,
          "likes": parseInt(element.statistics.likeCount),
          "dislikes": parseInt(element.statistics.dislikeCount)
        });

        if(cache.querying.has(element.id)) {
          cache.querying.delete(element.id);
        }
      });

      resolve(cache);
    });
  });
  
  targets.forEach(function(element, index, array) {
    cache.querying.set(element,promise);
  });

  return promise;
};

Cache.prototype.wrappedCallback = function(key, callback) {
  callback(this.items.get(key));
}

Cache.prototype.getDo = function(key, callback) {
  if (!(this.hasKey(key))) {
    var wrappedFunction = this.wrappedCallback.bind(this,key,callback);

    if(!this.querying.has(key)) {
      var promise = this.populateLocal(key);
      promise.then(wrappedFunction);
    } else {
      var existing_promise = this.querying.get(key);
      existing_promise.then(wrappedFunction);
    }
    return false;
  }
  var item = this.items.get(key);

  callback(item);
  return true;

};

Cache.prototype.set = function(key,data) {
  this.items.set(key,data);
}

Cache.prototype.hasKey = function(key) {
  if (this.items.has(key)) {
    if (this.items.get(key).expiry <= Date.now()) {
      return true;
    } else {
      // TODO improve to do propper invalidation sweep;
      this.items.delete(key);
    }
  }
  return false;
}

function attachPageObserver(pageObserver) {
  var feedList = $("#feed ol.section-list")[0];
  if(feedList) {
    pageObserver.observe(feedList,CHILDREN)
  } else {
    var related = $("#watch-more-related")[0];
    if(related) {
      pageObserver.observe(related, CHILDREN);
    }
  }
}

function attachVideoObserver(videoObserver) {
  var endScreen = $(".ytp-endscreen-content");
  if(endScreen.length) {
    videoObserver.observe(endScreen[0],CHILDREN);
  }
}

function parseSearchString(string) {
  var search = string.substr(1);
  var params = new Map();
  search.split("&").forEach(function(part) {
    var subParts = part.split("=");
    params.set(subParts[0], decodeURIComponent(subParts[1]));
  });
  return params;
}

function formatPercent(data) {
    var percent = data.likes / (data.dislikes + data.likes);
    if (percent > 0.99) {
      return Math.round(percent * 10000)/100;
    } else {
      return Math.round(percent * 100);
    }
}

;(function() {
  var cache = new Cache();
  var content = $("#content");

  var divs = [];
  var divCount = 0;

  function getDiv(percent) {
    var value = percent + "%";
    if(divCount > 0) {
      divCount--;
      var node = divs[divCount];
      var text = node[0].children[0];
      var bar = node[0].children[1];
      $(text).html(value);
      $(bar).css('width', value);
      return node;
    } else {
      var bar = $("<div/>", {"class": "getrating-bar", "style":"width:" + value});
      var text = $("<div/>", {"class": "getrating-label", "text": value});
      var background = $("<div/>", {"class": "getrating-background"});
      text.appendTo(background);
      bar.appendTo(background);
      divs[divs.length] = background;
      return background;
    }
  }

  function addBarsToShelf(node) {
    node.find(".lohp-thumb-wrap .yt-fluid-thumb-link").each(function() {
      var node = $(this);
      var params = parseSearchString(this.search);
      if(params.has("v")) {
        cache.getDo(params.get("v"), decorateEndScreen.bind(null,node));
      }
    });
  }

  function addRatingBars(node,dataField) {
    var selector = "[" + dataField + "]";
    node.find(selector).each(function() {
      var node = this;
      var id = $(node).attr(dataField);
      cache.getDo(id,decorate.bind(null,node));
    });
    node = null;
  }

  function decorate(node, data) {
    var percent = formatPercent(data);
    if(!isNaN(percent)) {
      var background = getDiv(percent);
      var thumbnail = $(node).find(".yt-thumb");
      if(!thumbnail.length) {
        thumbnail = $(node);
      }
      background.prependTo(thumbnail);
    }
  }

  function decorateEndScreen(node, data) {
    var percent = formatPercent(data);
    if(!isNaN(percent)) {
      var background = getDiv(percent);
      background.prependTo(node);
    }
  }

  addRatingBars(content, "data-context-item-id");
  addRatingBars(content, "data-vid");
  addBarsToShelf(content);

  var pageObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      $.each(mutation.addedNodes, function(i,node) {
        var wrappedNode = $(node);
        addRatingBars(wrappedNode, "data-context-item-id");
        addRatingBars(wrappedNode, "data-vid");
      });
    });
  });

  attachPageObserver(pageObserver);

  var videoObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      $.each(mutation.addedNodes, function(i,node) {
        var wrappedNode = $(node);
        var params = parseSearchString(node.search);
        if(params.has("v")) {
          cache.getDo(params.get("v"), decorateEndScreen.bind(null,wrappedNode));
        }
      });
    });
  });

  attachVideoObserver(videoObserver);

  var observer = new MutationObserver(function(pageObserver, videoObserver,mutations) {
    var content = $("#content");
    divCount = divs.length;
    divs.forEach(function(element) {
      element.detach();
    });
    pageObserver.disconnect();
    videoObserver.disconnect();
    addRatingBars(content, "data-context-item-id");
    addRatingBars(content, "data-vid");
    addBarsToShelf(content);
    attachPageObserver(pageObserver);
    attachVideoObserver(videoObserver);
  }.bind(null,pageObserver, videoObserver));
  observer.observe(content[0], CHILDREN);

  content = null;
  observer = null;
  pageObserver = null;
  videoObserver = null;
})();
