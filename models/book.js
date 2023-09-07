const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  content: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: { type: Date, default: Date.now },
});

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  coverImage: String,
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviews: [reviewSchema], // Dodajemy pole "reviews" do przechowywania recenzji
}, {
  timestamps: true,
});

module.exports = mongoose.model('Book', bookSchema);
