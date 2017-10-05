/**
 * Gulp Packages
 */

// General
var gulp = require('gulp');
var fs = require('fs');
var del = require('del');
var plumber = require('gulp-plumber');
var flatten = require('gulp-flatten');
var tap = require('gulp-tap');
var rename = require('gulp-rename');
var header = require('gulp-header');
var footer = require('gulp-footer');
var watch = require('gulp-watch');
var package = require('./package.json');
var browserSync = require('browser-sync');
var injectfile = require('gulp-inject-file');
var svgMin = require('gulp-svgmin');
var inlineSvg = require('gulp-inline-svg');
var cheerio = require('gulp-cheerio');

// Styles
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var minify = require('gulp-cssmin');

// SVGs
var svgmin = require('gulp-svgmin');
var svgstore = require('gulp-svgstore');

/**
 * Paths to project folders
 */

var paths = {
    input: 'src/**/*',
    output: 'dist/',
    styles: {
        input: 'src/scss/**/*.scss',
        output: 'dist/css/',
        includes: [
            './node_modules/foundation-sites/scss',
            './node_modules/motion-ui/src'
        ]
    },
    svgs: {
        input: 'src/assets/svg/*',
        output: 'dist/assets/svg/'
    },
    svgscss: {
        input: 'src/assets/svg-backgrounds/*',
        output: 'src/scss/'
    },
    images: {
        input: 'src/img/*',
        output: 'dist/img/'
    },
    static: {
        input: 'src/static/*',
        output: 'dist/'
    },
    templates: {
        input: 'src/templates/*',
        output: 'dist/templates'
    },
    fonts: {
        input: 'src/assets/fonts/**/*',
        output: 'dist/assets/fonts'
    },
    serverRoot: './dist/templates',
    railsPath: '../server/public/static/',
    ionicPath: '../ionic-system/www/frontend/',
    ionicIndex: {
        input: '../ionic-system/app/index.html',
        output: '../ionic-system/www'
    },
    dist: 'dist/**/*'
};


/**
 * Template for banner to add to file headers
 */

var banner = {
    full :
        '/*!\n' +
        ' * <%= package.name %> v<%= package.version %>: <%= package.description %>\n' +
        ' * (c) ' + new Date().getFullYear() + ' <%= package.author.name %>\n' +
        ' * MIT License\n' +
        ' * <%= package.repository.url %>\n' +
        ' */\n\n',
    min :
        '/*!' +
        ' <%= package.name %> v<%= package.version %>' +
        ' | (c) ' + new Date().getFullYear() + ' <%= package.author.name %>' +
        ' | MIT License' +
        ' | <%= package.repository.url %>' +
        ' */\n'
};


/**
 * Gulp Taks
 */

// Process, lint, and minify Scss files
gulp.task('build:styles', ['generate:svg'], function() {
    return gulp.src(paths.styles.input)
        .pipe(plumber())
        .pipe(sass({
            includePaths: paths.styles.includes,
            outputStyle: 'expanded',
            sourceComments: true
        }))
        .pipe(flatten())
        .pipe(prefix({
            browsers: ['last 2 version', '> 1%'],
            cascade: true,
            remove: true
        }))
        .pipe(header(banner.full, { package : package }))
        .pipe(gulp.dest(paths.styles.output))
        .pipe(rename({ suffix: '.min' }))
        .pipe(minify({
            discardComments: {
                removeAll: true
            }
        }))
        .pipe(header(banner.min, { package : package }))
        .pipe(gulp.dest(paths.styles.output));
});

// Generate SVG sprites
gulp.task('build:svgs', function () {
    return gulp.src(paths.svgs.input)
        .pipe(plumber())
        .pipe(tap(function (file, t) {
            if ( file.isDirectory() ) {
                var name = file.relative + '.svg';
                return gulp.src(file.path + '/*.svg')
                    .pipe(svgmin())
                    .pipe(svgstore({
                        fileName: name,
                        prefix: 'icon-',
                        inlineSvg: true
                    }))
                    .pipe(cheerio({
                        run: function ($, file) {
                            $('svg').addClass('hidden');
                            $('[fill]').removeAttr('fill');
                        },
                        parserOptions: {xmlMode: true}
                    }))
                    .pipe(gulp.dest(paths.svgs.output));
            }
        }))
        .pipe(svgmin())
        .pipe(gulp.dest(paths.svgs.output));
});

// Copy image files into output folder
gulp.task('build:images', function() {
    return gulp.src(paths.images.input)
        .pipe(plumber())
        .pipe(gulp.dest(paths.images.output));
});

// Copy static files into output folder
gulp.task('build:static', function() {
    return gulp.src(paths.static.input)
        .pipe(plumber())
        .pipe(gulp.dest(paths.static.output));
});

// Build html Templates and inject svgs
gulp.task('build:templates', ['compile', 'copy:template-styles', 'copy:template-fonts'], function() {
    return gulp.src(paths.templates.input)
        .pipe(plumber())
        .pipe(injectfile({
            pattern: '<!--\\s*inject:<filename>-->'
        }))
        .pipe(gulp.dest(paths.templates.output))
})

gulp.task('copy:template-styles', ['build:styles'], function(){
    return gulp.src(paths.styles.output+'/**/*')
        .pipe(plumber())
        .pipe(gulp.dest(paths.templates.output+'/css'));
})

// Remove pre-existing content from output
gulp.task('clean:dist', function () {
    //del.sync([
    //    paths.output
    //]);
});

// generate svg scss
gulp.task('generate:svg', function(){

})

gulp.task('copy:fonts', function(){
    return gulp.src(paths.fonts.input)
    .pipe(gulp.dest(paths.fonts.output));
})

gulp.task('copy:template-fonts', ['copy:fonts'], function(){
    return gulp.src(paths.fonts.output+'/**/*')
        .pipe(plumber())
        .pipe(gulp.dest(paths.templates.output+'/fonts'));
})

// Spin up browsersync server and listen for file changes
gulp.task('listen', ['build:templates'], function () {
    browserSync.create();
    browserSync.init({
        server: paths.serverRoot
    });
    gulp.watch(paths.input).on('change', function(file) {
        gulp.start('default');
        gulp.start('refresh');
    });
});

// Run livereload after file change
gulp.task('refresh', ['build:templates'], function () {
    browserSync.reload();
});

gulp.task('build:rails', ['compile'], function() {
    return gulp.src(paths.dist)
        .pipe(gulp.dest(paths.railsPath));
})

gulp.task('copy:ionic', ['compile'], function() {
    return gulp.src(paths.dist)
        .pipe(gulp.dest(paths.ionicPath));
})

gulp.task('build:ionic', ['copy:ionic'], function() {
    return gulp.src(paths.ionicIndex.input)
        .pipe(plumber())
        .pipe(injectfile({
            pattern: '<!--\\s*inject:<filename>-->'
        }))
        .pipe(gulp.dest(paths.ionicIndex.output))
})


/**
 * Task Runners
 */

// Compile files
gulp.task('compile', [
    'clean:dist',
    'build:styles',
    'build:svgs',
    'copy:fonts'
]);

// Compile files (default)
gulp.task('default', [
    'compile'
]);

// Compile files and generate docs when something changes
gulp.task('watch', [
    'listen',
    'build:templates'
]);