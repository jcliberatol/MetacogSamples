Metacog.init({
    "session": {
        "application_id": 'c7f16e0b559f05489e2b900f52f08a99', // Api credentials: Application key
        "publisher_id": '9d10ead1',  // Api credentials: Application ID
        "widget_id": "chernoff_tutorial"
    },
    mode: "production",
    log_tab: true
});

Metacog.Logger.logMethod({
  targetMethodName: "onChange",
  targetObject: Main,
  preCallback: function(sliderid, value){
     Metacog.Router.sendEvent({
	    event: "feature_changed",
	    data: {
        id: sliderid,
        value: value
      },
	    type: Metacog.EVENT_TYPE.MODEL
    });
  }
});

Metacog.Logger.logMethod({
  targetMethodName: "reset",
  targetObject: Main,
  preCallback: function(){
     Metacog.Router.sendEvent({
	    event: "reset",
	    data: {},
	    type: Metacog.EVENT_TYPE.MODEL
    });
  }
});

Metacog.Logger.start();

