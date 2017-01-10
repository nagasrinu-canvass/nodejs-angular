/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
(function () {
    var app = angular.module('viacom18.components', []);
    app.component('v18Categories', {
        bindings: {
            name: '<'
        },
        template: '<select class="form-control" name="$ctrl.name">'
                + '<option selected disabled>Choose Category</option>'
                + '<option>Movie</option>'
                + '<option>TV Show</option>'
                + '<option>Others</option>'
                + '</select>',
        controller: function () {
        }
    });
    app.component('v18BusinessUnits', {
        bindings: {
            name: '<'
        },
        template: '<select class="form-control" name="$ctrl.name">'
                + '<option selected disabled>Choose Business Unit</option>'
                + '<option>Colors</option>'
                + '<option>Viacom18</option>'
                + '<option>Star</option>'
                + '</select>',
        controller: function () {
        }
    });

    app.component('v18BusinessRoles', {
        bindings: {
            name: '<'
        },
        template: '<select class="form-control" name="$ctrl.name">'
                + '<option selected disabled>Choose Business Role</option>'
                + '<option>CRT</option>'
                + '<option>BU Reviewer</option>'
                + '<option>BU Lead</option>'
                + '<option>Admin</option>'
                + '</select>',
        controller: function () {
        }
    });
})();