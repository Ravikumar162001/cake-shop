var app = angular.module('cakeApp', []);

// 👇 File directive for preview
app.directive('fileModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var model = $parse(attrs.fileModel);
      var modelSetter = model.assign;
      element.bind('change', function () {
        scope.$apply(function () {
          modelSetter(scope, element[0].files[0]);
        });
        scope.previewImage(element[0]);
      });
    }
  };
}]);

app.controller('CakeController', function ($scope, $http) {
  $scope.cakes = [];
  $scope.reviews = [
    { name: 'Priya', message: 'Best homemade cakes in town! Highly recommended.' },
    { name: 'Rahul', message: 'Delicious and fresh, will order again!' }
  ];

  $scope.order = {};
  $scope.contact = {};
  $scope.login = {};
  $scope.signup = {};
  $scope.newCake = {};
  $scope.authMode = 'login';
  $scope.authModalVisible = false;
  $scope.adminModalVisible = false;
  $scope.currentUser = localStorage.getItem('userEmail') || null;
  $scope.allOrders = [];
  $scope.allMessages = [];
  $scope.imagePreview = null;
  $scope.editingCakeId = null;

  // 🔍 Image preview
  $scope.previewImage = function (input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        $scope.$apply(function () {
          $scope.imagePreview = e.target.result;
        });
      };
      reader.readAsDataURL(input.files[0]);
    }
  };

  // 🔓 Admin panel
  $scope.openAdminDashboard = function () {
    $scope.adminModalVisible = true;
    $scope.fetchAdminData();
  };

  $scope.closeAdminDashboard = function () {
    $scope.adminModalVisible = false;
    $scope.resetCakeForm();
  };

  $scope.fetchAdminData = function () {
    $http.get('/api/admin/orders').then(res => $scope.allOrders = res.data);
    $http.get('/api/admin/messages').then(res => $scope.allMessages = res.data);
  };

  $scope.markAsDelivered = function (orderId) {
    $http.patch(`/api/admin/order/${orderId}/deliver`)
      .then(() => $scope.fetchAdminData());
  };

  $scope.deleteOrder = function (orderId) {
    if (confirm("Delete this order?")) {
      $http.delete(`/api/admin/order/${orderId}`)
        .then(() => $scope.fetchAdminData());
    }
  };

  $scope.logout = function () {
    localStorage.clear();
    $scope.currentUser = null;
    $scope.adminModalVisible = false;
    alert("Logged out.");
  };

  $scope.openAuthModal = function (mode) {
    $scope.authMode = mode;
    $scope.authModalVisible = true;
    $scope.loginMessage = '';
    $scope.signupMessage = '';
  };

  $scope.showAuthForm = function (mode) {
    $scope.authMode = mode;
  };

  // 🔐 Auth
  $scope.loginUser = function () {
    $http.post('/api/auth/login', $scope.login)
      .then(res => {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userEmail', res.data.email);
        $scope.currentUser = res.data.email;
        $scope.authModalVisible = false;
        $scope.login = {};
      }, err => {
        $scope.loginMessage = err.data.msg || "Login failed.";
      });
  };

  $scope.signupUser = function () {
    $http.post('/api/auth/signup', $scope.signup)
      .then(res => {
        $scope.signupMessage = "Signup successful! Please login.";
        $scope.authMode = 'login';
        $scope.signup = {};
      }, err => {
        $scope.signupMessage = err.data.msg || "Signup failed.";
      });
  };

  // 🧾 Order
  $scope.submitOrder = function () {
    if (!$scope.currentUser) return alert("Login first.");

    const orderData = {
      ...$scope.order,
      userEmail: $scope.currentUser,
      timestamp: new Date().toISOString(),
      status: 'Pending'
    };

    $http.post('/api/order', orderData)
      .then(res => {
        $scope.orderSuccess = res.data.message;
        $scope.order = {};
      });
  };

  // ✉️ Contact
  $scope.sendMessage = function () {
    $http.post('/api/contact', $scope.contact)
      .then(res => {
        $scope.messageSuccess = res.data.message;
        $scope.contact = {};
      });
  };

  // 🆕 Upload OR Edit Cake
  $scope.uploadCake = function () {
    const formData = new FormData();
    formData.append('name', $scope.newCake.name);
    formData.append('description', $scope.newCake.description);
    formData.append('price', $scope.newCake.price);
    if ($scope.newCake.image) {
      formData.append('image', $scope.newCake.image);
    }

    // Editing
    if ($scope.editingCakeId) {
      $http.put(`/api/upload/cake/${$scope.editingCakeId}`, formData, {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      }).then(res => {
        $scope.uploadMessage = "Cake updated!";
        $scope.resetCakeForm();
        $scope.fetchCakes();
      }, () => alert("Update failed"));
    } else {
      // New Cake
      $http.post('/api/upload/cake', formData, {
        transformRequest: angular.identity,
        headers: { 'Content-Type': undefined }
      }).then(res => {
        $scope.uploadMessage = "Cake added!";
        $scope.resetCakeForm();
        $scope.fetchCakes();
      }, () => alert("Upload failed"));
    }
  };

  // ✏️ Load cake into form for editing
  $scope.editCake = function (cake) {
    $scope.newCake = {
      name: cake.name,
      description: cake.description,
      price: cake.price
    };
    $scope.imagePreview = cake.image;
    $scope.editingCakeId = cake._id;
    $scope.uploadMessage = '';
  };

  // 🗑️ Delete cake
  $scope.deleteCake = function (id) {
    if (confirm("Delete this cake?")) {
      $http.delete(`/api/upload/cake/${id}`)
        .then(() => $scope.fetchCakes());
    }
  };

  // 🎯 Reset form
  $scope.resetCakeForm = function () {
    $scope.newCake = {};
    $scope.editingCakeId = null;
    $scope.imagePreview = null;
    $scope.uploadMessage = '';
  };

  // 🚀 Load cakes
  $scope.fetchCakes = function () {
    $http.get('/api/cakes')
      .then(res => {
        $scope.cakes = res.data;
      });
  };

  // ⏯️ Init
  $scope.fetchCakes();
});
