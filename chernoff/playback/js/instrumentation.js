Metacog.init({
    "session": {
        "application_id": 'c7f16e0b559f05489e2b900f52f08a99', // Api credentials: Application key
        "publisher_id": '9d10ead1',  // Api credentials: Application ID
        "widget_id": "chernoff_tutorial"
    },
    mode: "training",
    log_tab: true
});


var Listener = {};

Listener.feature_changed = function(data){
  Main.onChange(data.id, data.value);
};

Listener.reset = function(){
  Main.reset();
  Main.render();
};

Listener.snapshot = function(data){
  Main.snapshot(data);
};

Metacog.Router.init(Listener);
Metacog.TrainingToolbar.init(true);
Metacog.Logger.start();

