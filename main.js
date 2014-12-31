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

function setupD3() {

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
    xAxisScale.domain(calculateAxisDomain(showOpt.mapmode_x,tr,scale,'x'));
    yAxisScale.domain(calculateAxisDomain(showOpt.mapmode_y,tr,scale,'y'));
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
    job(showOpt.mapmode_x,xAxis);
    job(showOpt.mapmode_y,yAxis);
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
    job(showOpt.mapmode_x,xLabel);
    job(showOpt.mapmode_y,yLabel);
}

function calculateAxisDomain(mode,tr,scale,ax) {
    if(_.contains(['x','y','z'],mode)){
        if(ax == 'x'){
            return [(axisPos.left-tr[0])/scale,(axisPos.right-tr[0])/scale];
        }else{
            return [(axisPos.bottom-tr[1])/scale,(axisPos.top-tr[1])/scale];
        }
    }

    var factor = size*showOpt.marginRatio;

    if(_.contains(['pos','frame','ch','slice','const'], mode)){
        //FIXME: This is incorrect for marginRatio other than 1.1
        if(ax == 'x'){
            return [((axisPos.left-tr[0])/factor)/scale-(2-showOpt.marginRatio)/2,((axisPos.right-tr[0])/factor)/scale-(2-showOpt.marginRatio)/2];
        }else{
            return [((axisPos.bottom-tr[1])/factor)/scale-(2-showOpt.marginRatio)/2,((axisPos.top-tr[1])/factor)/scale-(2-showOpt.marginRatio)/2];
        }
    }else if(mode == 'time'){
//        console.log('timeScale=',showOpt.timeScale);
        var f2 = showOpt.timeScale;
        if(ax == 'x'){
            return [((axisPos.left-tr[0])/f2)/scale,((axisPos.right-tr[0])/f2)/scale];
        }else{
            return [((axisPos.bottom-tr[1])/f2)/scale,((axisPos.top-tr[1])/f2)/scale];
        }
    }else{
        return [0,100];
    }
}

function setupAxes(container){
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
}

var currentScale;
var dataset = {};

var timescale = function(imgs,t){
    var ts = _.map(imgs,function(d){return d.time;}).sort();
    var min = _.min(ts);
    var max = _.max(ts);
    var scale = 1/(max-min)*size*ts.length
    return [(t-min)*scale,scale];
};


function imghref(base, res) {
    var m = {s1: '_s1.jpg', full: '.png'};
    return base + m[res];
}

function imgbasename(dn, d) {
    var s = dataset[dn];
    return 'images/' + (s.metaset ? d.set_uuid : s.uuid) + '/' + d.uuid;
}

function updateImageResolution(scale){
//    console.log('updateImageResolution(): ', d3.event.scale);
    if(scale > 20){
        var count = 0;
        $('svg image').each(function(i,el){
            var base = $(el).attr('data-basename');
            var res = $(el).attr('data-res');
            if(res == 's1'){
                $(el).attr('href',imghref(base,'full'));
                count += 1;
            }
        });
        //if(count > 0){
        //    console.log(''+count+' images set to high res.');
        //}
    }
}

var images = [];
var currentDataset = null;

var startTime = null;

var showOpt = {tile: true, sortKey: 'time', sortReverse: false, preloadCache: true, mapmode_x: 'x', mapmode_y: 'y', marginRatio: 1.1, timeScale: 10};

var currentDim = {pos: null, frame: null, ch: null, slice: null};
var currentFilter = {pos: null, frame: null, ch: null, slice: null};

var filteringDim = [];
var existingDim;
var remainingDim;

function selectImages(images) {
    return _.filter(images, function (img) {
        return (currentFilter.pos == null || (img.meta_pos || img.pos) == currentFilter.pos)
            && (currentFilter.ch == null || (img.meta_ch || img.ch) == currentFilter.ch)
            && (currentFilter.frame == null || (img.meta_frame || img.frame) == currentFilter.frame)
            && (currentFilter.slice == null || (img.meta_slice || img.slice) == currentFilter.slice);
    });
}

$(function () {

    setupD3();

    dot = container.append("g")
        .attr("class", "dot");

    d3.csv('datasets.csv', function (d) {
        d.metaset = (+d.metaset != 0);
        d.positions = +d.positions;
        d.frames = +d.frames;
        d.channels = +d.channels;
        d.slices = +d.slices;
        d.meta_pos = +d.meta_pos;
        d.meta_frame = +d.met_frame;
        d.meta_ch = +d.meta_ch;
        d.meta_slice = +d.meta_slice;
        return d;
    }, function (err, dat) {
        dataset = {};
//        console.log(dat);
        _.map(dat, function (d) {
            dataset[d.uuid] = d;
            var m = $('#data-menu');
            var dims = ['positions','frames','channels','slices'];
            var m2 = {positions: 'P', frames: 'T', channels: 'C', slices: 'Z'};
            var s2 = _.compact(_.map(dims,function(a){return d[a] > 1 ? (m2[a] + d[a]) : null;})).join(' x ');
            var str = d.name + ' <p>(' + d.images + ' images: '+s2+')</p>';
            m.append('<li role="presentation" data-uuid="' + d.uuid + '" class="dmenu"><a href="#">' + str + '</a></li>');
            //
            //sel.append('option')
            //    .attr('value', d.uuid)
            //    .text(d.name);
        });
        $('.dmenu').click(function (ev) {
            var target = $(ev.target);
            var el = target.tagName == 'li' ? target : target.parents('li');
            el.parents('ul').children('li').removeClass('active');
            el.addClass('active');
            datasetChanged(dataset[el.attr('data-uuid')]);
        });
        $($('.dmenu > a')[0]).click();
    });

    function positionSliderChanged() {
        currentFilter.pos = positionSlider.getValue();
        var imgs = selectImages(images);
        selected = {};
        updateImages(imgs, showOpt, true);
        updateInfo();
        $('#selectinfo').html(getSelectInfo(imgs));
    }

    function frameSliderChanged() {
        currentFilter.frame = frameSlider.getValue();
        var imgs = selectImages(images);
        selected = {};
        updateImages(imgs, showOpt, true);
        updateInfo();

        //var mintime = new Date('1970-01-01');
        //var maxtime = new Date('2100-01-01');
        var maxtime = 0;
        var mintime = 1000 * 60 * 60 * 24 * 365 * 20;  //  20 years
        _.map(imgs, function (im) {
            mintime = Math.min(im.time, mintime);
            maxtime = Math.max(im.time, maxtime);
        });
        $('#time').html('' + numeral(mintime / 1000).format('0.0') + ' - ' + numeral(maxtime / 1000).format('0.0') + ' msec.');
        $('#selectinfo').html(getSelectInfo(imgs));
    }

    function getSelectInfo(imgs){
        var m = {pos: 'positions', frame: 'frames', ch: 'channels', slice: 'slices'};
        var m2 = {pos: 'position', frame: 'frame', ch: 'channel', slice: 'slice'};
        var ds = _.map(remainingDim,function(d){
            return m[d];
        });
        var s = imgs.length > 1 ? (imgs.length+' images (multiple '+ds.join(', ')+')') : (imgs.length == 0 ? 'No image' : '1 image');
        var s2 = _.compact(_.map(currentFilter,function(v,k){
            return v != null ? (m2[k] +'=' + v): null
        })).join(', ');
        var s3 = showOpt.tile ? ('Tile, sorted by ' + showOpt.sortKey) :
                    ('Mapping: x=' + showOpt.mapmode_x +', y='+showOpt.mapmode_y);
        return 'Showing '+(s2 ? '' : 'all ')+s+(s2 ? (' of ' + s2) : '') + '. ' + s3;
    }

    function channelSliderChanged() {
        currentFilter.ch = channelSlider.getValue();
        var imgs = selectImages(images);
        selected = {};
        updateImages(imgs, showOpt, true);
        updateInfo();
        $('#selectinfo').html(getSelectInfo(imgs));
    }

    function sliceSliderChanged() {
        currentFilter.slice = sliceSlider.getValue();
        var imgs = selectImages(images);
        selected = {};
        updateImages(imgs, showOpt, true);
        updateInfo();
        $('#selectinfo').html(getSelectInfo(imgs));
    }

    function selectDim(sel) {
        if (!(sel instanceof Array)) {
            sel = [sel];
        }
        filteringDim = sel;

        remainingDim = _.difference(existingDim,filteringDim);

        if (_.contains(sel, 'pos')) {
            // https://github.com/seiyria/bootstrap-slider
            positionSlider.destroy();
            positionSlider = $('#position').slider({min: 0, max: currentDim.pos - 1, value: 0})
                .on('change', positionSliderChanged)
                .data('slider');
            currentFilter.pos = 0;
            showOpt.tile = true;
        }


        if (_.contains(sel, 'frame')) {
            // https://github.com/seiyria/bootstrap-slider
            frameSlider.destroy();
            frameSlider = $('#frame').slider({min: 0, max: currentDim.frame - 1, value: 0})
                .on('change', frameSliderChanged)
                .data('slider');
            currentFilter.frame = 0;
        }

        if (_.contains(sel, 'ch')) {
            // https://github.com/seiyria/bootstrap-slider
            channelSlider.destroy();
            channelSlider = $('#channel').slider({min: 0, max: currentDim.ch - 1, value: 0})
                .on('change', channelSliderChanged)
                .data('slider');
            currentFilter.ch = 0;
        }

        if (_.contains(sel, 'slice')) {
            // https://github.com/seiyria/bootstrap-slider
            sliceSlider.destroy();
            sliceSlider = $('#slice').slider({min: 0, max: currentDim.slice - 1, value: 0})
                .on('change', sliceSliderChanged)
                .data('slider');
            currentFilter.slice = 0;
        }

        _.map(['frame', 'pos', 'ch','slice'], function (n) {
            var m = {frame: 'frame', pos: 'position', ch: 'channel', slice: 'slice'};
            if (_.contains(sel, n)) {
                $('#' + m[n] + 'slider-wrap').show();
            } else {
                $('#' + m[n] + 'slider-wrap').hide();
                currentFilter[n] = null;
            }
        });


        var imgs = selectImages(images);
        $('#selectinfo').html(getSelectInfo(imgs));
        updateMappingTool();
        updateImages(imgs,showOpt);
    }

    function updateMappingTool(){
        var sortsel = $('#tile-sort');
        sortsel.html('');
        if(_.contains(remainingDim, 'pos') && currentDim.pos > 1)
            sortsel.append('<option value="pos">Position index</option>');
        if(_.contains(remainingDim, 'frame') && currentDim.frame > 1)
            sortsel.append('<option value="frame">Frame index</option>');
        if(_.contains(remainingDim, 'ch') && currentDim.ch > 1)
            sortsel.append('<option value="ch">Channel index</option>');
        if(_.contains(remainingDim, 'slice') && currentDim.slice > 1)
            sortsel.append('<option value="slice">Slice index</option>');
        sortsel.append('<option value="time">Time</option>');
    }


    $('.dim-preset').click(function (ev) {
        var el = $(ev.target);
        var dims = el.attr('data-value').split(',');
        $('.dim-select').removeClass('active');
        _.map(dims,function(d){
            $('#dim-'+d).addClass('active');
        });
        selectDim(dims);
    });

    $('.dim-select').click(function (ev) {
        var el = $(ev.target);
        el.toggleClass('active');
        if(el.hasClass('active')){
            selectDim(filteringDim.concat([el.attr('data-value')]));
        }else{
            selectDim(_.difference(filteringDim, [el.attr('data-value')]));
        }
    });

    var maxImages = 500;

    function scaleTime(imgs,t){
        startTime = _.min(_.map(images,function(im){return im.time;}));
//        console.log('scaleTime: ', (t-startTime)/1000);
        return (t-startTime)/1000*showOpt.timeScale;
    }

    function myalert(msg,elname){
        var el = $(elname || '#message');
        el.html('<span style="color: orange">'+msg+'</span>');
        window.setTimeout(function(){
            el.html('');
        },2000);
    }

    function updateImages(imgs, opt, keepZoom) {
        dot = d3.select('g.dot');

        if (imgs.length > maxImages) {
            $('#selectinfo').html('<span style="color: orange;">Too many (>'+maxImages+') images. Filter by other conditions.</span>');
            dot = dot.selectAll('g').data([], function (d) {
                return d.uuid;
            });
            dot.exit().remove();
            return;
        }
        imgs = _.map(_.sortBy(imgs,function(im){
//            console.log(im,showOpt.sortKey, im[showOpt.sortKey]);
            return im[showOpt.sortKey];
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
        var interval =  size*showOpt.marginRatio;
        var x = function (d, i) {
            if(isNaN(d.time)){
        //        console.error('d.time is NaN!');
        //        console.log(d);
            }
            var xi = i % col;
            var r = opt.tile ? (size * showOpt.marginRatio * xi) :
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
            var r = opt.tile ? (size * showOpt.marginRatio * yi) :
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

        if (!keepZoom) {
            t.each('end', function () {
                var els = $('image');
                if (els.length > 0) {
                    var xs = [], ys = [];
                    els.each(function () {
                        xs.push(parseFloat($(this).attr('x')));
                        ys.push(parseFloat($(this).attr('y')));
                    });
                    var targetscale = Math.min((axisPos.right-axisPos.left) / (_.max(xs) - _.min(xs) + size * showOpt.marginRatio), (axisPos.bottom-axisPos.top) / (_.max(ys) - _.min(ys) + size * showOpt.marginRatio)) * 0.9;
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

    $('#zoomAll').click(function () {
        var xs = [], ys = [];
        $('image').each(function () {
            xs.push(parseFloat($(this).attr('x')));
            ys.push(parseFloat($(this).attr('y')));
        });
        var targetscale = Math.min((axisPos.right-axisPos.left) / (_.max(xs) - _.min(xs) + size * showOpt.marginRatio), (axisPos.bottom-axisPos.top) / (_.max(ys) - _.min(ys) + size * showOpt.marginRatio)) * 0.9;
        var tr_x = axisPos.left + 10 - targetscale * _.min(xs);
        var tr_y = axisPos.top + 10 - targetscale * _.min(ys);
        //              console.log(tr_x, tr_y);

        zoom.translate([tr_x, tr_y]);
        zoom.scale(targetscale);
        zoom.event(svg.transition().duration(500));
    });

    function updateToolbar() {
        $('.dim-select,.dim-preset').each(function(){
            var el = $(this);
            var ds = el.attr('data-value').split(',');
            var flag = false;
            for(i in ds){
                if(currentDim[ds[i]] <= 1){
                    flag = true;
                    break;
                }
            }
            el.attr('disabled',flag);
        });

        if (currentDim.pos > 1) {
            positionSlider.destroy();
            positionSlider = $('#position').slider({min: 0, max: currentDim.pos - 1, value: 0})
                .on('change', positionSliderChanged)
                .data('slider');

            $('#tags').append('<span class="label label-default">Positions</span>');
        } else {
            $('#channelslider-wrap').hide();
        }

        if (currentDim.frame > 1) {
            frameSlider.destroy();
            frameSlider = $('#frame').slider({min: 0, max: currentDim.frame - 1, value: 0})
                .on('change', frameSliderChanged)
                .data('slider');
            $('#frameslider-wrap').show();
            $('#time').show();
            $('#tags').append('<span class="label label-primary">Time lapse</span>');
        } else {
            $('#frameslider-wrap').hide();
            $('#time').hide();
        }

        if (currentDim.ch > 1) {
            channelSlider.destroy();
            channelSlider = $('#channel').slider({min: 0, max: currentDim.ch - 1, value: 0})
                .on('change', channelSliderChanged)
                .data('slider');
            $('#channelslider-wrap').show();
            $('#tags').append('<span class="label label-warning">Channels</span>');
        } else {
            $('#channelslider-wrap').hide();
        }
        if (currentDim.slice > 1) {
            sliceSlider.destroy();
            sliceSlider = $('#slice').slider({min: 0, max: currentDim.slice - 1, value: 0})
                .on('change', sliceSliderChanged)
                .data('slider');
            $('#sliceslider-wrap').show();
            $('#tags').append('<span class="label label-success">Slices</span>');
        } else {
            $('#sliceslider-wrap').hide();
        }
    }

    function datasetChanged(s) {

        d3.csv("metadata/" + s.uuid + ".csv", imgcsv_read, function (error, imgs) {
            currentDataset = s.uuid;
            selected = {};
            images = imgs;
            $('#tags').html('');
            $('.dim-select').removeClass('active');

            currentFilter = {pos: null, frame: null, ch: null, slice: null};

            var ts = _.map(images,function(im){return im.time;});
            console.log(ts);
            startTime = _.min(ts);

            existingDim = [];

            currentDim.pos = s.meta_pos || s.positions;
            currentDim.frame = s.meta_frame || s.frames;
            currentDim.ch = s.meta_ch || s.channels;
            currentDim.slice = s.meta_slice || s.slices;

            if(currentDim.pos > 1)
                existingDim.push('pos');
            if(currentDim.frame > 1)
                existingDim.push('frame');
            if(currentDim.ch > 1)
                existingDim.push('ch');
            if(currentDim.slice > 1)
                existingDim.push('slice');

            var biggestDim = _.sortBy(Object.keys(currentDim),function(k){return 0-currentDim[k]})[0];
            currentFilter[biggestDim] = 0;
            selectDim([biggestDim]);


            updateToolbar();
       //     console.log(currentDim);

//            selectDim([biggestDim]);
       //     console.log(biggestDim);
            $('#dim-'+biggestDim).click();
            imgs = selectImages(images);

            updateImages(imgs, showOpt);
            updateInfo();
            $('#selectinfo').html(getSelectInfo(imgs));
            if (showOpt.preloadCache) {
                $('#imgcache').remove();
                var el = $('<div id="imgcache"></div>');
                $(document.body).append(el);
                el.hide();
                _.map(images, function (im) {
                    var imel = $('<img/>');
                    imel.attr('src', imghref(imgbasename(currentDataset, im),'s1'));
                    el.append(imel);
                });
            }
            $('#map-tile').click();
        });
    }

    //
    // Event handlers for options of mapping images on screen.
    //

    $('.map-select').click(function (ev) {
        var el = $(ev.target);
        $(".map-select").removeClass('active');
        el.addClass('active');
        if(el.attr('id') == 'map-tile'){
            $('#sort-tool').show();
            $('#xy-tool').hide();
            showOpt.tile = true;
        }else{
            $('#sort-tool').hide();
            $('#xy-tool').show();
            showOpt.tile = false;
        }
    //    console.log('map-select clicked.');
        var imgs = selectImages(images);
        updateImages(imgs,showOpt);
        $('#selectinfo').html(getSelectInfo(imgs));
    });

    $('#tile-sort').on('change',function(){
        showOpt.sortKey = $(this).val();
        var imgs = selectImages(images);
        updateImages(imgs,showOpt);
        $('#selectinfo').html(getSelectInfo(imgs));
    });

    $('#sort-reverse').on('change',function(){
        showOpt.sortReverse = this.checked;
        var imgs = selectImages(images);
        updateImages(imgs,showOpt);
        $('#selectinfo').html(getSelectInfo(imgs));
    });


    $('.map-preset').click(function (ev) {
        var el = $(ev.target);
        var xy = el.attr('data-value').split(',');
        $('#xcoord').val(xy[0]);
        $('#ycoord').val(xy[1]);
        $('#xcoord').trigger('change');
        $('#ycoord').trigger('change');
    });

    $('#xcoord').on('change',function(ev){
        showOpt.mapmode_x = $(this).val();
        var imgs = selectImages(images);
        updateImages(imgs, showOpt);
        $('#selectinfo').html(getSelectInfo(imgs));
        updateAxisLabels();
    });
    $('#ycoord').on('change',function(ev){
        showOpt.mapmode_y = $(this).val();
        var imgs = selectImages(images);
        updateImages(imgs, showOpt);
        $('#selectinfo').html(getSelectInfo(imgs));
        updateAxisLabels();
    });

    $('#switch-xy').click(function(){
        var x = $('#xcoord').val();
        var y = $('#ycoord').val();
        $('#xcoord').val(y);
        $('#ycoord').val(x);
        //$('#xcoord > option[value="'+y+'"]').attr('selected', 'selected');
        //$('#ycoord > option[value="'+x+'"]').attr('selected', 'selected');
        $('#xcoord').trigger('change');
        $('#ycoord').trigger('change');
    });

    $('#colorpicker-bg').on('change',function(){
        $('svg').css('background','#'+$(this).val());
    });

    $('#colorpicker-fg').on('change',function(){
        $('svg text,.axis.primary').css('fill','#'+$(this).val());
    });

    $('#colorpicker-grid').on('change',function(){
        $('svg line').css('stroke','#'+$(this).val());
    });

    $('.color-preset').click(function (ev) {
        var el = $(ev.target);
        var cs = el.attr('data-value').split(',');
        $('#colorpicker-bg').val(cs[0]).trigger('change');
        $('#colorpicker-fg').val(cs[1]).trigger('change');
        $('#colorpicker-grid').val(cs[2]).trigger('change');
    });


    // Sliders

    var positionSlider = $('#position').slider({min: 0, max: 0, value: 0})
        .on('change', positionSliderChanged)
        .data('slider');
    var frameSlider = $('#frame').slider({min: 0, max: 0, value: 0})
        .on('change', frameSliderChanged)
        .data('slider');
    var channelSlider = $('#channel').slider({min: 0, max: 0, value: 0})
        .on('change', channelSliderChanged)
        .data('slider');
    var sliceSlider = $('#slice').slider({min: 0, max: 0, value: 0})
        .on('change', sliceSliderChanged)
        .data('slider');
    function pad(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length - size);
    }


    function path(dn, d) {
        var s = dataset[dn];
        if (s.metaset) {
            return d.folder + '/' + 'Pos0' + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_'+ pad(d.slice,3) + '.tif';
        } else {
            return s.folder + '/' + d.posname + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_' +pad(d.slice,3)  + '.tif';
        }

    }

    var selected = {};

    function addKey() {
        var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        return (isMac && d3.event.metaKey) || (!isMac && d3.event.shiftKey);
    }

    function click(d) {
        if (!addKey()) {
            selected = {};
        }
        if (selected[d.uuid]) {
            delete selected[d.uuid];
        } else {
            selected[d.uuid] = d;
        }

        dot.select('rect')
            .style({
                'stroke': function (d) {
                    return selected[d.uuid] ? 'pink' : '#333';
                }, 'stroke-width': function (d) {
                    return selected[d.uuid] ? 2 : 1;
                }
            });

        updateInfo();
    }

    function updateInfo() {
        var t = d3.select('#info tbody');
        t.html('');
        _.map(selected, function (im) {
            var sec = (im.time-startTime)/1000;
            console.log(sec,im);
            r = t.append('tr');
            r.append('td').html(im.uuid);
            r.append('td').html(path(currentDataset, im));
            r.append('td').html(''+Math.floor(sec)+'.'+(Math.floor(sec*10)%10));
            r.append('td').html(''+im.pos);
            r.append('td').html(''+im.frame);
            r.append('td').html(''+im.ch);
            r.append('td').html(''+im.slice);
        });
    }

    function imgcsv_read(d) {
        d.x = +d.x;
        d.y = +d.y;
        d.pos = +d.meta_pos || +d.pos;
        d.frame = +d.meta_frame || +d.frame;
        d.ch = +d.meta_ch || +d.ch;
        d.slice = +d.meta_slice || +d.slice;
        d.meta_pos = +d.meta_pos;
        d.meta_frame = +d.meta_frame;
        d.meta_ch = +d.meta_ch;
        d.meta_slice = +d.meta_slice;
        d.time = moment(d.stime, 'YYYY-MM-DD HHmm:ss Z').valueOf() + parseInt(d.time);
        if(isNaN(d.time)){
            //console.error('d.time is NaN!');
            //console.log(d);
        }
        return d;
    }


});


