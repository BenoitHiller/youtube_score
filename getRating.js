var youtube_score;

;(function(youtube_score) {
  "use strict";
  var CHILDREN = {"childList":true};

  function attachPageObserver(pageObserver) {
    var feedList = $("#feed ol.section-list")[0];
    if(feedList) {
      pageObserver.observe(feedList,CHILDREN);
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
    if (data) {
      var percent = data.likes / (data.dislikes + data.likes);
      if (percent > 0.99) {
        return Math.round(percent * 10000)/100;
      } else {
        return Math.round(percent * 100);
      }
    } else {
      return NaN;
    }
  }

  function DivCache() {
    this.divs = [];
    this.divCount = 0;
  }

  DivCache.prototype.getDiv = function(percent) {
    var value = percent + "%";
    var node, bar, text, background;
    if(this.divCount > 0) {
      this.divCount--;

      node = this.divs[this.divCount];
      text = node[0].children[0];
      bar = node[0].children[1];

      $(text).html(value);
      $(bar).css('width', value);

      return node;
    } else {
      bar = $("<div/>", {"class": "getrating-bar", "style":"width:" + value});
      text = $("<div/>", {"class": "getrating-label", "text": value});
      background = $("<div/>", {"class": "getrating-background"});
      
      text.appendTo(background);
      bar.appendTo(background);

      this.divs[this.divs.length] = background;
      return background;
    }
  };

  DivCache.prototype.freeAll = function() {
    this.divCount = this.divs.length;
    this.divs.forEach(function(element) {
      element.detach();
    });
  };


  (function() {

    var cache = new youtube_score.Cache();
    var content = $("#content");

    var divCache = new DivCache();

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
        var background = divCache.getDiv(percent);
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
        var background = divCache.getDiv(percent);
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

    var observer = new MutationObserver(function(pageObserver, videoObserver) {
      divCache.freeAll();

      pageObserver.disconnect();
      videoObserver.disconnect();

      var content = $("#content");
      addRatingBars(content, "data-context-item-id");
      addRatingBars(content, "data-vid");
      addBarsToShelf(content);

      attachPageObserver(pageObserver);
      attachVideoObserver(videoObserver);

    }.bind(null,pageObserver, videoObserver));
    observer.observe(content[0], CHILDREN);

    // We have to clear the observer references as if there is a cycle between observers
    // that seems to cause youtube to leak memory as you navigate between pages.
    content = null;
    observer = null;
    pageObserver = null;
    videoObserver = null;
  }());
}(youtube_score = youtube_score || {}));
