module.exports = function (grunt) {
    var RES = "public";
    grunt.initConfig({
        concat: {
            themeJs: {
                files: [
                    {src: [
                            RES + '/bootstrap/js/jquery.min.js',
                            RES + '/bootstrap/js/jquery.validate.min',
                            RES + '/bootstrap/js/bootstrap.min.js',
                            RES + '/bootstrap/js/app.min.js',
                            RES + '/js/angular.min.js'
                        ], dest: RES + '/js/theme.js'
                    }
                ]
            },
            themeCss: {
                files: [
                    {src: [
                            RES + '/bootstrap/css/bootstrap.min.css',
                            RES + '/bootstrap/css/AdminLTE.min.css',
                            RES + '/bootstrap/css/_all-skins.min.css',
                            RES + '/bootstrap/css/font-awesome.min.css'
                        ], dest: RES + '/css/theme.css'
                    }
                ]
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
            options: {
                globals: {
                    jQuery: true
                }
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    //grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['jshint']);

    // Theme Generator Script
    grunt.registerTask('theme', ['concat:themeJs', 'concat:themeCss']);
};