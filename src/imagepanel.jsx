/** @jsx React.DOM */

var container;
var size = 263 / 2;
// image size
var mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

var w = screen.width;
var h = screen.height;

var zoom;
var svg;

var ImgPanel = React.createClass({
    propTypes: {
        dataset: React.PropTypes.object.isRequired,
        width: React.PropTypes.number.isRequired,
        height: React.PropTypes.number.isRequired,
        allimages: React.PropTypes.array.isRequired,
        images: React.PropTypes.array.isRequired,
        preloadCache: React.PropTypes.bool,
        showOpt: React.PropTypes.object,
        coord: React.PropTypes.object,
        filterDims: React.PropTypes.object,
        selected: React.PropTypes.object,
        onChangeSelected: React.PropTypes.func.isRequired
    },
    //getInitialState() {
    //    return {scale: 1};
    //},
    render() {
        return <svg id="map"></svg>;
    },
    componentDidMount() {
        this.setupD3();
        console.log('componentDidMount!',this.props);
        this.updateImages(this.props.images,this.props.showOpt,true);
    },
    isImageMappingChanged(prevProps){
        return (prevProps.showOpt.mapX != this.props.showOpt.mapX)
            || (prevProps.showOpt.mapY != this.props.showOpt.mapY)
            || !_.isEqual(prevProps.filterDims, this.props.filterDims);
    },
    componentDidUpdate(prevProps) {
        var resetZoom = this.isImageMappingChanged(prevProps);
        console.log('componentDidUpdate',this.props,prevProps,resetZoom);
        this.updateImages(this.props.images, this.props.showOpt, resetZoom);
        if(this.props.dataset.uuid != prevProps.dataset.uuid){
            this.setupD3();
        }
        if (this.props.preloadCache) {
            this.preloadCache();
        }
    },
    //shouldComponentUpdate(nextProps) {
    //
    //    return !(this.props.dataset.uuid == nextProps.dataset.uuid
    //        && this.props.width == nextProps.width
    //        && this.props.height == nextProps.height
    //        && this.props.images == nextProps.images
    //        && _.isEqual(this.props.showOpt, nextProps.images)
    //    )
    //},
    margin: {top: -5, right: -5, bottom: -5, left: -5},
    setupD3() {
        this.width = (mobile ? w * 0.9 : this.props.width) - this.margin.left - this.margin.right;
        this.height = (mobile ? h * 0.5 : this.props.height) - this.margin.top - this.margin.bottom;

        zoom = d3.behavior.zoom()
            .scaleExtent([0.02, 10])
            .on("zoom", this.zoomed);

        d3.select("#map").html("");
        svg = d3.select("#map")
            .style("width", '' + (this.width + this.margin.left + this.margin.right) + 'px')
            .style("height", '' + (this.height + this.margin.top + this.margin.bottom) + 'px')
            .append("g")
            .call(zoom);

        var rect = svg.append("rect")
            .attr("width", this.width)
            .attr("height", this.height)
            .style("fill", "none")
            .style("pointer-events", "all");

        var scale = 1;

        container = svg.append("g");
        var scaleBar = svg.append('g');
        scaleBar.append('rect')
            .attr({x: 10, y: 10, width: scale, height: 20})
            .style({fill: 'white'});

        this.setupAxes(container);

        dot = container.append("g")
            .attr("class", "dot");
    },
    updateImages(imgs,opt,resetZoom) {
        _updateImages(this.props.dataset,imgs,opt,this.click,this.props.selected,resetZoom,this);
        this.updateAxisLabels();
        updateImageResolution(this.scale);
    },
    click(d){
        function addKey() {
            var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            return (isMac && d3.event.metaKey) || (!isMac && d3.event.shiftKey);
        }

        if (!addKey()) {
            this.props.onChangeSelected('removeAll');
        }
        if (this.props.selected[d.uuid]) {
            this.props.onChangeSelected('remove',d.uuid);
        } else {
            this.props.onChangeSelected('add',d.uuid);
        }

        var self= this;

        dot.select('rect')
            .style({
                'stroke': function (d) {
                    return self.props.selected[d.uuid] ? 'pink' : '#333';
                }, 'stroke-width': function (d) {
                    return self.props.selected[d.uuid] ? 2 : 1;
                }
            });
    },
    preloadCache() {
        $('#imgcache').remove();
        var el = $('<div id="imgcache"></div>');
        $(document.body).append(el);
        el.hide();
        var self = this;
        _.map(this.props.allimages, function (im) {
            var imel = $('<img/>');
            imel.attr('src', imghref(imgbasename(self.props.dataset, im),'s1'));
            el.append(imel);
        });
    },
    scale: 1,
    zoomed() {
        var tr = d3.event.translate;
        var scale = d3.event.scale;

        //if(isNaN(tr[0])){
        //    zoom.translate([0, 0]);
        //    zoom.scale(1);
        //    zoom.event(svg.transition().duration(500));
        //}else{
//        console.log(d3.event.translate,d3.event.scale);
        container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        this.scale = d3.event.scale;
        updateImageResolution(d3.event.scale);

        //update axes
        xAxisScale.domain(calculateAxisDomain(this.props.showOpt.mapX,tr,scale,'x',this.props.showOpt.marginRatio));
        yAxisScale.domain(calculateAxisDomain(this.props.showOpt.mapY,tr,scale,'y',this.props.showOpt.marginRatio));
        yAxisScale.domain();
        xAxis.scale(xAxisScale);
        yAxis.scale(yAxisScale);

        function job(mode,el){
            if(_.contains(['pos','frame','ch','slice'],mode)){
                if(this.scale > 0.1){
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
        job(this.props.showOpt.mapX,xAxis);
        job(this.props.showOpt.mapY,yAxis);
        xAxisObj.call(xAxis);
        yAxisObj.call(yAxis);

        //}
    },
    setupAxes(container){
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

        this.xLabel = xAxisObj.append('g')
            .attr('transform','translate('+(axisPos.left+(axisPos.right-axisPos.left)/2)+',40)')
            .append('text')
            .attr('text-anchor','middle')
            .text('X position [um]');

        this.yLabel = yAxisObj.append('g')
            .attr('transform','translate(-40,'+(axisPos.top+(axisPos.bottom-axisPos.top)/2)+') rotate(270)')
            .append('text')
            .attr('text-anchor','middle')
            .text('Y position [um]');
    },
    updateAxisLabels(){
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
        job(this.props.showOpt.mapX, this.xLabel);
        job(this.props.showOpt.mapY, this.yLabel);
    }
});

function scaleTime(imgs,t){
    var startTime = _.min(_.map(imgs,function(im){return im.time;}));
//        console.log('scaleTime: ', (t-startTime)/1000);
    return (t-startTime)/1000*timeScale;
}

// Update images in svg panel and info.
function _updateImages(currentDataset,imgs, opt,click,selected,resetZoom, self) {
    console.log(resetZoom);
    //console.log('updateImages()',imgs,opt);

    dot = d3.select('g.dot');

    var maxImages = 300;
    if (imgs.length > maxImages) {
        svg.append('text')
            .attr('id','message-svg')
            .attr({x: self.props.width/2, y: self.props.height/2, fill: 'orange', 'text-anchor': 'middle'})
            .text('Too many (>'+maxImages+') images. Filter by other conditions.');
        dot = dot.selectAll('g').data([], function (d) {
            return d.uuid;
        });
        dot.exit().remove();
        return;
    }else{
        d3.select('#message-svg').remove();
    }

    console.debug(opt.sortKey);
    imgs = _.map(_.sortBy(imgs,function(im){
//            console.log(im,state.show.sortKey, im[state.show.sortKey]);
        return im[opt.sortKey];
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
        var xi = i % col;
        var r = opt.tile ? (size * opt.marginRatio * xi) :
            (opt.mapX == 'x' ? (-d.x) :
                (opt.mapX == 'y' ? (-d.y) :
                    (opt.mapX == 'pos' ? d.pos * interval:
                        (opt.mapX == 'time' ? scaleTime(imgs,d.time) :
                            (opt.mapX == 'frame' ? (d.frame * interval) :
                                (opt.mapX == 'ch' ? (d.ch * interval) :
                                    (opt.mapX == 'slice' ? (d.slice * interval) :
                                        (opt.mapX == 'const' ? 0 : 0))))))));
        return isNaN(r) ? 0 : r;
    };
    var y = function (d, i) {
        var yi = Math.floor(i / col);
        var r = opt.tile ? (size * opt.marginRatio * yi) :
            (opt.mapY == 'x' ? (-d.x) :
                (opt.mapY == 'y' ? (-d.y) :
                    (opt.mapY == 'pos' ? d.pos * interval:
                        (opt.mapY == 'time' ? scaleTime(imgs,d.time) :
                            (opt.mapY == 'frame' ? (d.frame * interval) :
                                (opt.mapY == 'ch' ? (d.ch * interval) :
                                    (opt.mapY == 'slice' ? (d.slice * interval) :
                                        (opt.mapY == 'const' ? 0 : 0))))))));
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
                return selected[d.uuid] ? 'pink' : '#333';
            }, 'stroke-width': function (d) {
                return selected[d.uuid] ? 2 : 1;
            }
        });

    var t = dot.select('image')
        .transition()
        .ease('cubic-out')
        //         .duration(time)
        .attr("x", x)
        .attr("y", y);

    if (resetZoom) {
        t.each('end', function () {
            var els = $('image');
            if (els.length > 0) {
                var xs = [], ys = [];
                els.each(function () {
                    xs.push(parseFloat($(this).attr('x')));
                    ys.push(parseFloat($(this).attr('y')));
                });
                var targetscale = Math.min((axisPos.right-axisPos.left) / (_.max(xs) - _.min(xs) + size * opt.marginRatio), (axisPos.bottom-axisPos.top) / (_.max(ys) - _.min(ys) + size * opt.marginRatio)) * 0.9;
                var tr_x = axisPos.left + 10 - targetscale * _.min(xs);
                var tr_y = axisPos.top + 10 - targetscale * _.min(ys);
                console.log(tr_x, tr_y,targetscale);

                zoom.translate([tr_x, tr_y]);
                zoom.scale(targetscale);
                zoom.event(svg.transition().duration(500));
            }
        });
    }
}

function calculateOptimalZoom(marginRatio){
    marginRatio = marginRatio || 1.1;
    var xs = [], ys = [];
    $('image').each(function () {
        xs.push(parseFloat($(this).attr('x')));
        ys.push(parseFloat($(this).attr('y')));
    });
    var targetscale = Math.min((axisPos.right-axisPos.left) / (_.max(xs) - _.min(xs) + size * marginRatio),
            (axisPos.bottom-axisPos.top) / (_.max(ys) - _.min(ys) + size * marginRatio)) * 0.9;
    var tr_x = axisPos.left + 10 - targetscale * _.min(xs);
    var tr_y = axisPos.top + 10 - targetscale * _.min(ys);
    //              console.log(tr_x, tr_y);
    return [tr_x,tr_y,targetscale];
}

var axisPos = {left: 60, right: 800, bottom: 550, top: 20};
var axisW = axisPos.right-axisPos.left, axisH = axisPos.bottom - axisPos.top;

var timeScale = 1;

function calculateAxisDomain(mode,tr,scale,ax,marginRatio){
    console.log(mode,tr,scale,ax,marginRatio);

    if(_.contains(['x','y','z'],mode)){
        if(ax == 'x'){
            return [(axisPos.left-tr[0])/scale,(axisPos.right-tr[0])/scale];
        }else{
            return [(axisPos.bottom-tr[1])/scale,(axisPos.top-tr[1])/scale];
        }
    }

    var factor = size*marginRatio;


    if(_.contains(['pos','frame','ch','slice','const'], mode)){
        //FIXME: This is incorrect for marginRatio other than 1.1
        if(ax == 'x'){
            return [((axisPos.left-tr[0])/factor)/scale-(2-marginRatio)/2,((axisPos.right-tr[0])/factor)/scale-(2-marginRatio)/2];
        }else{
            return [((axisPos.bottom-tr[1])/factor)/scale-(2-marginRatio)/2,((axisPos.top-tr[1])/factor)/scale-(2-marginRatio)/2];
        }
    }else if(mode == 'time'){
//        console.log('timeScale=',state.show.timeScale);
        var f2 = timeScale;
        if(ax == 'x'){
            return [((axisPos.left-tr[0])/f2)/scale,((axisPos.right-tr[0])/f2)/scale];
        }else{
            return [((axisPos.bottom-tr[1])/f2)/scale,((axisPos.top-tr[1])/f2)/scale];
        }
    }else{
        return [0,100];
    }
}

var timescale = function(imgs,t){
    var ts = _.map(imgs,function(d){return d.time;}).sort();
    var min = _.min(ts);
    var max = _.max(ts);
    var scale = 1/(max-min)*size*ts.length;
    return [(t-min)*scale,scale];
};

function updateImageResolution(scale){
//    console.log('updateImageResolution(): ', d3.event.scale);
    if(scale > 2.5){
        var count = 0;
        $('svg image').each(function(i,el){
            var base = $(el).attr('data-basename');
            var res = $(el).attr('data-res');
            if(res == 's1'){
                $(el).attr('href',imghref(base,'full'));
                count += 1;
            }
        });
    }
}
