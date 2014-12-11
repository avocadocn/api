'use strict';

(function ($) {

  var baseUrl = 'http://localhost:3002'
  var tokenInput = $('#token');

  (function () {
    var photoAlbumTestEle = $('#photoAlbumTest');
    var photoAlbumId = photoAlbumTestEle.find('.js_photoAlbumId');
    var submit = photoAlbumTestEle.find('.js_submit');

    submit.click(function () {
      var fd = new FormData($('#photoAlbumForm')[0]);
      $.ajax({
        url: baseUrl + '/photo_albums/' + photoAlbumId.val() + '/photos',
        type: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        headers: {
          'x-access-token': tokenInput.val()
        },
        success: function (data, status) {
          alert('success');
          console.log(data, status);
        },
        error: function (data, status) {
          console.log(data, status);
        }
      });

    });


  })();

  (function () {

    var userPhotoTestEle = $('#userPhotoTest');
    var userId = userPhotoTestEle.find('.js_userId');
    var submit = userPhotoTestEle.find('.js_submit');

    submit.click(function () {
      var fd = new FormData($('#userPhotoForm')[0]);
      $.ajax({
        url: baseUrl + '/users/' + userId.val(),
        type: 'PUT',
        data: fd,
        processData: false,
        contentType: false,
        headers: {
          'x-access-token': tokenInput.val()
        },
        success: function (data, status) {
          alert('success');
          console.log(data, status);
        },
        error: function (data, status) {
          console.log(data, status);
        }
      });
    });

  })();

  (function () {

    var companyLogoTestEle = $('#companyLogoTest');
    var companyId = companyLogoTestEle.find('.js_companyId');
    var submit = companyLogoTestEle.find('.js_submit');

    submit.click(function () {
      var fd = new FormData($('#companyLogoForm')[0]);
      $.ajax({
        url: baseUrl + '/companies/' + companyId.val(),
        type: 'PUT',
        data: fd,
        processData: false,
        contentType: false,
        headers: {
          'x-access-token': tokenInput.val()
        },
        success: function (data, status) {
          alert('success');
          console.log(data, status);
        },
        error: function (data, status) {
          console.log(data, status);
        }
      });
    });

  })();

  (function () {

    var teamLogoTestEle = $('#teamLogoTest');
    var teamId = teamLogoTestEle.find('.js_teamId');
    var submit = teamLogoTestEle.find('.js_submit');

    submit.click(function () {
      var fd = new FormData($('#teamLogoForm')[0]);
      $.ajax({
        url: baseUrl + '/teams/' + teamId.val(),
        type: 'PUT',
        data: fd,
        processData: false,
        contentType: false,
        headers: {
          'x-access-token': tokenInput.val()
        },
        success: function (data, status) {
          alert('success');
          console.log(data, status);
        },
        error: function (data, status) {
          console.log(data, status);
        }
      });
    });

  })();

  (function () {

    var commentPhotoTestEle = $('#commentPhotoTest');
    var hostId = $('#host_id');
    var hostType = $('#host_type');
    var submit = commentPhotoTestEle.find('.js_submit');

    submit.click(function () {
      var fd = new FormData($('#commentForm')[0]);
      $.ajax({
        url: baseUrl + '/comments/host_type/' + hostType.val() + '/host_id/' + hostId.val(),
        type: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        headers: {
          'x-access-token': tokenInput.val()
        },
        success: function (data, status) {
          alert('success');
          console.log(data, status);
        },
        error: function (data, status) {
          console.log(data, status);
        }
      });
    });

  })();


})(jQuery);