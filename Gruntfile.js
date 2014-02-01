module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    sass: {
      dist: {
        files: [{
          expand: true,
          cwd: 'public/stylesheet',
          dest: 'build/stylesheet',
          src: ['*.scss'],
          ext: '.css'
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
      }
    },

    requirejs: {
      compile: {
        options: {

          almond: true,
          replaceRequireScript: [{
            files: ['public/index.html'],
            module: 'main',
            modulePath: 'build/javascript/main.min'
          }],

          name: "main",
          mainConfigFile: "public/javascript/config.js",
          out: "build/javascript/main.min.js",
          //optimize: 'uglify2',
          optimize: 'none',
          generateSourceMaps: true,
          preserveLicenseComments: false,
          wrap: true
        }
      },
    },

    uglify: {
      default: {
        options: {
          sourceMap: 'build/javascript/main.min.js.map',
          sourceMappingURL: '/javascript/main.min.js.map'
        },
        files: {
          'build/javascript/main.min.js': ['build/javascript/main.min.js']
        }
      }
    }

  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-requirejs');

  // Default task(s).
  grunt.registerTask('default', ['requirejs', 'uglify']);

};