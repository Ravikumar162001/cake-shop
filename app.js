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
  $scope.order = {};
  $scope.login = {};
  $scope.signup = {};
  $scope.newCake = {};
  $scope.authMode = 'login';
  $scope.authModalVisible = false;
  $scope.adminModalVisible = false;
  $scope.checkoutVisible = false;
  $scope.showContactInfo = false;
  $scope.cartVisible = false;
  $scope.currentUser = localStorage.getItem('userEmail') || null;
  $scope.allOrders = [];
  $scope.allMessages = [];
  $scope.imagePreview = null;
  $scope.editingCakeId = null;
  $scope.userOrders = [];
  $scope.orderHistoryVisible = false;
  $scope.currentUser = localStorage.getItem('userEmail') || null;
  $scope.currentUserName = localStorage.getItem('userName') || null;
  $scope.forgotModalVisible = false;
  $scope.forgot = {};
  $scope.otpSent = false;
  $scope.forgotMsg = '';
  $scope.showLoginPassword = false;
  $scope.showSignupPassword = false;

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

  $scope.deleteOrder = function (orderId) {
    if (confirm("Delete this order?")) {
      $http.delete(`/api/admin/order/${orderId}`)
        .then(() => $scope.fetchAdminData());
    }
  };

  $scope.logout = function () {
    localStorage.clear();
    $scope.currentUser = null;
    $scope.currentUserName = null;
    $scope.adminModalVisible = false;
  
    // 🧹 Clear cart and cartMap
    $scope.cart = [];
    $scope.cartMap = {};
  
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
        localStorage.setItem('userName', res.data.name); // ✅ MUST BE HERE
  
        $scope.currentUser = res.data.email;
        $scope.currentUserName = res.data.name; // ✅ Also in $scope
  
        $scope.authModalVisible = false;
        $scope.login = {};
      }, err => {
        $scope.loginMessage = err.data.msg || "Login failed.";
      });
  };

  $scope.signupUser = function () {
    if ($scope.signup.password !== $scope.signup.confirmPassword) {
      $scope.signupMessage = "❌ Passwords do not match!";
      return;
    }
  
    $http.post('/api/auth/signup', $scope.signup)
      .then(res => {
        $scope.signupMessage = "✅ Signup successful! Please login.";
        $scope.authMode = 'login';
        $scope.signup = {};
      }, err => {
        $scope.signupMessage = err.data.msg || "Signup failed.";
      });
  };
  

  $scope.addToCart = function (cake) {
    const existing = $scope.cart.find(c => c._id === cake._id || c.name === cake.name);
    if (existing) {
      existing.qty += 1;
    } else {
      $scope.cart.push({ ...cake, qty: 1 });
    }
  
    // 🔧 This line is missing in your current code
    $scope.updateCartMap();
  };
  
  
  $scope.removeFromCart = function (cake) {
    $scope.cart = $scope.cart.filter(c => (c._id !== cake._id && c.name !== cake.name));
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
      items: angular.copy($scope.cart),
      totalAmount: $scope.getCartTotal(),
      status: 'Pending',
      timestamp: new Date().toISOString()
    };
  
    $http.post('/api/order', orderData)
      .then(res => {
        alert("Order placed successfully!");
  
        // 🧹 Reset UI
        $scope.order = {};
        $scope.cart = [];
        $scope.updateCartMap();  // ✅ Add this line
        $scope.cartVisible = false;
        $scope.checkoutVisible = false;
      }, err => {
        alert("Failed to place order.");
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

  $scope.toggleCart = function () {
    $scope.cartVisible = !$scope.cartVisible;
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
  
  $scope.fetchUserOrders = function () {
    $http.get(`/api/orders/user/${$scope.currentUser}`)
      .then(res => {
        $scope.userOrders = res.data;
        $scope.orderHistoryVisible = true;
      }, err => {
        alert("Couldn't load your orders.");
      });
  };
  
  $scope.closeOrderHistory = function () {
    $scope.orderHistoryVisible = false;
  };

  $scope.updateOrderStatus = function (order) {
    $http.patch(`/api/admin/order/${order._id}/status`, { status: order.status })
      .then(() => {
        console.log('✅ Status updated');
      }, () => {
        alert("Failed to update order status.");
      });
  };  

  $scope.reviews = [];

  $scope.fetchReviews = function () {
    $http.get('/api/reviews')
      .then(res => {
        $scope.reviews = res.data;
      });
  };

  $scope.newReview = {};

  $scope.submitReview = function () {
    if (!$scope.newReview.message) return alert('Please enter a message');
  
    const token = localStorage.getItem('token');
  
    $http.post('/api/review', $scope.newReview, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).then(() => {
      alert("Thanks for your review!");
      $scope.newReview = {};
      $scope.fetchReviews();
    }, err => {
      alert(err.data.msg || "Failed to submit review.");
    });
  };

  $scope.sendOtp = function () {
    if (!$scope.forgot.email) return alert('Please enter your email');
  
    $http.post('/api/auth/forgot-password', { email: $scope.forgot.email })
      .then(res => {
        $scope.otpSent = true;
        $scope.forgotMsg = "OTP sent to your email.";
      }, err => {
        $scope.forgotMsg = err.data.msg || "Failed to send OTP.";
      });
  };

  $scope.resetPassword = function () {
    if (!$scope.forgot.otp || !$scope.forgot.newPassword) return alert('Please fill all fields');
  
    const data = {
      email: $scope.forgot.email,
      otp: $scope.forgot.otp,
      newPassword: $scope.forgot.newPassword
    };
  
    $http.post('/api/auth/reset-password', data)
      .then(res => {
        alert("Password reset successful. You can now login.");
        $scope.forgotModalVisible = false;
        $scope.forgot = {};
        $scope.otpSent = false;
        $scope.forgotMsg = '';
      }, err => {
        $scope.forgotMsg = err.data.msg || "Failed to reset password.";
      });
  };

  $scope.openForgotPassword = function () {
    $scope.authModalVisible = false;
    $scope.forgotModalVisible = true;
    $scope.forgot = {};
    $scope.otpSent = false;
    $scope.forgotMsg = '';
  };


  $scope.contactModalVisible = false;
  $scope.openContactModal = function () {
  $scope.contactModalVisible = true;
};


  $scope.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Init
  $scope.fetchCakes();
  $scope.fetchReviews();

});
