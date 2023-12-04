// models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userid: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true, },
  orderid: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order', // Reference to the User model
    required: true, },
  feedback: { type: String, required: true },
  rating: { type: Number, required: true },
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
