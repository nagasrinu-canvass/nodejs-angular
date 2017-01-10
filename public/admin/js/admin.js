/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
(function () {

    window.viacom18 = angular.module("viacom18", ['cnvCore', 'viacom18.mockServices']);

    /**
     * App Utilities
     */
    viacom18.service('Util', function () {
        /**
         * Converts the given ary as a map object with key value
         * @param {type} array
         * @param {type} keysMap
         * @returns {undefined}
         */
        this.convertToMap = function (array, keysMap) {
            var map = {};
            for (var key in keysMap) {
                map[key] = array[keysMap[key]];
            }
            return map;
        };
    });
})();