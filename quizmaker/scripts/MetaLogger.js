/**
 * MetaLogger module
 *
 * this module defines the Logger, queue and connector elements required to send events to MetaCog servers.
 * implements the following features:
 * - timestamping based on time server
 * - internal queuing of messages while there is timestamp data or if there is network issues.
 * - tracking of idle time
 */



/**
 * for Node.js
 */
var offlineStorageModule = null;
var requestModule = null;
if (typeof process != 'undefined' && process != null) {
    offlineStorageModule = require('./OffLineStorage');
    requestModule = require('request');

    btoa = require('btoa');

    var window;

    if (typeof window === "undefined" || window === null) {
        window = {};
    }
    global.jsdom = require("jsdom").jsdom;

    global.document = jsdom('<html><body></body></html>');

    global.window = document.createWindow();

    global.navigator = {
        browser: 'foo',
        online: true
    };
    var AWS = require('aws-sdk');
}


var MetaLogger = (function(OffLineStorage){

    MetaLogger = {};

    //-----------PUBLIC MODULE CONSTANTS ---------

    MetaLogger.EVENT_TYPE = {
      UI:'ui',
      MODEL:'model'
    };

    //-----------PRIVATE MODULE CONSTANTS ---------

    var KINESIS = null;

    var STREAM_NAME = 'metacog_raw';

    // :NOTE: [mc] switch to HTTPS when available
    var API_SERVER = 'http://api.metacog.com';

    var ACCESS_ENDPOINT = '/access/kinesis';

    //max number of messages to batch together (in the same tick)
    var MAX_CONCURRENT_REQUEST = 50;

    //max number of characters in a batched message
    var MAX_BATCH_SIZE = 4098;

    var TICK_TIME = 200;

    //exponential backoff policy
    var MAX_RETRIES = 10;

    //-----------PRIVATE MODULE VARS --------------


    var g_config = null;

    /**
     * id of the timeout used for ticking the logger. set through Logger.start and stop methods
     * @type {null}
     */
    var g_timeout = null;


    /**
     * offset in milliseconds to be added to local timestamps.
     * @type {null}
     */
    var g_serverTimeOffset = null;

    /**
     * helper variable to keep track of idle g_timeout
     * @see update_idle_status
     * @type {null}
     */
    var g_idleElapsedTime = null;


    /**
     * helper variable to keep track of last tick time
     * @type {null}
     */
    var g_lastTime = null;


    var _startServerTimeRequest = null;

    // used for instrumentation hooks
    var inst_target = null;
    var inst_cb = null;

    var _window = null;

    var xhr = init_xhr();


    //---------- CLASS LOGGER (public methods) ---------------------

    /**
     * constructor for the Logger class.
     * @param  config object with different parameters
     * @constructor
     */
    MetaLogger.Logger = function(config){
        g_config = config;

        //perform some basic validation over structure of config object
        if(g_config.session == undefined){
            throw "config object must have a session object within";
        }

        var uid = null;

        if(g_config.session.learner_id == undefined){
            g_config.session.learner_id = uid = generateUID();
        }

        if(g_config.session.session_id == undefined){
            g_config.session.session_id = (uid != null ? uid: generateUID());
        }

        init_services();
    };

    /**
     * utility method to delay the execution of the given callback until a property with the given target_name
     * exist in the global context.
     * this is useful when there is preload processes that delay the creation of the object of interest.
     * @param target_name string, name of the property to watch.
     * @param cb callback function to invoke when the object existence is detected. ideally, calls to watch log methods must be declared here.
     */
	MetaLogger.Logger.prototype.configure_instrumentation = function(target_name, cb){
		inst_target = target_name;
		inst_cb = cb;
		inst_check_object();
	}


    /**
     * utility method to add interceptor callbacks before and after calling an arbitrary method.
     config object:
     * @param: targetMethodName
     * @param: preCallback callback function to be executed after the target method is invoked
     * @param: postCallback callback function to be executed after the target method is invoked
     * @param: targetObject
     */
    MetaLogger.Logger.prototype.logMethod = function(config){
        if(config.targetObject === undefined){
            config.targetObject = _window;
        }
        var func  = config.targetObject[config.targetMethodName];
        config.targetObject[config.targetMethodName] = function(){
            if(config.preCallback != undefined) config.preCallback.apply(this, arguments);
            func.apply(config.targetObject, arguments);
            if(config.postCallback != undefined) config.postCallback.apply(this, arguments);
        };
    }


    /**
     *
     */
    MetaLogger.Logger.prototype.start = function(){
        if(g_timeout != null) return;
        g_lastTime = Date.now();
        if(g_config.idletime != undefined){
            g_idleElapsedTime = 0;
            window.onload = _resetIdleTimer;
            window.onclick = _resetIdleTimer;
            window.onmousemove = _resetIdleTimer;
            window.onmouseenter = _resetIdleTimer;
            window.onkeydown = _resetIdleTimer;
            window.onscroll = _resetIdleTimer;
            window.onfocus = _resetIdleTimer;

        }
        g_timeout = setTimeout(tick, TICK_TIME);
    };

    /**
     *
     */
    MetaLogger.Logger.prototype.stop = function(){
        if(g_timeout == null) return;
        clearTimeout(g_timeout);
        g_timeout = null;
    };

    /**
     * returns true if there is no more messages in the queue waiting for processing
     */
    MetaLogger.Logger.prototype.isDone = function(){
        return OffLineStorage.getItemsLength() == 0;
    }

    /**
     * Generate a random number given a min and max range.
     * Used for testing purposes (random student ids, etc)
     */

    MetaLogger.getRandInt = function(min, max){
        return Math.floor(Math.random() * (max - min + 1)) + min;
     };

    /**
     * add a event to the queue. it will be sent ASAP by the timing mechanism of the logger.
     * @param event_name string: name of the event
     * @param data  object: json object with custom data
     * @param type  string: one of the module constants MetaLogger.EVENT_TYPE.UI, MetaLogger.EVENT_TYPE.MODEL
     */
    MetaLogger.Logger.prototype.logEvent = push_event;


    //---- PRIVATE METHODS -----------------------------

    inst_check_object = function(){
        if(typeof window[inst_target] === 'undefined'){
            setTimeout(inst_check_object, 1000);
        }
        else{
            //keep a inner reference to global window object. window is not accessible from configuration callback.
            _window = window;
            inst_cb();
        }
    }


    /*
    * this is a "fake" uuid, it is a random number that looks like one.
    * ref: http://note19.com/2007/05/27/javascript-guid-generator/
     */
    function generateUID(){
        function S4() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        }
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    };

    /**
     * run the update methods and process the event queue
     */
    function tick(){
        var now = Date.now();
        var dt = now - g_lastTime;
        update_idle_status(dt);
        process_queue();
        g_lastTime = now;
        g_timeout = setTimeout(tick, TICK_TIME);
    };

    function update_idle_status(dt){
        if(g_idleElapsedTime == null) return;
        g_idleElapsedTime += dt;
        if(g_idleElapsedTime >= g_config.idletime){

            push_event('idle', {
                "target": "document",
                "interval": g_idleElapsedTime
            }, MetaLogger.EVENT_TYPE.UI);
            g_idleElapsedTime -= g_config.idletime;
        }
    };


    function _resetIdleTimer(){
        g_idleElapsedTime = 0;
    };


    /**
     * events are stored in the queue.
     * timestamp requiere aditional calculations:
     * - if g_serverTimeOffset is set (not null), log will have a definitive timestamp atribute.
     * - else, it will have a localtimestamp atribute, and the message will stay in the queue
     *   until sometime in the future there is a serverTimeOffset to calculate timestamp and remove this
     *   temporal attribute. @see process_queue.
     * @param event_name
     * @param data
     * @param type
     */
    function push_event(event_name, data, type){

        if(g_timeout == null){
            throw new Error("logger has not been started. please be sure you called the start method before log events");
        }

        message = {
          //"session": g_config.session, session is no more stored per message. it will be sent once per batch.
          "type": type,
          "event": event_name,
          "data": data
        };

        if(g_serverTimeOffset != null)
          message.timestamp =  Date.now() - g_serverTimeOffset;
        else
          message.localtimestamp =  Date.now();

        // Save the log event in the localStorage.  If not space is available, try recycle a space
        var key = OffLineStorage.getStorageFirstKey();
        while (true != OffLineStorage.add(message) && key != null) {
            eventName = message.event;

            if (null == g_config.eventPriorities) {
                key = OffLineStorage.getStorageFirstKey();
            } else {
                switch (getPriorityByEventName(eventName)) {
                    case "low":
                        searchedPriorities = ["low"];
                        break;

                    case "medium":
                        searchedPriorities = ["low", "medium"];
                        break;

                    case "high":
                        searchedPriorities = ["low", "medium", "high"];
                        break;
                    default:
                        searchedPriorities = [];
                        key = null;
                        break;
                }

                for (index = 0; index < searchedPriorities.length; ++index) {
                    key = OffLineStorage.getFirstItemKeyByPriority(searchedPriorities[index]);

                    if (null !== key) {
                        break;
                    }
                }
            }

            if (key) {
                OffLineStorage.removeItem(key);
            }
        }
    };

    function getPriorityByEventName(eventName) {
        var priority;

        for (priority in g_config.eventPriorities) {
            if (priority) {
                if (-1 !== g_config.eventPriorities[priority].indexOf(eventName)) {
                    return priority;
                }
            }
        }
    };


    /**
     * do its best to send all the content of the OfflineStorage.
     * - try to concatenate messages until certain size limit.
     * - fix timestamp of those messages that yet have a localtimestamp attribute.
     * - add to queue those messages that fail sending.
     * general structure of the sent data:
     * {
     *  "session":{ ... },
     *  "events":[{}, {}, ... {}]
     * }
     */
    function process_queue(){

        //if navigator is offline or kinesis is not yet configured, do nothing.. let the messages accumulate in the queue and try delivery later
        if((navigator.onLine === false) || KINESIS == null)
            return;

        itemsLength = OffLineStorage.getItemsLength();
        if (itemsLength > 0) {
          keys = OffLineStorage.getItemKeys(Math.min(MAX_CONCURRENT_REQUEST, itemsLength));

          var message = '{"session":' + JSON.stringify(g_config.session) + ',"events":[';
          var size = message.length;
          var separator = "";
          var batched_keys = [];

          for(var i=0; i<keys.length; ++i){
            var key = keys[i];
            var item = JSON.stringify(OffLineStorage.getItem(key));
            if(item.length + size < MAX_BATCH_SIZE){
                message = message + separator + item;
                separator = ",";
                batched_keys.push(key);
                size += item.length + 1;
            }
            else{
                break;
            }
          };
          message += "]}";

          //send the batch!
          data = {
            "Data": btoa(message),
            "PartitionKey": Date.now().toString() + "",
            "StreamName": STREAM_NAME
          };

          KINESIS.putRecord(data, function (err, return_data) {
            //only for server side errors, preserve the message in the queue for future retry
            if(!err || (err && (httpResponse.statusCode < 500 || httpResponse.statusCode >= 600) )){
                for(i=0; i<batched_keys.length; ++i){
                    OffLineStorage.removeItem(batched_keys[i]);
                }
            }
          });


        };
    };



    /**
     * Get Kinesis access and timestamp from the server. until it receives an answer, all calls to logEvent will be queued.
     */
    function init_services(){
        _startServerTimeRequest = Date.now();
        if(xhr != null && xhr != undefined){
            http_get_xhr();
        }else{
            http_get_node();
        }
    };

    /**
     * sucess callback for http get
     * receives a JSON response from the server
     */
    function on_http_sucess(jsonResponse){
        // get the server time and calculate latency
        var servertime = parseInt(jsonResponse.time);
        var latency = Date.now() -_startServerTimeRequest;
        g_serverTimeOffset = Math.round((Date.now() + (latency / 2)) - servertime);
        // remove the response time from the response object
        delete jsonResponse.time;
        //adding exponential backoff policy
        jsonResponse.maxRetries = MAX_RETRIES;
        KINESIS = new AWS.Kinesis(jsonResponse);
    };

    /**
     * error callback for http get
     * receives a Json Response from the server
     */
    function on_http_error(jsonResponse){
        throw "Could not init Kinesis library. Server status: " + jsonResponse.status + " - Server response: " + jsonResponse.message;
    };

    /**
     * perform an http request from the browser, through xhr object
     * @param server
     * @param path
     * @param onSuccess
     * @param onError
     */
    function http_get_xhr(){
        xhr.onreadystatechange = function(){
            if (xhr.readyState == 4 && xhr.status == 200) {
                on_http_sucess(JSON.parse(xhr.responseText));
            }else if (xhr.readyState == 4){
                on_http_error(JSON.parse(xhr.responseText));
            }
        };
        // send the request
        xhr.open('GET', API_SERVER + ACCESS_ENDPOINT);
        xhr.setRequestHeader("Content-type", "application/json");
        xhr.setRequestHeader("publisher_id", g_config.session.publisher_id);
        xhr.setRequestHeader("application_id", g_config.session.application_id);
        xhr.send();
    };

    /**
     * perform an http request from node.js, through http module
     * @param server
     * @param path
     * @param onSuccess
     * @param onError
     */
    function http_get_node(){
        var options = {
            url: API_SERVER +ACCESS_ENDPOINT,
            headers: {
                "Content-type": "application/json",
                "publisher_id": g_config.session.publisher_id,
                "application_id": g_config.session.application_id
            }
        };
        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                on_http_sucess(JSON.parse(body));
            }else{
                on_http_error(JSON.parse(body));
            }
        };
        requestModule(options, callback);
    };

    /**
     * initialize the xhr object according to the type of browser, or null if it is running in node.js env.
     * @returns {*}
     */
    function init_xhr(){
        if(requestModule != null)
        {
            return null; //use Node.js http module
        }
        else if (XMLHttpRequest) { // Mozilla, WebKit, ...
            return new XMLHttpRequest();
        } else if(ActiveXObject) { // IE
            try {
                return new ActiveXObject("Msxml2.XMLHTTP");
            }
            catch (e) {
                try {
                    return new ActiveXObject("Microsoft.XMLHTTP");
                }
                catch (e) {}
            }
        }
        return null;
    };

    return MetaLogger;
}(offlineStorageModule || OffLineStorage));

if (typeof exports != 'undefined' && exports != null) {
    module.exports.Logger = MetaLogger.Logger;
}