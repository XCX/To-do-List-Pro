var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// custom middlewares
var stylus = require('stylus');
var nib = require('nib');
var mongoose = require('mongoose');
var twilioClient = require('twilio')('AC1cf26d4c223b99bbe05fc0e24fa2b97e', 'ad5dc75c7a4a51b2a68fe2ed8a7386eb');


mongoose.connect('mongodb://appuser:appuser@ds045970.mongolab.com:45970/todos');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// setup stylus
function compile(str, path) {
	return stylus(str)
		.set('filename', path)
		.set('compress', false)
		.set('linenos', true)
		.set('firebug', true)
		.use(nib())
		.import('nib');
}
app.use(stylus.middleware({
	src: __dirname + '/views',
	dest: __dirname + '/public',
	compile: compile
}));

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/bower_components',  express.static(__dirname + '/bower_components'));


app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
