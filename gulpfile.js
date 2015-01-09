var gulp = require('gulp');
//var react = require('gulp-react');
var reactify = require('reactify');  // Transforms React JSX to JS.
var uglify = require('gulp-uglifyjs');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');


gulp.task('browserify', function () {
    return browserify(['./src/main.jsx','./src/imagepanel.jsx'])
        .transform(reactify,{es6: true})
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(buffer())
        .pipe(uglify('combined.min.js', {outSourceMap: true}))
        .pipe(gulp.dest('js'));
});


gulp.task('default', function () {
    return browserify(['./src/main.jsx'])
        .transform(reactify,{es6: true})
        .bundle()
        .pipe(source('combined.js'))
        .pipe(buffer())
        .pipe(uglify('combined.min.js', {outSourceMap: true, compress: {drop_console: true}, warnings: false}))
        .pipe(gulp.dest('./js'));
});

gulp.task('watch', function() {
    gulp.watch('src/*.jsx', ['default'])
});