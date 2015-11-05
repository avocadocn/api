'use strict';

(function ($) {

  var baseUrl = 'http://localhost:3002/v2_0'
  var tokenInput = $('#x-access-token');
  var appIdInput = $('#x-app-id');
  var apiKeyInput = $('#x-api-key');
  var deviceIdInput = $('#x-device-id');
  var deviceTypeInput = $('#x-device-type');
  var platformInput = $('#x-platform');
  var versionInput = $('#x-version');

  var getCommonHeaders = function () {
    return {
      'x-access-token': tokenInput.val(),
      'x-app-id': appIdInput.val(),
      'x-api-key': apiKeyInput.val(),
      'x-device-id': deviceIdInput.val(),
      'x-device-type': deviceTypeInput.val(),
      'x-platform': platformInput.val(),
      'x-version': versionInput.val()
    };
  };

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
        headers: getCommonHeaders(),
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
        headers: getCommonHeaders(),
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
        headers: getCommonHeaders(),
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
        headers: getCommonHeaders(),
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
        headers: getCommonHeaders(),
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

    var circleContentPhotoTestEle = $('#circleContentPhotoTest');
    var submit = circleContentPhotoTestEle.find('.js_submit');

    submit.click(function () {
      var fd = new FormData($('#circleContentForm')[0]);
      $.ajax({
        url: baseUrl + '/v2_0/circle/contents',
        type: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        headers: getCommonHeaders(),
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

    var circleContentPhotoTestEle = $('#circleContentPhotoTestWithPhoto');
    var submit = circleContentPhotoTestEle.find('.js_submit');

    submit.click(function () {
      var fd = new FormData($('#circleContentFormWithPhoto')[0]);
      $.ajax({
        url: baseUrl + '/v2_0/circle/contents',
        type: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        headers: getCommonHeaders(),
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

    var CompanyCoverPhotoTestEle = $('#CompanyCoverPhotoTest');
    var submit = CompanyCoverPhotoTestEle.find('.js_submit');
    var companyId = CompanyCoverPhotoTestEle.find('.js_companyId');
    submit.click(function () {
      var fd = new FormData($('#CompanyCoverPhotoForm')[0]);
      $.ajax({
        url: baseUrl + '/companies/' + companyId.val() + '/companyCover',
        type: 'PUT',
        data: fd,
        processData: false,
        contentType: false,
        headers: getCommonHeaders(),
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
    var GroupCreateWithPhotoTestEle = $('#GroupCreateWithPhotoTest');
    var submit = GroupCreateWithPhotoTestEle.find('.js_submit');
    submit.click(function () {
      var fd = new FormData($('#GroupCreateWithPhotoForm')[0]);
      $.ajax({
        url: baseUrl + '/v2_0/groups',
        type: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        headers: getCommonHeaders(),
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
    var GroupUpdateWithPhotoTestEle = $('#GroupUpdateWithPhotoTest');
    var submit = GroupUpdateWithPhotoTestEle.find('.js_submit');
    var groupId = GroupUpdateWithPhotoTestEle.find('.js_groupId');
    submit.click(function () {
      var fd = new FormData($('#GroupUpdateWithPhotoForm')[0]);
      $.ajax({
        url: baseUrl + '/v2_0/groups/' + groupId.val(),
        type: 'PUT',
        data: fd,
        processData: false,
        contentType: false,
        headers: getCommonHeaders(),
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
    var UserRegisterWithCompanyTestEle = $('#UserRegisterWithCompanyTest');
    var submit = UserRegisterWithCompanyTestEle.find('.js_submit');
    submit.click(function () {
      var fd = new FormData($('#UserRegisterWithCompanyForm')[0]);
      $.ajax({
        url: baseUrl + '/v2_0/users',
        type: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        headers: getCommonHeaders(),
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
    var UserRegisterWithoutCompanyTestEle = $('#UserRegisterWithoutCompanyTest');
    var submit = UserRegisterWithoutCompanyTestEle.find('.js_submit');
    submit.click(function () {
      var fd = new FormData($('#UserRegisterWithoutCompanyForm')[0]);
      $.ajax({
        url: baseUrl + '/v2_0/companies/quickRegister',
        type: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        headers: getCommonHeaders(),
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