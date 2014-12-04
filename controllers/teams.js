'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User'),
    Company = mongoose.model('Company'),
    CompanyGroup = mongoose.model('CompanyGroup');

var log = require('../services/error_log.js');

module.exports = function (app) {

  return {
   
    createTeams : function(req, res) {
        return res.send();
    },
    getTeam : function(req, res) {
        return;
    },
    editTeamData : function(req, res) {
        return;
    },
    deleteTeam : function(req, res) {
        return;
    },
    uploadFamilyPhotos : function(req, res) {
        return;
    },
    getFamilyPhotos : function(req, res) {
        return;
    },
    toggleSelectFamilyPhoto : function(req, res) {
        return;
    },
    deleteFamilyPhoto : function(req, res) {
        return;
    },
    joinTeam : function(req, res) {
        return;
    },
    quitTeam : function(req, res) {
        return;
    }
  }
}