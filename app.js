var app = angular.module('cakeApp', []);

app.controller('CakeController', function ($scope, $http) {
  // Dummy cakes & reviews
  $scope.cakes = [
    { name: 'Chocolate Truffle', description: 'Rich chocolate cake with creamy layers.', price: 750, image: 'https://via.placeholder.com/250?text=Chocolate+Truffle' },
    { name: 'Vanilla Delight', description: 'Classic vanilla sponge with whipped cream.', price: 650, image: 'https://via.placeholder.com/250?text=Vanilla+Delight' },
    { name: 'Red Velvet', description: 'Soft red cake with cream cheese frosting.', price: 850, image: 'https://via.placeholder.com/250?text=Red+Velvet' }
  ];

  $scope.reviews = [
    { name: 'Priya', message: 'Best homemade cakes in town! Highly recommended.' },
    { name: 'Rahul', message: 'Delicious and fresh, will order again!' }
  ];

  // UI and state
  $scope.order = {};
  $scope.contact = {};
  $scope.login = {};
  $scope.signup = {};
  $scope.authMode = 'login';
  $scope.authModalVisible = false;
  $scope.adminModalVisible = false;
  $scope.currentUser = localStorage.getItem('userEmail') || null;

  // Admin dashboard state
  $scope.allOrders = [];
  $scope.allMessages = [];

  // Toggle admin modal
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
      .then(function () {
        $scope.fetchAdminData(); // refresh
      }, function (error) {
        alert("Failed to update status.");
        console.error(error);
      });
  };

  $scope.deleteOrder = function (orderId) {
    if (confirm("Are you sure you want to delete this order?")) {
      $http.delete(`https://cake-shop-kd2j.onrender.com/api/admin/order/${orderId}`)
        .then(function () {
          $scope.fetchAdminData(); // refresh
        }, function (error) {
          alert("Failed to delete order.");
          console.error(error);
        });
    }
  };

  // Toggle modal and forms
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

  // Submit Order (with timestamp & user email)
  $scope.submitOrder = function () {
    if (!$scope.currentUser) {
      alert("Please log in to place an order.");
      return;
    }

    if ($scope.order.name && $scope.order.phone && $scope.order.address && $scope.order.selectedCake) {
      const orderData = {
        ...$scope.order,
        userEmail: $scope.currentUser,
        timestamp: new Date().toISOString(),
        status: 'Pending'
      };

      $http.post('https://cake-shop-kd2j.onrender.com/api/order', orderData)
        .then(function (response) {
          $scope.orderSuccess = response.data.message;
          console.log('Order submitted:', orderData);
          $scope.order = {};
        }, function (error) {
          console.error('Order submission failed:', error);
          alert('Failed to place order. Please try again later.');
        });
    } else {
      alert('Please fill all fields.');
    }
  };

  // Submit Contact
  $scope.sendMessage = function () {
    if ($scope.contact.name && $scope.contact.email && $scope.contact.message) {
      $http.post('https://cake-shop-kd2j.onrender.com/api/contact', $scope.contact)
        .then(function (response) {
          $scope.messageSuccess = response.data.message;
          console.log('Contact message submitted:', $scope.contact);
          $scope.contact = {};
        }, function (error) {
          console.error('Contact submission failed:', error);
          alert('Failed to send message. Please try again later.');
        });
    } else {
      alert('Please fill all fields.');
    }
  };

  // Login
  $scope.loginUser = function () {
    $http.post('https://cake-shop-kd2j.onrender.com/api/auth/login', $scope.login)
      .then(function (response) {
        $scope.loginMessage = "Login successful!";
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userEmail', response.data.email);
        $scope.currentUser = response.data.email;
        $scope.login = {};
        $scope.authModalVisible = false;
      }, function (error) {
        $scope.loginMessage = error.data.msg || "Login failed.";
      });
  };

  // Signup
  $scope.signupUser = function () {
    $http.post('https://cake-shop-kd2j.onrender.com/api/auth/signup', $scope.signup)
      .then(function (response) {
        $scope.signupMessage = "Signup successful! Please login to continue.";
        $scope.signup = {};
        $scope.authMode = 'login';
      }, function (error) {
        $scope.signupMessage = error.data.msg || "Signup failed.";
      });
  };
});
