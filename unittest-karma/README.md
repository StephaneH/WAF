DEFAULT

* Install nodejs
* Install PhantomJS
	* download and unzip
	* `sudo cp bin/phantomjs /usr/bin/`
* Terminal :
	* `cd unittest-karma`
	* `npm install`
    * Install karma-cli globally if needed: `npm -g install karma-cli`

With grunt :

* Install grunt-cli : `npm install grunt-cli -g`
* if you used the tests before, make sure to update your node modules by `npm update`
* Add the P4HOME variable to your env like : `export P4HOME=/Users/Rosset/workspace/perforce`

---

RUN

karma style :

`karma start`

grunt style :

* grunt test:WAF (will test WAF)
* grunt test:RIA (will test your custom widgets which are in RIA)
* grunt test:WAF_RIA (will do both)

By default, the test will keep going on, watch your files (and relaunch your tests if you modify them). To do a single run :

* grunt test:WAF:single
* grunt test:RIA:single
* grunt test:WAF_RIA:single

To run a single test, you can use the single task, using the module ID, for example `grunt single:waf-behavior/properties-template`

WARN: test with be run in continuous mode, this needs to be fixed

---

Adding your own tests

1. Add any dependency into karma.conf.js:

    ```javascript
        config.set({
            // ...
            files: [
                // ...
                {pattern: 'dependency.js', included: true}
                // ...
            ]
        };
    ```

2. Create a new test file

    Add a file that ends with `-spec.js` ./tests `folder`, for example: `tests/waf/foo-spec.js`. Note that for now tests only look for `waf`, `designer`, `widgets` subdirectories. You need to add your subdirectory into `Gruntfile.js` and `grunt.karma.conf.js` if you want to use another one.

    Jasmine tests are wrapped into `moduleDescribe()` function:

    ```javascript
        moduleDescribe('waf/foo', function() {
         describe('my first test suite', function() {
                it('test 1', function() {
                    expect(null).to.be(null);
                });
            });
        });
    ```

3. Run the tests using `karma start` (will run every test) or a single test: `grunt single:waf/foo`

---

REPORTS

* reports are logged in the terminal
* also saved in reports/html (readable in a browser)
* you can see your code coverage in `reports/coverage`

---

TODO

* code coverage
* tests with html fixtures
* test exports
* more ...
	* package definition automatisation
