'use strict';

var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var yaml = require('gulp-yaml');

gulp.task('nodemon', function () {
  nodemon({
    script: 'app.js',
    ext: 'js',
    watch: [
      "**.js",
      "app.js"
    ],
    ignore: [
      "node_modules/**"
    ],
    env: {
      "NODE_ENV": "development"
    }
  })
    .on('restart', function () {
      console.log('app restarted!')
    });

});

gulp.task('yaml', function () {
  gulp.src('./docs/swagger.yaml')
    .pipe(yaml({ space: 2 }))
    .pipe(gulp.dest('./public'));
});

gulp.watch('./docs/swagger.yaml', ['yaml']);

gulp.task('default', ['nodemon', 'yaml']);