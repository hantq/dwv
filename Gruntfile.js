module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
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
        watch: {
            dev: {
                files: ['**/*.js', '!**/node_modules/**'],
                tasks: ['concat'],
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
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // tasks
    grunt.registerTask('start', ['connect']);
    grunt.registerTask('dev', ['watch:dev']);
    grunt.registerTask('build', ['concat', 'uglify']);
};
