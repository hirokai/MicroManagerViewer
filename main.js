/** @jsx React.DOM */

var App = React.createClass({
    getInitialState: function(){
        return {datasets: {}, currentDataset: null, dims: {}};
    },
    render: function(){
        return <div>
            <div className="col-md-3">
                <p>Choose dataset</p>
                <ul id='data-menu' className="nav nav-pills nav-stacked">
                    {_.map(this.state.datasets,function(d,k){
                        return <DataSetEntry data={d} data-uuid={k}/>;
                    })}
                </ul>
            </div>
            <RightPane dataset={this.state.currentDataset}/>
        </div>;
    },
    filterDimChanged: function(d){
        console.log(d);
    },
    componentDidMount: function(){
        var self = this;
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
            d.dims = {};
            d.dims.pos = d.meta_pos || d.positions;
            d.dims.frame = d.meta_frame || d.frames;
            d.dims.ch = d.meta_ch || d.channels;
            d.dims.slice = d.meta_slice || d.slices;
            return d;
        }, function (err, dat) {
            ds = {};
            _.map(dat, function (d) {
                ds[d.uuid] = d;
            });
            self.setState({datasets: ds});
            console.log(ds);
            $('.dmenu').click(function (ev) {
                var target = $(ev.target);
                var el = target.tagName == 'li' ? target : target.parents('li');
                el.parents('ul').children('li').removeClass('active');
                el.addClass('active');
                self.setState({currentDataset: self.state.datasets[el.attr('data-uuid')]});
            });
            $($('.dmenu > a')[0]).click();
        });
    }

});

var DataSetEntry = React.createClass({
    render: function(){
        var d = this.props.data;
        var dims = ['positions','frames','channels','slices'];
        var m2 = {positions: 'P', frames: 'T', channels: 'C', slices: 'Z'};
        var s2 = _.compact(_.map(dims,function(a){return d[a] > 1 ? (m2[a] + d[a]) : null;})).join(' x ');
        return <li role="presentation" data-uuid={d.uuid} className="dmenu">
            <a href="#">{d.name} <p>({d.images} images: {s2})</p></a></li>;
    }
});

var RightPane = React.createClass({
    getInitialState(){
        return {images: [],
            coord: {pos: null, frame: null, ch: null, slice: null}, selectedImages: []
            , filterDims: {pos: false, frame: false, ch: false, slice: false}
            , remainingDim: []
            , show: {tile: true, mapX: 'x', mapY: 'y',sortKey: 'time'}
            , startTime: null
        };
    },
    render() {
        if(!this.props.dataset)
            return <div className="col-md-9">Select dataset</div>;
        else
            return <div className="col-md-9">
                <div id="tools">
                    <Tags dims={this.props.dataset.dims}/>
                    <div style={{clear: 'both'}}></div>
                    <DimFilters dims={this.props.dataset.dims} onChangeFilterDims={this.filterDimChanged}
                        onChangeCoord={this.coordChanged}
                        frameChanged={this.frameChanged}
                        chChanged={this.chChanged}
                        sliceChanged={this.sliceChanged}
                    />
                    <FilterInfo selectedImages={this.state.selectedImages} coord={this.state.coord} show={this.state.show} remainingDim={this.state.remainingDim}/>
                    <div>
                        <MapTools remainingDim={this.state.remainingDim} dims={this.state.dims}
                            onClickTile={this.onClickTile} onClickXY={this.onClickXY}
                            show={this.state.show}
                            remainingDim={this.state.remainingDim}
                            onMapXYChange={this.onMapXYChange}
                            onChangeSortReverse={this.onChangeSortReverse}
                            />
                        <div style={{clear: 'both'}}></div>
                        <ColorPickers/>
                        <button id="zoomAll" className="btn btn-default btn-sm" onClick={this.zoomAllClicked}>Zoom to show all</button>
                    </div>
                </div>
                <div style={{clear: 'both'}}></div>
                <ImgPanel images={this.state.selectedImages} showOpt={this.state.show}/>
                <ImgInfo/>
            </div>;
    },
    onMapXYChange(c){
        var v = _.extend({},this.state.show);
        v.mapX = c[0];
        v.mapY = c[1];
        this.setState({show: v});
    },
    onChangeSortReverse(c){
        var v = _.extend({},this.state.show);
        v.sortReverse = c;
        this.setState({show: v});
    },
    onClickTile() {
        var v = _.extend({},this.state.show);
        v.tile = true;
        this.setState({show: v});
        console.log('onClickTile()',v,this.state.show);
    },
    onClickXY() {
        var v = _.extend({},this.state.show);
        v.tile = false;
        this.setState({show: v});
        console.log('onClickXY()',v,this.state.show);
    },
    coordChanged(v) {
        console.log('coord changed',v);
        var o = {pos: this.state.coord.pos, frame: this.state.coord.frame, ch: this.state.coord.ch, slice: this.state.coord.slice};
        o[v.key] = v.value;
        console.log(o);
        this.setState({coord: o});
    },
    frameChanged(v) {
        this.state.coord[this.props.dim] = v;

        this.state.selectedImages = selectImages(images);
        updateImages(this.state.selectedImages, this.state.showOpt, true);


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

        this.setState({state: state});
    },
    chChanged() {
        console.log('ch changed');
    },
    sliceChanged() {
        console.log('slice changed');
    },
    filterDimChanged(dims){
        this.setState({filterDims: dims});
    },
    zoomAllClicked(){
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
    },
    selectImages(images) {
        var res = _.filter(images, function (img) {
            return (this.state.coord.pos == null || (img.meta_pos || img.pos) == this.state.coord.pos)
                && (this.state.coord.ch == null || (img.meta_ch || img.ch) == this.state.coord.ch)
                && (this.state.coord.frame == null || (img.meta_frame || img.frame) == this.state.coord.frame)
                && (this.state.coord.slice == null || (img.meta_slice || img.slice) == this.state.coord.slice);
        });
        var rem = [];
        _.map(['pos','frame','ch','slice'],function(k){
            if(this.props.dims[k] > 1 && !this.state.filterDims[k]) rem.push(k);
        });
        this.setState({remainingDim: rem, selectedImages: res});
    },
    componentDidMount() {
        var s = this.props.dataset;
        if(!s)return;
        d3.csv("metadata/" + s.uuid + ".csv", d => {
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
        }, (error, imgs) => {
            console.log(imgs);
            self.setState({images: imgs});

            var ts = _.map(imgs,function(im){return im.time;});
            this.state.startTime = _.min(ts);

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
            imgs = this.selectImages(imgs);
            updateImages(imgs, this.state.tile, this.state.mapX, this.state.mapY);

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
        });
    }
});

var Tags = React.createClass({
    render() {
        return <div id='tags'>
                {this.props.dims.pos > 1 ? <span className="label label-default">Positions</span> : ''}
                {this.props.dims.frame > 1 ? <span className="label label-primary">Frames</span> : ''}
                {this.props.dims.ch > 1 ? <span className="label label-warning">Channels</span> : ''}
                {this.props.dims.slice > 1 ? <span className="label label-success">Slices</span> : ''}
        </div>;
    }
});

var DimFilters = React.createClass({
    getInitialState: function() {
        return {filterDims: {pos: false, frame: false, ch: false, slice: false}};
    },
    toggleDim: function (ev) {
        var el = $(ev.nativeEvent.target);
        var dim = el.attr('data-value');
        console.log('clicked!',dim, this.state.filterDims);
        var ds = _.extend({},this.state.filterDims);
        ds[dim] = !ds[dim];
        this.setState({filterDims: ds});
        this.props.onChangeFilterDims(this.state.filterDims)
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
        return <div id='dim-select-btns'>
            <div>
                <div className="btn-group" role="group" aria-label="...">
                {this.btn('Position', 'pos', this.toggleDim, this.props.dims.pos > 1, this.state.filterDims.pos)}
                {this.btn('Frame', 'frame', this.toggleDim, this.props.dims.frame > 1, this.state.filterDims.frame)}
                {this.btn('Channel', 'ch', this.toggleDim, this.props.dims.ch > 1, this.state.filterDims.ch)}
                {this.btn('Slice', 'slice', this.toggleDim, this.props.dims.slice > 1, this.state.filterDims.slice)}
                </div>
                <span style={{'marginLeft': '30px'}}>Preset</span>
                <div className="btn-group" role="group" aria-label="...">
                {this.btnp('Pos x Frame', 'pos,frame', this.dimPreset, this.props.dims.pos > 1 && this.props.dims.frame > 1)}
                {this.btnp('Frame x Ch', 'frame,ch', this.dimPreset, this.props.dims.frame > 1 && this.props.dims.ch > 1)}
                {this.btnp('Pos x Ch', 'pos,ch', this.dimPreset, this.props.dims.pos > 1 && this.props.dims.ch > 1)}
                {this.btnp('Pos x Slice', 'pos,slice', this.dimPreset, this.props.dims.pos > 1 && this.props.dims.slice > 1)}
                </div>
            </div>

            {this.state.filterDims.pos ? <Slider dim='pos' max={this.props.dims.pos} onChange={this.onChangeCoord}/> : ''}
            {this.state.filterDims.frame ? <Slider dim='frame' max={this.props.dims.frame} onChange={this.props.onChangeCoord}/> : ''}
            {this.state.filterDims.ch ? <Slider dim='ch' max={this.props.dims.ch} onChange={this.props.onChangeCoord}/> : ''}
            {this.state.filterDims.slice ? <Slider dim='slice' max={this.props.dims.slice} onChange={this.props.onChangeCoord}/> : ''}
        </div>;
    },
    onChangeCoord(ev){
        this.props.onChangeCoord(ev);
    }
});

var ColorPickers = React.createClass({
    render: function(){
        return <div><label htmlFor="colorpicker-bg">Background</label>
            <input id='colorpicker-bg' className="color" defaultValue="#000"/>
            <label htmlFor="colorpicker-fg">Foreground</label>
            <input id='colorpicker-fg' className="color" defaultValue="#fff"/>
            <label htmlFor="colorpicker-grid">Grid</label>
            <input id='colorpicker-grid' className="color" defaultValue="#333"/>
            <span style={{marginLeft: '30px'}}>Preset</span>

            <div className="btn-group" role="group" aria-label="...">
                <button type="button" className="btn btn-xs btn-default color-preset" onClick={this.presetColor} data-value="000,fff,333">Dark
                </button>
                <button type="button" className="btn btn-xs btn-default color-preset" onClick={this.presetColor} data-value="fff,000,ccc">Bright
                </button>
            </div>
        </div>
    },
    presetColor: function(ev){
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

var Slider = React.createClass({
    propTypes: {
        dim: React.PropTypes.string.isRequired
    },
    getInitialState: function(){
        return {slider: null, value: 0};
    },
    render: function(){
        var dim = this.props.dim;
        return <div id={dim + '-slider-wrap'}>
            <span style={{'marginRight': '30px'}}>{this.fullname[dim]}</span>
            <input id={dim +'-slider-input'} data-slider-id={dim + '-slider'}
                type="text" data-slider-min="0"
                data-slider-max={this.props.max} data-slider-step="1"
                data-slider-value={this.state.value}/>
        </div>;
    },
    fullname: {pos: 'Position', frame: 'Frame', ch: 'Channel', slice: 'Slice'},
    componentDidMount: function(){
        var sl = $('#'+this.props.dim+'-slider-input').slider()
            .on('change', this.changed)
            .data('slider');
        this.setState({slider: sl});
        sl.setValue(0)
    },
    changed: function(){
        this.props.onChange({key: this.props.dim, value: this.state.slider.getValue()});
    },
    componentWillUnmount: function(){
        if(this.state.slider) this.state.slider.destroy();
    }
});

var FilterInfo = React.createClass({
    getSelectInfo(imgs){
        if(!imgs){
            return 'Not valid images.';
        }
        var m = {pos: 'positions', frame: 'frames', ch: 'channels', slice: 'slices'};
        var m2 = {pos: 'position', frame: 'frame', ch: 'channel', slice: 'slice'};

        var ds = _.map(this.props.remainingDim,function(d){
            return m[d];
        });
        var s = imgs.length > 1 ? (imgs.length+' images (multiple '+ds.join(', ')+')') : (imgs.length == 0 ? 'No image' : '1 image');
        var s2 = _.compact(_.map(this.props.coord,function(v,k){
            return v != null ? (m2[k] +'=' + v): null
        })).join(', ');
        var s3 = this.props.show.tile ?
            ('Tile, sorted by ' + this.props.show.sortKey + (this.props.show.sortReverse ? ' (reversed)' : '')) :
            ('Mapping: x=' + this.props.show.mapX +', y='+this.props.show.mapY);
        return 'Showing '+(s2 ? '' : 'all ')+s+(s2 ? (' of ' + s2) : '') + '. ' + s3;
    },
    render() {
        var s = this.getSelectInfo(this.props.selectedImages);
        return <div id='filterinfo'><pre>{s}</pre></div>;
    }
});


var MapTools = React.createClass({
    propTypes: {
        onClickTile: React.PropTypes.func,
        onClickXY: React.PropTypes.func,
        onMapXYChange: React.PropTypes.func,
        onChangeSortReverse: React.PropTypes.func,
        remainingDim: React.PropTypes.array.isRequired,
        show: React.PropTypes.object.isRequired
    },
    getInitialState: function(){
        return {};
    },
    sortTool: function(){
        return <div id="sort-tool" style={{marginLeft: '10px'}}>
            <label htmlFor="tile-sort">Sort by</label>
            <select name="" id="tile-sort">
                    {this.sortOptions()}
            </select>
            <input type="checkbox" id="sort-reverse" checked={this.props.show.sortReverse ? 'checked' : ''} onChange={this.onClickSortReverse}/>
            <label htmlFor="sort-reverse">Reverse</label>
        </div>;
    },
    onClickSortReverse(ev) {
        this.props.onChangeSortReverse($(ev.nativeEvent.target).prop('checked'));
    },
    xyTool: function(){
        return <div id="xy-tool">
            <label htmlFor="xcoord">X</label>
            <select name="" id="xcoord" value={this.props.show.mapX} onChange={this.onChangeXCoord}>
                    {this.coordOpts()}
            </select>
            <span id="switch-xy" style={{cursor: 'pointer'}} onClick={this.onClickSwitch}>&nbsp;&#8596;&nbsp;</span>
            <label htmlFor="ycoord">Y</label>
            <select name="" id="ycoord" value={this.props.show.mapY}>
                    {this.coordOpts()}
            </select>
            <span style={{marginLeft: '30px'}}>Preset</span>

            <div className="btn-group" role="group" aria-label="...">
                <button type="button" className="btn btn-xs btn-default map-preset" data-value="x,y"
                    id="map-xy" onClick={this.onClickXYPreset}>Stage X/Y
                </button>
                <button type="button" className="btn btn-xs btn-default map-preset" data-value="frame,slice"
                    id="map-framech" onClick={this.onClickXYPreset}>Frame/Slice
                </button>
                <button type="button" className="btn btn-xs btn-default map-preset" data-value="time,pos"
                    id="map-timepos" onClick={this.onClickXYPreset}>Time/Pos
                </button>
                <button type="button" className="btn btn-xs btn-default map-preset" data-value="ch,pos"
                    id="map-chpos" onClick={this.onClickXYPreset}>Ch/Pos
                </button>
            </div>
        </div>;
    },
    onClickSwitch() {
        this.props.onMapXYChange([this.props.show.mapY,this.props.show.mapX]);
    },
    onChangeXCoord(ev) {
        var x = $(ev.nativeEvent.target).val();
        this.props.onMapXYChange([x,this.props.show.mapY]);
    },
    onClickXYPreset(ev) {
        var xy = $(ev.nativeEvent.target).attr('data-value').split(',');
        this.props.onMapXYChange(xy);
    },
    render: function(){
        return <div id='map-tools'><span>Mapping</span>
            <div className="btn-group" role="group" aria-label="...">
                <button type="button" className={"btn btn-default btn-sm map-select" + (this.props.show.tile ? ' active': '')}
                    data-value="pos" id="map-tile" onClick={this.props.onClickTile}>
                    Tile
                </button>
                <button type="button" className={"btn btn-default btn-sm map-select" + (!this.props.show.tile ? ' active': '')}
                    data-value="frame" id="map-2d" onClick={this.props.onClickXY}>
                    X/Y
                </button>
            </div>
            {this.props.show.tile ? this.sortTool() : this.xyTool()}
            </div>
    },
    sortOptions() {
        var options = [];
        if(_.contains(this.props.remainingDim, 'pos') && this.props.dims.pos > 1)
            options.push(<option value="pos" key='0'>Position index</option>);
        if(_.contains(this.props.remainingDim, 'frame') && this.props.dims.frame > 1)
            options.push(<option value="frame" key='1'>Frame index</option>);
        if(_.contains(this.props.remainingDim, 'ch') && this.props.dims.ch > 1)
            options.push(<option value="ch" key='2'>Channel index</option>);
        if(_.contains(this.props.remainingDim, 'slice') && this.props.dims.slice > 1)
            options.push(<option value="slice" key='3'>Slice index</option>);
        options.push(<option value="time" key='4'>Time</option>);
        return options;
    },
    coordOpts() {
        return [<option value='const'>Constant</option>,
        <option value="x" key="x">Stage X</option>,
        <option value="y" key="y">Stage Y</option>,
        <option value="z" key="z">Stage Z</option>,
        <option value="pos" key="pos">Position index</option>,
        <option value="frame" key="frame">Frame index</option>,
        <option value="ch" key="ch">Channel index</option>,
        <option value="slice" key="slice">Slice index</option>,
        <option value="time" key="time">Time</option>]
    }
});

var ImgPanel = React.createClass({
    render() {
        return <svg id="map"></svg>
    },
    componentDidMount() {
        updateImages(this.props.images,this.props.showOpt);
    }

});

var ImgInfo = React.createClass({
    render: function(){
        var rows = _.map(this.props.selectedImages,function(im){
            var sec = (im.time-startTime)/1000;
            return <tr key={im.uuid}>
                <td>{im.uuid}</td>
                <td>{this.path(currentDataset, im)}</td>
                <td>{''+Math.floor(sec)+'.'+(Math.floor(sec*10)%10)}</td>
                <td>{im.pos}</td>
                <td>{im.frame}</td>
                <td>{im.ch}</td>
                <td>{im.slice}</td>
            </tr>;
        });
        return <div className="col-md-12" id="info">
            <table id="info" className="table">
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
        </table>
        </div>;
    },
    path(dn, d) {
            function pad(num, size) {
                var s = "000000000" + num;
                return s.substr(s.length - size);
            }

            var s = dataset[dn];
            if (s.metaset) {
                return d.folder + '/' + 'Pos0' + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_'+ pad(d.slice,3) + '.tif';
            } else {
                return s.folder + '/' + d.posname + '/img_' + pad(d.frame, 9) + '_' + d.chname + '_' +pad(d.slice,3)  + '.tif';
            }
    }
});

$(function () {
    setupD3();
    React.render(<App/>, document.getElementById("app"));
});


//
// Utility functions
//

function imghref(base, res) {
    var m = {s1: '_s1.jpg', full: '.png'};
    return base + m[res];
}

function imgbasename(s, d) {
    return 'images/' + (s.metaset ? d.set_uuid : s.uuid) + '/' + d.uuid;
}
