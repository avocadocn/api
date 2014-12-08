'use strict';

var token = require('../services/token.js');

module.exports = function (app, ctrl) {

  app.post('/photo_albums', token.needToken, ctrl.createPhotoAlbumValidate, ctrl.createPhotoAlbum);
  app.get('/photo_albums', token.needToken, ctrl.getPhotoAlbumsValidate, ctrl.getPhotoAlbums);
  app.get('/photo_albums/:photoAlbumId', token.needToken, ctrl.getByPhotoAlbumId, ctrl.getPhotoAlbum);
  app.put('/photo_albums/:photoAlbumId', token.needToken, ctrl.getByPhotoAlbumId, ctrl.editPhotoAlbumValidate, ctrl.editPhotoAlbum);
};