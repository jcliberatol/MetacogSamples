"use strict";


if (typeof process != 'undefined' && process != null) {
    var Class = require('./Class');
    var LocalStorage = require('node-localstorage').LocalStorage;
    global.localStorage = new LocalStorage('./mylocalstorage');
}

var OffLineStorage = {
    limit: 1024 * 5, // 5 MB
    add: function (message) {
        try {
            this.setObject("vbd-message-" + Date.now(), message);
            return true;
        } catch (exception) {
            return false;
        }
    },

    setObject : function(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    getObject : function(key) {
        var value = localStorage.getItem(key);
        return value && JSON.parse(value);
    },
    getItem: function (key) {
        return this.getObject(key);
    },
    getItemsLength: function () {
        return localStorage.length;
    },
    removeItem: function (key) {
        localStorage.removeItem(key);
    },

    /**
     * get the first item keys up to limit
     * @param limit
     * @returns {Array}
     */
    getItemKeys: function (limit) {
        var index, key, keys = [];

        for (index = 0; index < Math.min(localStorage.length, limit); ++index) {
            key = localStorage.key(index);
            keys.push(key);
        }

        return keys;
    },

    getStorageFirstKey: function() {
        var keys = Object.keys(localStorage).sort();
        return keys[0];
    },


    getRemainingSpace: function () {
        return OffLineStorage.limit - unescape(encodeURIComponent(JSON.stringify(localStorage))).length;
    },

    getFirstItemKeyByPriority: function (priority) {
        var index, key, keys, log, eventName;

        keys = Object.keys(localStorage).sort();
        for (index = 0; index < keys.length; ++index) {
            key = keys[index];
            if (localStorage.hasOwnProperty(key)) {
                log = this.getObject(key);
                eventName = log.event;

                if (eventName === priority) {
                    return key;
                }
            }
        }

        return keys[0];
    }

}

if (typeof exports != 'undefined' && exports != null) {
    module.exports = OffLineStorage;
}