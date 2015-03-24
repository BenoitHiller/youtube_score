var MAX_ITEMS = 50;

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

;$(document).ready(function() {
  var cache = new Cache();
  var children = {"childList":true};
  var content = $("#content")[0];

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

  function addRatingBars(node,dataField) {
    var selector = "[" + dataField + "]";
    $(node).find(selector).each(function() {
      var node = this;
      var id = $(node).attr(dataField);
      cache.getDo(id,decorate.bind(this,node));
    });
  }

  function decorate(node, data) {
    var percent = Math.round((data.likes / (data.dislikes + data.likes)) * 100);
    if(!isNaN(percent)) {
      var background = getDiv(percent);
      var thumbnail = $(node).find(".yt-thumb");
      if(!thumbnail.length) {
        thumbnail = $(node);
      }
      background.prependTo(thumbnail);
    }
  }
  addRatingBars(content, "data-context-item-id");
  addRatingBars(content, "data-vid");

  var feedList = $("#feed ol.section-list")[0];
  var pageObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      $.each(mutation.addedNodes, function(i,node) {
        addRatingBars(node, "data-context-item-id");
        addRatingBars(node, "data-vid");
      });
    });
  });

  if(feedList) {
    pageObserver.observe(feedList,children)
  } else {
    var related = $("#watch-more-related")[0];
    if(related) {
      pageObserver.observe(related, children);
    }
  }

  var observer = new MutationObserver(function(mutations) {
    divCount = divs.length;
    divs.forEach(function(element) {
      element.detach();
    });
    pageObserver.disconnect();
    addRatingBars(content, "data-context-item-id");
    addRatingBars(content, "data-vid");
    var feedList = $("#feed ol.section-list")[0];
    if(feedList) {
      pageObserver.observe(feedList, children);
    } else {
      var related = $("#watch-more-related")[0];
      if(related) {
        pageObserver.observe(related, children);
      }
    }
  });
  observer.observe(content, children);
});
