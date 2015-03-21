var MAX_ITEMS = 50;

function Cache(populator) {
  this.items = new Map();
  this.populator = populator;
}

Cache.prototype.getDo = function(key, callback) {
  if (!(this.items.has(key))) {
    this.populator(this, key, callback);
    return false;
  }
  var item = this.items.get(key);

  if (item.expiry > Date.now()) {
    this.items.delete(key);
    this.populator(this,key,callback);
    
    return false;
  }

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

function populateLocal(cache, key) {
  var ids = $("[data-context-item-id]").map(function() {
    return $(this).attr('data-context-item-id');
  });
  Array.prototype.push.apply(ids, $("[data-vid]").map(function() {
    return $(this).attr('data-vid');
  }));

  var targets = $.makeArray(ids.filter(function(element,index,array) {
    return element != key && !cache.hasKey(element);
  }).filter(function(index,element,array) {
    return index < MAX_ITEMS - 1;
  }));
  
  targets.push(key);
  
  chrome.runtime.sendMessage({"id": targets.join(",")}, function(data) {
    var now = Date.now();
    data.forEach(function(element, index, array) {
      cache.set(element.id, { 
        "expiry": now,
        "likes": parseInt(element.statistics.likeCount),
        "dislikes": parseInt(element.statistics.dislikeCount)
      });
    });
  });
}

;$(document).ready(function() {
  var state = {"hovered": null};
  var cache = new Cache(populateLocal);

  var overlay = $("<div/>", {"id": "getrating-overlay"});
  var counts = $("<div/>", {"id": "getrating-counts"})
  var score = $("<div/>", {"id": "getrating-score"})

  counts.appendTo(overlay);
  score.appendTo(overlay);

  function showRating(target,base,data) {
    if(state.hovered == base) {

      counts.html(data.likes + " / " + data.dislikes);
      score.html(Math.round((data.likes / (data.dislikes + data.likes)) * 100) + "%");

      overlay.appendTo(target);

      console.log(data);
    }

  }

  function hideRating() {
    if(state.hovered == this) {
      state.hovered = null;
      overlay.detach();
    }
  }

  $(document).on("mouseenter", "[data-context-item-id]", function(event) {
    state.hovered = this;
    var hovered = this;
    var thumbnail = $(hovered).find(".yt-thumb");
    var id = $(hovered).attr('data-context-item-id');
    cache.getDo(id,showRating.bind(this,thumbnail,hovered));
  }).on("mouseleave", "[data-context-item-id]", hideRating);

  $(document).on("mouseenter", ".video-list-item", function(event) {
    var hovered = this;
    var thumbnail = $(hovered).find("[data-vid]");
    if (thumbnail) {
      state.hovered = this;
      var id = thumbnail.attr('data-vid');
      cache.getDo(id,showRating.bind(this,thumbnail,hovered));
    }
  }).on("mouseleave", ".video-list-item", hideRating);
});
