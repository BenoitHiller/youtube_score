;$(document).ready(function() {
  var state = {"hovered": null};

  var tooltip = $("<div/>", { "text": "unknown", "style":"position:absolute;width:100%;height:100%;background-color:rgba(0,0,0,0.7);top:0;left:0;font-size:20px;line-height:30px;padding-top:20px;text-align:center;"});

  function showRating(target,base,response) {
    if(state.hovered == base) {
      var likes = parseInt(response.likeCount);
      var dislikes = parseInt(response.dislikeCount);

      tooltip.html(likes + " / " + dislikes + "<br>" + Math.round((likes / (dislikes + likes)) * 100) + "%");

      tooltip.appendTo(target);

      console.log(response);
    }

  }

  function hideRating() {
    if(state.hovered == this) {
      state.hovered = null;
      tooltip.detach();
    }
  }

  $("body").on("mouseenter", "[data-context-item-id]", function(event) {
    state.hovered = this;
    var hovered = this;
    var thumbnail = $(hovered).find(".yt-thumb");
    var id = $(hovered).attr('data-context-item-id');
    chrome.runtime.sendMessage({"id": id}, showRating.bind(this, thumbnail, hovered));
  }).on("mouseleave", "[data-context-item-id]", hideRating);

  $("body").on("mouseenter", ".video-list-item", function(event) {
    var hovered = this;
    var thumbnail = $(hovered).find("[data-vid]");
    if (thumbnail) {
      state.hovered = this;
      var id = thumbnail.attr('data-vid');
      chrome.runtime.sendMessage({"id": id}, showRating.bind(this, thumbnail, hovered));
    }
  });
});
