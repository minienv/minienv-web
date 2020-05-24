var utils = {

  getParameterByName: function (name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(url);
    if (!results) {
      return null;
    }
    if (!results[2]) {
      return '';
    }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  },

  saveToLocalStorage(key, value) {
    if (typeof(Storage) !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },

  getFromLocalStorage(key) {
    if (typeof(Storage) !== 'undefined') {
      return localStorage.getItem(key);
    }
    else {
      return null;
    }
  },

  removeFromLocalStorage(key) {
    if (typeof(Storage) !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};