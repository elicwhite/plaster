module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    sass: {
      dist: {
        options: {
          style: "compressed",
        },
        files: [{
          'build/stylesheet/total.css': 'public/stylesheet/total.scss',
        }]
      }
    },

    watch: {
      scss: {
        files: ['public/stylesheet/*.scss'],
        tasks: ['sass'],
        options: {
          livereload: true,
        }
      },
      javascript: {
        files: 'public/javascript/**/*.js',
        tasks: ['requirejs'],
        options: {
          livereload: true,
        }
      },

      html: {
        files: 'public/index.html',
        tasks: ['env:dev', 'requirejs', 'preprocess:html'],
        options: {
          livereload: true,
        }
      }
    },

    requirejs: {
      compile: {
        options: {
          almond: true,

          name: "main",
          mainConfigFile: "public/javascript/config.js",
          out: "build/javascript/main.min.js",

          optimize: 'none',
          generateSourceMaps: true,

          preserveLicenseComments: false,
          wrap: true
        }
      },
    },

    uglify: {
      build: {
        files: {
          'build/javascript/main.min.js': ['build/javascript/main.min.js']
        }
      }
    },

    clean: ["build/javascript/main.min.js.map"],

    env: {
      dev: {
        NODE_ENV: 'DEVELOPMENT'
      },

      prod: {
        NODE_ENV: 'PRODUCTION'
      }
    },

    preprocess: {
      html: {
        src: 'public/index.html',
        dest: 'build/index.html'
      },

      cache: {
        src: 'public/cache.appcache',
        dest: 'build/cache.appcache',
        options: {
          context: {
            BUILD_TIME: Date.now()
          }
        }
      },
    },

    htmlmin: {
      dist: {
        options: {
          removeComments: true,
          collapseWhitespace: true
        },
        files: { // Dictionary of files
          'build/index.html': 'build/index.html'
        }
      }
    }

  });

  require('load-grunt-tasks')(grunt);

  // Default task(s).
  grunt.registerTask('default', ['env:prod', 'requirejs', 'uglify', 'clean', 'preprocess', 'htmlmin']);

};