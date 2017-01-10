var mongoose = require('mongoose');
var redis = require("redis");
var AWS = require('aws-sdk');
var yaml = require('yamljs'), env = process.env.NODE_ENV || 'development';

// Mongo connection and schema model mapping
var Schema = mongoose.Schema;
if (env === 'production') {
    var yamlConfig = yaml.load('config.yml').production;
} else {
    var yamlConfig = yaml.load('config.yml').development;
}
function getConnString() {
    var _mConfig = yamlConfig.mongodb;
    var _connString = 'mongodb://';
    if (_mConfig.user && _mConfig.pass)
        _connString = _connString + _mConfig.user + ':' + _mConfig.pass + '@';
    if (_mConfig.servers && Array.isArray(_mConfig.servers) && _mConfig.servers.length > 0) {
        _connString = _connString + _mConfig.servers.toString();
    } else {
        throw new Error("Please Specify MongoDb Servers Detail");
    }
    if (_mConfig.port) {
        _connString = _connString + ':' + _mConfig.port;
    } else {
        _connString = _connString + ':' + 27017;
    }
    if (_mConfig.database) {
        _connString = _connString + '/' + _mConfig.database;
    } else {
        throw new Error("Please Specify database name");
    }
    if (_mConfig.authSource) {
        _connString = _connString + '?authSource=' + _mConfig.authSource;
    } else {
        _connString = _connString + '?authSource=admin';
    }
    return _connString;
}
var config = {};
var APIs = {};
APIs.mailAPI = {
    hostname: 'gmail',
    user: 'vartikashukla.genie@gmail.com',
    pass: 'vartika@12345'
};
config.APIs = APIs;
config.ADMIN_EMAIL = 'mohit.jain@canvass.in';

config.yamlConfig = yamlConfig;
config.reportSetting = 'mongo'  //options {sql,mongo}
/************************************APP PATH**********************************/
config.APP_PATH = '';
/********************************WEB ENV VARIABLES*****************************/
config.web = {};
// set port to run application
config.web.port = process.env.port || 5000;
//session
config.session = {
    secret: '1234567890QWERTY',
    proxy: true,
    resave: true,
    saveUninitialized: true
};
/************************************Image PATH**********************************/
config.DATABASE_IMAGE_PATH = '/uploads/';
config.STORE_IMAGE_PATH = __dirname + '//public//uploads//';

/***********************************LOCAL DATABASE CONNECTION***************************************/

mongoose.Promise = global.Promise;
mongoose.connect(getConnString());
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    console.log('MongoDb connection opened');
});

//var _rConfig = yamlConfig.redis;
//var redisClient = redis.createClient('6379', _rConfig.host
//      , {no_ready_check: true});
//
//redisClient.on("error", function(err) {
//  console.error("Error in connecting Redis " + err);
//});
//redisClient.on("end", function(err) {
//  console.error("redis server ended!");
//});
//redisClient.on("reconnecting", function(err) {
//  console.error("redis server reconnecting!");
//});
//redisClient.on("ready", function(err) {
//  console.log("redis server ready!");
//});
//redisClient.on("connect", function(err) {
//  console.log("redis server connected!");
//});
//config.redisClient = redisClient || "";
//
////****************connect with postgres***********************
const _p = yamlConfig.postgres;
var pgmodels = require('./app/models/pgmodels')(_p);
config.pgmodels = pgmodels;
config.sequelize = pgmodels.sequelize;

pgmodels.sequelize
        .sync()
        .then(function() {
    isPostgresConn = true;
    console.log('info', 'Postgres connected!');
})
        .error(function() {
    console.log('Error in connecting with postgres');
});
/**********************************ROUTER**************************************/
config.router = function(app) {
    // set routes file path
    var ROUTES_PATH = __dirname + '/app/routes/';
    require(ROUTES_PATH + 'adminRoutes')(app);
    require(ROUTES_PATH + 'eventManagerRoutes')(app);
    require(ROUTES_PATH + 'venueManagerRoutes')(app);
    require(ROUTES_PATH + 'vendorManagerRoutes')(app);
}
/**********************************AWS config************************************/
var awsConfig = yamlConfig.AWS;
AWS.config.update(awsConfig);
var bucket = 'accred-uploads';
config.AWS = AWS;
config.bucket = bucket;
/*********************************q name config**********************************/
var _rabbitmq = yamlConfig.rabbitmq;
config.q1 = _rabbitmq.q1

module.exports = config;