/** @jsx React.DOM */

jest.dontMock('../src/main.jsx');
jest.dontMock('../src/imagepanel.jsx');

$ = require('jquery');
_ = require('underscore');
d3 = require('d3/d3');
numeral = require('numeral');
moment = require('moment');

// jest.dontMock('d3');

describe('Tests', function() {
    it('initial test', function () {
        var React = require('react/addons');
        var main = require('../src/main.jsx');
        var App = main.App;
        var DataSetEntry = main.DataSetEntry;
        var TestUtils = React.addons.TestUtils;

        var app = TestUtils.renderIntoDocument(
            <App/>
        );

//        React.addons.TestUtils.Simulate.click();

        console.log(app.getDOMNode().textContent);

    });
});
