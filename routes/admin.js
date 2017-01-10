var express = require('express');
var router = express.Router();
var PATH_PREFIX = "admin";

router.get('/index', function (req, res, next) {
    //res.render(PATH_PREFIX + '/dashboard/dashboard', {title: "dashboard"});
    //res.render(PATH_PREFIX + '/index.html', {title: "dashboard"});
    res.sendfile('./public/admin/index.html');
});

router.get('/test', function (req, res, next) {
    //res.render(PATH_PREFIX + '/dashboard/dashboard', {title: "dashboard"});
    //res.render(PATH_PREFIX + '/index.html', {title: "dashboard"});
    res.sendfile('./public/admin/index1.html');
});
//router.get('/', function (req, res, next) {
//    res.render('index', {title: 'Express'});
//});
//
//router.post('/login', function (req, res, next) {
//    res.redirect('dashboard');
//});
//
//router.get('/logout', function (req, res, next) {
//    res.redirect('/login/admin');
//});
//
//
//
//router.get('/users', function (req, res, next) {
//    res.render(PATH_PREFIX + '/users/list', {title: "Users"});
//});
//
//router.get('/submitters', function (req, res, next) {
//    res.render(PATH_PREFIX + '/submitters/list', {title: "Users"});
//});
//
//router.get('/submitters/profile', function (req, res, next) {
//    res.render(PATH_PREFIX + '/submitters/profile', {title: "Users"});
//});
//
//router.get('/ideas', function (req, res, next) {
//    res.render(PATH_PREFIX + '/ideas/list', {title: "Users"});
//});



module.exports = router;
