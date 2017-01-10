/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var mongoose = require('mongoose');
var config = require('./config.json')[process.env.NODE_ENV || 'local'];

function registerDbModels() {
    // Registering all the DB Models
    require('./model/db/users');
}

module.exports = {
    start: function () {
        // Now Settingup the DB
        mongoose.connect(config.mongodb.url);
        // CONNECTION EVENTS
        // When successfully connected
        mongoose.connection.on('connected', function () {
            // registering the DB Models
            registerDbModels();
            console.log('Mongoose default connection open to ' + config.mongodb.url);
        });

        // If the connection throws an error
        mongoose.connection.on('error', function (err) {
            console.log('Mongoose default connection error: ' + err);
        });

        // When the connection is disconnected
        mongoose.connection.on('disconnected', function () {
            console.log('Mongoose default connection disconnected');
        });
    }
};