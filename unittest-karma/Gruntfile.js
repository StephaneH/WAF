module.exports = function(grunt) {

    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);
    
    var unitTestTarget = 'WAF_RIA';
    
    if (grunt.cli.tasks.length === 1 && grunt.cli.tasks[0].substr(0,4) === 'test') {
        unitTestTarget = grunt.cli.tasks[0].split(':')[1];
    }
    
    // Load external resources (by default load the whole list of file to test)
    var gruntKarmaConf = require('./grunt.karma.conf')(),
        gruntConfig = {
            // Test settings
            karma: {
                options : {
                    configFile: 'karma.conf.js',
                    files : []
                },
                "WAF-single" : {
                    singleRun : true
                },
                "RIA-single" : {
                    singleRun: true
                },
                "WAF_RIA-single" : {
                    singleRun: true
                },
                "WAF-continuous" : {
                    singleRun : false
                },
                "RIA-continuous" : {
                    singleRun: false
                },
                "WAF_RIA-continuous" : {
                    singleRun: false
                },
                "DESIGNER-continuous" : {
                    singleRun: false
                }
            },

            test : {
                WAF : {
                    single : {},
                    continuous: {}
                },
                RIA : {
                    single : {},
                    continuous: {}
                },
                WAF_RIA : {
                    single : {},
                    continuous: {}
                },
                DESIGNER : {
                    single : {},
                    continuous: {}
                }
            }

        };
    
    // register newStyle task
    grunt.registerTask('single', 'run a single test', function() {
        // get files
        gruntConfig.karma.options.files = gruntKarmaConf.getFiles(arguments[0] || '');
        
        grunt.initConfig(gruntConfig);
        
        // TODO: add option for single/continuous
        grunt.task.run('karma:WAF-' + "continuous");
    });
    
//    grunt.registerTask('openLog', 'open log', function() {
//        
//    });
    
    grunt.registerMultiTask('test', "Multi task karma", function(mode){
        // get files
        grunConfig.karma.options.files = gruntKarmaConf.getFiles();
        
        grunt.initConfig(gruntConfig);
        
        if (!this.target || !this.target.match(new RegExp(Object.keys(gruntConfig.test).join("|")))){
            grunt.fail.warn('Please specify "WAF","RIA" or "WAF_RIA" as target');
        }
        if (typeof mode === "undefined" || mode == ""){
            mode = "continuous";
        }
        grunt.task.run('karma:' + this.target + '-' + mode);
    });
};
