var Main = (function () {
  "use strict";

  var Main = {
  };

  //the model
  Main.data = [{}];


  Main.render = function(){
    if(Main.el) Main.el.remove();
    Main.el = Main.svg.selectAll("g.chernoff").data(Main.data).enter()
    .append("svg:g")
    .attr("class", "chernoff")
    .attr("transform", function(d, i) {
      return "scale(2.0)translate(20,0)";
    })
    .call(Main.chernoff);
  }

  /**
  * update model, refresh view
  */
  Main.onChange = function(sliderid, value){
    if(sliderid){
      Main.data[0][sliderid] = value;
    }
    Main.render();
  };

  /**
  * restore values in the model and view
  */
  Main.reset = function(){
    Main.data[0].f = 0;
    Main.data[0].h = 0;
    Main.data[0].m =  0;
    Main.data[0].nw= 0;
    Main.data[0].nh= 0;
    Main.data[0].ew= 0;
    Main.data[0].eh= 0;
    Main.data[0].b= 0;
    d3.selectAll('input[type="range"]').each(function(){this.value=0.0;});
  }

  /**
  * initialize model and view, attach event handlers
  */
  Main.init = function(){
    Main.chernoff = d3.chernoff()
    .face(function(d) { return d.f; })
    .hair(function(d) { return d.h; })
    .mouth(function(d) { return d.m; })
    .nosew(function(d) { return d.nw; })
    .noseh(function(d) { return d.nh; })
    .eyew(function(d) { return d.ew; })
    .eyeh(function(d) { return d.eh; })
    .brow(function(d) { return d.b; });

    Main.svg = d3.select(".scene").append("svg:svg")
    .attr("height", 350).attr("width", 350);

    Main.reset();
    Main.onChange();

    //attaching event listeners
    d3.selectAll("input").on("change", function(){
      Main.onChange(this.getAttribute("id"), this.valueAsNumber);
    });

    d3.selectAll("input").on("input", function(){
      Main.onChange(this.getAttribute("id"), this.valueAsNumber);
    });

    d3.selectAll("button#reset").on("click", function(){
      Main.reset();
      Main.render();
    });
  }

  Main.init();
  return Main;
})();
