var youtube_score;

;(function(youtube_score) {
  "use strict";
  var CHILDREN = {childList: true};
  var SUB_CHILDREN = {childList: true, subtree: true};

  function attachPageObserver(pageObserver) {
    var related;
    var playlist;
    var feedList = $("#feed ol.section-list")[0];
    if(feedList) {
      pageObserver.observe(feedList,CHILDREN);
    } else if(related = $("#watch-more-related")[0]) {
      pageObserver.observe(related, CHILDREN);
    } else if(playlist = $("#pl-load-more-destination")[0]) {
      pageObserver.observe(playlist, CHILDREN);
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

    function decorateAll(node) {
      addRatingBars(node, "data-context-item-id");
      addRatingBars(node, "data-vid");
      addRatingBars(node, "data-video-id", true, ".pl-video");
      addRatingBars(node, "data-video-id", false, ".yt-uix-scroller-scroll-unit");
      addBarsToShelf(node);
      node = null;
    }

    function addRatingBars(node, dataField, toParent, prefix) {
      if (toParent === undefined) {
        toParent = false;
      }
      if (prefix === undefined) {
        prefix = "";
      }
      var selector = prefix + "[" + dataField + "]";
      var nodes = node.find(selector);
      if(nodes.length > 0) {
        nodes.each(function() {
          var node = this;
          var id = $(node).attr(dataField);
          cache.getDo(id,decorate.bind(null,node,toParent));
        });
      }
      node = null;
      nodes = null;
    }

    function decorate(node, toParent, data) {
      var percent = formatPercent(data);
      if(!isNaN(percent)) {
        var background = divCache.getDiv(percent);
        var thumbnail = $(node).find(".yt-thumb");
        if(!thumbnail.length) {
          thumbnail = $(node);
        }
        if(toParent) {
          thumbnail = thumbnail.parent();
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

    decorateAll($("#page-container"));

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

    // TODO: fix this
    // attachVideoObserver(videoObserver);

    var allObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        $.each(mutation.addedNodes, function(i,node) {
          //console.log(node);
          //console.log(node.nodeName);
          if (node.nodeName != "#text" && node.className != "getrating-background") {
            var wrappedNode = $(node);
            if (wrappedNode.find(".yt-thumb, .thumb-wrapper").length > 0) {
              decorateAll(wrappedNode);
            }
          }
        });
      });
    });
    allObserver.observe($("#page")[0], SUB_CHILDREN);


    allObserver = null;
  }());
}(youtube_score = youtube_score || {}));
