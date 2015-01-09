module.exports = {
  "Demo test" : function (browser) {
    browser
      .url("http://localhost:63343/MicroManager/")
      .waitForElementVisible('body', 1000)
      .waitForElementVisible('ul.nav-pills > li', 1000)
      .click('li')
      .pause(1000)
      .assert.containsText('body', 'Position')
      .end();
  }
};
