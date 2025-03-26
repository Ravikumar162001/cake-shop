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

  $scope.orderCake = function(cake) {
    alert('You have ordered: ' + cake.name);
  };

  $scope.submitOrder = function() {
    if ($scope.order.name && $scope.order.phone && $scope.order.address && $scope.order.selectedCake) {
      // For real backend
      // $http.post('/api/order', $scope.order).then(...)

      $scope.orderSuccess = "Thank you, " + $scope.order.name + "! Your order for " + $scope.order.selectedCake + " has been received.";
      $scope.order = {};
    } else {
      alert('Please fill all fields.');
    }
  };

  $scope.sendMessage = function() {
    if ($scope.contact.name && $scope.contact.email && $scope.contact.message) {
      // $http.post('/api/contact', $scope.contact).then(...)
      $scope.messageSuccess = "Thank you for reaching out, " + $scope.contact.name + "! We will get back to you soon.";
      $scope.contact = {};
    } else {
      alert('Please fill all fields.');
    }
  };
});


