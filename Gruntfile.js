module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bower: {
      dev: {
        dest: 'vendor/',
      }
    },
    zip: {
      'build/youtube_score.zip': ['*.js', '*.css', 'share/icon*.png', 'manifest.json', 'LICENSE', 'vendor/**/*.js']
    }
  });
  grunt.loadNpmTasks('grunt-bower');
  grunt.loadNpmTasks('grunt-zip');

};
