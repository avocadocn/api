'use strict';

var token = require('../services/token.js');

module.exports = function (app, ctrl) {

  app.post('/photo_albums', token.needToken, ctrl.createPhotoAlbumValidate, ctrl.createPhotoAlbum);
  app.get('/photo_albums', token.needToken, ctrl.getPhotoAlbumsValidate, ctrl.getPhotoAlbums);
  app.get('/photo_albums/:photoAlbumId', token.needToken, ctrl.getPhotoAlbumById, ctrl.getPhotoAlbum);
  app.put('/photo_albums/:photoAlbumId', token.needToken, ctrl.getPhotoAlbumById, ctrl.editPhotoAlbumValidate, ctrl.editPhotoAlbum);
  app.delete('/photo_albums/:photoAlbumId', token.needToken, ctrl.getPhotoAlbumById, ctrl.deletePhotoAlbum);

  app.post('/photo_albums/:photoAlbumId/photos', token.needToken, ctrl.getPhotoAlbumById, ctrl.uploadPhoto);

};