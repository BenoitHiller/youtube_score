var youtube_score;

;(function(youtube_score) {
  "use strict";
  var CHILDREN = {childList: true};

  class DivCache {
    constructor() {
      this.divs = [];
      this.divCount = 0;
    }

    getDiv(percent) {
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
    }

  }

  var cache = new youtube_score.Cache();

  var divCache = new DivCache();

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

  function getParameters(string) {
    var search = string.replace(/^[^?]*\?/, "");
    var components = search.split("&");
    var parameters = new Map();
    $.each(components, function() {
      var parts = this.split("=");
      parameters.set(decodeURIComponent(parts[0]), decodeURIComponent(parts[1]));
    });
    return parameters;
  }

  /*
   * An observer is defined as providing the following functions
   * 
   * match() -> boolean: function to check if the observer should be attached
   * attach(): called after #content changes if match returns true
   * detach(): called after #content changes if the observer was attached
   */

  class AbstractObserver {
    constructor(matchSelector, observeSelector) {
      this.matchSelector = matchSelector;
      this.observeSelector = observeSelector;
      var observer = this;
      this.observer = new MutationObserver(function(mutations) {
        if ($.grep(mutations, function(mutation) {
          return mutation.addedNodes.length > 0;
        })) {
          observer._findTargets();
        }
      });
    }

    match() {
      return $(this.matchSelector).length > 0;
    }

    decorate(node, data) {
      var percent = formatPercent(data);
      if (!isNaN(percent)) {
        var barDiv = divCache.getDiv(percent);
        barDiv.prependTo(node);
      }
    }

    _findTargets() {
      // implement this
    }

    attach() {
      this._findTargets();
      var target = $(this.observeSelector);
      if (target.length) {
        this.observer.observe(target[0], CHILDREN);
      }
    }

    detach() {
      this.observer.disconnect();
    }
  }

  class FeedObserver extends AbstractObserver {
    constructor() {
      super("#feed", ".section-list");
    }

    _findTargets() {
      var observer = this;
      $(".yt-shelf-grid-item, .expanded-shelf-content-item").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var child = this.childNodes[0];
          var id = $(child).attr("data-context-item-id");
          var thumbnail = node.find(".yt-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
    }
  }

  class RelatedObserver extends AbstractObserver {
    constructor() {
      super("#watch-related", "#watch-more-related");
    }

    _findTargets() {
      var observer = this;
      $(".related-list-item").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var child = node.find("[data-vid]")[0];
          var id = $(child).attr("data-vid");
          var thumbnail = node.find(".yt-uix-simple-thumb-wrap")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
    }
  }

  class GroupingObserver extends AbstractObserver {
    constructor(matchSelector, observeSelector, children) {
      super(matchSelector, observeSelector);
      this.children = children;
      this.attachedChildren = [];
    }

    _findTargets() {
      var observer = this;
      $.each(this.children, function() {
        if (this.match()) {
          this.attach();
          observer.attachedChildren.push(this);
        }
      });
    }

    detach() {
      $.each(this.attachedChildren, function() {
        this.detach();
      });
      this.attachedChildren = [];
      super.detach();
    }

  }

  class PlaylistObserver extends AbstractObserver {
    constructor() {
      super("#pl-video-list", "#pl-load-more-destination");
    }

    _findTargets() {
      var observer = this;
      $(".pl-video").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var id = node.attr("data-video-id");
          var thumbnail = node.find(".pl-video-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
    }
  }

  class QueueObserver extends AbstractObserver {
    constructor() {
      super("#watch-queue", ".watch-queue-items-list");
    }

    _findTargets() {
      var observer = this;
      $(".watch-queue-item").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var id = node.attr("data-video-id");
          var thumbnail = node.find(".video-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
    }
  }

  class SearchObserver extends AbstractObserver {
    constructor() {
      super(".search-header", ".item-section");
    }

    _findTargets() {
      var observer = this;
      $("li .yt-lockup-video").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var id = node.attr("data-context-item-id");
          var thumbnail = node.find(".yt-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
    }
  }

  class PlayerPlaylistObserver extends AbstractObserver {
    constructor() {
      super("#playlist-autoscroll-list", "#playlist-autoscroll-list");
    }

    _findTargets() {
      var observer = this;
      $(".yt-uix-scroller-scroll-unit").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var id = node.attr("data-video-id");
          var thumbnail = node.find(".video-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
    }
  }

  class ChannelObserver extends AbstractObserver {
    constructor() {
      super(".channel-header", "#browse-items-primary");
    }

    _findTargets() {
      var observer = this;
      // TODO: Determine if this is a duplicate
      $(".channels-content-item, .expanded-shelf-content-item-wrapper").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var child = node.find("[data-context-item-id]")[0];
          var id = $(child).attr("data-context-item-id");
          var thumbnail = node.find(".yt-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
      $(".lohp-thumb-wrap, .c4-featured-content .spf-link").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var child = node.find("a")[0];
          var url = $(child).attr("href");
          var id = getParameters(url).get("v");
          var thumbnail = node.find(".yt-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });

      $(".feed-item-container [data-context-item-id]").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var id = node.attr("data-context-item-id");
          var thumbnail = node.find(".yt-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
    }
  }

  class ChannelVideosObserver extends AbstractObserver {
    constructor() {
      super("#channels-browse-content-grid", "#channels-browse-content-grid");
    }

    _findTargets() {
      var observer = this;
      $(".channels-content-item, .expanded-shelf-content-item-wrapper").each(function() {
        var node = $(this);
        if (!node.find(".getrating-bar").length) {
          var child = node.find("[data-context-item-id]")[0];
          var id = $(child).attr("data-context-item-id");
          var thumbnail = node.find(".yt-thumb")[0];
          cache.getDo(id, observer.decorate.bind(observer, thumbnail));
        }
      });
    }
  }

  class EndscreenObserver extends AbstractObserver {
    constructor() {
      super(".ytp-endscreen-content", ".ytp-endscreen-content");
    }

    _findTargets() {
      var observer = this;
      $(".videowall-still").each(function() {
        var node = $(this);
        var isPlaylist = node.attr("data-is-list") == "true";
        var isMix = node.attr("data-is-mix") == "true";
        if (!isPlaylist && !isMix && !node.find(".getrating-bar").length) {
          var url = node.attr("href");
          var id = getParameters(url).get("v");
          cache.getDo(id, observer.decorate.bind(observer, node));
        }
      });
    }
  }

  class ObserverMonitor {
    constructor(observers) {
      this.observers = observers;
      this.observing = [];
    }

    attach() {
      var observer = this;
      $.each(this.observers, function() {
        if (this.match()) {
          this.attach();
          observer.observing.push(this);
        }
      });
    }

    detach() {
      $.each(observing, function() {
        this.detach();
      });
      this.observing = [];
    }

    bind(selector) {
      this.attach();
      new MutationObserver(function(monitor, mutations) {
        if ($.grep(mutations, function(mutation) {
          return mutation.addedNodes.length > 0;
        })) {
          monitor.attach();
        } else {
          monitor.detach();
        }
      }.bind(this, this)).observe($(selector)[0], CHILDREN);
    }
  }

  new ObserverMonitor([
      new FeedObserver(),
      new PlaylistObserver(),
      new QueueObserver(),
      new ChannelObserver(),
      new ChannelVideosObserver(),
      new SearchObserver(),
      new GroupingObserver("#watch7-container", "#watch7-container", [new RelatedObserver()])
  ]).bind("#content");

  new ObserverMonitor([new PlayerPlaylistObserver()]).bind("#player-playlist");

  new ObserverMonitor([
      new GroupingObserver("#movie_player", "#movie_player", [new EndscreenObserver()])
  ]).bind("#player-api");

}(youtube_score = youtube_score || {}));
