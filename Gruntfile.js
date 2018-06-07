/* global module */
module.exports = function(grunt) {
    var cpTarget = grunt.option('copy-target') || '../dwv-jqmobile';
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        qunit: {
            all: ['tests/index.html'],
            options: {
                '--web-security': 'no',
                coverage: {
                    disposeCollector: true,
                    src: [ "src/**/*.js" ],
                    instrumentedFiles: "/tmp/ivmartel/dwv",
                    htmlReport: "build/report/coverage",
                    lcovReport: "build/report/lcov",
                    linesThresholdPct: 0
                }
            }
        },
        coveralls: {
            options: {
                // don't fail if coveralls fails
                force: true
            },
            main_target: {
                src: "build/report/lcov/lcov.info"
            }
        },
        concat: {
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %> */\n'
            },
            dist: {
                src: ['resources/module/intro.js', 'src/**/*.js', 'resources/module/outro.js'],
                dest: 'build/dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %> */\n'
            },
            dist: {
                files: {
                    'build/dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
        copy: {
            main: {
                files: [
                    {
                        src: 'build/dist/<%= pkg.name %>.js',
                        dest: cpTarget + '/node_modules/dwv/dist/<%= pkg.name %>.js'
                    },
                    {
                        src: 'build/dist/<%= pkg.name %>.js',
                        dest: cpTarget + '/node_modules/dwv/dist/<%= pkg.name %>.min.js'
                    }
                ]
            }
        },
        watch: {
            cmd: {
                files: ['**/*.js', '!**/node_modules/**'],
                tasks: ['test'],
                options: {
                    spawn: false
                }
            },
            dev: {
                files: ['**/*.js', '!**/node_modules/**'],
                tasks: ['concat', 'copy'],
                options: {
                    spawn: false
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8080,
                    hostname: 'localhost',
                    open: 'http://localhost:8080/tests/index.html',
                    livereload: true
                }
            }
        },
    });

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-coveralls');
    grunt.loadNpmTasks('grunt-qunit-istanbul');

    // tasks
    grunt.registerTask('test', ['qunit']);
    grunt.registerTask('start', ['connect']);
    grunt.registerTask('start-cmd', ['watch:cmd']);
    grunt.registerTask('dev', ['watch:dev']);
    grunt.registerTask('build', ['concat', 'uglify']);
};
