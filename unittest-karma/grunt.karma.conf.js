'use strict';

var fs = require('fs');

module.exports = function() {

    var P4HOME = process.env.P4HOME;
    var unitTestMainFolderName = __dirname;
    var unitTestCustomWidgetsFolderName = P4HOME+"/RIA/trunk/WakandaCustom/widgets/";

    var UNITTEST_FOLDER = 'UNITTEST_FOLDER';
    var WAF_FOLDER = 'WAF_FOLDER';
    var CUSTOMWIDGETS_FOLDER = 'CUSTOMWIDGETS_FOLDER';

    var originalFiles = [
        UNITTEST_FOLDER + 'Loader.js' ,

        WAF_FOLDER + 'waf-core/core.js',
        WAF_FOLDER + 'waf-core/class.js',
        WAF_FOLDER + 'waf-core/error.js',
        WAF_FOLDER + 'waf-core/event.js',
        WAF_FOLDER + 'waf-core/behavior.js',
        /* DOM Stuff */
        WAF_FOLDER + 'Dom/Dom.js',
        WAF_FOLDER + 'waf-behavior/methodshelper.js',
        WAF_FOLDER + 'waf-core/subscriber.js',
        WAF_FOLDER + 'waf-behavior/observable.js',
        WAF_FOLDER + 'DataProvider/Data-Provider.js',
        WAF_FOLDER + 'lib/jquery/jquery.min.js',
        WAF_FOLDER + 'DataSource/Data-Source.js',
        WAF_FOLDER + 'DataSource/Selection.js',
        WAF_FOLDER + 'DataSource/ErrorHandling.js',
        WAF_FOLDER + 'lib/handlebars/handlebars.min-latest.js',
        WAF_FOLDER + 'waf-core/formatters.js',
        WAF_FOLDER + 'waf-core/binding-parser.js',
        WAF_FOLDER + 'waf-behavior/bindable.js',
        WAF_FOLDER + 'waf-behavior/properties.js',
        WAF_FOLDER + 'waf-behavior/properties-list.js',
        WAF_FOLDER + 'waf-behavior/properties-datasource.js',
        WAF_FOLDER + 'waf-behavior/properties-template.js',
        WAF_FOLDER + 'waf-core/widget.js',
        WAF_FOLDER + 'waf-behavior/domhelpers.js',
        WAF_FOLDER + 'waf-behavior/focus.js',
        WAF_FOLDER + 'waf-behavior/style.js',
        WAF_FOLDER + 'waf-behavior/size.js',
        WAF_FOLDER + 'waf-behavior/position.js',
        WAF_FOLDER + 'waf-behavior/layout/composed.js',
        WAF_FOLDER + 'waf-behavior/layout/container.js',
        WAF_FOLDER + 'waf-behavior/layout/multicontainer.js',
        WAF_FOLDER + 'waf-behavior/layout/repeater.js',
        WAF_FOLDER + 'waf-behavior/layout/properties-container.js',
        WAF_FOLDER + 'waf-behavior/source-navigation.js',
        WAF_FOLDER + 'waf-widget/body.js',
        WAF_FOLDER + 'waf-widget/oldwidget.js',

        UNITTEST_FOLDER + 'testHelper.js'
    ];

    var wafTestFiles = [
        UNITTEST_FOLDER + 'tests/waf/**/*-spec.js' ,
        UNITTEST_FOLDER + 'tests/waf/**/*-fixture.html' ,
        UNITTEST_FOLDER + 'tests/waf/**/*-style.css'
    ];

    var designerTestFiles = [
        UNITTEST_FOLDER + 'tests/designer/**/*-spec.js' ,
        UNITTEST_FOLDER + 'tests/designer/**/*-fixture.html' ,
        UNITTEST_FOLDER + 'tests/designer/**/*-style.css'
    ];

    var customWidgetTestFiles = [
        CUSTOMWIDGETS_FOLDER + '**/*-spec.js' ,
        CUSTOMWIDGETS_FOLDER + '**/*-fixture.html' ,
        CUSTOMWIDGETS_FOLDER + '**/*-style.css'
    ];

    var testRunner = UNITTEST_FOLDER + 'testRunner.js';
    
    var dynamicRunner = UNITTEST_FOLDER + 'dynamicRunner.js',
        runnerCall = 'runModuleDescribes("%s");';

    var processFiles = function(files){
        return files.map(function(current){
            var current = current
                .replace(UNITTEST_FOLDER, unitTestMainFolderName+'/')
                .replace(WAF_FOLDER, unitTestMainFolderName+'/../')
                .replace(CUSTOMWIDGETS_FOLDER, unitTestCustomWidgetsFolderName+'/');

            return current;
        });
    };

    var getFiles = function(mode){
        var result,
            filter = '';
        
        if (!!mode && !mode.match(/^[A-Z]+/)) {
            filter = mode;
            result = processFiles(originalFiles.concat(wafTestFiles));            
        } else {
            switch(mode){
                case "NOTESTS":
                    result = processFiles(originalFiles);
                    break;
                case "WAF_RIA":
                    result = processFiles(originalFiles.concat(wafTestFiles.concat(customWidgetTestFiles)));
                    break;
                case "RIA":
                    result = processFiles(originalFiles.concat(customWidgetTestFiles));
                    break;
                case "DESIGNER":
                    result = processFiles(originalFiles.concat(designerTestFiles));
                    break;
                case "WAF":
                default :
                    result = processFiles(originalFiles.concat(wafTestFiles));
                    break;
            };
        }
        
        // generate testRunner based on passed filter
        try{
            console.log('opening', dynamicRunner.replace(UNITTEST_FOLDER, unitTestMainFolderName+'/'));
            console.log('using filter', filter);
            var fd = fs.openSync(dynamicRunner.replace(UNITTEST_FOLDER, unitTestMainFolderName+'/'), 'w+');
            console.log('attempt to write', runnerCall.replace('%s', filter));
            fs.writeSync(fd, runnerCall.replace('%s', filter), 0);
            fs.closeSync(fd);
            console.log('successfull write');
        } catch(err) {
            console.log('error while creating filter file');
        }
        
        // add testRunner so that all previously added test files are correctly run
        return result.concat([dynamicRunner.replace(UNITTEST_FOLDER, unitTestMainFolderName+'/')]);
    };

    return {
        getFiles : getFiles
    };

};
