$ = require('jquery');
_ = require('underscore');


module.exports = {
    "Demo test": function (browser) {
        var count = 0;
        browser
            .url("http://localhost:63343/MicroManager/")
            .waitForElementVisible('body', 1000)
            .waitForElementVisible('ul.nav-pills > li', 1000, function () {
                browser.elements('tag name', 'li', function (els) {
                    _.map(els.value,function(el,i){
                        browser.elementIdClick(el.ELEMENT, function () {
                            console.log('clicked.');
                            browser.pause(1000);
                            browser.screenshot(function(s){
                                count += 1;
                                browser.pause(1000);
                                browser.elementIdClick(els.value[0].ELEMENT, function () {
                                    count += 1;
                                    browser.pause(1000);
                                    browser.screenshot(function(s2){
                                        browser.elementIdClick(el.ELEMENT, function () {
                                            browser.screenshot(function(s3){
                                                browser.assert.equal(s , s3);
                                                console.log(s,s3);
                                                count += 1;
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                    browser.pause(10000);
                    //els.click()
                    //    .pause(1000)
                    //    .assert.containsText('#tools', 'Position')
                    //    .assert.containsText('#tools', 'Frame')
                    //    .assert.containsText('#tools', 'Channel')
                    //    .assert.containsText('#tools', 'Slice')
                    //    .end();
                });

            });
        browser.end();

    }
};
