var YoutubeScore;

(function(YoutubeScore) {
  'use strict';

  var MAX_ITEMS = 50;
  var EXPIRY_TIME = 60 * 60 * 1000;

  class Cache {
    constructor() {
      this.items = new Map();
      this.querying = new Map();
    }

    populateLocal(key) {
      var cache = this;

      var ids = $('[data-context-item-id]').map(function() {
        return $(this).attr('data-context-item-id');
      });

      Array.prototype.push.apply(ids, $('[data-vid]').map(function() {
        return $(this).attr('data-vid');
      }));

      var targets = $.makeArray(ids.filter(function() {
        return this !== key && !cache.hasKey(this) && !cache.querying.has(this);
      }).filter(function(index) {
        return index < MAX_ITEMS - 1;
      }));

      targets.push(key);

      var promise = new Promise(function(resolve) {

        chrome.runtime.sendMessage({'id': targets.join(',')}, function(data) {
          var expiry = Date.now() + EXPIRY_TIME;
          data.forEach(function(element) {
            if (element.statistics) {
              cache.set(element.id, {
                'expiry': expiry,
                'likes': parseInt(element.statistics.likeCount),
                'dislikes': parseInt(element.statistics.dislikeCount)
              });
            }

            if (cache.querying.has(element.id)) {
              cache.querying.delete(element.id);
            }
          });

          resolve(cache);
        });
      });

      targets.forEach(function(element) {
        cache.querying.set(element,promise);
      });

      return promise;
    }

    wrappedCallback(key, callback) {
      callback(this.items.get(key));
    }

    getDo(key, callback) {
      if (!(this.hasKey(key))) {
        var wrappedFunction = this.wrappedCallback.bind(this,key,callback);

        if (!this.querying.has(key)) {
          var promise = this.populateLocal(key);
          promise.then(wrappedFunction);
        } else {
          var existingPromise = this.querying.get(key);
          existingPromise.then(wrappedFunction);
        }
        return false;
      }
      var item = this.items.get(key);

      callback(item);
      return true;

    }

    set(key, data) {
      this.items.set(key,data);
    }

    sweep() {
      var now = Date.now();
      this.items.forEach(function(key, value, map) {
        if (value.expiry <= now) {
          map.delete(key);
        }
      });
    }

    hasKey(key) {
      if (this.items.has(key)) {
        if (this.items.get(key).expiry > Date.now()) {
          return true;
        } else {
          this.sweep();
        }
      }
      return false;
    }
  }

  YoutubeScore.Cache = Cache;
}(YoutubeScore = YoutubeScore || {}));
