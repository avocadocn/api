'use strict';

var token = require('../services/token.js');

module.exports = function (app, ctrl) {

  app.post('/photo_albums', token.needToken, ctrl.createPhotoAlbumValidate, ctrl.createPhotoAlbum);
  app.get('/photo_albums', token.needToken, ctrl.getPhotoAlbumsValidate, ctrl.getPhotoAlbums);
};