var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/dashboard', function (req, res, next) {
    res.render('admin/dashboard/dashboard', {title: "dashboard"});
});

router.get('/users', function (req, res, next) {
    res.render('admin/users/users', {title: "Users"});
});

module.exports = router;
