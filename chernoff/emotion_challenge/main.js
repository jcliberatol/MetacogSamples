(function(){

  "use strict";

  $("nav button").on("click", function(ev){
    var $this = $(this);
	$this.parent().find("button").removeClass("active");
	$this.addClass("active");
	$("section").hide();
	$("section#"+$this.data("target")).show();
 });


})();
