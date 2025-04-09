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
  const cakeList = order.items.map(item => {
    const weight = item.weight || '1kg';
    let multiplier = 1;
    if (weight === '0.5kg') multiplier = 0.5;
    else if (weight === '1.5kg') multiplier = 1.5;
    else if (weight === '2kg') multiplier = 2;

    const itemTotal = item.price * item.qty * multiplier;

    return `${item.name} (${weight} x${item.qty}) - ₹${itemTotal}`;
  }).join('<br>');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Sweet Bites - Order Confirmation',
    html: `
      <h3>Thanks for your order, ${order.name}!</h3>
      <p>Here’s your order summary:</p>
      <ul>
        <li><strong>Cakes:</strong><br>${cakeList}</li>
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

// ✅ Send OTP Email for password reset
function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Sweet Bites - Password Reset OTP',
    html: `
      <h3>Reset Your Password</h3>
      <p>Use the OTP below to reset your password:</p>
      <h2 style="color:#d2691e;">${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
      <br>
      <p>If you didn’t request this, please ignore the email.</p>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendOrderEmail,
  sendOrderStatusEmail,
  sendOtpEmail // ✅ Exported OTP function
};
