var app = angular.module('cakeApp', []);

// File model directive for binding file input to scope
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
        // 👇 Trigger image preview
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

  // Auth & State
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

  // Preview uploaded image
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

  // Admin Panel
  $scope.openAdminDashboard = function () {
    $scope.adminModalVisible = true;
    $scope.fetchAdminData();
  };

  $scope.closeAdminDashboard = function () {
    $scope.adminModalVisible = false;
  };

  $scope.fetchAdminData = function () {
    $http.get('/api/admin/orders').then(res => $scope.allOrders = res.data);
    $http.get('/api/admin/messages').then(res => $scope.allMessages = res.data);
  };

  $scope.markAsDelivered = function (orderId) {
    $http.patch(`/api/admin/order/${orderId}/deliver`)
      .then(() => $scope.fetchAdminData(), () => alert("Failed to update status."));
  };

  $scope.deleteOrder = function (orderId) {
    if (confirm("Are you sure you want to delete this order?")) {
      $http.delete(`/api/admin/order/${orderId}`)
        .then(() => $scope.fetchAdminData(), () => alert("Failed to delete order."));
    }
  };

  // Auth Modal
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

  // Order Submit
  $scope.submitOrder = function () {
    if (!$scope.currentUser) return alert("Please log in to place an order.");

    if ($scope.order.name && $scope.order.phone && $scope.order.address && $scope.order.selectedCake) {
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
        }, () => alert('Failed to place order.'));
    } else {
      alert('Please fill all fields.');
    }
  };

  // Contact Form
  $scope.sendMessage = function () {
    if ($scope.contact.name && $scope.contact.email && $scope.contact.message) {
      $http.post('/api/contact', $scope.contact)
        .then(res => {
          $scope.messageSuccess = res.data.message;
          $scope.contact = {};
        }, () => alert('Failed to send message.'));
    } else {
      alert('Please fill all fields.');
    }
  };

  // Auth: Login / Signup
  $scope.loginUser = function () {
    $http.post('/api/auth/login', $scope.login)
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
    $http.post('/api/auth/signup', $scope.signup)
      .then(res => {
        $scope.signupMessage = "Signup successful! Please login to continue.";
        $scope.signup = {};
        $scope.authMode = 'login';
      }, err => {
        $scope.signupMessage = err.data.msg || "Signup failed.";
      });
  };

  // Upload New Cake
  $scope.uploadCake = function () {
    const formData = new FormData();
    formData.append('name', $scope.newCake.name);
    formData.append('description', $scope.newCake.description);
    formData.append('price', $scope.newCake.price);
    formData.append('image', $scope.newCake.image);

    $http.post('/api/upload/cake', formData, {
      transformRequest: angular.identity,
      headers: { 'Content-Type': undefined }
    }).then(res => {
      $scope.uploadMessage = res.data.message;
      $scope.newCake = {};
      $scope.imagePreview = null; // reset image preview
      $scope.fetchCakes();
    }, () => {
      alert("Upload failed");
    });
  };

  // Fetch Cakes from MongoDB
  $scope.fetchCakes = function () {
    $http.get('/api/cakes')
      .then(res => {
        $scope.cakes = res.data;
      }, () => {
        console.warn("Could not load cakes from DB.");
      });
  };

  // Init
  $scope.fetchCakes();
});
