const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  content: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rating: Number, // Dodaj to pole oceny
});

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  coverImage: String,
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviews: [reviewSchema], // Zaktualizuj definicję recenzji
}, { timestamps: true });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
