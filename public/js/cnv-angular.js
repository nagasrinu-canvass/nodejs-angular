/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
(function () {
    var PAGE_SIZE = 50;

    var cnvCore = angular.module('cnvCore', []);
    cnvCore.directive('cnvPagination', function () {
        return {
            scope: {
                page: '=',
                pages: '=',
                onchange: '&'
            },
            controller: function ($scope, $timeout) {

                function triggerChange() {
                    $timeout(function () {
                        $scope.onchange();
                    });
                }

                $scope.next = function () {
                    if ($scope.page < $scope.pages) {
                        $scope.page++;
                        triggerChange();
                    }
                };
                $scope.previous = function () {
                    if ($scope.page > 1) {
                        $scope.page--;
                        triggerChange();
                    }
                };
                $scope.setPage = function (page, force) {
                    // disabling the loading same page again and again
                    if (!force && $scope.page !== page) {
                        $scope.page = page;
                        triggerChange();
                    }
                };
            },
            replace: true,
            template: '<div class="pagination-container pull-right" style="width: 220px;" ng-show="pages>1">'
                    + '<ul class="pagination pagination-sm no-margin pull-right">'
                    + '<li><a ng-click="setPage(1)" action="first" class="small-button" style="text-decoration: none; ">&lt;&lt;</a></li>'
                    + '<li><a ng-click="previous()" action="previous" class="small-button" style="text-decoration: none;">&lt;</a></li>'
                    + '<li><a><input type="text" ng-model="page" ng-change="setPage(page)" action="gotoPage" size="1" value="1" style="width: 25px;height: 15px;font-size: 11px; text-align:center;"> of <span>{{pages}}</span></a></li>'
                    + '<li><a ng-click="next()" action="next" class="small-button" style="text-decoration: none;">&gt;</a></li>'
                    + '<li><a ng-click="setPage(pages)" ng-click="change1()" action="last" class="small-button" style="text-decoration: none;">&gt;&gt;</a></li>'
                    + '</ul>'
                    + '</div>'
        };
    });
    cnvCore.factory('PaginationFactory', function () {
        /**
         *              
         * @param {Object} opts
         * @returns {hotel_L69.hotel_L122.Pagination}
         */
        function Pagination(opts) {
            this.opts = opts || {};
            this.page = 1;
            this.pages = 0;
            this.total = 0;
            this.limit = opts.limit || PAGE_SIZE;
        }
        Pagination.prototype = {
            change: function () {
                (this.opts.onChange || angular.noop)();
            }
        };
        function _create(opts) {
            return new Pagination(opts);
        }
        return {
            create: _create
        };
    });

})();