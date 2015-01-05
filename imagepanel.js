var container;
var size = 263 / 2;
// image size
var mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

var w = screen.width;
var h = screen.height;

var margin = {top: -5, right: -5, bottom: -5, left: -5};
var width;
var height;

var zoom;

var svg;

setupD3 = function() {

    width = (mobile ? w * 0.9 : 900) - margin.left - margin.right;
    height = (mobile ? h * 0.5 : 600) - margin.top - margin.bottom;

    zoom = d3.behavior.zoom()
        .scaleExtent([0.02, 10])
        .on("zoom", zoomed);


    svg = d3.select("#map")
        .style("width", ''+(width + margin.left + margin.right)+'px')
        .style("height", ''+(height + margin.top + margin.bottom)+'px')
        .append("g")
//        .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
        .call(zoom);


    var rect = svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all");

    var scale = 1;

    container = svg.append("g");
    var scaleBar = svg.append('g');
    scaleBar.append('rect')
        .attr({x: 10, y: 10, width: scale, height: 20})
        .style({fill: 'white'});

    setupAxes(container);


    dot = container.append("g")
        .attr("class", "dot");
};


function scaleTime(imgs,t){
    startTime = _.min(_.map(images,function(im){return im.time;}));
//        console.log('scaleTime: ', (t-startTime)/1000);
    return (t-startTime)/1000*state.show.timeScale;
}


// Update images in svg panel and info.
function updateImages(imgs, opt) {

    function click(d) {
        if (!addKey()) {
            state.selected = {};
        }
        if (state.selected[d.uuid]) {
            delete state.selected[d.uuid];
        } else {
            state.selected[d.uuid] = d;
        }

        dot.select('rect')
            .style({
                'stroke': function (d) {
                    return state.selected[d.uuid] ? 'pink' : '#333';
                }, 'stroke-width': function (d) {
                    return state.selected[d.uuid] ? 2 : 1;
                }
            });

        updateInfo();
    }

    dot = d3.select('g.dot');

    var maxImages = 300;
    if (imgs.length > maxImages) {
        $('#selectinfo').html('<span style="color: orange;">Too many (>'+maxImages+') images. Filter by other conditions.</span>');
        dot = dot.selectAll('g').data([], function (d) {
            return d.uuid;
        });
        dot.exit().remove();
        return;
    }
    imgs = _.map(_.sortBy(imgs,function(im){
//            console.log(im,state.show.sortKey, im[state.show.sortKey]);
        return im[state.show.sortKey];
    }),function(im){
        return im;
    });
    if(opt.sortReverse){
        imgs = imgs.reverse();
    }

    //      console.log(imgs,opt);
    var opt = opt || {};
    dot = dot.selectAll('g').data(imgs, function (d) {
        return d.uuid;
    });
    dot.exit().remove();
    var appended = dot.enter().append("g");
    var col = Math.round(Math.sqrt(imgs.length)*1.25);
    var interval =  size*opt.marginRatio;
    var x = function (d, i) {
        if(isNaN(d.time)){
            //        console.error('d.time is NaN!');
            //        console.log(d);
        }
        var xi = i % col;
        var r = opt.tile ? (size * state.show.marginRatio * xi) :
            (opt.mapmode_x == 'x' ? (-d.x) :
                (opt.mapmode_x == 'y' ? (-d.y) :
                    (opt.mapmode_x == 'pos' ? d.pos * interval:
                        (opt.mapmode_x == 'time' ? scaleTime(imgs,d.time) :
                            (opt.mapmode_x == 'frame' ? (d.frame * interval) :
                                (opt.mapmode_x == 'ch' ? (d.ch * interval) :
                                    (opt.mapmode_x == 'slice' ? (d.slice * interval) :
                                        (opt.mapmode_x == 'const' ? 0 : 0))))))));
        return isNaN(r) ? 0 : r;
    };
    var y = function (d, i) {
        var yi = Math.floor(i / col);
        var r = opt.tile ? (size * state.show.marginRatio * yi) :
            (opt.mapmode_y == 'x' ? (-d.x) :
                (opt.mapmode_y == 'y' ? (-d.y) :
                    (opt.mapmode_y == 'pos' ? d.pos * interval:
                        (opt.mapmode_y == 'time' ? scaleTime(imgs,d.time) :
                            (opt.mapmode_y == 'frame' ? (d.frame * interval) :
                                (opt.mapmode_y == 'ch' ? (d.ch * interval) :
                                    (opt.mapmode_y == 'slice' ? (d.slice * interval) :
                                        (opt.mapmode_y == 'const' ? 0 : 0))))))));
        return isNaN(r) ? 0 : r;
    };

    appended.append('image')
//            .attr('filter', 'url(#autocontrast)')
        .attr("x", x)
        .attr("y", y)
        .attr('xlink:href', function (d) {
            return imghref(imgbasename(currentDataset, d), 's1');
        })
        //.attr('svg:title',function(d){
        //    return d.pos;
        //})
        .attr('data-basename', function (d) {
            return imgbasename(currentDataset, d, 's1');
        })
        .attr({
            'data-res': 's1',
            width: size, height: size, alt: function (d) {
                return d.name;
            }
        })
        .on('click', click);
    appended.append('rect')
        //.attr("x", function(d,i){return x(d,i)+1})
        //.attr("y", function(d,i){return y(d,i)+1})
        .attr("x", x)
        .attr("y", y)
        .attr('class', 'imgbox')
        .attr({width: size, height: size});

//        var time = 200;
    dot.select('rect')
        .transition()
        .ease('cubic-out')
        //           .duration(time)
        .attr("x", x)
        .attr("y", y)
        .style({
            stroke: function (d) {
                return state.selected[d.uuid] ? 'pink' : '#333';
            }, 'stroke-width': function (d) {
                return state.selected[d.uuid] ? 2 : 1;
            }
        });

    var t = dot.select('image')
        .transition()
        .ease('cubic-out')
        //         .duration(time)
        .attr("x", x)
        .attr("y", y);

    if (!opt.keepZoom) {
        t.each('end', function () {
            var els = $('image');
            if (els.length > 0) {
                var xs = [], ys = [];
                els.each(function () {
                    xs.push(parseFloat($(this).attr('x')));
                    ys.push(parseFloat($(this).attr('y')));
                });
                var targetscale = Math.min((axisPos.right-axisPos.left) / (_.max(xs) - _.min(xs) + size * state.show.marginRatio), (axisPos.bottom-axisPos.top) / (_.max(ys) - _.min(ys) + size * state.show.marginRatio)) * 0.9;
                var tr_x = axisPos.left + 10 - targetscale * _.min(xs);
                var tr_y = axisPos.top + 10 - targetscale * _.min(ys);
                //              console.log(tr_x, tr_y);

                zoom.translate([tr_x, tr_y]);
                zoom.scale(targetscale);
                zoom.event(svg.transition().duration(500));
            }
        });
    }
    updateImageResolution(currentScale);

    //$('image').on('load', function(){
    //    console.log($(this).parent('g').find('rect').css('fill','none'));
    //});
}


var axisPos = {left: 60, right: 800, bottom: 550, top: 20};
var axisW = axisPos.right-axisPos.left, axisH = axisPos.bottom - axisPos.top;

function zoomed() {
    var tr = d3.event.translate;
    var scale = d3.event.scale;

    //if(isNaN(tr[0])){
    //    zoom.translate([0, 0]);
    //    zoom.scale(1);
    //    zoom.event(svg.transition().duration(500));
    //}else{
//        console.log(d3.event.translate,d3.event.scale);
    container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    currentScale = d3.event.scale;
    updateImageResolution(d3.event.scale);

    //update axes
    xAxisScale.domain(calculateAxisDomain(state.show.mapmode_x,tr,scale,'x'));
    yAxisScale.domain(calculateAxisDomain(state.show.mapmode_y,tr,scale,'y'));
    yAxisScale.domain();
    xAxis.scale(xAxisScale);
    yAxis.scale(yAxisScale);

    function job(mode,el){
        if(_.contains(['pos','frame','ch','slice'],mode)){
            if(currentScale > 0.1){
                el.tickValues(null);
//                el.tickValues(_.range(50));
            }else{
                //               el.tickValues(_.range(0,200,10));
            }
        }else if(mode == 'time') {
            el.tickValues(null);
        }else if(mode == 'const') {
            el.tickValues([0]);
        }else{
            el.tickValues(null);
        }
    }
    job(state.show.mapmode_x,xAxis);
    job(state.show.mapmode_y,yAxis);
    xAxisObj.call(xAxis);
    yAxisObj.call(yAxis);

    //}
}

function updateAxisLabels(){
    var m = {pos: 'Position', frame: 'Frame', ch: 'Channel', slice: 'Slice'};
    function job(mode,el){
        if(_.contains(['pos','frame','ch','slice'],mode)) {
            el.text(m[mode] + ' index');
        }else if('x' == mode){
            el.text('X position [um]')
        }else if('y' == mode){
            el.text('Y position [um]')
        }else if('z' == mode){
            el.text('Z position [um]')
        }else if('time' == mode){
            el.text('Time [sec]')
        }else if('const' == mode){
            el.text('')
        }
    }
    job(state.show.mapmode_x,xLabel);
    job(state.show.mapmode_y,yLabel);
}

calculateAxisDomain = function(mode,tr,scale,ax){
    if(_.contains(['x','y','z'],mode)){
        if(ax == 'x'){
            return [(axisPos.left-tr[0])/scale,(axisPos.right-tr[0])/scale];
        }else{
            return [(axisPos.bottom-tr[1])/scale,(axisPos.top-tr[1])/scale];
        }
    }

    var factor = size*state.show.marginRatio;

    if(_.contains(['pos','frame','ch','slice','const'], mode)){
        //FIXME: This is incorrect for marginRatio other than 1.1
        if(ax == 'x'){
            return [((axisPos.left-tr[0])/factor)/scale-(2-state.show.marginRatio)/2,((axisPos.right-tr[0])/factor)/scale-(2-state.show.marginRatio)/2];
        }else{
            return [((axisPos.bottom-tr[1])/factor)/scale-(2-state.show.marginRatio)/2,((axisPos.top-tr[1])/factor)/scale-(2-state.show.marginRatio)/2];
        }
    }else if(mode == 'time'){
//        console.log('timeScale=',state.show.timeScale);
        var f2 = state.show.timeScale;
        if(ax == 'x'){
            return [((axisPos.left-tr[0])/f2)/scale,((axisPos.right-tr[0])/f2)/scale];
        }else{
            return [((axisPos.bottom-tr[1])/f2)/scale,((axisPos.top-tr[1])/f2)/scale];
        }
    }else{
        return [0,100];
    }
};

setupAxes = function(container){
    var s = 1200;

    container.append("g")
        .attr("class", "x axis")
        .selectAll("line")
        .data(d3.range(-s, s, 10))
        .enter().append("line")
        .attr("x1", function (d) {
            return d;
        })
        .attr("y1", -s)
        .attr("x2", function (d) {
            return d;
        })
        .attr("y2", s);

    container.append("g")
        .attr("class", "y axis")
        .selectAll("line")
        .data(d3.range(-s, s, 10))
        .enter().append("line")
        .attr("x1", -s)
        .attr("y1", function (d) {
            return d;
        })
        .attr("x2", s)
        .attr("y2", function (d) {
            return d;
        });

    xAxisScale = d3.scale.linear().domain([0,100]).range([axisPos.left,axisPos.right]);
    yAxisScale = d3.scale.linear().domain([0,100]).range([axisPos.bottom,axisPos.top]);
    xAxis = d3.svg.axis().scale(xAxisScale).orient('bottom').ticks(10).innerTickSize([10]).tickFormat(d3.format("d"));
    yAxis = d3.svg.axis().scale(yAxisScale).orient('left').ticks(10).innerTickSize([10]).tickFormat(d3.format("d"));

    xAxisObj = svg.append("g")
        .attr('transform','translate(0,'+axisPos.bottom+')')
        .attr("class",'x axis primary');
//        .call(xAxis);
    yAxisObj = svg.append("g")
        .attr('transform','translate('+axisPos.left+',0)')
        .attr("class",'y axis primary');
    //       .call(yAxis);

    xLabel = xAxisObj.append('g')
        .attr('transform','translate('+(axisPos.left+(axisPos.right-axisPos.left)/2)+',40)')
        .append('text')
        .attr('text-anchor','middle')
        .text('X position [um]');

    yLabel = yAxisObj.append('g')
        .attr('transform','translate(-40,'+(axisPos.top+(axisPos.bottom-axisPos.top)/2)+') rotate(270)')
        .append('text')
        .attr('text-anchor','middle')
        .text('Y position [um]');
};

var currentScale;

var timescale = function(imgs,t){
    var ts = _.map(imgs,function(d){return d.time;}).sort();
    var min = _.min(ts);
    var max = _.max(ts);
    var scale = 1/(max-min)*size*ts.length;
    return [(t-min)*scale,scale];
};