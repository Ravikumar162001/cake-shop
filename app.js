var app = angular.module('cakeApp', []);

// File model directive for binding file input to scope
app.directive('fileModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var model = $parse(attrs.fileModel);
      var modelSetter = model.assign;
      element.bind('change', function(){
        scope.$apply(function(){
          modelSetter(scope, element[0].files[0]);
        });
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

  $scope.openAdminDashboard = function () {
    $scope.adminModalVisible = true;
    $scope.fetchAdminData();
  };

  $scope.closeAdminDashboard = function () {
    $scope.adminModalVisible = false;
  };

  $scope.fetchAdminData = function () {
    $http.get('https://cake-shop-kd2j.onrender.com/api/admin/orders')
      .then(res => $scope.allOrders = res.data);
    $http.get('https://cake-shop-kd2j.onrender.com/api/admin/messages')
      .then(res => $scope.allMessages = res.data);
  };

  $scope.markAsDelivered = function (orderId) {
    $http.patch(`https://cake-shop-kd2j.onrender.com/api/admin/order/${orderId}/deliver`)
      .then(() => $scope.fetchAdminData(), error => alert("Failed to update status."));
  };

  $scope.deleteOrder = function (orderId) {
    if (confirm("Are you sure you want to delete this order?")) {
      $http.delete(`https://cake-shop-kd2j.onrender.com/api/admin/order/${orderId}`)
        .then(() => $scope.fetchAdminData(), error => alert("Failed to delete order."));
    }
  };

  $scope.openAuthModal = function (mode) {
    $scope.authMode = mode;
    $scope.authModalVisible = true;
    $scope.loginMessage = '';
    $scope.signupMessage = '';
  };

  $scope.showAuthForm = function (mode) {
    $scope.authMode = mode;
    $scope.loginMessage = '';
    $scope.signupMessage = '';
  };

  $scope.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    $scope.currentUser = null;
    $scope.adminModalVisible = false;
    alert("You have been logged out.");
  };

  $scope.submitOrder = function () {
    if (!$scope.currentUser) return alert("Please log in to place an order.");

    if ($scope.order.name && $scope.order.phone && $scope.order.address && $scope.order.selectedCake) {
      const orderData = {
        ...$scope.order,
        userEmail: $scope.currentUser,
        timestamp: new Date().toISOString(),
        status: 'Pending'
      };

      $http.post('https://cake-shop-kd2j.onrender.com/api/order', orderData)
        .then(res => {
          $scope.orderSuccess = res.data.message;
          $scope.order = {};
        }, err => alert('Failed to place order.'));
    } else {
      alert('Please fill all fields.');
    }
  };

  $scope.sendMessage = function () {
    if ($scope.contact.name && $scope.contact.email && $scope.contact.message) {
      $http.post('https://cake-shop-kd2j.onrender.com/api/contact', $scope.contact)
        .then(res => {
          $scope.messageSuccess = res.data.message;
          $scope.contact = {};
        }, err => alert('Failed to send message.'));
    } else {
      alert('Please fill all fields.');
    }
  };

  $scope.loginUser = function () {
    $http.post('https://cake-shop-kd2j.onrender.com/api/auth/login', $scope.login)
      .then(res => {
        $scope.loginMessage = "Login successful!";
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userEmail', res.data.email);
        $scope.currentUser = res.data.email;
        $scope.login = {};
        $scope.authModalVisible = false;
      }, err => {
        $scope.loginMessage = err.data.msg || "Login failed.";
      });
  };

  $scope.signupUser = function () {
    $http.post('https://cake-shop-kd2j.onrender.com/api/auth/signup', $scope.signup)
      .then(res => {
        $scope.signupMessage = "Signup successful! Please login to continue.";
        $scope.signup = {};
        $scope.authMode = 'login';
      }, err => {
        $scope.signupMessage = err.data.msg || "Signup failed.";
      });
  };

  $scope.uploadCake = function () {
    const formData = new FormData();
    formData.append('name', $scope.newCake.name);
    formData.append('description', $scope.newCake.description);
    formData.append('price', $scope.newCake.price);
    formData.append('image', $scope.newCake.image);

    $http.post('https://cake-shop-kd2j.onrender.com/api/upload/cake', formData, {
      transformRequest: angular.identity,
      headers: { 'Content-Type': undefined }
    }).then(function (response) {
      $scope.uploadMessage = response.data.message;
      $scope.newCake = {};
      $scope.fetchCakes();
    }, function (error) {
      alert("Upload failed");
    });
  };

  $scope.fetchCakes = function () {
    $http.get('https://cake-shop-kd2j.onrender.com/api/cakes')
      .then(function (res) {
        $scope.cakes = res.data;
      }, function () {
        console.warn("Could not load cakes from DB. Using dummy.");
      });
  };

  // Load cakes from DB on startup
  $scope.fetchCakes();
});
