var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/login/admin', function (req, res, next) {
    res.redirect('/admin/index');
    //res.render('admin/login', {title: 'Express'});
});

router.get('/dashboard', function (req, res, next) {
    res.render('admin/dashboard', {title: "dashboard"});
});

module.exports = router;
