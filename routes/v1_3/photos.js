'use strict';

var token = require('../../services/token.js');

module.exports = function (app, ctrl) {

  app.post('/photo_albums', token.needToken, ctrl.v1_3.createPhotoAlbumValidate, ctrl.v1_3.createPhotoAlbum);
  app.get('/photo_albums', token.needToken, ctrl.v1_3.getPhotoAlbumsValidate, ctrl.v1_3.getPhotoAlbums);
  app.get('/photo_albums/:photoAlbumId', token.needToken, ctrl.v1_3.getPhotoAlbumById, ctrl.v1_3.getPhotoAlbum);
  app.put('/photo_albums/:photoAlbumId', token.needToken, ctrl.v1_3.getPhotoAlbumById, ctrl.v1_3.editPhotoAlbumValidate, ctrl.v1_3.editPhotoAlbum);
  app.delete('/photo_albums/:photoAlbumId', token.needToken, ctrl.v1_3.getPhotoAlbumById, ctrl.v1_3.deletePhotoAlbum);

  app.post('/photo_albums/:photoAlbumId/photos', token.needToken, ctrl.v1_3.getPhotoAlbumById, ctrl.v1_3.uploadPhoto);
  app.get('/photo_albums/:photoAlbumId/photos', token.needToken, ctrl.v1_3.getPhotoAlbumById, ctrl.v1_3.getPhotos);
  app.get('/photo_albums/:photoAlbumId/photos/:photoId', token.needToken, ctrl.v1_3.getPhoto);
  app.put('/photo_albums/:photoAlbumId/photos/:photoId', token.needToken, ctrl.v1_3.editPhotoValidate, ctrl.v1_3.editPhoto);
  app.delete('/photo_albums/:photoAlbumId/photos/:photoId', token.needToken, ctrl.v1_3.getPhotoAlbumById, ctrl.v1_3.deletePhoto);

};