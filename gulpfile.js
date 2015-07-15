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
  gulp.src('./docs/donler.yaml')
    .pipe(yaml({ space: 2 }))
    .pipe(gulp.dest('./public'));
  gulp.src('./docs/v2_0.yaml')
    .pipe(yaml({ space: 2 }))
    .pipe(gulp.dest('./public'));
});

gulp.watch(['./docs/donler.yaml', './docs/v2_0.yaml'], ['yaml']);

gulp.task('default', ['nodemon', 'yaml']);