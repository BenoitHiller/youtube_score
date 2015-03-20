chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  function queryData(token) {
    $.get("https://www.googleapis.com/youtube/v3/videos", {
      "access_token": token,
      "part": "statistics",
      "id": request.id
    }, function(data) {
      // TODO check for quota message
      if(data.items.length > 0) {
        sendResponse(data.items[0].statistics);
      }
    });
  }

  var auth_success = chrome.identity.getAuthToken({ 'interactive': false }, queryData);
  // TODO display failure notice somewhere
  return true;
});
