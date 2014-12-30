var container;
var size = 26.3;
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
        .scaleExtent([0.2, 40])
        .on("zoom", zoomed);


    svg = d3.select("#map")
        .style("width", width + margin.left + margin.right)
        .style("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
        .call(zoom);


    // filters go in defs element
    var defs = d3.select("#map").append("defs");

    // create filter with id #drop-shadow
    // height=130% so that the shadow is not clipped
    var filter = defs.append("filter")
        .attr("id", "autocontrast");
    var tr = filter.append('feComponentTransfer');
    var slope = 1;
    var intercept = 0;
    var feFuncR = tr.append('feFuncR');
    feFuncR.attr('type', 'linear').attr('slope', slope).attr('intercept', intercept);
    var feFuncG = tr.append('feFuncG');
    feFuncG.attr('type', 'linear').attr('slope', slope).attr('intercept', intercept);
    var feFuncB = tr.append('feFuncB');
    feFuncB.attr('type', 'linear').attr('slope', slope).attr('intercept', intercept);

    function changeFilter(slope, intercept) {
        feFuncR.transition().duration(100).ease('linear').attr('slope', slope).attr('intercept', intercept);
        feFuncG.transition().duration(100).ease('linear').attr('slope', slope).attr('intercept', intercept);
        feFuncB.transition().duration(100).ease('linear').attr('slope', slope).attr('intercept', intercept);
    }


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


    function zoomed() {
        var tr = d3.event.translate;
        if(isNaN(tr[0])){
            zoom.translate([0, 0]);
            zoom.scale(1);
            zoom.event(svg.transition().duration(500));
        }else{
//        console.log(d3.event.translate,d3.event.scale);
            container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            currentScale = d3.event.scale;
            updateImageResolution(d3.event.scale);
        }
    }
}

var currentScale;
var dataset = {};

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

$(function () {

    setupD3();

    var sel = d3.select('#data-select');

    var images = [];
    var currentDataset = null;
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
        console.log(dat);
        _.map(dat, function (d) {
            dataset[d.uuid] = d;
            var m = $('#data-menu');
            var dims = ['positions','frames','channels','slices'];
            var m2 = {positions: 'P', frames: 'T', channels: 'C', slices: 'Z'};
            var s2 = _.compact(_.map(dims,function(a){return d[a] > 1 ? (m2[a] + d[a]) : null;})).join(' x ');
            var str = d.name + ' <p>(' + d.images + ' images: '+s2+')</p>';
            console.log(d.uuid);
            m.append('<li role="presentation" data-uuid="' + d.uuid + '" class="dmenu"><a href="#">' + str + '</a></li>');
            //
            //sel.append('option')
            //    .attr('value', d.uuid)
            //    .text(d.name);
        });
        $('.dmenu').click(function (ev) {
            var target = $(ev.target);
            var el = target.tagName == 'li' ? target : target.parents('li');
            console.log(el);
            el.parents('ul').children('li').removeClass('active');
            el.addClass('active');
            datasetChanged(dataset[el.attr('data-uuid')]);
        });
        $($('.dmenu > a')[0]).click();
    });


    function selectImages(images) {
        console.log('selectImages()',currentFilter,currentDim);
        return _.filter(images, function (img) {
            return (currentFilter.pos == null || (img.meta_pos || img.pos) == currentFilter.pos)
                && (currentFilter.ch == null || (img.meta_ch || img.ch) == currentFilter.ch)
                && (currentFilter.frame == null || (img.meta_frame || img.frame) == currentFilter.frame)
                && (currentFilter.slice == null || (img.meta_slice || img.slice) == currentFilter.slice);
        });
    }

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
        })).join(', ') + '.';
        var s3 = showOpt.tile ? ('Tile, sorted by ' + showOpt.sortKey) :
                    ('Mapping: x=' + showOpt.mapmode_x +', y='+showOpt.mapmode_y);
        return 'Showing '+s+' of ' + s2 + ' ' + s3;
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


    var showOpt = {tile: true, sortKey: 'time', sortReverse: false, preloadCache: true, mapmode_x: 'x', mapmode_y: 'y'};

    var currentDim = {pos: null, frame: null, ch: null, slice: null};
    var currentFilter = {pos: null, frame: null, ch: null, slice: null};

    var primaryDim;
    var filteringDim = [];
    var existingDim;
    var remainingDim;

    function selectDim(sel) {
        if (!(sel instanceof Array)) {
            sel = [sel];
        }
        console.log(filteringDim);
        filteringDim = sel;
        console.log(filteringDim);

        remainingDim = _.difference(existingDim,filteringDim);

        console.log(currentDim);
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
        console.log(imgs.length);
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

    function myalert(msg,elname){
        var el = $(elname || '#message');
        el.html('<span style="color: orange">'+msg+'</span>');
        window.setTimeout(function(){
            el.html('');
        },2000);
    }

    function updateImages(imgs, opt, keepZoom) {
        console.log(opt);
        dot = d3.select('g.dot');

        if (imgs.length > maxImages) {
            $('#selectinfo').html('<span style="color: orange;">Too many (>'+maxImages+') images. Filter by other conditions.</span>');
            dot = dot.selectAll('g').data([], function (d) {
                return d.uuid;
            });
            dot.exit().remove();
            return;
        }

        imgs = _.sortBy(imgs,function(im){
//            console.log(im,showOpt.sortKey, im[showOpt.sortKey]);
            return im[showOpt.sortKey];
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
        var timescale = function(t){
            var ts = _.map(imgs,function(d){return d.time;}).sort();
            var intervals = [];
            for(var i = 1; i < imgs.length; i++){
                intervals.push(ts[i] - ts[i-1]);
            }
            var interval = _.min(intervals);
            var min = _.min(ts);
            var max = _.max(ts);
            return (t-min)/(max-min)*size*ts.length;
        };
        var appended = dot.enter().append("g");
        var col = Math.round(Math.sqrt(imgs.length)*1.25);
        var x = function (d, i) {
            if(isNaN(d.time)){
                console.error('d.time is NaN!');
                console.log(d);
            }
            var xi = i % col;
            var r = opt.tile ? (size * 1.1 * xi) :
                (opt.mapmode_x == 'x' ? (-d.x / 10) :
                    (opt.mapmode_x == 'y' ? (-d.y / 10) :
                        (opt.mapmode_x == 'time' ? timescale(d.time) :
                            (opt.mapmode_x == 'frame' ? (d.frame * 30) :
                                (opt.mapmode_x == 'ch' ? (d.ch * 30) :
                                    (opt.mapmode_x == 'slice' ? (d.slice * 30) :
                                        (opt.mapmode_x == 'const' ? 0 : 0)))))));
            return isNaN(r) ? 0 : r;
        };
        var y = function (d, i) {
            var yi = Math.floor(i / col);
            var r = opt.tile ? (size * 1.1 * yi) :
                (opt.mapmode_y == 'x' ? (-d.x / 10) :
                    (opt.mapmode_y == 'y' ? (-d.y / 10) :
                        (opt.mapmode_y == 'time' ? timescale(d.time) :
                            (opt.mapmode_y == 'frame' ? (d.frame * 30) :
                                (opt.mapmode_y == 'ch' ? (d.ch * 30) :
                                    (opt.mapmode_y == 'slice' ? (d.slice * 30) :
                                        (opt.mapmode_y == 'const' ? 0 : 0)))))));
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
                    var targetscale = Math.min(width / (_.max(xs) - _.min(xs) + size * 1.1), height / (_.max(ys) - _.min(ys) + size * 1.1)) * 0.9;
                    var tr_x = 20 - targetscale * _.min(xs);
                    var tr_y = 20 - targetscale * _.min(ys);
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

    $('#play').click(function () {

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

            existingDim = [];

            console.log(s, currentDim);

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
            console.log(biggestDim);
            selectDim([biggestDim]);


            updateToolbar();
            console.log(currentDim);

//            selectDim([biggestDim]);
            console.log(biggestDim);
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
        console.log('map-select clicked.');
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
        $('#xcoord > option[value="'+xy[0]+'"]').attr('selected', 'selected');
        $('#ycoord > option[value="'+xy[1]+'"]').attr('selected', 'selected');
        $('#xcoord').trigger('change');
        $('#ycoord').trigger('change');
    });

    $('#xcoord').on('change',function(ev){
        showOpt.mapmode_x = $(this).val();
        var imgs = selectImages(images);
        updateImages(imgs, showOpt);
        $('#selectinfo').html(getSelectInfo(imgs));
    });
    $('#ycoord').on('change',function(ev){
        showOpt.mapmode_y = $(this).val();
        var imgs = selectImages(images);
        updateImages(imgs, showOpt);
        $('#selectinfo').html(getSelectInfo(imgs));
    });
// With JQuery
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
        console.log(s, d);
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
            r = t.append('tr');
            r.append('td').html(im.uuid);
            r.append('td').html(path(currentDataset, im));
            r.append('td').html(im.pos);
            r.append('td').html(im.frame);
            r.append('td').html(im.ch);
            r.append('td').html(im.slice);
        });
    }

    function imgcsv_read(d) {
        d.x = +d.x;
        d.y = +d.y;
        d.pos = +d.pos;
        d.frame = +d.frame;
        d.ch = +d.ch;
        d.slice = +d.slice;
        d.meta_pos = +d.meta_pos;
        d.meta_frame = +d.meta_frame;
        d.meta_ch = +d.meta_ch;
        d.meta_slice = +d.meta_slice;
        d.time = new Date(d.stime).valueOf() + parseInt(d.time);
        if(isNaN(d.time)){
            console.error('d.time is NaN!');
            console.log(d);
        }
        return d;
    }


});


