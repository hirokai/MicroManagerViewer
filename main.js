var container;
var size = 12;
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
//        console.log(d3.event.translate,d3.event.scale);
        container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        currentScale = d3.event.scale;
        updateImageResolution(d3.event.scale);
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
        if(count > 0)
            console.log(''+count+' images set to high res.');
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
        return d;
    }, function (err, dat) {
        dataset = {};
        _.map(dat, function (d) {
            dataset[d.uuid] = d;
            var m = $('#data-menu');
            var str = d.name + '(' + d.images + ' images)';
            m.append('<li role="presentation" data-uuid="' + d.uuid + '" class="dmenu"><a href="#">' + str + '</a></li>');
            //
            //sel.append('option')
            //    .attr('value', d.uuid)
            //    .text(d.name);
        });
        $('.dmenu').click(function (ev) {
            console.log(ev.target);
            $(ev.target).parents('ul').children('li').removeClass('active');
            var li = $(ev.target).parent('li');
            li.addClass('active');
            datasetChanged(li.attr('data-uuid'));
        });
    });


    function selectImages(images) {
        console.log('selectImages()',currentFilter,currentDim);
        return _.filter(images, function (img) {
            return (currentFilter.frame == null || img.frame == currentFilter.frame)
                && (currentFilter.ch == null || img.chidx == currentFilter.ch)
                && (currentFilter.pos == null || (img.meta_posidx || img.posidx) == currentFilter.pos);
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
        var s = imgs.length > 1 ? (imgs.length+' images (multiple '+ds.join(', ')+')') : (imgs.length == 0 ? 'No image' : '1 image')
        var s2 = _.compact(_.map(currentFilter,function(v,k){
            console.log(k,v)
            return v != null ? (m2[k] +'=' + v): null
        })).join(', ');
        return 'Showing '+s+' of ' + s2;
    }

    function channelSliderChanged() {
        currentFilter.ch = channelSlider.getValue();
        var imgs = selectImages(images);
        selected = {};
        updateImages(imgs, showOpt, true);
        updateInfo();
        $('#selectinfo').html(getSelectInfo(imgs));
    }

    var showOpt = {ignorePos: true, preloadCache: true};

    var currentDim = {pos: null, frame: null, ch: null, slice: null};
    var currentFilter = {pos: null, frame: null, ch: null, slice: null};

    var primaryDim;
    var filteringDim;
    var existingDim;
    var remainingDim;

    function selectDim(sel) {
        if (!(sel instanceof Array)) {
            sel = [sel];
        }
        console.log(currentDim);
        filteringDim = sel;

        remainingDim = _.difference(existingDim,filteringDim);

        if(_.contains(remainingDim,'pos')){
            $('#pos-actual').attr('checked',!showOpt.ignorePos);
            $('#pos-actual-div').show();
        }else{
            $('#pos-actual-div').hide();
        }

        if (_.contains(sel, 'pos')) {
            primaryDim = 'pos';
            // https://github.com/seiyria/bootstrap-slider
            positionSlider.destroy();
            positionSlider = $('#position').slider({min: 0, max: currentDim.pos - 1, value: 0})
                .on('change', positionSliderChanged)
                .data('slider');
            currentFilter.pos = 0;
            showOpt.ignorePos = true;
        }

        if (_.contains(sel, 'ch')) {
            primaryDim = 'ch';
            // https://github.com/seiyria/bootstrap-slider
            channelSlider.destroy();
            channelSlider = $('#channel').slider({min: 0, max: currentDim.ch - 1, value: 0})
                .on('change', channelSliderChanged)
                .data('slider');
            currentFilter.ch = 0;
        }

        if (_.contains(sel, 'frame')) {
            primaryDim = 'frame';
            // https://github.com/seiyria/bootstrap-slider
            frameSlider.destroy();
            frameSlider = $('#frame').slider({min: 0, max: currentDim.frame - 1, value: 0})
                .on('change', frameSliderChanged)
                .data('slider');
            currentFilter.frame = 0;
        }

        _.map(['frame', 'pos', 'ch'], function (n) {
            var m = {frame: 'frame', pos: 'position', ch: 'channel'};
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
        updateImages(imgs,showOpt);
    }

    $('.dim-select').click(function (ev) {
        $('.dim-select').removeClass('active');
        var el = $(ev.target);
        el.addClass('active');
        selectDim(el.attr('data-value').split(','));
    });


    var maxImages = 200;

    function updateImages(imgs, opt, keepZoom) {
        //if (imgs.length > maxImages) {
        //    window.alert('Too many images. Filter by conditions.')
        //    return;
        //}

        //      console.log(imgs,opt);
        var opt = opt || {};
        dot = d3.select('g.dot');
        dot = dot.selectAll('g').data(imgs, function (d) {
            return d.uuid;
        });
        dot.exit().remove();
        var appended = dot.enter().append("g");
        var col = Math.round(Math.sqrt(imgs.length)*1.25);
        var x = function (d, i) {
            var xi = i % col;
            var r = opt.ignorePos ? (size * 1.1 * xi) : (-d.x / 10);
            return r;
        };
        var y = function (d, i) {
            var yi = Math.floor(i / col);
            var r = opt.ignorePos ? (size * 1.1 * yi) : (-d.y / 10);
            return r;
        };

        appended.append('image')
//            .attr('filter', 'url(#autocontrast)')
            .attr("x", x)
            .attr("y", y)
            .attr('xlink:href', function (d) {
                return imghref(imgbasename(currentDataset, d), 's1');
            })
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
        $('#dim-pos').attr('disabled', currentDim.pos <= 1);
        $('#dim-frame').attr('disabled', currentDim.frame <= 1);
        $('#dim-ch').attr('disabled', currentDim.ch <= 1);

        $('#dim-posframe').attr('disabled', !(currentDim.pos > 1 && currentDim.frame > 1));
        $('#dim-posch').attr('disabled', !(currentDim.pos > 1 && currentDim.ch > 1));
        $('#dim-framech').attr('disabled', !(currentDim.ch > 1 && currentDim.frame > 1));

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
            $('#tags').append('<span class="label label-success">Channels</span>');
        } else {
            $('#channelslider-wrap').hide();
        }
    }

    function datasetChanged(uuid) {

        d3.csv("metadata/" + uuid + ".csv", imgcsv_read, function (error, imgs) {
            currentDataset = uuid;
            selected = {};
            images = imgs;
            $('#tags').html('');

            currentFilter = {pos: null, frame: null, ch: null, slice: null};

            existingDim = [];

            currentDim.pos = 1 + _.max(_.map(imgs, function (im) {
                return im.meta_posidx || im.posidx;
            }));
            currentDim.frame = 1 + _.max(_.map(imgs, function (im) {
                return im.frame;
            }));
            currentDim.ch = 1 + _.max(_.map(imgs, function (im) {
                return im.chidx;
            }));
            currentDim.slice = 1;//stub

            if(currentDim.pos > 1)
                existingDim.push('pos');
            if(currentDim.frame > 1)
                existingDim.push('frame');
            if(currentDim.ch > 1)
                existingDim.push('ch');

            var biggestDim = _.sortBy(Object.keys(currentDim),function(k){return 0-currentDim[k]})[0];
            currentFilter[biggestDim] = 0;

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

    $('#pos-actual').on('change', function (ev) {
        showOpt.ignorePos = !ev.target.checked;
        var imgs = selectImages(images);
        updateImages(imgs, showOpt);
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

    function pad(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length - size);
    }


    function path(dn, d) {
        var s = dataset[dn];
        console.log(s, d);
        if (s.metaset) {
            return d.folder + '/' + 'Pos0' + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_000' + '.tif';
        } else {
            return s.folder + '/' + d.posname + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_000' + '.tif';
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
        });
    }

    function imgcsv_read(d) {
        d.x = +d.x;
        d.y = +d.y;
        d.frame = +d.frame;
        d.posidx = +d.posidx;
        d.chidx = +d.chidx;
        d.meta_posidx = +d.meta_posidx;
        return d;
    }


});


