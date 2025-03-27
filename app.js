var app = angular.module('cakeApp', []);

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
  $scope.cart = [];
  $scope.cartMap = {};
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
  $scope.checkoutVisible = false;
  $scope.cartVisible = false;
  $scope.currentUser = localStorage.getItem('userEmail') || null;
  $scope.allOrders = [];
  $scope.allMessages = [];
  $scope.imagePreview = null;
  $scope.editingCakeId = null;

  // 📌 Utility to update cart map for quick quantity lookup
  $scope.updateCartMap = function () {
    $scope.cartMap = {};
    $scope.cart.forEach(item => {
      $scope.cartMap[item._id] = item.qty;
    });
  };

  $scope.previewImage = function (input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        $scope.$apply(() => {
          $scope.imagePreview = e.target.result;
        });
      };
      reader.readAsDataURL(input.files[0]);
    }
  };

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

  $scope.addToCart = function (cake) {
    const existing = $scope.cart.find(c => c._id === cake._id);
    if (existing) {
      existing.qty += 1;
    } else {
      $scope.cart.push({ ...cake, qty: 1 });
    }
    $scope.updateCartMap();
  };

  $scope.removeFromCart = function (cake) {
    $scope.cart = $scope.cart.filter(c => c._id !== cake._id);
    $scope.updateCartMap();
  };

  $scope.increaseQty = function (cake) {
    cake.qty += 1;
    $scope.updateCartMap();
  };

  $scope.decreaseQty = function (cake) {
    if (cake.qty > 1) {
      cake.qty -= 1;
    } else {
      $scope.removeFromCart(cake);
    }
    $scope.updateCartMap();
  };

  $scope.getCartTotal = function () {
    return $scope.cart.reduce((total, c) => total + (c.price * c.qty), 0);
  };

  $scope.proceedToCheckout = function () {
    if (!$scope.currentUser) return alert("Please login to continue.");
    if ($scope.cart.length === 0) return alert("Your cart is empty.");
    $scope.checkoutVisible = true;
  };

  $scope.submitOrder = function () {
    const orderData = {
      name: $scope.order.name,
      phone: $scope.order.phone,
      address: $scope.order.address,
      userEmail: $scope.currentUser,
      items: $scope.cart,
      totalAmount: $scope.getCartTotal(),
      status: 'Pending',
      timestamp: new Date().toISOString()
    };

    $http.post('/api/order', orderData)
      .then(res => {
        $scope.cart = [];
        $scope.updateCartMap();
        $scope.checkoutVisible = false;
        $scope.order = {};
        $scope.orderSuccess = "Order placed successfully!";
        setTimeout(() => $scope.$apply(() => $scope.orderSuccess = ''), 3000);
      }, () => {
        alert("Failed to place order.");
      });
  };

  $scope.sendMessage = function () {
    $http.post('/api/contact', $scope.contact)
      .then(res => {
        $scope.messageSuccess = res.data.message;
        $scope.contact = {};
      });
  };

  $scope.uploadCake = function () {
    const formData = new FormData();
    formData.append('name', $scope.newCake.name);
    formData.append('description', $scope.newCake.description);
    formData.append('price', $scope.newCake.price);
    if ($scope.newCake.image) {
      formData.append('image', $scope.newCake.image);
    }

    const url = $scope.editingCakeId
      ? `/api/upload/cake/${$scope.editingCakeId}`
      : '/api/upload/cake';

    const method = $scope.editingCakeId ? $http.put : $http.post;

    method(url, formData, {
      transformRequest: angular.identity,
      headers: { 'Content-Type': undefined }
    }).then(() => {
      $scope.uploadMessage = $scope.editingCakeId ? "Cake updated!" : "Cake added!";
      $scope.resetCakeForm();
      $scope.fetchCakes();
    }, () => alert("Upload failed"));
  };

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

  $scope.deleteCake = function (id) {
    if (confirm("Delete this cake?")) {
      $http.delete(`/api/upload/cake/${id}`)
        .then(() => $scope.fetchCakes());
    }
  };

  $scope.resetCakeForm = function () {
    $scope.newCake = {};
    $scope.editingCakeId = null;
    $scope.checkoutVisible = false;
    $scope.imagePreview = null;
    $scope.uploadMessage = '';
  };

  $scope.fetchCakes = function () {
    $http.get('/api/cakes')
      .then(res => {
        $scope.cakes = res.data;
      });
  };

  // Init
  $scope.fetchCakes();
});
