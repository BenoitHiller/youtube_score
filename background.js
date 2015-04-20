(function() {
  var API_KEY;
  if(chrome.runtime.id == "ocednoekbgodekgmeaadclbhbkjhcmmj" ) {
    // Set local key for debugging
    API_KEY = "AIzaSyBP1AutlCTtxEGOW2ophDg4u7PIWJIre_k"; 
  } else {
    API_KEY = "AIzaSyAeI-MDht-L2jDM65OukGKDUuoHygf18hY";
  }

  //TODO: add a second level of caching here.

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    "use strict";

    $.get("https://www.googleapis.com/youtube/v3/videos", {
      "key": API_KEY,
      "part": "statistics",
      "id": request.id
    }, function(data) {
      if (data.items.length > 0) {
        sendResponse(data.items);
      }
    }).fail(function(error) {
      if (error.responseText) {
        var data = JSON.parse(error.responseText);
        if (data && data.error && data.error.length) {
          console.log("Error retrieving rating data: %s. Code: %s", data.error.message, data.error.code);
        } else if (data) {
          console.log(data);
        } else {
          console.log("Error retrieving rating data");
        }
      } else {
        console.log("Error retrieving rating data: %s. Code: %d", error.statusText, error.status);
      }
    });

    return true;
  });
}());
