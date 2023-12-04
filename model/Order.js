const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  menuItems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem', // Reference to the MenuItem model
      required: true,
    },
  ],
  time: {
    type: Date,
    default: Date.now, // You can set a default value or remove this line if not needed
  },
  deliveryType: {
    type: String,
    enum: ['pickup', 'delivery', 'dinein'], // Example: You can define specific delivery types
    required: true,
  },
  address: {
    type: String,
    required: function () {
      return this.deliveryType === 'delivery'; // Address is required only for delivery
    },
  },
  phoneNumber: {
    type: String,
  },
  paymentImage: {
    type: String, // You might want to use a specific type (e.g., Buffer) depending on your use case
  },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
