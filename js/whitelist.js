var WhitelistReposWrapper = function(array) {

  function get(index) {
    return array[index];
  }

  function forEach(fn) {
    for (var i=0; i<array.length; i++) {
      fn(array[i], i);
    }
  }

  function contains(repo, branch) {
    return indexOf(repo, branch) >= 0;
  }

  function indexOf(repo, branch) {
    for (var i=0; i<array.length; i++) {
      if (array[i].url === repo && array[i].branch === branch) {
        return i;
      }
    }
    return -1;
  }

  return {
    get: get,
    forEach: forEach,
    contains: contains,
    indexOf: indexOf
  }
};

var whitelist = {

  loaded: false,
  repos: undefined,

  load: function (accessToken, callback) {
    var request = new XMLHttpRequest();
    request.onload = function () {
      if (this.status >= 200 && this.status < 400) {
        var whitelistResponse = JSON.parse(this.responseText);
        if (whitelistResponse && whitelistResponse.repos && whitelistResponse.repos.length > 0) {
          whitelist.repos = new WhitelistReposWrapper(whitelistResponse.repos);
        }
        whitelist.loaded = true;
        callback();
      }
      else {
        callback('Error getting whitelist.');
      }
    };
    request.open('GET', consts.apiUrl + '/whitelist', true);
    request.setRequestHeader('X-Access-Token', accessToken);
    request.send();
  }
};