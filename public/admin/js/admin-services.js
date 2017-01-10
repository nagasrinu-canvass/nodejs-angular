/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

(function () {
    var mockServices = angular.module("viacom18.mockServices", []);
    mockServices.service('UserService', function ($http, $q) {
        this.search = function (searchBy, pageIndex, pageSize, cb) {
            var deferred = $q.defer();
            deferred.resolve({
                totalPages: 10, content: [{
                        "id": 1,
                        "role": "CRT",
                        "name": "Kevin Garcia",
                        "email": "kgarcia0@google.com",
                        "bu": "Viacom18",
                        "gender": "Male"
                    }, {
                        "id": 2,
                        "role": "BUCL",
                        "name": "Janice Hernandez",
                        "email": "jhernandez1@hud.gov",
                        "bu": "Star",
                        "gender": "Female"
                    }, {
                        "id": 3,
                        "role": "BUCL",
                        "name": "Elizabeth Oliver",
                        "email": "eoliver2@scientificamerican.com",
                        "bu": "Colors",
                        "gender": "Female"
                    }, {
                        "id": 4,
                        "role": "CRT",
                        "name": "Bobby Hill",
                        "email": "bhill3@de.vu",
                        "bu": "Viacom18",
                        "gender": "Male"
                    }, {
                        "id": 5,
                        "role": "BUR",
                        "name": "Sarah Gibson",
                        "email": "sgibson4@miibeian.gov.cn",
                        "bu": "Colors",
                        "gender": "Female"
                    }, {
                        "id": 6,
                        "role": "CRT",
                        "name": "Mildred Grant",
                        "email": "mgrant5@joomla.org",
                        "bu": "Viacom18",
                        "gender": "Female"
                    }, {
                        "id": 7,
                        "role": "BUR",
                        "name": "Margaret Perry",
                        "email": "mperry6@youtube.com",
                        "bu": "Colors",
                        "gender": "Female"
                    }, {
                        "id": 8,
                        "role": "CRT",
                        "name": "Theresa Sanders",
                        "email": "tsanders7@hp.com",
                        "bu": "Viacom18",
                        "gender": "Female"
                    }, {
                        "id": 9,
                        "role": "ADMIN",
                        "name": "Steve Hernandez",
                        "email": "shernandez8@ameblo.jp",
                        "bu": "Star",
                        "gender": "Male"
                    }, {
                        "id": 10,
                        "role": "BUR",
                        "name": "Jeremy Ramos",
                        "email": "jramos9@bloglines.com",
                        "bu": "Star",
                        "gender": "Male"
                    }]
            });
            return deferred.promise;
        };
    });

    mockServices.service('IdeaService', function ($http, $q) {

        this.findAll = function (pageIndex, pageSize) {
            var deferred = $q.defer();
            var time = new Date().getTime();
            deferred.resolve({
                totalPages: 2, content: [{
                        "id": 1,
                        "name": "Howard Garza",
                        "category": "Movie",
                        "submittedOn": "1480615442",
                        "submitterName": "Kevin Garcia",
                        "status": "Male"
                    }, {
                        "id": 2,
                        "name": "Benjamin Hanson",
                        "category": "TV Show",
                        "submittedOn": "1464634671",
                        "submitterName": "Janice Hernandez",
                        "status": "Male"
                    }, {
                        "id": 3,
                        "name": "Sara Sullivan",
                        "category": "Movie",
                        "submittedOn": "1474357796",
                        "submitterName": "Elizabeth Oliver",
                        "status": "Female"
                    }, {
                        "id": 4,
                        "name": "Steve Martin",
                        "category": "Others",
                        "submittedOn": "1465189242",
                        "submitterName": "Bobby Hill",
                        "status": "Male"
                    }, {
                        "id": 5,
                        "name": "Rose Barnes",
                        "category": "Others",
                        "submittedOn": "1469435986",
                        "submitterName": "Sarah Gibson",
                        "status": "Female"
                    }, {
                        "id": 6,
                        "name": "Christopher Bennett",
                        "category": "Movie",
                        "submittedOn": "1479052196",
                        "submitterName": "Mildred Grant",
                        "status": "Male"
                    }, {
                        "id": 7,
                        "name": "Larry West",
                        "category": "TV Show",
                        "submittedOn": "1458461389",
                        "submitterName": "Margaret Perry",
                        "status": "Male"
                    }, {
                        "id": 8,
                        "name": "Tina Ford",
                        "category": "TV Show",
                        "submittedOn": "1470540034",
                        "submitterName": "Theresa Sanders",
                        "status": "Female"
                    }, {
                        "id": 9,
                        "name": "Ann Rogers",
                        "category": "Others",
                        "submittedOn": "1474808382",
                        "submitterName": "Steve Hernandez",
                        "status": "Female"
                    }, {
                        "id": 10,
                        "name": "Kathleen Ramos",
                        "category": "Movie",
                        "submittedOn": "1456524139",
                        "submitterName": "Jeremy Ramos",
                        "status": "Female"
                    }]
            });
            return deferred.promise;
        };
    });




    var services = angular.module("viacom18.services", ['cnvCore']);
})();