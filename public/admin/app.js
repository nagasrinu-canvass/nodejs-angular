/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
(function () {
    var app = angular.module('viacom18Admin', ['ngRoute', 'viacom18', 'viacom18.components']);
    var TMPL_BASE_PATH = "/res/admin/pages";
    app.config(function ($routeProvider) {
        $routeProvider
                .when('/dashboard', {
                    templateUrl: TMPL_BASE_PATH + '/dashboard.html',
                    controller: 'dashboardController'
                })
                .when('/submitters', {
                    templateUrl: TMPL_BASE_PATH + '/submitters/list.html',
                    controller: 'submiterRootController'
                })
                .when('/submitters/profile', {
                    templateUrl: TMPL_BASE_PATH + '/submitters/profile.html',
                    controller: 'submiterRootController'
                })
                .when('/ideas', {
                    templateUrl: TMPL_BASE_PATH + '/ideas/list.html',
                    controller: 'ideasRootController'
                })
                .when('/ideas/idea', {
                    templateUrl: TMPL_BASE_PATH + '/ideas/idea.html',
                    controller: 'ideasRootController'
                })
                .when('/users', {
                    templateUrl: TMPL_BASE_PATH + '/users/list.html',
                    controller: 'userRootController'
                })
                .when('/reports', {
                    templateUrl: TMPL_BASE_PATH + '/reports/index.html',
                    controller: 'userRootController'
                })
                .when('/notifications', {
                    templateUrl: TMPL_BASE_PATH + '/notifications/index.html',
                    controller: 'userRootController'
                });
    });

    // create the controller and inject Angular's $scope
    app.controller('mainController', function ($rootScope, $scope, $route, $location) {
        // create a message to display in our view        
        $scope.message = 'Everyone come and see how good I look!';
    });

    app.controller("dashboardController", function ($scope) {
        $scope.stats = {
            totalSubmissions: 2081,
            submissionsReviewing: 756,
            submissionsApproved: 25,
            submissionsRejected: 1300
        };
    });

    app.controller("sidebarController", function ($rootScope, $element, $location) {
        $rootScope.$on("$routeChangeSuccess", function (event, current, previous, rejection) {
            var path = '#' + $location.$$path.slice(1);
            $element.find('.active').removeClass('active');
            var $ele = $element.find('[href="' + path + '"]');
            $ele.parents('li').addClass('active');
        });
    });

})();