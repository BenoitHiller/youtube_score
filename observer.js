class RatingObserver {

  static getParameters(string) {
    var search = string.replace(/^[^?]*\?/, '');
    var components = search.split('&');
    var parameters = new Map();
    $.each(components, function() {
      var parts = this.split('=');
      parameters.set(decodeURIComponent(parts[0]), decodeURIComponent(parts[1]));
    });
    return parameters;
  }

  static formatPercent(data) {
    if (data && data.statistics) {
      let statistics = data.statistics;
      let likes = parseInt(statistics.likeCount);
      let dislikes = parseInt(statistics.dislikeCount);
      let percent = likes / (likes + dislikes);
      if (percent > 0.99) {
        return Math.round(percent * 10000) / 100;
      } else {
        return Math.round(percent * 100);
      }
    } else {
      return NaN;
    }
  }

  static decorateThumbnail(node, data) {
    let wrappedNode = $(node);
    if (!wrappedNode.find('[data-tampering]').length) {
      let value = RatingObserver.formatPercent(data);
      if (!isNaN(value)) {
        let percent = value + "%";
        let parentDiv = $('<div/>', {'data-tampering': 'rating-overlay'});
        let percentBar = $('<div/>', {'data-tampering': 'rating-bar', style: `width: ${percent}`}); 
        let label = $('<div/>', {'data-tampering': 'rating-label', text: percent});
        parentDiv.append(percentBar);
        parentDiv.append(label);

        $(node).find('#thumbnail').prepend(parentDiv);
      }
    }
  }

  static decorateThumbnailsHandler(mapping, data) {
    data.forEach(datum => {
      if (mapping.hasOwnProperty(datum.id)) {
        RatingObserver.decorateThumbnail(mapping[datum.id], datum);
      }
    });
  }

  static decorateThumbnails(node) {
    let thumbnails = $(node).find('ytd-thumbnail');
    if (thumbnails.length) {
      let mapping = {}
      thumbnails.each((i, thumbnail) => {
        let link = $(thumbnail).find('#thumbnail')[0];
        let parameters = RatingObserver.getParameters(link.href);
        let id = parameters.get('v');
        mapping[id] = thumbnail;
      })
      chrome.runtime.sendMessage(
        {id: Object.keys(mapping).join(",")},
        RatingObserver.decorateThumbnailsHandler.bind(this, mapping)
      );
    }
  }

  attach() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          RatingObserver.decorateThumbnails(node);
        })
      })
    });
    this.observer.observe(document.body, {childList: true, subtree: true});
  }
}

new RatingObserver().attach();
RatingObserver.decorateThumbnails(document.body);
