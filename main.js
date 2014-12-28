$(function () {

    // image size
    var size = 12;

    var mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    var w = screen.width;
    var h = screen.height;

    var margin = {top: -5, right: -5, bottom: -5, left: -5},
        width = (mobile ? w * 0.9 : 800) - margin.left - margin.right,
        height = (mobile ? h * 0.5 : 600) - margin.top - margin.bottom;

    var zoom = d3.behavior.zoom()
        .scaleExtent([0.2, 40])
        .on("zoom", zoomed);


    var svg = d3.select("#map")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
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
    feFuncR.attr('type','linear').attr('slope',slope).attr('intercept',intercept);
    var feFuncG = tr.append('feFuncG');
    feFuncG.attr('type','linear').attr('slope',slope).attr('intercept',intercept);
    var feFuncB = tr.append('feFuncB');
    feFuncB.attr('type','linear').attr('slope',slope).attr('intercept',intercept);

    function changeFilter(slope,intercept){
        feFuncR.transition().duration(100).ease('linear').attr('slope',slope).attr('intercept',intercept);
        feFuncG.transition().duration(100).ease('linear').attr('slope',slope).attr('intercept',intercept);
        feFuncB.transition().duration(100).ease('linear').attr('slope',slope).attr('intercept',intercept);
    }


    var rect = svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all");

    var scale = 1;

    var container = svg.append("g");
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

    var sel = d3.select('#data-select');

    var dataset = {};
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
            m.append('<li role="presentation" data-uuid="'+ d.uuid+'" class="dmenu"><a href="#">'+ d.name+'</a></li>');
            //
            //sel.append('option')
            //    .attr('value', d.uuid)
            //    .text(d.name);
        });
        $('.dmenu').click(function(ev){
            console.log(ev.target);
            $(ev.target).parents('ul').children('li').removeClass('active');
            var li = $(ev.target).parent('li');
            li.addClass('active');
            datasetChanged(li.attr('data-uuid'));
        });
    });


    function selectImages(images,state){
//        console.log(state);
        return _.filter(images, function (img) {
            return (state.frame == null || img.frame == state.frame) && (state.channel == null || img.chidx == state.channel);
        });
    }

    function frameSliderChanged() {
        var state = getIndices();
        var imgs = selectImages(images,state);
        selected = {};
        updateImages(imgs, showOpt,true);
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
    }

    function getIndices(){
        return {
            frame: frameSlider ? frameSlider.getValue() : null
            , channel: channelSlider ? channelSlider.getValue() : null
        };
    }

    function channelSliderChanged() {
        var state = getIndices();
        var imgs = selectImages(images,state);
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
    }

    var showOpt = {ignorePos: true, preloadCache: true};


    function updateImages(imgs, opt, keepZoom) {

  //      console.log(imgs,opt);
        var opt = opt || {};
        dot = d3.select('g.dot');
        dot = dot.selectAll('g').data(imgs, function (d) {
            return d.uuid;
        });
        dot.exit().remove();
        var appended = dot.enter().append("g");
        var x = function (d, i) {
            var xi = i % 5;
            var r = opt.ignorePos ? (size * 1.1 * xi) : (-d.x / 10);
            return r;
        };
        var y = function (d, i) {
            var yi = Math.floor(i / 5);
            var r = opt.ignorePos ? (size * 1.1 * yi) : (-d.y / 10);
            return r;
        };

        appended.append('image')
//            .attr('filter', 'url(#autocontrast)')
            .attr("x", x)
            .attr("y", y)
            .attr('xlink:href', function (d) {
                return imghref(currentDataset, d);
            })
            .attr({
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
        if(!keepZoom){
            t.each('end',function(){
                var els = $('image');
                if(els.length > 0){
                    var xs = [], ys = [];
                    els.each(function(){
                        xs.push(parseFloat($(this).attr('x')));
                        ys.push(parseFloat($(this).attr('y')));
                    });
                    var scale = Math.min(width / (_.max(xs) - _.min(xs) + size * 1.1), height / (_.max(ys) - _.min(ys) + size * 1.1)) * 0.9;
                    var tr_x = 20 - scale * _.min(xs);
                    var tr_y = 20 - scale * _.min(ys);
      //              console.log(tr_x, tr_y);

                    zoom.translate([tr_x, tr_y]);
                    zoom.scale(scale);
                    zoom.event(svg.transition().duration(500));
                }
            });
        }

        //$('image').on('load', function(){
        //    console.log($(this).parent('g').find('rect').css('fill','none'));
        //});
    }

    $('#play').click(function () {

    });

    var slopeSlider = $('#slope').slider()
        .on('change', filterSliderChanged)
        .data('slider');


    var interceptSlider = $('#intercept').slider()
        .on('change', filterSliderChanged)
        .data('slider');


    function filterSliderChanged(){
        var slope = slopeSlider.getValue();
        var intercept = interceptSlider.getValue();
        console.log(slope,intercept);
        changeFilter(slope,intercept);
    }

    function datasetChanged(uuid) {

        d3.csv("metadata/" + uuid + ".csv", dottype, function (error, imgs) {
            currentDataset = uuid;
            selected = {};
            images = imgs;

            var maxFrame = _.max(_.map(imgs, function (im) {
                return im.frame;
            }));
            frameSlider.setValue(0);
            if (maxFrame > 0) {
                // https://github.com/seiyria/bootstrap-slider
                frameSlider.destroy();
                frameSlider = $('#frame').slider({min: 0, max: maxFrame, value: 0})
                    .on('change', frameSliderChanged)
                    .data('slider');
                $('#frameslider-wrap').show();
                $('#time').show();
            } else {
                $('#frameslider-wrap').hide();
                $('#time').hide();
            }
            var maxChannel = _.max(_.map(imgs, function (im) {
                return im.chidx;
            }));
            channelSlider.setValue(0);
            if(maxChannel > 0){
                channelSlider.destroy();
                channelSlider = $('#channel').slider({min: 0, max: maxChannel, value: 0})
                    .on('change', channelSliderChanged)
                    .data('slider');
                $('#channelslider-wrap').show();
            }else{
                $('#channelslider-wrap').hide();
            }
            console.log('Frames','Channels',maxFrame,maxChannel);
            imgs = _.filter(imgs, function (img) {
                return img.frame == 0 && img.chidx == 0;
            });

            updateImages(imgs, showOpt);
            updateInfo();
            if(showOpt.preloadCache){
                $('#imgcache').remove();
                var el = $('<div id="imgcache"></div>');
                $(document.body).append(el);
                el.hide();
                _.map(images,function(im){
                    var imel = $('<img/>');
                    imel.attr('src',imghref(currentDataset,im));
                    el.append(imel);
                });
            }
        });
    }

    $('#pos-actual').on('change', function(ev){
        showOpt.ignorePos = !ev.target.checked;
        var state = getIndices();
        var imgs = selectImages(images,state);
        updateImages(imgs,showOpt);
    });

// With JQuery
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

    function imghref(dn, d) {
        var s = dataset[dn];
        return 'images/' + (s.metaset ? d.set_uuid : s.uuid) + '/' + d.uuid + '.jpg';
    }

    function path(dn, d) {
        var s = dataset[dn];
        console.log(s,d);
        if(s.metaset){
            return d.folder + '/' + 'Pos0' + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_000' + '.tif';
        }else{
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
            .style({'stroke': function (d) {
                return selected[d.uuid] ? 'pink' : '#333';
            },'stroke-width': function (d) {
            return selected[d.uuid] ? 2 : 1;
            }});

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

    function dottype(d) {
        d.x = +d.x;
        d.y = +d.y;
        d.frame = +d.frame;
        d.posidx = +d.posidx;
        return d;
    }

    function zoomed() {
//        console.log(d3.event.translate,d3.event.scale);
        container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

});

