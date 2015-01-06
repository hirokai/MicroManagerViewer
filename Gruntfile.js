/*global module:false*/
module.exports = function(grunt) {
    grunt.initConfig({

        react: {
            jsx: {
                options: {
                  harmony: true
                },
                files: [
                    {
                        expand: true,
                        cwd: 'src',
                        src: [ '*.jsx' ],
                        dest: 'js',
                        ext: '.js'
                    }
                ]
            }
        },

        watch: {
            react: {
                files: 'src/*.jsx',
                tasks: ['react:jsx']
            }
        },

        uglify: {
            options: {
                sourceMap: true,
                compress: {
                    drop_console: true
                }
            },
            my_target: {
                files: {
                    'js/allcode.js': ['js/imagepanel.js', 'js/main.js']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-react');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['react','uglify']);
};