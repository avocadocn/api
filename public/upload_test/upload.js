'use strict';

(function ($) {

  var baseUrl = 'http://localhost:3002'
  var tokenInput = $('#token');

  (function () {
    var photoAlbumTestEle = $('#photoAlbumTest');
    var photo = photoAlbumTestEle.find('.js_photo');
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

})(jQuery);