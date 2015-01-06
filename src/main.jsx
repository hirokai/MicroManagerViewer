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
                        return <DataSetEntry key={k} data={d} data-uuid={k}/>;
                    })}
                </ul>
                <hr/>
                <div>
                    MicroManagerViewer (<a href='https://github.com/hirokai/MicroManagerViewer/'>source code</a>)
                </div>
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
            d.images = +d.images;
            return d;
        }, function (err, dat) {
            ds = {};
            _.map(dat, function (d) {
                ds[d.uuid] = d;
            });
            self.setState({datasets: ds});
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
    propTypes: {
        dataset: React.PropTypes.object
    },
    getInitialState(){
        return {images: []
            , dims: {pos: null, frame: null, ch: null, slice: null}
            , coord: {pos: null, frame: null, ch: null, slice: null}
            , selectedImages: []  //Shown images.
            , filterDims: {pos: false, frame: false, ch: false, slice: false}
            , selected: {}  // Selected by clicking.
            , show: {tile: true, mapX: 'x', mapY: 'y',sortKey: 'time', marginRatio: 1.1}
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
                    <DimFilters dims={this.props.dataset.dims} filterDims={this.state.filterDims} onChangeFilterDims={this.filterDimChanged}
                        onChangeCoord={this.coordChanged}
                    />
                    <FilterInfo selectedImages={this.state.selectedImages} filterDims={this.state.filterDims} coord={this.state.coord} show={this.state.show} remainingDim={this.calcRemainingDim()}/>
                    <div>
                        <MapTools remainingDim={this.calcRemainingDim()} dims={this.state.dims}
                            onClickMapMode={this.onClickMapMode}
                            show={this.state.show}
                            remainingDim={this.calcRemainingDim()}
                            onMapXYChange={this.onMapXYChange}
                            onChangeSort={this.onChangeSort}
                            onChangeSortReverse={this.onChangeSortReverse}
                        />
                        <div style={{clear: 'both'}}></div>
                    </div>
                </div>
                <div style={{clear: 'both'}}></div>
                <ImgPanel dataset={this.props.dataset}
                    allimages={this.state.images} images={this.state.selectedImages} showOpt={this.state.show} width={900} height={600} preloadCache={true}
                    selected={this.state.selected} onChangeSelected={this.onChangeSelected}
                    coord={this.state.coord}
                    filterDims={this.state.filterDims}
                />
                <ImgInfo/>
            </div>;
    },
    onMapXYChange(c){
        var v = _.extend({},this.state.show);
        v.mapX = c[0];
        v.mapY = c[1];
        this.setState({show: v});
    },
    onChangeSort(v){
        var o = _.extend({},this.state.show);
        o.sortKey = v;
        this.setState({show: o});
    },
    onChangeSortReverse(c){
        var v = _.extend({},this.state.show);
        v.sortReverse = c;
        this.setState({show: v});
    },
    onClickMapMode(tile) {
        var v = _.extend({},this.state.show);
        v.tile = tile;
        this.setState({show: v});
    },
    coordChanged(v) {
        var newCoord = _.extend({},this.state.coord);
        newCoord[v.key] = v.value;

        this.setState({coord: newCoord, selectedImages: this.selectImages(this.state.images, this.state.filterDims, newCoord), remainingDim: this.calcRemainingDim()});
    },
    calcRemainingDim(){
        var rem = [];
        var self = this;
        _.map(['pos','frame','ch','slice'],function(k){
            if(self.state.dims[k] > 1 && !self.state.filterDims[k]) rem.push(k);
        });
        return rem;
    },
    filterDimChanged(filterDims){
        var ov = this.state.filterDims;
        var newCoord = {};
        var currentCoord = this.state.coord;
        _.map(['pos','frame','ch','slice'], function(d){
            newCoord[d] = filterDims[d] ? (ov[d] ? currentCoord[d] : 0): null;
        });
        console.log('filterDimChanged',filterDims,newCoord);
        this.setState({filterDims: filterDims, remainingDim: this.calcRemainingDim(), coord: newCoord, selectedImages: this.selectImages(this.state.images, filterDims, newCoord)});
    },
    onChangeSelected(cmd,dat) {
        console.log(cmd,dat);
    },
    selectImages(images, f, coord) {
        console.log(images.length,f,coord);
        var self = this;
        var res = _.filter(images, function (img) {
            return (!f.pos || coord.pos == null || (img.meta_pos || img.pos) == coord.pos)
                && (!f.ch || coord.ch == null || (img.meta_ch || img.ch) == coord.ch)
                && (!f.frame || coord.frame == null || (img.meta_frame || img.frame) == coord.frame)
                && (!f.slice || coord.slice == null || (img.meta_slice || img.slice) == coord.slice);
        });
        return res;
    },
    componentDidUpdate(prevProps) {
        var s = this.props.dataset;
        console.log(prevProps,this.props);
        if(s && s != prevProps.dataset)
            this.datasetChanged();
    },
    datasetChanged() {
        var self = this;
        console.log('datasetChanged()',this.props.dataset);
        var s = this.props.dataset;
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
            return d;
        }, (error, imgs) => {
            console.log("datasetChanged(): metadata loaded.",error,imgs);
            var ts = _.map(imgs,function(im){return im.time;});

            var startTime = _.min(ts);

            var dims = {};
            dims.pos = s.meta_pos || s.positions;
            dims.frame = s.meta_frame || s.frames;
            dims.ch = s.meta_ch || s.channels;
            dims.slice = s.meta_slice || s.slices;

            console.log(dims, _.sortBy(Object.keys(dims),function(k){return -dims[k]})[0]);
            var biggestDim = _.sortBy(Object.keys(dims),function(k){return -dims[k]})[0];
            var coord = {};
            coord[biggestDim] = 0;

            var filterDims = {};
            filterDims.frame = false;
            filterDims.ch = false;
            filterDims.slice = false;
            filterDims[biggestDim] = true;

            var selectedImgs = this.selectImages(imgs, filterDims, coord);

            // Note: It's important to setState everything needed for ImgPanel at one time.
            // Otherwise, ImgPanel's algorithm to see if redraw is needed will be incorrect (update will be missed).
            self.setState({images: imgs, selectedImages: selectedImgs, dims: dims, coord: coord, filterDims: filterDims});
        });
    }
});

var Tags = React.createClass({
    render() {
        return <div id='tags'>
                {this.props.dims.pos > 1 ? <span className="label label-default tag">Positions</span> : ''}
                {this.props.dims.frame > 1 ? <span className="label label-primary tag">Frames</span> : ''}
                {this.props.dims.ch > 1 ? <span className="label label-warning tag">Channels</span> : ''}
                {this.props.dims.slice > 1 ? <span className="label label-success tag">Slices</span> : ''}
        </div>;
    }
});

var DimFilters = React.createClass({
    propTypes: {
        dims: React.PropTypes.object.isRequired,
        filterDims: React.PropTypes.object.isRequired
    },
    render: function () {
        return <div id='dim-select-btns'>
            <div>
                <span style={{'margin': '0px 10px 10px 20px'}}>Select by</span>
                <div className="btn-group" role="group" aria-label="...">
                    {this.btn('Position', 'pos', this.toggleDim, this.props.dims.pos > 1, this.props.filterDims.pos)}
                    {this.btn('Frame', 'frame', this.toggleDim, this.props.dims.frame > 1, this.props.filterDims.frame)}
                    {this.btn('Channel', 'ch', this.toggleDim, this.props.dims.ch > 1, this.props.filterDims.ch)}
                    {this.btn('Slice', 'slice', this.toggleDim, this.props.dims.slice > 1, this.props.filterDims.slice)}
                </div>
                <span style={{'margin': '0px 10px 10px 20px'}}>Preset</span>
                <div className="btn-group" role="group" aria-label="...">
                    {this.btnp('No filter', '', this.dimPreset, true)}
                    {this.btnp('Pos x Frame', 'pos,frame', this.dimPreset, this.props.dims.pos > 1 && this.props.dims.frame > 1)}
                    {this.btnp('Frame x Ch', 'frame,ch', this.dimPreset, this.props.dims.frame > 1 && this.props.dims.ch > 1)}
                    {this.btnp('Pos x Ch', 'pos,ch', this.dimPreset, this.props.dims.pos > 1 && this.props.dims.ch > 1)}
                    {this.btnp('Pos x Slice', 'pos,slice', this.dimPreset, this.props.dims.pos > 1 && this.props.dims.slice > 1)}
                </div>
            </div>

            {this.props.filterDims.pos ? <Slider dim='pos' max={this.props.dims.pos-1} onChange={this.onChangeCoord}/> : ''}
            {this.props.filterDims.frame ? <Slider dim='frame' max={this.props.dims.frame-1} onChange={this.props.onChangeCoord}/> : ''}
            {this.props.filterDims.ch ? <Slider dim='ch' max={this.props.dims.ch-1} onChange={this.props.onChangeCoord}/> : ''}
            {this.props.filterDims.slice ? <Slider dim='slice' max={this.props.dims.slice-1} onChange={this.props.onChangeCoord}/> : ''}
        </div>;
    },
    toggleDim: function (ev) {
        var el = $(ev.nativeEvent.target);
        var dim = el.attr('data-value');
        var ds = _.extend({},this.props.filterDims);
        ds[dim] = !ds[dim];
        this.props.onChangeFilterDims(ds)
    },
    dimPreset: function (ev) {
        var v = $(ev.nativeEvent.target).attr('data-value').split(',');
        var ds = _.object(_.map(['pos','frame','ch','slice'], function(d){
            return [d,_.contains(v,d)];
        }));
        this.props.onChangeFilterDims(ds);
    },
    btn: function (title, val, clicked, enabled, active) {
        var cx = React.addons.classSet;
        var classes = cx({'btn': true, 'btn-sm': true, 'btn-default': true, 'dim-btn': true, 'active': active});
        return <button id={'dim-'+val} onClick={clicked} className={classes} key={title} data-value={val} disabled={!enabled ? 'disabled' : ''}>{title}</button>
    },
    btnp: function (title, val, clicked, enabled) {
        var cx = React.addons.classSet;
        var classes = cx({'btn': true, 'btn-xs': true, 'preset-btn': true, 'btn-default': true});
        return <button onClick={clicked} className={classes} key={title} data-value={val} disabled={!enabled ? 'disabled' : ''}>{title}</button>
    },
    componentDidMount: function(){

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
    slider: null,
    render: function(){
        var dim = this.props.dim;
        return <div id={dim + '-slider-wrap'}>
            <span style={{'marginRight': '30px'}}>{this.fullname[dim]}</span>
            <input id={dim +'-slider-input'} data-slider-id={dim + '-slider'}
                type="text" data-slider-step="1"/>
        </div>;
    },
    fullname: {pos: 'Position', frame: 'Frame', ch: 'Channel', slice: 'Slice'},
    componentDidMount: function(){
        this.slider = $('#'+this.props.dim+'-slider-input').slider({min: 0, max: this.props.max, value: this.props.value})
            .on('change', this.changedDebounce())
            .data('slider');
//        this.setState({slider: sl});
        this.slider.setValue(0);
    },
    componentDidUpdate(){
        this.slider.setAttribute('max',this.props.max);
        this.slider.setValue(this.props.value);
    },
    shouldComponentUpdate(nextProps){
//          return false;
        return nextProps.max != this.props.max;
    },
    changed: function(ev){
        console.log(ev.value,"hey",this.props.value);
        if(ev.value != this.props.value)
            this.props.onChange({key: this.props.dim, value: this.slider.getValue()});
    },
    changedDebounce() {
        return $.throttle(100,this.changed);
        //return this.changed;
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
        onClickMapMode: React.PropTypes.func,
        onMapXYChange: React.PropTypes.func,
        onChangeSortReverse: React.PropTypes.func,
        onChangeSort: React.PropTypes.func,
        remainingDim: React.PropTypes.array.isRequired,
        show: React.PropTypes.object.isRequired
    },
    getInitialState: function(){
        return {};
    },
    render: function(){
        return <div id='map-tools'><span style={{'margin': '0px 10px 10px 20px'}}>Mapping</span>
            <div className="btn-group" role="group" aria-label="..."  style={{marginRight: '10px'}}>
                <button type="button" className={"btn btn-default btn-sm map-select" + (this.props.show.tile ? ' active': '')}
                    id="map-tile" onClick={this.onClickMapMode}>
                    Tile
                </button>
                <button type="button" className={"btn btn-default btn-sm map-select" + (!this.props.show.tile ? ' active': '')}
                    id="map-2d" onClick={this.onClickMapMode}>
                    X/Y
                </button>
            </div>
            {this.props.show.tile ? this.sortTool() : this.xyTool()}
        </div>
    },
    sortTool: function(){
        return <div id="sort-tool">
            <label htmlFor="tile-sort">Sort by</label>
            <select name="" id="tile-sort" onChange={this.onChangeSort}>
                    {this.sortOptions()}
            </select>
            <input type="checkbox" id="sort-reverse" checked={this.props.show.sortReverse ? 'checked' : ''} onChange={this.onClickSortReverse}
                style={{marginLeft: '10px'}}
            />
            <label htmlFor="sort-reverse">Reverse</label>
        </div>;
    },
    xyTool: function(){
        var presets = [["Stage X/Y","x,y"],["Frame/Slice","frame,slice"],["Time/Pos","time,pos"],["Ch/Pos","ch,pos"]];
        var self = this;
        return <div id="xy-tool">
            <label htmlFor="xcoord">X</label>
            <select name="" id="xcoord" value={this.props.show.mapX} onChange={this.onChangeCoord}>
                            {this.coordOpts()}
            </select>
            <button id="switch-xy" className='btn btn-xs btn-default' style={{cursor: 'pointer', margin: '0px 7px'}} onClick={this.onClickSwitch}>&nbsp;&#8596;&nbsp;</button>
            <label htmlFor="ycoord">Y</label>
            <select name="" id="ycoord" value={this.props.show.mapY} onChange={this.onChangeCoord}>
                            {this.coordOpts()}
            </select>
            <span style={{marginLeft: '30px'}}>Preset</span>

            <div className="btn-group" role="group" aria-label="...">
                {_.map(presets,function(p){
                      return <button type="button" key={p[1]} className="btn btn-xs btn-default map-preset" data-value={p[1]}
                          id="map-xy" onClick={self.onClickXYPreset}>{p[0]}
                      </button>
                })}
            </div>
        </div>;
    },
    onClickMapMode(ev) {
        var tile = $(ev.nativeEvent.target).attr('id') =='map-tile';
        this.props.onClickMapMode(tile);
    },
    onChangeSort(ev) {
        this.props.onChangeSort($(ev.nativeEvent.target).val())
    },
    onClickSortReverse(ev) {
        this.props.onChangeSortReverse($(ev.nativeEvent.target).prop('checked'));
    },
    onClickSwitch() {
        this.props.onMapXYChange([this.props.show.mapY,this.props.show.mapX]);
    },
    onChangeCoord(ev) {
        var isX = $(ev.nativeEvent.target).attr('id') == 'xcoord';
        var v = $(ev.nativeEvent.target).val();
        if(isX){
            this.props.onMapXYChange([v,this.props.show.mapY]);
        }else{
            this.props.onMapXYChange([this.props.show.mapX,v]);
        }
    },
    onClickXYPreset(ev) {
        var xy = $(ev.nativeEvent.target).attr('data-value').split(',');
        this.props.onMapXYChange(xy);
    },
    sortOptions() {
        var options = [];
        console.log(this.props.remainingDim);
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
        return [<option value='const' key="const">Constant</option>,
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

    $.throttle = jq_throttle = function( delay, no_trailing, callback, debounce_mode ) {
        // After wrapper has stopped being called, this timeout ensures that
        // `callback` is executed at the proper times in `throttle` and `end`
        // debounce modes.
        var timeout_id,

        // Keep track of the last time `callback` was executed.
            last_exec = 0;

        // `no_trailing` defaults to falsy.
        if ( typeof no_trailing !== 'boolean' ) {
            debounce_mode = callback;
            callback = no_trailing;
            no_trailing = undefined;
        }

        // The `wrapper` function encapsulates all of the throttling / debouncing
        // functionality and when executed will limit the rate at which `callback`
        // is executed.
        function wrapper() {
            var that = this,
                elapsed = +new Date() - last_exec,
                args = arguments;

            // Execute `callback` and update the `last_exec` timestamp.
            function exec() {
                last_exec = +new Date();
                callback.apply( that, args );
            };

            // If `debounce_mode` is true (at_begin) this is used to clear the flag
            // to allow future `callback` executions.
            function clear() {
                timeout_id = undefined;
            };

            if ( debounce_mode && !timeout_id ) {
                // Since `wrapper` is being called for the first time and
                // `debounce_mode` is true (at_begin), execute `callback`.
                exec();
            }

            // Clear any existing timeout.
            timeout_id && clearTimeout( timeout_id );

            if ( debounce_mode === undefined && elapsed > delay ) {
                // In throttle mode, if `delay` time has been exceeded, execute
                // `callback`.
                exec();

            } else if ( no_trailing !== true ) {
                // In trailing throttle mode, since `delay` time has not been
                // exceeded, schedule `callback` to execute `delay` ms after most
                // recent execution.
                //
                // If `debounce_mode` is true (at_begin), schedule `clear` to execute
                // after `delay` ms.
                //
                // If `debounce_mode` is false (at end), schedule `callback` to
                // execute after `delay` ms.
                timeout_id = setTimeout( debounce_mode ? clear : exec, debounce_mode === undefined ? delay - elapsed : delay );
            }
        };

        // Set the guid of `wrapper` function to the same of original callback, so
        // it can be removed in jQuery 1.4+ .unbind or .die by using the original
        // callback as a reference.
        if ( $.guid ) {
            wrapper.guid = callback.guid = callback.guid || $.guid++;
        }

        // Return the wrapper function.
        return wrapper;
    };


    $.debounce = function( delay, at_begin, callback ) {
        return callback === undefined
            ? jq_throttle( delay, at_begin, false )
            : jq_throttle( delay, callback, at_begin !== false );
    };

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
