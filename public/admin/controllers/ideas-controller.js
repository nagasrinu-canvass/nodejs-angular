/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
(function (app) {
    app.controller("ideasListController", function ($scope, IdeaService, PaginationFactory) {
        $scope.searchBy = "";
        $scope.listTitle = "Ideas List";
        $scope.list;
        $scope.pageSize = 10;
        $scope.pageNumber = 1;
        $scope.totalPages = 0;
        $scope.paginator = PaginationFactory.create({
            onChange: function () {
                _search();
            }
        });

        $scope.filterList = function () {
            return $scope.list;
        };

        $scope.firstPage = function () {
            $scope.pageNumber = 1;
            _search();
        };
        $scope.lastPage = function () {
            $scope.pageNumber = $scope.totalPages;
            _search();
        };

        $scope.nextPage = function () {
            if ($scope.pageNumber < $scope.totalPages) {
                $scope.pageNumber++;
                _search();
            }
        };
        $scope.previousPage = function () {
            if ($scope.pageNumber > 1) {
                $scope.pageNumber--;
                _search();
            }
        };

        $scope.search = function () {
            $scope.pageNumber = 1;
            _search();
        };

        function _search() {
            //$scope.loading = true;
            IdeaService.findAll($scope.searchBy,
                    $scope.paginator.page - 1, $scope.paginator.limit).then(function (data) {
                $scope.loading = false;
                //$scope.totalPages = data.totalPages;
                $scope.paginator.total = data.totalPages;
                $scope.list = data.content;
            });
        }
        // initially calling the search
        _search();
    });



    app.controller("ideasUserController", function ($scope) {
        $scope.user = {};
        $scope.saveUser = function () {
            console.log($scope.user);
        };
    });


    app.controller("ideasRootController", function ($scope) {
        $scope.currentView = "list";
        $scope.roles = [
            {id: 'CRT', label: 'Central Reviewer'},
            {id: 'BUR', label: 'BU Reviewer'},
            {id: 'BUCL', label: 'BU Content Lead'},
            {id: 'ADMIN', label: 'Administrator'}
        ];
        $scope.setView = function (viewName) {
            $scope.currentView = viewName;
        };
        $scope.showPostDetails = function (post) {
            $scope.currentView = "details";
        };
    });
})(angular.module('viacom18Admin'));