const nodemailer = require('nodemailer');
require('dotenv').config(); // ✅ Load .env file

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // 👈 Loaded securely
    pass: process.env.EMAIL_PASS  // 👈 Loaded securely
  }
});

// ✅ Send email when order is placed
function sendOrderEmail(to, order) {
  const cakeList = order.items.map(item => `${item.name} (x${item.qty})`).join(', ');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Sweet Bites - Order Confirmation',
    html: `
      <h3>Thanks for your order, ${order.name}!</h3>
      <p>Here’s your order summary:</p>
      <ul>
        <li><strong>Cakes:</strong> ${cakeList}</li>
        <li><strong>Total:</strong> ₹${order.totalAmount}</li>
        <li><strong>Status:</strong> ${order.status}</li>
      </ul>
      <p>We’ll notify you once it’s on the way 🍰</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

// ✅ Send email when admin updates order status
function sendOrderStatusEmail(to, name, status) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Sweet Bites - Order Status Updated',
    html: `
      <h3>Hi ${name},</h3>
      <p>Your order status has been updated to:</p>
      <h2 style="color:#d2691e;">${status}</h2>
      <p>We’ll keep you posted on any more updates. 🍰</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendOrderEmail,
  sendOrderStatusEmail
};
