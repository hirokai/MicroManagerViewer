/** @jsx React.DOM */


function addKey() {
    var isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return (isMac && d3.event.metaKey) || (!isMac && d3.event.shiftKey);
}

function path(dn, d) {
    var s = dataset[dn];
    if (s.metaset) {
        return d.folder + '/' + 'Pos0' + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_'+ pad(d.slice,3) + '.tif';
    } else {
        return s.folder + '/' + d.posname + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_' +pad(d.slice,3)  + '.tif';
    }

}

function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}

function getSelectInfo(imgs){
    var m = {pos: 'positions', frame: 'frames', ch: 'channels', slice: 'slices'};
    var m2 = {pos: 'position', frame: 'frame', ch: 'channel', slice: 'slice'}

    var ds = _.map(state.remainingDim,function(d){
        return m[d];
    });
    var s = imgs.length > 1 ? (imgs.length+' images (multiple '+ds.join(', ')+')') : (imgs.length == 0 ? 'No image' : '1 image');
    var s2 = _.compact(_.map(state.coord,function(v,k){
        return v != null ? (m2[k] +'=' + v): null
    })).join(', ');
    var s3 = state.show.tile ? ('Tile, sorted by ' + state.show.sortKey) :
        ('Mapping: x=' + state.show.mapmode_x +', y='+state.show.mapmode_y);
    return 'Showing '+(s2 ? '' : 'all ')+s+(s2 ? (' of ' + s2) : '') + '. ' + s3;
}

var InfoTable = React.createClass({
    render: function(){
        var rows = _.map(state.selected,function(im){
            var sec = (im.time-startTime)/1000;
            return <tr key={im.uuid}>
                <td>{im.uuid}</td>
                <td>{path(currentDataset, im)}</td>
                <td>{''+Math.floor(sec)+'.'+(Math.floor(sec*10)%10)}</td>
                <td>{im.pos}</td>
                <td>{im.frame}</td>
                <td>{im.ch}</td>
                <td>{im.slice}</td>
            </tr>;
        });
        return <table id="info" className="table">
            <thead>
                <tr>
                    <th>UUID</th>
                    <th>Path</th>
                    <th>Time [sec]</th>
                    <th>Pos</th>
                    <th>Frame</th>
                    <th>Channel</th>
                    <th>Slice</th>
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>;
    }
});

var Pickers = React.createClass({
    render: function(){
        return <div><label htmlFor="colorpicker-bg">Background</label>
            <input id='colorpicker-bg' className="color" value="#000"/>
            <label htmlFor="colorpicker-fg">Foreground</label>
            <input id='colorpicker-fg' className="color" value="#fff"/>
            <label htmlFor="colorpicker-grid">Grid</label>
            <input id='colorpicker-grid' className="color" value="#333"/>
            <span style={{marginLeft: '30px'}}>Preset</span>

            <div className="btn-group" role="group" aria-label="...">
                <button type="button" className="btn btn-xs btn-default color-preset" onClick={this.presetDark} data-value="000,fff,333">Dark
                </button>
                <button type="button" className="btn btn-xs btn-default color-preset" onClick={this.presetDark} data-value="fff,000,ccc">Bright
                </button>
            </div>
        </div>
    },
    presetDark: function(ev){
        var el = $(ev.nativeEvent.target);
        var cs = el.attr('data-value').split(',');
        $('#colorpicker-bg').val(cs[0]).trigger('change');
        $('#colorpicker-fg').val(cs[1]).trigger('change');
        $('#colorpicker-grid').val(cs[2]).trigger('change');
    },
    componentDidMount: function(){
        this.startColor('colorpicker-bg','000');
        this.startColor('colorpicker-fg','fff');
        this.startColor('colorpicker-grid','333');
        $('#colorpicker-bg').on('change',function(){
            $('svg').css('background','#'+$(this).val());
        });

        $('#colorpicker-fg').on('change',function(){
            $('svg text,.axis.primary').css('fill','#'+$(this).val());
        });

        $('#colorpicker-grid').on('change',function(){
            $('svg line').css('stroke','#'+$(this).val());
        });
    },
    startColor: function(id,color){
        var myPicker = new jscolor.color(document.getElementById(id), {});
        myPicker.fromString(color); // now you can access API via 'myPicker' variable
    }

});

var state = {
    dims: {pos: 3, frame: 10, ch: 1, slice: 1}
    , filterDims: {pos: false, frame: true, ch: false, slice: false}
    , remainingDim: []
    , coord: {pos: 1, frame: 2, ch: 0, slice: 0}
    , selected: {}
    , selectedImages: []
    , show: {tile: true, sortKey: 'time', sortReverse: false, preloadCache: true, mapmode_x: 'x', mapmode_y: 'y', marginRatio: 1.1, timeScale: 10}
};

var fullname = {pos: 'Position', frame: 'Frame', ch: 'Channel', slice: 'Slice'};

var Slider = React.createClass({
    propTypes: {
        dim: React.PropTypes.string.isRequired
    },
    getInitialState: function(){
        return {slider: null};
    },
    render: function(){
        var dim = this.props.dim;
        return <div id={dim + '-slider-wrap'}>
            <span style={{'marginRight': '30px'}}>{fullname[dim]}</span>
            <input id={dim +'-slider-input'} data-slider-id={dim + '-slider'}
                type="text" data-slider-min="0"
                data-slider-max={state.dims[dim]} data-slider-step="1"
                data-slider-value={state.coord[dim]}/>
        </div>;
    },
    componentDidMount: function(){
        this.state.slider = $('#'+this.props.dim+'-slider-input').slider()
            .on('change', this.changed)
            .data('slider');
        this.state.slider.setValue(state.coord[this.props.dim])
    },
    changed: function(){
        state.coord[this.props.dim] = this.state.slider.getValue();

        state.selectedImages = selectImages(images);

        state.selected = {};
        updateImages(state.selectedImages, state.show, true);

        if(this.props.dim == 'frame'){

            //var mintime = new Date('1970-01-01');
            //var maxtime = new Date('2100-01-01');
            var maxtime = 0;
            var mintime = 1000 * 60 * 60 * 24 * 365 * 20;  //  20 years
            _.map(state.selectedImages, function (im) {
                mintime = Math.min(im.time, mintime);
                maxtime = Math.max(im.time, maxtime);
            });
            $('#time').html('' + numeral(mintime / 1000).format('0.0') + ' - ' + numeral(maxtime / 1000).format('0.0') + ' msec.');
//        $('#selectinfo').html(getSelectInfo(imgs));

        }
        this.setState({state: state});
    },
    componentWillUnmount: function(){
        if(this.state.slider) this.state.slider.destroy();
    }
});

var Div = React.createClass({
    getInitialState: function() {
        return state;
    },
    toggleDim: function (ev) {
        var el = $(ev.nativeEvent.target);
        var dim = el.attr('data-value');
        console.log('clicked!',dim, this.state.filterDims);
        this.state.filterDims[dim] = !this.state.filterDims[dim];
        console.log(this.state.filterDims);
//        selectDim(this.state.filterDims);
        this.setState({state: state});
    },
    dimPreset: function (dim) {
        //      renderReact();
    },
    btn: function (title, val, clicked, enabled, active) {
        var cx = React.addons.classSet;
        var classes = cx({'btn': true, 'btn-sm': true, 'btn-default': true, 'active': active});
        return <button id={'dim-'+val} onClick={clicked} className={classes} key={title} data-value={val} disabled={!enabled ? 'disabled' : ''}>{title}</button>
    },
    btnp: function (title, val, clicked, enabled) {
        var cx = React.addons.classSet;
        var classes = cx({'btn': true, 'btn-sm': true, 'btn-default': true});
        return <button onClick={clicked} className={classes} key={title} data-value={val} disabled={!enabled ? 'disabled' : ''}>{title}</button>
    },
    componentDidMount: function(){
    },
    render: function () {
        return <div>
            <div id='tags'>
                {this.state.dims.pos > 1 ? <span className="label label-default">Positions</span> : ''}
                {this.state.dims.frame > 1 ? <span className="label label-primary">Frames</span> : ''}
                {this.state.dims.ch > 1 ? <span className="label label-warning">Channels</span> : ''}
                {this.state.dims.slice > 1 ? <span className="label label-success">Slices</span> : ''}
            </div>

            <div>
                <div className="btn-group" role="group" aria-label="...">
                {this.btn('Position', 'pos', this.toggleDim, this.state.dims.pos > 1, this.state.filterDims.pos)}
                {this.btn('Frame', 'frame', this.toggleDim, this.state.dims.frame > 1, this.state.filterDims.frame)}
                {this.btn('Channel', 'ch', this.toggleDim, this.state.dims.ch > 1, this.state.filterDims.ch)}
                {this.btn('Slice', 'slice', this.toggleDim, this.state.dims.slice > 1, this.state.filterDims.slice)}
                </div>
                <span style={{'marginLeft': '30px'}}>Preset</span>
                <div className="btn-group" role="group" aria-label="...">
                {this.btnp('Pos x Frame', 'pos,frame', this.dimPreset, this.state.dims.pos > 1 && this.state.dims.frame > 1)}
                {this.btnp('Frame x Ch', 'frame,ch', this.dimPreset, this.state.dims.frame > 1 && this.state.dims.ch > 1)}
                {this.btnp('Pos x Ch', 'pos,ch', this.dimPreset, this.state.dims.pos > 1 && this.state.dims.ch > 1)}
                {this.btnp('Pos x Slice', 'pos,slice', this.dimPreset, this.state.dims.pos > 1 && this.state.dims.slice > 1)}
                </div>
            </div>

            {this.state.filterDims.pos ? <Slider dim='pos'/> : ''}
            {this.state.filterDims.frame ? <Slider dim='frame'/> : ''}
            {this.state.filterDims.ch ? <Slider dim='ch'/> : ''}
            {this.state.filterDims.slice ? <Slider dim='slice'/> : ''}

            <div>
                <pre id="selectinfo">{getSelectInfo(state.selectedImages)}</pre>
            </div>
        </div>;
    }
});

var MapTools = React.createClass({
    getInitialState: function(){
        return {state: state};
    },
    render: function(){

        var tile_sort = [];
        if(_.contains(this.state.remainingDim, 'pos') && this.state.dims.pos > 1)
            sortsel.push(<option value="pos" key='0'>Position index</option>);
        if(_.contains(this.state.remainingDim, 'frame') && this.state.dims.frame > 1)
            sortsel.push(<option value="frame" key='1'>Frame index</option>);
        if(_.contains(this.state.remainingDim, 'ch') && this.state.dims.ch > 1)
            sortsel.push(<option value="ch" key='2'>Channel index</option>);
        if(_.contains(this.state.remainingDim, 'slice') && this.state.dims.slice > 1)
            sortsel.push(<option value="slice" key='3'>Slice index</option>);
        tile_sort.push(<option value="time" key='4'>Time</option>);

        return <div><span>Mapping</span>
            <div className="btn-group" role="group" aria-label="...">
        <button type="button" className="btn btn-default btn-sm map-select active" data-value="pos"
            id="map-tile">Tile
        </button>
        <button type="button" className="btn btn-default btn-sm map-select" data-value="frame" id="map-2d">
        X/Y
        </button>
        </div>
            <div id="sort-tool" style={{marginLeft: '10px'}}>
                <label htmlFor="tile-sort">Sort by</label>
                <select name="" id="tile-sort">
                {tile_sort}
                </select>
                <input type="checkbox" id="sort-reverse"/>
                <label htmlFor="sort-reverse">Reverse</label>
            </div>
            <div id="xy-tool" style={{display: 'none'}}>
                <label htmlFor="xcoord">X</label>
                <select name="" id="xcoord">
                    <option value="const">Constant</option>
                    <option value="x" selected>Stage X</option>
                    <option value="y">Stage Y</option>
                    <option value="z">Stage Z</option>
                    <option value="pos">Position index</option>
                    <option value="frame">Frame index</option>
                    <option value="ch">Channel index</option>
                    <option value="slice">Slice index</option>
                    <option value="time">Time</option>
                </select>
                <span id="switch-xy" style={{cursor: 'pointer'}}>&nbsp;&#8596;&nbsp;</span>
                <label htmlFor="ycoord">Y</label>
                <select name="" id="ycoord">
                    <option value="const">Constant</option>
                    <option value="x">Stage X</option>
                    <option value="y" selected>Stage Y</option>
                    <option value="z">Stage Z</option>
                    <option value="pos">Position index</option>
                    <option value="frame">Frame index</option>
                    <option value="ch">Channel index</option>
                    <option value="slice">Slice index</option>
                    <option value="time">Time</option>
                </select>
                <span style={{marginLeft: '30px'}}>Preset</span>

                <div className="btn-group" role="group" aria-label="...">
                    <button type="button" className="btn btn-xs btn-default map-preset" data-value="x,y"
                        id="map-xy">Stage X/Y
                    </button>
                    <button type="button" className="btn btn-xs btn-default map-preset" data-value="frame,slice"
                        id="map-framech">Frame/Slice
                    </button>
                    <button type="button" className="btn btn-xs btn-default map-preset" data-value="time,pos"
                        id="map-timepos">Time/Pos
                    </button>
                    <button type="button" className="btn btn-xs btn-default map-preset" data-value="ch,pos"
                        id="map-chpos">Ch/Pos
                    </button>
                </div>
            </div></div>
    }
});

function updateMappingTool(){

}

var dataset = {};


function updateToolbar() {
    div.setState({state: state});
    updateMappingTool();
}

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
        //if(count > 0){
        //    console.log(''+count+' images set to high res.');
        //}
    }
}

var images = [];
var currentDataset = null;

var startTime = null;


function selectImages(images) {
    var res = _.filter(images, function (img) {
        return (state.coord.pos == null || (img.meta_pos || img.pos) == state.coord.pos)
            && (state.coord.ch == null || (img.meta_ch || img.ch) == state.coord.ch)
            && (state.coord.frame == null || (img.meta_frame || img.frame) == state.coord.frame)
            && (state.coord.slice == null || (img.meta_slice || img.slice) == state.coord.slice);
    });
    state.remainingDim = [];
    _.map(['pos','frame','ch','slice'],function(k){
        if(state.dims[k] > 1 && !state.filterDims[k]) state.remainingDim.push(k);
    });
    div.setState({state: state});
    return res;
}

var div, info, pickers;

$(function () {
    setupD3();

    div = React.render(<Div/>, document.getElementById("dim-select-btns"));
    info = React.render(<InfoTable/>, document.getElementById("info"));
    pickers = React.render(<Pickers/>, document.getElementById("colorpickers"));
    maptools = React.render(<MapTools/>, document.getElementById("map-tools"));

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

    $('#zoomAll').click(function () {
        var xs = [], ys = [];
        $('image').each(function () {
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
    });


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
            state.show.tile = true;
        }else{
            $('#sort-tool').hide();
            $('#xy-tool').show();
            state.show.tile = false;
        }
        //    console.log('map-select clicked.');
        var imgs = selectImages(images);
        updateImages(imgs,state.show);
        $('#selectinfo').html(getSelectInfo(imgs));
    });

    $('#tile-sort').on('change',function(){
        state.show.sortKey = $(this).val();
        var imgs = selectImages(images);
        updateImages(imgs,state.show);
        $('#selectinfo').html(getSelectInfo(imgs));
    });

    $('#sort-reverse').on('change',function(){
        state.show.sortReverse = this.checked;
        var imgs = selectImages(images);
        updateImages(imgs,state.show);
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
        state.show.mapmode_x = $(this).val();
        var imgs = selectImages(images);
        updateImages(imgs, state.show);
        $('#selectinfo').html(getSelectInfo(imgs));
        updateAxisLabels();
    });
    $('#ycoord').on('change',function(ev){
        state.show.mapmode_y = $(this).val();
        var imgs = selectImages(images);
        updateImages(imgs, state.show);
        $('#selectinfo').html(getSelectInfo(imgs));
        updateAxisLabels();
    });

    $('#switch-xy').click(function(){
        var x = $('#xcoord').val();
        var y = $('#ycoord').val();
        $('#xcoord').val(y);
        $('#ycoord').val(x);
        //$('#xcoord > option[value="'+y+'"]').attr('state.selected', 'state.selected');
        //$('#ycoord > option[value="'+x+'"]').attr('state.selected', 'state.selected');
        $('#xcoord').trigger('change');
        $('#ycoord').trigger('change');
    });
});


function datasetChanged(s) {

    d3.csv("metadata/" + s.uuid + ".csv", imgcsv_read, function (error, imgs) {
        currentDataset = s.uuid;
        state.selected = {};
        images = imgs;
        $('#tags').html('');
        $('.dim-select').removeClass('active');

        state.coord = {pos: null, frame: null, ch: null, slice: null};

        var ts = _.map(images,function(im){return im.time;});
        startTime = _.min(ts);

        state.dims.pos = s.meta_pos || s.positions;
        state.dims.frame = s.meta_frame || s.frames;
        state.dims.ch = s.meta_ch || s.channels;
        state.dims.slice = s.meta_slice || s.slices;

        var biggestDim = _.sortBy(Object.keys(state.dims),function(k){return 0-state.dims[k]})[0];
        state.coord[biggestDim] = 0;
        state.filterDims.pos = false;
        state.filterDims.frame = false;
        state.filterDims.ch = false;
        state.filterDims.slice = false;
        state.filterDims[biggestDim] = true;

        updateToolbar();
        imgs = selectImages(images);
        updateImages(imgs, state.show);

        if (state.show.preloadCache) {
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