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
  $scope.currentUser = localStorage.getItem('userEmail') || null;

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
    alert("You have been logged out.");
  };

  // Order Cake button (just UI alert)
  $scope.orderCake = function (cake) {
    alert('You have ordered: ' + cake.name);
  };

  // Submit Order
  $scope.submitOrder = function () {
    if (!$scope.currentUser) {
      alert("Please log in to place an order.");
      return;
    }

    if ($scope.order.name && $scope.order.phone && $scope.order.address && $scope.order.selectedCake) {
      $http.post('https://cake-shop-kd2j.onrender.com/api/order', $scope.order)
        .then(function (response) {
          $scope.orderSuccess = response.data.message;
          console.log('Order submitted:', $scope.order);
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
        $scope.signupMessage = "Signup successful!";
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userEmail', response.data.email);
        $scope.currentUser = response.data.email;
        $scope.signup = {};
        $scope.authModalVisible = false;
      }, function (error) {
        $scope.signupMessage = error.data.msg || "Signup failed.";
      });
  };
});

