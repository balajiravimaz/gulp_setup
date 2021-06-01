import gulp from "gulp";
import yargs from "yargs";
import sass from "gulp-sass";
import cleanCss from "gulp-clean-css";
import gulpif from "gulp-if";
import sourcemaps from "gulp-sourcemaps";
import imagemin from "gulp-imagemin";
import del from "del";
import webpack from "webpack-stream";
import uglify from "gulp-uglify";
import named from "vinyl-named";
import browserSync from "browser-sync";
import zip from "gulp-zip";
import replace from "gulp-replace";
import info from "./package.json";
import prefix from "gulp-autoprefixer";

const server = browserSync.create();

const PRODUCTION = yargs.argv.prod;

const paths = {
  styles: {
    src: ["src/assets/scss/main.scss", "src/assets/scss/admin.scss"],
    dest: "dist/assets/css",
  },
  images: {
    src: "src/assets/images/**/*.{jpg,jpeg,png,svg,gif}",
    dest: "dist/assets/images",
  },
  other: {
    src: [
      "src/assets/**/*",
      "!src/assets/{images,scss,js}",
      "!src/assets/{images,scss,js}/**/*",
    ],
    dest: "dist/assets",
  },
  scrips: {
    src: ["src/assets/js/bundle.js", "src/assets/js/admin.js"],
    dest: "dist/assets/js",
  },
  package: {
    src: [
      "**/*",
      "!node_modules{,/**}",
      "!packaged{,/**}",
      "!src{,/**}",
      "!.babelrc",
      "!.gitignore",
      "!gulpfile.babel.js",
      "!package.json",
      "!package-lock.json",
    ],
    dest: "packcaged",
  },
};

export const serve = (done) => {
  server.init({
    proxy: "http://localhost/wp_learn/",
  });
  done();
};

export const reload = (done) => {
  server.reload();
  done();
};

export const clean = () => del(["dist"]);

export const styles = () => {
  return gulp
    .src(paths.styles.src, { allowEmpty: true })
    .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
    .pipe(sass().on("error", sass.logError))
    .pipe(prefix())
    .pipe(gulpif(PRODUCTION, cleanCss({ compatibility: "ie8" })))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
    .pipe(gulp.dest(paths.styles.dest))
    .pipe(server.stream());
};

export const images = () => {
  return gulp
    .src(paths.images.src)
    .pipe(gulpif(PRODUCTION, imagemin()))
    .pipe(gulp.dest(paths.images.dest));
};

export const watch = () => {
  gulp.watch("src/assets/scss/**/*.scss", styles);
  gulp.watch("src/assets/js/**/*.js", gulp.series(scripts, reload));
  gulp.watch("**/*.php", reload);
  gulp.watch(paths.images.src, gulp.series(images, reload));
  gulp.watch(paths.other.src, gulp.series(copy, reload));
};

export const copy = () => {
  return gulp.src(paths.other.src).pipe(gulp.dest(paths.other.dest));
};

export const scripts = () => {
  return gulp
    .src(paths.scrips.src, { allowEmpty: true })
    .pipe(named())
    .pipe(
      webpack({
        mode: "development",
        module: {
          rules: [
            {
              test: /\.m?js$/,
              exclude: /node_modules/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: [["@babel/preset-env", { targets: "defaults" }]],
                },
              },
            },
          ],
        },
        output: {
          filename: "[name].js",
        },
        externals: {
          jquery: "jQuery",
        },
        devtool: !PRODUCTION ? "inline-source-map" : false,
      })
    )
    .pipe(gulpif(PRODUCTION, uglify()))
    .pipe(gulp.dest(paths.scrips.dest));
};

export const compress = () => {
  return gulp
    .src(paths.package.src)
    .pipe(replace("_themename", info.name))
    .pipe(zip(`${info.name}.zip`))
    .pipe(gulp.dest(paths.package.dest));
};

export const dev = gulp.series(
  clean,
  gulp.parallel(styles, scripts, images, copy),
  serve,
  watch
);
export const build = gulp.series(
  clean,
  gulp.parallel(styles, scripts, images, copy)
);
export const bundle = gulp.series(build, compress);

export default dev;
