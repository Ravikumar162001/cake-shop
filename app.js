var app = angular.module('cakeApp', []);

app.controller('CakeController', function($scope, $http) {
  $scope.cakes = [
    { name: 'Chocolate Truffle', description: 'Rich chocolate cake with creamy layers.', price: 750, image: 'https://via.placeholder.com/250?text=Chocolate+Truffle' },
    { name: 'Vanilla Delight', description: 'Classic vanilla sponge with whipped cream.', price: 650, image: 'https://via.placeholder.com/250?text=Vanilla+Delight' },
    { name: 'Red Velvet', description: 'Soft red cake with cream cheese frosting.', price: 850, image: 'https://via.placeholder.com/250?text=Red+Velvet' }
  ];

  $scope.reviews = [
    { name: 'Priya', message: 'Best homemade cakes in town! Highly recommended.' },
    { name: 'Rahul', message: 'Delicious and fresh, will order again!' }
  ];

  $scope.order = {};
  $scope.contact = {};
  $scope.login = {};

  $scope.orderCake = function(cake) {
    alert('You have ordered: ' + cake.name);
  };

  $scope.submitOrder = function() {
    if ($scope.order.name && $scope.order.phone && $scope.order.address && $scope.order.selectedCake) {
      $http.post('https://cake-shop-kd2j.onrender.com/api/order', $scope.order)
      .then(function(response) {
        $scope.orderSuccess = response.data.message;
        console.log('Order submitted:', $scope.order);
        $scope.order = {};
      }, function(error) {
        console.error('Order submission failed:', error);
        alert('Failed to place order. Please try again later.');
      });
    } else {
      alert('Please fill all fields.');
    }
  };

  $scope.sendMessage = function() {
    if ($scope.contact.name && $scope.contact.email && $scope.contact.message) {
      $http.post('https://cake-shop-kd2j.onrender.com/api/contact', $scope.contact)
      .then(function(response) {
        $scope.messageSuccess = response.data.message;
        console.log('Contact message submitted:', $scope.contact);
        $scope.contact = {};
      }, function(error) {
        console.error('Contact submission failed:', error);
        alert('Failed to send message. Please try again later.');
      });
    } else {
      alert('Please fill all fields.');
    }
  };

  $scope.loginUser = function () {
    $http.post('https://cake-shop-kd2j.onrender.com/api/auth/login', $scope.login)
      .then(function (response) {
        $scope.loginMessage = "Login successful!";
        localStorage.setItem('token', response.data.token);
        console.log('User logged in:', response.data.email);
      }, function (error) {
        $scope.loginMessage = error.data.msg || "Login failed.";
      });
  };
});

